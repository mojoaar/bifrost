/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

export const components = {
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
    Page: {
      type: "object",
      properties: {
        slug: { type: "string" },
        title: { type: "string" },
        contentMd: { type: "string" },
        contentHtml: { type: "string" },
        excerpt: { type: "string" },
        frontmatter: { type: "string" },
        status: { type: "string", enum: ["draft", "published"] },
        showInNav: { type: "boolean" },
        navOrder: { type: "integer" },
        authorId: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
    },
    Tag: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        slug: { type: "string" },
        count: { type: "integer", description: "Number of posts using this tag" },
      },
    },
    User: {
      type: "object",
      description: "Public user shape; password hash and MFA secrets are never returned.",
      properties: {
        id: { type: "string" },
        email: { type: "string", format: "email" },
        displayName: { type: "string" },
        role: { type: "string", enum: ["admin", "editor", "author"] },
        bio: { type: "string", nullable: true },
        avatarUrl: { type: "string", nullable: true },
        mfaEnabled: { type: "boolean" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
    },
    Media: {
      type: "object",
      properties: {
        id: { type: "string" },
        filename: { type: "string" },
        path: { type: "string", description: "Relative to the content directory" },
        mimeType: { type: "string" },
        sizeBytes: { type: "integer" },
        createdAt: { type: "string" },
      },
    },
    AuditLog: {
      type: "object",
      properties: {
        id: { type: "string" },
        timestamp: { type: "string", format: "date-time" },
        actorId: { type: "string", nullable: true },
        actorLabel: { type: "string", nullable: true },
        actorType: { type: "string", enum: ["user", "api_key", "system", "anonymous"] },
        action: { type: "string" },
        targetType: { type: "string", nullable: true },
        targetId: { type: "string", nullable: true },
        status: { type: "string", enum: ["success", "failure"] },
        ip: { type: "string", nullable: true },
        userAgent: { type: "string", nullable: true },
        metadata: { type: "string", nullable: true, description: "JSON-encoded extra context" },
      },
    },
  },
};
