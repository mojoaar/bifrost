/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextResponse } from "next/server";
import { generateOpenApiSpec } from "@/lib/api/openapi";

// This endpoint intentionally returns a raw OpenAPI 3 document rather than the
// { data, error, meta } envelope: it is consumed directly by Swagger UI and the
// API Explorer, which require a spec-compliant document. Like sitemap.xml,
// robots.ts, and manifest.webmanifest, it serves a standardized format.
export async function GET() {
  return NextResponse.json(generateOpenApiSpec());
}
