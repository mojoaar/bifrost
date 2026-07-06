# Bifröst

A self-hosted blogging framework with markdown-native authoring, built on Next.js.

## Features

- **Markdown-native**: Write posts as `.md` files with YAML frontmatter. Edit with any editor, or use the built-in admin.
- **Pluggable database**: SQLite by default (zero config). PostgreSQL when you need scale.
- **Full admin dashboard**: Split-pane markdown editor, media library, user management, settings.
- **REST API**: Strong API with OpenAPI 3.1 spec and Swagger UI explorer.
- **MCP server**: AI agents can read, write, and search your blog content via Model Context Protocol.
- **AI writing assistant**: Powered by OpenCode Zen, OpenCode Go, and DeepSeek.
- **Theme system**: Next.js native theming with mandatory light/dark mode support.
- **Git built-in**: Content directory is a Git repo. Auto-commit, version history, push/pull from admin.
- **Plugin system**: Extend the platform with hooks for content parsing, rendering, publishing, and admin.
- **Self-hosted**: One command deploy on any VM or LXC.

## Quick Start

### Prerequisites

- Node.js 22+
- npm 10+

### Install

```bash
npx create-bifrost my-blog
cd my-blog
npm run dev
```

Visit `http://localhost:3000/setup` to create your admin account and configure your blog.

### Write your first post

Create a markdown file:

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

Or use the admin dashboard at `http://localhost:3000/admin`.

### Deploy

```bash
npm run build
npm start
```

Place behind nginx or Caddy for TLS. That's it.

## Configuration

`bifrost.config.ts`:

```typescript
import { defineConfig } from "bifrost";

export default defineConfig({
  site: {
    title: "My Blog",
    description: "A blog powered by Bifröst",
    language: "en",
  },
  theme: "default",
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

## Documentation

- [Design Spec](docs/superpowers/specs/2026-07-06-bifrost-design.md)
- [Changelog](CHANGELOG.md)

## License

[AGPL-3.0](LICENSE) — GNU Affero General Public License v3.0
