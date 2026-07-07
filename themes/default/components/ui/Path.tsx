/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

interface Props {
  segments: string[];
}

export function Path({ segments }: Props) {
  return (
    <span className="font-mono text-sm text-text-3">
      <span className="text-text-2">~</span>
      {segments.map((seg, i) => (
        <span key={`${i}-${seg}`}>
          <span className="text-text-muted">/</span>
          <span className={i === segments.length - 1 ? "text-text-1" : ""}>{seg}</span>
        </span>
      ))}
    </span>
  );
}
