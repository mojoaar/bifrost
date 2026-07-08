/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TagItem {
  id: string;
  name: string;
  count: number;
}

export default function Sidebar() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [pages, setPages] = useState<{ slug: string; title: string }[]>([]);

  useEffect(() => {
    async function loadTags() {
      try {
        const res = await fetch("/api/v1/tags?limit=30");
        const body = await res.json();
        if (res.ok && Array.isArray(body.data)) {
          setTags(body.data);
        }
      } catch {
        // silent
      }
    }
    async function loadPages() {
      try {
        const res = await fetch("/api/v1/pages?status=published&limit=100");
        const body = await res.json();
        if (res.ok && Array.isArray(body.data)) {
          setPages(
            (body.data as { slug: string; title: string }[]).map((p) => ({
              slug: p.slug,
              title: p.title,
            }))
          );
        }
      } catch {
        // silent
      }
    }
    loadTags();
    loadPages();
  }, []);

  return (
    <aside className="space-y-6">
      {pages.length > 0 && (
        <div>
          <h3 className="mb-3 border-b border-border pb-2 text-xs font-bold uppercase tracking-widest text-text-3">
            Pages
          </h3>
          <ul className="space-y-1.5">
            {pages.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/${p.slug}`}
                  className="text-sm text-text-2 transition hover:text-accent"
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tags.length > 0 && (
        <div>
          <h3 className="mb-3 border-b border-border pb-2 text-xs font-bold uppercase tracking-widest text-text-3">
            Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tag/${tag.name}`}
                className="rounded border border-border px-2.5 py-1 text-xs text-text-2 transition hover:border-accent hover:text-accent"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
