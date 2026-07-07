/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";

export function useCodeCopyButtons(html: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;

    const container = containerRef.current;
    if (!container) return;

    const preBlocks = container.querySelectorAll<HTMLPreElement>("pre");
    preBlocks.forEach((pre) => {
      if (pre.dataset.copyWrapped === "true") return;
      pre.dataset.copyWrapped = "true";

      const wrapper = document.createElement("div");
      wrapper.className = "code-block-wrapper";

      const btn = document.createElement("button");
      btn.className =
        "code-copy-btn absolute top-2 right-2 z-10 rounded-md border border-border bg-bg-1 p-1.5 text-text-2 transition hover:border-accent hover:text-accent";
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
      btn.setAttribute("aria-label", "Copy code");
      btn.title = "Copy code";

      btn.addEventListener("click", async () => {
        const code = pre.querySelector("code")?.textContent ?? pre.textContent ?? "";
        await navigator.clipboard.writeText(code);
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
        btn.classList.add("text-success");
        setTimeout(() => {
          btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
          btn.classList.remove("text-success");
        }, 1500);
      });

      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
      wrapper.appendChild(btn);
    });
  }, [html]);

  return containerRef;
}

export function CopyButton({
  getText,
}: {
  getText: () => string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(getText());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [getText]);

  return (
    <button
      onClick={handleCopy}
      className="rounded-md border border-border bg-bg-1 p-1.5 text-text-2 transition hover:border-accent hover:text-accent"
      aria-label="Copy code"
      title="Copy code"
    >
      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
    </button>
  );
}
