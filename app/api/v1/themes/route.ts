/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { apiSuccess, apiError } from "@/lib/api/response";
import { listThemes } from "@/lib/themes/registry";

export async function GET() {
  try {
    const themes = await listThemes();
    const items = themes.map((t) => ({
      slug: t.path.split("/").pop() ?? "",
      name: t.manifest.name,
      version: t.manifest.version,
      author: t.manifest.author,
      description: t.manifest.description,
    }));
    return apiSuccess(items);
  } catch (err) {
    return apiError("Failed to list themes", 500);
  }
}
