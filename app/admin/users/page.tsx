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
import { Table, THead, TR, TH, TD } from "@/themes/bifrost-terminal/components/ui/Table";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";

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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem("bifrost_token");
    fetch("/api/v1/users", {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })
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

  if (loading) {
    return (
      <Card padding="md">
        <p className="font-mono text-sm text-text-3">loading…</p>
      </Card>
    );
  }
  if (error) {
    return (
      <Card padding="md">
        <p className="text-sm text-danger">{error}</p>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 font-mono text-sm text-text-3">
          <span className="text-text-muted">$</span> getent passwd | wc -l → {users.length}
        </p>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Email</TH>
            <TH>Name</TH>
            <TH>Role</TH>
            <TH>Joined</TH>
          </TR>
        </THead>
        <tbody>
          {users.map((u) => (
            <TR key={u.id}>
              <TD className="font-mono text-text-2">{u.email}</TD>
              <TD className="text-text-1">{u.displayName}</TD>
              <TD><RolePill role={u.role} /></TD>
              <TD className="font-mono text-xs text-text-3">
                {new Date(u.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </TD>
            </TR>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
