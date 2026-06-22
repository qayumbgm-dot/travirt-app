#!/usr/bin/env bash
# deploy/backup.sh — PostgreSQL backup for TraVirt
#
# Usage:
#   ./deploy/backup.sh                    # manual run
#   DATABASE_URL=... ./deploy/backup.sh   # explicit connection
#
# Environment variables (set in /opt/travirt/backend/.env or export):
#   DATABASE_URL          postgresql://user:pass@host:5432/dbname
#   BACKUP_DIR            Local directory for backups (default: /var/backups/travirt)
#   BACKUP_RETAIN_DAYS    How many days to keep local backups (default: 30)
#   S3_BUCKET             S3 destination, e.g. s3://my-bucket/travirt-backups (optional)
#   S3_RETAIN_DAYS        How many days to keep S3 backups (default: 90)
#   BACKUP_PASSPHRASE     If set, encrypts backup with AES-256-CBC before S3 upload
#
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────

BACKUP_DIR="${BACKUP_DIR:-/var/backups/travirt}"
BACKUP_RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-}"
S3_RETAIN_DAYS="${S3_RETAIN_DAYS:-90}"
BACKUP_PASSPHRASE="${BACKUP_PASSPHRASE:-}"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
FILENAME="travirt_pg_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

# ── Parse DATABASE_URL ────────────────────────────────────────────────────────

if [[ -n "${DATABASE_URL:-}" ]]; then
  # postgresql://user:pass@host:port/dbname
  PGUSER=$(echo "$DATABASE_URL" | sed -E 's|postgresql://([^:]+):.*|\1|')
  PGPASSWORD=$(echo "$DATABASE_URL" | sed -E 's|postgresql://[^:]+:([^@]+)@.*|\1|')
  PGHOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+)[:/].*|\1|')
  PGPORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
  PGDATABASE=$(echo "$DATABASE_URL" | sed -E 's|.*/([^?]+).*|\1|')
  export PGUSER PGPASSWORD PGHOST PGPORT PGDATABASE
fi

# ── Validate pg connectivity ──────────────────────────────────────────────────

if ! command -v pg_dump &>/dev/null; then
  echo "[backup] ERROR: pg_dump not found. Install postgresql-client." >&2
  exit 1
fi

echo "[backup] Starting backup at $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "[backup] Database: ${PGDATABASE:-travirt} @ ${PGHOST:-localhost}"

# ── Create backup directory ───────────────────────────────────────────────────

mkdir -p "$BACKUP_DIR"

# ── Dump + compress ───────────────────────────────────────────────────────────

echo "[backup] Dumping to ${FILEPATH} ..."
pg_dump \
  --format=plain \
  --no-owner \
  --no-acl \
  --verbose \
  "${PGDATABASE:-travirt}" \
  2>>"${BACKUP_DIR}/pg_dump_${TIMESTAMP}.log" \
  | gzip --best > "$FILEPATH"

DUMP_SIZE=$(du -sh "$FILEPATH" | cut -f1)
echo "[backup] Dump complete: ${DUMP_SIZE}"

# ── Optional S3 upload ────────────────────────────────────────────────────────

if [[ -n "$S3_BUCKET" ]]; then
  if ! command -v aws &>/dev/null; then
    echo "[backup] WARN: S3_BUCKET set but aws CLI not found — skipping S3 upload." >&2
  else
    UPLOAD_PATH="${FILEPATH}"

    # Encrypt before upload if passphrase is set
    if [[ -n "$BACKUP_PASSPHRASE" ]]; then
      ENC_PATH="${FILEPATH}.enc"
      echo "[backup] Encrypting backup (AES-256-CBC) ..."
      openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
        -pass "pass:${BACKUP_PASSPHRASE}" \
        -in "$FILEPATH" -out "$ENC_PATH"
      UPLOAD_PATH="$ENC_PATH"
      FILENAME="${FILENAME}.enc"
    fi

    echo "[backup] Uploading to ${S3_BUCKET}/${FILENAME} ..."
    aws s3 cp "$UPLOAD_PATH" "${S3_BUCKET}/${FILENAME}" \
      --storage-class STANDARD_IA \
      --no-progress
    echo "[backup] S3 upload complete"

    # Clean up encrypted file (the unencrypted .gz stays locally)
    [[ -n "$BACKUP_PASSPHRASE" && -f "${FILEPATH}.enc" ]] && rm -f "${FILEPATH}.enc"

    # Remove S3 backups older than S3_RETAIN_DAYS
    CUTOFF=$(date -u -d "${S3_RETAIN_DAYS} days ago" +"%Y-%m-%d" 2>/dev/null || \
             date -u -v "-${S3_RETAIN_DAYS}d" +"%Y-%m-%d")  # macOS fallback
    echo "[backup] Removing S3 backups older than ${S3_RETAIN_DAYS} days (before ${CUTOFF}) ..."
    aws s3 ls "${S3_BUCKET}/" \
      | awk '{print $4}' \
      | grep '^travirt_pg_' \
      | while read -r key; do
          key_date="${key:11:8}"  # extract YYYYMMDD from travirt_pg_YYYYMMDD_...
          key_date_fmt="${key_date:0:4}-${key_date:4:2}-${key_date:6:2}"
          if [[ "$key_date_fmt" < "$CUTOFF" ]]; then
            echo "[backup] Removing old S3 object: ${key}"
            aws s3 rm "${S3_BUCKET}/${key}" --quiet
          fi
        done
  fi
fi

# ── Local retention cleanup ───────────────────────────────────────────────────

echo "[backup] Removing local backups older than ${BACKUP_RETAIN_DAYS} days ..."
find "$BACKUP_DIR" \
  -maxdepth 1 \
  \( -name "travirt_pg_*.sql.gz" -o -name "travirt_pg_*.sql.gz.enc" -o -name "pg_dump_*.log" \) \
  -mtime "+${BACKUP_RETAIN_DAYS}" \
  -delete \
  -print | sed 's/^/[backup] Removed: /'

# ── Summary ───────────────────────────────────────────────────────────────────

echo "[backup] Done at $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "[backup] Local backups retained:"
ls -lh "${BACKUP_DIR}/travirt_pg_"*.sql.gz 2>/dev/null | tail -5 || true
