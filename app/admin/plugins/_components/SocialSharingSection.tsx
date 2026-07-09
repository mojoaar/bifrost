/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { Save, Share2 } from "lucide-react";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { SHARE_NETWORKS } from "@/lib/sharing";
import { Toggle } from "./Toggle";

interface Props {
  sharing: { enabled: boolean; networks: string[] };
  setSharing: React.Dispatch<React.SetStateAction<{ enabled: boolean; networks: string[] }>>;
  sharingSaving: boolean;
  sharingMessage: string;
  toggleNetwork: (key: string) => void;
  onSave: (e: React.FormEvent) => void;
}

export function SocialSharingSection({
  sharing,
  setSharing,
  sharingSaving,
  sharingMessage,
  toggleNetwork,
  onSave,
}: Props) {
  return (
    <form onSubmit={onSave} className="mb-6 block break-inside-avoid">
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
  );
}
