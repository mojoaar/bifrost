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
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { Table, THead, TR, TH, TD } from "@/themes/bifrost-terminal/components/ui/Table";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { Field, Input } from "@/themes/bifrost-terminal/components/ui/Input";
import { ACCESS_TOKEN_KEY } from "@/lib/auth/constants";

interface Tag {
  id: string;
  name: string;
  slug: string;
  count: number;
}

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  return token ? { authorization: `Bearer ${token}` } : {};
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function refresh() {
    const res = await fetch("/api/v1/tags", { headers: authHeaders() });
    const body = await res.json();
    if (res.ok) setTags(body.data ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/tags", { headers: authHeaders() })
      .then(async (res) => {
        const body = await res.json();
        if (cancelled) return;
        Promise.resolve().then(() => {
          if (res.ok) setTags(body.data ?? []);
          else setError(body.error?.message ?? "Failed to load tags");
        });
      })
      .catch(() => {
        if (!cancelled) {
          Promise.resolve().then(() => setError("Network error"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          Promise.resolve().then(() => setLoading(false));
        }
      });
    return () => { cancelled = true; };
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setError("");
    const res = await fetch("/api/v1/tags", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error?.message ?? "Failed to create tag");
      return;
    }
    setCreateOpen(false);
    setNewName("");
    await refresh();
  }

  function startEdit(tag: Tag) {
    setEditing(tag.id);
    setEditName(tag.name);
  }

  async function handleUpdate(id: string) {
    setError("");
    const res = await fetch(`/api/v1/tags/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (!res.ok) {
      const b = await res.json();
      setError(b.error?.message ?? "Failed to update tag");
      return;
    }
    setEditing(null);
    await refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this tag? Posts that use it will keep it in frontmatter, but the tag-post links will be removed.")) return;
    setError("");
    const res = await fetch(`/api/v1/tags/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) {
      const b = await res.json();
      setError(b.error?.message ?? "Failed to delete tag");
      return;
    }
    await refresh();
  }

  if (loading) {
    return (
      <Card padding="md">
        <p className="font-mono text-sm text-text-3">loading…</p>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>
          <p className="mt-1 font-mono text-sm text-text-3">
            <span className="text-text-muted">$</span> sqlite3 data/bifrost.db &quot;select count(*) from tags;&quot; → {tags.length}
          </p>
        </div>
        {!createOpen && (
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} />
            <span>New Tag</span>
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {createOpen && (
        <Card padding="md" className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-sm text-text-2"><span className="text-text-muted">$</span> tag --create</p>
            <button onClick={() => setCreateOpen(false)} className="text-text-3 hover:text-text-1">
              <X size={14} />
            </button>
          </div>
          <div className="flex items-end gap-3">
            <Field label="Name">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Tag name"
                autoFocus
              />
            </Field>
            <Button variant="primary" size="sm" onClick={handleCreate}>
              <Check size={14} />
              <span>Create</span>
            </Button>
          </div>
        </Card>
      )}

      {tags.length === 0 ? (
        <Card padding="lg">
          <p className="text-center font-mono text-sm text-text-3">no tags yet</p>
        </Card>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Slug</TH>
              <TH>Posts</TH>
              <TH className="w-24">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {tags.map((tag) => {
              const isEdit = editing === tag.id;
              return (
                <TR key={tag.id}>
                  {isEdit ? (
                    <>
                      <TD>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleUpdate(tag.id)}
                          className="text-sm"
                          autoFocus
                        />
                      </TD>
                      <TD className="font-mono text-xs text-text-3">{tag.slug}</TD>
                      <TD className="font-mono tabular-nums text-text-2">{tag.count}</TD>
                      <TD>
                        <div className="flex gap-1">
                          <button onClick={() => handleUpdate(tag.id)} className="rounded p-1 text-success transition hover:bg-bg-2" title="Save">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setEditing(null)} className="rounded p-1 text-text-3 transition hover:bg-bg-2" title="Cancel">
                            <X size={14} />
                          </button>
                        </div>
                      </TD>
                    </>
                  ) : (
                    <>
                      <TD className="text-text-1">{tag.name}</TD>
                      <TD className="font-mono text-xs text-text-3">{tag.slug}</TD>
                      <TD className="font-mono tabular-nums text-text-2">{tag.count}</TD>
                      <TD>
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(tag)} className="rounded p-1 text-text-3 transition hover:bg-bg-2 hover:text-text-1" title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(tag.id)} className="rounded p-1 text-text-3 transition hover:bg-bg-2 hover:text-danger" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </TD>
                    </>
                  )}
                </TR>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
