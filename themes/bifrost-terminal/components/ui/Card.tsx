/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";

type Padding = "sm" | "md" | "lg";

const PADDING: Record<Padding, string> = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

interface Props {
  children: ReactNode;
  padding?: Padding;
  className?: string;
}

export function Card({ children, padding = "md", className = "" }: Props) {
  return (
    <div className={`rounded-md border border-border bg-surface ${PADDING[padding]} ${className}`}>
      {children}
    </div>
  );
}
