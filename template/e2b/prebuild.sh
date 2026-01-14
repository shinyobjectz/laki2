#!/bin/bash
# Pre-deploy Convex functions during Docker build
# This script is called from the Dockerfile to bake functions into the image
set -e

echo "=== Pre-deploying Convex functions ==="

cd /home/user/lakitu

export CONVEX_LOCAL_STORAGE=/home/user/.convex/convex-backend-state/lakitu

mkdir -p "$CONVEX_LOCAL_STORAGE"

echo "Starting convex-backend..."
echo "  - Port: 3210"
echo "  - Site proxy: 3211"
echo "  - Storage: $CONVEX_LOCAL_STORAGE"

# Start convex-backend in background
convex-backend --port 3210 --site-proxy-port 3211 \
  --local-storage "$CONVEX_LOCAL_STORAGE" &
BACKEND_PID=$!

# Wait for backend to be ready with timeout
echo "Waiting for backend to be ready..."
for i in {1..30}; do
  if curl -s http://localhost:3210/version > /dev/null 2>&1; then
    echo "Backend ready after $i seconds"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "ERROR: Backend failed to start within 30 seconds"
    exit 1
  fi
  sleep 1
done

# Create .env.local to configure local deployment (skips login prompt)
echo "=== Creating .env.local ==="
cat > .env.local << 'ENVLOCAL'
# Deployment used by npx convex dev
CONVEX_DEPLOYMENT=local:lakitu-sandbox

CONVEX_URL=http://127.0.0.1:3210
ENVLOCAL
cat .env.local

# Deploy functions using convex dev --once
echo "=== Deploying functions ==="
./node_modules/.bin/convex dev --once --typecheck disable

# Verify deployment by listing functions
echo "=== Verifying deployment ==="
curl -s http://localhost:3210/api/0.1.0/list_functions | head -100

# Give backend time to flush state to disk
sleep 2

# Stop the backend gracefully
echo "=== Stopping backend ==="
kill $BACKEND_PID 2>/dev/null || true
wait $BACKEND_PID 2>/dev/null || true

# Verify state was persisted
echo "=== Verifying persisted state ==="
ls -la "$CONVEX_LOCAL_STORAGE/"

echo "=== Pre-deploy complete! ==="
