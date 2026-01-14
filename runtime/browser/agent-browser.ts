/**
 * Agent Browser - Vercel agent-browser Wrapper
 *
 * Provides browser automation capabilities using the agent-browser CLI.
 */

import { spawn, execSync } from "child_process";

export interface BrowserSession {
  sessionId: string;
  status: "idle" | "navigating" | "ready" | "error";
  currentUrl?: string;
  error?: string;
}

export interface ElementRef {
  ref: string; // e.g., "@e1"
  tag: string;
  text?: string;
  role?: string;
  attributes: Record<string, string>;
}

export interface PageSnapshot {
  url: string;
  title: string;
  elements: ElementRef[];
  screenshot?: string; // Base64 encoded
}

class AgentBrowser {
  private session: BrowserSession | null = null;

  /**
   * Start a new browser session
   */
  async start(): Promise<string> {
    const sessionId = `browser_${Date.now()}`;

    this.session = {
      sessionId,
      status: "idle",
    };

    return sessionId;
  }

  /**
   * Navigate to a URL
   */
  async navigate(url: string): Promise<{ success: boolean; error?: string }> {
    if (!this.session) {
      return { success: false, error: "No active session" };
    }

    try {
      this.session.status = "navigating";

      const result = execSync(`agent-browser open "${url}"`, {
        encoding: "utf8",
        timeout: 30000,
        env: {
          ...process.env,
          HOME: "/home/user",
        },
      });

      this.session.status = "ready";
      this.session.currentUrl = url;

      return { success: true };
    } catch (error: any) {
      this.session.status = "error";
      this.session.error = error.message;
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a snapshot of the current page with interactive elements
   */
  async snapshot(options?: { interactive?: boolean }): Promise<PageSnapshot | null> {
    if (!this.session || this.session.status !== "ready") {
      return null;
    }

    try {
      const args = ["snapshot"];
      if (options?.interactive !== false) {
        args.push("--interactive");
      }

      const result = execSync(`agent-browser ${args.join(" ")}`, {
        encoding: "utf8",
        timeout: 15000,
        env: {
          ...process.env,
          HOME: "/home/user",
        },
      });

      // Parse the snapshot output
      // agent-browser returns a structured format with element refs
      return this.parseSnapshot(result);
    } catch (error: any) {
      console.error("[agent-browser] Snapshot failed:", error.message);
      return null;
    }
  }

  /**
   * Click an element by reference
   */
  async click(ref: string): Promise<{ success: boolean; error?: string }> {
    if (!this.session || this.session.status !== "ready") {
      return { success: false, error: "No active session or page not ready" };
    }

    try {
      execSync(`agent-browser click "${ref}"`, {
        encoding: "utf8",
        timeout: 10000,
        env: {
          ...process.env,
          HOME: "/home/user",
        },
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Type text into the focused element
   */
  async type(text: string): Promise<{ success: boolean; error?: string }> {
    if (!this.session || this.session.status !== "ready") {
      return { success: false, error: "No active session or page not ready" };
    }

    try {
      // Escape the text for shell
      const escaped = text.replace(/"/g, '\\"');
      execSync(`agent-browser type "${escaped}"`, {
        encoding: "utf8",
        timeout: 10000,
        env: {
          ...process.env,
          HOME: "/home/user",
        },
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Press a key (Enter, Tab, Escape, etc.)
   */
  async press(key: string): Promise<{ success: boolean; error?: string }> {
    if (!this.session || this.session.status !== "ready") {
      return { success: false, error: "No active session or page not ready" };
    }

    try {
      execSync(`agent-browser press "${key}"`, {
        encoding: "utf8",
        timeout: 5000,
        env: {
          ...process.env,
          HOME: "/home/user",
        },
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Take a screenshot
   */
  async screenshot(): Promise<string | null> {
    if (!this.session || this.session.status !== "ready") {
      return null;
    }

    try {
      const result = execSync(`agent-browser screenshot --format base64`, {
        encoding: "utf8",
        timeout: 10000,
        maxBuffer: 50 * 1024 * 1024, // 50MB for large screenshots
        env: {
          ...process.env,
          HOME: "/home/user",
        },
      });

      return result.trim();
    } catch (error: any) {
      console.error("[agent-browser] Screenshot failed:", error.message);
      return null;
    }
  }

  /**
   * Scroll the page
   */
  async scroll(direction: "up" | "down" | "top" | "bottom"): Promise<{ success: boolean }> {
    if (!this.session || this.session.status !== "ready") {
      return { success: false };
    }

    try {
      execSync(`agent-browser scroll ${direction}`, {
        encoding: "utf8",
        timeout: 5000,
        env: {
          ...process.env,
          HOME: "/home/user",
        },
      });

      return { success: true };
    } catch {
      return { success: false };
    }
  }

  /**
   * Wait for navigation or element
   */
  async wait(options: { timeout?: number; selector?: string }): Promise<{ success: boolean }> {
    const timeout = options.timeout || 5000;

    try {
      if (options.selector) {
        execSync(`agent-browser wait "${options.selector}" --timeout ${timeout}`, {
          encoding: "utf8",
          timeout: timeout + 1000,
          env: {
            ...process.env,
            HOME: "/home/user",
          },
        });
      } else {
        // Just wait for any pending navigation
        await new Promise((resolve) => setTimeout(resolve, timeout));
      }

      return { success: true };
    } catch {
      return { success: false };
    }
  }

  /**
   * Close the browser session
   */
  async close(): Promise<void> {
    if (!this.session) return;

    try {
      execSync("agent-browser close", {
        encoding: "utf8",
        timeout: 5000,
        env: {
          ...process.env,
          HOME: "/home/user",
        },
      });
    } catch {
      // Ignore errors on close
    }

    this.session = null;
  }

  /**
   * Get current session status
   */
  getStatus(): BrowserSession | null {
    return this.session;
  }

  private parseSnapshot(output: string): PageSnapshot {
    // Parse the agent-browser snapshot output
    // This is a simplified parser - real implementation depends on actual output format
    const lines = output.split("\n");
    const elements: ElementRef[] = [];

    let url = "";
    let title = "";

    for (const line of lines) {
      // Parse URL
      if (line.startsWith("URL:")) {
        url = line.slice(4).trim();
        continue;
      }

      // Parse title
      if (line.startsWith("Title:")) {
        title = line.slice(6).trim();
        continue;
      }

      // Parse element refs like "@e1 button[Login]"
      const refMatch = line.match(/^(@e\d+)\s+(\w+)(?:\[(.+?)\])?/);
      if (refMatch) {
        elements.push({
          ref: refMatch[1],
          tag: refMatch[2],
          text: refMatch[3],
          attributes: {},
        });
      }
    }

    return { url, title, elements };
  }
}

// Singleton instance
export const agentBrowser = new AgentBrowser();
