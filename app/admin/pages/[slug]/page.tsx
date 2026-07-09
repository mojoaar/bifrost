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
import { ArrowLeft, Save, ExternalLink, History, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import { useSaveShortcut } from "@/lib/editor/use-save-shortcut";
import { useUnsavedChanges } from "@/lib/editor/use-unsaved-changes";
import AdminEditorShell from "@/components/AdminEditorShell";
import type { EditorView } from "@codemirror/view";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { Field, Input, Select } from "@/themes/bifrost-terminal/components/ui/Input";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import ImagePicker from "@/components/ImagePicker";

interface Page {
  slug: string;
  title: string;
  contentMd: string;
  frontmatter?: string;
  status: "draft" | "published";
  showInNav: boolean;
  navOrder: number;
}

export default function EditPagePage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [initialTitle, setInitialTitle] = useState("");
  const [initialContent, setInitialContent] = useState("");
  const [initialStatus, setInitialStatus] = useState<"draft" | "published">("draft");
  const [showInNav, setShowInNav] = useState(false);
  const [navOrder, setNavOrder] = useState(0);
  const [featuredImage, setFeaturedImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [gitEnabled, setGitEnabled] = useState(false);
  const [seoMetaDescription, setSeoMetaDescription] = useState("");
  const [seoOgTitle, setSeoOgTitle] = useState("");
  const [seoOgDescription, setSeoOgDescription] = useState("");
  const [seoNoindex, setSeoNoindex] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
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
        const res = await fetch(`/api/v1/pages/${params.slug}`);
        if (!res.ok) {
          const body = await res.json();
          if (!cancelled) setError(body.error?.message ?? "Failed to load page");
          return;
        }
        const body = await res.json();
        if (cancelled) return;
        const p = body.data as Page;
        setPage(p);
        setTitle(p.title);
        setContent(p.contentMd);
        setStatus(p.status);
        setInitialTitle(p.title);
        setInitialContent(p.contentMd);
        setInitialStatus(p.status);
        setShowInNav(p.showInNav);
        setNavOrder(p.navOrder);
        try {
          const fm = typeof p.frontmatter === "string" ? JSON.parse(p.frontmatter) : (p.frontmatter ?? {});
          setFeaturedImage(fm.featuredImage ?? "");
          setSeoMetaDescription((fm.metaDescription as string) ?? "");
          setSeoOgTitle((fm.ogTitle as string) ?? "");
          setSeoOgDescription((fm.ogDescription as string) ?? "");
          setSeoNoindex(!!fm.noindex);
        } catch {
          setFeaturedImage("");
        }

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

  async function handleSave() {
    if (!title) {
      setError("Title is required");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await authFetch(`/api/v1/pages/${params.slug}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, content, status, showInNav, navOrder, frontmatter: { featuredImage: featuredImage || undefined, ...seo() } }),
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
      const res = await authFetch(`/api/v1/pages/${params.slug}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/admin/pages");
      } else {
        const body = await res.json();
        setError(body.error?.message ?? "Failed to delete");
      }
    } catch {
      setError("Network error");
    }
  }

  useSaveShortcut(handleSave, [saving, title, content, status, showInNav, navOrder, page]);

  const isDirty = title !== initialTitle || content !== initialContent || status !== initialStatus;
  useUnsavedChanges(isDirty);

  if (!page) {
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
          href="/admin/pages"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-1 px-3 py-1.5 font-mono text-xs text-text-2 transition hover:border-accent hover:text-accent"
        >
          <ArrowLeft size={14} />
          <span>back</span>
        </Link>
        <a
          href={`/${page.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-1 px-3 py-1.5 font-mono text-xs text-text-2 transition hover:border-accent hover:text-accent"
        >
          <ExternalLink size={14} />
          <span>{status === "draft" ? "Preview" : "View"}</span>
        </a>
        {gitEnabled && (
          <a
            href={`/admin/git?slug=${encodeURIComponent(page.slug)}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-1 px-3 py-1.5 font-mono text-xs text-text-2 transition hover:border-accent hover:text-accent"
          >
            <History size={14} />
            <span>History</span>
          </a>
        )}
      </div>
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
          <Button variant="primary" size="md" onClick={handleSave} disabled={saving} className="h-[2.375rem]">
            <Save size={14} />
            <span>{saving ? "Saving..." : "Save"}</span>
          </Button>
          <Button variant="ghost" size="md" onClick={handleDelete} className="h-[2.375rem] text-danger hover:text-danger">
            <Trash2 size={14} />
          </Button>
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
      <div className="rounded-md border border-border bg-bg-1">
        <button
          type="button"
          onClick={() => setSeoOpen(!seoOpen)}
          className="flex w-full items-center gap-2 px-4 py-2.5 font-mono text-xs text-text-2 hover:text-text-1"
        >
          {seoOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          SEO
        </button>
        {seoOpen && (
          <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
            <Field label="Meta description (meta tags)">
              <Input value={seoMetaDescription} onChange={(e) => setSeoMetaDescription(e.target.value)} className="font-mono" />
            </Field>
            <Field label="OG title (social preview)">
              <Input value={seoOgTitle} onChange={(e) => setSeoOgTitle(e.target.value)} className="font-mono" />
            </Field>
            <Field label="OG description (social preview)">
              <Input value={seoOgDescription} onChange={(e) => setSeoOgDescription(e.target.value)} className="font-mono" />
            </Field>
            <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-text-2">
              <input type="checkbox" checked={seoNoindex} onChange={(e) => setSeoNoindex(e.target.checked)} className="size-4 accent-accent" />
              <span>noindex (hide from search engines)</span>
            </label>
          </div>
        )}
      </div>
      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
      )}
    </AdminEditorShell>
  );
}
