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
    return view.state.sliceDoc(
      view.state.selection.main.from,
      view.state.selection.main.to
    );
  }, []);

  function generateSlug(t: string) {
    return t
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
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
          title,
          slug,
          content,
          status,
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
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Post title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSlug(generateSlug(e.target.value));
          }}
          className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <input
          type="text"
          placeholder="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-48 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-mono focus:border-zinc-500 focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "draft" | "published")}
          className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create"}
        </button>
        <AIAssistant
          content={content}
          onInsert={(text) => setContent((prev) => prev + text)}
          onReplace={(text) => setContent(text)}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex flex-1 gap-px rounded border border-zinc-800 bg-zinc-800">
        <div className="flex w-1/2 flex-col bg-zinc-950">
          <EditorToolbar
            getEditorView={getEditorView}
            getSelection={getSelection}
          />
          <div className="flex-1">
            <Editor
              value={content}
              onChange={setContent}
              onViewReady={(v) => {
                editorViewRef.current = v;
              }}
            />
          </div>
        </div>
        <div className="w-1/2 bg-zinc-950">
          <Preview source={content} />
        </div>
      </div>
    </div>
  );
}
