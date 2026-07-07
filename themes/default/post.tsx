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

  return (
    <article className="max-w-[65ch]">
      <header className="mb-8 border-b border-[var(--border-color)] pb-6">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)]">
          {post.title}
        </h1>
        <time className="mt-3 block text-sm text-[var(--text-muted)]">
          {new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
      </header>
      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </article>
  );
}
