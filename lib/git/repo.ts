/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import fs from "fs";
import path from "path";
import { loadConfig } from "@/lib/config/loader";
import { getSetting } from "@/lib/settings";
import { contentDir } from "@/lib/paths";

function DIR(): string {
  return contentDir();
}

export interface CommitEntry {
  sha: string;
  message: string;
  date: string;
  author: string;
}

interface GitRuntimeConfig {
  enabled: boolean;
  autoCommit: boolean;
  remote: string;
  branch: string;
  token: string;
  historyLimit: number;
}

function loadGitConfig(): GitRuntimeConfig {
  const file = loadConfig().git;
  return {
    enabled:
      getSetting("git.enabled") === "true" ||
      (getSetting("git.enabled") === undefined && file.enabled),
    autoCommit: getSetting("git.autoCommit") === "true" || (getSetting("git.autoCommit") === undefined && file.autoCommit),
    remote: getSetting("git.remote") ?? file.remote,
    branch: getSetting("git.branch") ?? "main",
    token: getSetting("git.token") ?? process.env.BIFROST_GIT_TOKEN ?? "",
    historyLimit: Number(getSetting("git.history_limit")) || 50,
  };
}

export async function initContentRepo(): Promise<void> {
  const gitDir = path.join(DIR(), ".git");
  if (fs.existsSync(gitDir)) return;

  await git.init({ fs, dir: DIR(), defaultBranch: "main" });
}

export async function commitPost(
  slug: string,
  title: string,
  action: "create" | "update" = "update"
): Promise<string | null> {
  const config = loadGitConfig();
  if (!config.enabled) return null;

  await initContentRepo();

  const filePath = `${slug}/index.md`;
  const absPath = path.join(DIR(), filePath);

  if (!fs.existsSync(absPath)) return null;

  await git.add({ fs, dir: DIR(), filepath: filePath });

  const status = await git.statusMatrix({
    fs,
    dir: DIR(),
    filepaths: [filePath],
  });
  const hasChanges = status.some(([, , staging]) => staging !== 1);

  if (!hasChanges) return null;

  const message = config.autoCommit
    ? `${action}: ${title}`
    : `Manual ${action}: ${title}`;

  const sha = await git.commit({
    fs,
    dir: DIR(),
    message,
    author: { name: "Bifröst", email: "bifrost@localhost" },
  });

  return sha;
}

export async function getHistory(slug?: string, limit?: number): Promise<CommitEntry[]> {
  await initContentRepo();

  const config = loadGitConfig();
  const depth = limit ?? config.historyLimit;

  const filepath = slug || undefined;

  const log = await git.log({
    fs,
    dir: DIR(),
    filepath,
    depth,
  });

  return log.map((entry) => ({
    sha: entry.oid,
    message: entry.commit.message,
    date: new Date(entry.commit.committer.timestamp * 1000).toISOString(),
    author: entry.commit.committer.name,
  }));
}

export async function getDiff(sha: string): Promise<string> {
  await initContentRepo();

  const commits = await git.log({ fs, dir: DIR(), depth: 50 });
  const commitIndex = commits.findIndex(
    (c) => c.oid === sha || c.oid.startsWith(sha)
  );
  const targetCommit = commits[commitIndex];
  if (!targetCommit) return "";

  const parent = commits[commitIndex + 1];

  if (!parent) {
    const oldOid = "4b825dc642cb6eb9a060e54bf899d46dec8b5e00";
    return diffBetweenOids(oldOid, sha);
  }

  return diffBetweenOids(parent.oid, sha);
}

async function diffBetweenOids(
  oldOid: string,
  newOid: string
): Promise<string> {
  const oldFiles = await git.listFiles({ fs, dir: DIR(), ref: oldOid });
  const newFiles = await git.listFiles({ fs, dir: DIR(), ref: newOid });
  const allFiles = [...new Set([...oldFiles, ...newFiles])];

  const diffs: string[] = [];

  for (const file of allFiles) {
    try {
      let oldContent = "";
      if (oldFiles.includes(file)) {
        try {
          const result = await git.readBlob({
            fs,
            dir: DIR(),
            oid: oldOid,
            filepath: file,
          });
          oldContent = new TextDecoder().decode(result.blob);
        } catch {
          oldContent = "";
        }
      }

      let newContent = "";
      if (newFiles.includes(file)) {
        try {
          const result = await git.readBlob({
            fs,
            dir: DIR(),
            oid: newOid,
            filepath: file,
          });
          newContent = new TextDecoder().decode(result.blob);
        } catch {
          newContent = "";
        }
      }

      diffs.push(
        `diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n`
      );
      diffs.push(
        `- ${oldContent.replace(/\n/g, "\n- ")}\n+ ${newContent.replace(/\n/g, "\n+ ")}\n`
      );
    } catch {
      diffs.push(`[Binary or missing: ${file}]\n`);
    }
  }

  return diffs.join("\n");
}

export async function pushToRemote(): Promise<void> {
  const config = loadGitConfig();
  if (!config.remote) return;

  await git.push({
    fs,
    http,
    dir: DIR(),
    remote: "origin",
    ref: config.branch,
    onAuth: () => ({
      username: config.remote.includes("github.com") ? "git" : "",
      password: config.token,
    }),
  });
}

export async function pullFromRemote(): Promise<void> {
  const config = loadGitConfig();
  if (!config.remote) return;

  await git.pull({
    fs,
    http,
    dir: DIR(),
    remote: "origin",
    ref: config.branch,
    singleBranch: true,
    author: { name: "Bifröst", email: "bifrost@localhost" },
    onAuth: () => ({
      username: config.remote.includes("github.com") ? "git" : "",
      password: config.token,
    }),
  });
}
