# Application Review & Remediation Plan

Date: 2026-07-09
Status: In progress
Owner: Bifröst maintainers

This document is the authoritative record of the full-application review performed on
2026-07-09 and the phased remediation plan derived from it. It is updated as phases ship.

## Summary

A complete review of Bifröst was conducted across six dimensions: code review, security,
test coverage, best practice, functionality gaps, quick wins, and copyright compliance.

Baseline health at review time (v1.23.2) was strong:

- `npm run typecheck` — clean
- `npm run lint` — 0 errors, 4 pre-existing `<img>` warnings
- `npm test` — 142 tests / 24 files passing
- Code quality — zero TODO/FIXME, one `any` in the whole repo, 233/234 source files carry
  the AGPL header

The issues found are hardening, coverage, and product-gap items — not a codebase in trouble.
Remediation is split into phases, each shipped as its own release.

## Locked decisions

- C2 (missing JWT secrets): the app must **refuse to start** (no auto-generation).
- `LICENSE` file: leave as-is (short-form notice that links to the canonical AGPL-3.0 text).
- God-file refactors: **include** the admin-page section extractions.
- Add a `SECURITY.md` disclosure policy (Phase 1).
- New dependencies approved when relevant: `@vitest/coverage-v8` (Phase 3), `sharp` and
  `@vercel/og` (only if the corresponding features are built).
- Standard release flow per phase; seed content (`content/posts/test-post/index.md`,
  `content/posts/you-are-a-post/`) always left uncommitted.

## Findings

### Security

CRITICAL

- C1 — Auth bypass in GET handlers. `requireAdmin()` returns `null` (never throws), but six
  handlers use `try { await requireAdmin() } catch { 401 }` without checking the return
  value, so the catch never fires and auth is bypassed. Middleware only guards mutating
  methods, so these GETs are open. Affected: `app/api/v1/docs/route.ts` (GET),
  `app/api/v1/themes/files/route.ts` (GET + PUT), `app/api/v1/post-templates/route.ts`
  (GET, POST, PUT, DELETE).
- C2 — Hardcoded JWT fallback secrets in `lib/auth/token.ts:13-14`
  (`bifrost-dev-access-secret-change-me` / `-refresh-`), used when env vars are unset;
  `isUsingDevSecrets()` exists but is never enforced. Default deploys can have admin JWTs
  forged.
- C3 — Zip-slip in `lib/export/index.ts:55-62`; uploaded zip piped into
  `unzipper.Extract` with no path validation → arbitrary file write.

HIGH

- H1 — Unauthenticated git history/diff (`app/api/v1/git/history/route.ts`,
  `app/api/v1/git/diff/route.ts`); GET, not middleware-protected.
- H2 — Unauthenticated media listing (`app/api/v1/media/route.ts` GET).
- H3 — Unauthenticated AI model list (`app/api/v1/ai/models/route.ts` GET).
- H4 — Unsanitized custom CSS injected via `dangerouslySetInnerHTML` in `app/layout.tsx`.
- H5 — No rate limit on MFA verify / refresh / password change.
- H6 — Missing security headers (CSP, HSTS, Permissions-Policy) in `lib/auth/middleware.ts`.

MEDIUM / LOW

- Duplicated local auth helpers that ignore API keys (`ai/settings`, `mcp/status`, `posts`,
  `pages`, `admin/reset`, `profile`).
- AI keys stored plaintext at rest.
- Refresh cookie `secure` tied to `NODE_ENV`.
- Unbounded in-memory rate-limiter flush (`lib/rate-limit.ts`).
- No settings input validation.
- Preview endpoint DoS; analytics path not length-capped; media filename not sanitized.

### Code quality

- `app/api/v1/openapi.json/route.ts` returns bare JSON, bypassing the `{ data, error, meta }`
  envelope.
- Duplicated `authHeaders()` in `app/admin/tags/page.tsx` + `app/admin/users/page.tsx`
  (should use `authFetch`).
- Swallowed errors (no logging) in export/reset/git/seed paths.
- God files: `lib/api/openapi.ts` (1077), `lib/mcp/tools.ts` (633), `lib/seed.ts` (544),
  `app/admin/settings/page.tsx` (616), `app/admin/plugins/page.tsx` (588),
  `app/admin/profile/page.tsx` (563).
- Magic strings `bifrost_refresh` / `bifrost_token`; `new Date().toISOString()` ×32.
- `lib/format-date.ts` is `"use client"` but lives in `lib/`.

### Test coverage

- 142 tests; 0 of 42 API routes tested; no coverage tooling installed.
- Highest-value untested logic: `lib/auth/require.ts`, `lib/auth/mfa.ts`, `lib/auth/csrf.ts`,
  `lib/rate-limit.ts`, `lib/audit`, `lib/settings` (redaction), `lib/media/store`,
  `lib/export`, `lib/editor/utils` (fragile YAML escaping).

### Copyright

- Only one source file missing the AGPL header: `app/robots.ts`.
- `LICENSE` is the short-form notice (links to full text); `package.json` declares
  `AGPL-3.0`. Decision: leave `LICENSE` as-is.

### Functionality gaps

- HIGH — scheduled posts never publish (no runner); tag page hardcodes `bifrost-terminal`
  theme + no pagination (bugs).
- MEDIUM — no public search (MCP LIKE backend already exists), no comments, no image
  resizing.
- LOW — no author pages, related posts, categories, draft-share links, per-post sitemap
  priority, admin list pagination.

### Quick wins

- Fix tag-page theme (1 line), tag pagination, editor word count (`lib/reading-time.ts`
  exists), heading anchor links, reading progress bar, auto-excerpt fallback, related posts,
  public search, scheduled-post runner, OG image fallback.

## Phased plan

### Phase 1 — Security criticals + copyright (v1.24.0) — DONE

- [x] C1: fix the six bypassed handlers to `const auth = await requireAdmin(request); if (!auth) return apiError("Unauthorized", 401);`
- [x] C1: add `/^\/api\/v1\/docs/` to `WRITE_API_PATTERNS` in `lib/auth/middleware.ts`
- [x] C2: remove hardcoded dev secrets; refuse-to-start in `instrumentation.ts` when
      `BIFROST_JWT_SECRET` / `BIFROST_JWT_REFRESH_SECRET` are missing; `.env.example`;
      throwaway secrets in the Vitest setup so tests/dev stay green
- [x] C3: validate every zip entry path against the target dir in `extractZip`
- [x] H1: add `requireAdmin` to git history/diff
- [x] H2: add `requireUser` to media listing GET
- [x] H3: add `requireUser` to AI models GET
- [x] Copyright: AGPL header on `app/robots.ts`
- [x] Add `SECURITY.md`
- [x] Tests: `tests/lib/auth/require.test.ts`, `tests/lib/export/zip-slip.test.ts`,
      `tests/api/route-guards.test.ts`, middleware `/docs` pattern
- [x] Bonus: fixed `createExportZip` for archiver v8 (class API; the factory call threw)
- [x] Verify, bump 1.24.0, CHANGELOG (Security + Fixed), commit/tag/push

### Phase 2 — Security hardening (v1.25.0) — DONE

- [x] H4: sanitize custom CSS
- [x] H5: rate-limit MFA verify / refresh / password change
- [x] H6: add CSP / HSTS / Permissions-Policy headers
- [x] Consolidate duplicated auth helpers onto `lib/auth/require.ts`
- [x] Settings input validation (zod)
- [x] Cookie `secure` via explicit env, not `NODE_ENV`
- [x] Sanitize media filename; cap analytics path length

### Phase 3 — Test coverage + quality (v1.26.0) — DONE

- [x] Install `@vitest/coverage-v8`; add `test:coverage` script
- [x] Unit tests: require, mfa, csrf, rate-limit, audit, settings, media/store, export,
      editor/utils
- [x] API-route integration tests (login, posts, settings, media)
- [x] `openapi.json` envelope — kept raw (consumed directly by Swagger UI + API Explorer);
      documented as an intentional exception like sitemap/robots/manifest
- [x] Add logging to swallowed-error paths
- [x] Extract auth constants (`bifrost_refresh` / `bifrost_token`)
- [x] Add `nowISO()` helper
- [x] Move `lib/format-date.ts` to a client location

### Phase 4 — God-file refactors (behavior-preserving) (v1.27.0) — DONE

- [x] Split `lib/api/openapi.ts` → `lib/api/openapi/` (index + per-tag path modules +
      schemas + types; re-export to keep importers stable). Drift-guard test protects it.
- [x] Split `lib/mcp/tools.ts` → `lib/mcp/tools/` (index + per-category modules + util).
      `tests/lib/mcp/tools.test.ts` protects it.
- [x] Split `lib/seed.ts` → `lib/seed/` (index + posts + pages).
- [x] Extract admin sections into `_components/`:
      `settings` (Site, Branding, Appearance, DateTime, ImportExport, DangerZone),
      `plugins` (AiProviders, McpStatus, Sharing),
      `profile` (Profile, SocialLinks, Mfa, ApiKeys).
- [x] One god-file per commit; typecheck+lint+test green after each.

### Phase 5+ — Functionality gaps & quick wins

- [x] Scheduled-post runner (HIGH) — v1.28.0
- [x] Tag page: active theme + pagination (bugs) — v1.28.0
- [x] Public search (API backend only) — v1.29.0 (UI deferred)
- [x] Quick wins batch — v1.30.0: editor word count, heading anchors, reading progress,
      related posts, auto-excerpt, OG fallback (author pages dropped by request)
- [ ] Deferred/optional: comments, image resizing (`sharp`), categories, draft-share tokens,
      `useBifrost()` hook, structured logger

### Deferred items — execution

Four of the deferred items are being executed as separate minor releases (comments and
categories remain out of scope for now).

- [x] Structured logger — v1.31.0
- [ ] Draft-share tokens — v1.32.0
- [ ] `useBifrost()` hook (minimal: theme Header/Footer) — v1.33.0
- [ ] Image resizing (`sharp`, featured + admin thumbnails) — v1.34.0
