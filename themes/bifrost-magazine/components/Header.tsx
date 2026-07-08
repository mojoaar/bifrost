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
import { Sun, Moon } from "lucide-react";
import { SocialIcon } from "@/components/SocialIcon";
import { useTheme } from "@/lib/themes/theme-context";

const SOCIAL_KEYS = ["facebook", "bluesky", "github", "linkedin"] as const;

export default function Header({ widthClass = "max-w-4xl" }: { widthClass?: string }) {
  const { mode, toggle } = useTheme();
  const [title, setTitle] = useState("Bifröst");
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/settings");
        const body = await res.json();
        if (res.ok && body.data) {
          setTitle(String(body.data["site.title"] ?? "Bifröst"));
          const links: Record<string, string> = {};
          for (const key of SOCIAL_KEYS) {
            const url = body.data[`theme.magazine.social.${key}`];
            if (url) links[key] = String(url);
          }
          setSocialLinks(links);
        }
      } catch {
        // use default
      }
    }
    load();
  }, []);

  const visible = SOCIAL_KEYS.filter((k) => socialLinks[k]);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg-0/80 backdrop-blur">
      <div className={`mx-auto flex items-center justify-between px-4 py-2.5 ${widthClass}`}>
        <Link href="/" className="text-base font-bold tracking-tight text-text-1 transition hover:text-accent">
          {title}
        </Link>
        <div className="flex items-center gap-3">
          {visible.map((key) => (
            <a
              key={key}
              href={socialLinks[key]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted transition hover:text-text-1"
            >
              <SocialIcon platform={key} size={18} />
            </a>
          ))}
          <button
            onClick={toggle}
            className="rounded-md border border-border bg-bg-1 p-1.5 text-text-2 transition hover:border-border-strong hover:text-text-1"
            aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
          >
            {mode === "light" ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </div>
      </div>
    </header>
  );
}
