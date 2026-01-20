#!/bin/bash
# Start convex-backend with pre-deployed functions

STORAGE_DIR=/home/user/.convex/convex-backend-state/lakitu
SQLITE_DB=$STORAGE_DIR/convex_local_backend.sqlite3
MODULES_DIR=$STORAGE_DIR/modules

# Deploy functions FIRST if not already deployed
if [ ! -d "$MODULES_DIR" ] || [ -z "$(ls -A $MODULES_DIR 2>/dev/null)" ]; then
  echo "Pre-deploying Convex functions..."
  
  # Start temp backend on different port for deployment
  convex-backend \
    "$SQLITE_DB" \
    --port 3209 \
    --site-proxy-port 3208 \
    --local-storage "$STORAGE_DIR" \
    --disable-beacon &
  TEMP_PID=$!
  
  # Wait for temp backend
  for i in {1..30}; do
    if curl -s http://127.0.0.1:3209/version > /dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  
  # Deploy functions
  cd /home/user/lakitu
  export CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3209
  export CONVEX_SELF_HOSTED_ADMIN_KEY=0135d8598650f8f5cb0f30c34ec2e2bb62793bc28717c8eb6fb577996d50be5f4281b59181095065c5d0f86a2c31ddbe9b597ec62b47ded69782cd
  
  if npx convex dev --once --typecheck disable > /tmp/convex-deploy.log 2>&1; then
    echo "Functions deployed successfully"
  else
    echo "Deploy failed:"
    cat /tmp/convex-deploy.log
  fi
  
  # Stop temp backend
  kill $TEMP_PID 2>/dev/null
  sleep 1
  
  # Verify deployment
  if [ -d "$MODULES_DIR" ] && [ -n "$(ls -A $MODULES_DIR 2>/dev/null)" ]; then
    MODULE_COUNT=$(ls -1 $MODULES_DIR | wc -l)
    echo "Deployed $MODULE_COUNT modules"
  else
    echo "WARNING: No modules deployed"
  fi
fi

# Now start the main backend on correct port
exec convex-backend \
  "$SQLITE_DB" \
  --port 3210 \
  --site-proxy-port 3211 \
  --local-storage "$STORAGE_DIR" \
  --disable-beacon
