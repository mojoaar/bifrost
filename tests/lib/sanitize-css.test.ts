/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { sanitizeCustomCss } from "@/lib/sanitize-css";

describe("sanitizeCustomCss", () => {
  it("passes through benign CSS unchanged", () => {
    const css = ":root { --accent: #89dceb; } body { color: var(--accent); }";
    expect(sanitizeCustomCss(css)).toBe(css);
  });

  it("allows data: URLs for fonts and images", () => {
    const css = "@font-face { src: url(data:font/woff2;base64,AAAA); }";
    expect(sanitizeCustomCss(css)).toBe(css);
  });

  it("rejects embedded HTML tags", () => {
    expect(sanitizeCustomCss("</style><script>alert(1)</script>")).toBe("");
  });

  it("rejects javascript: urls", () => {
    expect(sanitizeCustomCss("body { background: url(javascript:alert(1)); }")).toBe("");
  });

  it("rejects expression()", () => {
    expect(sanitizeCustomCss("width: expression(alert(1));")).toBe("");
  });

  it("rejects -moz-binding", () => {
    expect(sanitizeCustomCss("body { -moz-binding: url(evil.xml); }")).toBe("");
  });

  it("rejects behavior:", () => {
    expect(sanitizeCustomCss("body { behavior: url(evil.htc); }")).toBe("");
  });

  it("rejects @import", () => {
    expect(sanitizeCustomCss("@import url(evil.css);")).toBe("");
  });
});
