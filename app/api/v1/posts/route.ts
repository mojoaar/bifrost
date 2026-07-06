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
import { postCreateSchema } from "@/lib/validation/posts";
import { writePostToFilesystem } from "@/lib/content/sync";
import { renderMarkdown } from "@/lib/md/parser";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10))
  );
  const statusParam = searchParams.get("status");
  const statusFilter =
    statusParam === "draft" || statusParam === "published"
      ? eq(posts.status, statusParam)
      : undefined;

  const total =
    db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(statusFilter)
      .get()?.count ?? 0;

  const rows = db
    .select()
    .from(posts)
    .where(statusFilter)
    .limit(limit)
    .offset((page - 1) * limit)
    .orderBy(sql`${posts.createdAt} DESC`)
    .all();

  return apiSuccess(rows, { page, limit, total });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = postCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, parsed.error.flatten());
  }

  const { slug, title, content, frontmatter, status, authorId, tagIds } =
    parsed.data;

  const existing = db
    .select({ slug: posts.slug })
    .from(posts)
    .where(eq(posts.slug, slug))
    .get();

  if (existing) {
    return apiError("A post with this slug already exists", 409);
  }

  await writePostToFilesystem(slug, content, { title, ...frontmatter });

  const now = new Date().toISOString();

  try {
    const { html, excerpt } = await renderMarkdown(content);

    db.insert(posts)
      .values({
        slug,
        title,
        contentMd: content,
        contentHtml: html,
        excerpt,
        frontmatter: JSON.stringify(frontmatter),
        status,
        authorId,
        publishedAt: status === "published" ? now : null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    if (tagIds.length > 0) {
      for (const tagId of tagIds) {
        db.insert(postTags).values({ postSlug: slug, tagId }).run();
      }
    }

    try {
      const { commitPost } = await import("@/lib/git/repo");
      await commitPost(slug, title);
    } catch {
      // best-effort
    }
  } catch (err) {
    return apiError("Failed to create post", 500, String(err));
  }

  const post = db.select().from(posts).where(eq(posts.slug, slug)).get();

  return apiSuccess(post, undefined, 201);
}
