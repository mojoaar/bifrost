/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema/settings";
import { apiSuccess, apiError } from "@/lib/api/response";
import { verifyAccessToken } from "@/lib/auth/token";
import { getSetting, invalidateSettingsCache, SECRET_PLACEHOLDER } from "@/lib/settings";
import { loadConfig } from "@/lib/config/loader";

async function requireAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!bearerToken) return false;
  const payload = await verifyAccessToken(bearerToken);
  return payload?.role === "admin";
}

function providerNames(): string[] {
  return Object.keys(loadConfig().ai.providers);
}

function hasKey(name: string): boolean {
  const config = loadConfig().ai.providers[name];
  const envKey = process.env[`BIFROST_${name.toUpperCase().replace(/-/g, "_")}_KEY`];
  return Boolean(getSetting(`ai.key.${name}`) || config?.apiKey || envKey);
}

function setSetting(key: string, value: string): void {
  db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return apiError("Invalid or expired token", 401);

  const config = loadConfig();
  const enabled = getSetting("ai.enabled") === "true";
  const defaultProvider = getSetting("ai.default_provider") ?? config.ai.defaultProvider;
  const providers = providerNames().map((name) => ({
    name,
    model: getSetting(`ai.model.${name}`) ?? config.ai.providers[name]?.model ?? "",
    hasKey: hasKey(name),
  }));

  return apiSuccess({ enabled, defaultProvider, providers });
}

interface PutBody {
  enabled?: boolean;
  defaultProvider?: string;
  providers?: Record<string, { model?: string; apiKey?: string }>;
}

export async function PUT(request: NextRequest) {
  if (!(await requireAdmin(request))) return apiError("Invalid or expired token", 401);

  let body: PutBody;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const known = new Set(providerNames());

  if (typeof body.enabled === "boolean") {
    setSetting("ai.enabled", body.enabled ? "true" : "false");
  }

  if (typeof body.defaultProvider === "string") {
    if (!known.has(body.defaultProvider)) {
      return apiError(`Unknown provider: ${body.defaultProvider}`, 400);
    }
    setSetting("ai.default_provider", body.defaultProvider);
  }

  if (body.providers) {
    for (const [name, entry] of Object.entries(body.providers)) {
      if (!known.has(name)) continue;
      if (typeof entry.model === "string") {
        setSetting(`ai.model.${name}`, entry.model.trim());
      }
      if (
        typeof entry.apiKey === "string" &&
        entry.apiKey.trim() !== "" &&
        entry.apiKey !== SECRET_PLACEHOLDER
      ) {
        setSetting(`ai.key.${name}`, entry.apiKey.trim());
      }
    }
  }

  invalidateSettingsCache();
  return apiSuccess({ updated: true });
}
