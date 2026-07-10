# MCP Server Remediation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans or subagent-driven-development. Steps use `- [ ]` checkboxes.

**Goal:** Fix MCP server bugs, bring it to REST API parity, harden transports, and add real test coverage.

**Architecture:** Thread an auth-derived `McpContext` through every tool handler and both transports (stdio = `system`, HTTP = resolved identity). Fix the resource matcher, route uploads through the canonical `saveMediaFile`, and add `recordAudit` to all mutations. Add parity features (scheduled status, pagination, tag updates, settings validation, `list_users`), hardening (HTTP rate limit, real stdio entry), and comprehensive tests.

**Tech Stack:** TypeScript (strict), `@modelcontextprotocol/sdk`, better-sqlite3 + Drizzle, express (HTTP/SSE), Vitest, esbuild.

## Global Constraints
- License header (AGPL-3.0) on every new source file.
- No `any` without explicit reason.
- Tests: `tests/**/*.test.ts`, `fileParallelism: false`, shared file DB — unique IDs/slugs per test.
- Verify gate: `npm run typecheck && npm run lint && npm test`.
- Two commits: pending UI fixes → v1.34.1, then MCP work → v1.35.0. Push to `origin main`.
- NOTE: `verifyAccessToken` returns `TokenPayload` = `{ sub, role }` (use `payload.sub` as user id).

---

## Phase 1 — Context plumbing
- Task 1: Add `McpContext` + `SYSTEM_CONTEXT` to `lib/mcp/tools/shared.ts`; change `ToolHandler` to `(args, ctx)`.
- Task 2: Create `lib/mcp/context.ts` `buildHttpContext(req, auth)` + test `tests/lib/mcp/http-context.test.ts`.
- Task 3: Wire ctx through `lib/mcp/server.ts` (`registerHandlers(server, ctx)`, `createMcpServer(ctx=SYSTEM_CONTEXT)`, `startStdioMcpServer(ctx=SYSTEM_CONTEXT)`).
- Task 4: `lib/mcp/http-server.ts` resolve identity in middleware (`req.mcpAuth`), build ctx, `createMcpServer(ctx)`.
- Task 5: Update handler signatures in posts/pages/system to `(args, ctx)`.

## Phase 2 — Bug fixes
- Task 6: Fix resource matcher in `server.ts` (`matchResource`, export `ResourceDef`); test `resources.test.ts`.
- Task 7: `upload_media` → `saveMediaFile` (relative path, MIME allowlist, variants); audit.
- Task 8: `create_post` frontmatter merge (`parseFrontmatter`) + transaction; write file after tx.

## Phase 3 — Audit logging
- Task 9: `recordAudit` on post/page/settings mutations (+ upload from T7).

## Phase 4 — REST parity
- Task 10: `scheduled` status + `scheduledAt` for posts/pages.
- Task 11: pagination (`page`) + `ORDER BY createdAt DESC`.
- Task 12: `update_post` tag replacement (transactional).
- Task 13: `update_settings` key validation `/^[a-z0-9_.-]+$/i` + `invalidateSettingsCache` + secret placeholder skip.
- Task 14: new `list_users` tool (`lib/mcp/tools/users.ts`); count 17→18.

## Phase 5 — Hardening
- Task 15: HTTP per-IP rate limiter (in-memory fixed window, 120/min, 429).
- Task 16: `lib/mcp/stdio-server.ts` entry + `package.json` scripts (`build:mcp:stdio`, `mcp:start:stdio`).

## Phase 6 — Tests
- Task 17: `server.test.ts` routing + `handlers.test.ts` round-trips (posts/pages/tags/search/media).

## Phase 7 — Release & GitHub
- Task 18: Commit pending UI fixes as v1.34.1.
- Task 19: Bump to 1.35.0 + CHANGELOG.
- Task 20: Verify + commit MCP work + push `origin main`.
