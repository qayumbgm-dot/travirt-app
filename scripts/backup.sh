#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# TraVirt database backup script
#
# Usage:
#   ./scripts/backup.sh
#
# Environment variables (all optional, have sensible defaults):
#   DATABASE_URL   — PostgreSQL connection string (reads from .env if unset)
#   BACKUP_DIR     — Directory to write backups to (default: /var/backups/travirt)
#   KEEP_DAYS      — How many days of backups to retain  (default: 7)
#
# Cron example — daily at 02:00:
#   0 2 * * * /path/to/travirt-9/scripts/backup.sh >> /var/log/travirt-backup.log 2>&1
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../backend/.env"

# Load DATABASE_URL from .env if not already set in the environment
if [[ -z "${DATABASE_URL:-}" ]] && [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC2046
  export $(grep -E '^DATABASE_URL=' "$ENV_FILE" | xargs)
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[backup] ERROR: DATABASE_URL is not set. Aborting." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-/var/backups/travirt}"
KEEP_DAYS="${KEEP_DAYS:-7}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILENAME="${BACKUP_DIR}/travirt_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[backup] Starting backup → ${FILENAME}"
pg_dump "$DATABASE_URL" | gzip > "$FILENAME"
echo "[backup] Done. Size: $(du -sh "$FILENAME" | cut -f1)"

# Remove backups older than KEEP_DAYS
PRUNED=$(find "$BACKUP_DIR" -name 'travirt_*.sql.gz' -mtime +"${KEEP_DAYS}" -print -delete | wc -l)
echo "[backup] Pruned ${PRUNED} backup(s) older than ${KEEP_DAYS} days."
