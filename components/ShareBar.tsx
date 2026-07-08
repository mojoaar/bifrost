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
import { SHARE_NETWORKS, buildShareUrl } from "@/lib/sharing";
import { SocialIcon } from "@/components/SocialIcon";

export default function ShareBar({ title, networks }: { title: string; networks: string[] }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setUrl(window.location.href);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = SHARE_NETWORKS.filter((n) => networks.includes(n.key));
  if (active.length === 0 || !url) return null;

  return (
    <div className="mt-10 flex items-center gap-3 border-t border-border pt-6">
      <span className="font-mono text-xs uppercase tracking-wider text-text-3">Share</span>
      <div className="flex flex-wrap items-center gap-3">
        {active.map((n) => (
          <a
            key={n.key}
            href={buildShareUrl(n.key, { url, title })}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share on ${n.label}`}
            title={n.label}
            className="text-text-muted transition hover:text-text-1"
          >
            <SocialIcon platform={n.key} size={18} />
          </a>
        ))}
      </div>
    </div>
  );
}
