/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

export interface AiState {
  enabled: boolean;
  defaultProvider: string;
  providers: { name: string; model: string; hasKey: boolean }[];
}

export interface McpState {
  enabled: boolean;
  mode: string;
  port: number;
}
