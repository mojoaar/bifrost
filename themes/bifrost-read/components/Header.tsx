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
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/themes/theme-context";
import { useBifrost } from "@/lib/hooks/use-bifrost";

export default function Header({ widthClass = "max-w-3xl" }: { widthClass?: string }) {
  const { mode, toggle } = useTheme();
  const { nav: navPages } = useBifrost();

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
