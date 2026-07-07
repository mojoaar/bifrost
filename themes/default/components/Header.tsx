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
    <header className="sticky top-0 z-20 border-b border-border bg-bg-0/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="font-mono text-base font-semibold tracking-tight text-text-1"
        >
          <span className="text-accent">$</span> {title}
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/"
            className="text-text-2 transition hover:text-text-1"
          >
            Home
          </Link>
          <button
            onClick={toggle}
            className="rounded-md border border-border bg-bg-1 px-2.5 py-1 font-mono text-xs text-text-2 transition hover:border-border-strong hover:text-text-1"
            aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
          >
            {mode === "light" ? "light" : "dark"}
          </button>
        </nav>
      </div>
    </header>
  );
}
