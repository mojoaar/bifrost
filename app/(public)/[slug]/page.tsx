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
import { eq } from "drizzle-orm";
import { loadTheme } from "@/lib/themes/registry";
import type { PostData } from "@/lib/themes/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = db
    .select({ title: posts.title, excerpt: posts.excerpt })
    .from(posts)
    .where(eq(posts.slug, slug))
    .get();

  if (!row) return { title: "Not Found" };

  return {
    title: row.title,
    description: row.excerpt ?? undefined,
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const row = db
    .select()
    .from(posts)
    .where(eq(posts.slug, slug))
    .get();

  if (!row) notFound();

  const theme = await loadTheme("bifrost-terminal");
  const PostComponent = theme.components.post;

  const postData: PostData = {
    slug: row.slug,
    title: row.title,
    contentHtml: row.contentHtml,
    excerpt: row.excerpt,
    frontmatter: JSON.parse(row.frontmatter) as Record<string, unknown>,
    status: row.status,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  if (!PostComponent) {
    return (
      <article>
        <h1 className="text-3xl font-bold">{postData.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: postData.contentHtml }} />
      </article>
    );
  }

  return <PostComponent post={postData} />;
}
