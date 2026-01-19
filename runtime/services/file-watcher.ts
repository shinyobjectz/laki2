#!/usr/bin/env bun
/**
 * File Watcher Service
 *
 * Watches the workspace directory for changes and forwards
 * events to the Convex backend for state tracking.
 */

import { watch, type FSWatcher } from "fs";
import { readdir, stat, readFile } from "fs/promises";
import { join, relative } from "path";
import { createHash } from "crypto";
import { localDb, SESSION_ID, THREAD_ID } from "../../ksa/_shared/localDb";

const WORKSPACE_PATH = "/home/user/workspace";

interface FileEvent {
  type: "create" | "change" | "delete";
  path: string;
  timestamp: number;
}

class FileWatcherService {
  private watcher: FSWatcher | null = null;
  private eventQueue: FileEvent[] = [];
  private flushInterval: NodeJS.Timer | null = null;
  private debounceTimers: Map<string, NodeJS.Timer> = new Map();

  async start(): Promise<void> {
    console.log(`[file-watcher] Watching: ${WORKSPACE_PATH}`);

    // Initial scan
    await this.scanDirectory(WORKSPACE_PATH);

    // Watch for changes
    this.watcher = watch(
      WORKSPACE_PATH,
      { recursive: true },
      (eventType, filename) => {
        if (filename) {
          this.handleChange(eventType, filename);
        }
      }
    );

    this.watcher.on("error", (err) => {
      console.error("[file-watcher] Error:", err.message);
    });

    // Flush events periodically
    this.flushInterval = setInterval(() => this.flushEvents(), 1000);

    console.log("[file-watcher] Started");
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    console.log("[file-watcher] Stopped");
  }

  private async scanDirectory(dir: string): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        // Skip hidden files and common excludes
        if (entry.name.startsWith(".") || entry.name === "node_modules") {
          continue;
        }

        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath);
        } else if (entry.isFile()) {
          this.queueEvent({
            type: "create",
            path: relative(WORKSPACE_PATH, fullPath),
            timestamp: Date.now(),
          });
        }
      }
    } catch (error: any) {
      console.error(`[file-watcher] Scan error for ${dir}:`, error.message);
    }
  }

  private handleChange(eventType: string, filename: string): void {
    // Debounce events for the same file
    const existingTimer = this.debounceTimers.get(filename);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.debounceTimers.set(
      filename,
      setTimeout(async () => {
        this.debounceTimers.delete(filename);

        const fullPath = join(WORKSPACE_PATH, filename);

        try {
          const stats = await stat(fullPath);
          this.queueEvent({
            type: eventType === "rename" ? "create" : "change",
            path: filename,
            timestamp: Date.now(),
          });
        } catch {
          // File was deleted
          this.queueEvent({
            type: "delete",
            path: filename,
            timestamp: Date.now(),
          });
        }
      }, 100)
    );
  }

  private queueEvent(event: FileEvent): void {
    // Skip certain paths
    if (
      event.path.includes("node_modules") ||
      event.path.includes(".git") ||
      event.path.startsWith(".")
    ) {
      return;
    }

    this.eventQueue.push(event);
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    // Process each event - use fire() for non-blocking persistence
    for (const event of events) {
      console.log(`[file-watcher] ${event.type}: ${event.path}`);

      try {
        if (event.type === "delete") {
          // Track deletion (no hash/size)
          localDb.fire("state/files.trackFileAccess", {
            sessionId: SESSION_ID,
            threadId: THREAD_ID,
            path: event.path,
            operation: "delete",
          });
        } else {
          // For create/change, compute hash and get size
          const fullPath = join(WORKSPACE_PATH, event.path);
          try {
            const content = await readFile(fullPath);
            const hash = createHash("sha256").update(content).digest("hex").slice(0, 16);

            localDb.fire("state/files.trackFileAccess", {
              sessionId: SESSION_ID,
              threadId: THREAD_ID,
              path: event.path,
              operation: event.type === "create" ? "write" : "edit",
              hash,
              size: content.length,
            });
          } catch {
            // File might have been deleted between event and flush
          }
        }
      } catch (error: any) {
        console.error(`[file-watcher] Failed to track ${event.path}:`, error.message);
      }
    }
  }
}

// Start the service
const service = new FileWatcherService();
service.start();

// Handle shutdown
process.on("SIGTERM", () => {
  service.stop();
  process.exit(0);
});

process.on("SIGINT", () => {
  service.stop();
  process.exit(0);
});
