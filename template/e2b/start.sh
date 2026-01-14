#!/bin/bash
set -e

echo "=== Starting Lakitu Sandbox ==="

STORAGE_DIR=/home/user/.convex/convex-backend-state/lakitu
SQLITE_DB=$STORAGE_DIR/convex_local_backend.sqlite3
LAKITU_DIR=/home/user/lakitu

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

# Write environment variables to .env.local for Convex functions
# These are passed from the E2B sandbox creation
ENV_FILE="$LAKITU_DIR/.env.local"
echo "Writing environment to $ENV_FILE..."
cat > "$ENV_FILE" << EOF
# Auto-generated at sandbox startup
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=0135d8598650f8f5cb0f30c34ec2e2bb62793bc28717c8eb6fb577996d50be5f4281b59181095065c5d0f86a2c31ddbe9b597ec62b47ded69782cd
OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-}
CONVEX_URL=${CONVEX_URL:-}
SANDBOX_JWT=${SANDBOX_JWT:-}
EOF

echo "  - OPENROUTER_API_KEY: ${OPENROUTER_API_KEY:+set (${#OPENROUTER_API_KEY} chars)}"
echo "  - CONVEX_URL: ${CONVEX_URL:-not set}"
echo "  - SANDBOX_JWT: ${SANDBOX_JWT:+set}"

# Start the backend with explicit paths
# - First arg is the sqlite db path
# - --local-storage is for blob storage (modules, files, etc)
exec convex-backend \
  "$SQLITE_DB" \
  --port 3210 \
  --site-proxy-port 3211 \
  --local-storage "$STORAGE_DIR"
