/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { z } from "zod";

export const postCreateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case"),
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  frontmatter: z.record(z.string(), z.unknown()).optional().default({}),
  status: z.enum(["draft", "published"]).optional().default("draft"),
  authorId: z
    .string()
    .uuid()
    .optional()
    .default("00000000-0000-0000-0000-000000000000"),
  tagIds: z.array(z.string().uuid()).optional().default([]),
});

export const postUpdateSchema = postCreateSchema.partial().omit({ slug: true });

export type PostCreate = z.infer<typeof postCreateSchema>;
export type PostUpdate = z.infer<typeof postUpdateSchema>;
