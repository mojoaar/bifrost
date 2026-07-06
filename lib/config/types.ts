/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

export interface SiteConfig {
  title: string;
  description: string;
  language: string;
}

export interface ContentConfig {
  path: string;
  postsPerPage: number;
}

export interface AIProviderConfig {
  apiKey?: string;
  model: string;
}

export interface AIConfig {
  defaultProvider: string;
  providers: Record<string, AIProviderConfig>;
}

export interface GitConfig {
  enabled: boolean;
  autoCommit: boolean;
  remote: string;
}

export interface McpConfig {
  enabled: boolean;
  mode: "stdio" | "http";
  port: number;
}

export interface BifrostConfig {
  site: SiteConfig;
  theme: string;
  content: ContentConfig;
  ai: AIConfig;
  git: GitConfig;
  mcp: McpConfig;
  plugins: string[];
}
