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
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/themes/theme-context";

export default function Header({ widthClass = "max-w-3xl" }: { widthClass?: string }) {
  const { mode, toggle } = useTheme();
  const [navPages, setNavPages] = useState<{ slug: string; title: string }[]>([]);

  useEffect(() => {
    async function loadNav() {
      try {
        const res = await fetch("/api/v1/pages?status=published&limit=100");
        const body = await res.json();
        if (res.ok && Array.isArray(body.data)) {
          const items = (body.data as { slug: string; title: string; showInNav: boolean; navOrder: number }[])
            .filter((p) => p.showInNav)
            .sort((a, b) => a.navOrder - b.navOrder || a.title.localeCompare(b.title))
            .map((p) => ({ slug: p.slug, title: p.title }));
          setNavPages(items);
        }
      } catch {
        // no nav pages
      }
    }
    loadNav();
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg-0/80 backdrop-blur">
      <div className={`mx-auto flex items-center justify-between px-6 py-3 ${widthClass}`}>
        <Link href="/" className="text-sm font-medium text-text-1 transition hover:text-accent">
          Home
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {navPages.map((p) => (
            <Link
              key={p.slug}
              href={`/${p.slug}`}
              className="text-text-2 transition hover:text-text-1"
            >
              {p.title}
            </Link>
          ))}
          <button
            onClick={toggle}
            className="rounded-md border border-border bg-bg-1 p-1.5 text-text-2 transition hover:border-border-strong hover:text-text-1"
            aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
          >
            {mode === "light" ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </nav>
      </div>
    </header>
  );
}
