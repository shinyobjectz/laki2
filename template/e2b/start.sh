#!/bin/bash
set -e

echo "=== Starting Lakitu Sandbox ==="

STORAGE_DIR=/home/user/.convex/convex-backend-state/lakitu
SQLITE_DB=$STORAGE_DIR/convex_local_backend.sqlite3

echo "Starting Convex local backend..."
echo "  - Port: 3210"
echo "  - Site proxy: 3211"
echo "  - Storage: $STORAGE_DIR"
echo "  - SQLite: $SQLITE_DB"

# Verify pre-built state exists
if [ ! -f "$SQLITE_DB" ]; then
  echo "ERROR: Pre-built SQLite database not found at $SQLITE_DB"
  echo "The template may not have been built correctly."
  exit 1
fi

echo "  - DB size: $(ls -lh $SQLITE_DB | awk '{print $5}')"

# Start the backend with explicit paths
# - First arg is the sqlite db path
# - --local-storage is for blob storage (modules, files, etc)
exec convex-backend \
  "$SQLITE_DB" \
  --port 3210 \
  --site-proxy-port 3211 \
  --local-storage "$STORAGE_DIR"
