/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import type { PageData } from "@/lib/themes/types";
import { useCodeCopyButtons } from "@/components/CodeCopyButton";

interface Props {
  page: PageData;
  isAdmin?: boolean;
}

export default function PageTemplate({ page, isAdmin = false }: Props) {
  const containerRef = useCodeCopyButtons(page.contentHtml);

  return (
    <article className="mx-auto max-w-3xl">
      <header className="mb-8 border-b border-border pb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-text-1 sm:text-display">
            {page.title}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && page.status === "draft" && (
              <span className="rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                draft
              </span>
            )}
            {isAdmin && (
              <a
                href={`/admin/pages/${page.slug}`}
                className="rounded-md border border-border bg-bg-1 px-2 py-1 text-xs text-text-2 transition hover:border-accent hover:text-accent"
              >
                edit
              </a>
            )}
          </div>
        </div>
      </header>
      <div
        ref={containerRef}
        className="text-text-1"
        dangerouslySetInnerHTML={{ __html: page.contentHtml }}
      />
    </article>
  );
}
