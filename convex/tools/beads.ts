/**
 * Beads Tools
 *
 * Task tracking tools. Uses Convex mutations directly since
 * beads operations are database-only (no Node.js APIs needed).
 */

import { tool } from "ai";
import { z } from "zod";
import type { ActionCtx } from "../_generated/server";
import { api } from "../_generated/api";

const beadTypeSchema = z.enum(["task", "bug", "feature", "chore", "epic"]);
const beadStatusSchema = z.enum(["open", "in_progress", "blocked", "closed"]);

/**
 * Create beads tools bound to a Convex action context.
 */
export function createBeadsTools(ctx: ActionCtx) {
  return {
    beads_create: tool({
      description: "Create a new task or issue to track work",
      parameters: z.object({
        title: z.string().describe("Title of the task"),
        type: beadTypeSchema.default("task"),
        priority: z
          .number()
          .min(0)
          .max(4)
          .default(2)
          .describe("0=critical, 1=high, 2=medium, 3=low, 4=backlog"),
        description: z.string().optional(),
        labels: z.array(z.string()).optional(),
        parentId: z.string().optional().describe("Parent task ID for subtasks"),
      }),
      execute: async (args) => {
        const id = await ctx.runMutation(api.planning.beads.create, {
          title: args.title,
          type: args.type,
          priority: args.priority,
          description: args.description,
          labels: args.labels,
          parentId: args.parentId as any,
        });

        return {
          success: true,
          id,
          title: args.title,
          message: `Created ${args.type}: "${args.title}"`,
        };
      },
    }),

    beads_update: tool({
      description: "Update a task's status or other fields",
      parameters: z.object({
        id: z.string().describe("Task ID to update"),
        status: beadStatusSchema.optional(),
        priority: z.number().min(0).max(4).optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        labels: z.array(z.string()).optional(),
        blockedBy: z.array(z.string()).optional().describe("IDs of blocking tasks"),
      }),
      execute: async (args) => {
        await ctx.runMutation(api.planning.beads.update, {
          id: args.id as any,
          status: args.status,
          priority: args.priority,
          title: args.title,
          description: args.description,
          labels: args.labels,
          blockedBy: args.blockedBy as any,
        });

        return {
          success: true,
          id: args.id,
          message: `Updated task ${args.id}`,
        };
      },
    }),

    beads_close: tool({
      description: "Mark a task as completed/closed",
      parameters: z.object({
        id: z.string().describe("Task ID to close"),
        reason: z.string().optional().describe("Reason for closing"),
      }),
      execute: async (args) => {
        await ctx.runMutation(api.planning.beads.close, {
          id: args.id as any,
          reason: args.reason,
        });

        return {
          success: true,
          id: args.id,
          message: `Closed task ${args.id}`,
        };
      },
    }),

    beads_list: tool({
      description: "List tasks, optionally filtered by status or type",
      parameters: z.object({
        status: beadStatusSchema.optional(),
        type: beadTypeSchema.optional(),
        limit: z.number().default(50),
      }),
      execute: async (args) => {
        const tasks = await ctx.runQuery(api.planning.beads.list, {
          status: args.status,
          type: args.type,
          limit: args.limit,
        });

        return {
          success: true,
          tasks,
          count: tasks.length,
        };
      },
    }),

    beads_ready: tool({
      description: "Get tasks ready to work on (open, unblocked, sorted by priority)",
      parameters: z.object({
        limit: z.number().default(10),
      }),
      execute: async (args) => {
        const tasks = await ctx.runQuery(api.planning.beads.getReady, {
          limit: args.limit,
        });

        return {
          success: true,
          tasks,
          count: tasks.length,
        };
      },
    }),
  };
}

// Legacy export for compatibility
export const beadsTools = {
  beads_create: {
    description: "Create a new task or issue",
    parameters: z.object({
      title: z.string(),
      type: beadTypeSchema.default("task"),
      priority: z.number().min(0).max(4).default(2),
      description: z.string().optional(),
      labels: z.array(z.string()).optional(),
      parentId: z.string().optional(),
    }),
  },
  beads_update: {
    description: "Update a task's status or fields",
    parameters: z.object({
      id: z.string(),
      status: beadStatusSchema.optional(),
      priority: z.number().min(0).max(4).optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      labels: z.array(z.string()).optional(),
      blockedBy: z.array(z.string()).optional(),
    }),
  },
  beads_close: {
    description: "Mark a task as completed",
    parameters: z.object({
      id: z.string(),
      reason: z.string().optional(),
    }),
  },
  beads_list: {
    description: "List tasks",
    parameters: z.object({
      status: beadStatusSchema.optional(),
      type: beadTypeSchema.optional(),
      limit: z.number().default(50),
    }),
  },
  beads_ready: {
    description: "Get ready tasks",
    parameters: z.object({
      limit: z.number().default(10),
    }),
  },
};
