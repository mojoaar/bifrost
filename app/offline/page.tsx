/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import Link from "next/link";

export const metadata = {
  title: "Offline",
};

export default function Offline() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <pre className="mb-6 text-[var(--text-muted)]">
{`    . · + ˚ * ✵
   .  ·  ◌  ·  .
  ·  +  °  ˚  ✧
   .  ◌  ·  +  .
    * ✵  ˚  ·`}
      </pre>

      <h1 className="mb-2 font-mono text-4xl font-bold tracking-tight text-text-1">
        Offline
      </h1>

      <p className="mb-1 max-w-md font-mono text-sm text-text-2">
        The bridge to this realm is frozen over.
      </p>
      <p className="mb-8 max-w-md font-mono text-xs text-text-3">
        You appear to be offline. Cached pages are still available.
      </p>

      <div className="rounded-md border border-dashed border-border bg-bg-1 p-4">
        <p className="font-mono text-sm text-text-2">
          <span className="text-danger">$</span> ping bifrost{" "}
          <span className="text-text-muted">→</span>{" "}
          <span className="text-danger">no route to host</span>
        </p>
        <div className="mt-3 flex gap-3">
          <Link
            href="/"
            className="rounded border border-border px-3 py-1 font-mono text-xs text-text-2 transition hover:border-accent hover:text-accent"
          >
            / Retry home
          </Link>
        </div>
      </div>
    </div>
  );
}
