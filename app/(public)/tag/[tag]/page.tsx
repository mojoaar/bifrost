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
import { and, eq, sql } from "drizzle-orm";
import { loadTheme } from "@/lib/themes/registry";
import { getSetting } from "@/lib/settings";
import type { PostData } from "@/lib/themes/types";
import type { Metadata } from "next";
import Link from "next/link";

interface Props {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  return { title: `Posts tagged "${tag}"` };
}

export default async function TagPage({ params, searchParams }: Props) {
  const { tag } = await params;
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

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

  const postsPerPage = Math.max(
    1,
    Math.min(100, parseInt(getSetting("appearance.posts_per_page") ?? "10", 10) || 10)
  );

  const filter = and(
    eq(postTags.tagId, tagRow.id),
    eq(posts.status, "published")
  );

  const total =
    db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .innerJoin(postTags, eq(postTags.postSlug, posts.slug))
      .where(filter)
      .get()?.count ?? 0;

  const totalPages = Math.max(1, Math.ceil(total / postsPerPage));
  const offset = (currentPage - 1) * postsPerPage;

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
    .where(filter)
    .orderBy(sql`${posts.createdAt} DESC`)
    .limit(postsPerPage)
    .offset(offset)
    .all();

  const themeName = getSetting("theme") ?? "bifrost-terminal";
  const theme = await loadTheme(themeName);
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

  const basePath = `/tag/${tag}`;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-1">
        Posts tagged &ldquo;{tagRow.name}&rdquo;
      </h1>

      {!ListComponent ? (
        <div>
          {postData.length === 0 && <p>No posts found.</p>}
          {postData.map((post) => (
            <article key={post.slug}>
              <h2>{post.title}</h2>
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
              href={currentPage === 2 ? basePath : `${basePath}?page=${currentPage - 1}`}
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
              href={`${basePath}?page=${currentPage + 1}`}
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
