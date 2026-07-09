# Bifröst

**Your blog. Your server. Your files. Your rules.**

Bifröst is a self-hosted blogging framework for people who want to _own_ their writing. Posts are plain markdown files on disk — not rows locked inside a database you can't read. Version them with Git. Edit them in your favorite editor or in a beautiful built-in admin. Let AI agents help you write. Deploy the whole thing with one command.

No SaaS lock-in. No monthly fee. No telemetry phoning home. Just you, your words, and a stack you fully control.

> **Where your words cross over.**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)

---

## The name

In Norse mythology, **Bifröst** is the burning rainbow bridge that connects Midgard (the world of humans) to Asgard (the realm of the gods). Bifröst the framework is the bridge between your thoughts and your audience — a seamless path from Markdown to published content.

## Why Bifröst?

Most blogging platforms make you choose: the convenience of a hosted CMS _or_ the freedom of static markdown files. Bifröst refuses the tradeoff.

- **Write in markdown, get a real CMS.** Every post is a `.md` file with YAML frontmatter. Edit them with Vim, VS Code, or the polished admin dashboard — they're the same files. No import/export dance.
- **Your content is a Git repo.** The `content/` directory is version-controlled. Auto-commit on save, browse history, and push to a remote — all from the admin, or from your terminal. Roll back a bad edit in seconds.
- **AI that works _with_ your files.** A built-in AI chat panel helps you draft, rewrite, and polish. An MCP server lets agents like Claude read, write, and search your blog directly.
- **Runs anywhere, cheaply.** A single Next.js process. SQLite means zero database setup. Deploy on a $5 VM or an LXC container with `npm start`.
- **Actually yours.** AGPL-licensed, no accounts on someone else's cloud, no lock-in. Back up the whole site to a ZIP whenever you want.

## Features

| | |
|---|---|
| **Markdown-native authoring** | Posts and pages are `.md` files with YAML frontmatter. File watcher syncs changes instantly. |
| **Full admin dashboard** | Split-pane CodeMirror editor with live preview, media library, user management, and settings. |
| **Git versioning built-in** | Content directory is a Git repo. Auto-commit, history browsing, and push/pull from the admin. |
| **AI writing assistant** | In-editor AI chat with streaming, provider selection, and insert/replace. Backed by OpenCode Zen, OpenCode Go, and DeepSeek. |
| **MCP server** | Model Context Protocol server (HTTP/SSE) so AI agents can read, write, and search your content. |
| **REST API + explorer** | Versioned `/api/v1` with an OpenAPI 3.1 spec and a Swagger UI explorer. |
| **Theme system** | Ships with three themes — Terminal, Magazine, and Read — each with mandatory light/dark mode. |
| **SEO out of the box** | Sitemap, dynamic `robots`, RSS, per-post meta description, OpenGraph, and Twitter cards. |
| **Security first** | JWT auth, bcrypt password hashing, and optional TOTP two-factor authentication with recovery codes. |
| **Pluggable database** | SQLite by default (zero config). PostgreSQL when you need to scale. |
| **Backup & restore** | Export the entire site to a ZIP and restore it from Settings. |
| **Analytics-ready** | Optional privacy-friendly Umami integration, plus a built-in views dashboard. |
| **Plugin system** | Hooks for content parsing, rendering, publishing, and admin extensions. |

## Quick Start

**Prerequisites:** Node.js 22+ and npm 10+.

```bash
npx create-bifrost my-blog
cd my-blog
npm run dev
```

Visit `http://localhost:3000/setup` to create your admin account and configure your blog. That's it — you're live locally.

### Write your first post

Drop a markdown file into `content/`:

```bash
mkdir -p content/posts/hello-world
cat > content/posts/hello-world/index.md << 'EOF'
---
title: Hello, World!
date: 2026-07-06
tags: [welcome]
draft: false
---

Welcome to my blog powered by Bifröst.
EOF
```

…or write it in the admin dashboard at `http://localhost:3000/admin`. Either way, it's the same file — pick whatever fits your flow.

### Deploy

```bash
npm run build
npm start
```

Put it behind nginx or Caddy for TLS and you're done. See the [deployment guide](docs/bifrost/deployment.md) for Docker, systemd, and reverse-proxy examples — including running the MCP server as a service.

## Configuration

Everything lives in `bifrost.config.ts`:

```typescript
import { defineConfig } from "bifrost";

export default defineConfig({
  site: {
    title: "My Blog",
    description: "A blog powered by Bifröst",
    language: "en",
  },
  theme: "bifrost-terminal",
  content: {
    path: "./content",
    postsPerPage: 10,
  },
  ai: {
    defaultProvider: "opencode-zen",
    providers: {
      "opencode-zen": {
        apiKey: process.env.OPENCODE_ZEN_KEY,
        model: "deepseek-v4-pro",
      },
      "opencode-go": {
        apiKey: process.env.OPENCODE_GO_KEY,
        model: "deepseek-v4-flash",
      },
      deepseek: {
        apiKey: process.env.DEEPSEEK_KEY,
        model: "deepseek-chat",
      },
    },
  },
  git: {
    enabled: true,
    autoCommit: true,
    remote: "",
  },
  mcp: {
    enabled: true,
    mode: "stdio",
    port: 3456,
  },
  plugins: [],
});
```

## Tech Stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS v4 · Drizzle ORM · remark/rehype · Shiki · CodeMirror 6 · Model Context Protocol.

## Documentation

Full guides live in [`docs/bifrost/`](docs/bifrost/) and inside the admin at `/admin/docs`:

- [Getting Started](docs/bifrost/getting-started.md)
- [Content & Markdown](docs/bifrost/content.md)
- [Admin Dashboard](docs/bifrost/admin.md)
- [Themes](docs/bifrost/themes.md)
- [Git Versioning](docs/bifrost/git.md)
- [REST API](docs/bifrost/api.md)
- [MCP Server](docs/bifrost/mcp.md)
- [Security & MFA](docs/bifrost/security.md)
- [Backup & Restore](docs/bifrost/backup.md)
- [Plugins](docs/bifrost/plugins.md)
- [Settings](docs/bifrost/settings.md)
- [Deployment](docs/bifrost/deployment.md)
- [License](docs/bifrost/license.md)
- [Credits & Thanks](docs/bifrost/credits.md)

See the [design spec](docs/superpowers/specs/2026-07-06-bifrost-design.md) for architecture and the [changelog](CHANGELOG.md) for release history.

## License

[AGPL-3.0](LICENSE) — GNU Affero General Public License v3.0. Self-host it, modify it, make it yours.
