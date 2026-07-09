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
import { authFetch } from "@/lib/auth/client";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { parseShareNetworks } from "@/lib/sharing";
import { GitSyncSection } from "./_components/GitSyncSection";
import { AiAssistantSection } from "./_components/AiAssistantSection";
import { McpServerSection } from "./_components/McpServerSection";
import { SocialSharingSection } from "./_components/SocialSharingSection";
import type { AiState, McpState } from "./_components/types";

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Plugins</h1>
        <p className="mt-1 font-mono text-sm text-text-3">
          <span className="text-text-muted">$</span> ls plugins/
        </p>
      </div>

      <div className="gap-x-6 lg:columns-2">
        <GitSyncSection
          git={git}
          setGit={setGit}
          gitToken={gitToken}
          setGitToken={setGitToken}
          gitTokenSet={gitTokenSet}
          gitSaving={gitSaving}
          gitMessage={gitMessage}
          onSave={saveGit}
        />

        <AiAssistantSection
          ai={ai}
          setAi={setAi}
          aiKeys={aiKeys}
          setAiKeys={setAiKeys}
          aiSaving={aiSaving}
          aiMessage={aiMessage}
          availableModels={availableModels}
          fetchingModels={fetchingModels}
          fetchProviderModels={fetchProviderModels}
          onSave={saveAi}
        />

        <McpServerSection
          mcp={mcp}
          setMcp={setMcp}
          mcpSaving={mcpSaving}
          mcpMessage={mcpMessage}
          onSave={saveMcp}
        />

        <SocialSharingSection
          sharing={sharing}
          setSharing={setSharing}
          sharingSaving={sharingSaving}
          sharingMessage={sharingMessage}
          toggleNetwork={toggleNetwork}
          onSave={saveSharing}
        />
      </div>
    </div>
  );
}
