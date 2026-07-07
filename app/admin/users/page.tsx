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
import { Field, Input, Select } from "@/themes/bifrost-terminal/components/ui/Input";
import { useDateTimeFormat } from "@/lib/format-date";

interface User {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "editor" | "author";
  createdAt: string;
}

function RolePill({ role }: { role: User["role"] }) {
  const colors = {
    admin: "border-accent/40 text-accent",
    editor: "border-success/40 text-success",
    author: "border-border text-text-3",
  } as const;
  return (
    <span className={`rounded border bg-bg-0 px-1.5 py-0.5 font-mono text-xs uppercase tracking-wider ${colors[role]}`}>
      {role}
    </span>
  );
}

const ROLE_OPTIONS = ["author", "editor", "admin"] as const;

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("bifrost_token");
  return token ? { authorization: `Bearer ${token}` } : {};
}

export default function UsersPage() {
  const { formatDateShort } = useDateTimeFormat();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("author");

  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editPassword, setEditPassword] = useState("");

  async function refresh() {
    const res = await fetch("/api/v1/users", { headers: authHeaders() });
    const body = await res.json();
    if (res.ok) setUsers(body.data ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/users", { headers: authHeaders() })
      .then(async (res) => {
        const body = await res.json();
        if (cancelled) return;
        if (res.ok) setUsers(body.data ?? []);
        else setError(body.error?.message ?? "Failed to load users");
      })
      .catch(() => { if (!cancelled) setError("Network error"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleCreate() {
    if (!newEmail || !newPassword || !newName) {
      setError("Name, email and password are required");
      return;
    }
    setError("");
    const res = await fetch("/api/v1/users", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({ email: newEmail, displayName: newName, password: newPassword, role: newRole }),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error?.message ?? "Failed to create user");
      return;
    }
    setCreateOpen(false);
    setNewEmail(""); setNewName(""); setNewPassword(""); setNewRole("author");
    await refresh();
  }

  function startEdit(u: User) {
    setEditing(u.id);
    setEditName(u.displayName);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditPassword("");
  }

  async function handleUpdate(id: string) {
    setError("");
    const body: Record<string, string> = { displayName: editName, email: editEmail, role: editRole };
    if (editPassword) body.password = editPassword;
    const res = await fetch(`/api/v1/users/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const b = await res.json();
      setError(b.error?.message ?? "Failed to update user");
      return;
    }
    setEditing(null);
    await refresh();
  }

  async function handleDelete(id: string) {
    setError("");
    const res = await fetch(`/api/v1/users/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) {
      const b = await res.json();
      setError(b.error?.message ?? "Failed to delete user");
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
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="mt-1 font-mono text-sm text-text-3">
            <span className="text-text-muted">$</span> getent passwd | wc -l → {users.length}
          </p>
        </div>
        {!createOpen && (
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} />
            <span>New User</span>
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
            <p className="font-mono text-sm text-text-2"><span className="text-text-muted">$</span> useradd</p>
            <button onClick={() => setCreateOpen(false)} className="text-text-3 hover:text-text-1">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Field label="Name">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Display name" />
            </Field>
            <Field label="Email">
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@example.com" />
            </Field>
            <Field label="Password">
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="min 8 chars" />
            </Field>
            <Field label="Role">
              <Select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </Field>
            <div className="flex items-end">
              <Button variant="primary" size="sm" onClick={handleCreate}>
                <Check size={14} />
                <span>Create</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Table>
        <THead>
          <TR>
            <TH>Email</TH>
            <TH>Name</TH>
            <TH>Role</TH>
            <TH>Joined</TH>
            <TH className="w-24">Actions</TH>
          </TR>
        </THead>
        <tbody>
          {users.map((u) => {
            const isEdit = editing === u.id;
            return (
              <TR key={u.id}>
                {isEdit ? (
                  <>
                    <TD><Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="font-mono text-sm" /></TD>
                    <TD><Input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-sm" /></TD>
                    <TD>
                      <Select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                        {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </Select>
                    </TD>
                    <TD><Input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="new pw" className="font-mono text-xs" /></TD>
                    <TD>
                      <div className="flex gap-1">
                        <button onClick={() => handleUpdate(u.id)} className="rounded p-1 text-success transition hover:bg-bg-2" title="Save">
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
                    <TD className="font-mono text-text-2">{u.email}</TD>
                    <TD className="text-text-1">{u.displayName}</TD>
                    <TD><RolePill role={u.role} /></TD>
                    <TD className="font-mono text-xs text-text-3">{formatDateShort(u.createdAt)}</TD>
                    <TD>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(u)} className="rounded p-1 text-text-3 transition hover:bg-bg-2 hover:text-text-1" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(u.id)} className="rounded p-1 text-text-3 transition hover:bg-bg-2 hover:text-danger" title="Delete">
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
    </div>
  );
}
