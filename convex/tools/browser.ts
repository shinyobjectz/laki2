/**
 * Browser Tools
 *
 * Tool definitions for browser automation using Vercel agent-browser.
 */

import { tool } from "ai";
import { z } from "zod";
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Create browser tools bound to a Convex action context.
 */
export function createBrowserTools(ctx: ActionCtx) {
  return {
    browser_open: tool({
      description:
        "Navigate to a URL and wait for the page to load. Use this to access web pages.",
      parameters: z.object({
        url: z.string().url().describe("URL to navigate to"),
      }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.browser.open, args);
      },
    }),

    browser_snapshot: tool({
      description:
        "Get a snapshot of the current page with interactive elements. Returns element refs like @e1, @e2 that can be clicked.",
      parameters: z.object({
        interactive: z
          .boolean()
          .default(true)
          .describe("Whether to include interactive elements"),
      }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.browser.snapshot, args);
      },
    }),

    browser_click: tool({
      description:
        "Click an element by its ref (e.g., @e1). Get refs from browser_snapshot.",
      parameters: z.object({
        ref: z
          .string()
          .describe("Element ref from snapshot (e.g., @e1, @e2)"),
      }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.browser.click, args);
      },
    }),

    browser_type: tool({
      description:
        "Type text into the currently focused input field. Click an input first.",
      parameters: z.object({
        text: z.string().describe("Text to type"),
      }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.browser.type, args);
      },
    }),

    browser_press: tool({
      description:
        "Press a keyboard key (Enter, Tab, Escape, ArrowDown, etc.).",
      parameters: z.object({
        key: z.string().describe("Key to press (e.g., Enter, Tab, Escape)"),
      }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.browser.press, args);
      },
    }),

    browser_scroll: tool({
      description: "Scroll the page in a direction.",
      parameters: z.object({
        direction: z
          .enum(["up", "down", "top", "bottom"])
          .describe("Scroll direction"),
      }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.browser.scroll, args);
      },
    }),

    browser_screenshot: tool({
      description:
        "Take a screenshot of the current page. Returns base64-encoded image.",
      parameters: z.object({}),
      execute: async () => {
        return await ctx.runAction(internal.actions.browser.screenshot, {});
      },
    }),

    browser_close: tool({
      description: "Close the browser session.",
      parameters: z.object({}),
      execute: async () => {
        return await ctx.runAction(internal.actions.browser.close, {});
      },
    }),
  };
}
