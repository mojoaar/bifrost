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
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { FileCode, Code2 } from "lucide-react";

export default function ThemesPage() {
  const [themes, setThemes] = useState<{ slug: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/v1/themes");
        const body = await res.json();
        if (!cancelled && res.ok) setThemes(body.data ?? []);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Card padding="md">
        <p className="font-mono text-sm text-text-3">loading…</p>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Themes</h1>
          <p className="mt-1 font-mono text-sm text-text-3">
            <span className="text-text-muted">$</span> ls themes/
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/themes/files"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-1 px-3 py-1.5 font-mono text-xs text-text-2 transition hover:border-accent hover:text-accent"
          >
            <Code2 size={14} />
            <span>Files</span>
          </Link>
          <Link
            href="/admin/themes/css"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-1 px-3 py-1.5 font-mono text-xs text-text-2 transition hover:border-accent hover:text-accent"
          >
            <FileCode size={14} />
            <span>Custom CSS</span>
          </Link>
        </div>
      </div>

      {themes.length === 0 ? (
        <Card padding="lg">
          <p className="text-center font-mono text-sm text-text-3">no themes installed</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-[repeat(auto-fill,minmax(20rem,1fr))]">
          {themes.map((theme) => (
            <Card key={theme.slug} padding="md">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-mono text-base font-semibold text-text-1">
                  {theme.name}
                </h3>
                <span className="rounded border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-xs uppercase tracking-wider text-accent">
                  active
                </span>
              </div>
              <p className="text-sm text-text-2">Bifröst Terminal — the default theme.</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
