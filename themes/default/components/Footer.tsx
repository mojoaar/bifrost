/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <div className="mx-auto max-w-3xl px-4 py-4 text-center text-sm text-[var(--text-muted)]">
        Powered by Bifröst
      </div>
    </footer>
  );
}
