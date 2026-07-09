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
import { posts } from "@/lib/db/schema/posts";
import { pages } from "@/lib/db/schema/pages";
import { tags } from "@/lib/db/schema/tags";
import { postTags } from "@/lib/db/schema/post-tags";
import { media } from "@/lib/db/schema/media";
import { settings } from "@/lib/db/schema/settings";
import { renderMarkdown } from "@/lib/md/parser";
import { postCreateSchema } from "@/lib/validation/posts";
import { pageCreateSchema } from "@/lib/validation/pages";
import { eq, like, or } from "drizzle-orm";
import { buildMessages } from "@/lib/ai/actions";
import { generateId } from "@/lib/id";
import {
  writePostToFilesystem,
  deletePostFromFilesystem,
  writePageToFilesystem,
  deletePageFromFilesystem,
} from "@/lib/content/sync";
import { resolveAuthorId } from "@/lib/content/authors";
import { slugExists } from "@/lib/content/slug";
import { mediaDir } from "@/lib/paths";
import { redactSecrets } from "@/lib/settings";
import path from "path";

interface ToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface ToolHandler {
  (args: Record<string, unknown>): Promise<{ content: { type: "text"; text: string }[] }>;
}

interface McpTool {
  name: string;
  description: string;
  inputSchema: ToolDef["inputSchema"];
  handler: ToolHandler;
}

function safeJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function createToolDefinitions(): McpTool[] {
  return [
    {
      name: "list_posts",
      description: "List posts, filterable by status and tag",
      inputSchema: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["draft", "published"] },
          tag: { type: "string" },
          limit: { type: "number" },
        },
      },
      handler: async (args) => {
        const limit = Math.min(50, (args.limit as number) ?? 20);
        const statusFilter =
          typeof args.status === "string" ? eq(posts.status, args.status as "draft" | "published") : undefined;

        if (typeof args.tag === "string") {
          const tag = db.select({ id: tags.id }).from(tags).where(eq(tags.slug, args.tag as string)).get();
          if (!tag) return { content: [{ type: "text", text: safeJson([]) }] };
          const postSlugs = db
            .select({ postSlug: postTags.postSlug })
            .from(postTags)
            .where(eq(postTags.tagId, tag.id))
            .all();
          const slugList = postSlugs.map((r) => r.postSlug);
          if (slugList.length === 0) return { content: [{ type: "text", text: safeJson([]) }] };
          const conditions = slugList.map((s) => eq(posts.slug, s));
          if (statusFilter) conditions.push(statusFilter);
          const rows = db
            .select()
            .from(posts)
            .where(conditions.length === 1 ? conditions[0] : or(...conditions))
            .limit(limit)
            .all();
          return { content: [{ type: "text", text: safeJson(rows) }] };
        }

        const query = db.select().from(posts).limit(limit);
        if (statusFilter) query.where(statusFilter);
        const rows = query.all();
        return { content: [{ type: "text", text: safeJson(rows) }] };
      },
    },

    {
      name: "get_post",
      description: "Read a post by slug (returns markdown and HTML)",
      inputSchema: {
        type: "object",
        properties: { slug: { type: "string" } },
        required: ["slug"],
      },
      handler: async (args) => {
        const post = db
          .select()
          .from(posts)
          .where(eq(posts.slug, args.slug as string))
          .get();
        if (!post) return { content: [{ type: "text", text: "Post not found" }] };
        return {
          content: [
            {
              type: "text",
              text: safeJson({
                slug: post.slug,
                title: post.title,
                contentMd: post.contentMd,
                contentHtml: post.contentHtml,
                status: post.status,
                frontmatter: post.frontmatter,
              }),
            },
          ],
        };
      },
    },

    {
      name: "create_post",
      description: "Create a new post",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          slug: { type: "string" },
          content: { type: "string" },
          status: { type: "string", enum: ["draft", "published"] },
          frontmatter: { type: "object" },
          authorId: { type: "string" },
          tagIds: { type: "array", items: { type: "string" } },
        },
        required: ["title", "slug", "content"],
      },
      handler: async (args) => {
        const body = {
          title: args.title as string,
          slug: args.slug as string,
          content: args.content as string,
          status: (args.status as "draft" | "published") ?? "draft",
          frontmatter: (args.frontmatter as Record<string, unknown>) ?? {},
          authorId: args.authorId as string | undefined,
          tagIds: (args.tagIds as string[]) ?? [],
        };
        const parsed = postCreateSchema.safeParse(body);
        if (!parsed.success) {
          return { content: [{ type: "text", text: `Validation failed: ${parsed.error.message}` }] };
        }

        const existing = db.select({ slug: posts.slug }).from(posts).where(eq(posts.slug, body.slug)).get();
        if (existing) return { content: [{ type: "text", text: "Slug already exists" }] };

        const authorId = resolveAuthorId(body.authorId);
        if (!authorId) {
          return { content: [{ type: "text", text: "No valid author found; create a user first" }] };
        }

        await writePostToFilesystem(body.slug, body.content, { title: body.title, ...body.frontmatter });

        const now = nowISO();
        const { html, excerpt } = await renderMarkdown(body.content);

        db.insert(posts)
          .values({
            slug: body.slug,
            title: body.title,
            contentMd: body.content,
            contentHtml: html,
            excerpt,
            frontmatter: JSON.stringify(body.frontmatter),
            status: body.status,
            authorId,
            publishedAt: body.status === "published" ? now : null,
            createdAt: now,
            updatedAt: now,
          })
          .run();

        if (body.tagIds.length > 0) {
          for (const tagId of body.tagIds) {
            db.insert(postTags).values({ postSlug: body.slug, tagId }).run();
          }
        }

        return { content: [{ type: "text", text: safeJson({ slug: body.slug, status: body.status }) }] };
      },
    },

    {
      name: "update_post",
      description: "Update post content or frontmatter",
      inputSchema: {
        type: "object",
        properties: {
          slug: { type: "string" },
          title: { type: "string" },
          content: { type: "string" },
          status: { type: "string", enum: ["draft", "published"] },
          frontmatter: { type: "object" },
        },
        required: ["slug"],
      },
      handler: async (args) => {
        const existing = db
          .select()
          .from(posts)
          .where(eq(posts.slug, args.slug as string))
          .get();
        if (!existing) return { content: [{ type: "text", text: "Post not found" }] };

        const title = (args.title as string) ?? existing.title;
        const content = (args.content as string) ?? existing.contentMd;
        const status = (args.status as "draft" | "published") ?? existing.status;
        const frontmatter = (args.frontmatter as Record<string, unknown>) ?? JSON.parse(existing.frontmatter);

        const { html, excerpt } = await renderMarkdown(content);

        db.update(posts)
          .set({
            title,
            contentMd: content,
            contentHtml: html,
            excerpt,
            status,
            frontmatter: JSON.stringify(frontmatter),
            updatedAt: nowISO(),
          })
          .where(eq(posts.slug, args.slug as string))
          .run();

        await writePostToFilesystem(args.slug as string, content, { title, ...frontmatter });

        return { content: [{ type: "text", text: safeJson({ slug: args.slug, status }) }] };
      },
    },

    {
      name: "delete_post",
      description: "Delete a post",
      inputSchema: {
        type: "object",
        properties: { slug: { type: "string" } },
        required: ["slug"],
      },
      handler: async (args) => {
        const existing = db
          .select({ slug: posts.slug })
          .from(posts)
          .where(eq(posts.slug, args.slug as string))
          .get();
        if (!existing) return { content: [{ type: "text", text: "Post not found" }] };

        db.delete(postTags).where(eq(postTags.postSlug, args.slug as string)).run();
        db.delete(posts).where(eq(posts.slug, args.slug as string)).run();

        await deletePostFromFilesystem(args.slug as string);

        return { content: [{ type: "text", text: "Deleted" }] };
      },
    },

    {
      name: "list_media",
      description: "List uploaded media",
      inputSchema: { type: "object", properties: {} },
      handler: async () => {
        const rows = db.select().from(media).all();
        return { content: [{ type: "text", text: safeJson(rows) }] };
      },
    },

    {
      name: "upload_media",
      description: "Upload a file (accepts base64-encoded content)",
      inputSchema: {
        type: "object",
        properties: {
          filename: { type: "string" },
          mimeType: { type: "string" },
          base64Content: { type: "string" },
        },
        required: ["filename", "mimeType", "base64Content"],
      },
      handler: async (args) => {
        const id = generateId();
        const filename = args.filename as string;
        const mimeType = args.mimeType as string;
        const base64Content = args.base64Content as string;

        const buffer = Buffer.from(base64Content, "base64");
        const { mkdir, writeFile } = await import("fs/promises");
        const dir = mediaDir();
        await mkdir(dir, { recursive: true });
        const filePath = path.join(dir, `${id}-${filename}`);
        await writeFile(filePath, buffer);

        db.insert(media)
          .values({
            id,
            filename,
            path: filePath,
            mimeType,
            sizeBytes: buffer.length,
            createdAt: nowISO(),
          })
          .run();

        return { content: [{ type: "text", text: safeJson({ id, path: filePath }) }] };
      },
    },

    {
      name: "get_settings",
      description: "Read blog settings",
      inputSchema: { type: "object", properties: {} },
      handler: async () => {
        const rows = db.select().from(settings).all();
        const raw: Record<string, string> = {};
        for (const row of rows) raw[row.key] = row.value;
        return { content: [{ type: "text", text: safeJson(redactSecrets(raw)) }] };
      },
    },

    {
      name: "update_settings",
      description: "Update blog settings",
      inputSchema: {
        type: "object",
        properties: {
          key: { type: "string" },
          value: {},
        },
        required: ["key", "value"],
      },
      handler: async (args) => {
        const key = args.key as string;
        const value = args.value;
        db.insert(settings)
          .values({ key, value: JSON.stringify(value) })
          .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(value) } })
          .run();
        return { content: [{ type: "text", text: "Updated" }] };
      },
    },

    {
      name: "search_posts",
      description: "Full-text search across posts",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
      handler: async (args) => {
        const query = args.query as string;
        const rows = db
          .select()
          .from(posts)
          .where(
            or(
              like(posts.title, `%${query}%`),
              like(posts.contentMd, `%${query}%`)
            )
          )
          .limit(20)
          .all();
        return { content: [{ type: "text", text: safeJson(rows) }] };
      },
    },

    {
      name: "list_tags",
      description: "List all tags",
      inputSchema: { type: "object", properties: {} },
      handler: async () => {
        const rows = db.select().from(tags).all();
        return { content: [{ type: "text", text: safeJson(rows) }] };
      },
    },

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

    {
      name: "ai_assist",
      description: "Invoke AI on post content",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string" },
          content: { type: "string" },
          provider: { type: "string" },
        },
        required: ["action", "content"],
      },
      handler: async (args) => {
        try {
          const { streamChatCompletion } = await import("@/lib/ai/providers");
          const messages = buildMessages(args.action as string, args.content as string);
          const provider = (args.provider as string) ?? "opencode-zen";
          const gen = streamChatCompletion(provider, messages);
          let text = "";
          for await (const chunk of gen) {
            text += chunk;
          }
          return { content: [{ type: "text", text }] };
        } catch (err) {
          return { content: [{ type: "text", text: `AI error: ${String(err)}` }] };
        }
      },
    },
  ];
}
