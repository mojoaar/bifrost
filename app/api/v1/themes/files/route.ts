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
import fs from "fs";
import path from "path";

const THEMES_DIR = path.resolve("themes");

function listFilesRecursive(dir: string, baseDir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(fullPath, baseDir));
    } else {
      results.push(path.relative(baseDir, fullPath));
    }
  }

  return results;
}

function resolveThemeFile(theme: string, file: string): string {
  const themeDir = path.resolve(THEMES_DIR, theme);
  if (!themeDir.startsWith(THEMES_DIR)) {
    throw new Error("Invalid theme name");
  }

  const resolved = path.resolve(themeDir, file);
  if (!resolved.startsWith(themeDir)) {
    throw new Error("Path traversal blocked");
  }

  return resolved;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const theme = searchParams.get("theme");
  const file = searchParams.get("file");

  try {
    await requireAdmin(request);
  } catch {
    return apiError("Unauthorized", 401);
  }

  if (!theme) {
    return apiError("theme query parameter is required", 400);
  }

  const themeDir = path.resolve(THEMES_DIR, theme);
  if (!themeDir.startsWith(THEMES_DIR) || !fs.existsSync(themeDir)) {
    return apiError("Theme not found", 404);
  }

  if (file) {
    const resolved = resolveThemeFile(theme, file);
    if (!fs.existsSync(resolved)) {
      return apiError("File not found", 404);
    }

    const content = fs.readFileSync(resolved, "utf-8");
    return apiSuccess({ content });
  }

  const files = listFilesRecursive(themeDir, themeDir);
  return apiSuccess({ files });
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch {
    return apiError("Unauthorized", 401);
  }

  try {
    const body = await request.json();
    const { theme, file, content } = body as { theme?: string; file?: string; content?: string };

    if (!theme || !file || content === undefined) {
      return apiError("theme, file, and content are required", 400);
    }

    const resolved = resolveThemeFile(theme, file);
    const dir = path.dirname(resolved);

    if (!fs.existsSync(dir)) {
      return apiError("Directory does not exist", 404);
    }

    if (fs.existsSync(resolved)) {
      const existing = fs.readFileSync(resolved, "utf-8");
      if (existing === content) {
        return apiSuccess({ saved: false, message: "No changes detected" });
      }
    }

    fs.writeFileSync(resolved, content, "utf-8");
    return apiSuccess({ saved: true, message: "File saved. Restart required for changes to take effect." });
  } catch (err) {
    if (err instanceof Error && err.message === "Invalid theme name") {
      return apiError(err.message, 400);
    }
    if (err instanceof Error && err.message === "Path traversal blocked") {
      return apiError(err.message, 400);
    }
    return apiError("Failed to save file", 500);
  }
}
