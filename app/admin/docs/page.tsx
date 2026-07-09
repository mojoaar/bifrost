/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { authFetch } from "@/lib/auth/client";

const SECTIONS = [
  { slug: "getting-started", title: "Getting Started" },
  { slug: "content", title: "Content" },
  { slug: "themes", title: "Themes" },
  { slug: "admin", title: "Admin Dashboard" },
  { slug: "settings", title: "Settings" },
  { slug: "api", title: "REST API" },
  { slug: "mcp", title: "MCP Server" },
  { slug: "git", title: "Git & Versioning" },
  { slug: "plugins", title: "Plugins" },
  { slug: "deployment", title: "Deployment" },
  { slug: "security", title: "Security & MFA" },
  { slug: "backup", title: "Backup & Restore" },
];

function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export default function DocsPage() {
  const [active, setActive] = useState("getting-started");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const pendingAnchor = useRef<string | null>(null);

  const loadDoc = useCallback(async (slug: string, anchor?: string) => {
    setActive(slug);
    setLoading(true);
    setError("");
    pendingAnchor.current = anchor ?? null;
    try {
      const res = await authFetch(`/api/v1/docs?file=${encodeURIComponent(slug)}`);
      const body = await res.json();
      if (body.data?.html) {
        setHtml(body.data.html);
      } else {
        setError("Document not found");
      }
    } catch {
      setError("Failed to load document");
    } finally {
      setLoading(false);
    }
  }, []);

  const initialDone = useRef(false);

  useEffect(() => {
    if (initialDone.current) return;
    initialDone.current = true;
    const hash = window.location.hash.replace("#", "");
    loadDoc(hash || "getting-started");

    function onHashChange() {
      const slug = window.location.hash.replace("#", "") || "getting-started";
      loadDoc(slug);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [loadDoc]);

  useEffect(() => {
    if (loading || error) return;
    const anchor = pendingAnchor.current;
    if (!anchor) return;
    pendingAnchor.current = null;
    const container = contentRef.current;
    if (!container) return;
    const target = Array.from(
      container.querySelectorAll("h1, h2, h3, h4, h5, h6")
    ).find((h) => slugifyHeading(h.textContent ?? "") === anchor);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [html, loading, error]);

  function handleContentClick(e: React.MouseEvent<HTMLDivElement>) {
    const link = (e.target as HTMLElement).closest("a");
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href) return;

    const mdMatch = href.match(/^(?:\.\/)?([a-z0-9-]+)\.md(?:#(.+))?$/i);
    if (mdMatch) {
      e.preventDefault();
      loadDoc(mdMatch[1]!.toLowerCase(), mdMatch[2]?.toLowerCase());
      return;
    }

    if (href.startsWith("#")) {
      e.preventDefault();
      loadDoc(active, href.slice(1).toLowerCase());
    }
  }

  function handleClick(slug: string) {
    setActive(slug);
    loadDoc(slug);
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-0">
      <aside className="w-52 shrink-0 overflow-y-auto border-r border-border bg-bg-1 p-2">
        <div className="mb-3 border-b border-border px-2 pb-2 font-mono text-sm font-semibold text-text-1">
          Bifröst Docs
        </div>
        <nav className="flex flex-col gap-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.slug}
              onClick={() => handleClick(s.slug)}
              className={`w-full rounded px-3 py-1.5 text-left font-mono text-xs transition ${
                s.slug === active
                  ? "bg-accent/10 text-accent"
                  : "text-text-2 hover:bg-bg-2 hover:text-text-1"
              }`}
            >
              {s.title}
            </button>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto p-8">
        {loading ? (
          <p className="font-mono text-sm text-text-3">loading…</p>
        ) : error ? (
          <p className="font-mono text-sm text-danger">{error}</p>
        ) : (
          <div
            ref={contentRef}
            onClick={handleContentClick}
            className="prose-sm text-text-1 [&_a]:text-accent [&_a]:no-underline hover:[&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:bg-bg-1 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_blockquote]:text-text-3 [&_code]:rounded [&_code]:border [&_code]:border-border [&_code]:bg-bg-1 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_h1]:mb-3 [&_h1]:text-display [&_h2]:mb-4 [&_h2]:mt-8 [&_h2]:border-b [&_h2]:border-border [&_h2]:pb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_li]:text-text-2 [&_p]:mb-4 [&_p]:leading-relaxed [&_p]:text-text-2 [&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-code-bg [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-sm [&_table]:mb-4 [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5 [&_td]:text-sm [&_th]:border [&_th]:border-border [&_th]:bg-bg-1 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-mono [&_th]:text-xs [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </main>
    </div>
  );
}
