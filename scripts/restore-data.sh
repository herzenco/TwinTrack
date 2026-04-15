#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# TwinTrack Data Restore
# Restores data from a backup directory back into Supabase.
# Use this if verify-data.sh reports lost rows.
#
# Usage: ./scripts/restore-data.sh [backup_dir]
#   If no backup_dir given, uses the most recent backup.
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_PARENT="$PROJECT_DIR/backups"

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

# Determine backup dir
if [ -n "${1:-}" ]; then
  BACKUP_DIR="$1"
else
  BACKUP_DIR=$(ls -1d "$BACKUP_PARENT"/20* 2>/dev/null | tail -1)
fi

if [ -z "$BACKUP_DIR" ] || [ ! -d "$BACKUP_DIR" ]; then
  echo "ERROR: No backup directory found."
  echo "Usage: ./scripts/restore-data.sh [backup_dir]"
  exit 1
fi

echo "=== TwinTrack Data Restore ==="
echo "Restoring from: $BACKUP_DIR"
echo ""

# Restore order matters due to foreign keys
TABLES=("twin_pairs" "user_profiles" "pair_members" "events" "active_timers" "invites")

for TABLE in "${TABLES[@]}"; do
  FILE="$BACKUP_DIR/${TABLE}.json"

  if [ ! -f "$FILE" ]; then
    echo "  SKIP $TABLE (no backup file)"
    continue
  fi

  ROW_COUNT=$(python3 -c "import json; print(len(json.load(open('$FILE'))))" 2>/dev/null || echo "0")

  if [ "$ROW_COUNT" = "0" ]; then
    echo "  SKIP $TABLE (empty)"
    continue
  fi

  # Upsert using POST with on_conflict resolution
  # This won't duplicate existing rows — only restores missing ones
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "${SUPABASE_URL}/rest/v1/${TABLE}" \
    -X POST \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates" \
    -d @"$FILE")

  if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "  OK   $TABLE: restored $ROW_COUNT rows"
  else
    echo "  FAIL $TABLE: HTTP $HTTP_CODE (may need service_role key for RLS-protected tables)"
  fi
done

echo ""
echo "Restore complete. Run ./scripts/verify-data.sh to confirm."
