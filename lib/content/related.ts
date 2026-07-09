/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { and, eq, inArray, ne, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { postTags } from "@/lib/db/schema/post-tags";
import type { RelatedPost } from "@/lib/themes/types";

export function getRelatedPosts(slug: string, limit = 3): RelatedPost[] {
  const tagRows = db
    .select({ tagId: postTags.tagId })
    .from(postTags)
    .where(eq(postTags.postSlug, slug))
    .all();

  const tagIds = tagRows.map((r) => r.tagId);
  if (tagIds.length === 0) return [];

  const candidateRows = db
    .select({ postSlug: postTags.postSlug })
    .from(postTags)
    .where(and(inArray(postTags.tagId, tagIds), ne(postTags.postSlug, slug)))
    .all();

  const overlap = new Map<string, number>();
  for (const r of candidateRows) {
    overlap.set(r.postSlug, (overlap.get(r.postSlug) ?? 0) + 1);
  }
  if (overlap.size === 0) return [];

  const candidateSlugs = [...overlap.keys()];

  const published = db
    .select({
      slug: posts.slug,
      title: posts.title,
      excerpt: posts.excerpt,
      publishedAt: posts.publishedAt,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(and(inArray(posts.slug, candidateSlugs), eq(posts.status, "published")))
    .orderBy(desc(posts.publishedAt))
    .all();

  return published
    .sort((a, b) => {
      const diff = (overlap.get(b.slug) ?? 0) - (overlap.get(a.slug) ?? 0);
      if (diff !== 0) return diff;
      return (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt);
    })
    .slice(0, limit);
}
