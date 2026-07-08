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
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { authFetch } from "@/lib/auth/client";
import CssEditor from "@/lib/editor/CssEditor";

export default function CustomCssPage() {
  const router = useRouter();
  const [css, setCss] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/settings");
        const body = await res.json();
        if (res.ok && body.data?.["appearance.custom_css"]) {
          setCss(body.data["appearance.custom_css"]);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const res = await authFetch("/api/v1/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ "appearance.custom_css": css }),
      });
      if (res.ok) {
        setMessage("Saved. Refresh your site to see changes.");
      } else {
        setMessage("Error saving");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/themes")}>
          <ArrowLeft size={14} />
          <span>back</span>
        </Button>
        <h1 className="text-lg font-semibold tracking-tight">Custom CSS</h1>
        <span className="font-mono text-xs text-text-muted">appearance.custom_css</span>
        <div className="ml-auto flex items-center gap-2">
          {message && (
            <span className={`font-mono text-xs ${message.startsWith("Saved") ? "text-success" : "text-danger"}`}>
              {message}
            </span>
          )}
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            <Save size={14} />
            <span>{saving ? "Saving…" : "Save"}</span>
          </Button>
        </div>
      </div>
      {loading ? (
        <Card padding="md">
          <p className="font-mono text-sm text-text-3">loading…</p>
        </Card>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-bg-1">
          <CssEditor value={css} onChange={setCss} />
        </div>
      )}
    </div>
  );
}
