/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the License for details.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, Save, FileCode, Code2, FolderOpen } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import GenericEditor from "@/lib/editor/GenericEditor";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Field, Select } from "@/themes/bifrost-terminal/components/ui/Input";

interface ThemeInfo {
  slug: string;
  name: string;
}

export default function ThemeFilesPage() {
  const [themes, setThemes] = useState<ThemeInfo[]>([]);
  const [activeTheme, setActiveTheme] = useState("bifrost-terminal");
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch("/api/v1/themes");
        const body = await res.json();
        if (body.data) setThemes(body.data);
      } catch {
        setMessage("Failed to load themes");
        setMessageType("error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSelectedFile("");
      setContent("");
      try {
        const res = await authFetch(`/api/v1/themes/files?theme=${encodeURIComponent(activeTheme)}`);
        if (cancelled) return;
        const body = await res.json();
        if (body.data?.files) {
          setFiles(body.data.files);
        } else if (body.error) {
          setMessage(body.error.message);
          setMessageType("error");
        }
      } catch {
        if (!cancelled) {
          setMessage("Failed to load files");
          setMessageType("error");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [activeTheme]);

  const loadFileContent = useCallback(async (file: string) => {
    try {
      const res = await authFetch(
        `/api/v1/themes/files?theme=${encodeURIComponent(activeTheme)}&file=${encodeURIComponent(file)}`
      );
      const body = await res.json();
      if (body.data?.content !== undefined) {
        setContent(body.data.content);
        setSelectedFile(file);
      }
    } catch {
      setMessage("Failed to load file");
      setMessageType("error");
    }
  }, [activeTheme]);

  async function handleSave() {
    if (!selectedFile) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await authFetch("/api/v1/themes/files", {
        method: "PUT",
        body: JSON.stringify({
          theme: activeTheme,
          file: selectedFile,
          content,
        }),
      });
      const body = await res.json();
      if (body.data?.saved) {
        setMessage("Saved! Restart required for changes to take effect.");
        setMessageType("success");
      } else if (body.data?.message) {
        setMessage(body.data.message);
        setMessageType("success");
      } else if (body.error) {
        setMessage(body.error.message);
        setMessageType("error");
      }
    } catch {
      setMessage("Failed to save file");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="font-mono text-sm text-text-3">loading themes…</p>;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            <Code2 size={20} className="mr-2 inline-block text-text-3" />
            Theme Files
          </h1>
          <p className="mt-1 font-mono text-sm text-text-3">
            <span className="text-text-muted">$</span> edit theme source files
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Field label="Theme">
            <Select
              value={activeTheme}
              onChange={(e) => setActiveTheme(e.target.value)}
            >
              {themes.map((t) => (
                <option key={t.slug} value={t.slug}>{t.name}</option>
              ))}
            </Select>
          </Field>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!selectedFile || saving}
            className="h-[2.375rem] self-end"
          >
            <Save size={14} />
            <span>{saving ? "Saving…" : "Save"}</span>
          </Button>
        </div>
      </div>

      <Card padding="sm" className="border-amber-800/40 bg-amber-900/10">
        <div className="flex items-center gap-2 text-sm text-amber-300">
          <AlertTriangle size={16} />
          <span>Changes to theme files require an application restart to take effect.</span>
        </div>
      </Card>

      {message && (
        <div
          className={`rounded-md px-3 py-2 font-mono text-sm ${
            messageType === "error"
              ? "bg-red-950/30 text-red-300"
              : "bg-green-950/30 text-green-300"
          }`}
        >
          {message}
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-4">
        <aside className="w-56 shrink-0 overflow-y-auto rounded-md border border-border bg-bg-1 p-2">
          <div className="mb-2 flex items-center gap-1.5 px-2 py-1 font-mono text-xs text-text-3">
            <FolderOpen size={12} />
            <span>{activeTheme}</span>
          </div>
          {files.length === 0 ? (
            <p className="px-2 py-1 font-mono text-xs text-text-muted">no files</p>
          ) : (
            <ul className="space-y-0.5">
              {files.map((file) => (
                <li key={file}>
                  <button
                    onClick={() => loadFileContent(file)}
                    className={`w-full truncate rounded px-2 py-1 text-left font-mono text-xs transition ${
                      selectedFile === file
                        ? "bg-accent/10 text-accent"
                        : "text-text-2 hover:bg-bg-0 hover:text-text-1"
                    }`}
                  >
                    <FileCode size={10} className="mr-1.5 inline-block shrink-0 text-text-muted" />
                    {file}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="flex min-h-0 flex-1 flex-col rounded-md border border-border bg-bg-1">
          {selectedFile ? (
            <>
              <div className="flex items-center gap-2 border-b border-border px-4 py-2">
                <FileCode size={14} className="text-text-3" />
                <span className="font-mono text-sm text-text-2">{selectedFile}</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <GenericEditor
                  value={content}
                  onChange={setContent}
                  fileName={selectedFile}
                />
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-text-muted">
              <p className="font-mono text-sm">select a file to edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
