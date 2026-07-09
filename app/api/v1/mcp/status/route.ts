/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require";
import { getSetting } from "@/lib/settings";
import { loadConfig } from "@/lib/config/loader";

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return apiError("Invalid or expired token", 401);

  const config = loadConfig();
  return apiSuccess({
    enabled: getSetting("mcp.enabled") !== "false",
    mode: config.mcp.mode,
    port: config.mcp.port,
  });
}
