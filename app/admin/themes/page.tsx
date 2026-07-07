/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { listThemes } from "@/lib/themes/registry";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";

export default async function ThemesPage() {
  const themes = await listThemes();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Themes</h1>
        <p className="mt-1 font-mono text-sm text-text-3">
          <span className="text-text-muted">$</span> ls themes/
        </p>
      </div>

      {themes.length === 0 ? (
        <Card padding="lg">
          <p className="text-center font-mono text-sm text-text-3">no themes installed</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-[repeat(auto-fill,minmax(20rem,1fr))]">
          {themes.map((theme) => (
            <Card key={theme.manifest.name} padding="md">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-mono text-base font-semibold text-text-1">
                  {theme.manifest.name}
                </h3>
                <span className="rounded border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-xs uppercase tracking-wider text-accent">
                  active
                </span>
              </div>
              <p className="mb-2 font-mono text-xs text-text-3">
                v{theme.manifest.version} · {theme.manifest.author}
              </p>
              <p className="text-sm text-text-2">{theme.manifest.description}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
