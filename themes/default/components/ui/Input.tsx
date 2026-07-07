/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { InputHTMLAttributes, ReactNode } from "react";

interface FieldProps {
  label: string;
  htmlFor?: string;
  helper?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, helper, children }: FieldProps) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-3">{label}</span>
      {children}
      {helper && <span className="mt-1 block text-xs text-text-3">{helper}</span>}
    </label>
  );
}

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={`w-full rounded-md border border-border bg-bg-1 px-3 py-2 text-sm text-text-1 transition placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 ${className}`}
    />
  );
}

export function Select({ className = "", ...rest }: InputHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={`w-full rounded-md border border-border bg-bg-1 px-3 py-2 text-sm text-text-1 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 ${className}`}
    />
  );
}
