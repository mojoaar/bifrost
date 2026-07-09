/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { settings } from "@/lib/db/schema/settings";
import { hashPassword } from "@/lib/auth/password";
import { createAccessToken } from "@/lib/auth/token";
import { eq } from "drizzle-orm";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { GET as settingsGet, PUT as settingsPut } from "@/app/api/v1/settings/route";
import { POST as postsPost, GET as postsGet } from "@/app/api/v1/posts/route";
import { POST as mediaUploadPost } from "@/app/api/v1/media/upload/route";

const adminId = randomUUID();
const adminEmail = `admin-${adminId}@example.com`;
const adminPassword = "correct-horse-battery-staple";

function jsonReq(pathname: string, method: string, body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost:3000${pathname}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

let adminToken: string;

beforeAll(async () => {
  const now = new Date().toISOString();
  db.insert(users)
    .values({
      id: adminId,
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      displayName: "Admin",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  adminToken = await createAccessToken({ sub: adminId, role: "admin" });
});

describe("POST /api/v1/auth/login", () => {
  it("rejects unknown email with 401", async () => {
    const res = await loginPost(jsonReq("/api/v1/auth/login", "POST", {
      email: "nobody@example.com",
      password: "x",
    }));
    expect(res.status).toBe(401);
  });

  it("rejects wrong password with 401", async () => {
    const res = await loginPost(jsonReq("/api/v1/auth/login", "POST", {
      email: adminEmail,
      password: "wrong",
    }));
    expect(res.status).toBe(401);
  });

  it("returns tokens for valid credentials", async () => {
    const res = await loginPost(jsonReq("/api/v1/auth/login", "POST", {
      email: adminEmail,
      password: adminPassword,
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.tokens.accessToken).toBeTruthy();
    expect(body.data.user.email).toBe(adminEmail);
  });

  it("returns 400 when email or password is missing", async () => {
    const res = await loginPost(jsonReq("/api/v1/auth/login", "POST", { email: adminEmail }));
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/v1/settings", () => {
  it("rejects unauthenticated writes with 401", async () => {
    const res = await settingsPut(jsonReq("/api/v1/settings", "PUT", { "site.title": "X" }));
    expect(res.status).toBe(401);
  });

  it("rejects an invalid payload with 400", async () => {
    const res = await settingsPut(
      jsonReq("/api/v1/settings", "PUT", { "bad key!": "x" }, bearer(adminToken))
    );
    expect(res.status).toBe(400);
  });

  it("persists a valid setting for an admin", async () => {
    const res = await settingsPut(
      jsonReq("/api/v1/settings", "PUT", { "site.tagline": "Hello" }, bearer(adminToken))
    );
    expect(res.status).toBe(200);
    const row = db.select().from(settings).where(eq(settings.key, "site.tagline")).get();
    expect(row?.value).toBe("Hello");
  });

  it("exposes settings via GET with secrets redacted", async () => {
    db.insert(settings)
      .values({ key: "git.token", value: "supersecret" })
      .onConflictDoUpdate({ target: settings.key, set: { value: "supersecret" } })
      .run();
    const res = await settingsGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data["git.token"]).toBe("__SET__");
  });
});

describe("POST /api/v1/posts", () => {
  it("rejects unauthenticated create with 401", async () => {
    const res = await postsPost(jsonReq("/api/v1/posts", "POST", {
      slug: "unauth-post",
      title: "X",
      content: "body",
    }));
    expect(res.status).toBe(401);
  });

  it("returns 422 for an invalid slug", async () => {
    const res = await postsPost(
      jsonReq("/api/v1/posts", "POST", { slug: "Not Kebab", title: "X", content: "b" }, bearer(adminToken))
    );
    expect(res.status).toBe(422);
  });

  it("creates a post for an authenticated user", async () => {
    const slug = `test-int-${Date.now()}`;
    const res = await postsPost(
      jsonReq("/api/v1/posts", "POST", {
        slug,
        title: "Integration Post",
        content: "# Hello\n\nbody",
        status: "published",
      }, bearer(adminToken))
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.slug).toBe(slug);

    const listRes = await postsGet(new NextRequest("http://localhost:3000/api/v1/posts?status=published"));
    const list = await listRes.json();
    expect(list.data.some((p: { slug: string }) => p.slug === slug)).toBe(true);
  });
});

describe("POST /api/v1/media/upload", () => {
  it("rejects unauthenticated upload with 401", async () => {
    const res = await mediaUploadPost(new NextRequest("http://localhost:3000/api/v1/media/upload", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("uploads a file for an authenticated user", async () => {
    const form = new FormData();
    form.append("file", new File([new Uint8Array([1, 2, 3])], "pic.png", { type: "image/png" }));
    const req = new NextRequest("http://localhost:3000/api/v1/media/upload", {
      method: "POST",
      headers: bearer(adminToken),
      body: form,
    });
    const res = await mediaUploadPost(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.mimeType).toBe("image/png");
  });
});
