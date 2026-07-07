/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger";

const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover border-transparent",
  ghost: "bg-bg-1 text-text-1 hover:bg-bg-2 border-border",
  danger: "bg-danger-subtle text-danger hover:bg-danger hover:text-accent-fg border-transparent",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = "primary", className = "", children, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
