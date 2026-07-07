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
import { Button } from "@/themes/default/components/ui/Button";
import { Field, Input } from "@/themes/default/components/ui/Input";
import { Card } from "@/themes/default/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error?.message ?? "Login failed");
        return;
      }
      localStorage.setItem("bifrost_token", body.data.tokens.accessToken);
      router.push("/admin");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-0 p-4">
      <Card padding="lg" className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="font-mono text-sm text-text-3">
            <span className="text-text-muted">$</span> ssh admin@bifröst
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Sign in</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 font-mono text-xs text-danger">
              {error}
            </div>
          )}

          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </Field>

          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </Field>

          <Button type="submit" variant="primary" disabled={loading} className="w-full">
            {loading ? "Authenticating…" : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
