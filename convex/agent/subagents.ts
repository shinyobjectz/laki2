/**
 * Subagents - Spawn and manage child agents
 *
 * Enables parallel work and task delegation through subagent spawning.
 * Uses AI SDK directly for LLM calls.
 */

import {
  mutation,
  query,
  internalMutation,
  internalAction,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { generateText, type CoreTool } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createSubagentToolset } from "../tools";

// Initialize OpenRouter provider
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// ============================================
// Types
// ============================================

interface SpawnResult {
  subagentId: string;
  status: "spawned";
}

interface ExecuteResult {
  success: boolean;
  error?: string;
}

// ============================================
// Helpers
// ============================================

function createSubagentId(): string {
  return `subagent_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================
// Actions
// ============================================

/**
 * Spawn a new subagent
 */
export const spawn = internalAction({
  args: {
    parentThreadId: v.optional(v.string()),
    name: v.string(),
    task: v.string(),
    tools: v.array(v.string()),
    model: v.string(),
  },
  handler: async (ctx, args): Promise<SpawnResult> => {
    const subagentId = createSubagentId();

    // Record subagent in database
    await ctx.runMutation(internal.agent.subagents.internalRecordSubagent, {
      threadId: subagentId,
      parentThreadId: args.parentThreadId || "",
      name: args.name,
      task: args.task,
      tools: args.tools,
      model: args.model,
    });

    // Execute asynchronously using scheduler
    await ctx.scheduler.runAfter(0, internal.agent.subagents.execute, {
      threadId: subagentId,
      task: args.task,
      tools: args.tools,
      model: args.model,
      name: args.name,
    });

    return { subagentId, status: "spawned" };
  },
});

/**
 * Execute subagent task
 */
export const execute = internalAction({
  args: {
    threadId: v.string(),
    task: v.string(),
    tools: v.array(v.string()),
    model: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args): Promise<ExecuteResult> => {
    try {
      // Update status to running
      await ctx.runMutation(internal.agent.subagents.updateStatus, {
        threadId: args.threadId,
        status: "running",
      });

      // Create tools for this subagent
      const tools = createSubagentToolset(ctx, args.tools) as Record<
        string,
        CoreTool
      >;

      // Build system prompt for subagent
      const systemPrompt = `You are ${args.name}, a specialized subagent.

Your task: ${args.task}

Guidelines:
- Focus only on the assigned task
- Be concise and efficient
- Report results clearly
- If blocked, explain why`;

      // Execute using AI SDK with OpenRouter
      const result = await generateText({
        model: openrouter(args.model),
        system: systemPrompt,
        prompt: args.task,
        tools,
        maxSteps: 5,
      });

      // Extract tool calls
      const toolCalls = result.steps
        .flatMap((step) => step.toolCalls || [])
        .map((call) => ({
          toolName: call.toolName,
          args: call.args,
        }));

      // Update with result
      await ctx.runMutation(internal.agent.subagents.updateStatus, {
        threadId: args.threadId,
        status: "completed",
        result: {
          text: result.text,
          toolCalls,
        },
      });

      return { success: true };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Update with error
      await ctx.runMutation(internal.agent.subagents.updateStatus, {
        threadId: args.threadId,
        status: "failed",
        error: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  },
});

// ============================================
// Mutations
// ============================================

/**
 * Internal: Record subagent in database
 */
export const internalRecordSubagent = internalMutation({
  args: {
    threadId: v.string(),
    parentThreadId: v.string(),
    name: v.string(),
    task: v.string(),
    tools: v.array(v.string()),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("subagents", {
      threadId: args.threadId,
      parentThreadId: args.parentThreadId,
      name: args.name,
      task: args.task,
      tools: args.tools,
      model: args.model,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

/**
 * Internal: Update subagent status
 */
export const updateStatus = internalMutation({
  args: {
    threadId: v.string(),
    status: v.string(),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const subagent = await ctx.db
      .query("subagents")
      .filter((q) => q.eq(q.field("threadId"), args.threadId))
      .first();

    if (!subagent) return;

    const updates: Record<string, unknown> = {
      status: args.status,
    };

    if (args.result) {
      updates.result = args.result;
    }

    if (args.error) {
      updates.error = args.error;
    }

    if (args.status === "completed" || args.status === "failed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(subagent._id, updates);
  },
});

/**
 * Cancel a subagent
 */
export const cancel = internalMutation({
  args: {
    subagentId: v.string(),
  },
  handler: async (ctx, args) => {
    const subagent = await ctx.db
      .query("subagents")
      .filter((q) => q.eq(q.field("threadId"), args.subagentId))
      .first();

    if (!subagent) {
      return { success: false, error: "Subagent not found" };
    }

    if (subagent.status === "completed" || subagent.status === "failed") {
      return { success: false, error: "Subagent already finished" };
    }

    await ctx.db.patch(subagent._id, {
      status: "failed",
      error: "Cancelled by parent",
      completedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================
// Queries
// ============================================

/**
 * Get subagent status
 */
export const getStatus = query({
  args: {
    subagentId: v.string(),
  },
  handler: async (ctx, args) => {
    const subagent = await ctx.db
      .query("subagents")
      .filter((q) => q.eq(q.field("threadId"), args.subagentId))
      .first();

    if (!subagent) {
      return { found: false, status: null };
    }

    return {
      found: true,
      status: subagent.status,
      name: subagent.name,
      task: subagent.task,
      hasError: !!subagent.error,
    };
  },
});

/**
 * Get subagent result
 */
export const getResult = query({
  args: {
    subagentId: v.string(),
  },
  handler: async (ctx, args) => {
    const subagent = await ctx.db
      .query("subagents")
      .filter((q) => q.eq(q.field("threadId"), args.subagentId))
      .first();

    if (!subagent) {
      return { found: false };
    }

    if (subagent.status !== "completed" && subagent.status !== "failed") {
      return {
        found: true,
        ready: false,
        status: subagent.status,
      };
    }

    return {
      found: true,
      ready: true,
      status: subagent.status,
      result: subagent.result,
      error: subagent.error,
    };
  },
});

/**
 * List subagents
 */
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
    parentThreadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("subagents");

    if (args.status) {
      q = q.filter((q) => q.eq(q.field("status"), args.status));
    }

    if (args.parentThreadId) {
      q = q.filter((q) =>
        q.eq(q.field("parentThreadId"), args.parentThreadId)
      );
    }

    const subagents = await q.order("desc").take(50);

    return subagents.map((s) => ({
      id: s.threadId,
      name: s.name,
      task: s.task,
      status: s.status,
      createdAt: s.createdAt,
      completedAt: s.completedAt,
    }));
  },
});
