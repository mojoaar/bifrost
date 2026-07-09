/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { McpTool } from "./shared";
import { postTools } from "./posts";
import { pageTools } from "./pages";
import { systemTools } from "./system";

export type { McpTool, ToolDef, ToolHandler } from "./shared";

export function createToolDefinitions(): McpTool[] {
  return [...postTools, ...systemTools, ...pageTools];
}
