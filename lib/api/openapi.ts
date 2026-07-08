/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { version } from "@/package.json";

export interface OpenAPISpec {
  openapi: string;
  info: { title: string; version: string; description: string };
  servers: { url: string }[];
  paths: Record<string, unknown>;
  components: Record<string, unknown>;
}

const bearer = [{ bearerAuth: [] }];

const jsonBody = (schema: unknown, required = true) => ({
  required,
  content: { "application/json": { schema } },
});

export function generateOpenApiSpec(): OpenAPISpec {
  return {
    openapi: "3.1.0",
    info: {
      title: "Bifröst API",
      version,
      description:
        "REST API for the Bifröst blogging framework. Responses use a { data, error, meta } envelope. " +
        "Write endpoints require authentication via a Bearer JWT access token or a Bifröst API key (bfk_…).",
    },
    servers: [{ url: "/api/v1" }],
    paths: {
      "/posts": {
        get: {
          summary: "List posts",
          tags: ["Posts"],
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
            {
              name: "status",
              in: "query",
              schema: { type: "string", enum: ["draft", "published"] },
            },
          ],
          responses: {
            "200": {
              description: "Paginated list of posts",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/Post" } },
                      error: { type: "null" },
                      meta: {
                        type: "object",
                        properties: {
                          page: { type: "integer" },
                          limit: { type: "integer" },
                          total: { type: "integer" },
      },
      "/admin/stats": {
        get: {
          summary: "Server and visitor statistics",
          tags: ["Admin"],
          security: bearer,
          responses: { "200": { description: "Server info, DB counts, and view analytics" } },
        },
      },
      "/analytics/view": {
        post: {
          summary: "Record a page view",
          tags: ["Analytics"],
          requestBody: jsonBody({
            type: "object",
            properties: {
              path: { type: "string" },
              referrer: { type: "string" },
            },
            required: ["path"],
          }),
          responses: { "200": { description: "View recorded" } },
        },
      },
    },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: "Create post",
          tags: ["Posts"],
          security: bearer,
          requestBody: jsonBody({
            type: "object",
            required: ["slug", "title", "content"],
            properties: {
              slug: { type: "string" },
              title: { type: "string" },
              content: { type: "string" },
              status: { type: "string", enum: ["draft", "published"] },
              authorId: { type: "string" },
              tagIds: { type: "array", items: { type: "string" } },
              frontmatter: { type: "object" },
            },
          }),
          responses: {
            "201": { description: "Post created" },
            "400": { description: "Validation error" },
            "401": { description: "Unauthorized" },
            "409": { description: "Slug conflict" },
          },
        },
      },
      "/posts/{slug}": {
        get: {
          summary: "Get post by slug",
          tags: ["Posts"],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Post found" },
            "404": { description: "Post not found" },
          },
        },
        put: {
          summary: "Update post",
          tags: ["Posts"],
          security: bearer,
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          requestBody: jsonBody(
            {
              type: "object",
              properties: {
                title: { type: "string" },
                content: { type: "string" },
                status: { type: "string", enum: ["draft", "published"] },
                tagIds: { type: "array", items: { type: "string" } },
                frontmatter: { type: "object" },
              },
            },
            false
          ),
          responses: {
            "200": { description: "Post updated" },
            "401": { description: "Unauthorized" },
            "404": { description: "Post not found" },
          },
        },
        delete: {
          summary: "Delete post",
          tags: ["Posts"],
          security: bearer,
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Post deleted" },
            "401": { description: "Unauthorized" },
            "404": { description: "Post not found" },
          },
        },
      },
      "/tags": {
        get: {
          summary: "List tags",
          description: "Returns all tags with a `count` of how many posts use each tag.",
          tags: ["Tags"],
          responses: { "200": { description: "List of tags" } },
        },
        post: {
          summary: "Create tag",
          tags: ["Tags"],
          security: bearer,
          requestBody: jsonBody({
            type: "object",
            required: ["name", "slug"],
            properties: {
              name: { type: "string" },
              slug: { type: "string", description: "lowercase kebab-case" },
            },
          }),
          responses: { "201": { description: "Tag created" }, "400": { description: "Validation error" } },
        },
      },
      "/tags/{id}": {
        get: {
          summary: "Get tag by id",
          tags: ["Tags"],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Tag found" }, "404": { description: "Not found" } },
        },
        put: {
          summary: "Update tag",
          tags: ["Tags"],
          security: bearer,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: jsonBody(
            {
              type: "object",
              properties: { name: { type: "string" }, slug: { type: "string" } },
            },
            false
          ),
          responses: { "200": { description: "Tag updated" }, "404": { description: "Not found" } },
        },
        delete: {
          summary: "Delete tag",
          tags: ["Tags"],
          security: bearer,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Tag deleted" }, "404": { description: "Not found" } },
        },
      },
      "/users": {
        get: {
          summary: "List users",
          tags: ["Users"],
          security: bearer,
          responses: { "200": { description: "List of users" } },
        },
        post: {
          summary: "Create user",
          tags: ["Users"],
          security: bearer,
          requestBody: jsonBody({
            type: "object",
            required: ["email", "password", "displayName"],
            properties: {
              email: { type: "string", format: "email" },
              password: { type: "string", format: "password" },
              displayName: { type: "string" },
              role: { type: "string", enum: ["admin", "editor", "author"], default: "author" },
            },
          }),
          responses: {
            "201": { description: "User created" },
            "400": { description: "Validation error" },
            "409": { description: "Email already exists" },
          },
        },
      },
      "/users/{id}": {
        put: {
          summary: "Update user",
          tags: ["Users"],
          security: bearer,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: jsonBody(
            {
              type: "object",
              properties: {
                email: { type: "string", format: "email" },
                displayName: { type: "string" },
                password: { type: "string", format: "password" },
                role: { type: "string", enum: ["admin", "editor", "author"] },
              },
            },
            false
          ),
          responses: { "200": { description: "User updated" }, "404": { description: "Not found" } },
        },
        delete: {
          summary: "Delete user",
          tags: ["Users"],
          security: bearer,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "User deleted" }, "404": { description: "Not found" } },
        },
      },
      "/profile": {
        get: {
          summary: "Get current user profile",
          tags: ["Profile"],
          security: bearer,
          responses: { "200": { description: "Current user" }, "401": { description: "Unauthorized" } },
        },
        put: {
          summary: "Update current user profile",
          tags: ["Profile"],
          security: bearer,
          requestBody: jsonBody(
            {
              type: "object",
              properties: {
                displayName: { type: "string" },
                email: { type: "string", format: "email" },
                bio: { type: "string" },
                avatarUrl: { type: "string" },
                password: { type: "string", format: "password" },
              },
            },
            false
          ),
          responses: { "200": { description: "Profile updated" }, "401": { description: "Unauthorized" } },
        },
      },
      "/api-keys": {
        get: {
          summary: "List API keys",
          tags: ["API Keys"],
          security: bearer,
          responses: { "200": { description: "List of the caller's API keys (no secrets)" } },
        },
        post: {
          summary: "Create API key",
          tags: ["API Keys"],
          security: bearer,
          requestBody: jsonBody({
            type: "object",
            required: ["name"],
            properties: { name: { type: "string" } },
          }),
          responses: {
            "201": { description: "API key created; plaintext key returned once in `key`" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api-keys/{id}": {
        delete: {
          summary: "Revoke API key",
          tags: ["API Keys"],
          security: bearer,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Key revoked" }, "404": { description: "Not found" } },
        },
      },
      "/auth/login": {
        post: {
          summary: "Login",
          tags: ["Auth"],
          requestBody: jsonBody({
            type: "object",
            required: ["email", "password"],
            properties: {
              email: { type: "string", format: "email" },
              password: { type: "string", format: "password" },
            },
          }),
          responses: {
            "200": { description: "Login successful; returns access token, sets refresh cookie" },
            "401": { description: "Invalid credentials" },
          },
        },
      },
      "/auth/refresh": {
        post: {
          summary: "Refresh access token",
          tags: ["Auth"],
          responses: {
            "200": { description: "New access token" },
            "401": { description: "Invalid refresh token" },
          },
        },
      },
      "/media": {
        get: {
          summary: "List media",
          tags: ["Media"],
          responses: { "200": { description: "List of media records" } },
        },
      },
      "/media/upload": {
        post: {
          summary: "Upload media",
          tags: ["Media"],
          security: bearer,
          requestBody: {
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: { file: { type: "string", format: "binary" } },
                },
              },
            },
          },
          responses: {
            "201": { description: "File uploaded" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/media/{id}": {
        delete: {
          summary: "Delete media",
          tags: ["Media"],
          security: bearer,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Media deleted" }, "401": { description: "Unauthorized" } },
        },
      },
      "/ai/chat": {
        post: {
          summary: "AI chat (streaming)",
          tags: ["AI"],
          security: bearer,
          requestBody: jsonBody({
            type: "object",
            required: ["content"],
            properties: {
              action: { type: "string" },
              content: { type: "string" },
              provider: { type: "string" },
              model: { type: "string" },
            },
          }),
          responses: {
            "200": { description: "SSE stream of tokens" },
            "403": { description: "AI assist is disabled" },
          },
        },
      },
      "/ai/models": {
        get: {
          summary: "List AI models",
          tags: ["AI"],
          responses: { "200": { description: "Available providers, actions, and enabled flag" } },
        },
      },
      "/ai/settings": {
        get: {
          summary: "Get AI settings",
          tags: ["AI"],
          security: bearer,
          responses: { "200": { description: "AI enable flag, default provider, providers (hasKey)" } },
        },
        put: {
          summary: "Update AI settings",
          tags: ["AI"],
          security: bearer,
          requestBody: jsonBody(
            {
              type: "object",
              properties: {
                enabled: { type: "boolean" },
                defaultProvider: { type: "string" },
                providers: {
                  type: "object",
                  additionalProperties: {
                    type: "object",
                    properties: { model: { type: "string" }, apiKey: { type: "string" } },
                  },
                },
              },
            },
            false
          ),
          responses: { "200": { description: "AI settings updated" }, "401": { description: "Unauthorized" } },
        },
      },
      "/settings": {
        get: {
          summary: "Get settings",
          tags: ["Settings"],
          responses: { "200": { description: "Key/value settings map (secrets redacted)" } },
        },
        put: {
          summary: "Update settings",
          tags: ["Settings"],
          security: bearer,
          requestBody: jsonBody({
            type: "object",
            additionalProperties: { type: "string" },
            description: "Key/value pairs. Values equal to '__SET__' are ignored (keep existing secret).",
          }),
          responses: { "200": { description: "Settings updated" } },
        },
      },
      "/themes": {
        get: {
          summary: "List themes",
          tags: ["Themes"],
          responses: { "200": { description: "Available themes" } },
        },
      },
      "/git/history": {
        get: {
          summary: "Commit history",
          tags: ["Git"],
          parameters: [
            { name: "slug", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
          responses: { "200": { description: "List of commits" } },
        },
      },
      "/git/diff": {
        get: {
          summary: "Commit diff",
          tags: ["Git"],
          parameters: [{ name: "sha", in: "query", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Diff for a commit" } },
        },
      },
      "/git/push": {
        post: {
          summary: "Push to remote",
          tags: ["Git"],
          security: bearer,
          responses: { "200": { description: "Pushed" } },
        },
      },
      "/git/pull": {
        post: {
          summary: "Pull from remote",
          tags: ["Git"],
          security: bearer,
          responses: { "200": { description: "Pulled" } },
        },
      },
      "/mcp/status": {
        get: {
          summary: "MCP server status",
          tags: ["MCP"],
          security: bearer,
          responses: { "200": { description: "MCP enabled flag, mode, port" } },
        },
      },
      "/preview": {
        post: {
          summary: "Render markdown preview",
          tags: ["Content"],
          requestBody: jsonBody({
            type: "object",
            required: ["source"],
            properties: { source: { type: "string" } },
          }),
          responses: { "200": { description: "Rendered HTML" } },
        },
      },
      "/setup": {
        get: {
          summary: "Setup status",
          tags: ["Setup"],
          responses: { "200": { description: "Whether the first admin exists" } },
        },
        post: {
          summary: "Create first admin (initial setup)",
          tags: ["Setup"],
          requestBody: jsonBody({
            type: "object",
            required: ["email", "password", "name"],
            properties: {
              email: { type: "string", format: "email" },
              password: { type: "string", format: "password" },
              name: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
            },
          }),
          responses: {
            "201": { description: "Admin created" },
            "409": { description: "Setup already completed" },
          },
        },
      },
      "/admin/reset": {
        get: {
          summary: "Demo data count",
          tags: ["Admin"],
          security: bearer,
          responses: { "200": { description: "Number of remaining seed posts" } },
        },
        post: {
          summary: "Remove demo data",
          tags: ["Admin"],
          security: bearer,
          responses: { "200": { description: "Seed posts removed" } },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT or bfk_ API key",
        },
      },
      schemas: {
        Post: {
          type: "object",
          properties: {
            slug: { type: "string" },
            title: { type: "string" },
            contentMd: { type: "string" },
            contentHtml: { type: "string" },
            excerpt: { type: "string" },
            frontmatter: { type: "string" },
            status: { type: "string", enum: ["draft", "published"] },
            authorId: { type: "string" },
            publishedAt: { type: "string", nullable: true },
            createdAt: { type: "string" },
            updatedAt: { type: "string" },
          },
        },
      },
    },
  } as OpenAPISpec;
}
