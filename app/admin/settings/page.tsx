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
import { Save, AlertTriangle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth/client";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Field, Input, Select } from "@/themes/bifrost-terminal/components/ui/Input";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { FONT_NAMES } from "@/lib/fonts/registry";

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [themes, setThemes] = useState<{ slug: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [settingsRes, themesRes] = await Promise.all([
          fetch("/api/v1/settings"),
          fetch("/api/v1/themes"),
        ]);
        const [settingsBody, themesBody] = await Promise.all([
          settingsRes.json(),
          themesRes.json(),
        ]);
        if (cancelled) return;
        if (settingsRes.ok) setSettings(settingsBody.data ?? {});
        if (themesRes.ok) setThemes(themesBody.data ?? []);
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
        setMessage("Saved");
        router.refresh();
      }
    } catch {
      setMessage("Error saving");
    } finally {
      setSaving(false);
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

  function setValue(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setSettings((s) => ({ ...s, [key]: e.target.value }));
    };
  }

  async function handleReset() {
    if (resetConfirm !== "RESET") return;
    setResetting(true);
    setResetMessage("");
    const token = localStorage.getItem("bifrost_token");
    try {
      const res = await fetch("/api/v1/admin/reset", {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const body = await res.json();
      if (!res.ok) {
        setResetMessage(body.error?.message ?? "Reset failed");
        return;
      }
      setResetMessage("All content removed. Reloading...");
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
          </div>
        </Card>

        <Card padding="md">
          <div className="mb-3 font-mono text-xs uppercase tracking-wider text-text-3">Theme</div>
          <Field label="Active Theme">
            <Select
              value={settings["theme"] ?? "bifrost-terminal"}
              onChange={setValue("theme")}
              className="font-mono"
            >
              {themes.length === 0 ? (
                <option value="bifrost-terminal">bifrost-terminal</option>
              ) : (
                themes.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name}
                  </option>
                ))
              )}
            </Select>
          </Field>
        </Card>

        <Card padding="md">
          <div className="mb-3 font-mono text-xs uppercase tracking-wider text-text-3">Git</div>
          <div className="space-y-3">
            <Field label="Remote URL" helper="Optional. Leave empty to disable push/pull.">
              <Input
                value={settings["git.remote"] ?? ""}
                onChange={setValue("git.remote")}
                placeholder="git@github.com:user/repo.git"
                className="font-mono"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Branch">
                <Input
                  value={settings["git.branch"] ?? "main"}
                  onChange={setValue("git.branch")}
                  placeholder="main"
                  className="font-mono"
                />
              </Field>
              <Field label="History Limit" helper="Max commits shown in /admin/git">
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={settings["git.history_limit"] ?? "50"}
                  onChange={setValue("git.history_limit")}
                  className="font-mono"
                />
              </Field>
            </div>
            <Field
              label="Auth Token"
              helper="Personal access token, deploy key, or password. Overrides BIFROST_GIT_TOKEN env var. Stored in the database."
            >
              <Input
                type="password"
                value={settings["git.token"] ?? ""}
                onChange={setValue("git.token")}
                placeholder="ghp_•••••••"
                className="font-mono"
                autoComplete="off"
              />
            </Field>
            <label className="flex items-center gap-2 font-mono text-sm text-text-2">
              <input
                type="checkbox"
                checked={settings["git.enabled"] !== "false"}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, "git.enabled": e.target.checked ? "true" : "false" }))
                }
                className="size-4 rounded border-border bg-bg-1 text-accent focus:ring-2 focus:ring-accent/30"
              />
              <span>Git enabled</span>
            </label>
            <label className="flex items-center gap-2 font-mono text-sm text-text-2">
              <input
                type="checkbox"
                checked={settings["git.autoCommit"] !== "false"}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, "git.autoCommit": e.target.checked ? "true" : "false" }))
                }
                className="size-4 rounded border-border bg-bg-1 text-accent focus:ring-2 focus:ring-accent/30"
              />
              <span>Auto-commit on post save</span>
            </label>
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
        <Card padding="md" className="border-danger/40">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-danger" />
            <span className="font-mono text-xs uppercase tracking-wider text-danger">
              Danger Zone
            </span>
          </div>
          <p className="mb-4 text-sm text-text-2">
            Remove all posts, media, tags, and the git history. This will not
            affect the database schema, themes, or installed plugins.
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
                <p className={`font-mono text-xs ${resetMessage.includes("All content") ? "text-success" : "text-danger"}`}>
                  {resetMessage}
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
