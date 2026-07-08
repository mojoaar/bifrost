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
import { authFetch } from "@/lib/auth/client";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Field, Input } from "@/themes/bifrost-terminal/components/ui/Input";
import { FileCode, Code2, Save } from "lucide-react";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";

export default function ThemesPage() {
  const [themes, setThemes] = useState<{ slug: string; name: string; description: string }[]>([]);
  const [activeTheme, setActiveTheme] = useState("bifrost-terminal");
  const [selected, setSelected] = useState("");
  const [heroContent, setHeroContent] = useState("");
  const [heroSaving, setHeroSaving] = useState(false);
  const [heroMessage, setHeroMessage] = useState("");
  const [themeSaving, setThemeSaving] = useState(false);
  const [showTitle, setShowTitle] = useState(true);
  const [showDescription, setShowDescription] = useState(true);
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialBluesky, setSocialBluesky] = useState("");
  const [socialGithub, setSocialGithub] = useState("");
  const [socialLinkedin, setSocialLinkedin] = useState("");
  const [socialSaving, setSocialSaving] = useState(false);
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
      }
    }
    async function loadActive() {
      try {
        const res = await authFetch("/api/v1/settings");
        const body = await res.json();
        if (!cancelled && body.data) {
          const slug = body.data["theme"] ?? "bifrost-terminal";
          setActiveTheme(slug);
          setSelected(slug);
          setShowTitle(body.data["appearance.show_site_title"] !== "false");
          setShowDescription(body.data["appearance.show_site_description"] !== "false");
          setSocialFacebook(body.data["theme.magazine.social.facebook"] ?? "");
          setSocialBluesky(body.data["theme.magazine.social.bluesky"] ?? "");
          setSocialGithub(body.data["theme.magazine.social.github"] ?? "");
          setSocialLinkedin(body.data["theme.magazine.social.linkedin"] ?? "");
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    loadActive();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (activeTheme !== "bifrost-read") return;
    (async () => {
      try {
        const res = await authFetch(
          `/api/v1/themes/files?theme=bifrost-read&file=${encodeURIComponent("hero.md")}`
        );
        const body = await res.json();
        if (body.data?.content !== undefined) {
          setHeroContent(body.data.content);
        }
      } catch {
        // silent
      }
    })();
  }, [activeTheme]);

  async function handleHeroSave() {
    setHeroSaving(true);
    setHeroMessage("");
    try {
      const res = await authFetch("/api/v1/themes/files", {
        method: "PUT",
        body: JSON.stringify({
          theme: "bifrost-read",
          file: "hero.md",
          content: heroContent,
        }),
      });
      const body = await res.json();
      if (body.data?.saved) {
        setHeroMessage(body.data.message ?? "Saved");
      } else {
        setHeroMessage(body.error?.message ?? body.data?.message ?? "Error");
      }
    } catch {
      setHeroMessage("Network error");
    } finally {
      setHeroSaving(false);
    }
  }

  async function handleThemeSave() {
    if (!selected || selected === activeTheme) return;
    setThemeSaving(true);
    try {
      const res = await authFetch("/api/v1/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ theme: selected }),
      });
      if (res.ok) {
        setActiveTheme(selected);
      }
    } catch {
      // silent
    } finally {
      setThemeSaving(false);
    }
  }

  async function handleSocialSave() {
    setSocialSaving(true);
    try {
      await authFetch("/api/v1/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          "theme.magazine.social.facebook": socialFacebook,
          "theme.magazine.social.bluesky": socialBluesky,
          "theme.magazine.social.github": socialGithub,
          "theme.magazine.social.linkedin": socialLinkedin,
        }),
      });
    } catch {
      // silent
    } finally {
      setSocialSaving(false);
    }
  }

  async function handleDisplaySave(key: string, value: boolean) {
    try {
      await authFetch("/api/v1/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [key]: value ? "true" : "false" }),
      });
    } catch {
      // silent
    }
  }

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
          <Button variant="primary" onClick={handleThemeSave} disabled={!selected || selected === activeTheme || themeSaving} className="h-[2.375rem]">
            <Save size={14} />
            <span>{themeSaving ? "Saving…" : "Activate theme"}</span>
          </Button>
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
            <button
              key={theme.slug}
              onClick={() => setSelected(theme.slug)}
              className={`cursor-pointer rounded-lg border bg-surface p-4 text-left transition ${
                selected === theme.slug
                  ? "border-accent ring-2 ring-accent/30"
                  : "border-border hover:border-border-strong"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-mono text-base font-semibold text-text-1">
                  {theme.name}
                </h3>
                {theme.slug === activeTheme && (
                  <span className="rounded border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-xs uppercase tracking-wider text-accent">
                    active
                  </span>
                )}
              </div>
              <p className="text-sm text-text-2">{theme.description}</p>
            </button>
          ))}
        </div>
      )}

      {activeTheme === "bifrost-read" && (
        <div className="mt-8 space-y-4">
          <Card padding="md">
            <div className="mb-3 font-mono text-xs uppercase tracking-wider text-text-3">Display</div>
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-2 font-mono text-sm text-text-2">
                <input
                  type="checkbox"
                  checked={showTitle}
                  onChange={(e) => {
                    setShowTitle(e.target.checked);
                    handleDisplaySave("appearance.show_site_title", e.target.checked);
                  }}
                  className="size-4 rounded border-border bg-bg-1 text-accent focus:ring-2 focus:ring-accent/30"
                />
                <span>Show site title in hero</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 font-mono text-sm text-text-2">
                <input
                  type="checkbox"
                  checked={showDescription}
                  onChange={(e) => {
                    setShowDescription(e.target.checked);
                    handleDisplaySave("appearance.show_site_description", e.target.checked);
                  }}
                  className="size-4 rounded border-border bg-bg-1 text-accent focus:ring-2 focus:ring-accent/30"
                />
                <span>Show site description in hero</span>
              </label>
            </div>
          </Card>
          <Card padding="md">
            <div className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-text-3">
              <FileCode size={12} />
              <span>hero.md</span>
            </div>
            <textarea
              value={heroContent}
              onChange={(e) => setHeroContent(e.target.value)}
              className="h-48 w-full resize-y rounded-md border border-border bg-bg-1 p-3 font-mono text-sm text-text-1 placeholder:text-text-muted focus:border-accent focus:outline-none"
              placeholder="Write markdown for your hero section…"
            />
            <div className="mt-3 flex items-center gap-3">
              <Button variant="primary" onClick={handleHeroSave} disabled={heroSaving}>
                <Save size={14} />
                <span>{heroSaving ? "Saving…" : "Save Hero"}</span>
              </Button>
              {heroMessage && (
                <span className={`font-mono text-xs ${heroMessage.startsWith("Saved") || heroMessage === "File saved." ? "text-success" : "text-danger"}`}>
                  {heroMessage}
                </span>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTheme === "bifrost-magazine" && (
        <div className="mt-8">
          <Card padding="md">
            <div className="mb-3 font-mono text-xs uppercase tracking-wider text-text-3">Social Links</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Facebook">
                <Input
                  value={socialFacebook}
                  onChange={(e) => setSocialFacebook(e.target.value)}
                  placeholder="https://facebook.com/you"
                />
              </Field>
              <Field label="Bluesky">
                <Input
                  value={socialBluesky}
                  onChange={(e) => setSocialBluesky(e.target.value)}
                  placeholder="https://bsky.app/profile/you.bsky.social"
                />
              </Field>
              <Field label="GitHub">
                <Input
                  value={socialGithub}
                  onChange={(e) => setSocialGithub(e.target.value)}
                  placeholder="https://github.com/you"
                />
              </Field>
              <Field label="LinkedIn">
                <Input
                  value={socialLinkedin}
                  onChange={(e) => setSocialLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/you"
                />
              </Field>
            </div>
            <div className="mt-3">
              <Button variant="primary" onClick={handleSocialSave} disabled={socialSaving}>
                <Save size={14} />
                <span>{socialSaving ? "Saving…" : "Save Social Links"}</span>
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
