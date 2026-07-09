/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function defaultLevel(): LogLevel {
  const env = process.env.BIFROST_LOG_LEVEL?.toLowerCase();
  if (env && env in LEVELS) return env as LogLevel;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function jsonMode(): boolean {
  return process.env.BIFROST_LOG_FORMAT?.toLowerCase() === "json";
}

const CONSOLE: Record<LogLevel, (...args: unknown[]) => void> = {
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

function emit(level: LogLevel, scope: string, args: unknown[]): void {
  if (LEVELS[level] < LEVELS[defaultLevel()]) return;

  if (jsonMode()) {
    const [first, ...rest] = args;
    const msg = typeof first === "string" ? first : "";
    const entry: Record<string, unknown> = {
      ts: new Date().toISOString(),
      level,
      scope,
      msg,
    };
    const extra = typeof first === "string" ? rest : args;
    if (extra.length > 0) entry.detail = extra.length === 1 ? extra[0] : extra;
    CONSOLE[level](JSON.stringify(entry, jsonReplacer));
    return;
  }

  CONSOLE[level](`[${scope}]`, ...args);
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function createLogger(scope: string): Logger {
  return {
    debug: (...args) => emit("debug", scope, args),
    info: (...args) => emit("info", scope, args),
    warn: (...args) => emit("warn", scope, args),
    error: (...args) => emit("error", scope, args),
  };
}

export const logger = createLogger("bifrost");
