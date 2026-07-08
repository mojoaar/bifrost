/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Table, THead, TR, TH, TD } from "@/themes/bifrost-terminal/components/ui/Table";
import { StatusPill } from "@/themes/bifrost-terminal/components/ui/StatusPill";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { useDateTimeFormat } from "@/lib/format-date";

interface BaseItem {
  slug: string;
  title: string;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
}

type SortKey = "createdAt" | "updatedAt";

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown size={12} className="text-text-muted" />;
  return dir === "asc" ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />;
}

interface Props {
  title: string;
  subtitle: string;
  apiPath: string;
  adminPath: string;
  emptyMessage: string;
  deleteConfirm: string;
  extraColumns?: { header: ReactNode; cell: (item: BaseItem) => ReactNode }[];
  actions?: ReactNode;
}
export default function AdminContentList({
  title,
  subtitle,
  apiPath,
  adminPath,
  emptyMessage,
  deleteConfirm,
  extraColumns,
  actions,
}: Props) {
  const { formatDateShort } = useDateTimeFormat();
  const [items, setItems] = useState<BaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "draft" | "published">("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const initialFetchDone = useRef(false);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const fetchItems = useCallback(async () => {
    try {
      const token = localStorage.getItem("bifrost_token");
      const res = await fetch(`${apiPath}?limit=50`, {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error?.message ?? "Failed to load");
        return;
      }
      setItems(body.data ?? []);
      setError("");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    fetchItems();
  }, [fetchItems]);

  async function handleDelete(slug: string) {
    if (!confirm(deleteConfirm)) return;
    const token = localStorage.getItem("bifrost_token");
    const res = await fetch(`${apiPath}/${slug}`, {
      method: "DELETE",
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      setItems((prev) => prev.filter((p) => p.slug !== slug));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(slug);
        return next;
      });
    }
  }

  function toggleOne(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === sorted.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sorted.map((item) => item.slug)));
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selected.size} selected items?`)) return;
    setBulkDeleting(true);
    const token = localStorage.getItem("bifrost_token");
    for (const slug of selected) {
      await fetch(`${apiPath}/${slug}`, {
        method: "DELETE",
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
    }
    setItems((prev) => prev.filter((p) => !selected.has(p.slug)));
    setSelected(new Set());
    setBulkDeleting(false);
  }

  const filtered = filter === "all" ? items : items.filter((p) => p.status === filter);
  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 font-mono text-sm text-text-3">
            <span className="text-text-muted">$</span> {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <Link href={`${adminPath}/new`}>
            <Button variant="primary">
              <Plus size={14} />
              New {title.slice(0, -1)}
            </Button>
          </Link>
        </div>
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
            {f} {f !== "all" && `(${items.filter((p) => p.status === f).length})`}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-md border border-accent/30 bg-accent/5 px-3 py-2">
          <span className="font-mono text-xs text-text-2">{selected.size} selected</span>
          <Button variant="danger" size="sm" onClick={handleBulkDelete} disabled={bulkDeleting}>
            <Trash2 size={14} />
            <span>{bulkDeleting ? "Deleting..." : "Delete selected"}</span>
          </Button>
          <button
            onClick={() => setSelected(new Set())}
            className="font-mono text-xs text-text-muted hover:text-text-1"
          >
            clear
          </button>
        </div>
      )}

      {loading ? (
        <Card padding="md">
          <p className="font-mono text-sm text-text-3">loading…</p>
        </Card>
      ) : error ? (
        <Card padding="md">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : sorted.length === 0 ? (
        <Card padding="lg">
          <p className="text-center font-mono text-sm text-text-3">
            <span className="text-text-muted">$</span> {emptyMessage}
          </p>
        </Card>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH className="w-10">
                <input
                  type="checkbox"
                  checked={selected.size === sorted.length && sorted.length > 0}
                  onChange={toggleAll}
                  className="size-4 rounded accent-accent"
                />
              </TH>
              <TH>Title</TH>
              <TH>Status</TH>
              {extraColumns?.map((col, i) => (
                <TH key={i}>{col.header}</TH>
              ))}
              <TH>Slug</TH>
              <TH>
                <button onClick={() => toggleSort("createdAt")} className="inline-flex items-center gap-1 hover:text-text-1">
                  Created <SortIcon active={sortKey === "createdAt"} dir={sortDir} />
                </button>
              </TH>
              <TH>
                <button onClick={() => toggleSort("updatedAt")} className="inline-flex items-center gap-1 hover:text-text-1">
                  Updated <SortIcon active={sortKey === "updatedAt"} dir={sortDir} />
                </button>
              </TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {sorted.map((item) => (
              <TR key={item.slug}>
                <TD className="w-10">
                  <input
                    type="checkbox"
                    checked={selected.has(item.slug)}
                    onChange={() => toggleOne(item.slug)}
                    className="size-4 rounded accent-accent"
                  />
                </TD>
                <TD>
                  <Link href={`${adminPath}/${item.slug}`} className="font-medium text-text-1 hover:text-accent">
                    {item.title}
                  </Link>
                </TD>
                <TD>
                  <StatusPill status={item.status} />
                </TD>
                {extraColumns?.map((col, i) => (
                  <TD key={i}>{col.cell(item)}</TD>
                ))}
                <TD className="font-mono text-xs text-text-3">{item.slug}</TD>
                <TD className="font-mono text-xs text-text-3">
                  {formatDateShort(item.createdAt)}
                </TD>
                <TD className="font-mono text-xs text-text-3">
                  {formatDateShort(item.updatedAt)}
                </TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`${adminPath}/${item.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-md p-1.5 text-text-2 transition hover:bg-bg-1 hover:text-text-1"
                      title="Edit"
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                    </Link>
                    <button
                      onClick={() => handleDelete(item.slug)}
                      className="inline-flex items-center gap-1.5 rounded-md p-1.5 text-text-2 transition hover:bg-danger/10 hover:text-danger"
                      title="Delete"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
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
