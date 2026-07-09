/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/auth/client";
import { useDateTimeFormat } from "@/components/use-date-time-format";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string | null;
  actorLabel: string | null;
  actorType: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  status: string;
  ip: string | null;
  userAgent: string | null;
  metadata: string | null;
}

interface AuditPage {
  data: AuditLogEntry[];
  meta: { page: number; limit: number; total: number };
}

const ACTION_OPTIONS = [
  "auth.login",
  "auth.mfa",
  "auth.refresh",
  "mfa.setup",
  "mfa.disable",
  "mfa.reset",
  "user.create",
  "user.update",
  "user.delete",
  "post.create",
  "post.update",
  "post.delete",
  "page.create",
  "page.update",
  "page.delete",
  "settings.update",
  "apikey.create",
  "apikey.revoke",
  "admin.reset",
  "content.export",
  "content.import",
  "media.upload",
  "media.delete",
  "audit.purge",
];

export default function AuditLogPage() {
  const { formatDateTime } = useDateTimeFormat();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);
  const limit = 50;

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (action) params.set("action", action);
      if (status) params.set("status", status);

      const res = await authFetch(`/api/v1/audit?${params}`);
      const json: AuditPage = await res.json();
      setEntries(json.data ?? []);
      setTotal(json.meta?.total ?? 0);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [page, action, status]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    Promise.resolve().then(() => fetchEntries());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, action, status]);

  const handlePurge = async () => {
    if (!confirm("Permanently delete all audit log entries?")) return;
    setPurging(true);
    try {
      await authFetch("/api/v1/audit", { method: "DELETE" });
      setPage(1);
      fetchEntries();
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-1">Audit Log</h1>
          <button
            onClick={handlePurge}
            disabled={purging || total <= 0}
            className="inline-flex items-center gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-1.5 text-sm font-medium text-danger transition hover:bg-danger/20 disabled:opacity-40"
          >
            {purging ? "Purging..." : "Purge All"}
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="rounded-md border border-border bg-bg-1 px-3 py-1.5 text-sm text-text-1"
          >
            <option value="">All actions</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="rounded-md border border-border bg-bg-1 px-3 py-1.5 text-sm text-text-1"
          >
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-text-3">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-text-3">No audit log entries found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-3">
                    <th className="pb-2 pr-4 font-medium">Timestamp</th>
                    <th className="pb-2 pr-4 font-medium">Actor</th>
                    <th className="pb-2 pr-4 font-medium">Action</th>
                    <th className="pb-2 pr-4 font-medium">Target</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 whitespace-nowrap text-text-2">
                        {formatDateTime(e.timestamp)}
                      </td>
                      <td className="py-2 pr-4 text-text-2">
                        {e.actorLabel ?? (
                          e.actorType === "anonymous" || e.actorType === "system" ? (
                            <span className="text-text-3">{e.actorType}</span>
                          ) : (
                            <span className="text-text-3">—</span>
                          )
                        )}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-text-2">
                        {e.action}
                      </td>
                      <td className="py-2 pr-4 text-text-2">
                        {e.targetType && e.targetId
                          ? `${e.targetType}: ${e.targetId}`
                          : <span className="text-text-3">—</span>}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={
                            e.status === "success"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-danger"
                          }
                        >
                          {e.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-text-3">
                        {e.ip ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm text-text-2">
                <span>
                  Page {page} of {totalPages} ({total} entries)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-md border border-border bg-bg-1 px-3 py-1.5 text-sm font-medium text-text-1 transition hover:bg-bg-2 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-md border border-border bg-bg-1 px-3 py-1.5 text-sm font-medium text-text-1 transition hover:bg-bg-2 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
  );
}
