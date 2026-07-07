/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { loadPluginsFromDirectory, runHook } = await import(
      "@/lib/plugins/registry"
    );

    await loadPluginsFromDirectory("./plugins");

    const { ingestAll, startWatcher } = await import("@/lib/content/watcher");
    await ingestAll(true);
    startWatcher();

    try {
      const { db } = await import("@/lib/db");
      const { loadConfig } = await import("@/lib/config/loader");
      await runHook("onServerStart", { db, loadConfig });
    } catch {
      // hooks are optional
    }
  }
}
