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
import { Save, GitBranch, Sparkles, Plug, ExternalLink, Share2, RefreshCw } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Field, Input, Select } from "@/themes/bifrost-terminal/components/ui/Input";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { SHARE_NETWORKS, parseShareNetworks } from "@/lib/sharing";

interface AiState {
  enabled: boolean;
  defaultProvider: string;
  providers: { name: string; model: string; hasKey: boolean }[];
}

interface McpState {
  enabled: boolean;
  mode: string;
  port: number;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 font-mono text-sm text-text-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-border bg-bg-1 text-accent focus:ring-2 focus:ring-accent/30"
      />
      <span>{label}</span>
    </label>
  );
}

export default function PluginsPage() {
  const [loading, setLoading] = useState(true);

  const [git, setGit] = useState<Record<string, string>>({});
  const [gitToken, setGitToken] = useState("");
  const [gitTokenSet, setGitTokenSet] = useState(false);
  const [gitSaving, setGitSaving] = useState(false);
  const [gitMessage, setGitMessage] = useState("");

  const [ai, setAi] = useState<AiState>({
    enabled: false,
    defaultProvider: "",
    providers: [],
  });
  const [aiKeys, setAiKeys] = useState<Record<string, string>>({});
  const [aiSaving, setAiSaving] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [availableModels, setAvailableModels] = useState<Record<string, string[]>>({});
  const [fetchingModels, setFetchingModels] = useState<Set<string>>(new Set());

  async function fetchProviderModels(providerName: string) {
    setFetchingModels((s) => new Set(s).add(providerName));
    try {
      const res = await authFetch(`/api/v1/ai/models?provider=${encodeURIComponent(providerName)}`);
      const body = await res.json();
      if (body.data) {
        setAvailableModels((prev) => ({ ...prev, [providerName]: body.data }));
      }
    } catch {
      // Silently fail — dropdown will show the static model value
    } finally {
      setFetchingModels((s) => {
        const next = new Set(s);
        next.delete(providerName);
        return next;
      });
    }
  }

  const [mcp, setMcp] = useState<McpState>({ enabled: true, mode: "stdio", port: 3456 });
  const [mcpSaving, setMcpSaving] = useState(false);
  const [mcpMessage, setMcpMessage] = useState("");

  const [sharing, setSharing] = useState<{ enabled: boolean; networks: string[] }>({
    enabled: false,
    networks: [],
  });
  const [sharingSaving, setSharingSaving] = useState(false);
  const [sharingMessage, setSharingMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [settingsRes, aiRes, mcpRes] = await Promise.all([
          fetch("/api/v1/settings"),
          authFetch("/api/v1/ai/settings"),
          authFetch("/api/v1/mcp/status"),
        ]);
        const [settingsBody, aiBody, mcpBody] = await Promise.all([
          settingsRes.json().catch(() => ({})),
          aiRes.json().catch(() => ({})),
          mcpRes.json().catch(() => ({})),
        ]);
        if (cancelled) return;
        if (settingsRes.ok) {
          const data: Record<string, string> = settingsBody.data ?? {};
          setGitTokenSet(data["git.token"] === "__SET__");
          setGit({
            "git.enabled": data["git.enabled"] ?? "true",
            "git.remote": data["git.remote"] ?? "",
            "git.branch": data["git.branch"] ?? "main",
            "git.history_limit": data["git.history_limit"] ?? "50",
            "git.autoCommit": data["git.autoCommit"] ?? "true",
          });
          setSharing({
            enabled: data["sharing.enabled"] === "true",
            networks: parseShareNetworks(data["sharing.networks"]),
          });
        }
        if (aiRes.ok && aiBody.data) {
          setAi(aiBody.data);
          for (const p of aiBody.data.providers) {
            fetchProviderModels(p.name);
          }
        }
        if (mcpRes.ok && mcpBody.data) setMcp(mcpBody.data);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function setGitValue(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setGit((s) => ({ ...s, [key]: e.target.value }));
    };
  }

  async function saveGit(e: React.FormEvent) {
    e.preventDefault();
    setGitSaving(true);
    setGitMessage("");
    try {
      const body: Record<string, string> = { ...git };
      if (gitToken.trim() !== "") body["git.token"] = gitToken.trim();
      const res = await authFetch("/api/v1/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setGitMessage("Error saving");
        return;
      }
      if (gitToken.trim() !== "") setGitTokenSet(true);
      setGitToken("");
      setGitMessage("Saved");
    } catch {
      setGitMessage("Error saving");
    } finally {
      setGitSaving(false);
    }
  }

  async function saveAi(e: React.FormEvent) {
    e.preventDefault();
    setAiSaving(true);
    setAiMessage("");
    try {
      const providers: Record<string, { model: string; apiKey?: string }> = {};
      for (const p of ai.providers) {
        const entry: { model: string; apiKey?: string } = { model: p.model };
        const key = aiKeys[p.name];
        if (key && key.trim() !== "") entry.apiKey = key.trim();
        providers[p.name] = entry;
      }
      const res = await authFetch("/api/v1/ai/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          enabled: ai.enabled,
          defaultProvider: ai.defaultProvider,
          providers,
        }),
      });
      if (!res.ok) {
        setAiMessage("Error saving");
        return;
      }
      const reload = await authFetch("/api/v1/ai/settings");
      const body = await reload.json().catch(() => ({}));
      if (reload.ok && body.data) setAi(body.data);
      setAiKeys({});
      setAiMessage("Saved");
    } catch {
      setAiMessage("Error saving");
    } finally {
      setAiSaving(false);
    }
  }

  async function saveMcp(e: React.FormEvent) {
    e.preventDefault();
    setMcpSaving(true);
    setMcpMessage("");
    try {
      const res = await authFetch("/api/v1/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ "mcp.enabled": mcp.enabled ? "true" : "false" }),
      });
      setMcpMessage(res.ok ? "Saved" : "Error saving");
    } catch {
      setMcpMessage("Error saving");
    } finally {
      setMcpSaving(false);
    }
  }

  async function saveSharing(e: React.FormEvent) {
    e.preventDefault();
    setSharingSaving(true);
    setSharingMessage("");
    try {
      const res = await authFetch("/api/v1/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          "sharing.enabled": sharing.enabled ? "true" : "false",
          "sharing.networks": JSON.stringify(sharing.networks),
        }),
      });
      setSharingMessage(res.ok ? "Saved" : "Error saving");
    } catch {
      setSharingMessage("Error saving");
    } finally {
      setSharingSaving(false);
    }
  }

  function toggleNetwork(key: string) {
    setSharing((s) => ({
      ...s,
      networks: s.networks.includes(key)
        ? s.networks.filter((n) => n !== key)
        : [...s.networks, key],
    }));
  }

  if (loading) {
    return (
      <Card padding="md">
        <p className="font-mono text-sm text-text-3">loading…</p>
      </Card>
    );
  }

  const gitEnabled = git["git.enabled"] !== "false";
  const sseUrl = `http://localhost:${mcp.port}/sse`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Plugins</h1>
        <p className="mt-1 font-mono text-sm text-text-3">
          <span className="text-text-muted">$</span> ls plugins/
        </p>
      </div>

      <div className="gap-x-6 lg:columns-2">
        {/* Git Sync */}
        <form onSubmit={saveGit} className="mb-6 block break-inside-avoid">
          <Card padding="md">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <GitBranch size={18} className="mt-0.5 text-accent" />
                <div>
                  <div className="font-semibold text-text-1">Git Sync</div>
                  <p className="mt-0.5 text-sm text-text-3">
                    Version every post in a Git repository and optionally push to a remote.
                  </p>
                </div>
              </div>
              <Toggle
                checked={gitEnabled}
                onChange={(v) => setGit((s) => ({ ...s, "git.enabled": v ? "true" : "false" }))}
                label={gitEnabled ? "Enabled" : "Disabled"}
              />
            </div>

            <div className="space-y-3">
              <Field label="Remote URL" helper="Optional. Leave empty to disable push/pull.">
                <Input
                  value={git["git.remote"] ?? ""}
                  onChange={setGitValue("git.remote")}
                  placeholder="git@github.com:user/repo.git"
                  className="font-mono"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Branch">
                  <Input
                    value={git["git.branch"] ?? "main"}
                    onChange={setGitValue("git.branch")}
                    placeholder="main"
                    className="font-mono"
                  />
                </Field>
                <Field label="History Limit" helper="Max commits shown in history">
                  <Input
                    type="number"
                    min="1"
                    max="500"
                    value={git["git.history_limit"] ?? "50"}
                    onChange={setGitValue("git.history_limit")}
                    className="font-mono"
                  />
                </Field>
              </div>
              <Field
                label="Auth Token"
                helper={
                  gitTokenSet
                    ? "A token is configured. Type a new value to replace it; leave blank to keep it."
                    : "Personal access token, deploy key, or password. Overrides BIFROST_GIT_TOKEN env var. Stored in the database."
                }
              >
                <Input
                  type="password"
                  value={gitToken}
                  onChange={(e) => setGitToken(e.target.value)}
                  placeholder={gitTokenSet ? "•••••••• (configured)" : "ghp_•••••••"}
                  className="font-mono"
                  autoComplete="off"
                />
              </Field>
              <Toggle
                checked={git["git.autoCommit"] !== "false"}
                onChange={(v) => setGit((s) => ({ ...s, "git.autoCommit": v ? "true" : "false" }))}
                label="Auto-commit on post save"
              />
            </div>

            <div className="mt-4 flex items-center gap-4">
              <Button type="submit" variant="primary" disabled={gitSaving}>
                <Save size={14} />
                <span>{gitSaving ? "Saving..." : "Save"}</span>
              </Button>
              {gitEnabled && (
                <Link
                  href="/admin/git"
                  className="inline-flex items-center gap-1 font-mono text-xs text-text-2 transition hover:text-text-1"
                >
                  View history <ExternalLink size={12} />
                </Link>
              )}
              {gitMessage && (
                <span className={`font-mono text-xs ${gitMessage === "Saved" ? "text-success" : "text-danger"}`}>
                  {gitMessage}
                </span>
              )}
            </div>
          </Card>
        </form>

        {/* AI Assistant */}
        <form onSubmit={saveAi} className="mb-6 block break-inside-avoid">
          <Card padding="md">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Sparkles size={18} className="mt-0.5 text-accent" />
                <div>
                  <div className="font-semibold text-text-1">AI Assistant</div>
                  <p className="mt-0.5 text-sm text-text-3">
                    Draft, rewrite, and brainstorm inside the editor using your AI provider.
                  </p>
                </div>
              </div>
              <Toggle
                checked={ai.enabled}
                onChange={(v) => setAi((s) => ({ ...s, enabled: v }))}
                label={ai.enabled ? "Enabled" : "Disabled"}
              />
            </div>

            <div className="space-y-4">
              <Field label="Default provider">
                <Select
                  value={ai.defaultProvider}
                  onChange={(e) => setAi((s) => ({ ...s, defaultProvider: e.target.value }))}
                  className="font-mono"
                >
                  {ai.providers.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>

              {ai.providers.map((p) => (
                <div key={p.name} className="rounded-md border border-border p-3">
                  <div className="mb-2 font-mono text-xs text-text-3">{p.name}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Model">
                      <div className="flex items-center gap-1">
                        <Select
                          value={p.model}
                          onChange={(e) =>
                            setAi((s) => ({
                              ...s,
                              providers: s.providers.map((x) =>
                                x.name === p.name ? { ...x, model: e.target.value } : x
                              ),
                            }))
                          }
                          className="flex-1 font-mono"
                        >
                          {(availableModels[p.name] ?? []).length === 0 && (
                            <option value={p.model}>{p.model}</option>
                          )}
                          {availableModels[p.name]?.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </Select>
                        <button
                          type="button"
                          onClick={() => fetchProviderModels(p.name)}
                          className="shrink-0 rounded-md border border-border bg-bg-1 p-1.5 text-text-2 transition hover:border-border-strong hover:text-text-1"
                          title="Refresh model list"
                        >
                          <RefreshCw size={14} className={fetchingModels.has(p.name) ? "animate-spin" : ""} />
                        </button>
                      </div>
                    </Field>
                    <Field label="API key" helper={p.hasKey ? "Configured. Blank keeps it." : "Not set"}>
                      <Input
                        type="password"
                        value={aiKeys[p.name] ?? ""}
                        onChange={(e) => setAiKeys((k) => ({ ...k, [p.name]: e.target.value }))}
                        placeholder={p.hasKey ? "•••••••• (configured)" : "sk-•••••••"}
                        className="font-mono"
                        autoComplete="off"
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-4">
              <Button type="submit" variant="primary" disabled={aiSaving}>
                <Save size={14} />
                <span>{aiSaving ? "Saving..." : "Save"}</span>
              </Button>
              {aiMessage && (
                <span className={`font-mono text-xs ${aiMessage === "Saved" ? "text-success" : "text-danger"}`}>
                  {aiMessage}
                </span>
              )}
            </div>
          </Card>
        </form>

        {/* MCP Server */}
        <form onSubmit={saveMcp} className="mb-6 block break-inside-avoid">
          <Card padding="md">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Plug size={18} className="mt-0.5 text-accent" />
                <div>
                  <div className="font-semibold text-text-1">MCP Server</div>
                  <p className="mt-0.5 text-sm text-text-3">
                    Expose your blog to AI agents over the Model Context Protocol.
                  </p>
                </div>
              </div>
              <Toggle
                checked={mcp.enabled}
                onChange={(v) => setMcp((s) => ({ ...s, enabled: v }))}
                label={mcp.enabled ? "Enabled" : "Disabled"}
              />
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mode" helper="Set via bifrost.config.ts">
                  <Input value={mcp.mode} readOnly disabled className="font-mono" />
                </Field>
                <Field label="Port" helper="Set via bifrost.config.ts">
                  <Input value={String(mcp.port)} readOnly disabled className="font-mono" />
                </Field>
              </div>
              <div className="rounded-md border border-border bg-bg-1 p-3">
                <div className="mb-1 font-mono text-xs text-text-3">HTTP/SSE endpoint</div>
                <code className="font-mono text-sm text-text-1">{sseUrl}</code>
                <p className="mt-2 text-xs text-text-3">
                  Start the server with{" "}
                  <code className="rounded bg-bg-0 px-1 py-0.5 font-mono text-text-2">npm run mcp:start</code>. Point
                  opencode, Claude Code, or Kilo Code at the endpoint above.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <Button type="submit" variant="primary" disabled={mcpSaving}>
                <Save size={14} />
                <span>{mcpSaving ? "Saving..." : "Save"}</span>
              </Button>
              {mcpMessage && (
                <span className={`font-mono text-xs ${mcpMessage === "Saved" ? "text-success" : "text-danger"}`}>
                  {mcpMessage}
                </span>
              )}
            </div>
          </Card>
        </form>

        {/* Social Sharing */}
        <form onSubmit={saveSharing} className="mb-6 block break-inside-avoid">
          <Card padding="md">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Share2 size={18} className="mt-0.5 text-accent" />
                <div>
                  <div className="font-semibold text-text-1">Social Sharing</div>
                  <p className="mt-0.5 text-sm text-text-3">
                    Add share buttons to your posts for Bluesky, Facebook, Reddit, LinkedIn, and Email.
                  </p>
                </div>
              </div>
              <Toggle
                checked={sharing.enabled}
                onChange={(v) => setSharing((s) => ({ ...s, enabled: v }))}
                label={sharing.enabled ? "Enabled" : "Disabled"}
              />
            </div>

            <div className="space-y-2">
              <div className="font-mono text-xs uppercase tracking-wider text-text-3">Networks</div>
              {SHARE_NETWORKS.map((n) => (
                <Toggle
                  key={n.key}
                  checked={sharing.networks.includes(n.key)}
                  onChange={() => toggleNetwork(n.key)}
                  label={n.label}
                />
              ))}
            </div>

            <div className="mt-4 flex items-center gap-4">
              <Button type="submit" variant="primary" disabled={sharingSaving}>
                <Save size={14} />
                <span>{sharingSaving ? "Saving..." : "Save"}</span>
              </Button>
              {sharingMessage && (
                <span className={`font-mono text-xs ${sharingMessage === "Saved" ? "text-success" : "text-danger"}`}>
                  {sharingMessage}
                </span>
              )}
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
}
