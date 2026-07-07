/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

interface Props {
  language?: string;
  filename?: string;
  children: string;
}

export function CodeBlock({ language, filename, children }: Props) {
  const label = filename ?? language ?? "text";
  return (
    <div className="my-5 overflow-hidden rounded-md border border-code-border bg-code-bg">
      <div className="flex items-center justify-between border-b border-code-border bg-bg-1 px-3 py-1.5">
        <span className="font-mono text-xs uppercase tracking-wider text-text-3">{label}</span>
      </div>
      <pre className="!my-0 overflow-x-auto p-4 font-mono text-sm leading-relaxed text-text-1">
        <code>{children}</code>
      </pre>
    </div>
  );
}
