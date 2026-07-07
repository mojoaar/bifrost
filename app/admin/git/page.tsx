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
import { GitBranch, GitCommit, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";

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
  const [filter, setFilter] = useState("");
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

  const filtered = filter
    ? commits.filter((c) => c.message.toLowerCase().includes(filter.toLowerCase()))
    : commits;

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            <GitBranch size={20} className="mr-2 inline-block text-text-3" />
            Git History
          </h1>
          <p className="mt-1 font-mono text-sm text-text-3">
            <span className="text-text-muted">$</span> git log --oneline
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handlePull} disabled={pulling}>
            <ArrowDownToLine size={14} />
            <span>{pulling ? "pulling…" : "pull"}</span>
          </Button>
          <Button variant="primary" onClick={handlePush} disabled={pushing}>
            <ArrowUpFromLine size={14} />
            <span>{pushing ? "pushing…" : "push"}</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {!loading && commits.length > 0 && (
        <div className="mb-4">
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="filter commits…"
            className="w-full max-w-sm rounded-md border border-border bg-bg-1 px-3 py-1.5 font-mono text-sm text-text-1 placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          <p className="mt-2 font-mono text-xs text-text-muted">
            showing {filtered.length} of {commits.length}
          </p>
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
      ) : filtered.length === 0 ? (
        <Card padding="lg">
          <p className="text-center font-mono text-sm text-text-3">
            <span className="text-text-muted">$</span> no commits match &quot;{filter}&quot;
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((commit) => (
            <div key={commit.sha} className="rounded-md border border-border bg-bg-1 p-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm text-text-1">
                    <GitCommit size={14} className="shrink-0 text-text-3" />
                    <span>{commit.message}</span>
                  </p>
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
