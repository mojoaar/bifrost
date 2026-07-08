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
import { tags } from "@/lib/db/schema/tags";
import { postTags } from "@/lib/db/schema/post-tags";
import { eq, sql } from "drizzle-orm";
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

  const tagRow = db.select().from(tags).where(eq(tags.slug, tag)).get();

  if (!tagRow) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-text-1">
          Posts tagged &ldquo;{tag}&rdquo;
        </h1>
        <p className="font-mono text-sm text-text-3">No posts found.</p>
      </div>
    );
  }

  const rows = db
    .select({
      slug: posts.slug,
      title: posts.title,
      contentHtml: posts.contentHtml,
      excerpt: posts.excerpt,
      frontmatter: posts.frontmatter,
      status: posts.status,
      publishedAt: posts.publishedAt,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .innerJoin(postTags, eq(postTags.postSlug, posts.slug))
    .where(eq(postTags.tagId, tagRow.id))
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
        <h1>Posts tagged &ldquo;{tagRow.name}&rdquo;</h1>
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
      <h1 className="mb-6 text-2xl font-bold text-text-1">
        Posts tagged &ldquo;{tagRow.name}&rdquo;
      </h1>
      <ListComponent posts={postData} />
    </div>
  );
}
