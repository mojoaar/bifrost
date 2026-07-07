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
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import AIAssistant from "@/lib/editor/AIAssistant";
import EditorToolbar from "@/lib/editor/EditorToolbar";
import type { EditorView } from "@codemirror/view";
import { Button } from "@/themes/default/components/ui/Button";
import { Field, Input, Select } from "@/themes/default/components/ui/Input";
import { Card } from "@/themes/default/components/ui/Card";

const Editor = dynamic(() => import("@/lib/editor/Editor"), { ssr: false });
const Preview = dynamic(() => import("@/lib/editor/Preview"), { ssr: false });

interface Post {
  slug: string;
  title: string;
  contentMd: string;
  status: "draft" | "published";
}

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [title, setTitle] = useState("");
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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/v1/posts/${params.slug}`);
        if (!res.ok) {
          const body = await res.json();
          if (!cancelled) setError(body.error?.message ?? "Failed to load post");
          return;
        }
        const body = await res.json();
        if (cancelled) return;
        const p = body.data as Post;
        setPost(p);
        setTitle(p.title);
        setContent(p.contentMd);
        setStatus(p.status);
      } catch {
        if (!cancelled) setError("Network error");
      }
    }
    load();
    return () => { cancelled = true; };
  }, [params.slug]);

  async function handleSave() {
    if (!title) {
      setError("Title is required");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const token = localStorage.getItem("bifrost_token");
      const res = await fetch(`/api/v1/posts/${params.slug}`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title, content, status, frontmatter: {}, tagIds: [] }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message ?? "Failed to save");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (!post) {
    return (
      <Card padding="md">
        <p className="font-mono text-sm text-text-3">loading…</p>
      </Card>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_10rem_auto]">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")}>
            <option value="draft">draft</option>
            <option value="published">published</option>
          </Select>
        </Field>
        <div className="flex items-end gap-2">
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
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
