/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

function req(ip: string): Request {
  return new Request("https://example.com/api/v1/x", {
    headers: { "x-real-ip": ip },
  });
}

describe("rateLimit", () => {
  it("allows requests up to the limit then blocks with 429", () => {
    const key = "test:burst";
    expect(rateLimit(req("1.1.1.1"), key, 3, 60000)).toBeNull();
    expect(rateLimit(req("1.1.1.1"), key, 3, 60000)).toBeNull();
    expect(rateLimit(req("1.1.1.1"), key, 3, 60000)).toBeNull();
    const blocked = rateLimit(req("1.1.1.1"), key, 3, 60000);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
  });

  it("isolates limits per IP", () => {
    const key = "test:per-ip";
    expect(rateLimit(req("2.2.2.2"), key, 1, 60000)).toBeNull();
    expect(rateLimit(req("2.2.2.2"), key, 1, 60000)).not.toBeNull();
    expect(rateLimit(req("3.3.3.3"), key, 1, 60000)).toBeNull();
  });

  it("isolates limits per key", () => {
    expect(rateLimit(req("4.4.4.4"), "test:key-a", 1, 60000)).toBeNull();
    expect(rateLimit(req("4.4.4.4"), "test:key-a", 1, 60000)).not.toBeNull();
    expect(rateLimit(req("4.4.4.4"), "test:key-b", 1, 60000)).toBeNull();
  });

  it("resets after the window elapses", () => {
    const key = "test:window";
    expect(rateLimit(req("5.5.5.5"), key, 1, 1)).toBeNull();
    const start = Date.now();
    while (Date.now() - start < 5) {
      // busy-wait past the 1ms window
    }
    expect(rateLimit(req("5.5.5.5"), key, 1, 1)).toBeNull();
  });
});
