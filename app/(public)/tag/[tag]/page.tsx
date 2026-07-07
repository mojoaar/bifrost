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
import { sql } from "drizzle-orm";
import { loadTheme } from "@/lib/themes/registry";
import type { PostData } from "@/lib/themes/types";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ tag: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  return { title: `Posts tagged "${tag}"` };
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params;

  const rows = db
    .select()
    .from(posts)
    .where(
      sql`${posts.status} = 'published' AND ${posts.frontmatter} LIKE ${`%${tag}%`}`
    )
    .orderBy(sql`${posts.createdAt} DESC`)
    .all();

  const theme = await loadTheme("bifrost-terminal");
  const ListComponent = theme.components.list;

  const postData: PostData[] = rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    contentHtml: row.contentHtml,
    excerpt: row.excerpt,
    frontmatter: JSON.parse(row.frontmatter) as Record<string, unknown>,
    status: row.status,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  if (!ListComponent) {
    return (
      <div>
        <h1>Posts tagged &ldquo;{tag}&rdquo;</h1>
        {postData.length === 0 && <p>No posts found.</p>}
        {postData.map((post) => (
          <article key={post.slug}>
            <h2>{post.title}</h2>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">
        Posts tagged &ldquo;{tag}&rdquo;
      </h1>
      {postData.length === 0 && (
        <p className="text-[var(--text-muted)]">No posts found.</p>
      )}
      <ListComponent posts={postData} />
    </div>
  );
}
