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
import Link from "next/link";
import { Table, THead, TR, TH, TD } from "@/themes/default/components/ui/Table";
import { StatusPill } from "@/themes/default/components/ui/StatusPill";
import { Button } from "@/themes/default/components/ui/Button";
import { Card } from "@/themes/default/components/ui/Card";

interface Post {
  slug: string;
  title: string;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "draft" | "published">("all");
  const initialFetchDone = useRef(false);

  const fetchPosts = useCallback(async () => {
    try {
      const token = localStorage.getItem("bifrost_token");
      const res = await fetch("/api/v1/posts?limit=50", {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body.error?.message ?? "Failed to load posts");
        return;
      }

      setPosts(body.data ?? []);
      setError("");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    fetchPosts();
  }, [fetchPosts]);

  async function handleDelete(slug: string) {
    if (!confirm("Delete this post?")) return;

    const token = localStorage.getItem("bifrost_token");
    const res = await fetch(`/api/v1/posts/${slug}`, {
      method: "DELETE",
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });

    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.slug !== slug));
    }
  }

  const filtered = filter === "all" ? posts : posts.filter((p) => p.status === filter);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Posts</h1>
          <p className="mt-1 font-mono text-sm text-text-3">
            <span className="text-text-muted">$</span> ls content/posts/
          </p>
        </div>
        <Link href="/admin/posts/new">
          <Button variant="primary">+ New Post</Button>
        </Link>
      </div>

      <div className="mb-4 flex gap-1">
        {(["all", "draft", "published"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition ${
              filter === f ? "bg-bg-2 text-text-1" : "text-text-3 hover:text-text-1"
            }`}
          >
            {f} {f !== "all" && `(${posts.filter((p) => p.status === f).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <Card padding="md">
          <p className="font-mono text-sm text-text-3">loading…</p>
        </Card>
      ) : error ? (
        <Card padding="md">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card padding="lg">
          <p className="text-center font-mono text-sm text-text-3">
            <span className="text-text-muted">$</span> no posts found
          </p>
        </Card>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Title</TH>
              <TH>Status</TH>
              <TH>Slug</TH>
              <TH>Updated</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {filtered.map((post) => (
              <TR key={post.slug}>
                <TD>
                  <Link href={`/admin/posts/${post.slug}`} className="font-medium text-text-1 hover:text-accent">
                    {post.title}
                  </Link>
                </TD>
                <TD>
                  <StatusPill status={post.status} />
                </TD>
                <TD className="font-mono text-xs text-text-3">{post.slug}</TD>
                <TD className="font-mono text-xs text-text-3">
                  {new Date(post.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-3 font-mono text-xs">
                    <Link href={`/admin/posts/${post.slug}`} className="text-text-2 transition hover:text-text-1">
                      edit
                    </Link>
                    <button onClick={() => handleDelete(post.slug)} className="text-text-3 transition hover:text-danger">
                      delete
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
