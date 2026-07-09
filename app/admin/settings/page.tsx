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
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth/client";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { SiteSection } from "./_components/SiteSection";
import { BrandingSection } from "./_components/BrandingSection";
import { AppearanceSection } from "./_components/AppearanceSection";
import { AnalyticsSection } from "./_components/AnalyticsSection";
import { ImportExportSection } from "./_components/ImportExportSection";
import { DangerZoneSection } from "./_components/DangerZoneSection";

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
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [faviconMessage, setFaviconMessage] = useState("");
  const [faviconVersion, setFaviconVersion] = useState(0);

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

  async function handleFaviconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFaviconUploading(true);
    setFaviconMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await authFetch("/api/v1/media/upload", {
        method: "POST",
        body: formData,
      });
      const body = await res.json();
      if (!res.ok || !body.data?.id) {
        setFaviconMessage(body.error?.message ?? "Upload failed");
        return;
      }
      const saveRes = await authFetch("/api/v1/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ "site.favicon_media_id": body.data.id }),
      });
      if (!saveRes.ok) {
        setFaviconMessage("Upload failed");
        return;
      }
      setSettings((s) => ({ ...s, "site.favicon_media_id": body.data.id }));
      setFaviconVersion((v) => v + 1);
      setFaviconMessage("Favicon updated");
      router.refresh();
    } catch {
      setFaviconMessage("Upload failed");
    } finally {
      setFaviconUploading(false);
      e.target.value = "";
    }
  }

  async function handleFaviconReset() {
    setFaviconUploading(true);
    setFaviconMessage("");
    try {
      const res = await authFetch("/api/v1/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ "site.favicon_media_id": "" }),
      });
      if (!res.ok) {
        setFaviconMessage("Reset failed");
        return;
      }
      setSettings((s) => {
        const next = { ...s };
        delete next["site.favicon_media_id"];
        return next;
      });
      setFaviconVersion((v) => v + 1);
      setFaviconMessage("Reset to default");
      router.refresh();
    } catch {
      setFaviconMessage("Reset failed");
    } finally {
      setFaviconUploading(false);
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
        <SiteSection settings={settings} setValue={setValue} />

        <BrandingSection
          settings={settings}
          faviconUploading={faviconUploading}
          faviconMessage={faviconMessage}
          faviconVersion={faviconVersion}
          onUpload={handleFaviconUpload}
          onReset={handleFaviconReset}
        />

        <AppearanceSection
          settings={settings}
          setValue={setValue}
          setSettings={setSettings}
          applyPalette={applyPalette}
        />

        <AnalyticsSection settings={settings} setValue={setValue} />

        <ImportExportSection
          exporting={exporting}
          importMessage={importMessage}
          onExport={handleExport}
          onImport={handleImport}
        />

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
          <DangerZoneSection
            resetOpen={resetOpen}
            resetConfirm={resetConfirm}
            resetting={resetting}
            resetMessage={resetMessage}
            setResetOpen={setResetOpen}
            setResetConfirm={setResetConfirm}
            setResetMessage={setResetMessage}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}
