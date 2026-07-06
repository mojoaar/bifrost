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

export default function DiffPage() {
  const params = useParams<{ sha: string }>();
  const router = useRouter();
  const [diff, setDiff] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("bifrost_token");
        const res = await fetch(`/api/v1/git/diff?sha=${params.sha}`, {
          headers: token ? { authorization: `Bearer ${token}` } : {},
        });

        const body = await res.json();
        if (!res.ok) {
          setError(body.error?.message ?? "Failed to load diff");
          return;
        }

        setDiff(body.data?.diff ?? "");
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.sha]);

  if (loading) return <p className="text-zinc-400">Loading...</p>;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 text-sm text-zinc-400 hover:text-zinc-200"
      >
        &larr; Back
      </button>
      <h2 className="mb-4 text-lg font-semibold">
        Diff — {params.sha.slice(0, 7)}
      </h2>
      <pre className="overflow-auto rounded border border-zinc-800 bg-zinc-900 p-4 font-mono text-xs text-zinc-300">
        {diff}
      </pre>
    </div>
  );
}
