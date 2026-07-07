/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

type Status = "draft" | "published";

const STYLES: Record<Status, string> = {
  draft: "border-warning-subtle bg-warning-subtle text-warning",
  published: "border-success-subtle bg-success-subtle text-success",
};

export function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-xs uppercase tracking-wider ${STYLES[status]}`}
    >
      <span className={`size-1.5 rounded-full ${status === "published" ? "bg-success" : "bg-warning"}`} />
      {status}
    </span>
  );
}
