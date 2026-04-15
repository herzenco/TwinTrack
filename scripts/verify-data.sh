#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# TwinTrack Post-Deploy Verification
# Compares current DB row counts against the most recent backup.
# Run this AFTER every deployment to confirm no data was lost.
#
# Usage: ./scripts/verify-data.sh
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

# Find most recent backup
LATEST_BACKUP=$(ls -1d "$BACKUP_PARENT"/20* 2>/dev/null | tail -1)
if [ -z "$LATEST_BACKUP" ]; then
  echo "ERROR: No backups found. Run ./scripts/backup-data.sh first."
  exit 1
fi

echo "=== TwinTrack Post-Deploy Verification ==="
echo "Comparing against backup: $(basename "$LATEST_BACKUP")"
echo ""

TABLES=("twin_pairs" "pair_members" "events" "active_timers" "invites" "user_profiles")
FAILURES=0

for TABLE in "${TABLES[@]}"; do
  BACKUP_FILE="$LATEST_BACKUP/${TABLE}.json"

  if [ ! -f "$BACKUP_FILE" ]; then
    echo "  SKIP $TABLE (no backup file)"
    continue
  fi

  BACKUP_COUNT=$(python3 -c "import json; print(len(json.load(open('$BACKUP_FILE'))))" 2>/dev/null || echo "0")

  # Get current count from DB using Supabase HEAD request with count
  CURRENT_RESPONSE=$(curl -s -D - -o /dev/null \
    "${SUPABASE_URL}/rest/v1/${TABLE}?select=*" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Prefer: count=exact" \
    -H "Range: 0-0")

  CURRENT_COUNT=$(echo "$CURRENT_RESPONSE" | grep -i "content-range" | sed 's/.*\///' | tr -d '\r\n ')

  if [ -z "$CURRENT_COUNT" ] || [ "$CURRENT_COUNT" = "*" ]; then
    CURRENT_COUNT="0"
  fi

  if [ "$CURRENT_COUNT" -lt "$BACKUP_COUNT" ]; then
    echo "  FAIL $TABLE: was $BACKUP_COUNT, now $CURRENT_COUNT (LOST $((BACKUP_COUNT - CURRENT_COUNT)) ROWS)"
    FAILURES=$((FAILURES + 1))
  elif [ "$CURRENT_COUNT" -gt "$BACKUP_COUNT" ]; then
    echo "  OK   $TABLE: $BACKUP_COUNT -> $CURRENT_COUNT (+$((CURRENT_COUNT - BACKUP_COUNT)) new)"
  else
    echo "  OK   $TABLE: $CURRENT_COUNT rows (unchanged)"
  fi
done

echo ""
if [ "$FAILURES" -gt 0 ]; then
  echo "VERIFICATION FAILED: $FAILURES table(s) lost data!"
  echo "Restore from backup: $LATEST_BACKUP"
  exit 1
else
  echo "ALL TABLES VERIFIED — no data lost."
fi
