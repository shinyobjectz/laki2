/**
 * LSP Manager - Language Server Lifecycle Management
 *
 * Start, stop, and communicate with language servers.
 */

import { spawn, type ChildProcess } from "child_process";
import { EventEmitter } from "events";

export type Language = "typescript" | "python" | "rust";

export interface LspServer {
  language: Language;
  process: ChildProcess | null;
  status: "stopped" | "starting" | "running" | "error";
  error?: string;
  pendingRequests: Map<number, { resolve: Function; reject: Function }>;
  nextRequestId: number;
}

export interface LspRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: any;
}

export interface LspResponse {
  jsonrpc: "2.0";
  id: number;
  result?: any;
  error?: { code: number; message: string };
}

export interface LspNotification {
  jsonrpc: "2.0";
  method: string;
  params?: any;
}

const LSP_COMMANDS: Record<Language, { cmd: string; args: string[] }> = {
  typescript: {
    cmd: "typescript-language-server",
    args: ["--stdio"],
  },
  python: {
    cmd: "pylsp",
    args: [],
  },
  rust: {
    cmd: "rust-analyzer",
    args: [],
  },
};

class LspManager extends EventEmitter {
  private servers: Map<Language, LspServer> = new Map();
  private messageBuffer: Map<Language, string> = new Map();

  async start(language: Language): Promise<void> {
    const existing = this.servers.get(language);
    if (existing?.status === "running") {
      return; // Already running
    }

    const config = LSP_COMMANDS[language];
    if (!config) {
      throw new Error(`Unknown language: ${language}`);
    }

    const server: LspServer = {
      language,
      process: null,
      status: "starting",
      pendingRequests: new Map(),
      nextRequestId: 1,
    };

    this.servers.set(language, server);
    this.messageBuffer.set(language, "");

    try {
      const proc = spawn(config.cmd, config.args, {
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          HOME: "/home/user",
        },
      });

      server.process = proc;

      proc.stdout?.on("data", (data) => {
        this.handleOutput(language, data.toString());
      });

      proc.stderr?.on("data", (data) => {
        console.error(`[${language}-lsp]`, data.toString().trim());
      });

      proc.on("error", (err) => {
        server.status = "error";
        server.error = err.message;
        this.emit("error", { language, error: err.message });
      });

      proc.on("exit", (code) => {
        server.status = "stopped";
        this.emit("exit", { language, code });
      });

      // Initialize the server
      await this.initialize(language);

      server.status = "running";
      this.emit("ready", { language });
    } catch (error: any) {
      server.status = "error";
      server.error = error.message;
      throw error;
    }
  }

  async stop(language: Language): Promise<void> {
    const server = this.servers.get(language);
    if (!server?.process) return;

    // Send shutdown request
    try {
      await this.sendRequest(language, "shutdown", {});
      this.sendNotification(language, "exit", {});
    } catch {
      // Force kill if graceful shutdown fails
      server.process.kill("SIGTERM");
    }

    server.status = "stopped";
    server.process = null;
  }

  async stopAll(): Promise<void> {
    for (const language of this.servers.keys()) {
      await this.stop(language);
    }
  }

  getStatus(language: Language): LspServer["status"] {
    return this.servers.get(language)?.status ?? "stopped";
  }

  private async initialize(language: Language): Promise<void> {
    await this.sendRequest(language, "initialize", {
      processId: process.pid,
      rootUri: "file:///home/user/workspace",
      capabilities: {
        textDocument: {
          synchronization: {
            didOpen: true,
            didChange: true,
            didClose: true,
          },
          completion: {
            completionItem: {
              snippetSupport: true,
              documentationFormat: ["markdown", "plaintext"],
            },
          },
          hover: {
            contentFormat: ["markdown", "plaintext"],
          },
          publishDiagnostics: {
            relatedInformation: true,
          },
        },
        workspace: {
          workspaceFolders: true,
        },
      },
      workspaceFolders: [
        {
          uri: "file:///home/user/workspace",
          name: "workspace",
        },
      ],
    });

    this.sendNotification(language, "initialized", {});
  }

  async sendRequest(language: Language, method: string, params: any): Promise<any> {
    const server = this.servers.get(language);
    if (!server?.process || server.status !== "running") {
      throw new Error(`LSP server for ${language} is not running`);
    }

    const id = server.nextRequestId++;
    const request: LspRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      server.pendingRequests.set(id, { resolve, reject });
      this.send(language, request);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (server.pendingRequests.has(id)) {
          server.pendingRequests.delete(id);
          reject(new Error(`Request ${method} timed out`));
        }
      }, 30000);
    });
  }

  sendNotification(language: Language, method: string, params: any): void {
    const notification: LspNotification = {
      jsonrpc: "2.0",
      method,
      params,
    };
    this.send(language, notification);
  }

  private send(language: Language, message: object): void {
    const server = this.servers.get(language);
    if (!server?.process?.stdin) return;

    const content = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n`;
    server.process.stdin.write(header + content);
  }

  private handleOutput(language: Language, data: string): void {
    const buffer = (this.messageBuffer.get(language) || "") + data;
    this.messageBuffer.set(language, buffer);

    // Parse LSP messages
    while (true) {
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) break;

      const header = buffer.slice(0, headerEnd);
      const contentLengthMatch = header.match(/Content-Length: (\d+)/);
      if (!contentLengthMatch) break;

      const contentLength = parseInt(contentLengthMatch[1], 10);
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + contentLength;

      if (buffer.length < messageEnd) break;

      const content = buffer.slice(messageStart, messageEnd);
      this.messageBuffer.set(language, buffer.slice(messageEnd));

      try {
        const message = JSON.parse(content);
        this.handleMessage(language, message);
      } catch (e) {
        console.error(`[${language}-lsp] Failed to parse message:`, e);
      }
    }
  }

  private handleMessage(language: Language, message: LspResponse | LspNotification): void {
    const server = this.servers.get(language);
    if (!server) return;

    if ("id" in message && message.id !== undefined) {
      // Response to a request
      const pending = server.pendingRequests.get(message.id);
      if (pending) {
        server.pendingRequests.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.result);
        }
      }
    } else {
      // Notification from server
      this.emit("notification", { language, method: message.method, params: message.params });
    }
  }

  // High-level API methods

  async openDocument(language: Language, uri: string, text: string): Promise<void> {
    const languageId = language === "typescript" ? "typescript" : language;
    this.sendNotification(language, "textDocument/didOpen", {
      textDocument: {
        uri,
        languageId,
        version: 1,
        text,
      },
    });
  }

  async closeDocument(language: Language, uri: string): Promise<void> {
    this.sendNotification(language, "textDocument/didClose", {
      textDocument: { uri },
    });
  }

  async getCompletions(
    language: Language,
    uri: string,
    line: number,
    character: number
  ): Promise<any> {
    return await this.sendRequest(language, "textDocument/completion", {
      textDocument: { uri },
      position: { line, character },
    });
  }

  async getHover(
    language: Language,
    uri: string,
    line: number,
    character: number
  ): Promise<any> {
    return await this.sendRequest(language, "textDocument/hover", {
      textDocument: { uri },
      position: { line, character },
    });
  }

  async getDiagnostics(language: Language, uri: string): Promise<any[]> {
    // Diagnostics are pushed via notifications, we need to trigger them
    // by changing the document or waiting for them
    // For now, return empty array - real implementation would track notifications
    return [];
  }

  async getDefinition(
    language: Language,
    uri: string,
    line: number,
    character: number
  ): Promise<any> {
    return await this.sendRequest(language, "textDocument/definition", {
      textDocument: { uri },
      position: { line, character },
    });
  }

  async getReferences(
    language: Language,
    uri: string,
    line: number,
    character: number
  ): Promise<any> {
    return await this.sendRequest(language, "textDocument/references", {
      textDocument: { uri },
      position: { line, character },
      context: { includeDeclaration: true },
    });
  }
}

// Singleton instance
export const lspManager = new LspManager();
