# Security Policy

## Supported versions

Bifröst is under active development. Security fixes are applied to the latest
released version. Please make sure you are running the most recent release before
reporting an issue.

## Reporting a vulnerability

If you discover a security vulnerability, please report it privately. Do **not**
open a public GitHub issue for security problems.

- Use GitHub's private vulnerability reporting on the repository
  (Security → Report a vulnerability), or
- Contact the maintainer directly via the address on the GitHub profile at
  https://github.com/mojoaar

Please include:

- A description of the vulnerability and its impact
- Steps to reproduce (proof of concept if possible)
- Affected version(s) and environment details

You can expect an acknowledgement within a few days. We will work with you to
understand and resolve the issue promptly, and will credit you in the release
notes unless you prefer to remain anonymous.

## Deployment hardening

A few essentials when self-hosting Bifröst:

- **Set strong JWT secrets.** `BIFROST_JWT_SECRET` and
  `BIFROST_JWT_REFRESH_SECRET` are required — Bifröst refuses to start without
  them. Generate each with `openssl rand -hex 64`.
- **Serve over HTTPS.** Refresh cookies and admin sessions must not travel over
  plain HTTP.
- **Restrict the MCP server.** The MCP HTTP/SSE endpoint (default port 3456)
  requires a Bearer token; keep it behind your reverse proxy and firewall.
- **Keep backups.** Use the export feature and the content Git repository for
  versioned backups.

See `docs/bifrost/security.md` and `docs/bifrost/deployment.md` for more detail.
