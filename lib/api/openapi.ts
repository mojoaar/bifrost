/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

export interface OpenAPISpec {
  openapi: string;
  info: { title: string; version: string; description: string };
  servers: { url: string }[];
  paths: Record<string, unknown>;
  components: Record<string, unknown>;
}

export function generateOpenApiSpec(): OpenAPISpec {
  return {
    openapi: "3.1.0",
    info: {
      title: "Bifröst API",
      version: "1.0.0",
      description: "REST API for the Bifröst blogging framework",
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
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["slug", "title", "content", "authorId"],
                  properties: {
                    slug: { type: "string" },
                    title: { type: "string" },
                    content: { type: "string" },
                    status: { type: "string", enum: ["draft", "published"] },
                    authorId: { type: "string" },
                    tagIds: { type: "array", items: { type: "string" } },
                    frontmatter: { type: "object" },
                  },
                },
              },
            },
          },
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
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    content: { type: "string" },
                    status: { type: "string", enum: ["draft", "published"] },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Post updated" },
            "401": { description: "Unauthorized" },
            "404": { description: "Post not found" },
          },
        },
        delete: {
          summary: "Delete post",
          tags: ["Posts"],
          security: [{ bearerAuth: [] }],
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
          tags: ["Tags"],
          responses: { "200": { description: "List of tags" } },
        },
        post: {
          summary: "Create tag",
          tags: ["Tags"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "slug"],
                  properties: {
                    name: { type: "string" },
                    slug: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Tag created" } },
        },
      },
      "/auth/login": {
        post: {
          summary: "Login",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string", format: "password" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Login successful" },
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
      "/media/upload": {
        post: {
          summary: "Upload media",
          tags: ["Media"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: { "multipart/form-data": { schema: { type: "object" } } },
          },
          responses: {
            "201": { description: "File uploaded" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/ai/chat": {
        post: {
          summary: "AI chat (streaming)",
          tags: ["AI"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["content"],
                  properties: {
                    action: { type: "string" },
                    content: { type: "string" },
                    provider: { type: "string" },
                    model: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "SSE stream of tokens" } },
        },
      },
      "/ai/models": {
        get: {
          summary: "List AI models",
          tags: ["AI"],
          responses: { "200": { description: "Available providers and actions" } },
        },
      },
      "/preview": {
        post: {
          summary: "Render markdown preview",
          tags: ["Content"],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["source"],
                  properties: { source: { type: "string" } },
                },
              },
            },
          },
          responses: { "200": { description: "Rendered HTML" } },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
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
