/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { Save, Sparkles, RefreshCw } from "lucide-react";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Field, Input, Select } from "@/themes/bifrost-terminal/components/ui/Input";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { Toggle } from "./Toggle";
import type { AiState } from "./types";

interface Props {
  ai: AiState;
  setAi: React.Dispatch<React.SetStateAction<AiState>>;
  aiKeys: Record<string, string>;
  setAiKeys: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  aiSaving: boolean;
  aiMessage: string;
  availableModels: Record<string, string[]>;
  fetchingModels: Set<string>;
  fetchProviderModels: (providerName: string) => void;
  onSave: (e: React.FormEvent) => void;
}

export function AiAssistantSection({
  ai,
  setAi,
  aiKeys,
  setAiKeys,
  aiSaving,
  aiMessage,
  availableModels,
  fetchingModels,
  fetchProviderModels,
  onSave,
}: Props) {
  return (
    <form onSubmit={onSave} className="mb-6 block break-inside-avoid">
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
  );
}
