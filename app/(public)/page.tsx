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
import { getSetting } from "@/lib/settings";
import type { PostData } from "@/lib/themes/types";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

const POSTS_PER_PAGE = 10;

export default async function HomePage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const total =
    db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(eq(posts.status, "published"))
      .get()?.count ?? 0;

  const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
  const offset = (currentPage - 1) * POSTS_PER_PAGE;

  const rows = db
    .select()
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(sql`${posts.createdAt} DESC`)
    .limit(POSTS_PER_PAGE)
    .offset(offset)
    .all();

  const theme = await loadTheme("bifrost-terminal");
  const ListComponent = theme.components.list;

  const showFeatured = getSetting("appearance.show_featured_images") !== "false";
  const showReadingTime = getSetting("appearance.show_reading_time") !== "false";

  const postData: PostData[] = rows.map((row) => {
    const fm = JSON.parse(row.frontmatter) as Record<string, unknown>;
    if (!showFeatured && fm.featuredImage) {
      const { featuredImage: _, ...rest } = fm;
      return {
        slug: row.slug,
        title: row.title,
        contentHtml: row.contentHtml,
        excerpt: row.excerpt,
        frontmatter: rest,
        status: row.status,
        publishedAt: row.publishedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        showReadingTime,
      };
    }
    return {
      slug: row.slug,
      title: row.title,
      contentHtml: row.contentHtml,
      excerpt: row.excerpt,
      frontmatter: fm,
      status: row.status,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      showReadingTime,
    };
  });

  return (
    <div>
      {!ListComponent ? (
        <div className="space-y-8">
          {postData.map((post) => (
            <article key={post.slug}>
              <h2 className="text-xl font-semibold">{post.title}</h2>
              {post.excerpt && <p>{post.excerpt}</p>}
            </article>
          ))}
        </div>
      ) : (
        <ListComponent posts={postData} />
      )}

      {totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-2 font-mono text-sm">
          {currentPage > 1 && (
            <Link
              href={currentPage === 2 ? "/" : `/?page=${currentPage - 1}`}
              className="rounded border border-border px-3 py-1.5 text-text-2 transition hover:border-border-strong hover:text-text-1"
            >
              Previous
            </Link>
          )}
          <span className="px-3 py-1.5 text-text-3">
            {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              href={`/?page=${currentPage + 1}`}
              className="rounded border border-border px-3 py-1.5 text-text-2 transition hover:border-border-strong hover:text-text-1"
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
