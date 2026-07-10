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
import { tags } from "@/lib/db/schema/tags";
import { postTags } from "@/lib/db/schema/post-tags";
import { renderMarkdown, parseFrontmatter } from "@/lib/md/parser";
import { postCreateSchema } from "@/lib/validation/posts";
import { eq, like, or, desc } from "drizzle-orm";
import { writePostToFilesystem, deletePostFromFilesystem } from "@/lib/content/sync";
import { resolveAuthorId } from "@/lib/content/authors";
import { recordAudit } from "@/lib/audit";
import type { McpTool } from "./shared";
import { safeJson } from "./shared";

export const postTools: McpTool[] = [
  {
    name: "list_posts",
    description: "List posts, filterable by status and tag",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["draft", "published", "scheduled"] },
        tag: { type: "string" },
        limit: { type: "number" },
        page: { type: "number" },
      },
    },
    handler: async (args) => {
      const limit = Math.min(50, (args.limit as number) ?? 20);
      const page = Math.max(1, (args.page as number) ?? 1);
      const offset = (page - 1) * limit;
      const statusFilter =
        typeof args.status === "string"
          ? eq(posts.status, args.status as "draft" | "published" | "scheduled")
          : undefined;

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
          .orderBy(desc(posts.createdAt))
          .limit(limit)
          .offset(offset)
          .all();
        return { content: [{ type: "text", text: safeJson(rows) }] };
      }

      const query = db.select().from(posts).orderBy(desc(posts.createdAt)).limit(limit).offset(offset);
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
        status: { type: "string", enum: ["draft", "published", "scheduled"] },
        scheduledAt: { type: "string" },
        frontmatter: { type: "object" },
        authorId: { type: "string" },
        tagIds: { type: "array", items: { type: "string" } },
      },
      required: ["title", "slug", "content"],
    },
    handler: async (args, ctx) => {
      const body = {
        title: args.title as string,
        slug: args.slug as string,
        content: args.content as string,
        status: (args.status as "draft" | "published" | "scheduled") ?? "draft",
        scheduledAt: args.scheduledAt as string | undefined,
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

      const { frontmatter: bodyFm } = parseFrontmatter(body.content);
      const mergedFm = { ...bodyFm, ...body.frontmatter };

      const now = nowISO();
      const { html, excerpt } = await renderMarkdown(body.content);

      db.transaction((tx) => {
        tx.insert(posts)
          .values({
            slug: body.slug,
            title: body.title,
            contentMd: body.content,
            contentHtml: html,
            excerpt,
            frontmatter: JSON.stringify(mergedFm),
            status: body.status,
            authorId,
            publishedAt: body.status === "published" ? now : null,
            scheduledAt: body.status === "scheduled" ? body.scheduledAt ?? null : null,
            createdAt: now,
            updatedAt: now,
          })
          .run();

        for (const tagId of body.tagIds) {
          tx.insert(postTags).values({ postSlug: body.slug, tagId }).run();
        }
      });

      await writePostToFilesystem(body.slug, body.content, { title: body.title, ...mergedFm });

      recordAudit({
        action: "post.create",
        status: "success",
        targetType: "post",
        targetId: body.slug,
        actorId: ctx.actorId,
        actorLabel: ctx.actorLabel,
        actorType: ctx.actorType,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return { content: [{ type: "text", text: safeJson({ slug: body.slug, status: body.status }) }] };
    },
  },

  {
    name: "update_post",
    description: "Update post content, frontmatter, status, or tags",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string" },
        title: { type: "string" },
        content: { type: "string" },
        status: { type: "string", enum: ["draft", "published", "scheduled"] },
        scheduledAt: { type: "string" },
        frontmatter: { type: "object" },
        tagIds: { type: "array", items: { type: "string" } },
      },
      required: ["slug"],
    },
    handler: async (args, ctx) => {
      const existing = db
        .select()
        .from(posts)
        .where(eq(posts.slug, args.slug as string))
        .get();
      if (!existing) return { content: [{ type: "text", text: "Post not found" }] };

      const title = (args.title as string) ?? existing.title;
      const content = (args.content as string) ?? existing.contentMd;
      const status = (args.status as "draft" | "published" | "scheduled") ?? existing.status;
      const frontmatter = (args.frontmatter as Record<string, unknown>) ?? JSON.parse(existing.frontmatter);
      const tagIds = args.tagIds as string[] | undefined;

      const { html, excerpt } = await renderMarkdown(content);

      const publishedAt =
        status === "published" ? existing.publishedAt ?? nowISO() : status === "draft" ? null : existing.publishedAt;
      const scheduledAt =
        status === "scheduled" ? (args.scheduledAt as string) ?? existing.scheduledAt : null;

      db.transaction((tx) => {
        tx.update(posts)
          .set({
            title,
            contentMd: content,
            contentHtml: html,
            excerpt,
            status,
            publishedAt,
            scheduledAt,
            frontmatter: JSON.stringify(frontmatter),
            updatedAt: nowISO(),
          })
          .where(eq(posts.slug, args.slug as string))
          .run();

        if (tagIds) {
          tx.delete(postTags).where(eq(postTags.postSlug, args.slug as string)).run();
          for (const tagId of tagIds) {
            tx.insert(postTags).values({ postSlug: args.slug as string, tagId }).run();
          }
        }
      });

      await writePostToFilesystem(args.slug as string, content, { title, ...frontmatter });

      recordAudit({
        action: "post.update",
        status: "success",
        targetType: "post",
        targetId: args.slug as string,
        actorId: ctx.actorId,
        actorLabel: ctx.actorLabel,
        actorType: ctx.actorType,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

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
    handler: async (args, ctx) => {
      const existing = db
        .select({ slug: posts.slug })
        .from(posts)
        .where(eq(posts.slug, args.slug as string))
        .get();
      if (!existing) return { content: [{ type: "text", text: "Post not found" }] };

      db.delete(postTags).where(eq(postTags.postSlug, args.slug as string)).run();
      db.delete(posts).where(eq(posts.slug, args.slug as string)).run();

      await deletePostFromFilesystem(args.slug as string);

      recordAudit({
        action: "post.delete",
        status: "success",
        targetType: "post",
        targetId: args.slug as string,
        actorId: ctx.actorId,
        actorLabel: ctx.actorLabel,
        actorType: ctx.actorType,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return { content: [{ type: "text", text: "Deleted" }] };
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
];
