# Deployment

This guide covers running Bifröst in production: building the app, deploying with Docker Compose or on bare metal with systemd, configuring environment variables, terminating TLS with a reverse proxy, and backing up your data.

## Building for production

Bifröst is a standard Next.js 16 app. Build once, then run the production server:

```bash
npm ci
npm run build
npm run start   # serves on $PORT (default 3000)
```

`npm run build` compiles the app and runs Drizzle migrations as needed on first boot.

## Environment variables

Configure the deployment with environment variables. Bifröst-specific ones are prefixed with `BIFROST_`.

| Variable              | Required | Description                                             |
| --------------------- | -------- | ------------------------------------------------------- |
| `BIFROST_JWT_SECRET`  | Yes      | Secret used to sign session JWTs. Use a long random value. |
| `DATABASE_URL`        | Yes      | Database connection string. Default SQLite: `file:./bifrost.db`. |
| `NODE_ENV`            | Yes      | Set to `production`.                                    |
| `PORT`                | No       | Port the server listens on (default `3000`).            |

Example `.env` (never commit this file):

```env
BIFROST_JWT_SECRET=$(openssl rand -hex 32)
DATABASE_URL=file:/data/bifrost.db
NODE_ENV=production
PORT=3000
```

For Postgres instead of SQLite:

```env
DATABASE_URL=postgres://user:pass@db:5432/bifrost
```

## Docker Compose

The simplest production setup. Create `docker-compose.yml`:

```yaml
services:
  bifrost:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      BIFROST_JWT_SECRET: ${BIFROST_JWT_SECRET}
      DATABASE_URL: file:/data/bifrost.db
    volumes:
      - bifrost-data:/data          # SQLite database
      - bifrost-content:/app/content # markdown content repo
      - bifrost-media:/app/media     # uploaded media

volumes:
  bifrost-data:
  bifrost-content:
  bifrost-media:
```

Bring it up:

```bash
export BIFROST_JWT_SECRET=$(openssl rand -hex 32)
docker compose up -d --build
```

## Bare metal with systemd

Run the built app as a managed service. Create `/etc/systemd/system/bifrost.service`:

```ini
[Unit]
Description=Bifrost blog
After=network.target

[Service]
Type=simple
User=bifrost
WorkingDirectory=/opt/bifrost
EnvironmentFile=/opt/bifrost/.env
ExecStart=/usr/bin/npm run start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now bifrost
sudo systemctl status bifrost
```

## Running the MCP server as a service

The [MCP server](./mcp.md) is a standalone process, separate from the web app. It listens on `mcp.port` (default `3456`) and serves the SSE endpoint at `/sse`. Run it as its own long-lived service alongside the app.

First compile it (produces `dist/mcp/http-server.cjs`):

```bash
npm run build:mcp
```

The compiled server needs the same environment (`BIFROST_JWT_SECRET`, `DATABASE_URL`) and the same working directory as the app — it reads the `VERSION` file and `bifrost.config.ts` relative to the current directory. It respects the `mcp.enabled` setting (returns `503` when disabled) and authenticates every request with a `Bearer` token: an API key (`bfk_…`) or a session JWT.

### Docker Compose

Add a second service that reuses the same image and volumes but runs the MCP server:

```yaml
services:
  bifrost:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      BIFROST_JWT_SECRET: ${BIFROST_JWT_SECRET}
      DATABASE_URL: file:/data/bifrost.db
    volumes:
      - bifrost-data:/data
      - bifrost-content:/app/content
      - bifrost-media:/app/media

  bifrost-mcp:
    build: .
    restart: unless-stopped
    working_dir: /app
    command: npm run mcp:start
    ports:
      - "3456:3456"
    environment:
      NODE_ENV: production
      BIFROST_JWT_SECRET: ${BIFROST_JWT_SECRET}
      DATABASE_URL: file:/data/bifrost.db
    volumes:
      - bifrost-data:/data
      - bifrost-content:/app/content
      - bifrost-media:/app/media

volumes:
  bifrost-data:
  bifrost-content:
  bifrost-media:
```

The bundled Dockerfile already runs `npm run build:mcp` and exposes port `3456`, so `dist/mcp/http-server.cjs` is present in the image.

### systemd

Run the MCP server as a second unit. Create `/etc/systemd/system/bifrost-mcp.service`:

```ini
[Unit]
Description=Bifrost MCP server
After=network.target

[Service]
Type=simple
User=bifrost
WorkingDirectory=/opt/bifrost
EnvironmentFile=/opt/bifrost/.env
ExecStart=/usr/bin/npm run mcp:start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Build the server, then enable and start the unit:

```bash
cd /opt/bifrost && npm run build:mcp
sudo systemctl daemon-reload
sudo systemctl enable --now bifrost-mcp
sudo systemctl status bifrost-mcp
```

## Reverse proxy and TLS

Terminate TLS at a reverse proxy in front of Bifröst.

### nginx

```nginx
server {
    listen 443 ssl;
    server_name blog.example.com;

    ssl_certificate     /etc/letsencrypt/live/blog.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/blog.example.com/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

The `Upgrade`/`Connection` headers matter for the MCP server's SSE endpoint (`/sse`), which is served by a separate MCP process on `mcp.port` (default `3456`) — not the web app. See [Running the MCP server as a service](#running-the-mcp-server-as-a-service).

To expose the MCP server through nginx, proxy it on its own hostname (or a dedicated `location`). SSE needs buffering disabled and a long read timeout:

```nginx
server {
    listen 443 ssl;
    server_name mcp.example.com;

    ssl_certificate     /etc/letsencrypt/live/mcp.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.example.com/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:3456;
        proxy_http_version 1.1;
        proxy_set_header   Connection "";
        proxy_set_header   Host $host;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_buffering    off;
        proxy_read_timeout 24h;
    }
}
```

### Caddy

Caddy handles certificates automatically:

```caddy
blog.example.com {
    reverse_proxy 127.0.0.1:3000
}

mcp.example.com {
    reverse_proxy 127.0.0.1:3456
}
```

## Persistent volumes

Persist three paths so data survives restarts and redeploys:

- **Database** — the SQLite file (`/data/bifrost.db`) or external Postgres.
- **Content** — the markdown Git repo (`/app/content`), your source of truth.
- **Media** — uploaded images (`/app/media`).

In Docker these are named volumes; on bare metal ensure they live outside the deploy directory.

## Database backups

### SQLite

Back up the file while the app is idle, or use SQLite's online backup:

```bash
sqlite3 /data/bifrost.db ".backup '/backups/bifrost-$(date +%F).db'"
```

### Postgres

```bash
pg_dump "$DATABASE_URL" > /backups/bifrost-$(date +%F).sql
```

### Content

Because content is a Git repo, pushing to a remote (see [git.md](./git.md)) is itself an off-site backup:

```bash
cd /app/content && git push origin main
```

Automate all three with a cron job and store backups off the host.

## Post-deploy checklist

- [ ] `BIFROST_JWT_SECRET` set to a strong, unique value.
- [ ] TLS working via the reverse proxy.
- [ ] Volumes for database, content, and media are persistent.
- [ ] Git remote configured for content backup.
- [ ] Scheduled backups verified by a test restore.
