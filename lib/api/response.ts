/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextResponse } from "next/server";

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  [key: string]: unknown;
}

export function apiSuccess<T>(data: T, meta?: ApiMeta, status = 200) {
  return NextResponse.json({ data, error: null, meta: meta ?? null }, { status });
}

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { data: null, error: { message, ...(details ? { details } : {}) }, meta: null },
    { status }
  );
}
