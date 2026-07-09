/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { generateOpenApiSpec } from "@/lib/api/openapi";

const API_DIR = path.resolve("app/api/v1");

const EXCLUDED = new Set(["/openapi.json"]);

function discoverRoutePaths(dir: string, base = ""): string[] {
  const paths: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const segment = entry.name.replace(/^\[(\.\.\.)?(.+)\]$/, "{$2}");
      paths.push(...discoverRoutePaths(path.join(dir, entry.name), `${base}/${segment}`));
    } else if (entry.name === "route.ts") {
      paths.push(base || "/");
    }
  }
  return paths;
}

describe("openapi spec", () => {
  const spec = generateOpenApiSpec();
  const specPaths = new Set(Object.keys(spec.paths));
  const routePaths = discoverRoutePaths(API_DIR).filter((p) => !EXCLUDED.has(p));

  it("documents every on-disk API route", () => {
    const missing = routePaths.filter((p) => !specPaths.has(p));
    expect(missing).toEqual([]);
  });

  it("has no spec paths without a matching route", () => {
    const routeSet = new Set(routePaths);
    const orphans = [...specPaths].filter((p) => !routeSet.has(p));
    expect(orphans).toEqual([]);
  });

  it("references only defined component schemas", () => {
    const defined = new Set(
      Object.keys((spec.components.schemas ?? {}) as Record<string, unknown>)
    );
    const json = JSON.stringify(spec);
    const refs = [...json.matchAll(/#\/components\/schemas\/(\w+)/g)].map((m) => m[1]!);
    const undefinedRefs = refs.filter((r) => !defined.has(r));
    expect(undefinedRefs).toEqual([]);
  });
});
