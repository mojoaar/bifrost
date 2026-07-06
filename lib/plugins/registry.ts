/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { registerPlugin } from "./index";
import type { BifrostPlugin } from "./types";

export { registerPlugin, listPlugins, runHook, getPlugins } from "./index";

export async function loadPluginsFromDirectory(
  dir: string
): Promise<void> {
  const { default: fs } = await import("fs/promises");
  const { default: path } = await import("path");

  let entries: { isDirectory(): boolean; name: string }[];
  try {
    entries = (await fs.readdir(dir, { withFileTypes: true })) as unknown as {
      isDirectory(): boolean;
      name: string;
    }[];
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
