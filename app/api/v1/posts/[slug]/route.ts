/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { postTags } from "@/lib/db/schema/post-tags";
import { apiSuccess, apiError } from "@/lib/api/response";
import { postUpdateSchema } from "@/lib/validation/posts";
import {
  writePostToFilesystem,
  deletePostFromFilesystem,
} from "@/lib/content/sync";
import { renderMarkdown, parseFrontmatter } from "@/lib/md/parser";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = db.select().from(posts).where(eq(posts.slug, slug)).get();

  if (!post) {
    return apiError("Post not found", 404);
  }

  return apiSuccess(post);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
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
  const now = new Date().toISOString();
  const existingFm: Record<string, unknown> = JSON.parse(existing.frontmatter);
  const contentFm = parseFrontmatter(update.content ?? "").frontmatter;
  const mergedFm = { ...existingFm, ...contentFm, ...(update.frontmatter ?? {}) };

  const updateData: Record<string, unknown> = { updatedAt: now };

  if (update.title !== undefined) updateData.title = update.title;
  if (update.status !== undefined) updateData.status = update.status;
  if (update.authorId !== undefined) updateData.authorId = update.authorId;

  if (update.content !== undefined) {
    updateData.frontmatter = JSON.stringify(mergedFm);
    try {
      const { html, excerpt } = await renderMarkdown(update.content);
      updateData.contentMd = update.content;
      updateData.contentHtml = html;
      updateData.excerpt = excerpt;
    } catch (err) {
      return apiError("Failed to render markdown", 500, String(err));
    }
  }

  if (
    update.status === "published" ||
    (update.status === undefined && existing.status === "published")
  ) {
    updateData.publishedAt = existing.publishedAt ?? now;
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
  } catch {
    // best-effort
  }

  const post = db.select().from(posts).where(eq(posts.slug, slug)).get();

  return apiSuccess(post);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const existing = db.select().from(posts).where(eq(posts.slug, slug)).get();
  if (!existing) {
    return apiError("Post not found", 404);
  }

  db.delete(postTags).where(eq(postTags.postSlug, slug)).run();
  db.delete(posts).where(eq(posts.slug, slug)).run();
  await deletePostFromFilesystem(slug);

  return apiSuccess({ deleted: true });
}
