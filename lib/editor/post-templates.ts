/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import "server-only";

import fs from "fs";
import path from "path";
import { postTemplatesDir } from "@/lib/paths";

export interface PostTemplate {
  name: string;
  title: string;
  content: string;
}

function nameFromFile(file: string): string {
  return file
    .replace(/\.md$/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function titleFromFile(file: string): string {
  return file.replace(/\.md$/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function loadPostTemplates(): PostTemplate[] {
  const dir = postTemplatesDir();
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  if (files.length === 0) {
    return [{ name: "Standard post", title: "", content: "" }];
  }

  return files
    .sort((a, b) => {
      if (a === "standard.md") return -1;
      if (b === "standard.md") return 1;
      return a.localeCompare(b);
    })
    .map((file) => ({
      name: nameFromFile(file),
      title: titleFromFile(file),
      content: fs.readFileSync(path.join(dir, file), "utf-8"),
    }));
}

export function savePostTemplate(name: string, content: string): void {
  const dir = postTemplatesDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const file = name.toLowerCase().replace(/\s+/g, "-") + ".md";
  fs.writeFileSync(path.join(dir, file), content, "utf-8");
}

export function createPostTemplate(name: string): PostTemplate {
  const dir = postTemplatesDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const file = name.toLowerCase().replace(/\s+/g, "-") + ".md";
  const filePath = path.join(dir, file);

  if (fs.existsSync(filePath)) {
    throw new Error(`Template "${name}" already exists`);
  }

  fs.writeFileSync(filePath, "", "utf-8");

  return {
    name,
    title: name,
    content: "",
  };
}

export function deletePostTemplate(name: string): void {
  const dir = postTemplatesDir();
  const file = name.toLowerCase().replace(/\s+/g, "-") + ".md";
  const filePath = path.join(dir, file);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Template "${name}" not found`);
  }

  fs.unlinkSync(filePath);
}
