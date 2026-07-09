/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { validateCsrf } from "@/lib/auth/csrf";

function req(headers: Record<string, string>): NextRequest {
  return new NextRequest("https://example.com/api/v1/x", { headers });
}

describe("validateCsrf", () => {
  it("accepts a same-origin Origin header", () => {
    expect(validateCsrf(req({ host: "example.com", origin: "https://example.com" }))).toBe(true);
  });

  it("accepts a same-origin Referer header when Origin is absent", () => {
    expect(validateCsrf(req({ host: "example.com", referer: "https://example.com/admin" }))).toBe(true);
  });

  it("rejects a cross-origin Origin", () => {
    expect(validateCsrf(req({ host: "example.com", origin: "https://evil.com" }))).toBe(false);
  });

  it("rejects when neither Origin nor Referer is present", () => {
    expect(validateCsrf(req({ host: "example.com" }))).toBe(false);
  });

  it("rejects a malformed Origin", () => {
    expect(validateCsrf(req({ host: "example.com", origin: "not-a-url" }))).toBe(false);
  });
});
