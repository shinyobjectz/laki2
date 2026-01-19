#!/usr/bin/env bun
/**
 * Build E2B template using Dockerfile (bypasses SDK .copy() issues)
 * 
 * Uses Build System v2's fromDockerfile() which leverages Docker's build context
 * instead of the problematic .copy() tar streaming.
 */

import { Template, defaultBuildLogger, waitForPort } from "e2b";
import { $ } from "bun";
import { existsSync, readdirSync } from "fs";
import { join, dirname } from "path";

const SCRIPT_DIR = dirname(import.meta.path);
const LAKITU_DIR = join(SCRIPT_DIR, "..");
const PROJECT_ROOT = join(LAKITU_DIR, "../..");
const BUILD_CONTEXT = "/tmp/lakitu-docker-build";

async function getApiKey(): Promise<string> {
  if (process.env.E2B_API_KEY) return process.env.E2B_API_KEY;
  
  const envPaths = [
    join(process.cwd(), ".env.local"),
    join(PROJECT_ROOT, ".env.local"),
  ];
  
  for (const path of envPaths) {
    try {
      const content = await Bun.file(path).text();
      const match = content.match(/E2B_API_KEY=(.+)/);
      if (match) return match[1].trim();
    } catch { /* not found */ }
  }
  
  throw new Error("E2B_API_KEY not found");
}

async function prepareBuildContext() {
  console.log("=== Preparing Docker build context ===");
  
  // Clean and create
  await $`rm -rf ${BUILD_CONTEXT}`.quiet();
  await $`mkdir -p ${BUILD_CONTEXT}`.quiet();
  
  // Copy lakitu source
  console.log("Copying lakitu source...");
  await $`rsync -av \
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
    ${LAKITU_DIR}/ ${BUILD_CONTEXT}/lakitu/`.quiet();
  
  // Copy project KSAs
  const projectKsaDir = join(PROJECT_ROOT, "lakitu");
  if (existsSync(projectKsaDir)) {
    console.log("Copying project KSAs...");
    const ksaFiles = readdirSync(projectKsaDir).filter(f => f.endsWith(".ts"));
    for (const file of ksaFiles) {
      await $`cp ${join(projectKsaDir, file)} ${BUILD_CONTEXT}/lakitu/ksa/`.quiet();
    }
    console.log(`  Copied ${ksaFiles.length} project KSAs`);
  }
  
  // Copy scripts
  await $`cp ${SCRIPT_DIR}/e2b/start.sh ${BUILD_CONTEXT}/`.quiet();
  await $`cp ${SCRIPT_DIR}/e2b/prebuild.sh ${BUILD_CONTEXT}/`.quiet();
  
  // Create Dockerfile
  const dockerfile = `# Lakitu E2B Sandbox Template
FROM e2bdev/code-interpreter:latest

# System dependencies
RUN apt-get update && apt-get install -y \\
    git curl sqlite3 libsqlite3-dev \\
    build-essential unzip \\
    && rm -rf /var/lib/apt/lists/*

# Bun runtime
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:/home/user/.bun/bin:\$PATH"

# Node.js for npx convex
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \\
    apt-get install -y nodejs && \\
    rm -rf /var/lib/apt/lists/*

# Convex local backend
RUN curl -L -o /tmp/convex.zip "https://github.com/get-convex/convex-backend/releases/download/precompiled-2026-01-08-272e7f4/convex-local-backend-x86_64-unknown-linux-gnu.zip" && \\
    unzip /tmp/convex.zip -d /tmp && \\
    mv /tmp/convex-local-backend /usr/local/bin/convex-backend && \\
    chmod +x /usr/local/bin/convex-backend && \\
    rm /tmp/convex.zip

# Directory structure
RUN mkdir -p /home/user/workspace /home/user/.convex/convex-backend-state/lakitu /home/user/artifacts && \\
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
RUN echo '#!/bin/bash\\nbun run /home/user/lakitu/runtime/pdf/pdf-generator.ts "\$@"' > /usr/local/bin/generate-pdf && \\
    chmod +x /usr/local/bin/generate-pdf && \\
    echo '#!/bin/bash\\nbun run /home/user/lakitu/runtime/browser/agent-browser-cli.ts "\$@"' > /usr/local/bin/agent-browser && \\
    chmod +x /usr/local/bin/agent-browser

# Symlink KSA
RUN ln -sf /home/user/lakitu/ksa /home/user/ksa

# Pre-deploy Convex functions
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
`;
  
  await Bun.write(join(BUILD_CONTEXT, "Dockerfile"), dockerfile);
  
  console.log("Build context ready:");
  await $`ls -la ${BUILD_CONTEXT}`;
  console.log("\nKSA modules:");
  await $`ls ${BUILD_CONTEXT}/lakitu/ksa/*.ts 2>/dev/null | head -10`;
}

async function build() {
  console.log("🍄 Lakitu Docker Build (v2 fromDockerfile)\n");
  
  const apiKey = await getApiKey();
  console.log("🔑 API key found\n");
  
  await prepareBuildContext();
  
  console.log("\n=== Building E2B template from Dockerfile ===\n");
  
  const template = Template()
    .fromDockerfile(join(BUILD_CONTEXT, "Dockerfile"))
    .setStartCmd("/home/user/start.sh", waitForPort(3210));
  
  const result = await Template.build(template, {
    alias: "lakitu",
    apiKey,
    onBuildLogs: defaultBuildLogger(),
  });
  
  console.log(`\n✅ Template built: ${result.templateId}`);
  process.exit(0);
}

build().catch(e => {
  console.error("Build failed:", e);
  process.exit(1);
});
