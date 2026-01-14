#!/usr/bin/env bun
/**
 * Sandbox Agent Entrypoint
 *
 * Main startup script for the sandbox environment.
 * Starts all required services and waits for readiness.
 */

import { spawn, type ChildProcess } from "child_process";

const CONVEX_PORT = 3210;
const CONVEX_SITE_PORT = 3211;

interface ServiceStatus {
  name: string;
  pid?: number;
  status: "starting" | "running" | "failed";
  error?: string;
}

const services: Map<string, ServiceStatus> = new Map();

async function startConvexBackend(): Promise<void> {
  console.log("[entrypoint] Starting Convex backend...");

  const proc = spawn("convex-backend", ["--port", String(CONVEX_PORT), "--site-port", String(CONVEX_SITE_PORT)], {
    env: {
      ...process.env,
      HOME: "/home/user",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  services.set("convex", {
    name: "convex",
    pid: proc.pid,
    status: "starting",
  });

  proc.stdout?.on("data", (data) => {
    const line = data.toString().trim();
    if (line.includes("Listening")) {
      services.set("convex", { ...services.get("convex")!, status: "running" });
      console.log("[entrypoint] Convex backend ready");
    }
  });

  proc.stderr?.on("data", (data) => {
    console.error("[convex]", data.toString().trim());
  });

  proc.on("error", (err) => {
    services.set("convex", { ...services.get("convex")!, status: "failed", error: err.message });
    console.error("[entrypoint] Convex backend failed:", err.message);
  });

  // Wait for backend to be ready
  await waitForService("convex", 30000);
}

async function startLspServers(): Promise<void> {
  console.log("[entrypoint] Starting LSP servers...");

  // TypeScript LSP is started on-demand
  services.set("typescript-lsp", {
    name: "typescript-lsp",
    status: "running", // Available but not started until needed
  });

  // Python LSP is started on-demand
  services.set("python-lsp", {
    name: "python-lsp",
    status: "running",
  });

  // Rust LSP is started on-demand
  services.set("rust-lsp", {
    name: "rust-lsp",
    status: "running",
  });

  console.log("[entrypoint] LSP servers available (on-demand)");
}

async function startFileWatcher(): Promise<void> {
  console.log("[entrypoint] Starting file watcher...");

  const watcherPath = "/home/user/lakitu/runtime/services/file-watcher.ts";

  try {
    // Check if file exists
    const fs = await import("fs/promises");
    await fs.access(watcherPath);

    const proc = spawn("bun", ["run", watcherPath], {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    services.set("file-watcher", {
      name: "file-watcher",
      pid: proc.pid,
      status: "running",
    });

    proc.stdout?.on("data", (data) => {
      console.log("[file-watcher]", data.toString().trim());
    });

    proc.stderr?.on("data", (data) => {
      console.error("[file-watcher]", data.toString().trim());
    });

    console.log("[entrypoint] File watcher started");
  } catch {
    console.log("[entrypoint] File watcher not found, skipping");
    services.set("file-watcher", {
      name: "file-watcher",
      status: "running", // Mark as running (optional service)
    });
  }
}

async function waitForService(name: string, timeoutMs: number): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const service = services.get(name);
    if (service?.status === "running") {
      return;
    }
    if (service?.status === "failed") {
      throw new Error(`Service ${name} failed: ${service.error}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Service ${name} timed out after ${timeoutMs}ms`);
}

async function healthCheck(): Promise<boolean> {
  // Check Convex backend
  try {
    const response = await fetch(`http://localhost:${CONVEX_PORT}/health`);
    if (!response.ok) return false;
  } catch {
    return false;
  }

  return true;
}

async function main(): Promise<void> {
  console.log("[entrypoint] ========================================");
  console.log("[entrypoint] Sandbox Agent Starting");
  console.log("[entrypoint] ========================================");

  try {
    // Start services in order
    await startConvexBackend();
    await startLspServers();
    await startFileWatcher();

    // Verify health
    const healthy = await healthCheck();
    if (!healthy) {
      console.warn("[entrypoint] Health check failed, but continuing...");
    }

    console.log("[entrypoint] ========================================");
    console.log("[entrypoint] Sandbox Ready!");
    console.log("[entrypoint] Convex: http://localhost:" + CONVEX_PORT);
    console.log("[entrypoint] ========================================");

    // Keep process running
    await new Promise(() => {});
  } catch (error: any) {
    console.error("[entrypoint] Startup failed:", error.message);
    process.exit(1);
  }
}

// Handle shutdown
process.on("SIGTERM", () => {
  console.log("[entrypoint] Received SIGTERM, shutting down...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[entrypoint] Received SIGINT, shutting down...");
  process.exit(0);
});

main();
