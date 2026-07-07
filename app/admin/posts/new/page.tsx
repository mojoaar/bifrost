/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import AIAssistant from "@/lib/editor/AIAssistant";
import EditorToolbar from "@/lib/editor/EditorToolbar";
import type { EditorView } from "@codemirror/view";
import { Button } from "@/themes/default/components/ui/Button";
import { Field, Input, Select } from "@/themes/default/components/ui/Input";

const Editor = dynamic(() => import("@/lib/editor/Editor"), { ssr: false });
const Preview = dynamic(() => import("@/lib/editor/Preview"), { ssr: false });

export default function NewPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const editorViewRef = useRef<EditorView | null>(null);

  const getEditorView = useCallback(() => editorViewRef.current, []);
  const getSelection = useCallback(() => {
    const view = editorViewRef.current;
    if (!view) return "";
    return view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to);
  }, []);

  function generateSlug(t: string) {
    return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleSave() {
    if (!title || !slug) {
      setError("Title and slug are required");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const token = localStorage.getItem("bifrost_token");
      const res = await fetch("/api/v1/posts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title, slug, content, status,
          frontmatter: {},
          authorId: "00000000-0000-0000-0000-000000000000",
          tagIds: [],
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

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
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
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-post"
            className="font-mono"
          />
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")}>
            <option value="draft">draft</option>
            <option value="published">published</option>
          </Select>
        </Field>
        <div className="flex items-end gap-2">
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Create"}
          </Button>
          <AIAssistant
            content={content}
            onInsert={(text) => setContent((prev) => prev + text)}
            onReplace={(text) => setContent(text)}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-md border border-border">
        <div className="flex w-1/2 flex-col border-r border-border">
          <EditorToolbar getEditorView={getEditorView} getSelection={getSelection} />
          <div className="flex-1">
            <Editor
              value={content}
              onChange={setContent}
              onViewReady={(v) => { editorViewRef.current = v; }}
            />
          </div>
        </div>
        <div className="w-1/2 bg-bg-0">
          <Preview source={content} />
        </div>
      </div>
    </div>
  );
}
