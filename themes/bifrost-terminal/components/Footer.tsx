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

export default function Footer() {
  const [text, setText] = useState("Powered by Bifröst");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/settings");
        const body = await res.json();
        if (res.ok && body.data?.["site.footer_text"]) {
          setText(String(body.data["site.footer_text"]));
        }
      } catch {
        // use default
      }
    }
    load();
  }, []);

  return (
    <footer className="mt-12 border-t border-border">
      <div className="mx-auto max-w-3xl px-4 py-6 font-mono text-xs text-text-3">
        <span className="text-text-muted">{"// "}</span>
        {text}
      </div>
    </footer>
  );
}
