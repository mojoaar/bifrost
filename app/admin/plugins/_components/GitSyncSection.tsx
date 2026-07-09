/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import Link from "next/link";
import { Save, GitBranch, ExternalLink } from "lucide-react";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Field, Input } from "@/themes/bifrost-terminal/components/ui/Input";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { Toggle } from "./Toggle";

interface Props {
  git: Record<string, string>;
  setGit: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  gitToken: string;
  setGitToken: (value: string) => void;
  gitTokenSet: boolean;
  gitSaving: boolean;
  gitMessage: string;
  onSave: (e: React.FormEvent) => void;
}

export function GitSyncSection({
  git,
  setGit,
  gitToken,
  setGitToken,
  gitTokenSet,
  gitSaving,
  gitMessage,
  onSave,
}: Props) {
  const gitEnabled = git["git.enabled"] !== "false";
  const setGitValue = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setGit((s) => ({ ...s, [key]: e.target.value }));

  return (
    <form onSubmit={onSave} className="mb-6 block break-inside-avoid">
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
  );
}
