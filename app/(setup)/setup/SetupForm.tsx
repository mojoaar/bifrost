/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { Field, Input } from "@/themes/bifrost-terminal/components/ui/Input";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";

export default function SetupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/v1/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, title, description }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error?.message ?? "Setup failed");
        return;
      }
      router.push("/login");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-0 p-4">
      <Card padding="lg" className="w-full max-w-md">
        <div className="mb-6">
          <p className="font-mono text-sm text-text-3">
            <span className="text-text-muted">$</span> bifröst init
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Welcome to Bifröst</h1>
          <p className="mt-1 text-sm text-text-3">Set up your blog and admin account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 font-mono text-xs text-danger">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div className="font-mono text-xs uppercase tracking-wider text-text-3">Blog</div>
            <Field label="Title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Description">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </div>

          <div className="space-y-3">
            <div className="font-mono text-xs uppercase tracking-wider text-text-3">Admin</div>
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </Field>
            <Field label="Password" helper="Minimum 8 characters.">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </Field>
          </div>

          <Button type="submit" variant="primary" disabled={loading} className="w-full">
            {loading ? "Creating…" : "Create Blog"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
