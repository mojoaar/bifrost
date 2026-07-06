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
import { authMiddleware } from "@/lib/auth/middleware";
import { createAccessToken } from "@/lib/auth/token";

function buildRequest(
  pathname: string,
  options?: { method?: string; token?: string }
): NextRequest {
  const url = `http://localhost:3000${pathname}`;
  const headers: HeadersInit = options?.token
    ? { authorization: `Bearer ${options.token}` }
    : {};
  return new NextRequest(url, {
    method: options?.method ?? "GET",
    headers,
  });
}

describe("isProtectedApiRoute (via authMiddleware)", () => {
  it("POST /api/v1/posts without token returns 401", async () => {
    const req = buildRequest("/api/v1/posts", { method: "POST" });
    const res = await authMiddleware(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.message).toBe("Authentication required");
  });

  it("POST /api/v1/media without token returns 401", async () => {
    const req = buildRequest("/api/v1/media", { method: "POST" });
    const res = await authMiddleware(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/posts without token returns 200 (pass-through)", async () => {
    const req = buildRequest("/api/v1/posts", { method: "GET" });
    const res = await authMiddleware(req);
    expect(res.status).toBe(200);
  });

  it("PUT /api/v1/posts without token returns 401", async () => {
    const req = buildRequest("/api/v1/posts", { method: "PUT" });
    const res = await authMiddleware(req);
    expect(res.status).toBe(401);
  });

  it("DELETE /api/v1/posts without token returns 401", async () => {
    const req = buildRequest("/api/v1/posts", { method: "DELETE" });
    const res = await authMiddleware(req);
    expect(res.status).toBe(401);
  });

  it("PATCH /api/v1/posts without token returns 401", async () => {
    const req = buildRequest("/api/v1/posts", { method: "PATCH" });
    const res = await authMiddleware(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/posts/123 without token returns 200 (pass-through)", async () => {
    const req = buildRequest("/api/v1/posts/123", { method: "GET" });
    const res = await authMiddleware(req);
    expect(res.status).toBe(200);
  });

  it("POST to non-protected API path without token returns 200", async () => {
    const req = buildRequest("/api/v1/comments", { method: "POST" });
    const res = await authMiddleware(req);
    expect(res.status).toBe(200);
  });
});

describe("admin redirects", () => {
  it("GET /admin/dashboard without token redirects to /admin/login", async () => {
    const req = buildRequest("/admin/dashboard");
    const res = await authMiddleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/admin/login"
    );
  });

  it("GET /admin/login without token returns 200 (pass-through)", async () => {
    const req = buildRequest("/admin/login");
    const res = await authMiddleware(req);
    expect(res.status).toBe(200);
  });

  it("GET /admin/posts without token redirects to /admin/login", async () => {
    const req = buildRequest("/admin/posts");
    const res = await authMiddleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/admin/login"
    );
  });
});

describe("valid token", () => {
  it("passes through API route with valid token and sets headers", async () => {
    const token = await createAccessToken({ sub: "user-1", role: "admin" });
    const req = buildRequest("/api/v1/posts", {
      method: "POST",
      token,
    });
    const res = await authMiddleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-user-id")).toBe("user-1");
    expect(res.headers.get("x-user-role")).toBe("admin");
  });

  it("passes through admin route with valid token and sets headers", async () => {
    const token = await createAccessToken({ sub: "user-1", role: "admin" });
    const req = buildRequest("/admin/dashboard", { token });
    const res = await authMiddleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-user-id")).toBe("user-1");
    expect(res.headers.get("x-user-role")).toBe("admin");
  });
});

describe("invalid/expired token", () => {
  it("returns 401 for API route with expired token", async () => {
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(
      "bifrost-dev-access-secret-change-me"
    );
    const expired = await new SignJWT({ sub: "x", role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("0s")
      .sign(secret);

    const req = buildRequest("/api/v1/posts", {
      method: "POST",
      token: expired,
    });
    const res = await authMiddleware(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.message).toBe("Invalid or expired token");
  });

  it("returns 401 for API route with tampered token", async () => {
    const token = await createAccessToken({ sub: "user-1", role: "admin" });
    const tampered = token.slice(0, -5) + "xxxxx";

    const req = buildRequest("/api/v1/posts", {
      method: "POST",
      token: tampered,
    });
    const res = await authMiddleware(req);
    expect(res.status).toBe(401);
  });

  it("redirects for admin route with expired token", async () => {
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(
      "bifrost-dev-access-secret-change-me"
    );
    const expired = await new SignJWT({ sub: "x", role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("0s")
      .sign(secret);

    const req = buildRequest("/admin/dashboard", { token: expired });
    const res = await authMiddleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/admin/login"
    );
  });

  it("returns 401 for API route with invalid Bearer format", async () => {
    const url = "http://localhost:3000/api/v1/posts";
    const headers = new Headers({ authorization: "NotBearer junk" });
    const req = new NextRequest(url, { method: "POST", headers });
    const res = await authMiddleware(req);
    expect(res.status).toBe(401);
  });
});

describe("pass-through for non-matched routes", () => {
  it("GET / returns 200", async () => {
    const req = buildRequest("/");
    const res = await authMiddleware(req);
    expect(res.status).toBe(200);
  });

  it("POST /api/v2/posts returns 200 (not a v1 route)", async () => {
    const req = buildRequest("/api/v2/posts", { method: "POST" });
    const res = await authMiddleware(req);
    expect(res.status).toBe(200);
  });
});
