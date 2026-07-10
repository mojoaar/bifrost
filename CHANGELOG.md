# Changelog

All notable changes to Bifröst are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.35.5] — 2026-07-10

### Fixed

- The admin sidebar version badge now stays pinned to the lower-left corner of the viewport on tall pages (API Explorer, Docs, Settings, Profile, Plugins, etc.). The desktop sidebar is now sticky to the viewport height with its own scrollable nav, so the `v{version}` footer no longer scrolls off the bottom of long content.

## [1.35.4] — 2026-07-10

### Fixed

- Silenced the three remaining `<img>` lint warnings (admin Media grid, and the Image Picker preview and modal thumbnails) with the project-wide `@next/next/no-img-element` suppression, matching the convention already used across the themes and other admin components. `npm run lint` is now warning-free.

## [1.35.3] — 2026-07-10

### Fixed

- Removed the remaining whitespace above the first heading on the admin Docs page. The global unlayered heading rule was overriding the Tailwind margin reset (now forced with `!important`), and the content pane's top padding was reduced to align with the sidebar.

## [1.35.2] — 2026-07-10

### Fixed

- Removed the excess whitespace above the first heading on the admin Docs page by resetting the top margin on the rendered content's first element.

## [1.35.1] — 2026-07-10

### Fixed

- Aligned the admin page headers on Audit Log, API Explorer, and Docs to the standard title plus terminal-command subtitle used across the rest of `/admin`.

## [1.35.0] — 2026-07-10

### Added

- MCP posts and pages now support the `scheduled` status with a `scheduledAt` timestamp, matching the REST API.
- MCP `list_posts` and `list_pages` support pagination (`page`) and return newest-first.
- MCP `update_post` can now replace a post's tags via `tagIds`.
- MCP `update_settings` validates setting keys and refuses to overwrite a secret with the redacted placeholder.
- New MCP `list_users` tool for reading accounts (never exposes password hashes).
- MCP HTTP transport now enforces a per-IP rate limit (120 requests/minute).
- A dedicated stdio entry point (`build:mcp:stdio` / `mcp:start:stdio`) for running the MCP server over stdio.

### Fixed

- MCP `bifrost://posts/{slug}/html` and `bifrost://posts/{slug}/frontmatter` resources now resolve correctly instead of falling through to the markdown handler.
- MCP `upload_media` now stores files through the canonical media pipeline (relative paths, MIME allowlist, size cap, and image variants) instead of writing absolute paths.
- MCP `create_post` now merges frontmatter embedded in the markdown body and writes the post atomically.

### Security

- All MCP mutations (post, page, settings, and media changes) are now recorded in the audit log.

## [1.34.1] — 2026-07-10

### Fixed

- The admin audit log table now has rounded corners inside a bordered frame, consistent with the other admin tables.
- Fixed the misaligned form fields on the new-post page — Title, Slug, Status, Template, featured image, and SEO now follow the same layout as the edit-post page.

## [1.34.0] — 2026-07-10

### Added

- Responsive images: uploading a PNG, JPEG, or WebP now generates resized WebP variants (320/640/1280px) plus a ~400px thumbnail. Featured images render with a `srcset`, and the admin media grid and image picker use thumbnails. SVG and GIF are stored as-is.
- `scripts/backfill-media.ts` to generate variants for images uploaded before this feature.

## [1.33.0] — 2026-07-10

### Changed

- Themes now read site settings and navigation from a shared `useBifrost()` context hydrated once on the server, instead of each theme header/footer fetching `/api/v1/settings` and `/api/v1/pages` on the client. This removes redundant client requests and renders navigation immediately.

## [1.32.0] — 2026-07-10

### Added

- **Draft preview links** — share a private, no-login preview of an unpublished post via a secret `?preview=<token>` URL. Links expire after 7 days, are marked `noindex`, can be revoked, and clear automatically when the post is published.

## [1.31.1] — 2026-07-09

### Fixed

- Deleting a post file with tags no longer throws a foreign-key error in the content watcher — tag associations are now removed before the post row.
- Login audit entries now record a target (the account, by email), so successful and failed logins show what was being accessed.

## [1.31.0] — 2026-07-09

### Added

- **Structured logging** — a scoped logger (`lib/logger.ts`) with configurable levels via `BIFROST_LOG_LEVEL` (`debug`/`info`/`warn`/`error`) and optional machine-readable output via `BIFROST_LOG_FORMAT=json` for log aggregators. Existing `console.*` calls now route through scoped loggers.

## [1.30.0] — 2026-07-09

### Added

- **Word count in the editor** — the editor status bar now shows the live word count and estimated reading time.
- **Heading anchor links** — rendered headings get stable `id` slugs and a hover anchor link for easy deep-linking.
- **Reading progress bar** — an optional scroll-driven progress bar on post pages (all three themes), toggled by the new **Show reading progress bar** appearance setting.
- **Related posts** — up to three posts sharing at least one tag are shown at the bottom of each post (all three themes), toggled by the new **Show related posts** appearance setting.
- **Auto-generated Open Graph images** — posts and pages without a `featuredImage` now fall back to a branded, generated OG image via `/og`.

### Changed

- Post and page excerpts now fall back to an auto-generated summary when no `excerpt` is set in frontmatter.

## [1.29.0] — 2026-07-09

### Added

- **Public search API** — a new public `GET /api/v1/search?q=` endpoint searches published post titles and content, returns paginated results, and is rate limited to 30 requests per minute. Backend only for now; a search UI will follow in a later release.

## [1.28.0] — 2026-07-09

### Added

- **Scheduled post publishing** — posts with `status: scheduled` are now automatically promoted to `published` once their `scheduledAt` time passes. A background runner checks every 60 seconds (and once at startup), updates the database, and rewrites the markdown file to drop the `scheduledAt` frontmatter so the file and database stay in sync.

### Fixed

- Tag pages now use the **active theme** instead of always rendering with `bifrost-terminal`.
- Tag pages now show only **published** posts (drafts and scheduled posts no longer leak) and support **pagination** like the homepage.

## [1.27.2] — 2026-07-09

### Fixed

- Audit Log now consistently displays the actor's **email** instead of sometimes showing a raw user ID. `getClientContext` resolves the email at record time, the audit API backfills it for existing rows via a join, and the table shows the actor type (`system`/`anonymous`) rather than an ID when no email applies.

## [1.27.1] — 2026-07-09

### Fixed

- Development mode no longer breaks with a CSP `eval()` error — the Content-Security-Policy now allows `'unsafe-eval'` in development only (required by React dev tooling). Production CSP is unchanged and remains strict.

## [1.27.0] — 2026-07-09

### Changed

- Refactored large modules for maintainability (behavior-preserving):
  - Split `lib/api/openapi.ts` into `lib/api/openapi/` (shared, schemas, per-group path modules, index).
  - Split `lib/mcp/tools.ts` into `lib/mcp/tools/` (shared, posts, pages, system, index).
  - Split `lib/seed.ts` into `lib/seed/` (posts, pages, index).
  - Extracted the Settings, Plugins, and Profile admin pages into focused section components under each page's `_components/` directory.

## [1.26.0] — 2026-07-09

### Added

- Test coverage tooling (`@vitest/coverage-v8`) and a `test:coverage` script.
- Unit tests for MFA, CSRF, rate limiting, audit logging, settings redaction, media store, and editor frontmatter utilities.
- API-route integration tests for login, settings, posts, and media upload.
- `lib/time.ts` `nowISO()` helper and `lib/auth/constants.ts` for the auth cookie/token names.

### Changed

- Moved the client-only `useDateTimeFormat` hook out of `lib/` to `components/use-date-time-format.ts`.
- Centralized the `bifrost_token` / `bifrost_refresh` names as shared constants.
- Best-effort failures (git commit, seed, content reset, media unlink) now log instead of being silently swallowed.
- Test runner now executes test files serially to avoid shared-SQLite lock flakiness.

## [1.25.1] — 2026-07-09

### Changed

- Renamed the root `middleware.ts` to `proxy.ts` to adopt the Next.js 16 Proxy file convention and clear the deprecation warning. Auth behavior is unchanged.

## [1.25.0] — 2026-07-09

### Security

- Custom CSS is now sanitized before injection, blocking HTML/script, `javascript:`/`vbscript:` URLs, `expression()`, `-moz-binding`, `behavior:`, and `@import`.
- Rate-limited MFA verification, token refresh, and password changes to slow brute-force attempts.
- Added `Content-Security-Policy`, `Strict-Transport-Security`, and `Permissions-Policy` response headers.
- Consolidated all API auth onto the shared `requireUser`/`requireAdmin` helpers so API-key auth is honored consistently.
- Settings updates are now schema-validated (key format and value size).
- Refresh-cookie `secure` flag is controlled by `BIFROST_SECURE_COOKIES` instead of `NODE_ENV`.
- Uploaded media filenames are sanitized; analytics path/referrer lengths are capped.

## [1.24.0] — 2026-07-09

### Security

- **Fixed an authentication bypass** affecting the docs, theme files, and post
  template endpoints. These handlers wrapped a non-throwing `requireAdmin` in a
  `try/catch` and never checked its result, so requests proceeded as if
  authenticated. They now reject unauthenticated requests with 401. The docs API
  is also now covered by the write-protection middleware.
- **JWT secrets are now required.** The hardcoded development fallback secrets
  were removed; the server refuses to start unless `BIFROST_JWT_SECRET` and
  `BIFROST_JWT_REFRESH_SECRET` are set, preventing forged tokens from known
  defaults.
- **Blocked a zip-slip vulnerability** in content import. Archive entries are now
  validated to stay within the target directory before extraction.
- **Closed unauthenticated read endpoints** — Git history/diff now require admin,
  and media listing and the AI model list now require authentication.

### Added

- `SECURITY.md` with supported versions, private disclosure process, and
  deployment hardening guidance.
- `.env.example` documenting the required and optional environment variables.
- Security regression tests: auth gating (`require`), route guards for the
  previously bypassed handlers, and a zip-slip extraction test.

### Fixed

- Content export was broken under archiver v8 (its ESM class API is not callable
  as a factory); export now uses the `ZipArchive` class.
- Added the missing AGPL license header to `app/robots.ts`.

## [1.23.2] — 2026-07-09

### Fixed

- Audit Log timestamps now respect the configured date and time format (EU/US/ISO, 12h/24h) instead of the browser default, and include seconds.
- Hardened the date formatter so US format is deterministic regardless of browser locale.

## [1.23.1] — 2026-07-09

### Changed

- API Explorer sidebar sections are now sorted alphabetically by tag name.

## [1.23.0] — 2026-07-09

### Added

- **Complete API reference** — the OpenAPI spec (and therefore the API Explorer and Swagger UI) now documents every endpoint: pages, audit log, post templates, theme files, export/import, MFA flows, and the docs feed.
- **Component schemas** — `Page`, `Tag`, `User`, `Media`, and `AuditLog` are now defined in the spec for richer Explorer examples and generated clients.
- **Spec drift guard** — a test asserts the OpenAPI spec and the on-disk routes stay in sync and that every schema reference resolves.

### Fixed

- **Malformed OpenAPI structure** — `/admin/stats` and `/analytics/view` were accidentally nested inside the posts list response, hiding them from the spec, Explorer, and Swagger. They are now top-level paths.
- Corrected `docs/bifrost/api.md` endpoint table (PUT, not PATCH) and expanded it to cover all resources.

## [1.22.0] — 2026-07-09

### Added

- **New Bifröst icon** — a frost-blue snowflake mark, shipped as SVG, PNG (192/512), an Apple touch icon (180), and a multi-size `favicon.ico` for full cross-browser coverage including WebKit.
- **Custom favicon** — upload your own favicon (SVG, PNG, ICO, or JPG) under **Settings → Branding**, with a live preview and one-click reset to the default.
- **Progressive Web App** — Bifröst is now installable. A dynamic web manifest, a service worker with offline support (themed offline page, network-first pages, cached assets), a subtle install prompt on the public site, and proper `theme-color` and Apple web-app metadata.
- **Branding & PWA documentation** — a new guide covering the icon set, custom favicons, and PWA behavior.

### Fixed

- Site metadata now always includes icons and the web manifest, even when "show description in page title" is enabled (previously an early return omitted them).

## [1.21.0] — 2026-07-09

### Added

- **Audit log** — an append-only record of administrative and content actions (logins, MFA changes, user/post/page/settings/API-key/media mutations, exports and imports). Each entry captures the actor, action, target, status, IP, and user agent. Browse and filter events at **Admin → Audit Log**, with pagination and a manual purge. Entries are automatically pruned after 90 days. Includes a new `GET`/`DELETE /api/v1/audit` endpoint and an Audit Log documentation guide.

## [1.20.0] — 2026-07-09

### Added

- **License documentation** — a new `License` doc explaining the AGPL-3.0 in plain language: the freedoms it grants, the network-copyleft obligation, and the per-file license header convention.
- **Credits & Thanks documentation** — a new doc crediting every external dependency grouped by role, each with its exact declared license, plus the Norse-mythology origin of the Bifröst name. Both docs are available in the admin documentation viewer.

## [1.19.7] — 2026-07-09

### Changed

- **README** — added the "Where your words cross over." tagline and a "The name" section explaining the Norse-mythology origin of Bifröst (the rainbow bridge between your thoughts and your audience).

## [1.19.6] — 2026-07-09

### Changed

- **README rewritten** — a benefit-driven overview that leads with content ownership and self-hosting, a "Why Bifröst?" section, a complete feature table reflecting current capabilities (MFA, MCP server, AI chat, SEO, backup/restore, analytics, themes), a tech-stack summary, and a full documentation index.

## [1.19.5] — 2026-07-09

### Fixed

- **Editor lint warnings** — the CodeMirror mount-once effects in `Editor.tsx`, `CssEditor.tsx`, and `GenericEditor.tsx` now carry documented `eslint-disable` comments for `react-hooks/exhaustive-deps`. Adding the flagged dependencies would recreate the editor on every keystroke; `value` is already synced by a separate effect.

## [1.19.4] — 2026-07-09

### Fixed

- **Admin docs cross-links no longer 404** — clicking an inter-doc link (e.g. `deployment.md#running-the-mcp-server-as-a-service`) in the admin documentation viewer navigated to `/admin/<file>.md` and returned a 404. Such links are now intercepted and load the target doc within the viewer, scrolling to the referenced heading anchor when present.

## [1.19.3] — 2026-07-09

### Added

- **MCP server deployment guide** — new "Running the MCP server as a service" section in the deployment docs with Docker Compose, systemd, and reverse-proxy (nginx/Caddy) examples for the standalone MCP process.
- **`build:mcp` script** — precompiles the MCP server to `dist/mcp/http-server.cjs` via esbuild. The production Docker image now builds and exposes the MCP server (port `3456`).

### Fixed

- **MCP server no longer depends on `tsx`** — `mcp:start` previously ran the TypeScript entry via `tsx`, which is not installed in production (`npm ci --omit=dev`). It now runs the precompiled `dist/mcp/http-server.cjs` with plain `node`.
- **MCP docs port corrected** — the SSE endpoint is `:3456` (default `mcp.port`), not `:3000`; clarified that the MCP server is a separate process from the web app and runs HTTP/SSE regardless of `mcp.mode`.

## [1.19.2] — 2026-07-09

### Changed

- **Dashboard "Visitors Today" renamed to "Views Today"** — the metric counts page views, not unique visitors, and now reflects calendar-day totals (from local midnight) instead of a rolling 24-hour window.

### Fixed

- **Settings Export/Import buttons** now share identical sizing and typography (the Import `<label>` matched to the ghost `Button` style)

## [1.19.1] — 2026-07-08

### Added

- **Per-post SEO** — collapsible SEO panel in post and page editors for meta description, OG title, OG description, and noindex. Fields serialize to YAML frontmatter and drive the public route's `generateMetadata` (title, description, robots, OpenGraph, Twitter card).
- **Two-factor authentication (TOTP)** — enable 2FA from the profile page with QR-code enrollment and recovery codes. Login returns `requiresMfa` with a short-lived MFA token; admins can reset a user's MFA from the users page. New `users.mfa_enabled/mfa_secret/mfa_recovery` columns (migration `0008`).
- **Export / Import** — download a full site backup as a ZIP and restore it from Settings.
- **Umami analytics** — optional website ID, script URL, and domains configured in Settings; script injected into the public layout when set.
- **Site URL & language settings** — `site.url` and `site.language` fields in Settings; language drives the HTML `lang` attribute.
- **Dynamic robots** — `app/robots.ts` replaces the static `public/robots.txt`.
- **Facebook** added to the supported social platforms.
- **AI Chat panel** — full chat interface replacing the actions dropdown. Toggle "AI Chat" in editor toolbar to chat with LLMs about your post content. Provider selector, streaming, Insert/Replace on responses.
- **Documentation** — new Security & MFA and Backup & Restore guides, wired into the `/admin/docs` sidebar.

### Changed

- **DeepSeek models** updated — default now `deepseek-v4-pro` with `deepseek-v4-flash` as alternative (removed `deepseek-chat` per provider deprecation); added fallback model list when discovery fails
- **Slug field** added to post edit page — auto-generates from title, manually editable, sent on save
- **Back button** styling unified with View/History buttons in both post and page editors
- **Token refresh** — client proactively refreshes access tokens before expiry
- **Docs navigation** — supports `hashchange` for deep-linking between sections

### Fixed

- **AI Assistant not showing** — was calling wrong endpoint (`/api/v1/ai/models` instead of `/api/v1/ai/settings`) and missing auth token
- **Docs page lint** — removed setState-in-effect and window.location mutation
- **AIChatPanel** — replaced `<a>` with Next.js `<Link>` for /admin/plugins navigation

### Removed

- **Old AIAssistant component** (`lib/editor/AIAssistant.tsx`) — replaced by AIChatPanel
- **Static robots.txt** (`public/robots.txt`) — replaced by `app/robots.ts`

## [1.19.0] — 2026-07-08

### Added

- **Bifröst Read theme** — hero section with editable markdown, 3-col grid, social sharing on cards, top nav, font config via theme.json
- **Bifröst Magazine theme** — sidebar with tags + pages, tag pills on cards, social icons in header, 2-col layout
- **Documentation** at `/admin/docs` — 10 thorough docs covering all areas (Getting Started, Content, Themes, Admin, Settings, API, MCP, Git, Plugins, Deployment) with search, sidebar nav, full-width layout
- **Theme-level font** — `font` field on `theme.json`, each theme declares its preferred font stack
- **Posts-per-page** setting (1–100, default 10) in Settings → Appearance
- **Inline hero editor** on `/admin/themes` for Read theme's hero.md
- **Post template create/delete** — `POST`/`DELETE` on `/api/v1/post-templates` + New/Delete buttons on editor page
- **Theme activation** — click a theme card to select, "Activate theme" to apply (only on `/admin/themes`)
- **Display toggles for hero** — "Show site title" / "Show site description" on Themes page (Read-specific)
- **Social link config** for Magazine theme — Facebook, Bluesky, GitHub, LinkedIn URLs on Themes page
- **`sharedFacebook` and `bluesky` sharers** for social sharing on cards

### Changed

- **Theme field on Settings page removed** — theme selection is now exclusively on `/admin/themes`
- **Read header**: home left-aligned, pages on the right (with nav toggle to show)
- **Magazine header**: site title left-aligned, social icons + dark/light toggle on the right
- **API Explorer**: removed env gate from `/api/v1/openapi.json` (docs gate kept on `/api/docs` only)
- **Nav order**: Tags → Profile → Users in admin sidebar
- **Post Templates** removed from admin sidebar (accessible via "Edit Templates" on Posts list)
- **Theme descriptions** updated — removed "inspired by" references

### Fixed

- **Tags wiped on post edit** — `mergeFrontmatter` now called at save time on both new and edit post pages
- **Hydration mismatch** after nav changes — fixed by restarting dev server to clear Turbopack cache
- **Magazine header missing dark/light toggle** — added back with social icons
- **Read list cards not clickable to share** — share icon stacking context fixed
- **Featured image gap** — added `max-w-none` override for Tailwind base reset
- **Themes page showed all themes as active** — now reads `theme` setting to determine active
- **Layout hardcoded to Terminal** — now reads `theme` setting and loads correct theme

## [1.18.0] — 2026-07-08

### Added

- **Mobile-responsive admin sidebar** with hamburger toggle, slide-over drawer, backdrop, and Escape-key dismiss
- **Git History link** on post and page editors for per-content revision history
- **Diff highlighting** on the git diff page with color-coded additions/removals via `DiffViewer`
- **Custom CSS editor** at `/admin/themes/css` with CodeMirror and live injection into all pages
- **Theme display settings** at `/admin/themes` — toggles for featured images, reading time, and author bio
- **Theme file editor** at `/admin/themes/files` with file tree, CodeMirror editor, and restart warning
- **Git History** link in admin sidebar (previously missing from nav)

### Security

- **API key toBase62:** Replaced modulo-biased encoding with rejection sampling for uniform distribution
- **bcrypt → bcryptjs:** Swapped native bcrypt binding for pure-JS bcryptjs (zero native deps)
- **CSRF protection:** Added Origin/Referer validation on the refresh endpoint (defense-in-depth with SameSite=Lax)
- **Setup TOCTOU:** Wrapped initial setup check-and-insert in a transaction to prevent double-admin creation
- **Settings __SET__ scope:** The placeholder skip now only applies to secret keys (git.token, ai.key.*), not all settings
- **OpenAPI docs gate:** `/api/v1/openapi.json` and `/api/docs` now require `BIFROST_API_DOCS_ENABLED=true`

### Changed

- **Git history filter:** History API now accepts `?slug=` param for per-file commit filtering
- **Editor header row:** Added History button alongside Preview/View in post and page editors

### Fixed

- **Featured image gap:** CSS calc() spacing fixed in list card hero image (browser was ignoring malformed calc expression)

## [1.17.0] — 2026-07-08

### Added

- **Tag input** in post editor with autocomplete from existing tags, token pills, and YAML round-trip
- **Bulk delete** on posts and pages lists with select-all checkbox and bulk actions bar
- **Copy slug** button in new post and new page editors
- **Unsaved changes warning** (beforeunload) on all 4 editor pages
- **Post templates** dropdown (Standard, Tutorial, Review, Quick tip) in new post editor
- **Scheduled posts** status with datetime picker (migration 0006: `scheduledAt` column)
- **Featured images** — image picker modal with media grid + upload, stored in frontmatter, rendered in post detail + list cards + OpenGraph metadata

### Changed

- `GET /api/v1/posts/[slug]` now includes tags array via join
- `buildFrontmatter` / `mergeFrontmatter` accept optional `tags` parameter for YAML serialization

## [1.16.0] — 2026-07-08

### Changed

- **Editor deduplication**: extracted `generateSlug`, `buildFrontmatter`, and `mergeFrontmatter` into `lib/editor/utils.ts`
- **`useSaveShortcut` hook** (`lib/editor/use-save-shortcut.ts`) shared between all 4 editor pages
- **`AdminEditorShell`** component for the editor/preview split pane with toolbar
- **`AdminContentList`** generic list component used by both posts and pages admin pages
- Eliminated ~500 lines of duplicated code across 6 admin editor/list files

## [1.15.1] — 2026-07-08

### Fixed

- Added missing AGPL-3.0 license headers to 3 CSS files (dark.css, light.css, palettes.css)
- Added Simple Icons attribution (CC0) in SocialIcon.tsx
- Added `"license": "AGPL-3.0"` to package.json

## [1.15.0] — 2026-07-08

### Added

- **Custom 404 page** with Bifröst/Norse mythology theme (Heimdall, rainbow bridge, nine realms)
- **Pagination** on public homepage (10 posts per page, Previous/Next navigation)
- **Sitemap** at `/sitemap.xml` — dynamic route serving published posts and pages
- **Favicon** (`/icon.svg`) — rainbow bridge SVG icon
- **SEO metadata** — OpenGraph, Twitter cards, `metadataBase`, RSS alternates, `robots` directives on all pages
- **Reading time** on post list items (homepage + tag pages)
- **Tags admin page** at `/admin/tags` — create, rename, delete tags with post counts
- **Site URL setting** (`site.url`) — used by RSS and sitemap, falls back to request host if unset
- **User delete confirmation** dialog

### Changed

- Tag page now uses `post_tags` join table (fixed inefficient `LIKE '%tag%'` on JSON blob)
- RSS feed reads `site.url` setting or falls back to request URL (no more hardcoded `https://localhost`)
- Post detail OpenGraph/Twitter metadata includes title, description, article type

### Fixed

- CommandPalette `setState`-in-effect regression re-fixed

## [1.14.3] — 2026-07-08

### Fixed

- **CommandPalette `setState` in render body**: moved state resets from render function into `useEffect` (React anti-pattern that caused double-renders)
- **Analytics view route now uses `apiSuccess`/`apiError` envelope** instead of bare `NextResponse.json`
- **Analytics DB insert wrapped in try/catch** — failures no longer crash the route handler

### Changed

- **Removed unused `swagger-ui-react` and `@types/swagger-ui-react`** from dependencies (138 packages removed); Swagger UI page uses `swagger-ui-dist` directly
- **Added `console.error` to silent catch blocks** in admin dashboard (plugin load, stats, settings, admin stats) for easier debugging

## [1.14.2] — 2026-07-08

### Security

- **`requireUser` now verifies the Bearer token directly** instead of trusting `x-user-id` headers (H1)
- **Password minimum 8 characters** enforced on setup and user creation routes, not just profile (H3)
- **Logout cookie name fixed**: now clears `bifrost_refresh` (was `bifrost_refresh_token`, which never matched) (H6)
- **Security headers added**: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer-when-downgrade`, `X-Frame-Options: DENY` on all responses (M2)

## [1.14.1] — 2026-07-08

### Security

- **Middleware now covers all `/api/v1/` write routes**: users, tags, settings, git, profile, api-keys, admin/routes are now protected by `WRITE_API_PATTERNS` (C6)
- **Settings endpoint now requires admin auth**: `PUT /api/v1/settings` guarded by `requireAdmin()` (C1)
- **User management now requires admin auth**: `POST /api/v1/users`, `PUT|DELETE /api/v1/users/[id]` guarded by `requireAdmin()` (C2)
- **Tag management now requires auth**: `POST /api/v1/tags`, `PUT|DELETE /api/v1/tags/[id]` guarded by `requireUser()` (C3)
- **Git push/pull now require admin auth**: both endpoints guarded by `requireAdmin()` (C4)
- **JWT dev-secret warning on startup**: `instrumentation.ts` now logs a prominent console error when default dev secrets are in use (C5)
- **Drafts filtered from public API**: `GET /api/v1/posts` and `GET /api/v1/pages` now only return published posts to unauthenticated clients; admins can pass `?status=draft` with a valid token (C9)
- **MCP settings now redact secrets**: `get_settings` tool and `bifrost://settings` resource call `redactSecrets()` (C7)
- **MCP HTTP server now requires auth**: `authMiddleware` verifies Bearer JWT or `bfk_` API key before `/sse` access (C8)
- **AI chat requires auth**: `POST /api/v1/ai/chat` now guarded by `requireUser()` (H2)
- **Rate limiting added**: login (5/min), setup (3/min), AI chat (20/min), analytics (100/min) — IP-based sliding window (H4)
- **Error details no longer leaked**: removed `String(err)` from all 10 500 responses — only user-safe messages returned (H5)

## [1.14.0] — 2026-07-08

### Added

- **Server stats** on admin dashboard: uptime, Node.js version, platform, memory usage, DB table counts
- **Visitor analytics**: privacy-first page view tracking with referrer logging via `page_views` table (no cookies, no IPs, no fingerprints)
- **View beacon** on every public page (`POST /api/v1/analytics/view`, fire-and-forget)
- **Dashboard visitor stats**: views today, views this week, most viewed pages
- **Color scheme picker** on `/admin/themes` page (previously only in Settings)
- `GET /api/v1/admin/stats` endpoint (admin-only, returns server + DB + view stats)

### Changed

- Dashboard System card merged into a new Server card with server stats and feature toggles

## [1.13.0] — 2026-07-08

### Added
- Six color palettes for the Bifröst Terminal theme: Default, GitHub, Dracula, Nord, Cyberpunk, and Catppuccin. Each palette has both light and dark variants — switch in Settings under Appearance > Color Scheme.
- Code syntax highlighting now uses a CSS-variables theme, so code blocks inherit the active palette's colors (keyword, string, function, etc.) automatically — no dual-theme re-rendering.
- The markdown editor preview now respects the active palette and toggles live when you change the scheme.

### Changed
- Theme colour tokens move from dedicated `light.css`/`dark.css` files into a single `palettes.css` generated from the palette data module. Structural tokens (fonts, spacing, radius) live in a base `:root` block in `globals.css`.
- **Re-ingest required for existing code blocks**: Published posts rendered before this change use the old dual-theme Shiki spans. They will still display but code highlighting won't pick up the new palette colours until the content is re-rendered. Restart the dev server (instrumentation boots `ingestAll`), or re-save the post in the editor.

## [1.12.0] — 2026-07-08

### Added
- Insert any of the ~2000 Lucide icons into posts and pages with `:icon[name]` markdown syntax. Icons render as inline SVG (server-side), inheriting the surrounding text size and color, and appear in the editor preview, published posts, and pages alike.
- The markdown editor toolbar gains a searchable icon picker that inserts the chosen `:icon[name]` at the cursor.

## [1.11.0] — 2026-07-08

### Added
- `GET /api/v1/tags` now includes a `count` field for each tag, reflecting how many posts use it across the site.

## [1.10.4] — 2026-07-08

### Fixed
- Revoking an API key in the admin UI now removes it from the list. The key was correctly revoked in the database, but `GET /api/v1/api-keys` still returned revoked keys, so the row never disappeared and the action appeared to do nothing. The list now excludes revoked keys, and revoking asks for confirmation first.

## [1.10.3] — 2026-07-08

### Fixed
- Applying an inline format (bold, italic, etc.) to selected text in the markdown editor no longer throws `RangeError: Selection points outside of document`. The toolbar replaced the selection with just the wrapping markers instead of wrapping the selected text; it now inserts `prefix + selection + suffix` and re-selects the wrapped text.

## [1.10.2] — 2026-07-08

### Fixed
- Creating an API key in the admin UI now shows the full key with a copy button. The create endpoint returned the plaintext under a `plaintext` field while the UI expected `key`, so the "new key" panel never appeared and only the truncated prefix was visible.

## [1.10.1] — 2026-07-08

### Fixed
- Tags from post frontmatter are now materialized into the `tags` and `post_tags` tables during content ingestion, so `GET /api/v1/tags` (and the admin API Explorer) no longer returns an empty list. Existing tags are backfilled on the next ingest.

## [1.10.0] — 2026-07-08

### Added
- **Social sharing plugin**: optional share buttons on blog posts for Bluesky, Facebook, Reddit, LinkedIn, and Email. Share links are built client-side from the current page URL, so no site base URL configuration is required.
- Admin **Plugins** page gains a "Social Sharing" card with an enable toggle and per-network checkboxes; the plugin is disabled by default (including on fresh installs).
- The dashboard System panel now shows the Social Sharing enabled/disabled state, and social sharing is registered as a feature module.

### Fixed
- API Explorer (`/admin/api`): wide JSON responses no longer overflow past the right edge — the response and code-sample panes now scroll internally.

## [1.9.0] — 2026-07-08

### Added
- **Pages**: markdown-authored standalone pages (About, Projects, etc.) as a first-class content type alongside posts. Pages are authored in the same editor (with live preview, toolbar, and AI assistant) at `/admin/pages`, stored as markdown on disk under `content/pages/<slug>/index.md`, ingested by the content watcher, and versioned in Git like posts.
- Pages render at clean top-level URLs (`/<slug>`) with a dedicated theme template that omits author byline, date, and tags. Slugs are unique across both posts and pages.
- **Site navigation integration**: each page has "Show in navigation" and "Nav order" controls; published nav pages appear in the public site header, ordered by nav order.
- **REST API** for pages: `GET`/`POST /api/v1/pages` and `GET`/`PUT`/`DELETE /api/v1/pages/{slug}` (writes require authentication).
- **MCP tools** for pages: `list_pages`, `get_page`, `create_page`, `update_page`, `delete_page`.
- An example **About** page is now seeded for new sites and removed by the "Remove demo data" action.

## [1.8.3] — 2026-07-08

### Changed
- The Plugins page now lays out plugin cards in a responsive two-column (50/50) masonry layout on large screens, so more plugins fit in view and a taller card on one side no longer leaves a gap on the other.

## [1.8.2] — 2026-07-08

### Fixed
- MCP `create_post` now resolves a real author via `resolveAuthorId` (falling back to the first admin) instead of inserting a placeholder `00000000-…` author id, matching the REST posts route. Posts created through the MCP server without an explicit author are now attributed to a genuine user.
- Removed the placeholder-author default (`00000000-…`) from the post validation schema; `authorId` is now simply optional and resolved by the caller.
- Removed a stray `system@bifrost.local` admin account that could be left in the database by an older, pre-isolation test run, and reattributed any posts that referenced it. The content watcher test fixture now uses an obviously non-production identity.

## [1.8.1] — 2026-07-08

### Fixed
- Admin sidebar no longer shrinks/collapses when a page renders wide content (e.g. a long JSON response in the API explorer). The sidebar is now `shrink-0` and the main column `min-w-0`, so overflowing content scrolls within its panel instead of squashing the navigation.

## [1.8.0] — 2026-07-08

### Added
- **Social links on profiles**: authors can configure links for Bluesky, Mastodon, Lemmy, Reddit, LinkedIn, GitHub, GitLab, Codeberg, and a personal website from `/admin/profile`. Links are stored per user and rendered as brand icons in the post author card (respecting the existing "show author information" setting).

## [1.7.0] — 2026-07-08

### Added
- **Custom API explorer** (`/admin/api`): an interactive, theme-aware REST reference that replaces the raw Swagger link in the admin nav. Browse operations grouped by tag, fill in path/query parameters and JSON bodies, choose an authorization (current session or an API key), and **send live requests** with a formatted response viewer (status, timing, pretty JSON).
- Generated **code samples** for every operation in **cURL**, **JavaScript** (`fetch`), **PowerShell** (`Invoke-RestMethod`), and **Python** (`requests`), syntax-highlighted with Shiki and copyable in one click (`lib/api/samples.ts`).

### Changed
- The OpenAPI spec (`generateOpenApiSpec`) now documents **all** REST endpoints (users, tags, profile, API keys, media, AI, settings, themes, git, MCP, setup, admin) and reports the live application version. This also completes the existing Swagger UI at `/api/docs`.
- The admin sidebar's external **API Explorer ↗** (Swagger) link is replaced by **API** → `/admin/api`; Swagger remains reachable from within the explorer.

## [1.6.0] — 2026-07-08

### Added
- **API keys** (`/admin/api-keys`): create long-lived, revocable bearer tokens (`bfk_…`) to authenticate REST API requests without logging in. Keys are shown once on creation, stored only as a bcrypt hash, inherit the creating user's role, and track a **last used** timestamp.
- `GET`/`POST /api/v1/api-keys` (list / create) and `DELETE /api/v1/api-keys/{id}` (revoke), admin-only.

### Changed
- Protected write routes (`posts`, `media`) now accept either a session JWT or an API key via a shared `requireUser` helper. The auth middleware passes `bfk_`-prefixed bearer tokens through to route handlers, which verify them against the database.

## [1.5.1] — 2026-07-08

### Added
- The dashboard **System** panel now shows the enabled/disabled state of the **MCP** server and the **AI Assistant** alongside Git.

## [1.5.0] — 2026-07-08

### Added
- **Draft preview:** the post editor now has a **Preview** link (labelled **View** for published posts) that opens the post on the public site in a new tab. Admins can review a draft exactly as it will appear before publishing.
- A **draft** badge is shown next to the title on the public post page when an admin is viewing an unpublished post.

### Security
- Draft posts are no longer readable by anonymous visitors via their direct URL. A draft now returns **404** for anyone who is not a signed-in admin (previously the page rendered for anyone who knew the slug). Post titles/excerpts for drafts are likewise withheld from page metadata.

## [1.4.0] — 2026-07-08

### Added
- **Plugins page** (`/admin/plugins`): Git Sync, AI Assistant, and the MCP Server are now managed as first-class plugins, each with its own enable/disable toggle and settings panel.
- `mcp.enabled` setting with a runtime toggle. The MCP HTTP server returns `503` on `/sse` while disabled, so it can be turned off without restarting the process.
- Admin-only `GET /api/v1/mcp/status` returning the MCP enabled state, transport mode, and port.
- Feature-module registry (`lib/modules/registry.ts`) describing the built-in plugins.

### Changed
- Git and AI configuration moved out of **Settings** into the new **Plugins** page. Settings now covers Site, Appearance, Theme, and the demo-data controls only.
- The top-level "Git" nav item was removed; Git history is reached from the Git Sync plugin card.

## [1.3.1] — 2026-07-08

### Fixed
- **Data loss:** running the test suite could permanently delete real posts. The content tests wrote to the real `content/` directory and `data/bifrost.db`, hard-coding slugs (`test-post`, `test-sync`) and removing them in cleanup — so `npm test` deleted any real post that shared those slugs. Tests now run against a throwaway temp content directory and database via a new `BIFROST_CONTENT_DIR` environment variable, leaving real content and the database untouched.

### Changed
- Deleting a post now moves its folder to `content/.trash/<slug>-<timestamp>/` instead of permanently removing it, so deletions (via the API or the MCP `delete_post` tool) are recoverable. `content/.trash/` is ignored by the content Git repo.
- Content, media, and Git paths are now resolved through a shared helper honoring `BIFROST_CONTENT_DIR` (default `content`); production behavior is unchanged.

## [1.3.0] — 2026-07-08

### Added
- AI assist can now be enabled/disabled from **Settings → AI Assistant** (disabled by default). The editor "AI Assist" button is hidden while disabled, and `POST /api/v1/ai/chat` returns `403` when disabled.
- Provider configuration in Settings: per-provider model overrides and API keys (opencode-zen, opencode-go, deepseek) plus a default-provider selector, stored in the database and resolved at request time (falling back to config file / env).
- Dedicated admin-only `GET`/`PUT /api/v1/ai/settings` endpoint. API keys are write-only — they are never returned to the client (only a `hasKey` flag), and a blank field keeps the existing key.

### Security
- Secret settings are now redacted from the public `GET /api/v1/settings` response. This closes a pre-existing leak where `git.token` was readable by unauthenticated visitors; the token field is now write-only in Settings.
- `/api/v1/ai/*` write requests now require authentication (added to the middleware's protected API patterns).

### Fixed
- New blogs seed `ai.enabled=false` so AI assist stays off until a key is configured.

### Changed
- "Remove demo data" now deletes only the seed posts that ship with Bifröst (matched by slug); your own posts, media, tags, and Git history are left untouched. The section is hidden entirely once no demo posts remain.

## [1.2.0] — 2026-07-08

### Added
- User profiles: uploadable round avatar, bio, and a `/admin/profile` page to edit display name, email, avatar, bio, and password.
- `bio` column on the users table (migration `0001`).
- Author byline on public posts (name in the meta line, plus a footer author card with avatar and bio), gated by a new **Show author information on posts** setting (`appearance.show_author`).
- Media serving route (`/media/[...path]`) that streams files from `content/media` with content-type detection and path-traversal protection — fixes broken image previews and serves avatars.
- MCP guide post now documents connecting opencode, Claude Code, and Kilo Code to the SSE endpoint.
- Three new seed posts explaining Bifröst: content storage model, admin tour, and the REST API.

### Fixed
- "Remove demo data" in settings now uses `authFetch`, so an expired access token is transparently refreshed instead of failing with "Invalid or expired token".
- Frontmatter no longer leaks into rendered post body: `writePostToFilesystem` now strips any existing frontmatter from content before prepending the authoritative YAML block, preventing duplicate frontmatter on disk.
- Content watcher now detects live file changes: switched chokidar from an unsupported glob path (removed in chokidar v4+) to watching the `content/posts` directory recursively, so post edits re-ingest without a server restart.
- Post creation no longer fails with a foreign-key error on a fresh database: author IDs are resolved to a real user (falling back to the first admin) in both the API and the file watcher.
- Auth middleware now forwards the authenticated user id/role to route handlers (via request headers), not just the response.
- Public post dates now respect the configured date format (EU/ISO/US) instead of always rendering US format.
- Copy-code button no longer disappears after settings load: a `MutationObserver` re-injects the buttons when the rendered content re-mounts.
- New blogs now seed sensible defaults (EU date, 24h time, Git disabled), and the `git.enabled` setting is actually honored by the Git layer.
- Admin dashboard System panel and sidebar now report the real version, active theme, and Git status instead of hardcoded values.

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
