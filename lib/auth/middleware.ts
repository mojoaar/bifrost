/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, verifyRefreshToken } from "./token";
import { REFRESH_COOKIE_NAME } from "./constants";

const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer-when-downgrade",
  "x-frame-options": "DENY",
  "strict-transport-security": "max-age=63072000; includeSubDomains",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "content-security-policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

function withSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

const PROTECTED_API_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH"]);

const WRITE_API_PATTERNS = [
  /^\/api\/v1\/posts/,
  /^\/api\/v1\/pages/,
  /^\/api\/v1\/media/,
  /^\/api\/v1\/ai\//,
  /^\/api\/v1\/users/,
  /^\/api\/v1\/tags/,
  /^\/api\/v1\/settings/,
  /^\/api\/v1\/git\//,
  /^\/api\/v1\/profile/,
  /^\/api\/v1\/api-keys/,
  /^\/api\/v1\/admin\//,
  /^\/api\/v1\/themes\/files/,
  /^\/api\/v1\/import/,
  /^\/api\/v1\/profile\/mfa/,
  /^\/api\/v1\/auth\/mfa/,
  /^\/api\/v1\/users\/.*\/mfa/,
  /^\/api\/v1\/post-templates/,
  /^\/api\/v1\/docs/,
];

function isProtectedApiRoute(pathname: string, method: string): boolean {
  if (!PROTECTED_API_METHODS.has(method)) return false;
  return WRITE_API_PATTERNS.some((p) => p.test(pathname));
}

async function getTokenPayload(
  request: NextRequest
): Promise<{ sub: string; role: string } | null> {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (bearerToken) {
    const payload = await verifyAccessToken(bearerToken);
    if (payload) return payload;
    // token was provided but invalid — don't fall back to cookie
    return null;
  }

  const refreshCookie = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (refreshCookie) {
    const payload = await verifyRefreshToken(refreshCookie);
    if (payload) return payload;
  }

  return null;
}

async function getTokenPayloadForApi(
  request: NextRequest
): Promise<
  | { sub: string; role: string }
  | { type: "no-token" }
  | { type: "invalid-token" }
  | { type: "api-key" }
> {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (bearerToken) {
    // API keys are verified in the route handler (needs DB access, not
    // available in the edge middleware runtime). Let them pass through.
    if (bearerToken.startsWith("bfk_")) return { type: "api-key" };
    const payload = await verifyAccessToken(bearerToken);
    if (payload) return payload;
    return { type: "invalid-token" };
  }

  const refreshCookie = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (refreshCookie) {
    const payload = await verifyRefreshToken(refreshCookie);
    if (payload) return payload;
  }

  return { type: "no-token" };
}

export async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  if (pathname.startsWith("/admin")) {
    const payload = await getTokenPayload(request);
    if (!payload) {
      return withSecurityHeaders(NextResponse.redirect(new URL("/login", request.url)));
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.sub);
    requestHeaders.set("x-user-role", payload.role);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("x-user-id", payload.sub);
    response.headers.set("x-user-role", payload.role);
    return withSecurityHeaders(response);
  }

  if (isProtectedApiRoute(pathname, method)) {
    const result = await getTokenPayloadForApi(request);

    if ("type" in result && result.type === "api-key") {
      return withSecurityHeaders(NextResponse.next());
    }

    if (!("sub" in result)) {
      const message =
        result.type === "invalid-token"
          ? "Invalid or expired token"
          : "Authentication required";
      return withSecurityHeaders(
        NextResponse.json(
          { data: null, error: { message }, meta: null },
          { status: 401 }
        )
      );
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", result.sub);
    requestHeaders.set("x-user-role", result.role);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("x-user-id", result.sub);
    response.headers.set("x-user-role", result.role);
    return withSecurityHeaders(response);
  }

  return withSecurityHeaders(NextResponse.next());
}
