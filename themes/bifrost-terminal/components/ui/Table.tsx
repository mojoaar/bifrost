/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-border bg-bg-1">{children}</thead>;
}

export function TR({ children }: { children: ReactNode }) {
  return <tr className="border-b border-border last:border-b-0 transition hover:bg-bg-1">{children}</tr>;
}

export function TH({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-text-3 ${className}`}>{children}</th>;
}

export function TD({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle text-text-1 ${className}`}>{children}</td>;
}
