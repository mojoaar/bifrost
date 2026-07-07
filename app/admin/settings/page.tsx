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
import { Save } from "lucide-react";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Field, Input, Select } from "@/themes/bifrost-terminal/components/ui/Input";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { FONT_NAMES } from "@/lib/fonts/registry";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/v1/settings");
        const body = await res.json();
        if (!cancelled && res.ok) setSettings(body.data ?? {});
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
    const token = localStorage.getItem("bifrost_token");
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(settings),
      });
      if (res.ok) setMessage("Saved");
    } catch {
      setMessage("Error saving");
    } finally {
      setSaving(false);
    }
  }

  function setValue(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setSettings((s) => ({ ...s, [key]: e.target.value }));
    };
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

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
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
            <Field label="Theme Mode" helper="System follows your OS preference. Light and dark override it.">
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
          </div>
        </Card>

        <Card padding="md">
          <div className="mb-3 font-mono text-xs uppercase tracking-wider text-text-3">Theme</div>
          <Field label="Active Theme">
            <Input
              value={settings["theme"] ?? "bifrost-terminal"}
              onChange={setValue("theme")}
              placeholder="bifrost-terminal"
              className="font-mono"
            />
          </Field>
        </Card>

        <Card padding="md">
          <div className="mb-3 font-mono text-xs uppercase tracking-wider text-text-3">Git Remote</div>
          <Field label="Remote URL" helper="Optional. Auto-commit will push to this on save.">
            <Input
              value={settings["git.remote"] ?? ""}
              onChange={setValue("git.remote")}
              placeholder="git@github.com:user/repo.git"
              className="font-mono"
            />
          </Field>
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
    </div>
  );
}
