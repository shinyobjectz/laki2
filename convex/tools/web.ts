/**
 * Web Tools
 *
 * Web operations that proxy through cloud for external APIs.
 * Sandbox doesn't have direct internet access, so these are placeholders.
 */

import { tool } from "ai";
import { z } from "zod";
import type { ActionCtx } from "../_generated/server";

/**
 * Create web tools bound to a Convex action context.
 */
export function createWebTools(ctx: ActionCtx) {
  return {
    web_fetch: tool({
      description:
        "Fetch content from a URL. This is proxied through the cloud service.",
      parameters: z.object({
        url: z.string().url().describe("URL to fetch"),
        method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
        headers: z.record(z.string()).optional(),
        body: z.string().optional(),
        timeout: z.number().default(30000).describe("Timeout in ms"),
      }),
      execute: async (args) => {
        // In sandbox, we queue this for the cloud to execute
        return {
          success: false,
          error: "Web fetch requires cloud proxy - not implemented in sandbox",
          hint: "Queue this request via sync.queueSync with type 'webRequest'",
          request: {
            url: args.url,
            method: args.method,
            headers: args.headers,
            hasBody: !!args.body,
          },
        };
      },
    }),

    web_search: tool({
      description: "Search the web for information. Proxied through cloud.",
      parameters: z.object({
        query: z.string().describe("Search query"),
        limit: z.number().default(10).describe("Max results"),
      }),
      execute: async (args) => {
        return {
          success: false,
          error: "Web search requires cloud proxy - not implemented in sandbox",
          hint: "Queue this request via sync.queueSync with type 'webSearch'",
          request: {
            query: args.query,
            limit: args.limit,
          },
        };
      },
    }),

    web_screenshot: tool({
      description: "Take a screenshot of a webpage. Proxied through cloud.",
      parameters: z.object({
        url: z.string().url().describe("URL to screenshot"),
        fullPage: z.boolean().default(false),
        width: z.number().default(1280),
        height: z.number().default(720),
      }),
      execute: async (args) => {
        return {
          success: false,
          error: "Web screenshot requires cloud proxy - not implemented in sandbox",
          hint: "Queue this request via sync.queueSync with type 'webScreenshot'",
          request: {
            url: args.url,
            fullPage: args.fullPage,
            dimensions: { width: args.width, height: args.height },
          },
        };
      },
    }),

    get_timestamp: tool({
      description: "Get the current UTC timestamp",
      parameters: z.object({}),
      execute: async () => {
        const now = new Date();
        return {
          success: true,
          timestamp: now.toISOString(),
          unix: now.getTime(),
          formatted: now.toUTCString(),
        };
      },
    }),
  };
}

// Legacy export for compatibility
export const webTools = {
  web_fetch: {
    description: "Fetch content from a URL",
    parameters: z.object({
      url: z.string().url(),
      method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
      headers: z.record(z.string()).optional(),
      body: z.string().optional(),
      timeout: z.number().default(30000),
    }),
  },
  web_search: {
    description: "Search the web",
    parameters: z.object({
      query: z.string(),
      limit: z.number().default(10),
    }),
  },
  web_screenshot: {
    description: "Take a screenshot of a webpage",
    parameters: z.object({
      url: z.string().url(),
      fullPage: z.boolean().default(false),
      width: z.number().default(1280),
      height: z.number().default(720),
    }),
  },
  get_timestamp: {
    description: "Get current UTC timestamp",
    parameters: z.object({}),
  },
};
