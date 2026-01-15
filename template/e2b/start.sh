#!/bin/bash
# OPTIMIZED: Minimal startup for fastest port 3210 availability
# Skip logging and checks - template build already verified everything

STORAGE_DIR=/home/user/.convex/convex-backend-state/lakitu
SQLITE_DB=$STORAGE_DIR/convex_local_backend.sqlite3

# Start convex-backend immediately with --disable-beacon to skip telemetry
exec convex-backend \
  "$SQLITE_DB" \
  --port 3210 \
  --site-proxy-port 3211 \
  --local-storage "$STORAGE_DIR" \
  --disable-beacon
