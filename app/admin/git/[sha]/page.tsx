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
import { useParams, useRouter } from "next/navigation";
import DiffViewer from "@/components/DiffViewer";
import { ACCESS_TOKEN_KEY } from "@/lib/auth/constants";

export default function DiffPage() {
  const params = useParams<{ sha: string }>();
  const router = useRouter();
  const [diff, setDiff] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem(ACCESS_TOKEN_KEY);
        const res = await fetch(`/api/v1/git/diff?sha=${params.sha}`, {
          headers: token ? { authorization: `Bearer ${token}` } : {},
        });

        const body = await res.json();
        if (!res.ok) {
          setError(body.error?.message ?? "Failed to load diff");
          return;
        }

        setDiff(body.data?.diff ?? "");
        setCommitMessage(body.data?.message ?? "");
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.sha]);

  if (loading) return <p className="text-text-3 font-mono text-sm">loading diff…</p>;
  if (error) return <p className="text-red-400 font-mono text-sm">{error}</p>;

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1 font-mono text-sm text-text-3 transition hover:text-text-1"
      >
        &larr; Back
      </button>
      <p className="mb-4 font-mono text-xs text-text-muted">
        {params.sha.slice(0, 7)} {commitMessage && `— ${commitMessage}`}
      </p>
      <DiffViewer diff={diff} />
    </div>
  );
}
