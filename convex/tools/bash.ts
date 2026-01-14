/**
 * Bash Tool
 *
 * Tool definition for shell execution.
 * Calls internal action for the actual implementation.
 */

import { tool } from "ai";
import { z } from "zod";
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Create bash tool bound to a Convex action context.
 */
export function createBashTool(ctx: ActionCtx) {
  return tool({
    description:
      "Execute a shell command. Use for running tests, builds, git operations, and other terminal tasks.",
    parameters: z.object({
      command: z.string().describe("The shell command to execute"),
      cwd: z.string().default("/home/user/workspace").describe("Working directory"),
      timeoutMs: z.number().default(60000).describe("Timeout in milliseconds (default: 60s)"),
    }),
    execute: async (args) => {
      return await ctx.runAction(internal.actions.bash.execute, {
        command: args.command,
        cwd: args.cwd,
        timeoutMs: args.timeoutMs,
      });
    },
  });
}

// Legacy export for compatibility
export const bashTool = {
  description: "Execute a shell command",
  parameters: z.object({
    command: z.string(),
    cwd: z.string().default("/home/user/workspace"),
    timeoutMs: z.number().default(60000),
  }),
};
