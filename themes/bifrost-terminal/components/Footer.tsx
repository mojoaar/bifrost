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

const BIFROST_REPO_URL = "https://github.com/mojoaar/bifrost";

export default function Footer() {
  const [text, setText] = useState<string | null>(null);

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
      <div className="mx-auto max-w-3xl space-y-1 px-4 py-6 font-mono text-xs text-text-3">
        {text && (
          <p>
            <span className="text-text-muted">{"// "}</span>
            {text}
          </p>
        )}
        <p>
          <span className="text-text-muted">{"// "}</span>
          Powered by{" "}
          <a
            href={BIFROST_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-2 underline decoration-text-muted underline-offset-2 transition hover:text-accent hover:decoration-accent"
          >
            Bifröst
          </a>
        </p>
      </div>
    </footer>
  );
}
