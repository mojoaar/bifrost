/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { BifrostConfig } from "./types";

export const defaults: BifrostConfig = {
  site: {
    title: "My Blog",
    description: "A blog powered by Bifröst",
    language: "en",
  },
  theme: "default",
  content: {
    path: "./content",
    postsPerPage: 10,
  },
  ai: {
    defaultProvider: "opencode-zen",
    providers: {
      "opencode-zen": { model: "deepseek-v4-pro" },
      "opencode-go": { model: "deepseek-v4-flash" },
      deepseek: { model: "deepseek-chat" },
    },
  },
  git: {
    enabled: true,
    autoCommit: true,
    remote: "",
  },
  mcp: {
    enabled: true,
    mode: "stdio",
    port: 3456,
  },
  plugins: [],
};
