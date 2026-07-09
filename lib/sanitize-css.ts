/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

const DANGEROUS_PATTERNS: RegExp[] = [
  /<\/?[a-z]/i,
  /javascript:/i,
  /vbscript:/i,
  /expression\s*\(/i,
  /-moz-binding/i,
  /behavior\s*:/i,
  /@import/i,
];

export function sanitizeCustomCss(css: string): string {
  if (!css) return "";
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(css)) return "";
  }
  return css;
}
