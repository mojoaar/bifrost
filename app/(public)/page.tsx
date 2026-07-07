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
import { eq, sql } from "drizzle-orm";
import { loadTheme } from "@/lib/themes/registry";
import type { PostData } from "@/lib/themes/types";

export default async function HomePage() {
  const rows = db
    .select()
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(sql`${posts.publishedAt} DESC`)
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
      <div className="space-y-8">
        {postData.map((post) => (
          <article key={post.slug}>
            <h2 className="text-xl font-semibold">{post.title}</h2>
            {post.excerpt && <p>{post.excerpt}</p>}
          </article>
        ))}
      </div>
    );
  }

  return <ListComponent posts={postData} />;
}
