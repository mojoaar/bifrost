/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Input } from "@/themes/bifrost-terminal/components/ui/Input";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";

interface Props {
  resetOpen: boolean;
  resetConfirm: string;
  resetting: boolean;
  resetMessage: string;
  setResetOpen: (open: boolean) => void;
  setResetConfirm: (value: string) => void;
  setResetMessage: (value: string) => void;
  onReset: () => void;
}

export function DangerZoneSection({
  resetOpen,
  resetConfirm,
  resetting,
  resetMessage,
  setResetOpen,
  setResetConfirm,
  setResetMessage,
  onReset,
}: Props) {
  return (
    <Card padding="md" className="border-danger/40">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle size={14} className="text-danger" />
        <span className="font-mono text-xs uppercase tracking-wider text-danger">
          Danger Zone
        </span>
      </div>
      <p className="mb-4 text-sm text-text-2">
        Remove the demo posts that ship with Bifröst. Your own posts, media,
        tags, and Git history are left untouched.
      </p>

      {!resetOpen ? (
        <Button
          variant="danger"
          onClick={() => setResetOpen(true)}
          type="button"
        >
          <Trash2 size={14} />
          <span>Remove demo data</span>
        </Button>
      ) : (
        <div className="space-y-3 rounded-md border border-danger/30 bg-danger/5 p-3">
          <p className="font-mono text-xs text-text-2">
            <span className="text-danger">$</span> Type{" "}
            <span className="rounded bg-bg-0 px-1.5 py-0.5 font-semibold text-danger">
              RESET
            </span>{" "}
            to confirm. This cannot be undone.
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder="RESET"
              className="font-mono"
              autoComplete="off"
              autoFocus
            />
            <Button
              variant="danger"
              type="button"
              onClick={onReset}
              disabled={resetting || resetConfirm !== "RESET"}
            >
              <Trash2 size={14} />
              <span>{resetting ? "Resetting..." : "Confirm"}</span>
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setResetOpen(false);
                setResetConfirm("");
                setResetMessage("");
              }}
              disabled={resetting}
            >
              cancel
            </Button>
          </div>
          {resetMessage && (
            <p className={`font-mono text-xs ${resetMessage.includes("removed") ? "text-success" : "text-danger"}`}>
              {resetMessage}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
