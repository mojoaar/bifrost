/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createToolDefinitions, SYSTEM_CONTEXT } from "@/lib/mcp/tools";
import type { McpTool } from "@/lib/mcp/tools";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { tags } from "@/lib/db/schema/tags";
import { posts } from "@/lib/db/schema/posts";
import { postTags } from "@/lib/db/schema/post-tags";
import { eq } from "drizzle-orm";

const tools = createToolDefinitions();
function tool(name: string): McpTool {
  const t = tools.find((x) => x.name === name);
  if (!t) throw new Error(`tool not found: ${name}`);
  return t;
}
async function call(name: string, args: Record<string, unknown>) {
  const res = await tool(name).handler(args, SYSTEM_CONTEXT);
  return res.content[0]!.text;
}

beforeAll(() => {
  const now = new Date().toISOString();
  db.insert(users)
    .values({
      id: "u-handlers",
      email: "handlers@example.com",
      passwordHash: "x",
      displayName: "Handlers",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  db.insert(tags).values({ id: "tag-handlers", name: "Handlers Tag", slug: "handlers-tag" }).run();
});

describe("post handler round-trips", () => {
  it("creates, reads, updates, and deletes a post", async () => {
    const created = JSON.parse(
      await call("create_post", {
        title: "Handler Post",
        slug: "handler-post",
        content: "# Hello\n\nBody text here.",
        status: "published",
      })
    );
    expect(created.slug).toBe("handler-post");
    expect(created.status).toBe("published");

    const fetched = JSON.parse(await call("get_post", { slug: "handler-post" }));
    expect(fetched.title).toBe("Handler Post");
    expect(fetched.contentHtml).toContain("<h1");

    const updated = JSON.parse(
      await call("update_post", { slug: "handler-post", title: "Handler Post Edited", status: "draft" })
    );
    expect(updated.status).toBe("draft");
    const refetched = JSON.parse(await call("get_post", { slug: "handler-post" }));
    expect(refetched.title).toBe("Handler Post Edited");

    const deleted = await call("delete_post", { slug: "handler-post" });
    expect(deleted).toBe("Deleted");
    const gone = db.select().from(posts).where(eq(posts.slug, "handler-post")).get();
    expect(gone).toBeUndefined();
  });

  it("merges body frontmatter and replaces tags on update", async () => {
    await call("create_post", {
      title: "FM Post",
      slug: "fm-post",
      content: "---\ncustom: fromBody\n---\n\nBody",
      status: "draft",
    });
    const row = db.select().from(posts).where(eq(posts.slug, "fm-post")).get()!;
    expect(JSON.parse(row.frontmatter).custom).toBe("fromBody");

    await call("update_post", { slug: "fm-post", tagIds: ["tag-handlers"] });
    const links = db.select().from(postTags).where(eq(postTags.postSlug, "fm-post")).all();
    expect(links.map((l) => l.tagId)).toContain("tag-handlers");

    await call("delete_post", { slug: "fm-post" });
  });

  it("search_posts matches title and body", async () => {
    await call("create_post", {
      title: "Searchable Title",
      slug: "search-post",
      content: "unique-body-token",
      status: "published",
    });
    const byTitle = JSON.parse(await call("search_posts", { query: "Searchable" }));
    expect(byTitle.some((p: { slug: string }) => p.slug === "search-post")).toBe(true);
    const byBody = JSON.parse(await call("search_posts", { query: "unique-body-token" }));
    expect(byBody.some((p: { slug: string }) => p.slug === "search-post")).toBe(true);
    await call("delete_post", { slug: "search-post" });
  });

  it("lists tags", async () => {
    const rows = JSON.parse(await call("list_tags", {}));
    expect(rows.some((t: { slug: string }) => t.slug === "handlers-tag")).toBe(true);
  });
});

describe("page handler round-trips", () => {
  it("creates, updates nav, and deletes a page", async () => {
    const created = JSON.parse(
      await call("create_page", {
        title: "Handler Page",
        slug: "handler-page",
        content: "Page body",
        status: "published",
      })
    );
    expect(created.slug).toBe("handler-page");

    await call("update_page", { slug: "handler-page", showInNav: true, navOrder: 3 });
    const fetched = JSON.parse(await call("get_page", { slug: "handler-page" }));
    expect(fetched.showInNav).toBe(true);
    expect(fetched.navOrder).toBe(3);

    const deleted = await call("delete_page", { slug: "handler-page" });
    expect(deleted).toBe("Deleted");
  });
});

describe("list_users handler", () => {
  it("returns users without password hashes", async () => {
    const rows = JSON.parse(await call("list_users", {}));
    const found = rows.find((u: { id: string }) => u.id === "u-handlers");
    expect(found).toBeDefined();
    expect(found.email).toBe("handlers@example.com");
    expect(found.passwordHash).toBeUndefined();
  });
});
