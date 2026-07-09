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
import { Save, AlertTriangle, Trash2, Download, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth/client";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Field, Input, Select } from "@/themes/bifrost-terminal/components/ui/Input";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { FONT_NAMES } from "@/lib/fonts/registry";
import { PALETTES } from "@/lib/themes/palettes";

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [hasDemo, setHasDemo] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [settingsRes, demoRes] = await Promise.all([
          fetch("/api/v1/settings"),
          authFetch("/api/v1/admin/reset"),
        ]);
        const [settingsBody, demoBody] = await Promise.all([
          settingsRes.json(),
          demoRes.json().catch(() => ({})),
        ]);
        if (cancelled) return;
        if (settingsRes.ok) {
          const data: Record<string, string> = settingsBody.data ?? {};
          delete data["git.token"];
          setSettings(data);
        }
        setHasDemo((demoBody.data?.demoCount ?? 0) > 0);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await authFetch("/api/v1/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        applyTheme(settings["appearance.theme_mode"]);
        applyPalette(settings["appearance.color_scheme"]);
        setMessage("Saved");
        router.refresh();
      }
    } catch {
      setMessage("Error saving");
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await authFetch("/api/v1/export");
      if (!res.ok) {
        setImportMessage("Export failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bifrost-export-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setImportMessage("Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await authFetch("/api/v1/import", {
        method: "POST",
        body: formData,
      });
      const body = await res.json();
      setImportMessage(body.data?.message ?? body.error?.message ?? "Import failed");
      router.refresh();
    } catch {
      setImportMessage("Import failed");
    }
  }

  function applyTheme(mode: string | undefined) {
    let next: "light" | "dark" = "dark";
    if (mode === "light" || mode === "dark") {
      next = mode;
    } else if (mode === "system") {
      next = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    document.documentElement.setAttribute("data-theme", next);
    document.cookie = `bifrost_theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }

  function applyPalette(scheme: string | undefined) {
    document.documentElement.setAttribute("data-palette", scheme ?? "default");
  }

  function setValue(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setSettings((s) => ({ ...s, [key]: e.target.value }));
    };
  }

  async function handleReset() {
    if (resetConfirm !== "RESET") return;
    setResetting(true);
    setResetMessage("");
    try {
      const res = await authFetch("/api/v1/admin/reset", {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) {
        setResetMessage(body.error?.message ?? "Reset failed");
        return;
      }
      setResetMessage("Demo data removed. Reloading...");
      setHasDemo(false);
      setTimeout(() => router.push("/admin"), 800);
    } catch {
      setResetMessage("Network error");
    } finally {
      setResetting(false);
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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 font-mono text-sm text-text-3">
          <span className="text-text-muted">$</span> cat bifrost.config.ts
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card padding="md">
          <div className="mb-3 font-mono text-xs uppercase tracking-wider text-text-3">Site</div>
          <div className="space-y-3">
            <Field label="Title">
              <Input value={settings["site.title"] ?? ""} onChange={setValue("site.title")} />
            </Field>
            <Field label="Description">
              <Input value={settings["site.description"] ?? ""} onChange={setValue("site.description")} />
            </Field>
            <Field label="Footer Text">
              <Input
                value={settings["site.footer_text"] ?? ""}
                onChange={setValue("site.footer_text")}
                placeholder="Powered by Bifröst"
              />
            </Field>
            <Field label="Site URL" helper="Used for RSS, sitemap, and canonical URLs.">
              <Input
                value={settings["site.url"] ?? ""}
                onChange={setValue("site.url")}
                placeholder="https://example.com"
                className="font-mono"
              />
            </Field>
            <Field label="Language" helper="HTML lang attribute and RSS language.">
              <Input
                value={settings["site.language"] ?? "en"}
                onChange={setValue("site.language")}
                placeholder="en"
                className="font-mono w-24"
              />
            </Field>
          </div>
        </Card>

        <Card padding="md">
          <div className="mb-3 font-mono text-xs uppercase tracking-wider text-text-3">Appearance</div>
          <div className="space-y-3">
            <Field label="Default Theme Mode" helper="What first-time visitors see before they choose their own. The toggle in the header always overrides this.">
              <Select
                value={settings["appearance.theme_mode"] ?? "dark"}
                onChange={setValue("appearance.theme_mode")}
              >
                <option value="system">system</option>
                <option value="light">light</option>
                <option value="dark">dark</option>
              </Select>
            </Field>
            <Field
              label="Monospace Font"
              helper="JetBrains Mono, Fira Code, and Source Code Pro are bundled. Others fall back to system mono."
            >
              <Select
                value={settings["appearance.font_mono"] ?? FONT_NAMES[0]}
                onChange={setValue("appearance.font_mono")}
              >
                {FONT_NAMES.map((font) => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </Select>
            </Field>
            <Field label="Content Width" helper="Narrow 672px · Default 768px · Wide 896px">
              <Select
                value={settings["appearance.content_width"] ?? "default"}
                onChange={setValue("appearance.content_width")}
              >
                <option value="narrow">Narrow</option>
                <option value="default">Default</option>
                <option value="wide">Wide</option>
              </Select>
            </Field>
            <Field label="Posts per Page" helper="Number of posts on the homepage (1–100)">
              <Input
                type="number"
                min={1}
                max={100}
                value={settings["appearance.posts_per_page"] ?? "10"}
                onChange={setValue("appearance.posts_per_page")}
              />
            </Field>
            <Field label="Date Format" helper="US 12/31 · EU 31/12 · ISO 2026-12-31">
              <Select
                value={settings["appearance.date_format"] ?? "US"}
                onChange={setValue("appearance.date_format")}
              >
                <option value="US">US (M/D/Y)</option>
                <option value="EU">EU (D/M/Y)</option>
                <option value="ISO">ISO (Y-M-D)</option>
              </Select>
            </Field>
            <Field label="Time Format">
              <Select
                value={settings["appearance.time_format"] ?? "12h"}
                onChange={setValue("appearance.time_format")}
              >
                <option value="12h">12h (1:00 PM)</option>
                <option value="24h">24h (13:00)</option>
              </Select>
            </Field>
            <Field label="Color Scheme" helper="Choose a palette for both light and dark mode.">
              <Select
                value={settings["appearance.color_scheme"] ?? "default"}
                onChange={(e) => {
                  setSettings((s) => ({ ...s, "appearance.color_scheme": e.target.value }));
                  applyPalette(e.target.value);
                }}
              >
                {PALETTES.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name}</option>
                ))}
              </Select>
            </Field>
            <label className="flex items-center gap-2 font-mono text-sm text-text-2">
              <input
                type="checkbox"
                checked={settings["appearance.show_desc_in_title"] !== "false"}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, "appearance.show_desc_in_title": e.target.checked ? "true" : "false" }))
                }
                className="size-4 rounded border-border bg-bg-1 text-accent focus:ring-2 focus:ring-accent/30"
              />
              <span>Show description in page title</span>
            </label>
            <label className="flex items-center gap-2 font-mono text-sm text-text-2">
              <input
                type="checkbox"
                checked={settings["appearance.show_author"] !== "false"}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, "appearance.show_author": e.target.checked ? "true" : "false" }))
                }
                className="size-4 rounded border-border bg-bg-1 text-accent focus:ring-2 focus:ring-accent/30"
              />
              <span>Show author information on posts</span>
            </label>
            <label className="flex items-center gap-2 font-mono text-sm text-text-2">
              <input
                type="checkbox"
                checked={settings["appearance.show_author_bio"] !== "false"}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, "appearance.show_author_bio": e.target.checked ? "true" : "false" }))
                }
                className="size-4 rounded border-border bg-bg-1 text-accent focus:ring-2 focus:ring-accent/30"
              />
              <span>
                Show author bio on post pages
                <span className="ml-2 text-text-muted">(gated by &ldquo;Show author information&rdquo; above)</span>
              </span>
            </label>
            <label className="flex items-center gap-2 font-mono text-sm text-text-2">
              <input
                type="checkbox"
                checked={settings["appearance.show_featured_images"] !== "false"}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, "appearance.show_featured_images": e.target.checked ? "true" : "false" }))
                }
                className="size-4 rounded border-border bg-bg-1 text-accent focus:ring-2 focus:ring-accent/30"
              />
              <span>Show featured images on posts</span>
            </label>
            <label className="flex items-center gap-2 font-mono text-sm text-text-2">
              <input
                type="checkbox"
                checked={settings["appearance.show_reading_time"] !== "false"}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, "appearance.show_reading_time": e.target.checked ? "true" : "false" }))
                }
                className="size-4 rounded border-border bg-bg-1 text-accent focus:ring-2 focus:ring-accent/30"
              />
               <span>Show reading time</span>
             </label>
           </div>
        </Card>

        <Card padding="md">
          <div className="mb-3 font-mono text-xs uppercase tracking-wider text-text-3">Analytics</div>
          <Field label="Umami Website ID" helper="Optional. Leave blank to disable Umami tracking.">
            <Input
              value={settings["analytics.umami_website_id"] ?? ""}
              onChange={setValue("analytics.umami_website_id")}
              placeholder="a1b2c3d4-e5f6-..."
              className="font-mono"
            />
          </Field>
          <Field label="Umami Script URL" helper="Defaults to cloud.umami.is if left blank.">
            <Input
              value={settings["analytics.umami_script_url"] ?? ""}
              onChange={setValue("analytics.umami_script_url")}
              placeholder="https://cloud.umami.is/script.js"
              className="font-mono"
            />
          </Field>
          <Field label="Umami Domains" helper="Comma-separated. Optional — limits tracking to these domains.">
            <Input
              value={settings["analytics.umami_domains"] ?? ""}
              onChange={setValue("analytics.umami_domains")}
              placeholder="example.com,blog.example.com"
              className="font-mono"
            />
          </Field>
        </Card>

        <Card padding="md">
          <div className="mb-3 font-mono text-xs uppercase tracking-wider text-text-3">Export / Import</div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" onClick={handleExport} disabled={exporting}>
              <Download size={14} />
              <span>{exporting ? "Preparing…" : "Export ZIP"}</span>
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-bg-1 px-3 py-1.5 font-mono text-xs text-text-2 transition hover:border-border-strong hover:text-text-1">
              <Upload size={14} />
              <span>Import ZIP</span>
              <input
                type="file"
                accept=".zip"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            {importMessage && (
              <span className={`font-mono text-xs ${importMessage.startsWith("Imported") ? "text-success" : "text-danger"}`}>
                {importMessage}
              </span>
            )}
          </div>
        </Card>

        <div className="flex items-center gap-4">
          <Button type="submit" variant="primary" disabled={saving}>
            <Save size={14} />
            <span>{saving ? "Saving..." : "Save Settings"}</span>
          </Button>
          {message && (
            <span className={`font-mono text-xs ${message === "Saved" ? "text-success" : "text-danger"}`}>
              {message}
            </span>
          )}
        </div>
      </form>

      <div className="mt-10">
        {hasDemo && (
        <Card padding="md" className="border-danger/40">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-danger" />
            <span className="font-mono text-xs uppercase tracking-wider text-danger">
              Danger Zone
            </span>
          </div>
          <p className="mb-4 text-sm text-text-2">
            Remove the demo posts that ship with Bifröst. Your own posts, media,
            tags, and Git history are left untouched.
          </p>

          {!resetOpen ? (
            <Button
              variant="danger"
              onClick={() => setResetOpen(true)}
              type="button"
            >
              <Trash2 size={14} />
              <span>Remove demo data</span>
            </Button>
          ) : (
            <div className="space-y-3 rounded-md border border-danger/30 bg-danger/5 p-3">
              <p className="font-mono text-xs text-text-2">
                <span className="text-danger">$</span> Type{" "}
                <span className="rounded bg-bg-0 px-1.5 py-0.5 font-semibold text-danger">
                  RESET
                </span>{" "}
                to confirm. This cannot be undone.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  placeholder="RESET"
                  className="font-mono"
                  autoComplete="off"
                  autoFocus
                />
                <Button
                  variant="danger"
                  type="button"
                  onClick={handleReset}
                  disabled={resetting || resetConfirm !== "RESET"}
                >
                  <Trash2 size={14} />
                  <span>{resetting ? "Resetting..." : "Confirm"}</span>
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setResetOpen(false);
                    setResetConfirm("");
                    setResetMessage("");
                  }}
                  disabled={resetting}
                >
                  cancel
                </Button>
              </div>
              {resetMessage && (
                <p className={`font-mono text-xs ${resetMessage.includes("removed") ? "text-success" : "text-danger"}`}>
                  {resetMessage}
                </p>
              )}
            </div>
          )}
        </Card>
        )}
      </div>
    </div>
  );
}
