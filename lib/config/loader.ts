/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { BifrostConfig } from "./types";
import { defaults } from "./defaults";

function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sv = source[key];
    const tv = target[key];
    if (sv !== undefined && tv !== null && typeof sv === "object" && typeof tv === "object" && !Array.isArray(sv)) {
      result[key] = deepMerge(
        tv as Record<string, unknown>,
        sv as Record<string, unknown>
      ) as T[keyof T];
    } else {
      result[key] = sv as T[keyof T];
    }
  }

  return result;
}

let cachedConfig: BifrostConfig | null = null;

export function loadConfig(): BifrostConfig {
  if (cachedConfig) return cachedConfig;

  try {
    const userConfig = require("../../bifrost.config").default;
    cachedConfig = deepMerge(
      defaults as unknown as Record<string, unknown>,
      userConfig as unknown as Partial<Record<string, unknown>>
    ) as unknown as BifrostConfig;
  } catch {
    cachedConfig = { ...defaults };
  }

  return cachedConfig!;
}

export function defineConfig(
  config: Partial<BifrostConfig>
): Partial<BifrostConfig> {
  return config;
}
