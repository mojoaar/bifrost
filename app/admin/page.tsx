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
import { Plus, Upload, Settings as SettingsIcon, FileText, Image as ImageIcon, CheckCircle2, FileEdit, Eye, Clock, Server, TrendingUp } from "lucide-react";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { authFetch } from "@/lib/auth/client";

interface AdminWidget {
  component: React.ComponentType;
  position: "sidebar" | "main";
  label: string;
}

interface Stats {
  total: number;
  drafts: number;
  published: number;
  media: number;
}

interface ServerInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
  uptime: number;
  memory: { rss: number; heapTotal: number; heapUsed: number };
  version: string;
}

interface ViewEntry {
  path: string;
  count: number;
}

interface AdminStats {
  server: ServerInfo;
  db: { posts: number; pages: number; users: number; media: number; tags: number };
  views: { today: number; week: number; mostViewed: ViewEntry[] };
}

interface Post {
  slug: string;
  title: string;
  status: "draft" | "published";
  updatedAt: string;
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <Card padding="md">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-text-3">{label}</div>
          <div className="mt-2 font-mono text-3xl font-semibold tabular-nums text-text-1">{value}</div>
        </div>
        <Icon size={16} className="text-text-3" />
      </div>
    </Card>
  );
}

function StatCardString({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <Card padding="md">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-text-3">{label}</div>
          <div className="mt-2 font-mono text-lg font-semibold text-text-1">{value}</div>
        </div>
        <Icon size={16} className="text-text-3" />
      </div>
    </Card>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function AdminDashboard() {
  const [widgets, setWidgets] = useState<AdminWidget[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, drafts: 0, published: 0, media: 0 });
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [gitEnabled, setGitEnabled] = useState(true);
  const [mcpEnabled, setMcpEnabled] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [themeName, setThemeName] = useState("bifrost-terminal");
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
      } catch (err) {
        console.error("Dashboard plugin load failed", err);
      }
      const token = localStorage.getItem("bifrost_token");
      const authHeader: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};
      try {
        const [allRes, draftsRes, publishedRes, mediaRes, recentRes] = await Promise.all([
          fetch("/api/v1/posts?limit=1", { headers: authHeader }),
          fetch("/api/v1/posts?limit=1&status=draft", { headers: authHeader }),
          fetch("/api/v1/posts?limit=1&status=published", { headers: authHeader }),
          fetch("/api/v1/media", { headers: authHeader }),
          fetch("/api/v1/posts?limit=5&status=published", { headers: authHeader }),
        ]);
        const [allBody, draftsBody, publishedBody, mediaBody, recentBody] = await Promise.all([
          allRes.json().catch(() => ({})),
          draftsRes.json().catch(() => ({})),
          publishedRes.json().catch(() => ({})),
          mediaRes.json().catch(() => ({})),
          recentRes.json().catch(() => ({})),
        ]);
        if (!cancelled) {
          setStats({
            total: allBody.meta?.total ?? 0,
            drafts: draftsBody.meta?.total ?? 0,
            published: publishedBody.meta?.total ?? 0,
            media: Array.isArray(mediaBody.data) ? mediaBody.data.length : 0,
          });
          setPosts(recentBody.data ?? []);
        }
      } catch (err) {
        console.error("Dashboard stats load failed", err);
      }
      try {
        const settingsRes = await fetch("/api/v1/settings", { headers: authHeader });
        const settingsBody = await settingsRes.json().catch(() => ({}));
        if (!cancelled) {
          setGitEnabled(settingsBody.data?.["git.enabled"] !== "false");
          setMcpEnabled(settingsBody.data?.["mcp.enabled"] !== "false");
          setAiEnabled(settingsBody.data?.["ai.enabled"] === "true");
          setSharingEnabled(settingsBody.data?.["sharing.enabled"] === "true");
          if (settingsBody.data?.["theme"]) setThemeName(settingsBody.data["theme"]);
        }
      } catch (err) {
        console.error("Dashboard settings load failed", err);
      }
      try {
        const statsRes = await authFetch("/api/v1/admin/stats");
        const statsBody = await statsRes.json();
        if (!cancelled && statsBody.data) {
          setAdminStats(statsBody.data);
        }
      } catch (err) {
        console.error("Dashboard admin stats load failed", err);
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
        <div className="flex items-center gap-2">
          <Link href="/admin/pages/new">
            <Button variant="ghost">
              <Plus size={14} />
              <span>New Page</span>
            </Button>
          </Link>
          <Link href="/admin/posts/new">
            <Button variant="primary">
              <Plus size={14} />
              <span>New Post</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Posts" value={stats.total} icon={FileText} />
        <StatCard label="Published" value={stats.published} icon={CheckCircle2} />
        <StatCard label="Drafts" value={stats.drafts} icon={FileEdit} />
        <StatCard label="Media" value={stats.media} icon={ImageIcon} />
      </div>

      {adminStats && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Visitors Today" value={adminStats.views.today} icon={Eye} />
          <StatCard label="This Week" value={adminStats.views.week} icon={TrendingUp} />
          <StatCardString label="Uptime" value={formatUptime(adminStats.server.uptime)} icon={Clock} />
          <StatCardString
            label="Memory"
            value={`${adminStats.server.memory.rss} MB`}
            icon={Server}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {adminStats && adminStats.views.mostViewed.length > 0 && (
          <Card padding="md">
            <div className="font-mono text-xs uppercase tracking-wider text-text-3">Most Viewed</div>
            <div className="mt-3 space-y-2">
              {adminStats.views.mostViewed.map((v) => (
                <div
                  key={v.path}
                  className="flex items-center justify-between rounded border border-border bg-bg-1 px-3 py-2"
                >
                  <span className="truncate font-mono text-sm text-text-1">{v.path}</span>
                  <span className="font-mono text-xs text-text-muted">{v.count}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

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
                <FileText size={14} className="text-accent" />
                <span>New post</span>
              </Button>
            </Link>
            <Link href="/admin/pages/new">
              <Button variant="ghost" className="w-full justify-start">
                <FileText size={14} className="text-accent" />
                <span>New page</span>
              </Button>
            </Link>
            <Link href="/admin/media">
              <Button variant="ghost" className="w-full justify-start">
                <Upload size={14} className="text-accent" />
                <span>Upload media</span>
              </Button>
            </Link>
            <Link href="/admin/settings">
              <Button variant="ghost" className="w-full justify-start">
                <SettingsIcon size={14} className="text-accent" />
                <span>Settings</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {adminStats && (
        <div className="mt-4">
          <Card padding="md">
            <div className="mb-3 font-mono text-xs uppercase tracking-wider text-text-3">Server</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-xs text-text-2 lg:grid-cols-4">
              <div className="flex justify-between">
                <span className="text-text-3">version</span>
                <span>v{adminStats.server.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-3">node</span>
                <span>{adminStats.server.nodeVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-3">platform</span>
                <span>{adminStats.server.platform} ({adminStats.server.arch})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-3">heap</span>
                <span>{adminStats.server.memory.heapUsed} / {adminStats.server.memory.heapTotal} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-3">theme</span>
                <span>{themeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-3">git</span>
                <span>{gitEnabled ? "enabled" : "disabled"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-3">mcp</span>
                <span>{mcpEnabled ? "enabled" : "disabled"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-3">ai assistant</span>
                <span>{aiEnabled ? "enabled" : "disabled"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-3">sharing</span>
                <span>{sharingEnabled ? "enabled" : "disabled"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-3">db posts</span>
                <span>{adminStats.db.posts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-3">db pages</span>
                <span>{adminStats.db.pages}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-3">db tags</span>
                <span>{adminStats.db.tags}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

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
