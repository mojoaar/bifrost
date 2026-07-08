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
import { ArrowLeft, Save, ExternalLink, History } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import { useSaveShortcut } from "@/lib/editor/use-save-shortcut";
import { useUnsavedChanges } from "@/lib/editor/use-unsaved-changes";
import AIAssistant from "@/lib/editor/AIAssistant";
import { mergeFrontmatter } from "@/lib/editor/utils";
import AdminEditorShell from "@/components/AdminEditorShell";
import { TagInput, type TagItem } from "@/components/TagInput";
import ImagePicker from "@/components/ImagePicker";
import type { EditorView } from "@codemirror/view";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { Field, Input, Select } from "@/themes/bifrost-terminal/components/ui/Input";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";

interface Post {
  slug: string;
  title: string;
  contentMd: string;
  frontmatter?: string;
  status: "draft" | "published" | "scheduled";
  scheduledAt?: string | null;
  tags?: TagItem[];
}

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "scheduled">("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [tags, setTags] = useState<TagItem[]>([]);
  const [featuredImage, setFeaturedImage] = useState("");
  const [initialTitle, setInitialTitle] = useState("");
  const [initialContent, setInitialContent] = useState("");
  const [initialStatus, setInitialStatus] = useState<"draft" | "published" | "scheduled">("draft");
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
        setScheduledAt(p.scheduledAt ? p.scheduledAt.slice(0, 16) : "");
        setTags(p.tags ?? []);
        try {
          const fm = JSON.parse(p.frontmatter ?? "{}");
          setFeaturedImage((fm.featuredImage as string) ?? "");
        } catch { /* noop */ }
        setInitialTitle(p.title);
        setInitialContent(p.contentMd);
        setInitialStatus(p.status);
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
      const res = await authFetch(`/api/v1/posts/${params.slug}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, content: mergeFrontmatter(content, title, "post", tags.map((t) => t.name)), status, scheduledAt: status === "scheduled" ? (scheduledAt || undefined) : undefined, frontmatter: featuredImage ? { featuredImage } : {}, tagIds: tags.map((t) => t.id) }),
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

  useSaveShortcut(handleSave, [saving, title, content, status, post]);

  const isDirty = title !== initialTitle || content !== initialContent || status !== initialStatus;
  useUnsavedChanges(isDirty);

  if (!post) {
    return (
      <Card padding="md">
        <p className="font-mono text-sm text-text-3">loading…</p>
      </Card>
    );
  }

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
        <a
          href={`/${post.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-1 px-3 py-1.5 font-mono text-xs text-text-2 transition hover:border-accent hover:text-accent"
        >
          <ExternalLink size={14} />
          <span>{status === "draft" ? "Preview" : "View"}</span>
        </a>
        <a
          href={`/admin/git?slug=${encodeURIComponent(post.slug)}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-1 px-3 py-1.5 font-mono text-xs text-text-2 transition hover:border-accent hover:text-accent"
        >
          <History size={14} />
          <span>History</span>
        </a>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_10rem_auto]">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
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
            <span>{saving ? "Saving..." : "Save"}</span>
          </Button>
          <AIAssistant
            content={content}
            onInsert={(text) => setContent((prev) => prev + text)}
            onReplace={(text) => setContent(text)}
            className="h-[2.375rem]"
          />
        </div>
      </div>
      <TagInput selected={tags} onChange={setTags} />
      <ImagePicker value={featuredImage} onChange={setFeaturedImage} />
      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
      )}
    </AdminEditorShell>
  );
}
