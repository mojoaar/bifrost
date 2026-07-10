/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import type { Request } from "express";
import { buildHttpContext } from "@/lib/mcp/context";

function req(h: Record<string, string> = {}): Request {
  return { headers: h } as unknown as Request;
}

describe("buildHttpContext", () => {
  it("marks api_key actor and takes first x-forwarded-for", () => {
    const ctx = buildHttpContext(
      req({
        authorization: "Bearer bfk_x",
        "x-forwarded-for": "9.9.9.9, 1.1.1.1",
        "user-agent": "UA",
      }),
      { userId: "u1", role: "admin" }
    );
    expect(ctx.actorType).toBe("api_key");
    expect(ctx.actorId).toBe("u1");
    expect(ctx.ip).toBe("9.9.9.9");
    expect(ctx.userAgent).toBe("UA");
  });

  it("marks user actor for a JWT bearer token", () => {
    const ctx = buildHttpContext(req({ authorization: "Bearer eyJ" }), {
      userId: "u2",
      role: "editor",
    });
    expect(ctx.actorType).toBe("user");
    expect(ctx.actorId).toBe("u2");
  });

  it("falls back to x-real-ip when no forwarded header", () => {
    const ctx = buildHttpContext(
      req({ authorization: "Bearer eyJ", "x-real-ip": "5.5.5.5" }),
      { userId: "u3", role: "author" }
    );
    expect(ctx.ip).toBe("5.5.5.5");
  });
});
