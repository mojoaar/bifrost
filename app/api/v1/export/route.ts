/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { nowISO } from "@/lib/time";

import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require";
import { apiError } from "@/lib/api/response";
import { createExportZip } from "@/lib/export";
import { recordAudit, getClientContext } from "@/lib/audit";

export async function GET(request: NextRequest) {
  let auth;
  try {
    auth = await requireAdmin(request);
  } catch {
    // handled below
  }

  if (!auth) return apiError("Unauthorized", 401);

  const zip = createExportZip();

  recordAudit({
    action: "content.export",
    status: "success",
    ...getClientContext(request, auth),
  });

  const readable = new ReadableStream({
    start(controller) {
      zip.on("data", (chunk) => controller.enqueue(chunk as Uint8Array));
      zip.on("end", () => controller.close());
      zip.on("error", (err) => controller.error(err as Error));
    },
  });

  return new Response(readable, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="bifrost-export-${nowISO().slice(0, 10)}.zip"`,
    },
  });
}
