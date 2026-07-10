/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { matchResource } from "@/lib/mcp/server";
import { createResourceDefinitions } from "@/lib/mcp/resources";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { users } from "@/lib/db/schema/users";

const resources = createResourceDefinitions();

async function read(uri: string) {
  const resource = matchResource(resources, uri);
  if (!resource) return null;
  return resource.handler(uri);
}

beforeAll(() => {
  const now = new Date().toISOString();
  db.insert(users)
    .values({
      id: "u-res-test",
      email: "res-test@example.com",
      passwordHash: "x",
      displayName: "Res",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  db.insert(posts)
    .values({
      slug: "res-test-post",
      title: "Res Test",
      contentMd: "# Markdown Body",
      contentHtml: "<h1>Markdown Body</h1>",
      excerpt: "",
      frontmatter: '{"custom":"value"}',
      status: "published",
      authorId: "u-res-test",
      createdAt: now,
      updatedAt: now,
    })
    .run();
});

describe("matchResource", () => {
  it("matches the collection resource exactly", () => {
    expect(matchResource(resources, "bifrost://posts")?.uriPattern).toBe("bifrost://posts");
  });

  it("matches the html variant, not the bare slug", () => {
    expect(matchResource(resources, "bifrost://posts/res-test-post/html")?.uriPattern).toBe(
      "bifrost://posts/{slug}/html"
    );
  });

  it("matches the frontmatter variant, not the bare slug", () => {
    expect(matchResource(resources, "bifrost://posts/res-test-post/frontmatter")?.uriPattern).toBe(
      "bifrost://posts/{slug}/frontmatter"
    );
  });

  it("matches the bare slug variant", () => {
    expect(matchResource(resources, "bifrost://posts/res-test-post")?.uriPattern).toBe(
      "bifrost://posts/{slug}"
    );
  });

  it("returns undefined for unknown uri", () => {
    expect(matchResource(resources, "bifrost://unknown")).toBeUndefined();
  });
});

describe("resource handlers", () => {
  it("resolves markdown for the bare slug", async () => {
    const result = await read("bifrost://posts/res-test-post");
    expect(result?.contents[0]!.mimeType).toBe("text/markdown");
    expect(result?.contents[0]!.text).toContain("# Markdown Body");
  });

  it("resolves html variant", async () => {
    const result = await read("bifrost://posts/res-test-post/html");
    expect(result?.contents[0]!.mimeType).toBe("text/html");
    expect(result?.contents[0]!.text).toContain("<h1>Markdown Body</h1>");
  });

  it("resolves frontmatter variant", async () => {
    const result = await read("bifrost://posts/res-test-post/frontmatter");
    expect(result?.contents[0]!.mimeType).toBe("application/json");
    expect(result?.contents[0]!.text).toContain("custom");
  });
});
