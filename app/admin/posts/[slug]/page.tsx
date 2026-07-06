/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import AIAssistant from "@/lib/editor/AIAssistant";

const Editor = dynamic(() => import("@/lib/editor/Editor"), { ssr: false });
const Preview = dynamic(() => import("@/lib/editor/Preview"), { ssr: false });

interface Post {
  slug: string;
  title: string;
  contentMd: string;
  status: string;
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

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/posts/${params.slug}`);
        if (!res.ok) {
          const body = await res.json();
          setError(body.error?.message ?? "Failed to load post");
          return;
        }
        const body = await res.json();
        const p = body.data as Post;
        setPost(p);
        setTitle(p.title);
        setContent(p.contentMd);
        setStatus(p.status as "draft" | "published");
      } catch {
        setError("Network error");
      }
    }
    load();
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
        body: JSON.stringify({
          title,
          content,
          status,
          frontmatter: {},
          tagIds: [],
        }),
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
    return <p className="text-zinc-400">Loading...</p>;
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/admin/posts")}
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          &larr; Back
        </button>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
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
          {saving ? "Saving..." : "Save"}
        </button>
        <AIAssistant
          content={content}
          onInsert={(text) => setContent((prev) => prev + text)}
          onReplace={(text) => setContent(text)}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex flex-1 gap-px rounded border border-zinc-800 bg-zinc-800">
        <div className="w-1/2 bg-zinc-950">
          <Editor value={content} onChange={setContent} />
        </div>
        <div className="w-1/2 bg-zinc-950">
          <Preview source={content} />
        </div>
      </div>
    </div>
  );
}
