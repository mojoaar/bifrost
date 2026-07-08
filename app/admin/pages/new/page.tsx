/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Copy } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import { generateSlug, mergeFrontmatter } from "@/lib/editor/utils";
import { useSaveShortcut } from "@/lib/editor/use-save-shortcut";
import { useUnsavedChanges } from "@/lib/editor/use-unsaved-changes";
import AIAssistant from "@/lib/editor/AIAssistant";
import AdminEditorShell from "@/components/AdminEditorShell";
import type { EditorView } from "@codemirror/view";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import ImagePicker from "@/components/ImagePicker";
import { Field, Input, Select } from "@/themes/bifrost-terminal/components/ui/Input";

export default function NewPagePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [showInNav, setShowInNav] = useState(false);
  const [navOrder, setNavOrder] = useState(0);
  const [featuredImage, setFeaturedImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const editorViewRef = useRef<EditorView | null>(null);
  const lastTitleRef = useRef("");

  const getEditorView = useCallback(() => editorViewRef.current, []);
  const getSelection = useCallback(() => {
    const view = editorViewRef.current;
    if (!view) return "";
    return view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to);
  }, []);

  async function handleSave() {
    if (!title || !slug) {
      setError("Title and slug are required");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await authFetch("/api/v1/pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title, slug, content, status,
          showInNav, navOrder,
          frontmatter: featuredImage ? { featuredImage } : {},
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message ?? "Failed to save");
        return;
      }
      router.push(`/admin/pages/${slug}`);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  useSaveShortcut(handleSave, [saving, title, slug, content, status, showInNav, navOrder]);

  const isDirty = title !== "" || content !== "";
  useUnsavedChanges(isDirty);

  useEffect(() => {
    if (title.trim() && title !== lastTitleRef.current) {
      lastTitleRef.current = title;
      setContent((prev) => mergeFrontmatter(prev, title, "page"));
    }
  }, [title]);

  return (
    <AdminEditorShell
      content={content}
      onChange={setContent}
      onViewReady={(v) => { editorViewRef.current = v; }}
      getEditorView={getEditorView}
      getSelection={getSelection}
    >
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/pages")}>
          <ArrowLeft size={14} />
          <span>back</span>
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_16rem_10rem_auto]">
        <Field label="Title">
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSlug(generateSlug(e.target.value));
            }}
            placeholder="Page title"
          />
        </Field>
        <Field label="Slug">
          <div className="relative">
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="about"
              className="font-mono pr-8"
            />
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(slug)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-3 hover:text-text-1"
              title="Copy slug"
            >
              <Copy size={14} />
            </button>
          </div>
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")}>
            <option value="draft">draft</option>
            <option value="published">published</option>
          </Select>
        </Field>
        <div className="flex items-end gap-2">
          <Button variant="primary" size="md" onClick={handleSave} disabled={saving} className="h-[2.375rem]">
            <Save size={14} />
            <span>{saving ? "Saving..." : "Create"}</span>
          </Button>
          <AIAssistant
            content={content}
            onInsert={(text) => setContent((prev) => prev + text)}
            onReplace={(text) => setContent(text)}
            className="h-[2.375rem]"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-6 rounded-md border border-border bg-bg-1 px-4 py-2.5">
        <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-text-2">
          <input
            type="checkbox"
            checked={showInNav}
            onChange={(e) => setShowInNav(e.target.checked)}
            className="size-4 accent-accent"
          />
          Show in navigation
        </label>
        <div className="flex items-center gap-2 font-mono text-xs text-text-2">
          <span>Nav order</span>
          <Input
            type="number"
            value={String(navOrder)}
            onChange={(e) => setNavOrder(Number(e.target.value) || 0)}
            className="h-8 w-20 font-mono"
            disabled={!showInNav}
          />
        </div>
      </div>
      <ImagePicker value={featuredImage} onChange={setFeaturedImage} />
      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
      )}
    </AdminEditorShell>
  );
}
