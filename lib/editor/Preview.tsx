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

interface Props {
  source: string;
}

const DARK_TOKENS = `:root[data-theme="dark"] {
  --bg-0: #09090b; --bg-1: #18181b; --bg-2: #1f1f23; --bg-3: #27272a;
  --surface: #18181b; --surface-raised: #1f1f23; --surface-sunken: #0c0c0e;
  --text-1: #fafafa; --text-2: #a1a1aa; --text-3: #71717a; --text-muted: #52525b;
  --border: #27272a; --border-strong: #3f3f46;
  --accent: #3b82f6; --accent-hover: #60a5fa; --accent-fg: #ffffff; --accent-subtle: #1e3a8a;
  --code-bg: #0c0c0e; --code-border: #27272a;
  --font-body: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono Variable', ui-monospace, monospace;
}`;

const LIGHT_TOKENS = `:root[data-theme="light"] {
  --bg-0: #ffffff; --bg-1: #fafafa; --bg-2: #f4f4f5; --bg-3: #e4e4e7;
  --surface: #ffffff; --surface-raised: #fafafa; --surface-sunken: #f4f4f5;
  --text-1: #18181b; --text-2: #52525b; --text-3: #71717a; --text-muted: #a1a1aa;
  --border: #e4e4e7; --border-strong: #d4d4d8;
  --accent: #2563eb; --accent-hover: #1d4ed8; --accent-fg: #ffffff; --accent-subtle: #dbeafe;
  --code-bg: #f4f4f5; --code-border: #e4e4e7;
  --font-body: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono Variable', ui-monospace, monospace;
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
pre:has(span[style*="--shiki"]) { color: var(--shiki-dark); background-color: var(--shiki-dark-bg); }
:root[data-theme="light"] pre:has(span[style*="--shiki"]) { color: var(--shiki-light); background-color: var(--shiki-light-bg); }
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
`;

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

    const parentTheme = document.documentElement.getAttribute("data-theme") ?? "dark";
    const fullDoc = `<!DOCTYPE html><html data-theme="${parentTheme}"><head><meta charset="utf-8"><style>${DARK_TOKENS}${LIGHT_TOKENS}${PREVIEW_STYLES}</style></head><body>${html}</body></html>`;

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
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
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
