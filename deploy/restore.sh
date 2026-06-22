#!/usr/bin/env bash
# deploy/restore.sh — Restore a TraVirt PostgreSQL backup
#
# Usage:
#   ./deploy/restore.sh <backup_file>              # local .sql.gz
#   ./deploy/restore.sh <backup_file>.enc          # local encrypted backup
#   ./deploy/restore.sh s3://bucket/travirt_pg_... # download from S3 first
#
# Environment variables:
#   DATABASE_URL        postgresql://user:pass@host:5432/dbname
#   BACKUP_PASSPHRASE   Required when restoring an .enc backup
#
set -euo pipefail

BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" ]]; then
  echo "Usage: $0 <backup_file.sql.gz[.enc] | s3://bucket/key>" >&2
  exit 1
fi

# ── Parse DATABASE_URL ────────────────────────────────────────────────────────

if [[ -n "${DATABASE_URL:-}" ]]; then
  PGUSER=$(echo "$DATABASE_URL" | sed -E 's|postgresql://([^:]+):.*|\1|')
  PGPASSWORD=$(echo "$DATABASE_URL" | sed -E 's|postgresql://[^:]+:([^@]+)@.*|\1|')
  PGHOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+)[:/].*|\1|')
  PGPORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
  PGDATABASE=$(echo "$DATABASE_URL" | sed -E 's|.*/([^?]+).*|\1|')
  export PGUSER PGPASSWORD PGHOST PGPORT PGDATABASE
fi

# ── Download from S3 if needed ────────────────────────────────────────────────

LOCAL_FILE="$BACKUP_FILE"
if [[ "$BACKUP_FILE" == s3://* ]]; then
  if ! command -v aws &>/dev/null; then
    echo "[restore] ERROR: aws CLI required for S3 downloads." >&2; exit 1
  fi
  LOCAL_FILE="/tmp/$(basename "$BACKUP_FILE")"
  echo "[restore] Downloading ${BACKUP_FILE} ..."
  aws s3 cp "$BACKUP_FILE" "$LOCAL_FILE" --no-progress
  echo "[restore] Downloaded to ${LOCAL_FILE}"
fi

# ── Decrypt if .enc ───────────────────────────────────────────────────────────

RESTORE_FILE="$LOCAL_FILE"
if [[ "$LOCAL_FILE" == *.enc ]]; then
  if [[ -z "${BACKUP_PASSPHRASE:-}" ]]; then
    echo "[restore] ERROR: BACKUP_PASSPHRASE is required to decrypt this backup." >&2
    exit 1
  fi
  DECRYPTED="${LOCAL_FILE%.enc}"
  echo "[restore] Decrypting backup ..."
  openssl enc -aes-256-cbc -d -salt -pbkdf2 -iter 100000 \
    -pass "pass:${BACKUP_PASSPHRASE}" \
    -in "$LOCAL_FILE" -out "$DECRYPTED"
  RESTORE_FILE="$DECRYPTED"
  echo "[restore] Decrypted to ${RESTORE_FILE}"
fi

# ── Safety check ──────────────────────────────────────────────────────────────

echo ""
echo "============================================================"
echo " WARNING: This will DESTROY all data in:"
echo "   Database : ${PGDATABASE:-travirt}"
echo "   Host     : ${PGHOST:-localhost}"
echo " and restore from:"
echo "   File     : ${RESTORE_FILE}"
echo "============================================================"
echo ""
read -r -p "Type 'yes' to proceed: " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "[restore] Aborted."
  exit 0
fi

# ── Drop + recreate the database ──────────────────────────────────────────────

echo "[restore] Dropping existing database ..."
dropdb --if-exists --force "${PGDATABASE:-travirt}"

echo "[restore] Creating fresh database ..."
createdb "${PGDATABASE:-travirt}"

# ── Restore ───────────────────────────────────────────────────────────────────

echo "[restore] Restoring from ${RESTORE_FILE} ..."
gunzip --stdout "$RESTORE_FILE" | psql "${PGDATABASE:-travirt}" --quiet

echo "[restore] Restore complete."

# ── Cleanup temp files ────────────────────────────────────────────────────────

[[ "$BACKUP_FILE" == s3://* ]] && rm -f "$LOCAL_FILE"
[[ "$RESTORE_FILE" != "$LOCAL_FILE" ]] && rm -f "$RESTORE_FILE"

echo "[restore] Done."
