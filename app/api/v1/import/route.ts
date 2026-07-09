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
import { apiSuccess, apiError } from "@/lib/api/response";
import { extractZip, contentSummary } from "@/lib/export";
import { recordAudit, getClientContext } from "@/lib/audit";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { contentDir } from "@/lib/paths";

export async function POST(request: NextRequest) {
  let auth;
  try {
    auth = await requireAdmin(request);
  } catch {
    // handled below
  }

  if (!auth) return apiError("Unauthorized", 401);

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !file.name) {
      return apiError("A ZIP file is required", 400);
    }

    if (!file.name.endsWith(".zip")) {
      return apiError("File must be a .zip archive", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const tmpPath = join(tmpdir(), `bifrost-import-${Date.now()}.zip`);
    writeFileSync(tmpPath, buffer);

    await extractZip(tmpPath, contentDir());
    unlinkSync(tmpPath);

    const summary = contentSummary();

    recordAudit({
      action: "content.import",
      status: "success",
      ...getClientContext(request, auth),
      metadata: { summary },
    });

    return apiSuccess({
      imported: true,
      summary,
      message: `Imported ${summary.posts} posts, ${summary.pages} pages, ${summary.media} media files, and ${summary.templates} templates. The content watcher will re-index all files.`,
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to import", 500);
  }
}
