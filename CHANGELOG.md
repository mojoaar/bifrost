# Changelog

All notable changes to Bifröst are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] — 2026-07-07

### Added
- Bifröst Terminal theme with full CSS token system (bg, text, border, accent, surface, code, fonts, sizes, spacing, radii, transitions).
- Light/dark mode via `bifrost_theme` cookie (SSR-safe, no FOUC, syncs across public + admin).
- 6 bundled monospace fonts (JetBrains Mono Variable, Fira Code Variable, IBM Plex Mono, Source Code Pro Variable, Roboto Mono, Inconsolata) with settings picker.
- Lucide icon library across entire admin UI (sidebar nav, editor toolbar, action buttons, status indicators).
- Command palette (Cmd+K / Ctrl+K) with fuzzy search across navigation, posts, and actions.
- Shiki dual-theme syntax highlighting (GitHub light/dark) for markdown code blocks.
- Content Width setting in admin Appearance (Narrow 672px / Default 768px / Wide 896px).
- Date Format (US/EU/ISO) and Time Format (12h/24h) settings with `useDateTimeFormat()` hook.
- Code block copy button on hover (clipboard API, checkmark feedback).
- User CRUD in admin (create/edit/delete users from `/admin/users`).
- Frontmatter auto-insertion on new post page (YAML header with title, date, tags).
- Dashboard stat cards (Total Posts, Published, Drafts, Media) with tabular mono numbers.
- Admin Posts list now shows both **Created** and **Updated** date columns.
- Public post list groups posts by year.
- Reading time estimate on post template (220 wpm).
- Admin tab title reads `site.title` from settings (`<title> | ~/admin`).
- Danger Zone: Remove demo data from settings (wipes posts, media, git history).
- Theme picker dropdown in settings (select from installed themes).
- Display Name field in setup wizard (falls back to email username).
- Access token auto-refresh via `authFetch()` (detects 401, refreshes, retries).
- Footer GitHub attribution link.
- API Explorer link in admin sidebar.
- Themes admin page with card grid layout.

### Changed
- Access token expiry: 15 minutes → 1 hour.
- Theme toggle requires single click (was 2-click bug from stale React state).
- Public post list orders by `createdAt` (was `updatedAt`, which jumped on edit).
- Markdown editor toolbar: 8 tools → 14 tools (added H1, H3, strikethrough, ordered list, table, horizontal rule).
- Admin UI uses shared primitives everywhere (Button variants, Field/Input/Select, Table/THead/TR/TH/TD, Card, StatusPill, CodeBlock, Path).
- Admin sidebar shows active page indicator (accent dot) and `$ bifröst` wordmark.
- Admin TopBar shows `~/admin/posts/new` breadcrumb-style path.
- Content watcher skips DB write when rendered HTML hasn't changed (avoids spurious `updatedAt` bumps on server restart).
- Preview iframe inherits parent theme and live-syncs `data-theme` on toggle via MutationObserver.
- `app/admin/layout.tsx` split into server component (cookie read, metadata) + client shell (`AdminShell`).

### Fixed
- Hydration mismatch on public post page from client-side `localStorage` `isAdmin` check (now server-rendered via cookie).
- Post card click target: entire card surface now navigates (z-stacking + `pointer-events-none` on inner content).
- Editor panel couldn't scroll on long posts (`min-h-0 overflow-auto` on editor wrapper).
- Preview iframe always showed light background (now wraps in full HTML doc with both theme token blocks).
- Button size mismatches: Create + AI Assist in editor toolbar now share `size="sm"`.
- `renderMarkdown()` now strips YAML frontmatter before processing (matches `parseMarkdown()`).
- Settings save didn't apply theme mode until page refresh (now syncs `data-theme` + cookie instantly).
- Root layout `<title>` was static "Bifröst" instead of reading `site.title` from DB.
- Swagger UI "90s look" replaced with self-hosted, properly themed dark mode.

## [1.0.0] — 2026-07-06

### Added
- Setup wizard at /setup for first-run admin user and site config.
- Media library admin page with drag-and-drop upload.
- User management admin page (list users with roles).
- Settings admin page (site info, theme, git remote).
- Dockerfile for production deployment.
- Full REST API with OpenAPI 3.1 spec and Swagger UI.
- Admin dashboard with CodeMirror 6 split-pane editor.
- Public blog with theme system and light/dark mode.
- Plugin system with 5 lifecycle hooks.
- AI writing assistant (OpenCode Zen/Go, DeepSeek).
- MCP server (stdio + HTTP/SSE) with 12 tools and 6 resources.
- Built-in Git versioning for content directory.
- JWT authentication with role-based access control.
- Markdown content engine with GFM and syntax highlighting.

### Shipping
- 75+ tests, typecheck clean, linted.
- Docker and systemd deployment configs.
- Version controlled content with auto-commit.

## [0.6.0] — 2026-07-06

### Added
- MCP server with stdio and HTTP/SSE transports.
- 12 MCP tools: list_posts, get_post, create_post, update_post, delete_post, list_media, upload_media, get_settings, update_settings, search_posts, list_tags, ai_assist.
- 6 MCP resources: bifrost://posts, bifrost://posts/{slug}, bifrost://posts/{slug}/html, bifrost://posts/{slug}/frontmatter, bifrost://media, bifrost://settings.
- Git integration: init, auto-commit, history, diff, push, pull.
- Git API routes: GET /api/v1/git/history, GET /api/v1/git/diff, POST /api/v1/git/push, POST /api/v1/git/pull.
- Git admin pages: commit timeline and diff viewer.
- Auto-commit wired into content watcher and post API.

## [0.3.0] - 2026-07-06

### Added

- JWT authentication with access (15min) and refresh (7d httpOnly cookie) tokens.
- Password hashing with bcrypt (12 salt rounds).
- Auth API routes: POST /api/v1/auth/login, POST /api/v1/auth/refresh.
- Next.js middleware protecting /admin/* and write API routes.
- Admin layout with sidebar navigation.
- Admin login page with email/password form.
- Admin posts list page with status badges.
- CodeMirror 6 split-pane editor with one-dark theme.
- Live markdown preview via server-side rendering endpoint.
- Admin post creation and editing pages.

## [0.5.0] — 2026-07-06

### Added
- Plugin system with 5 lifecycle hooks (onContentParse, onContentRender, onContentPublish, onServerStart, adminWidget).
- Plugin registry with filesystem-based loader.
- AI provider abstraction supporting OpenCode Zen, OpenCode Go, and DeepSeek.
- Streaming AI chat API (SSE) with actions: continue, improve, grammar, outline, title, summarize.
- AI assistant panel in the admin post editor with insert/replace/discard controls.
- OpenAPI 3.1 specification generation.
- Swagger UI API explorer at /api/docs.

## [0.4.0] — 2026-07-06

### Added
- Theme registry with types, loader, and validation.
- Default theme with light/dark CSS variables, layout, post template, and list template.
- ThemeProvider context and useTheme hook (localStorage + prefers-color-scheme).
- Light/dark mode toggle in default theme header.
- Public blog homepage showing published posts.
- Single post route at /[slug] with server-rendered metadata.
- Tag-filtered post list at /tag/[tag].
- RSS 2.0 feed at /rss.xml.

## [0.2.0] - 2026-07-06

### Added

- Markdown parser with frontmatter (YAML) support and GFM rendering via remark/rehype.
- Content file watcher (chokidar) with two-way filesystem to database sync.
- Posts CRUD API (`GET/POST /api/v1/posts`, `GET/PUT/DELETE /api/v1/posts/:slug`).
- Tags CRUD API (`GET/POST /api/v1/tags`, `GET/PUT/DELETE /api/v1/tags/:id`).
- Media upload endpoint (`POST /api/v1/media/upload`).
- API response helpers with `{ data, error, meta }` envelope format.
- Zod validation schemas for posts and tags.
- App startup instrumentation (content ingestion + file watcher).

## [0.1.0] - 2026-07-06

### Added

- Initial design spec for Bifröst blogging framework.
- Project scaffolding: README, CHANGELOG, LICENSE.
- Next.js 16 project initialization with TypeScript strict mode.
- Tailwind CSS v4 integration with PostCSS.
- Drizzle ORM with SQLite adapter and complete schema (users, posts, tags, post_tags, media, settings).
- Config loading system with defaults and deep merge.
- Typed environment variable helper.
- Directory structure for all planned modules.
- Vitest, ESLint, and Prettier configuration.
