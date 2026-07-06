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
    <article>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          {post.title}
        </h1>
        <time className="mt-2 block text-sm text-[var(--text-muted)]">
          {new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
      </header>
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </article>
  );
}
