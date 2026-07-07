/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  mono?: boolean;
}

export function Tag({ children, className = "", mono = true }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-border bg-bg-1 px-2 py-0.5 text-xs text-text-2 ${mono ? "font-mono" : ""} ${className}`}
    >
      {children}
    </span>
  );
}
