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
import { useDateTimeFormat } from "@/lib/format-date";
import { readingTime } from "@/lib/reading-time";
import Sidebar from "./components/Sidebar";

interface Props {
  posts: PostData[];
  siteTitle?: string;
  siteDescription?: string;
  heroHtml?: string;
  contentWidth?: string;
}

export default function ListTemplate({ posts }: Props) {
  const { formatDateShort } = useDateTimeFormat();

  if (posts.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-surface-sunken py-16 text-center">
        <p className="text-sm text-text-3">
          <span className="text-text-muted">$</span> ls content/posts/<span className="text-text-muted"># empty</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <div className="min-w-0 flex-1">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {posts.map((post) => {
            const tags = (post.frontmatter?.tags as string[]) ?? [];

            return (
              <article
                key={post.slug}
                className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
              >
                {!!post.frontmatter?.featuredImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={String(post.frontmatter.featuredImage)}
                    alt=""
                    className="h-44 w-full object-cover"
                  />
                )}
                <div className="flex flex-1 flex-col p-5">
                  {tags.length > 0 && (
                    <div className="relative z-0 mb-3 flex flex-wrap gap-1.5">
                      {tags.map((tag: string) => (
                        <Link
                          key={tag}
                          href={`/tag/${tag}`}
                          className="pointer-events-auto relative z-20 rounded-sm bg-accent/10 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-accent transition hover:bg-accent/20"
                        >
                          {tag}
                        </Link>
                      ))}
                    </div>
                  )}
                  <Link
                    href={`/${post.slug}`}
                    aria-label={post.title}
                    className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  />
                  <h2 className="relative z-0 text-lg font-semibold leading-snug tracking-tight text-text-1 transition group-hover:text-accent">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="relative z-0 mt-2 flex-1 text-sm leading-relaxed text-text-3">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="relative z-0 mt-3 flex items-center gap-3 text-xs text-text-muted">
                    <time dateTime={post.createdAt}>
                      {formatDateShort(post.createdAt)}
                    </time>
                    {post.showReadingTime !== false && (
                      <>
                        <span className="text-border-strong">·</span>
                        <span>{readingTime(post.contentHtml)} min read</span>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="w-full shrink-0 lg:w-64">
        <Sidebar />
      </div>
    </div>
  );
}
