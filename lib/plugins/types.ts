/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { ParsedMarkdown } from "@/lib/md/types";

export type { ParsedMarkdown };

export interface PluginContext {
  db: typeof import("@/lib/db").db;
  loadConfig: typeof import("@/lib/config/loader").loadConfig;
}

export interface PluginHooks {
  onContentParse?(parsed: ParsedMarkdown, context: PluginContext): ParsedMarkdown | Promise<ParsedMarkdown>;
  onContentRender?(html: string, context: PluginContext): string | Promise<string>;
  onContentPublish?(slug: string, context: PluginContext): void | Promise<void>;
  onServerStart?(context: PluginContext): void | Promise<void>;
  adminWidget?(): { component: React.ComponentType; position: "sidebar" | "main"; label: string };
}

export interface BifrostPlugin {
  name: string;
  hooks: PluginHooks;
}
