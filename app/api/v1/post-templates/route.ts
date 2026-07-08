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
import { loadPostTemplates, savePostTemplate, createPostTemplate, deletePostTemplate } from "@/lib/editor/post-templates";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch {
    return apiError("Unauthorized", 401);
  }

  try {
    const templates = loadPostTemplates();
    return apiSuccess(templates);
  } catch {
    return apiError("Failed to load templates", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch {
    return apiError("Unauthorized", 401);
  }

  try {
    const body = await request.json();
    const { name, content } = body as { name?: string; content?: string };

    if (!name || content === undefined) {
      return apiError("name and content are required", 400);
    }

    savePostTemplate(name, content);
    const templates = loadPostTemplates();
    return apiSuccess(templates);
  } catch {
    return apiError("Failed to save template", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch {
    return apiError("Unauthorized", 401);
  }

  try {
    const body = await request.json();
    const { name } = body as { name?: string };

    if (!name || !name.trim()) {
      return apiError("name is required", 400);
    }

    const template = createPostTemplate(name.trim());
    const templates = loadPostTemplates();
    return apiSuccess({ template, templates });
  } catch (err) {
    if (err instanceof Error) {
      return apiError(err.message, 409);
    }
    return apiError("Failed to create template", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch {
    return apiError("Unauthorized", 401);
  }

  try {
    const body = await request.json();
    const { name } = body as { name?: string };

    if (!name) {
      return apiError("name is required", 400);
    }

    deletePostTemplate(name);
    const templates = loadPostTemplates();
    return apiSuccess(templates);
  } catch (err) {
    if (err instanceof Error) {
      return apiError(err.message, 404);
    }
    return apiError("Failed to delete template", 500);
  }
}
