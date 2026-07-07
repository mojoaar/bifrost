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

interface Props {
  post: PostData;
}

export default function PostTemplate({ post }: Props) {
  const date = post.publishedAt ?? post.createdAt;
  const tags = (post.frontmatter?.tags as string[] | undefined) ?? [];

  return (
    <article className="max-w-[68ch]">
      <header className="mb-8 border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-text-1 sm:text-display">
          {post.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-xs text-text-3">
          <time dateTime={date}>
            {new Date(date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </time>
          {tags.length > 0 && (
            <>
              <span className="text-text-muted">·</span>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span key={t} className="rounded border border-border bg-bg-1 px-1.5 py-0.5 text-text-2">
                    {t}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </header>
      <div
        className="text-text-1"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </article>
  );
}
