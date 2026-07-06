/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { BifrostPlugin, PluginHooks } from "./types";
import type { Dirent } from "fs";
import fs from "fs/promises";
import path from "path";

const plugins: BifrostPlugin[] = [];

export function registerPlugin(plugin: BifrostPlugin): void {
  if (plugins.some((p) => p.name === plugin.name)) {
    throw new Error(`Plugin "${plugin.name}" is already registered`);
  }
  plugins.push(plugin);
}

export function listPlugins(): BifrostPlugin[] {
  return [...plugins];
}

type HookArgs<K extends keyof PluginHooks> = Parameters<
  NonNullable<PluginHooks[K]>
>;

type HookReturn<K extends keyof PluginHooks> = NonNullable<
  Awaited<ReturnType<NonNullable<PluginHooks[K]>>>
>;

export async function runHook<K extends keyof PluginHooks>(
  hookName: K,
  ...args: HookArgs<K>
): Promise<HookReturn<K>[]> {
  const results: HookReturn<K>[] = [];

  for (const plugin of plugins) {
    const hook = plugin.hooks[hookName] as
      | undefined
      | ((...a: unknown[]) => unknown);

    if (!hook) continue;

    const result = await hook(...args);
    if (result !== undefined) {
      results.push(result as HookReturn<K>);
    }
  }

  return results;
}

export function getPlugins(): BifrostPlugin[] {
  return plugins;
}

export async function loadPluginsFromDirectory(
  dir: string
): Promise<void> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const indexPath = path.join(dir, entry.name, "index.ts");
    let exists = false;
    try {
      await fs.access(indexPath);
      exists = true;
    } catch {
      // file doesn't exist
    }

    if (!exists) continue;

    try {
      const dynamicImport = new Function("p", "return import(p)") as (
        p: string
      ) => Promise<unknown>;
      const mod = await dynamicImport(indexPath);
      if ((mod as Record<string, unknown>).default) {
        const plugin = (mod as Record<string, unknown>).default;
        if ((plugin as Record<string, unknown>).hooks) {
          registerPlugin(plugin as BifrostPlugin);
        }
      }
    } catch (err) {
      console.error(`Failed to load plugin "${entry.name}":`, err);
    }
  }
}
