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
import { useTheme } from "@/lib/themes/theme-context";

export default function Header() {
  const { mode, toggle } = useTheme();

  return (
    <header className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-lg font-bold text-[var(--text-primary)]"
        >
          Bifröst
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Home
          </Link>
          <button
            onClick={toggle}
            className="rounded border border-[var(--border-color)] px-2 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
          >
            {mode === "light" ? "Dark" : "Light"}
          </button>
        </nav>
      </div>
    </header>
  );
}
