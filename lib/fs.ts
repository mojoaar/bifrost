/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import realFs from "fs/promises";
import { Volume } from "memfs";

const vol = new Volume();

let current = realFs;

export const fs = new Proxy({} as typeof realFs, {
  get(_target, prop) {
    const value = (current as unknown as Record<string, unknown>)[
      prop as string
    ];
    if (typeof value === "function") {
      return (...args: unknown[]) =>
        (value as (...a: unknown[]) => unknown).apply(current, args);
    }
    return value;
  },
});

export function useMemFs(): void {
  current = vol.promises as unknown as typeof realFs;
}

export function useNodeFs(): void {
  current = realFs;
}

export function createMemFs(): Volume {
  return new Volume();
}

export function setFs(custom: typeof realFs): void {
  current = custom;
}
