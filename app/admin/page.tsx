/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useEffect, useState } from "react";

interface AdminWidget {
  component: React.ComponentType;
  position: "sidebar" | "main";
  label: string;
}

export default function AdminDashboard() {
  const [widgets, setWidgets] = useState<AdminWidget[]>([]);

  useEffect(() => {
    async function load() {
      const { listPlugins } = await import("@/lib/plugins/registry");
      const plugins = listPlugins();
      const found: AdminWidget[] = [];
      for (const p of plugins) {
        if (p.hooks.adminWidget) {
          const w = p.hooks.adminWidget();
          if (w) found.push(w);
        }
      }
      setWidgets(found);
    }
    load();
  }, []);

  const mainWidgets = widgets.filter((w) => w.position === "main");
  const sidebarWidgets = widgets.filter((w) => w.position === "sidebar");

  return (
    <div>
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <p className="mt-2 text-zinc-400">Welcome to the Bifröst admin panel.</p>

      {mainWidgets.length > 0 && (
        <div className="mt-6 space-y-4">
          {mainWidgets.map((w) => (
            <div key={w.label} className="rounded border border-zinc-800 p-4">
              <h3 className="mb-2 text-sm font-medium text-zinc-400">{w.label}</h3>
              <w.component />
            </div>
          ))}
        </div>
      )}

      {sidebarWidgets.length > 0 && (
        <div className="mt-6 space-y-4">
          {sidebarWidgets.map((w) => (
            <div key={w.label} className="rounded border border-zinc-800 p-4">
              <h3 className="mb-2 text-sm font-medium text-zinc-400">{w.label}</h3>
              <w.component />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
