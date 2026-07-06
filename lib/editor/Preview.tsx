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

    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  if (!html) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
        Preview will appear here
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      className="h-full w-full border-0 bg-white"
      sandbox="allow-same-origin"
      title="Preview"
    />
  );
}
