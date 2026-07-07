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
import Link from "next/link";
import { Card } from "@/themes/default/components/ui/Card";
import { Button } from "@/themes/default/components/ui/Button";

interface AdminWidget {
  component: React.ComponentType;
  position: "sidebar" | "main";
  label: string;
}

interface Post {
  slug: string;
  title: string;
  status: "draft" | "published";
  updatedAt: string;
}

export default function AdminDashboard() {
  const [widgets, setWidgets] = useState<AdminWidget[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { listPlugins } = await import("@/lib/plugins");
        const plugins = listPlugins();
        const found: AdminWidget[] = [];
        for (const p of plugins) {
          if (p.hooks.adminWidget) {
            const w = p.hooks.adminWidget();
            if (w) found.push(w);
          }
        }
        if (!cancelled) setWidgets(found);
      } catch {
        // plugin load failed — no widgets
      }
      try {
        const res = await fetch("/api/v1/posts?limit=5&status=published", {
          headers: { authorization: `Bearer ${localStorage.getItem("bifrost_token") ?? ""}` },
        });
        if (res.ok) {
          const body = await res.json();
          if (!cancelled) setPosts(body.data ?? []);
        }
      } catch {
        // silent
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const mainWidgets = widgets.filter((w) => w.position === "main");
  const sidebarWidgets = widgets.filter((w) => w.position === "sidebar");

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 font-mono text-sm text-text-3">
            <span className="text-text-muted">$</span> status --admin
          </p>
        </div>
        <Link href="/admin/posts/new">
          <Button variant="primary">+ New Post</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card padding="md">
          <div className="font-mono text-xs uppercase tracking-wider text-text-3">Recent Posts</div>
          <div className="mt-3 space-y-2">
            {loading ? (
              <div className="font-mono text-xs text-text-muted">loading…</div>
            ) : posts.length === 0 ? (
              <div className="font-mono text-xs text-text-muted">no posts yet</div>
            ) : (
              posts.map((p) => (
                <Link
                  key={p.slug}
                  href={`/admin/posts/${p.slug}`}
                  className="flex items-center justify-between rounded border border-border bg-bg-1 px-3 py-2 text-sm transition hover:border-border-strong"
                >
                  <span className="truncate text-text-1">{p.title}</span>
                  <span className="font-mono text-xs text-text-3">{p.status}</span>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card padding="md">
          <div className="font-mono text-xs uppercase tracking-wider text-text-3">Quick Actions</div>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/admin/posts/new">
              <Button variant="ghost" className="w-full justify-start">
                <span className="text-accent">+</span> New post
              </Button>
            </Link>
            <Link href="/admin/media">
              <Button variant="ghost" className="w-full justify-start">
                <span className="text-accent">↑</span> Upload media
              </Button>
            </Link>
            <Link href="/admin/settings">
              <Button variant="ghost" className="w-full justify-start">
                <span className="text-accent">⚙</span> Settings
              </Button>
            </Link>
          </div>
        </Card>

        <Card padding="md">
          <div className="font-mono text-xs uppercase tracking-wider text-text-3">System</div>
          <div className="mt-3 space-y-2 font-mono text-xs text-text-2">
            <div className="flex justify-between">
              <span className="text-text-3">version</span>
              <span>v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-3">theme</span>
              <span>default</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-3">git</span>
              <span>enabled</span>
            </div>
          </div>
        </Card>
      </div>

      {mainWidgets.length > 0 && (
        <div className="mt-6 space-y-4">
          {mainWidgets.map((w) => (
            <Card key={w.label} padding="md">
              <div className="mb-2 font-mono text-xs uppercase tracking-wider text-text-3">{w.label}</div>
              <w.component />
            </Card>
          ))}
        </div>
      )}

      {sidebarWidgets.length > 0 && (
        <div className="mt-6 space-y-4">
          {sidebarWidgets.map((w) => (
            <Card key={w.label} padding="md">
              <div className="mb-2 font-mono text-xs uppercase tracking-wider text-text-3">{w.label}</div>
              <w.component />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
