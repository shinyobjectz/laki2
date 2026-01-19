#!/bin/bash
# Build E2B template using Dockerfile (bypasses SDK .copy() issues)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LAKITU_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$LAKITU_DIR/../.." && pwd)"
BUILD_CONTEXT="/tmp/lakitu-docker-build"

echo "=== Lakitu Docker Build ==="
echo "Script dir: $SCRIPT_DIR"
echo "Lakitu dir: $LAKITU_DIR"
echo "Project root: $PROJECT_ROOT"

# Clean and create build context
rm -rf "$BUILD_CONTEXT"
mkdir -p "$BUILD_CONTEXT"

# Copy lakitu source (excluding unnecessary files)
echo "Copying lakitu source..."
rsync -av \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='template' \
  --exclude='assets' \
  --exclude='cli' \
  --exclude='tests' \
  --exclude='dist' \
  --exclude='.github' \
  --exclude='.env*' \
  --exclude='convex/cloud' \
  "$LAKITU_DIR/" "$BUILD_CONTEXT/lakitu/"

# Copy project KSAs if they exist
if [ -d "$PROJECT_ROOT/lakitu" ]; then
  echo "Copying project KSAs..."
  cp "$PROJECT_ROOT/lakitu/"*.ts "$BUILD_CONTEXT/lakitu/ksa/" 2>/dev/null || true
  echo "Copied $(ls "$PROJECT_ROOT/lakitu/"*.ts 2>/dev/null | wc -l) project KSAs"
fi

# Copy Dockerfile and scripts
echo "Copying Docker files..."
cp "$SCRIPT_DIR/e2b/start.sh" "$BUILD_CONTEXT/"
cp "$SCRIPT_DIR/e2b/prebuild.sh" "$BUILD_CONTEXT/"

# Create Dockerfile in build context
cat > "$BUILD_CONTEXT/Dockerfile" << 'DOCKERFILE'
# Lakitu E2B Sandbox Template
FROM e2bdev/code-interpreter:latest

# System dependencies
RUN apt-get update && apt-get install -y \
    git curl sqlite3 libsqlite3-dev \
    build-essential unzip \
    && rm -rf /var/lib/apt/lists/*

# Bun runtime
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:/home/user/.bun/bin:$PATH"

# Node.js for npx convex
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Convex local backend
RUN curl -L -o /tmp/convex.zip "https://github.com/get-convex/convex-backend/releases/download/precompiled-2026-01-08-272e7f4/convex-local-backend-x86_64-unknown-linux-gnu.zip" && \
    unzip /tmp/convex.zip -d /tmp && \
    mv /tmp/convex-local-backend /usr/local/bin/convex-backend && \
    chmod +x /usr/local/bin/convex-backend && \
    rm /tmp/convex.zip

# Directory structure
RUN mkdir -p /home/user/workspace /home/user/.convex/convex-backend-state/lakitu /home/user/artifacts && \
    chown -R user:user /home/user

# Copy lakitu code
COPY --chown=user:user lakitu/ /home/user/lakitu/

# Copy scripts
COPY --chown=user:user start.sh /home/user/start.sh
COPY --chown=user:user prebuild.sh /home/user/prebuild.sh
RUN chmod +x /home/user/start.sh /home/user/prebuild.sh

# Install dependencies
WORKDIR /home/user/lakitu
RUN /root/.bun/bin/bun install

# Create CLI tools
RUN echo '#!/bin/bash\nbun run /home/user/lakitu/runtime/pdf/pdf-generator.ts "$@"' > /usr/local/bin/generate-pdf && \
    chmod +x /usr/local/bin/generate-pdf && \
    echo '#!/bin/bash\nbun run /home/user/lakitu/runtime/browser/agent-browser-cli.ts "$@"' > /usr/local/bin/agent-browser && \
    chmod +x /usr/local/bin/agent-browser

# Symlink KSA
RUN ln -sf /home/user/lakitu/ksa /home/user/ksa

# Pre-deploy Convex functions (bakes them into image)
RUN /home/user/prebuild.sh

# Fix ownership
RUN chown -R user:user /home/user

# Environment
ENV HOME=/home/user
ENV PATH="/home/user/.bun/bin:/usr/local/bin:/usr/bin:/bin"
ENV CONVEX_URL="http://localhost:3210"
ENV LOCAL_CONVEX_URL="http://localhost:3210"
ENV CONVEX_LOCAL_STORAGE="/home/user/.convex/convex-backend-state/lakitu"

USER user
WORKDIR /home/user/workspace
DOCKERFILE

# Create e2b.toml
cat > "$BUILD_CONTEXT/e2b.toml" << 'TOML'
template_id = "lakitu"
template_name = "lakitu"
dockerfile = "Dockerfile"
start_cmd = "/home/user/start.sh"
TOML

echo ""
echo "Build context ready at: $BUILD_CONTEXT"
echo "Contents:"
ls -la "$BUILD_CONTEXT"
echo ""
echo "Lakitu KSA modules:"
ls "$BUILD_CONTEXT/lakitu/ksa/"*.ts 2>/dev/null | head -10
echo ""

# Run E2B template build
echo "=== Running e2b template build ==="
cd "$BUILD_CONTEXT"
e2b template build

echo ""
echo "=== Build complete! ==="
