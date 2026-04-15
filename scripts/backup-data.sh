#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# TwinTrack Pre-Deploy Backup
# Exports all data from Supabase to timestamped JSON files.
# Run this BEFORE every deployment.
#
# Usage: ./scripts/backup-data.sh
# Requires: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups/$(date +%Y%m%d_%H%M%S)"

# Load env
ENV_FILE=""
if [ -f "$PROJECT_DIR/.env" ]; then
  ENV_FILE="$PROJECT_DIR/.env"
elif [ -f "$PROJECT_DIR/.env.local" ]; then
  ENV_FILE="$PROJECT_DIR/.env.local"
else
  echo "ERROR: No .env or .env.local found"
  exit 1
fi

SUPABASE_URL="$(grep '^VITE_SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2-)"
SUPABASE_KEY="$(grep '^VITE_SUPABASE_ANON_KEY=' "$ENV_FILE" | cut -d= -f2-)"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "ERROR: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TABLES=("twin_pairs" "pair_members" "events" "active_timers" "invites" "user_profiles")

echo "=== TwinTrack Backup ==="
echo "Backing up to: $BACKUP_DIR"
echo ""

TOTAL_ROWS=0

for TABLE in "${TABLES[@]}"; do
  FILE="$BACKUP_DIR/${TABLE}.json"

  HTTP_CODE=$(curl -s -o "$FILE" -w "%{http_code}" \
    "${SUPABASE_URL}/rest/v1/${TABLE}?select=*&limit=10000" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}")

  if [ "$HTTP_CODE" != "200" ]; then
    echo "  WARNING: $TABLE returned HTTP $HTTP_CODE"
    ROW_COUNT=0
  else
    ROW_COUNT=$(python3 -c "import json; print(len(json.load(open('$FILE'))))" 2>/dev/null || echo "0")
  fi

  TOTAL_ROWS=$((TOTAL_ROWS + ROW_COUNT))
  echo "  $TABLE: $ROW_COUNT rows"
done

# Write manifest
cat > "$BACKUP_DIR/manifest.json" <<MANIFEST
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "supabase_url": "$SUPABASE_URL",
  "total_rows": $TOTAL_ROWS,
  "git_commit": "$(git -C "$PROJECT_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")",
  "git_branch": "$(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null || echo "unknown")"
}
MANIFEST

echo ""
echo "Total rows backed up: $TOTAL_ROWS"
echo "Backup saved to: $BACKUP_DIR"
echo ""

# Keep only the last 20 backups
BACKUP_PARENT="$(dirname "$BACKUP_DIR")"
BACKUP_COUNT=$(ls -1d "$BACKUP_PARENT"/20* 2>/dev/null | wc -l | tr -d ' ')
if [ "$BACKUP_COUNT" -gt 20 ]; then
  REMOVE_COUNT=$((BACKUP_COUNT - 20))
  ls -1d "$BACKUP_PARENT"/20* | head -n "$REMOVE_COUNT" | xargs rm -rf
  echo "Cleaned up $REMOVE_COUNT old backups"
fi
