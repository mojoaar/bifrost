/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { createRateLimiter } from "@/lib/mcp/rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit then blocks within the window", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000 });
    const now = 10_000;
    expect(limiter.check("1.1.1.1", now)).toBe(true);
    expect(limiter.check("1.1.1.1", now)).toBe(true);
    expect(limiter.check("1.1.1.1", now)).toBe(true);
    expect(limiter.check("1.1.1.1", now)).toBe(false);
  });

  it("resets after the window elapses", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.check("2.2.2.2", 0)).toBe(true);
    expect(limiter.check("2.2.2.2", 500)).toBe(false);
    expect(limiter.check("2.2.2.2", 1000)).toBe(true);
  });

  it("tracks separate buckets per IP", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.check("3.3.3.3", 0)).toBe(true);
    expect(limiter.check("4.4.4.4", 0)).toBe(true);
    expect(limiter.check("3.3.3.3", 0)).toBe(false);
  });
});
