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
import { posts } from "@/lib/db/schema/posts";
import { hashPassword } from "@/lib/auth/password";
import { createAccessToken } from "@/lib/auth/token";
import { nowISO } from "@/lib/time";
import { eq } from "drizzle-orm";
import { POST as postsSlugPost, PUT as postsSlugPut } from "@/app/api/v1/posts/[slug]/route";
import { isPreviewTokenValid } from "@/lib/content/preview";

const adminId = randomUUID();
const adminEmail = `preview-admin-${adminId}@example.com`;
let adminToken: string;

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

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

async function makeDraft(slug: string): Promise<void> {
  const now = nowISO();
  db.insert(posts)
    .values({
      slug,
      title: `Draft ${slug}`,
      contentMd: "# draft",
      contentHtml: "<h1>draft</h1>",
      excerpt: "draft",
      frontmatter: "{}",
      status: "draft",
      authorId: adminId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .run();
}

beforeAll(async () => {
  const now = nowISO();
  db.insert(users)
    .values({
      id: adminId,
      email: adminEmail,
      passwordHash: await hashPassword("correct-horse-battery-staple"),
      displayName: "Preview Admin",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .run();
  adminToken = await createAccessToken({ sub: adminId, role: "admin" });
});

describe("POST /api/v1/posts/[slug] preview tokens", () => {
  it("generates a preview token for a draft", async () => {
    const slug = `pv-generate-${randomUUID().slice(0, 8)}`;
    await makeDraft(slug);
    const res = await postsSlugPost(
      jsonReq(`/api/v1/posts/${slug}`, "POST", { action: "generate_preview" }, bearer(adminToken)),
      ctx(slug)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.previewToken).toBeTruthy();
    expect(body.data.previewTokenExpiresAt).toBeTruthy();

    const row = db.select().from(posts).where(eq(posts.slug, slug)).get();
    expect(isPreviewTokenValid(row!.previewToken, row!.previewTokenExpiresAt, body.data.previewToken)).toBe(true);
  });

  it("rejects a wrong token", async () => {
    const slug = `pv-wrong-${randomUUID().slice(0, 8)}`;
    await makeDraft(slug);
    await postsSlugPost(
      jsonReq(`/api/v1/posts/${slug}`, "POST", { action: "generate_preview" }, bearer(adminToken)),
      ctx(slug)
    );
    const row = db.select().from(posts).where(eq(posts.slug, slug)).get();
    expect(isPreviewTokenValid(row!.previewToken, row!.previewTokenExpiresAt, "not-the-token")).toBe(false);
  });

  it("treats an expired token as invalid", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(isPreviewTokenValid("tok", past, "tok")).toBe(false);
  });

  it("requires authentication", async () => {
    const slug = `pv-auth-${randomUUID().slice(0, 8)}`;
    await makeDraft(slug);
    const res = await postsSlugPost(
      jsonReq(`/api/v1/posts/${slug}`, "POST", { action: "generate_preview" }),
      ctx(slug)
    );
    expect(res.status).toBe(401);
  });

  it("revokes a preview token", async () => {
    const slug = `pv-revoke-${randomUUID().slice(0, 8)}`;
    await makeDraft(slug);
    await postsSlugPost(
      jsonReq(`/api/v1/posts/${slug}`, "POST", { action: "generate_preview" }, bearer(adminToken)),
      ctx(slug)
    );
    const res = await postsSlugPost(
      jsonReq(`/api/v1/posts/${slug}`, "POST", { action: "revoke_preview" }, bearer(adminToken)),
      ctx(slug)
    );
    expect(res.status).toBe(200);
    const row = db.select().from(posts).where(eq(posts.slug, slug)).get();
    expect(row!.previewToken).toBeNull();
    expect(row!.previewTokenExpiresAt).toBeNull();
  });

  it("clears the preview token when the post is published", async () => {
    const slug = `pv-publish-${randomUUID().slice(0, 8)}`;
    await makeDraft(slug);
    await postsSlugPost(
      jsonReq(`/api/v1/posts/${slug}`, "POST", { action: "generate_preview" }, bearer(adminToken)),
      ctx(slug)
    );
    const res = await postsSlugPut(
      jsonReq(`/api/v1/posts/${slug}`, "PUT", { status: "published" }, bearer(adminToken)),
      ctx(slug)
    );
    expect(res.status).toBe(200);
    const row = db.select().from(posts).where(eq(posts.slug, slug)).get();
    expect(row!.status).toBe("published");
    expect(row!.previewToken).toBeNull();
  });
});
