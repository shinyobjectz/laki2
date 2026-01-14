/**
 * Subagent Tools
 *
 * Tool definitions for spawning and managing subagents.
 * Enables parallel work and task delegation.
 */

import { tool } from "ai";
import { z } from "zod";
import type { ActionCtx } from "../_generated/server";
import { api, internal } from "../_generated/api";

/**
 * Create subagent tools bound to a Convex action context.
 */
export function createSubagentTools(ctx: ActionCtx) {
  return {
    subagent_spawn: tool({
      description:
        "Spawn a specialized subagent to work on a specific task. Use this to parallelize work or delegate specialized tasks.",
      parameters: z.object({
        name: z
          .string()
          .describe("Descriptive name for the subagent (e.g., 'Test Writer', 'Documentation')"),
        task: z
          .string()
          .describe("Clear description of what the subagent should accomplish"),
        tools: z
          .array(z.string())
          .default([])
          .describe("List of tool names to enable (e.g., ['file_read', 'file_write', 'bash'])"),
        model: z
          .string()
          .default("gpt-4o-mini")
          .describe("Model to use (gpt-4o-mini for simple tasks, gpt-4o for complex)"),
      }),
      execute: async (args) => {
        return await ctx.runAction(internal.agent.subagents.spawn, args);
      },
    }),

    subagent_status: tool({
      description:
        "Check the status of a spawned subagent. Returns 'pending', 'running', 'completed', or 'failed'.",
      parameters: z.object({
        subagentId: z.string().describe("ID returned from subagent_spawn"),
      }),
      execute: async (args) => {
        return await ctx.runQuery(api.agent.subagents.getStatus, args);
      },
    }),

    subagent_result: tool({
      description:
        "Get the result from a completed subagent. Wait until status is 'completed' before calling.",
      parameters: z.object({
        subagentId: z.string().describe("ID returned from subagent_spawn"),
      }),
      execute: async (args) => {
        return await ctx.runQuery(api.agent.subagents.getResult, args);
      },
    }),

    subagent_list: tool({
      description: "List all subagents spawned by the current agent.",
      parameters: z.object({
        status: z
          .enum(["pending", "running", "completed", "failed"])
          .optional()
          .describe("Filter by status"),
      }),
      execute: async (args) => {
        return await ctx.runQuery(api.agent.subagents.list, args);
      },
    }),

    subagent_cancel: tool({
      description:
        "Cancel a running subagent. Use this if the subagent is no longer needed.",
      parameters: z.object({
        subagentId: z.string().describe("ID of the subagent to cancel"),
      }),
      execute: async (args) => {
        return await ctx.runMutation(internal.agent.subagents.cancel, args);
      },
    }),
  };
}
