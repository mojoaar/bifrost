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
import { Button } from "@/themes/default/components/ui/Button";
import { Card } from "@/themes/default/components/ui/Card";

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
  const initialFetchDone = useRef(false);

  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
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
      if (histRes.ok) setCommits(histBody.data ?? []);
    } catch {
      setError("Pull failed");
    } finally {
      setPulling(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Git History</h1>
          <p className="mt-1 font-mono text-sm text-text-3">
            <span className="text-text-muted">$</span> git log --oneline
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handlePull} disabled={pulling}>
            {pulling ? "pulling…" : "pull"}
          </Button>
          <Button variant="primary" onClick={handlePush} disabled={pushing}>
            {pushing ? "pushing…" : "push"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <Card padding="md">
          <p className="font-mono text-sm text-text-3">loading…</p>
        </Card>
      ) : commits.length === 0 ? (
        <Card padding="lg">
          <p className="text-center font-mono text-sm text-text-3">
            <span className="text-text-muted">$</span> no commits yet
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {commits.map((commit) => (
            <div key={commit.sha} className="rounded-md border border-border bg-bg-1 p-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-1">{commit.message}</p>
                  <p className="mt-1 font-mono text-xs text-text-3">
                    {commit.author} · {new Date(commit.date).toLocaleString()}
                  </p>
                </div>
                <Link href={`/admin/git/${commit.sha}`} className="font-mono text-xs text-text-2 transition hover:text-text-1">
                  view diff →
                </Link>
              </div>
              <p className="mt-2 font-mono text-xs text-text-muted">{commit.sha.slice(0, 7)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
