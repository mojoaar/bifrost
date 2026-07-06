/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface Post {
  slug: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    (async () => {
      try {
        const token = localStorage.getItem("bifrost_token");
        const res = await fetch("/api/v1/posts?limit=50", {
          headers: token ? { authorization: `Bearer ${token}` } : {},
        });

        const body = await res.json();
        if (!res.ok) {
          setError(body.error?.message ?? "Failed to load posts");
          setLoading(false);
          return;
        }

        setPosts(body.data ?? []);
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  if (loading) {
    return <p className="text-zinc-400">Loading...</p>;
  }

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Posts</h2>
        <Link
          href="/admin/posts/new"
          className="rounded bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
        >
          New Post
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-zinc-400">No posts yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-zinc-400">
              <th className="pb-2 font-medium">Title</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Updated</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.slug} className="border-b border-zinc-800">
                <td className="py-2">
                  <Link
                    href={`/admin/posts/${post.slug}`}
                    className="text-zinc-200 hover:text-zinc-100"
                  >
                    {post.title}
                  </Link>
                </td>
                <td className="py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      post.status === "published"
                        ? "bg-green-900/50 text-green-400"
                        : "bg-yellow-900/50 text-yellow-400"
                    }`}
                  >
                    {post.status}
                  </span>
                </td>
                <td className="py-2 text-zinc-500">
                  {new Date(post.updatedAt).toLocaleDateString()}
                </td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/posts/${post.slug}`}
                      className="text-sm text-zinc-400 hover:text-zinc-200"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(post.slug)}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
