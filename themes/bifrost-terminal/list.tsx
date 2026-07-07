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

interface Group {
  year: string;
  posts: PostData[];
}

function groupByYear(posts: PostData[]): Group[] {
  const map = new Map<string, PostData[]>();
  for (const post of posts) {
    const date = post.publishedAt ?? post.createdAt;
    const year = new Date(date).getFullYear().toString();
    const list = map.get(year) ?? [];
    list.push(post);
    map.set(year, list);
  }
  return Array.from(map.entries())
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([year, list]) => ({ year, posts: list }));
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

  const groups = groupByYear(posts);

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.year}>
          <div className="mb-3 flex items-baseline gap-3">
            <h2 className="font-mono text-2xl font-semibold tabular-nums text-text-1">
              {group.year}
            </h2>
            <span className="font-mono text-xs text-text-3">
              {group.posts.length} {group.posts.length === 1 ? "post" : "posts"}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-3">
            {group.posts.map((post) => {
              const date = post.publishedAt ?? post.createdAt;
              const tags = (post.frontmatter?.tags as string[]) ?? [];

              return (
                <article
                  key={post.slug}
                  className="group relative rounded-md border border-border bg-surface p-5 transition hover:border-border-strong"
                >
                  <Link
                    href={`/${post.slug}`}
                    aria-label={post.title}
                    className="absolute inset-0 z-0"
                  />
                  <div className="relative z-10 flex items-baseline justify-between gap-4">
                    <h3 className="text-xl font-semibold tracking-tight text-text-1 group-hover:text-accent group-hover:underline group-hover:decoration-accent group-hover:underline-offset-4">
                      {post.title}
                    </h3>
                    <time
                      dateTime={date}
                      className="shrink-0 font-mono text-xs text-text-3"
                    >
                      {new Date(date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                  {post.excerpt && (
                    <p className="relative z-10 mt-2 text-sm leading-relaxed text-text-2">
                      {post.excerpt}
                    </p>
                  )}
                  {tags.length > 0 && (
                    <div className="relative z-10 mt-3 flex flex-wrap gap-1.5">
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
        </section>
      ))}
    </div>
  );
}
