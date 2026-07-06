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

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/settings");
        const body = await res.json();
        if (res.ok) setSettings(body.data ?? {});
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
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

  if (loading) return <p className="text-zinc-400">Loading...</p>;

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Settings</h2>

      <form onSubmit={handleSave} className="max-w-lg space-y-6">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-zinc-300">Site</legend>
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm text-zinc-400">Title</span>
              <input type="text" value={settings["site.title"] ?? ""} onChange={setValue("site.title")} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none" />
            </label>
            <label className="block">
              <span className="text-sm text-zinc-400">Description</span>
              <input type="text" value={settings["site.description"] ?? ""} onChange={setValue("site.description")} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none" />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-zinc-300">Theme</legend>
          <label className="block">
            <span className="text-sm text-zinc-400">Active Theme</span>
            <input type="text" value={settings["theme"] ?? "default"} onChange={setValue("theme")} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none" />
          </label>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-zinc-300">Git Remote</legend>
          <label className="block">
            <span className="text-sm text-zinc-400">Remote URL</span>
            <input type="text" value={settings["git.remote"] ?? ""} onChange={setValue("git.remote")} placeholder="git@github.com:user/repo.git" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-mono focus:border-zinc-500 focus:outline-none" />
          </label>
        </fieldset>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving} className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50">
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {message && <span className="text-sm text-green-400">{message}</span>}
        </div>
      </form>
    </div>
  );
}
