/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { NextRequest } from "next/server";

export function validateCsrf(request: NextRequest): boolean {
  const host = request.headers.get("host") ?? "";
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin) {
    try {
      if (new URL(origin).host === host) return true;
    } catch {
      // invalid origin — reject
    }
  }

  if (referer) {
    try {
      if (new URL(referer).host === host) return true;
    } catch {
      // invalid referer — reject
    }
  }

  return false;
}
