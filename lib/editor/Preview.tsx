/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { PALETTE_MAP } from "@/lib/themes/palettes";

interface Props {
  source: string;
}

const BASE_TOKENS = `:root {
  --font-mono: 'JetBrains Mono Variable', 'JetBrains Mono', 'Fira Code Variable', 'IBM Plex Mono', 'Source Code Pro Variable', 'Roboto Mono', Inconsolata, ui-monospace, monospace;
  --font-body: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui, sans-serif;
  --text-xs: 0.75rem; --text-sm: 0.8125rem; --text-base: 0.9375rem;
  --text-lg: 1.0625rem; --text-xl: 1.25rem; --text-2xl: 1.5rem;
  --text-3xl: 1.875rem; --text-display: 2.5rem;
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px; --radius-full: 9999px;
}`;

const PREVIEW_STYLES = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--bg-0);
  color: var(--text-1);
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.65;
  padding: 24px 32px;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3, h4, h5, h6 {
  color: var(--text-1);
  line-height: 1.25;
  margin-top: 24px;
  margin-bottom: 12px;
  letter-spacing: -0.01em;
}
h1 { font-size: 2rem; font-weight: 700; letter-spacing: -0.02em; }
h2 { font-size: 1.5rem; font-weight: 600; }
h3 { font-size: 1.25rem; font-weight: 500; }
h4 { font-size: 1.0625rem; font-weight: 500; }
p { margin: 0 0 16px; }
code, pre, kbd, samp {
  font-family: var(--font-mono);
  font-feature-settings: "calt", "liga";
}
:not(pre) > code {
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.125rem 0.375rem;
  font-size: 0.875em;
  color: var(--text-1);
}
pre {
  background: var(--code-bg);
  border: 1px solid var(--code-border);
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.6;
  margin: 20px 0;
}
pre code { background: transparent; border: none; padding: 0; font-size: inherit; }
blockquote {
  border-left: 3px solid var(--accent);
  padding: 4px 16px;
  margin: 20px 0;
  color: var(--text-2);
  font-style: italic;
}
a { color: var(--accent); text-decoration: none; transition: color 100ms ease; }
a:hover { color: var(--accent-hover); text-decoration: underline; text-underline-offset: 2px; }
hr { border: none; border-top: 1px solid var(--border); margin: 20px 0; }
table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
th, td { border: 1px solid var(--border); padding: 6px 12px; text-align: left; }
th { background: var(--bg-1); font-weight: 600; color: var(--text-1); }
ul, ol { margin: 0 0 16px 24px; }
li { margin-bottom: 4px; }
img { max-width: 100%; height: auto; border-radius: 6px; }
.lucide-icon { display: inline-block; vertical-align: -0.125em; }
`;

function buildPaletteCSS(slug: string): string {
  const p = PALETTE_MAP.get(slug) ?? PALETTE_MAP.get("default")!;
  const parts: string[] = [];
  for (const mode of ["light", "dark"] as const) {
    const tokens = p[mode];
    const lines = Object.entries(tokens)
      .map(([k, v]) => `${k}: ${v};`)
      .join(" ");
    parts.push(`:root[data-theme="${mode}"] { ${lines} }`);
  }
  return parts.join("\n");
}

export default function Preview({ source }: Props) {
  const [html, setHtml] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const res = await fetch("/api/v1/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source }),
      });

      if (cancelled) return;

      if (res.ok) {
        const body = await res.json();
        setHtml(body.data?.html ?? "");
      }
    }

    const timer = setTimeout(render, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [source]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !html) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    const parentPalette = document.documentElement.getAttribute("data-palette") ?? "default";
    const parentTheme = document.documentElement.getAttribute("data-theme") ?? "dark";
    const paletteCSS = buildPaletteCSS(parentPalette);

    const fullDoc = `<!DOCTYPE html><html data-theme="${parentTheme}"><head><meta charset="utf-8"><style>${BASE_TOKENS}${paletteCSS}${PREVIEW_STYLES}</style></head><body>${html}</body></html>`;

    doc.open();
    doc.write(fullDoc);
    doc.close();
  }, [html]);

  useEffect(() => {
    if (!html) return;

    const observer = new MutationObserver(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      const doc = iframe.contentDocument;
      if (!doc) return;

      const parentTheme = document.documentElement.getAttribute("data-theme") ?? "dark";
      const current = doc.documentElement.getAttribute("data-theme");
      if (current !== parentTheme) {
        doc.documentElement.setAttribute("data-theme", parentTheme);
      }

      const parentPalette = document.documentElement.getAttribute("data-palette") ?? "default";
      const currentPalette = doc.documentElement.getAttribute("data-palette");
      if (currentPalette !== parentPalette) {
        doc.documentElement.setAttribute("data-palette", parentPalette);
        const paletteCSS = buildPaletteCSS(parentPalette);
        doc.documentElement.querySelector("style")!.textContent = `${BASE_TOKENS}${paletteCSS}${PREVIEW_STYLES}`;
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-palette"],
    });

    return () => observer.disconnect();
  }, [html]);

  if (!html) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-sm text-text-3">
        preview will appear here
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      className="h-full w-full border-0"
      sandbox="allow-same-origin"
      title="Preview"
    />
  );
}
