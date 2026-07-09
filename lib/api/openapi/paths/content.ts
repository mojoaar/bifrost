/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { bearer, jsonBody } from "../shared";

export const contentPaths = {
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
  "/pages": {
    get: {
      summary: "List pages",
      tags: ["Pages"],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        {
          name: "status",
          in: "query",
          schema: { type: "string", enum: ["draft", "published"] },
        },
      ],
      responses: {
        "200": {
          description: "Paginated list of pages",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: { type: "array", items: { $ref: "#/components/schemas/Page" } },
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
      summary: "Create page",
      tags: ["Pages"],
      security: bearer,
      requestBody: jsonBody({
        type: "object",
        required: ["slug", "title", "content"],
        properties: {
          slug: { type: "string", description: "lowercase kebab-case" },
          title: { type: "string" },
          content: { type: "string" },
          status: { type: "string", enum: ["draft", "published"], default: "draft" },
          showInNav: { type: "boolean", default: false },
          navOrder: { type: "integer", default: 0 },
          authorId: { type: "string" },
          frontmatter: { type: "object" },
        },
      }),
      responses: {
        "201": { description: "Page created" },
        "401": { description: "Unauthorized" },
        "409": { description: "Slug conflict" },
        "422": { description: "Validation error" },
      },
    },
  },
  "/pages/{slug}": {
    get: {
      summary: "Get page by slug",
      tags: ["Pages"],
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": { description: "Page found" },
        "404": { description: "Page not found" },
      },
    },
    put: {
      summary: "Update page",
      tags: ["Pages"],
      security: bearer,
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      requestBody: jsonBody(
        {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
            status: { type: "string", enum: ["draft", "published"] },
            showInNav: { type: "boolean" },
            navOrder: { type: "integer" },
            authorId: { type: "string" },
            frontmatter: { type: "object" },
          },
        },
        false
      ),
      responses: {
        "200": { description: "Page updated" },
        "401": { description: "Unauthorized" },
        "404": { description: "Page not found" },
        "422": { description: "Validation error" },
      },
    },
    delete: {
      summary: "Delete page",
      tags: ["Pages"],
      security: bearer,
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": { description: "Page deleted" },
        "401": { description: "Unauthorized" },
        "404": { description: "Page not found" },
      },
    },
  },
  "/post-templates": {
    get: {
      summary: "List post templates",
      tags: ["Templates"],
      security: bearer,
      responses: { "200": { description: "List of templates" }, "401": { description: "Unauthorized" } },
    },
    post: {
      summary: "Create post template",
      tags: ["Templates"],
      security: bearer,
      requestBody: jsonBody({
        type: "object",
        required: ["name"],
        properties: { name: { type: "string" } },
      }),
      responses: {
        "200": { description: "Template created; returns new template and full list" },
        "400": { description: "Validation error" },
        "409": { description: "Template already exists" },
      },
    },
    put: {
      summary: "Save post template contents",
      tags: ["Templates"],
      security: bearer,
      requestBody: jsonBody({
        type: "object",
        required: ["name", "content"],
        properties: { name: { type: "string" }, content: { type: "string" } },
      }),
      responses: { "200": { description: "Template saved; returns full list" } },
    },
    delete: {
      summary: "Delete post template",
      tags: ["Templates"],
      security: bearer,
      requestBody: jsonBody({
        type: "object",
        required: ["name"],
        properties: { name: { type: "string" } },
      }),
      responses: {
        "200": { description: "Template deleted; returns full list" },
        "404": { description: "Not found" },
      },
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
  "/search": {
    get: {
      summary: "Search published posts",
      tags: ["Content"],
      parameters: [
        { name: "q", in: "query", required: true, schema: { type: "string", minLength: 2 } },
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 10, maximum: 50 } },
      ],
      responses: { "200": { description: "Matching published posts" } },
    },
  },
};
