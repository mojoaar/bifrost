/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import Link from "next/link";
import type { PostData } from "@/lib/themes/types";

interface Props {
  posts: PostData[];
}

export default function ListTemplate({ posts }: Props) {
  if (posts.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[var(--text-muted)]">No posts yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {posts.map((post) => {
        const date = post.publishedAt ?? post.createdAt;
        const tags = (post.frontmatter?.tags as string[]) ?? [];

        return (
          <article key={post.slug}>
            <Link href={`/${post.slug}`} className="group block">
              <h2 className="text-xl font-semibold group-hover:text-[var(--accent)]">
                {post.title}
              </h2>
              <time className="mt-1 block text-sm text-[var(--text-muted)]">
                {new Date(date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              {post.excerpt && (
                <p className="mt-2 text-[var(--text-secondary)]">
                  {post.excerpt}
                </p>
              )}
            </Link>
            {tags.length > 0 && (
              <div className="mt-2 flex gap-2">
                {tags.map((tag: string) => (
                  <Link
                    key={tag}
                    href={`/tag/${tag}`}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
