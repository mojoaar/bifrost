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
import Link from "next/link";
import { ArrowLeft, Save, ExternalLink, History, Copy, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import { useSaveShortcut } from "@/lib/editor/use-save-shortcut";
import { useUnsavedChanges } from "@/lib/editor/use-unsaved-changes";
import { mergeFrontmatter, generateSlug, buildFrontmatter } from "@/lib/editor/utils";
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
  const [slug, setSlug] = useState("");
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
  const [gitEnabled, setGitEnabled] = useState(false);
  const [seoMetaDescription, setSeoMetaDescription] = useState("");
  const [seoOgTitle, setSeoOgTitle] = useState("");
  const [seoOgDescription, setSeoOgDescription] = useState("");
  const [seoNoindex, setSeoNoindex] = useState(false);
  const [seoCollapsed, setSeoCollapsed] = useState(true);
  const editorViewRef = useRef<EditorView | null>(null);

  const seo = useCallback(() => ({
    metaDescription: seoMetaDescription || undefined,
    ogTitle: seoOgTitle || undefined,
    ogDescription: seoOgDescription || undefined,
    noindex: seoNoindex || undefined,
  }), [seoMetaDescription, seoOgTitle, seoOgDescription, seoNoindex]);

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
          setSlug(p.slug);
          setContent(p.contentMd);
        setStatus(p.status);
        setScheduledAt(p.scheduledAt ? p.scheduledAt.slice(0, 16) : "");
        setTags(p.tags ?? []);
        try {
          const fm = JSON.parse(p.frontmatter ?? "{}");
          setFeaturedImage((fm.featuredImage as string) ?? "");
          setSeoMetaDescription((fm.metaDescription as string) ?? "");
          setSeoOgTitle((fm.ogTitle as string) ?? "");
          setSeoOgDescription((fm.ogDescription as string) ?? "");
          setSeoNoindex(fm.noindex === true);
        } catch { /* noop */ }
        setInitialTitle(p.title);
        setInitialContent(p.contentMd);
        setInitialStatus(p.status);

        try {
          const sRes = await authFetch("/api/v1/settings");
          const sBody = await sRes.json();
          setGitEnabled(sBody.data?.["git.enabled"] === "true");
        } catch { /* ignore */ }
      } catch {
        if (!cancelled) setError("Network error");
      }
    }
    load();
    return () => { cancelled = true; };
  }, [params.slug]);

  const lastFmRef = useRef("");
  useEffect(() => {
    if (!title) return;
    const tagNames = tags.map((t) => t.name);
    const newFm = buildFrontmatter(title, "post", tagNames);
    if (newFm === lastFmRef.current) return;
    lastFmRef.current = newFm;
    setContent((prev) => mergeFrontmatter(prev, title, "post", tagNames));
  }, [title, tags]);

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
        body: JSON.stringify({ title, slug, content: mergeFrontmatter(content, title, "post", tags.map((t) => t.name), seo()), status, scheduledAt: status === "scheduled" ? (scheduledAt || undefined) : undefined, frontmatter: featuredImage ? { featuredImage } : {}, tagIds: tags.map((t) => t.id) }),
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

  async function handleDelete() {
    if (!confirm(`Delete "${title || params.slug}" permanently?`)) return;
    try {
      const res = await authFetch(`/api/v1/posts/${params.slug}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/admin/posts");
      } else {
        const body = await res.json();
        setError(body.error?.message ?? "Failed to delete");
      }
    } catch {
      setError("Network error");
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
        <Link
          href="/admin/posts"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-1 px-3 py-1.5 font-mono text-xs text-text-2 transition hover:border-accent hover:text-accent"
        >
          <ArrowLeft size={14} />
          <span>back</span>
        </Link>
        <a
          href={`/${post.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-1 px-3 py-1.5 font-mono text-xs text-text-2 transition hover:border-accent hover:text-accent"
        >
          <ExternalLink size={14} />
          <span>{status === "draft" ? "Preview" : "View"}</span>
        </a>
        {gitEnabled && (
          <a
            href={`/admin/git?slug=${encodeURIComponent(post.slug)}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-1 px-3 py-1.5 font-mono text-xs text-text-2 transition hover:border-accent hover:text-accent"
          >
            <History size={14} />
            <span>History</span>
          </a>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr_10rem_auto]">
        <Field label="Title">
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSlug(generateSlug(e.target.value));
            }}
          />
        </Field>
        <Field label="Slug">
          <div className="relative">
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="font-mono pr-8" />
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
            <span>{saving ? "Saving..." : "Save"}</span>
          </Button>
          <Button variant="ghost" size="md" onClick={handleDelete} className="h-[2.375rem] text-danger hover:text-danger">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
      <TagInput selected={tags} onChange={setTags} />
      <ImagePicker value={featuredImage} onChange={setFeaturedImage} />
      <div className="rounded-md border border-border bg-bg-1">
        <button
          type="button"
          onClick={() => setSeoCollapsed((v) => !v)}
          className="flex w-full items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-wider text-text-3 hover:text-text-1"
        >
          {seoCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          <span>SEO</span>
        </button>
        {!seoCollapsed && (
          <div className="grid grid-cols-1 gap-3 border-t border-border px-4 py-3 md:grid-cols-2">
            <Field label="Meta Description">
              <Input value={seoMetaDescription} onChange={(e) => setSeoMetaDescription(e.target.value)} placeholder="Custom meta description" className="font-mono text-xs" />
            </Field>
            <Field label="OG Title">
              <Input value={seoOgTitle} onChange={(e) => setSeoOgTitle(e.target.value)} placeholder="Custom Open Graph title" className="font-mono text-xs" />
            </Field>
            <Field label="OG Description">
              <Input value={seoOgDescription} onChange={(e) => setSeoOgDescription(e.target.value)} placeholder="Custom Open Graph description" className="font-mono text-xs" />
            </Field>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 font-mono text-sm text-text-2">
                <input
                  type="checkbox"
                  checked={seoNoindex}
                  onChange={(e) => setSeoNoindex(e.target.checked)}
                  className="size-4 rounded border-border bg-bg-1 text-accent focus:ring-2 focus:ring-accent/30"
                />
                <span>noindex</span>
              </label>
            </div>
          </div>
        )}
      </div>
      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
      )}
    </AdminEditorShell>
  );
}
