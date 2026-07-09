/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { apiSuccess, apiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/rate-limit";
import { and, eq, or, like, sql, desc } from "drizzle-orm";

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function GET(request: Request) {
  const limited = rateLimit(request, "search", 30, 60_000);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return apiError("Query must be at least 2 characters", 400);
  }

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10) || 10));
  const offset = (page - 1) * limit;

  const pattern = `%${escapeLike(q)}%`;
  const filter = and(
    eq(posts.status, "published"),
    or(like(posts.title, pattern), like(posts.contentMd, pattern))
  );

  const total =
    db.select({ count: sql<number>`count(*)` }).from(posts).where(filter).get()?.count ?? 0;

  const rows = db
    .select({
      slug: posts.slug,
      title: posts.title,
      excerpt: posts.excerpt,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(filter)
    .orderBy(desc(posts.publishedAt))
    .limit(limit)
    .offset(offset)
    .all();

  return apiSuccess(rows, { page, limit, total });
}
