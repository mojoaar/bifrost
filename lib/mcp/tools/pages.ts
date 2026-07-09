/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { nowISO } from "@/lib/time";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema/pages";
import { renderMarkdown } from "@/lib/md/parser";
import { pageCreateSchema } from "@/lib/validation/pages";
import { eq } from "drizzle-orm";
import { writePageToFilesystem, deletePageFromFilesystem } from "@/lib/content/sync";
import { resolveAuthorId } from "@/lib/content/authors";
import { slugExists } from "@/lib/content/slug";
import type { McpTool } from "./shared";
import { safeJson } from "./shared";

export const pageTools: McpTool[] = [
  {
    name: "list_pages",
    description: "List pages, filterable by status",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["draft", "published"] },
        limit: { type: "number" },
      },
    },
    handler: async (args) => {
      const limit = Math.min(50, (args.limit as number) ?? 20);
      const statusFilter =
        typeof args.status === "string"
          ? eq(pages.status, args.status as "draft" | "published")
          : undefined;
      const query = db.select().from(pages).limit(limit);
      if (statusFilter) query.where(statusFilter);
      const rows = query.all();
      return { content: [{ type: "text", text: safeJson(rows) }] };
    },
  },

  {
    name: "get_page",
    description: "Read a page by slug (returns markdown and HTML)",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"],
    },
    handler: async (args) => {
      const page = db
        .select()
        .from(pages)
        .where(eq(pages.slug, args.slug as string))
        .get();
      if (!page) return { content: [{ type: "text", text: "Page not found" }] };
      return {
        content: [
          {
            type: "text",
            text: safeJson({
              slug: page.slug,
              title: page.title,
              contentMd: page.contentMd,
              contentHtml: page.contentHtml,
              status: page.status,
              showInNav: page.showInNav,
              navOrder: page.navOrder,
              frontmatter: page.frontmatter,
            }),
          },
        ],
      };
    },
  },

  {
    name: "create_page",
    description: "Create a new standalone page",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        slug: { type: "string" },
        content: { type: "string" },
        status: { type: "string", enum: ["draft", "published"] },
        showInNav: { type: "boolean" },
        navOrder: { type: "number" },
        frontmatter: { type: "object" },
        authorId: { type: "string" },
      },
      required: ["title", "slug", "content"],
    },
    handler: async (args) => {
      const body = {
        title: args.title as string,
        slug: args.slug as string,
        content: args.content as string,
        status: (args.status as "draft" | "published") ?? "draft",
        showInNav: (args.showInNav as boolean) ?? false,
        navOrder: (args.navOrder as number) ?? 0,
        frontmatter: (args.frontmatter as Record<string, unknown>) ?? {},
        authorId: args.authorId as string | undefined,
      };
      const parsed = pageCreateSchema.safeParse(body);
      if (!parsed.success) {
        return { content: [{ type: "text", text: `Validation failed: ${parsed.error.message}` }] };
      }

      if (slugExists(body.slug)) {
        return { content: [{ type: "text", text: "A post or page with this slug already exists" }] };
      }

      const authorId = resolveAuthorId(body.authorId);
      if (!authorId) {
        return { content: [{ type: "text", text: "No valid author found; create a user first" }] };
      }

      await writePageToFilesystem(body.slug, body.content, { title: body.title, ...body.frontmatter });

      const now = nowISO();
      const { html, excerpt } = await renderMarkdown(body.content);

      db.insert(pages)
        .values({
          slug: body.slug,
          title: body.title,
          contentMd: body.content,
          contentHtml: html,
          excerpt,
          frontmatter: JSON.stringify(body.frontmatter),
          status: body.status,
          showInNav: body.showInNav,
          navOrder: body.navOrder,
          authorId,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      return { content: [{ type: "text", text: safeJson({ slug: body.slug, status: body.status }) }] };
    },
  },

  {
    name: "update_page",
    description: "Update page content, frontmatter, or nav settings",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string" },
        title: { type: "string" },
        content: { type: "string" },
        status: { type: "string", enum: ["draft", "published"] },
        showInNav: { type: "boolean" },
        navOrder: { type: "number" },
        frontmatter: { type: "object" },
      },
      required: ["slug"],
    },
    handler: async (args) => {
      const existing = db
        .select()
        .from(pages)
        .where(eq(pages.slug, args.slug as string))
        .get();
      if (!existing) return { content: [{ type: "text", text: "Page not found" }] };

      const title = (args.title as string) ?? existing.title;
      const content = (args.content as string) ?? existing.contentMd;
      const status = (args.status as "draft" | "published") ?? existing.status;
      const showInNav = (args.showInNav as boolean) ?? existing.showInNav;
      const navOrder = (args.navOrder as number) ?? existing.navOrder;
      const frontmatter = (args.frontmatter as Record<string, unknown>) ?? JSON.parse(existing.frontmatter);

      const { html, excerpt } = await renderMarkdown(content);

      db.update(pages)
        .set({
          title,
          contentMd: content,
          contentHtml: html,
          excerpt,
          status,
          showInNav,
          navOrder,
          frontmatter: JSON.stringify(frontmatter),
          updatedAt: nowISO(),
        })
        .where(eq(pages.slug, args.slug as string))
        .run();

      await writePageToFilesystem(args.slug as string, content, { title, ...frontmatter });

      return { content: [{ type: "text", text: safeJson({ slug: args.slug, status }) }] };
    },
  },

  {
    name: "delete_page",
    description: "Delete a page",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"],
    },
    handler: async (args) => {
      const existing = db
        .select({ slug: pages.slug })
        .from(pages)
        .where(eq(pages.slug, args.slug as string))
        .get();
      if (!existing) return { content: [{ type: "text", text: "Page not found" }] };

      db.delete(pages).where(eq(pages.slug, args.slug as string)).run();
      await deletePageFromFilesystem(args.slug as string);

      return { content: [{ type: "text", text: "Deleted" }] };
    },
  },
];
