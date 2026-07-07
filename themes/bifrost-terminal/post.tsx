/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import type { PostData } from "@/lib/themes/types";
import { useCodeCopyButtons } from "@/components/CodeCopyButton";

interface Props {
  post: PostData;
  isAdmin?: boolean;
}

function wordCount(html: string): number {
  const text = html.replace(/<[^>]*>/g, " ");
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function readingTime(html: string): number {
  return Math.max(1, Math.round(wordCount(html) / 220));
}

export default function PostTemplate({ post, isAdmin = false }: Props) {
  const date = post.publishedAt ?? post.createdAt;
  const tags = (post.frontmatter?.tags as string[] | undefined) ?? [];
  const minutes = readingTime(post.contentHtml);
  const containerRef = useCodeCopyButtons(post.contentHtml);

  return (
    <article>
      <header className="mb-8 border-b border-border pb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-text-1 sm:text-display">
            {post.title}
          </h1>
          {isAdmin && (
            <a
              href={`/admin/posts/${post.slug}`}
              className="shrink-0 rounded-md border border-border bg-bg-1 px-2 py-1 font-mono text-xs text-text-2 transition hover:border-accent hover:text-accent"
            >
              edit
            </a>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-xs text-text-3">
          <time dateTime={date}>
            {new Date(date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </time>
          <span className="text-text-muted">·</span>
          <span>{minutes} min read</span>
          {tags.length > 0 && (
            <>
              <span className="text-text-muted">·</span>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <a
                    key={t}
                    href={`/tag/${t}`}
                    className="rounded border border-border bg-bg-1 px-1.5 py-0.5 text-text-2 transition hover:border-accent hover:text-accent"
                  >
                    #{t}
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </header>
      <div
        ref={containerRef}
        className="text-text-1"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </article>
  );
}
