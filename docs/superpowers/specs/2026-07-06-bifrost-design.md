# Bifröst — Blogging Framework Design Spec

**Date**: 2026-07-06
**Status**: Draft

## Overview

Bifröst is a self-hosted, single-blog blogging framework written in Next.js (App Router). It supports markdown-file-based authoring synced to a pluggable database, a full admin dashboard, a strong REST API with explorer, Next.js native theming with mandatory light/dark support, built-in Git versioning for content, an MCP server for AI agent integration, an AI writing assistant backed by OpenCode Zen, OpenCode Go, and DeepSeek providers, and a plugin system for extensibility.

---

## Architecture

Monolithic Next.js application. All concerns (public blog, admin dashboard, REST API, MCP server) run in a single process. Deployable with one `next start` command on a VM or LXC.

### Project structure

```
bifrost/
├── app/
│   ├── (public)/             # Public blog routes (theme-rendered)
│   │   ├── layout.tsx        # Theme layout wrapper
│   │   ├── page.tsx          # Post list homepage
│   │   ├── [slug]/page.tsx   # Single post view
│   │   └── tag/[tag]/page.tsx # Tag-filtered posts
│   ├── (admin)/              # Admin dashboard (authenticated)
│   │   ├── layout.tsx        # Admin shell
│   │   ├── page.tsx          # Dashboard overview
│   │   ├── posts/            # Post CRUD
│   │   ├── editor/           # Markdown editor (split-pane)
│   │   ├── media/            # Media library
│   │   ├── settings/         # Blog settings
│   │   └── users/            # User management
│   └── api/
│       ├── v1/               # REST API route handlers
│       │   ├── posts/
│       │   ├── media/
│       │   ├── settings/
│       │   ├── auth/
│       │   ├── ai/
│       │   └── git/
│       └── docs/             # Swagger UI explorer route
├── content/                  # Markdown posts + media (canonical filesystem source)
│   └── posts/
│       └── <slug>/
│           ├── index.md
│           └── images/
├── lib/
│   ├── db/                   # Drizzle ORM + adapters
│   ├── content/              # Pipeline: watch, parse, sync
│   ├── md/                   # Remark/Rehype pipeline + syntax highlighting
│   ├── ai/                   # AI provider abstraction
│   ├── auth/                 # JWT auth, middleware
│   ├── git/                  # Git operations for content repo
│   ├── mcp/                  # MCP server implementation
│   └── plugins/              # Plugin registry and lifecycle
├── themes/                   # Installable themes
│   └── default/
│       ├── theme.json
│       ├── layout.tsx
│       ├── post.tsx
│       ├── list.tsx
│       └── styles/
│           ├── light.css
│           └── dark.css
├── plugins/                  # User-installed plugins
│   └── <plugin-name>/
│       ├── index.ts
│       └── package.json
├── public/                   # Static assets
├── bifrost.config.ts         # Site configuration
└── package.json
```

---

## Content Pipeline

### Flow

1. `.md` file written/deleted in `content/posts/<slug>/index.md`
2. `chokidar` file watcher detects change (debounced)
3. Frontmatter (YAML) parsed: `title`, `slug`, `date`, `tags`, `draft`, `author`, custom fields
4. Body rendered to HTML via remark/rehype pipeline
5. Content synced to DB (upsert by slug)
6. Post available via API and public routes

### Two-way sync
- Filesystem is the canonical authoring source
- Admin UI edits write back to `.md` files (keeps filesystem + DB in sync)
- On startup: scan `content/` and ingest all `.md` files into DB
- Missing files created from DB entries if DB was seeded externally

### Markdown features
- GFM (tables, task lists, strikethrough)
- Syntax highlighting via Shiki (bundled as default remark plugin)
- Custom shortcodes for embeds, galleries (extensible via plugins)
- Image paths relative to `content/posts/<slug>/images/`
- `onContentParse` and `onContentRender` plugin hooks

---

## Database Schema (Drizzle ORM)

### Table: `users`
| Column        | Type | Notes                 |
| ------------- | ---- | --------------------- |
| id            | uuid | PK                    |
| email         | text | UNIQUE                |
| password_hash | text |                       |
| display_name  | text |                       |
| avatar_url    | text | nullable              |
| role          | text | admin, editor, author |
| created_at    | text | ISO timestamp         |
| updated_at    | text | ISO timestamp         |

### Table: `posts`
| Column       | Type  | Notes                             |
| ------------ | ----- | --------------------------------- |
| slug         | text  | PK (from filename or frontmatter) |
| title        | text  |                                   |
| content_md   | text  | Raw markdown                      |
| content_html | text  | Rendered HTML                     |
| excerpt      | text  | nullable                          |
| frontmatter  | jsonb | Arbitrary custom fields           |
| status       | text  | draft, published                  |
| author_id    | uuid  | FK → users.id                     |
| published_at | text  | nullable                          |
| created_at   | text  |                                   |
| updated_at   | text  |                                   |

### Table: `tags`
| Column | Type | Notes  |
| ------ | ---- | ------ |
| id     | uuid | PK     |
| name   | text | UNIQUE |
| slug   | text | UNIQUE |

### Table: `post_tags`
| Column    | Type | Notes           |
| --------- | ---- | --------------- |
| post_slug | text | FK → posts.slug |
| tag_id    | uuid | FK → tags.id    |

### Table: `media`
| Column     | Type | Notes                 |
| ---------- | ---- | --------------------- |
| id         | uuid | PK                    |
| filename   | text |                       |
| path       | text | Relative to content/  |
| mime_type  | text |                       |
| size_bytes | int  |                       |
| post_slug  | text | FK → posts (nullable) |
| created_at | text |                       |

### Table: `settings`
| Column | Type  | Notes |
| ------ | ----- | ----- |
| key    | text  | PK    |
| value  | jsonb |       |

### Migrations
- Drizzle Kit generates migration SQL
- Run automatically on startup
- SQLite default; Postgres when `DATABASE_URL` set

---

## Authentication & Authorization

- Email + password login → JWT access (15 min) + refresh (7 day) tokens
- Refresh token stored in httpOnly cookie
- Roles: `author` (own posts), `editor` (all posts), `admin` (full access)
- Next.js middleware guards `/admin/*` and write API routes
- Initial admin user created via setup wizard on first run (`/setup`)

---

## REST API (`/api/v1/`)

### Conventions
- Consistent envelope: `{ data, error, meta }`
- Pagination: `?page=1&limit=10`
- Auth: `Authorization: Bearer <token>`
- OpenAPI 3.1 spec auto-generated, explorer at `/api/docs`

### Endpoints

| Method | Path                   | Auth   | Description          |
| ------ | ---------------------- | ------ | -------------------- |
| `GET`    | `/posts`                 | Public | List posts           |
| `GET`    | `/posts/:slug`           | Public | Single post          |
| `POST`   | `/posts`                 | Editor | Create post          |
| `PUT`    | `/posts/:slug`           | Editor | Update post          |
| `DELETE` | `/posts/:slug`           | Admin  | Delete post          |
| `GET`    | `/media`                 | Public | List media           |
| `POST`   | `/media`                 | Editor | Upload file          |
| `DELETE` | `/media/:id`             | Admin  | Delete file          |
| `GET`    | `/settings`              | Public | Read settings        |
| `PUT`    | `/settings`              | Admin  | Update settings      |
| `POST`   | `/auth/login`            | Public | Login → tokens       |
| `POST`   | `/auth/refresh`          | Public | Refresh access token |
| `GET`    | `/users`                 | Admin  | List users           |
| `POST`   | `/ai/chat`               | Editor | Streaming AI chat    |
| `GET`    | `/ai/models`             | Editor | List AI models       |
| `GET`    | `/git/history?slug=:s`   | Editor | Commit history       |
| `GET`    | `/git/diff?slug=:s&c=:h` | Editor | Commit diff          |
| `POST`   | `/git/push`              | Admin  | Push to remote       |
| `POST`   | `/git/pull`              | Admin  | Pull from remote     |

---

## Admin Dashboard

- Built-in React admin shell under `/admin`
- Dashboard overview: recent posts, drafts, quick stats
- Post editor: split-pane (CodeMirror 6 markdown ↔ live preview)
- AI assistant panel in editor toolbar
- Media library with drag-and-drop upload
- Settings page: site info, theme, AI providers, Git remote
- User management: invite, role assignment, password reset (admin only)

---

## Theme System

### Structure (`themes/<name>/`)
```
theme.json       # name, version, author, screenshots
layout.tsx       # Root layout (header, footer, nav)
post.tsx         # Single post template
list.tsx         # Post list template
page.tsx         # Static pages template
components/      # Theme-specific components
styles/
  light.css      # CSS variables for light mode
  dark.css       # CSS variables for dark mode
```

### Requirements
- Every theme MUST provide both `light.css` and `dark.css`
- Framework provides `useTheme()` React context hook and toggle
- Default follows `prefers-color-scheme`
- Themes access data via `useBifrost()` hook (posts, settings, navigation)
- Selectable in admin settings, switches instantly

---

## Plugin System

### Hook lifecycle
| Hook             | Fires on                 | Use cases                                  |
| ---------------- | ------------------------ | ------------------------------------------ |
| `onContentParse`   | After frontmatter parsed | Auto-excerpt, SEO metadata, read-time      |
| `onContentRender`  | During markdown → HTML   | Custom shortcodes, syntax theme overrides  |
| `onContentPublish` | Post status → published  | Webmentions, social sharing, webhook pings |
| `onServerStart`    | App boot                 | Custom API routes, DB migrations           |
| `adminWidget`      | Admin dashboard renders  | Analytics widget, drafts counter           |

### Plugin structure (`plugins/<name>/`)
```
index.ts        # Registers hooks
components/     # Optional admin widgets
package.json    # Plugin metadata
```

---

## AI Writing Assistant

### Providers
| Provider     | Endpoint                                       | Format            | Auth    |
| ------------ | ---------------------------------------------- | ----------------- | ------- |
| OpenCode Zen | `https://opencode.ai/zen/v1/chat/completions`    | OpenAI-compatible | API key |
| OpenCode Go  | `https://opencode.ai/zen/go/v1/chat/completions` | OpenAI-compatible | API key |
| DeepSeek     | `https://api.deepseek.com/v1/chat/completions`   | OpenAI-compatible | API key |

### Default models
- OpenCode Zen: `deepseek-v4-pro`
- OpenCode Go: `deepseek-v4-flash`
- DeepSeek: `deepseek-chat`

### Actions
Continue writing, improve tone, fix grammar, generate outline, suggest title, summarize, custom prompt

### Behavior
- Responses streamed via SSE
- User can insert, replace, or discard AI output
- Provider + model selectable in editor
- Exposed via `POST /api/v1/ai/chat` and MCP tool `ai_assist`

---

## MCP Server

### Transport
- `stdio` (local CLI/IDE use)
- HTTP/SSE on configurable port (remote/VSCode connections)

### Tools
| Tool            | Description                           |
| --------------- | ------------------------------------- |
| `list_posts`      | List posts (filterable by status/tag) |
| `get_post`        | Read post by slug (MD + HTML)         |
| `create_post`     | Create new post                       |
| `update_post`     | Update post content or frontmatter    |
| `delete_post`     | Delete post                           |
| `list_media`      | List uploaded media                   |
| `upload_media`    | Upload file                           |
| `get_settings`    | Read blog settings                    |
| `update_settings` | Update blog settings                  |
| `search_posts`    | Full-text search across posts         |
| `list_tags`       | List all tags                         |
| `ai_assist`       | Invoke AI on post content             |

### Resources
| URI pattern                        | Returns               |
| ---------------------------------- | --------------------- |
| `bifrost://posts`                    | All post slugs        |
| `bifrost://posts/{slug}`             | Full post as markdown |
| `bifrost://posts/{slug}/html`        | Rendered HTML         |
| `bifrost://posts/{slug}/frontmatter` | Frontmatter as JSON   |
| `bifrost://media`                    | All media file paths  |
| `bifrost://settings`                 | Current site settings |

---

## Git Integration

- `content/` directory initialized as a Git repository on setup
- Auto-commit on post create/edit (message: `"Update post: <title>"`)
- Commit history per post shown in admin (timeline with diffs)
- Push/pull to configured remote from admin or API
- Manual + optional auto-push on save
- Conflict detection: warn if file changed on disk during admin edit

---

## Configuration (`bifrost.config.ts`)

```typescript
export default {
  site: { title, description, language },
  theme: "default",
  content: { path: "./content", postsPerPage: 10 },
  ai: {
    defaultProvider: "opencode-zen",
    providers: {
      "opencode-zen": { apiKey: env("OPENCODE_ZEN_KEY"), model: "deepseek-v4-pro" },
      "opencode-go": { apiKey: env("OPENCODE_GO_KEY"), model: "deepseek-v4-flash" },
      deepseek: { apiKey: env("DEEPSEEK_KEY"), model: "deepseek-chat" },
    },
  },
  git: { enabled: true, autoCommit: true, remote: "" },
  mcp: { enabled: true, mode: "stdio" | "http", port: 3456 },
  plugins: ["sitemap", "rss"],
};
```

---

## Deployment

- Target: VM or LXC
- Runtime: Node.js 22+
- Database: SQLite (zero config) or Postgres via `DATABASE_URL`
- Single process: `next start` (or `node server.js` for MCP server attachment)
- Reverse proxy: nginx/Caddy in front (TLS, static asset caching)
- Setup wizard: first-run experience at `/setup` to create admin user and configure site

### Deployment methods

**Docker Compose** (recommended for portability):

```yaml
# docker-compose.yml
services:
  bifrost:
    image: ghcr.io/mojoaar/bifrost:latest
    ports:
      - "3000:3000"
    volumes:
      - ./content:/app/content
      - ./data:/app/data
      - ./bifrost.config.ts:/app/bifrost.config.ts
    environment:
      - DATABASE_URL=file:/app/data/bifrost.db
      - BIFROST_OPENCODE_ZEN_KEY=${BIFROST_OPENCODE_ZEN_KEY}
      - BIFROST_OPENCODE_GO_KEY=${BIFROST_OPENCODE_GO_KEY}
    restart: unless-stopped
```

**Systemd** (recommended for bare-metal):

```ini
# /etc/systemd/system/bifrost.service
[Unit]
Description=Bifröst Blogging Framework
After=network.target

[Service]
Type=simple
User=bifrost
WorkingDirectory=/opt/bifrost
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

**Reverse proxy** (nginx example):

```nginx
server {
    listen 443 ssl;
    server_name blog.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Technology Choices

| Layer            | Choice                    |
| ---------------- | ------------------------- |
| Framework        | Next.js 16 (App Router)   |
| Language         | TypeScript                |
| ORM              | Drizzle ORM               |
| DB (default)     | SQLite (better-sqlite3)   |
| DB (optional)    | PostgreSQL                |
| Markdown         | remark + rehype           |
| Syntax highlight | Shiki                     |
| Editor           | CodeMirror 6              |
| File watching    | chokidar                  |
| Git              | isomorphic-git or nodegit |
| MCP              | @modelcontextprotocol/sdk |
| AI SDK           | @ai-sdk/openai-compatible |
| Auth             | jose (JWT) + bcrypt       |
| API docs         | OpenAPI 3.1 + Swagger UI  |
| CSS              | Tailwind CSS v4           |

---

## Phased Development Plan

### Phase 0 — Scaffold (v0.1.0)

Project initialization, build tooling, and database foundation.

- Init Next.js 16 + TypeScript + Tailwind CSS v4 project
- Configure Drizzle ORM with SQLite adapter, define schema, run migrations
- Implement `bifrost.config.ts` loading and validation
- Create directory structure (content/, themes/, plugins/, lib/)
- Set up Vitest, ESLint, Prettier
- Create `VERSION` file

### Phase 1 — Content Engine (v0.2.0)

Markdown parsing, file watching, content sync.

- Remark/rehype pipeline with GFM support
- Shiki syntax highlighting as default rehype plugin
- chokidar file watcher on `content/posts/`
- Content sync: parse frontmatter → render HTML → upsert DB → write-back `.md`
- Post CRUD API: `GET/POST /api/v1/posts`, `GET/PUT/DELETE /api/v1/posts/:slug`
- Tag endpoints: `GET /api/v1/tags`

### Phase 2 — Auth & Admin (v0.3.0)

Authentication, admin dashboard, post editor.

- JWT auth: login, refresh, middleware for `/admin/*` and write API routes
- User model, password hashing (bcrypt), role-based access
- Admin layout shell with navigation
- Post list, create, edit pages in admin
- CodeMirror 6 split-pane editor (markdown + live preview)

### Phase 3 — Public Blog & Themes (v0.4.0)

Public-facing blog and theme system.

- Theme system: registry, loader, default theme
- Light/dark mode via CSS variables, `useTheme()` hook, toggle
- Public routes: homepage (post list + pagination), `/[slug]` (single post), `/tag/[tag]`
- `useBifrost()` data hook for themes
- SEO basics: meta tags, RSS feed

### Phase 4 — Extensions (v0.5.0)

Plugin system, AI assistant, API explorer.

- Plugin registry and lifecycle hooks (`onContentParse`, `onContentRender`, `onContentPublish`, `onServerStart`, `adminWidget`)
- AI provider abstraction (OpenCode Zen, OpenCode Go, DeepSeek)
- Streaming AI chat in editor (SSE)
- AI actions: continue, improve tone, fix grammar, outline, title, summarize
- OpenAPI 3.1 spec generation and Swagger UI explorer at `/api/docs`

### Phase 5 — MCP & Git (v0.6.0)

MCP server and built-in Git versioning.

- MCP server (stdio + HTTP/SSE transport)
- MCP tools: list_posts, get_post, create_post, update_post, delete_post, list_media, upload_media, get_settings, update_settings, search_posts, list_tags, ai_assist
- MCP resources: `bifrost://posts`, `bifrost://posts/{slug}`, etc.
- Git repo init in `content/` on setup
- Auto-commit on post create/edit
- Commit history timeline and diff view in admin
- Push/pull to remote from admin and API

### Phase 6 — Polish & Ship (v0.7.0 → v1.0.0)

Setup wizard, deployment, testing, and release.

- First-run setup wizard at `/setup` (admin user, site config)
- Media library with drag-and-drop upload
- User management pages (admin)
- Settings pages (site info, theme, AI providers, Git remote)
- Deployment configs (Docker, nginx/Caddy examples)
- E2E tests for critical paths
- Bug fixes, performance polish
- Tag v1.0.0 release

---

## Project Management

### Versioning

Bifröst follows [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH). The version is tracked in `package.json` and a `VERSION` file at the project root. Version bumps are managed as part of the development workflow — the agent controls when and how versions advance based on the nature of changes (MAJOR for breaking, MINOR for features, PATCH for fixes).

### Changelog

All notable changes are recorded in `CHANGELOG.md` following the [Keep a Changelog](https://keepachangelog.com/) format. Entries are grouped under `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, and `Security`. Each release gets its own section. The changelog is updated on every version bump.

### Package freshness

Dependencies are kept current. A `npx npm-check-updates` audit runs before each release. Packages pinned to specific major versions in `package.json` to avoid accidental breaking changes. Dependabot or similar configured for automated PRs on security patches.

### README

`README.md` provides: project description, quick start, features list, configuration guide, deployment instructions, and links to docs.

### License

[GNU Affero General Public License v3.0 (AGPL-3.0)](https://www.gnu.org/licenses/agpl-3.0.en.html). The `LICENSE` file contains the full license text. All source files carry the AGPL-3.0 header.
