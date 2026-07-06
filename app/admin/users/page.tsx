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

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
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
      .catch(() => {
        if (!cancelled) setError("Network error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <p className="text-zinc-400">Loading...</p>;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Users</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-zinc-400">
            <th className="pb-2 font-medium">Email</th>
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Role</th>
            <th className="pb-2 font-medium">Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-zinc-800">
              <td className="py-2 text-zinc-300">{u.email}</td>
              <td className="py-2">{u.displayName}</td>
              <td className="py-2">
                <span className={`rounded px-2 py-0.5 text-xs ${
                  u.role === "admin" ? "bg-purple-900/50 text-purple-400" :
                  u.role === "editor" ? "bg-blue-900/50 text-blue-400" :
                  "bg-zinc-800 text-zinc-400"
                }`}>{u.role}</span>
              </td>
              <td className="py-2 text-zinc-500">{new Date(u.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
