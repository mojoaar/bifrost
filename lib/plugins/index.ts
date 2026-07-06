/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { BifrostPlugin, PluginHooks } from "./types";

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
