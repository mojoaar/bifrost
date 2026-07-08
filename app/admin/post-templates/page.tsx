/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import AdminEditorShell from "@/components/AdminEditorShell";
import type { EditorView } from "@codemirror/view";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { Field, Input, Select } from "@/themes/bifrost-terminal/components/ui/Input";

interface Template {
  name: string;
  content: string;
}

export default function PostTemplatesPage() {
  const router = useRouter();
  const editorViewRef = useRef<EditorView | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [showNewInput, setShowNewInput] = useState(false);

  const getEditorView = useCallback(() => editorViewRef.current, []);
  const getSelection = useCallback(() => {
    const view = editorViewRef.current;
    if (!view) return "";
    return view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch("/api/v1/post-templates");
        const body = await res.json();
        if (body.data) {
          const temps = body.data as Template[];
          setTemplates(temps);
          const first = temps[0];
          if (first) {
            setSelectedName(first.name);
            setContent(first.content);
          }
        }
      } catch {
        setMessage("Failed to load templates");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function selectTemplate(name: string) {
    const t = templates.find((t) => t.name === name);
    if (t) {
      setSelectedName(name);
      setContent(t.content);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const res = await authFetch("/api/v1/post-templates", {
        method: "PUT",
        body: JSON.stringify({ name: selectedName, content }),
      });
      const body = await res.json();
      if (res.ok && body.data) {
        setTemplates(body.data);
        setMessage("Saved");
      } else {
        setMessage(body.error?.message ?? "Save failed");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setMessage("");
    try {
      const res = await authFetch("/api/v1/post-templates", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim() }),
      });
      const body = await res.json();
      if (res.ok && body.data) {
        setTemplates(body.data.templates);
        setSelectedName(newName.trim());
        setContent("");
        setNewName("");
        setShowNewInput(false);
        setMessage("Created");
      } else {
        setMessage(body.error?.message ?? "Create failed");
      }
    } catch {
      setMessage("Network error");
    }
  }

  async function handleDelete() {
    if (!selectedName || !confirm(`Delete template "${selectedName}"?`)) return;
    setMessage("");
    try {
      const res = await authFetch("/api/v1/post-templates", {
        method: "DELETE",
        body: JSON.stringify({ name: selectedName }),
      });
      const body = await res.json();
      if (res.ok && body.data) {
        const temps = body.data as Template[];
        setTemplates(temps);
        const first = temps[0];
        if (first) {
          setSelectedName(first.name);
          setContent(first.content);
        } else {
          setSelectedName("");
          setContent("");
        }
        setMessage("Deleted");
      } else {
        setMessage(body.error?.message ?? "Delete failed");
      }
    } catch {
      setMessage("Network error");
    }
  }

  if (loading) return <p className="font-mono text-sm text-text-3">loading templates…</p>;

  return (
    <AdminEditorShell
      content={content}
      onChange={setContent}
      onViewReady={(view) => { editorViewRef.current = view; }}
      getEditorView={getEditorView}
      getSelection={getSelection}
    >
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/posts")}>
          <ArrowLeft size={14} />
          <span>posts</span>
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_auto_auto]">
        <Field label="Template">
          <Select value={selectedName} onChange={(e) => selectTemplate(e.target.value)}>
            {templates.map((t) => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </Select>
        </Field>
        {showNewInput ? (
          <Field label="New name">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); else if (e.key === "Escape") { setShowNewInput(false); setNewName(""); } }}
              placeholder="e.g. Checklist"
              className="font-mono"
              autoFocus
            />
          </Field>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setShowNewInput(true)}
            className="h-[2.375rem] self-end"
          >
            <Plus size={14} />
            <span>New</span>
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={handleDelete}
          disabled={!selectedName}
          className="h-[2.375rem] self-end text-danger hover:text-danger"
        >
          <Trash2 size={14} />
          <span>Delete</span>
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!selectedName || saving} className="h-[2.375rem] self-end">
          <Save size={14} />
          <span>{saving ? "Saving…" : "Save"}</span>
        </Button>
      </div>
      {showNewInput && (
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={handleCreate} disabled={!newName.trim()}>
            Create
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setShowNewInput(false); setNewName(""); }}
          >
            Cancel
          </Button>
        </div>
      )}
      {message && (
        <p className={`font-mono text-xs ${message === "Saved" || message === "Created" || message === "Deleted" ? "text-success" : "text-danger"}`}>
          {message}
        </p>
      )}
    </AdminEditorShell>
  );
}
