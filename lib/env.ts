/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

const known = [
  "BIFROST_OPENCODE_ZEN_KEY",
  "BIFROST_OPENCODE_GO_KEY",
  "BIFROST_DEEPSEEK_KEY",
  "DATABASE_URL",
] as const;

type KnownEnv = (typeof known)[number];

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
    }
  }
}

export function env(name: KnownEnv): string | undefined;
export function env(name: KnownEnv, fallback: string): string;
export function env(name: KnownEnv, fallback?: string): string | undefined {
  return process.env[name] ?? fallback;
}
