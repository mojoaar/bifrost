/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { z } from "zod";

export const pageCreateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case"),
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  frontmatter: z.record(z.string(), z.unknown()).optional().default({}),
  status: z.enum(["draft", "published"]).optional().default("draft"),
  showInNav: z.boolean().optional().default(false),
  navOrder: z.number().int().optional().default(0),
  authorId: z.string().uuid().optional(),
});

export const pageUpdateSchema = pageCreateSchema.partial().omit({ slug: true });

export type PageCreate = z.infer<typeof pageCreateSchema>;
export type PageUpdate = z.infer<typeof pageUpdateSchema>;
