/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import Link from "next/link";
import type { RelatedPost } from "@/lib/themes/types";

export default function RelatedPosts({ posts }: { posts: RelatedPost[] }) {
  if (!posts || posts.length === 0) return null;

  return (
    <section className="mt-12 border-t border-border pt-6">
      <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-text-3">Related posts</h2>
      <div className="flex flex-col gap-3">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/${p.slug}`}
            className="group rounded-md border border-border bg-bg-1 px-4 py-3 transition hover:border-accent"
          >
            <div className="text-text-1 transition group-hover:text-accent">{p.title}</div>
            {p.excerpt && <p className="mt-1 line-clamp-2 text-sm text-text-3">{p.excerpt}</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}
