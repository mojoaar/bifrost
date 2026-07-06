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

interface Commit {
  sha: string;
  message: string;
  date: string;
  author: string;
}

export default function GitHistoryPage() {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);

  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    (async () => {
      try {
        const token = localStorage.getItem("bifrost_token");
        const res = await fetch("/api/v1/git/history", {
          headers: token ? { authorization: `Bearer ${token}` } : {},
        });

        const body = await res.json();
        if (!res.ok) {
          setError(body.error?.message ?? "Failed to load history");
          return;
        }

        setCommits(body.data ?? []);
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handlePush() {
    setPushing(true);
    try {
      const token = localStorage.getItem("bifrost_token");
      await fetch("/api/v1/git/push", {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
    } catch {
      setError("Push failed");
    } finally {
      setPushing(false);
    }
  }

  async function handlePull() {
    setPulling(true);
    try {
      const token = localStorage.getItem("bifrost_token");
      await fetch("/api/v1/git/pull", {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });

      const histRes = await fetch("/api/v1/git/history", {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const histBody = await histRes.json();
      if (histRes.ok) {
        setCommits(histBody.data ?? []);
      }
    } catch {
      setError("Pull failed");
    } finally {
      setPulling(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Git History</h2>
        <div className="flex gap-2">
          <button
            onClick={handlePull}
            disabled={pulling}
            className="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 disabled:opacity-50"
          >
            {pulling ? "Pulling..." : "Pull"}
          </button>
          <button
            onClick={handlePush}
            disabled={pushing}
            className="rounded bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
          >
            {pushing ? "Pushing..." : "Push"}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : commits.length === 0 ? (
        <p className="text-zinc-400">No commits yet.</p>
      ) : (
        <div className="space-y-2">
          {commits.map((commit) => (
            <div
              key={commit.sha}
              className="rounded border border-zinc-800 p-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm">{commit.message}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {commit.author} — {new Date(commit.date).toLocaleString()}
                  </p>
                </div>
                <Link
                  href={`/admin/git/${commit.sha}`}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  View diff
                </Link>
              </div>
              <p className="mt-1 font-mono text-xs text-zinc-600">
                {commit.sha.slice(0, 7)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
