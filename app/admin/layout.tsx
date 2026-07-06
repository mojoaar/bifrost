/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="w-60 border-r border-zinc-800 p-4">
        <Link href="/admin" className="mb-6 block text-lg font-bold">
          Bifröst Admin
        </Link>
        <nav className="flex flex-col gap-1">
          <Link
            href="/admin"
            className="rounded px-3 py-2 text-sm hover:bg-zinc-800"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/posts"
            className="rounded px-3 py-2 text-sm hover:bg-zinc-800"
          >
            Posts
          </Link>
          <Link
            href="/admin/media"
            className="rounded px-3 py-2 text-sm hover:bg-zinc-800"
          >
            Media
          </Link>
          <Link
            href="/admin/settings"
            className="rounded px-3 py-2 text-sm hover:bg-zinc-800"
          >
            Settings
          </Link>
          <Link
            href="/admin/git"
            className="rounded px-3 py-2 text-sm hover:bg-zinc-800"
          >
            Git
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
