/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "./token";

const PROTECTED_API_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH"]);

const WRITE_API_PATTERNS = [/^\/api\/v1\/posts/, /^\/api\/v1\/media/];

function isProtectedApiRoute(pathname: string, method: string): boolean {
  if (!PROTECTED_API_METHODS.has(method)) return false;
  return WRITE_API_PATTERNS.some((p) => p.test(pathname));
}

export async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.sub);
    response.headers.set("x-user-role", payload.role);
    return response;
  }

  if (isProtectedApiRoute(pathname, method)) {
    if (!token) {
      return NextResponse.json(
        { data: null, error: { message: "Authentication required" }, meta: null },
        { status: 401 }
      );
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { data: null, error: { message: "Invalid or expired token" }, meta: null },
        { status: 401 }
      );
    }

    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.sub);
    response.headers.set("x-user-role", payload.role);
    return response;
  }

  return NextResponse.next();
}
