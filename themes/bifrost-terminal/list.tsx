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
      <div className="rounded-md border border-dashed border-border bg-surface-sunken py-16 text-center">
        <p className="font-mono text-sm text-text-3">
          <span className="text-text-muted">$</span> ls content/posts/<span className="text-text-muted"># empty</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => {
        const date = post.publishedAt ?? post.createdAt;
        const tags = (post.frontmatter?.tags as string[]) ?? [];

        return (
          <article key={post.slug} className="group rounded-md border border-border bg-surface p-5 transition hover:border-border-strong">
            <Link href={`/${post.slug}`} className="block">
              <h2 className="text-xl font-semibold tracking-tight text-text-1 group-hover:text-accent">
                {post.title}
              </h2>
              <div className="mt-1.5 font-mono text-xs text-text-3">
                {new Date(date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              {post.excerpt && (
                <p className="mt-3 text-sm leading-relaxed text-text-2">
                  {post.excerpt}
                </p>
              )}
            </Link>
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.map((tag: string) => (
                  <Link
                    key={tag}
                    href={`/tag/${tag}`}
                    className="rounded border border-border bg-bg-1 px-1.5 py-0.5 font-mono text-xs text-text-2 transition hover:border-accent hover:text-accent"
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
