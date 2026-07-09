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
import { renderMarkdown } from "@/lib/md/parser";
import { writePostToFilesystem } from "@/lib/content/sync";
import { sql } from "drizzle-orm";

interface SeedPost {
  slug: string;
  title: string;
  tags: string[];
  content: string;
}

const SEED_POSTS: SeedPost[] = [
  {
    slug: "getting-started-with-bifrost",
    title: "Getting Started with Bifröst",
    tags: ["guide", "bifrost"],
    content: `Welcome to Bifröst, your self-hosted blogging framework built on Next.js.

## What is Bifröst?

Bifröst is a markdown-native blogging platform designed for developers. Write posts as \`.md\` files with YAML frontmatter, or use the built-in admin editor with CodeMirror 6 and live preview.

## Features

- **Markdown-first**: Every post is a \`.md\` file. Edit with any editor.
- **Git versioned**: Your content directory is a Git repository with auto-commit.
- **Light & dark mode**: Built-in theme system with CSS variables.
- **MCP server**: AI agents can read and write your content via Model Context Protocol.
- **REST API**: Full [OpenAPI 3.1](/api/docs) spec with Swagger UI explorer.

## Quick Start

\`\`\`bash
# Create your first post via the API
curl -X POST http://localhost:3000/api/v1/posts \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <token>" \\
  -d '{"slug":"hello","title":"Hello","content":"## My first post"}'
\`\`\`

Or head over to \`/admin/posts/new\` and use the editor.

Happy blogging!
`,
  },
  {
    slug: "markdown-guide",
    title: "A Guide to Markdown in Bifröst",
    tags: ["guide", "markdown"],
    content: `Bifröst supports full GitHub-Flavored Markdown (GFM) with syntax highlighting.

## Formatting

- **Bold** and *italic* text
- ~~Strikethroughs~~
- \`inline code\`

## Code Blocks

\`\`\`typescript
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

\`\`\`python
def fibonacci(n: int) -> list[int]:
    a, b = 0, 1
    result = []
    for _ in range(n):
        result.append(a)
        a, b = b, a + b
    return result
\`\`\`

## Tables

| Feature    | Status      |
| ---------- | ----------- |
| GFM tables | Supported   |
| Task lists | Supported   |
| Code fence | Supported   |

## Task Lists

- [x] Install Bifröst
- [x] Create admin account
- [ ] Write first post
- [ ] Publish

## Blockquotes

> The best way to predict the future is to invent it.
> — Alan Kay

## Links

Check out [Bifröst on GitHub](https://github.com/mojoaar/bifrost).
`,
  },
  {
    slug: "building-plugins",
    title: "Building Plugins for Bifröst",
    tags: ["guide", "plugins"],
    content: `Bifröst has a plugin system with five lifecycle hooks. Plugins live in the \`plugins/\` directory.

## Plugin Structure

\`\`\`
plugins/my-plugin/
  index.ts
  package.json
\`\`\`

## Available Hooks

| Hook               | Fires on                  | Use case                 |
| ------------------ | ------------------------- | ------------------------ |
| \`onContentParse\`   | After frontmatter parsed  | Add SEO metadata, excerpts |
| \`onContentRender\`  | During markdown → HTML    | Custom syntax highlighters |
| \`onContentPublish\` | Post status → published   | Webmentions, social sharing |
| \`onServerStart\`    | App boot                  | Register custom routes     |
| \`adminWidget\`      | Admin dashboard renders   | Analytics, quick stats     |

## Example Plugin

\`\`\`typescript
import type { BifrostPlugin } from "@/lib/plugins/types";

const plugin: BifrostPlugin = {
  name: "reading-time",
  hooks: {
    onContentParse(parsed) {
      const words = parsed.body.split(/\\s+/).length;
      const minutes = Math.ceil(words / 200);
      parsed.frontmatter.readingTime = \`\${minutes} min read\`;
      return parsed;
    },
  },
};

export default plugin;
\`\`\`

## Loading Plugins

Place your plugin in \`plugins/<name>/\` and it will be auto-discovered on startup. No configuration needed.
`,
  },
  {
    slug: "deploying-bifrost",
    title: "Deploying Bifröst to Production",
    tags: ["guide", "deployment"],
    content: `Bifröst ships with a Dockerfile and Systemd service file for easy deployment.

## Docker (recommended)

\`\`\`yaml
# docker-compose.yml
services:
  bifrost:
    image: ghcr.io/mojoaar/bifrost:latest
    ports:
      - "3000:3000"
    volumes:
      - ./content:/app/content
      - ./data:/app/data
    environment:
      - BIFROST_JWT_SECRET=your-secret-key
    restart: unless-stopped
\`\`\`

## Bare Metal (Systemd)

\`\`\`ini
[Unit]
Description=Bifröst
After=network.target

[Service]
Type=simple
User=bifrost
WorkingDirectory=/opt/bifrost
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3000
\`\`\`

## Environment Variables

| Variable              | Purpose            | Default            |
| --------------------- | ------------------ | ------------------ |
| \`BIFROST_JWT_SECRET\`  | Access token signing | dev secret         |
| \`DATABASE_URL\`        | Database path      | \`data/bifrost.db\`   |
| \`NODE_ENV\`            | Runtime mode       | \`development\`       |

## Tips

- Set a strong \`BIFROST_JWT_SECRET\` in production
- Mount \`content/\` and \`data/\` as persistent volumes
- Use a reverse proxy (nginx, Caddy) for TLS termination
- The setup wizard at \`/setup\` handles first-run configuration
`,
  },
  {
    slug: "using-the-mcp-server",
    title: "Using the MCP Server",
    tags: ["guide", "mcp"],
    content: `Bifröst includes a built-in MCP (Model Context Protocol) server for AI agent integration.

## Transport Modes

- **HTTP/SSE**: Run \`npm run mcp:start\` to serve the MCP endpoint at \`http://localhost:3456/sse\`. The port is configurable via \`mcp.port\` in \`bifrost.config.ts\`.
- **stdio**: For local CLI use, the server can be launched over stdio (set \`mcp.mode\` in \`bifrost.config.ts\`).

## Connecting AI Agents

Start the server first with \`npm run mcp:start\`, then point your agent at \`http://localhost:3456/sse\`.

### opencode

Add Bifröst to your \`opencode.json\`:

\`\`\`json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "bifrost": {
      "type": "remote",
      "url": "http://localhost:3456/sse",
      "enabled": true
    }
  }
}
\`\`\`

### Claude Code

Register the server from the CLI:

\`\`\`bash
claude mcp add --transport sse bifrost http://localhost:3456/sse
\`\`\`

### Kilo Code

Use the **MCP Servers** tab in the extension settings, or add it under the \`mcp\` key in \`kilo.jsonc\` (project root, or \`~/.config/kilo/kilo.jsonc\` for all projects):

\`\`\`json
{
  "mcp": {
    "bifrost": {
      "type": "remote",
      "url": "http://localhost:3456/sse",
      "enabled": true
    }
  }
}
\`\`\`

Once connected, the agent can call any of the tools below.

## Available Tools

| Tool              | Description                         |
| ----------------- | ----------------------------------- |
| \`list_posts\`      | List posts (filter by status/tag)   |
| \`get_post\`        | Read a post by slug (MD + HTML)    |
| \`create_post\`     | Create a new post                  |
| \`update_post\`     | Update content or frontmatter      |
| \`delete_post\`     | Delete a post                      |
| \`search_posts\`    | Full-text search across posts      |
| \`list_tags\`       | List all tags                      |
| \`get_settings\`    | Read blog settings                 |
| \`update_settings\` | Update blog settings               |
| \`ai_assist\`       | Invoke AI on post content          |

## Resources

| URI pattern                        | Returns               |
| ---------------------------------- | --------------------- |
| \`bifrost://posts\`                  | All post slugs        |
| \`bifrost://posts/{slug}\`           | Full post as markdown |
| \`bifrost://posts/{slug}/html\`      | Rendered HTML         |
| \`bifrost://posts/{slug}/frontmatter\` | Frontmatter as JSON   |
| \`bifrost://media\`                  | All media file paths  |
| \`bifrost://settings\`               | Current site settings |

Connect your AI agent to Bifröst and let it manage your blog content programmatically.
`,
  },
  {
    slug: "how-bifrost-stores-content",
    title: "How Bifröst Stores Your Content",
    tags: ["guide", "content", "git"],
    content: `Bifröst is markdown-native: every post is a real file on disk, not a row hidden inside a database. Understanding this model is the key to working with Bifröst effectively.

## Files First

Each post lives at:

\`\`\`
content/posts/<slug>/index.md
\`\`\`

The file is plain Markdown with a YAML frontmatter block:

\`\`\`markdown
---
title: My First Post
date: 2026-07-08
tags: [guide, welcome]
---

Your post body goes here.
\`\`\`

You can edit these files with any editor, commit them with Git, or generate them from a script. Bifröst treats the filesystem as the source of truth.

## The Database Mirror

A SQLite database (\`data/bifrost.db\`) mirrors your content for fast queries, full-text search, and tag lookups. You never edit it directly — Bifröst keeps it in sync automatically:

- **Disk → DB**: A file watcher notices when a \`.md\` file changes and re-ingests it.
- **DB → Disk**: Saving from the admin editor or API writes the file back out.

Because the file is authoritative, you can delete the database and rebuild it from your content at any time.

## Version Control Built In

Your \`content/\` directory is its own Git repository. When Git integration is enabled, Bifröst auto-commits every change, giving you a full history of every post — who changed what, and when. Point it at a remote and your writing is backed up with a \`git push\`.

## Drafts vs. Published

A post's \`status\` controls visibility. Drafts are hidden from the public site but visible in the admin. Flip a post to \`published\` when it is ready for the world.
`,
  },
  {
    slug: "touring-the-admin",
    title: "Touring the Bifröst Admin",
    tags: ["guide", "admin"],
    content: `The Bifröst admin lives at \`/admin\` and is where you manage everything without touching a terminal.

## Dashboard

The landing page shows post counts, recent activity, and a System panel reporting your version, active theme, and Git status at a glance.

## The Editor

Writing happens in a CodeMirror 6 editor with:

- Syntax-highlighted Markdown
- A live preview beside your text
- Frontmatter fields for title, tags, and status
- Inline media uploads

Head to \`/admin/posts/new\` to start writing, or open any existing post to edit it.

## Media Library

Upload images and files under \`/admin/media\`. Each upload is stored in \`content/media/\` and served at a stable URL you can drop into any post.

## Profile

Manage your own account at \`/admin/profile\` — set a display name, upload a round avatar, write a short bio, and change your password. Your name, avatar, and bio appear on the posts you publish.

## Settings

\`/admin/settings\` controls the whole site: title and description, light/dark appearance, date and time formats, and Git synchronization options.
`,
  },
  {
    slug: "the-rest-api",
    title: "The Bifröst REST API",
    tags: ["guide", "api"],
    content: `Everything you can do in the admin, you can do over HTTP. Bifröst exposes a versioned REST API under \`/api/v1\`.

## Interactive Explorer

The full [OpenAPI 3.1](/api/docs) specification is browsable with Swagger UI. Try requests live, inspect schemas, and copy ready-made \`curl\` commands.

## Response Envelope

Every endpoint returns a consistent JSON envelope:

\`\`\`json
{
  "data": { "...": "..." },
  "error": null,
  "meta": { "...": "..." }
}
\`\`\`

On failure, \`data\` is \`null\` and \`error\` carries a message.

## Authentication

Protected endpoints expect a bearer token:

\`\`\`bash
curl http://localhost:3000/api/v1/posts \\
  -H "Authorization: Bearer <access-token>"
\`\`\`

Log in via \`/api/v1/auth/login\` to receive a short-lived access token and a refresh token. When the access token expires, exchange the refresh token at \`/api/v1/auth/refresh\` for a new one.

## Managing Posts

\`\`\`bash
# Create a post
curl -X POST http://localhost:3000/api/v1/posts \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <access-token>" \\
  -d '{"slug":"hello","title":"Hello","content":"## My first post"}'
\`\`\`

The same routes support reading, updating, and deleting posts — and because writes flow back to disk, an API call and a Git commit produce the same result.
`,
  },
];

export const SEED_SLUGS: string[] = SEED_POSTS.map((p) => p.slug);

export async function seedPosts(authorId: string): Promise<void> {
  const now = nowISO();

  for (let i = 0; i < SEED_POSTS.length; i++) {
    const post = SEED_POSTS[i]!;
    const date = new Date(Date.now() - (SEED_POSTS.length - i) * 86400000).toISOString();

    const existing = db
      .select({ slug: posts.slug })
      .from(posts)
      .where(sql`${posts.slug} = ${post.slug}`)
      .get();

    if (existing) continue;

    const { html, excerpt } = await renderMarkdown(post.content);
    const frontmatter: Record<string, unknown> = { title: post.title, date, tags: post.tags };

    await writePostToFilesystem(post.slug, post.content, frontmatter);

    db.insert(posts)
      .values({
        slug: post.slug,
        title: post.title,
        contentMd: post.content,
        contentHtml: html,
        excerpt,
        frontmatter: JSON.stringify(frontmatter),
        status: "published",
        authorId,
        publishedAt: date,
        createdAt: date,
        updatedAt: now,
      })
      .run();
  }
}
