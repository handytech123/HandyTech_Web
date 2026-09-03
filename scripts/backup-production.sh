#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/handytech/HandyTech-Website"
BACKUP_DIR="/var/backups/handytech"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"

set -a
source "$APP_DIR/.env"
set +a
if [[ -z "${DATABASE_URL:-}" ]]; then
  DATABASE_URL="$(sudo -u lou env PM2_HOME=/home/lou/.pm2 pm2 jlist | node -e "let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>process.stdout.write(JSON.parse(d)[0]?.pm2_env?.DATABASE_URL||''))")"
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is unavailable; database backup aborted" >&2
  exit 1
fi

pg_dump "$DATABASE_URL" --format=custom --file="$BACKUP_DIR/database-$STAMP.dump"
tar -czf "$BACKUP_DIR/uploads-$STAMP.tar.gz" -C "$APP_DIR/server/public" uploads
find "$BACKUP_DIR" -type f -mtime +30 -delete
