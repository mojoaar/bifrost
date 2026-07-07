/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { listThemes } from "@/lib/themes/registry";

export default async function ThemesPage() {
  const themes = await listThemes();

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Themes</h2>

      {themes.length === 0 ? (
        <p className="text-zinc-400">No themes installed.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {themes.map((theme) => (
            <div
              key={theme.manifest.name}
              className="rounded border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{theme.manifest.name}</h3>
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-900">
                  Active
                </span>
              </div>
              <p className="mb-1 text-xs text-zinc-500">
                v{theme.manifest.version} by {theme.manifest.author}
              </p>
              <p className="text-sm text-zinc-400">{theme.manifest.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
