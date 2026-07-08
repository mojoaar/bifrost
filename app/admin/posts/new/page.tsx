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
import { TagInput, type TagItem } from "@/components/TagInput";
import ImagePicker from "@/components/ImagePicker";
import type { EditorView } from "@codemirror/view";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { Field, Input, Select } from "@/themes/bifrost-terminal/components/ui/Input";

export default function NewPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "scheduled">("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [tags, setTags] = useState<TagItem[]>([]);
  const [featuredImage, setFeaturedImage] = useState("");
  const [template, setTemplate] = useState("");
  const [templates, setTemplates] = useState<{ name: string; title: string; content: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const editorViewRef = useRef<EditorView | null>(null);

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
        if (body.data) setTemplates(body.data);
      } catch {
        setTemplates([{ name: "Standard post", title: "", content: "" }]);
      }
    })();
  }, []);

  async function handleSave() {
    if (!title || !slug) {
      setError("Title and slug are required");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await authFetch("/api/v1/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title, slug, content: mergeFrontmatter(content, title, "post", tags.map((t) => t.name)), status,
          scheduledAt: status === "scheduled" ? (scheduledAt || undefined) : undefined,
          frontmatter: featuredImage ? { featuredImage } : {},
          authorId: "00000000-0000-0000-0000-000000000000",
          tagIds: tags.map((t) => t.id),
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message ?? "Failed to save");
        return;
      }
      router.push(`/admin/posts/${slug}`);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  useSaveShortcut(handleSave, [saving, title, slug, content, status]);

  const isDirty = title !== "" || content !== "";
  useUnsavedChanges(isDirty);

  return (
    <AdminEditorShell
      content={content}
      onChange={setContent}
      onViewReady={(v) => { editorViewRef.current = v; }}
      getEditorView={getEditorView}
      getSelection={getSelection}
    >
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/posts")}>
          <ArrowLeft size={14} />
          <span>back</span>
        </Button>
      </div>
      <div className="flex items-end gap-4">
        <Field label="Template">
          <Select
            value={template}
            onChange={(e) => {
              const t = templates.find((tp) => tp.name === e.target.value);
              if (t) {
                setTemplate(t.name);
                if (t.title) setTitle(t.title);
                if (t.content) {
                  setContent(t.content);
                  if (t.title) setSlug(generateSlug(t.title));
                }
              }
            }}
          >
            {templates.map((t) => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </Select>
        </Field>
        <TagInput selected={tags} onChange={setTags} />
        <Field label="Featured">
          <ImagePicker value={featuredImage} onChange={setFeaturedImage} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_16rem_10rem_auto]">
        <Field label="Title">
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSlug(generateSlug(e.target.value));
            }}
            placeholder="Post title"
          />
        </Field>
        <Field label="Slug">
          <div className="relative">
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-post"
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
          <Select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published" | "scheduled")}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="scheduled">scheduled</option>
          </Select>
        </Field>
        {status === "scheduled" && (
          <Field label="Publish at">
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </Field>
        )}
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
      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
      )}
    </AdminEditorShell>
  );
}
