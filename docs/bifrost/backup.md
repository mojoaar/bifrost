# Backup & Restoration

Bifröst content lives in two places: the filesystem (`content/`) and the SQLite database (`data/bifrost.db`). Backing up is straightforward.

## Manual Filesystem Backup

The entire `content/` directory contains all your posts, pages, templates, and media. A simple tarball captures everything:

```bash
tar -czf bifrost-backup.tar.gz content/ data/bifrost.db
```

To restore:

```bash
tar -xzf bifrost-backup.tar.gz
# Restart Bifröst — the watcher will re-index all files
```

## API-Based Backup

Bifröst has a built-in export API that creates a ZIP archive of the `content/` directory.

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/export \
  -o bifrost-export.zip
```

Get an API key from `/admin/profile` in the admin dashboard.

## API-Based Import

Restore a ZIP backup via the import API:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "file=@bifrost-export.zip" \
  http://localhost:3000/api/v1/import
```

After import, the content watcher automatically re-indexes all files into the database. No restart needed.

## Automated Cron Backup

Create a shell script for automated daily backups:

```bash
#!/bin/bash
# /opt/bifrost/backup.sh

BACKUP_DIR="/opt/backups/bifrost"
DATE=$(date +%Y-%m-%d)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Filesystem + database backup
tar -czf "$BACKUP_DIR/bifrost-$DATE.tar.gz" \
  /opt/bifrost/content/ \
  /opt/bifrost/data/bifrost.db

# API export (alternative method)
curl -s -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/export \
  -o "$BACKUP_DIR/bifrost-api-$DATE.zip"

# Clean up old backups
find "$BACKUP_DIR" -name "bifrost-*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "bifrost-api-*.zip" -mtime +$RETENTION_DAYS -delete
```

Schedule with cron:

```bash
# Run daily at 3 AM
crontab -e
0 3 * * * /opt/bifrost/backup.sh
```

## Offsite Storage

Send backups to remote storage using standard tools:

### S3 / R2

```bash
aws s3 cp bifrost-backup.tar.gz s3://my-backups/bifrost/
```

### rsync

```bash
rsync -avz bifrost-backup.tar.gz user@backup-server:/backups/bifrost/
```

### SCP

```bash
scp bifrost-backup.tar.gz user@backup-server:/backups/bifrost/
```

## Database-Only Backup

SQLite is a single file — just copy it:

```bash
cp data/bifrost.db data/bifrost-backup.db
```

The database stores metadata (tags, settings, page views) that can be rebuilt from the content files using the watcher. The filesystem backup is the authoritative source.

## Full System Restore

1. Extract the backup tarball: `tar -xzf bifrost-backup.tar.gz`
2. Place `content/` and `data/bifrost.db` in the Bifröst working directory
3. Start Bifröst — the watcher scans all files and rebuilds the database index
4. Verify at `http://localhost:3000/admin`

All posts, pages, media, tags, and settings will be restored. API keys and users are in the database — they survive a DB copy directly.
