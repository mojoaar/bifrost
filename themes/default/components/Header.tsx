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
import { useTheme } from "@/lib/themes/theme-context";

export default function Header() {
  const { mode, toggle } = useTheme();
  const [title, setTitle] = useState("Bifröst");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/settings");
        const body = await res.json();
        if (res.ok && body.data?.["site.title"]) {
          setTitle(String(body.data["site.title"]));
        }
      } catch {
        // use default title
      }
    }
    load();
  }, []);

  return (
    <header className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-[var(--text-primary)]"
        >
          {title}
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
