/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

export interface FeatureModule {
  id: "git-sync" | "ai-assist" | "mcp" | "social-sharing";
  name: string;
  description: string;
  enabledKey: string;
  enabledDefault: boolean;
  navHref?: string;
  docsHref?: string;
}

export const MODULES: FeatureModule[] = [
  {
    id: "git-sync",
    name: "Git Sync",
    description:
      "Version every post in a Git repository and optionally push to a remote. Auto-commits on save.",
    enabledKey: "git.enabled",
    enabledDefault: true,
    navHref: "/admin/git",
  },
  {
    id: "ai-assist",
    name: "AI Assistant",
    description:
      "Draft, rewrite, and brainstorm inside the editor using your configured AI provider.",
    enabledKey: "ai.enabled",
    enabledDefault: false,
  },
  {
    id: "mcp",
    name: "MCP Server",
    description:
      "Expose your blog to AI agents over the Model Context Protocol so they can read and manage content.",
    enabledKey: "mcp.enabled",
    enabledDefault: true,
  },
  {
    id: "social-sharing",
    name: "Social Sharing",
    description:
      "Add share buttons to your posts for Bluesky, Facebook, Reddit, LinkedIn, and Email.",
    enabledKey: "sharing.enabled",
    enabledDefault: false,
  },
];

export function moduleEnabled(
  module: FeatureModule,
  value: string | undefined
): boolean {
  if (value === undefined) return module.enabledDefault;
  return value !== "false";
}
