/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { nowISO } from "@/lib/time";

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { postTags } from "@/lib/db/schema/post-tags";
import { tags } from "@/lib/db/schema/tags";
import { apiSuccess, apiError } from "@/lib/api/response";
import { postUpdateSchema } from "@/lib/validation/posts";
import {
  writePostToFilesystem,
  deletePostFromFilesystem,
} from "@/lib/content/sync";
import { renderMarkdown, parseFrontmatter } from "@/lib/md/parser";
import { requireUser } from "@/lib/auth/require";
import { recordAudit, getClientContext } from "@/lib/audit";
import { generatePreviewToken } from "@/lib/content/preview";
import { createLogger } from "@/lib/logger";
import { eq } from "drizzle-orm";

const log = createLogger("posts");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = db.select().from(posts).where(eq(posts.slug, slug)).get();

  if (!post) {
    return apiError("Post not found", 404);
  }

  const postTagRows = db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .innerJoin(postTags, eq(postTags.tagId, tags.id))
    .where(eq(postTags.postSlug, slug))
    .all();

  return apiSuccess({ ...post, tags: postTagRows });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireUser(request);
  if (!auth) {
    return apiError("Authentication required", 401);
  }

  const { slug } = await params;

  const existing = db.select().from(posts).where(eq(posts.slug, slug)).get();
  if (!existing) {
    return apiError("Post not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = postUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, parsed.error.flatten());
  }

  const update = parsed.data;
  const now = nowISO();
  const existingFm: Record<string, unknown> = JSON.parse(existing.frontmatter);
  const contentFm = parseFrontmatter(update.content ?? "").frontmatter;
  const mergedFm = { ...existingFm, ...contentFm, ...(update.frontmatter ?? {}) };

  const updateData: Record<string, unknown> = { updatedAt: now };

  if (update.title !== undefined) updateData.title = update.title;
  if (update.status !== undefined) updateData.status = update.status;
  if (update.authorId !== undefined) updateData.authorId = update.authorId;
  if (update.scheduledAt !== undefined) updateData.scheduledAt = update.scheduledAt;

  if (update.content !== undefined) {
    updateData.frontmatter = JSON.stringify(mergedFm);
    try {
      const { html, excerpt } = await renderMarkdown(update.content);
      updateData.contentMd = update.content;
      updateData.contentHtml = html;
      updateData.excerpt = excerpt;
    } catch (err) {
      return apiError("Failed to render markdown", 500);
    }
  }

  if (
    update.status === "published" ||
    (update.status === undefined && existing.status === "published")
  ) {
    updateData.publishedAt = existing.publishedAt ?? now;
  } else if (update.status === "scheduled") {
    updateData.scheduledAt = update.scheduledAt ?? now;
  }

  if (update.status === "published" && existing.status === "scheduled") {
    updateData.publishedAt = now;
    updateData.scheduledAt = null;
  } else if (update.status !== "scheduled" && update.status !== undefined) {
    updateData.scheduledAt = null;
  }

  if (update.status === "published") {
    updateData.previewToken = null;
    updateData.previewTokenExpiresAt = null;
  }

  db.update(posts).set(updateData).where(eq(posts.slug, slug)).run();

  if (update.content !== undefined) {
    await writePostToFilesystem(
      slug,
      update.content,
      { title: update.title ?? existing.title, ...mergedFm }
    );
  }

  if (update.tagIds !== undefined) {
    db.delete(postTags).where(eq(postTags.postSlug, slug)).run();
    for (const tagId of update.tagIds) {
      db.insert(postTags).values({ postSlug: slug, tagId }).run();
    }
  }

  try {
    const { commitPost } = await import("@/lib/git/repo");
    await commitPost(slug, update.title ?? existing.title, "update");
  } catch (err) {
    log.error("git commit failed (best-effort):", err);
  }

  const post = db.select().from(posts).where(eq(posts.slug, slug)).get();

  recordAudit({
    action: "post.update",
    status: "success",
    targetType: "post",
    targetId: slug,
    ...getClientContext(request, auth),
    metadata: { title: update.title ?? existing.title },
  });

  return apiSuccess(post);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireUser(request);
  if (!auth) {
    return apiError("Authentication required", 401);
  }

  const { slug } = await params;

  const existing = db.select().from(posts).where(eq(posts.slug, slug)).get();
  if (!existing) {
    return apiError("Post not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const action = (body as { action?: string } | null)?.action;

  if (action === "generate_preview") {
    if (existing.status === "published") {
      return apiError("Cannot create a preview link for a published post", 400);
    }
    const { previewToken, previewTokenExpiresAt } = generatePreviewToken();
    db.update(posts)
      .set({ previewToken, previewTokenExpiresAt, updatedAt: nowISO() })
      .where(eq(posts.slug, slug))
      .run();

    recordAudit({
      action: "post.preview_share",
      status: "success",
      targetType: "post",
      targetId: slug,
      ...getClientContext(request, auth),
      metadata: { expiresAt: previewTokenExpiresAt },
    });

    return apiSuccess({ previewToken, previewTokenExpiresAt });
  }

  if (action === "revoke_preview") {
    db.update(posts)
      .set({ previewToken: null, previewTokenExpiresAt: null, updatedAt: nowISO() })
      .where(eq(posts.slug, slug))
      .run();

    recordAudit({
      action: "post.preview_revoke",
      status: "success",
      targetType: "post",
      targetId: slug,
      ...getClientContext(request, auth),
    });

    return apiSuccess({ revoked: true });
  }

  return apiError("Unknown action", 400);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireUser(request);
  if (!auth) {
    return apiError("Authentication required", 401);
  }

  const { slug } = await params;

  const existing = db.select().from(posts).where(eq(posts.slug, slug)).get();
  if (!existing) {
    return apiError("Post not found", 404);
  }

  db.delete(postTags).where(eq(postTags.postSlug, slug)).run();
  db.delete(posts).where(eq(posts.slug, slug)).run();
  await deletePostFromFilesystem(slug);

  recordAudit({
    action: "post.delete",
    status: "success",
    targetType: "post",
    targetId: slug,
    ...getClientContext(request, auth),
    metadata: { title: existing.title },
  });

  return apiSuccess({ deleted: true });
}
