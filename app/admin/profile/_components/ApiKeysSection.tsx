/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { Plus, X, Check, Copy, KeyRound, Trash2 } from "lucide-react";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Field, Input } from "@/themes/bifrost-terminal/components/ui/Input";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { Table, THead, TR, TH, TD } from "@/themes/bifrost-terminal/components/ui/Table";

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface Props {
  keys: ApiKey[];
  createOpen: boolean;
  setCreateOpen: (v: boolean) => void;
  newKeyName: string;
  setNewKeyName: (v: string) => void;
  creatingKey: boolean;
  freshKey: string | null;
  setFreshKey: (v: string | null) => void;
  copied: boolean;
  onCreateKey: () => void;
  onRevokeKey: (id: string) => void;
  onCopyFreshKey: () => void;
  formatDateShort: (iso: string | null) => string;
}

export function ApiKeysSection({
  keys,
  createOpen,
  setCreateOpen,
  newKeyName,
  setNewKeyName,
  creatingKey,
  freshKey,
  setFreshKey,
  copied,
  onCreateKey,
  onRevokeKey,
  onCopyFreshKey,
  formatDateShort,
}: Props) {
  return (
    <Card padding="md">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-mono text-xs uppercase tracking-wider text-text-3">API Keys</div>
        {!createOpen && (
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} />
            <span>New Key</span>
          </Button>
        )}
      </div>
      <p className="mb-4 font-mono text-xs text-text-muted">
        Bearer tokens for the REST API. Keys belong to your account only.
      </p>

      {freshKey && (
        <div className="mb-4 rounded-md border border-success/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-sm text-success">
              <KeyRound size={14} className="mr-1 inline-block" /> New API key created
            </p>
            <button onClick={() => setFreshKey(null)} className="text-text-3 hover:text-text-1">
              <X size={14} />
            </button>
          </div>
          <p className="mb-2 text-sm text-text-3">
            Copy this key now — it won&apos;t be shown again. Use as a{" "}
            <code className="font-mono text-text-2">Bearer</code> token.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-md border border-border bg-bg-0 px-3 py-2 font-mono text-sm text-text-1">
              {freshKey}
            </code>
            <Button variant="ghost" size="sm" onClick={onCopyFreshKey}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="mb-4 rounded-md border border-border bg-bg-0 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-sm text-text-2">
              <span className="text-text-muted">$</span> create key
            </p>
            <button onClick={() => setCreateOpen(false)} className="text-text-3 hover:text-text-1">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <Field label="Name">
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. CI deploy token"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCreateKey();
                }}
              />
            </Field>
            <Button variant="primary" size="md" className="h-[2.375rem]" onClick={onCreateKey} disabled={creatingKey}>
              <Check size={14} />
              <span>{creatingKey ? "Creating…" : "Create"}</span>
            </Button>
          </div>
        </div>
      )}

      {keys.length === 0 && !createOpen ? (
        <p className="font-mono text-sm text-text-3">
          No API keys yet. Create one to authenticate REST API requests without logging in.
        </p>
      ) : keys.length > 0 ? (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Key</TH>
              <TH>Created</TH>
              <TH>Last used</TH>
              <TH className="w-16">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {keys.map((k) => (
              <TR key={k.id}>
                <TD className="text-text-1">{k.name}</TD>
                <TD className="font-mono text-text-2">{k.keyPrefix}…</TD>
                <TD className="font-mono text-xs text-text-3">{formatDateShort(k.createdAt)}</TD>
                <TD className="font-mono text-xs text-text-3">
                  {k.lastUsedAt ? formatDateShort(k.lastUsedAt) : "never"}
                </TD>
                <TD>
                  <button
                    onClick={() => onRevokeKey(k.id)}
                    className="rounded p-1 text-text-3 transition hover:bg-bg-2 hover:text-danger"
                    title="Revoke"
                  >
                    <Trash2 size={14} />
                  </button>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      ) : null}
    </Card>
  );
}
