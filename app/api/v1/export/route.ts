/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require";
import { apiError } from "@/lib/api/response";
import { createExportZip } from "@/lib/export";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch {
    return apiError("Unauthorized", 401);
  }

  const zip = createExportZip();
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
      "content-disposition": `attachment; filename="bifrost-export-${new Date().toISOString().slice(0, 10)}.zip"`,
    },
  });
}
