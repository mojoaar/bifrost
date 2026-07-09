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
import { renderMarkdown } from "@/lib/md/parser";
import fs from "fs";
import path from "path";

const DOCS_DIR = path.resolve("docs/bifrost");

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) return apiError("Unauthorized", 401);

  const { searchParams } = request.nextUrl;
  const file = searchParams.get("file");
  const list = searchParams.get("list");

  if (list === "true") {
    try {
      const files = fs
        .readdirSync(DOCS_DIR)
        .filter((f) => f.endsWith(".md"))
        .map((f) => ({
          slug: f.replace(/\.md$/, ""),
          title: titleFromSlug(f.replace(/\.md$/, "")),
        }));
      return apiSuccess(files);
    } catch {
      return apiSuccess([]);
    }
  }

  if (!file) {
    return apiError("file parameter is required", 400);
  }

  const safe = file.replace(/[^a-z0-9-]/g, "");
  const filePath = path.join(DOCS_DIR, `${safe}.md`);

  if (!filePath.startsWith(DOCS_DIR) || !fs.existsSync(filePath)) {
    return apiError("Document not found", 404);
  }

  try {
    const markdown = fs.readFileSync(filePath, "utf-8");
    const { html } = await renderMarkdown(markdown);
    return apiSuccess({ html });
  } catch {
    return apiError("Failed to render document", 500);
  }
}

function titleFromSlug(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
