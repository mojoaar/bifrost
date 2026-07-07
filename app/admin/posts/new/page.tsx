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
import dynamic from "next/dynamic";
import { ArrowLeft, Save } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import AIAssistant from "@/lib/editor/AIAssistant";
import EditorToolbar from "@/lib/editor/EditorToolbar";
import type { EditorView } from "@codemirror/view";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { Field, Input, Select } from "@/themes/bifrost-terminal/components/ui/Input";

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
  const lastTitleRef = useRef("");

  const getEditorView = useCallback(() => editorViewRef.current, []);
  const getSelection = useCallback(() => {
    const view = editorViewRef.current;
    if (!view) return "";
    return view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to);
  }, []);

  function generateSlug(t: string) {
    return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n*/;

  function buildFrontmatter(t: string): string {
    const today = new Date().toISOString().slice(0, 10);
    return `---\ntitle: "${t.replace(/"/g, '\\"')}"\ndate: ${today}\ntags: []\n---\n\n`;
  }

  function mergeFrontmatter(text: string, t: string): string {
    if (!t) return text;
    const newFm = buildFrontmatter(t);
    if (!text || text.trim() === "") return newFm;
    const match = text.match(FRONTMATTER_RE);
    if (!match) return newFm + text.replace(/^\n+/, "");
    const after = text.slice(match[0].length);
    return newFm + after.replace(/^\n+/, "");
  }

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

  useEffect(() => {
    if (title.trim() && title !== lastTitleRef.current) {
      lastTitleRef.current = title;
      setContent((prev) => mergeFrontmatter(prev, title));
    }
  }, [title]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (!saving) handleSave();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, title, slug, content, status]);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/posts")}>
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
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            <Save size={14} />
            <span>{saving ? "Saving..." : "Create"}</span>
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
