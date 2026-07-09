/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { Save, Plug } from "lucide-react";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Field, Input } from "@/themes/bifrost-terminal/components/ui/Input";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { Toggle } from "./Toggle";
import type { McpState } from "./types";

interface Props {
  mcp: McpState;
  setMcp: React.Dispatch<React.SetStateAction<McpState>>;
  mcpSaving: boolean;
  mcpMessage: string;
  onSave: (e: React.FormEvent) => void;
}

export function McpServerSection({ mcp, setMcp, mcpSaving, mcpMessage, onSave }: Props) {
  const sseUrl = `http://localhost:${mcp.port}/sse`;

  return (
    <form onSubmit={onSave} className="mb-6 block break-inside-avoid">
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
  );
}
