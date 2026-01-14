/**
 * Sandbox Agent Definition
 *
 * Uses AI SDK for LLM orchestration with tool calling.
 * Implements OpenCode-inspired patterns:
 * - Context window orchestration
 * - State management with diffs
 * - Decision logging
 * - Verification loops
 *
 * Note: This is a simplified implementation that works without
 * requiring the full Convex Agent component infrastructure.
 * The agent can be upgraded to use @convex-dev/agent once the
 * component is properly configured.
 */

import { generateText, type CoreTool } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// Default model - using Gemini Flash for speed/cost
const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

// Create OpenRouter provider lazily to ensure env var is available at runtime
function getOpenRouterModel(modelId: string = DEFAULT_MODEL) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }
  const openrouter = createOpenRouter({ apiKey });
  return openrouter(modelId);
}
import { action, internalAction, query, mutation } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";

// Import tool factory
import { createAllTools } from "../tools";

// Import prompts
import { SYSTEM_PROMPT } from "../prompts/system";

// ============================================
// Types
// ============================================

interface AgentResult {
  threadId: string;
  text: string;
  toolCalls?: Array<{
    toolName: string;
    args: Record<string, unknown>;
    result: unknown;
  }>;
}

interface RunResult {
  status: "completed" | "incomplete";
  threadId: string;
  text?: string;
  toolCalls?: AgentResult["toolCalls"];
  checkpointId?: string;
  durationMs: number;
}

// ============================================
// Thread Management (Simple implementation)
// ============================================

/**
 * Create a new thread ID
 */
function createThreadId(): string {
  return `thread_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================
// Agent Actions
// ============================================

/**
 * Start a new agent thread
 */
export const startThread = action({
  args: {
    prompt: v.string(),
    context: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<AgentResult> => {
    const threadId = createThreadId();

    // Create tools bound to this action context
    const tools = createAllTools(ctx) as Record<string, CoreTool>;

    // Log the decision to start
    await ctx.runMutation(api.agent.decisions.log, {
      threadId,
      task: args.prompt,
      decisionType: "tool_selection",
      selectedTools: [],
      reasoning: "Starting new thread for task",
      expectedOutcome: "Agent will process the prompt and produce results",
    });

    // Run the LLM with tools
    const result = await generateText({
      model: openrouter(DEFAULT_MODEL),
      system: SYSTEM_PROMPT,
      prompt: args.prompt,
      tools,
      maxSteps: 10,
    });

    // Extract tool calls from steps
    const toolCalls = result.steps
      .flatMap((step) => step.toolCalls || [])
      .map((call) => ({
        toolName: call.toolName,
        args: call.args as Record<string, unknown>,
        result: undefined, // Results are in toolResults
      }));

    return {
      threadId,
      text: result.text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  },
});

/**
 * Continue an existing thread
 * Note: In this simplified implementation, we don't persist thread history.
 * The full @convex-dev/agent implementation would handle this.
 */
export const continueThread = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, args): Promise<AgentResult> => {
    // Create tools bound to this action context
    const tools = createAllTools(ctx) as Record<string, CoreTool>;

    // Run the LLM with tools
    const result = await generateText({
      model: openrouter(DEFAULT_MODEL),
      system: SYSTEM_PROMPT,
      prompt: args.prompt,
      tools,
      maxSteps: 10,
    });

    // Extract tool calls from steps
    const toolCalls = result.steps
      .flatMap((step) => step.toolCalls || [])
      .map((call) => ({
        toolName: call.toolName,
        args: call.args as Record<string, unknown>,
        result: undefined,
      }));

    return {
      threadId: args.threadId,
      text: result.text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  },
});

/**
 * Run agent with timeout for chained execution
 */
export const runWithTimeout = internalAction({
  args: {
    prompt: v.string(),
    context: v.optional(v.any()),
    timeoutMs: v.number(),
    checkpointId: v.optional(v.id("checkpoints")),
  },
  handler: async (ctx, args): Promise<RunResult> => {
    const startTime = Date.now();
    const timeout = args.timeoutMs;

    // Create tools bound to this action context
    const tools = createAllTools(ctx) as Record<string, CoreTool>;

    // Restore from checkpoint if continuing
    let threadId: string;

    if (args.checkpointId) {
      const checkpoint = await ctx.runQuery(
        internal.state.checkpoints.internalGet,
        { id: args.checkpointId }
      );
      if (!checkpoint) {
        throw new Error(`Checkpoint ${args.checkpointId} not found`);
      }
      threadId = checkpoint.threadId;

      // Restore state from checkpoint
      await ctx.runMutation(internal.state.files.restoreFromCheckpoint, {
        checkpointId: args.checkpointId,
      });
    } else {
      threadId = createThreadId();
    }

    // Run with timeout check
    try {
      const result = await Promise.race([
        generateText({
          model: openrouter(DEFAULT_MODEL),
          system: SYSTEM_PROMPT,
          prompt: args.prompt,
          tools,
          maxSteps: 10,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("TIMEOUT")), timeout)
        ),
      ]);

      // Extract tool calls
      const toolCalls = result.steps
        .flatMap((step) => step.toolCalls || [])
        .map((call) => ({
          toolName: call.toolName,
          args: call.args as Record<string, unknown>,
          result: undefined,
        }));

      // Success - return results
      return {
        status: "completed",
        threadId,
        text: result.text,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        durationMs: Date.now() - startTime,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage === "TIMEOUT") {
        // Create checkpoint for continuation
        const checkpointId = await ctx.runMutation(
          internal.state.checkpoints.createFromCurrentState,
          {
            threadId,
            nextTask: "Continue from where we left off: " + args.prompt,
            iteration: args.checkpointId
              ? ((
                  await ctx.runQuery(internal.state.checkpoints.internalGet, {
                    id: args.checkpointId,
                  })
                )?.iteration ?? 0) + 1
              : 1,
          }
        );

        return {
          status: "incomplete",
          threadId,
          checkpointId,
          durationMs: Date.now() - startTime,
        };
      }
      throw error;
    }
  },
});

// ============================================
// Queries
// ============================================

/**
 * Get thread messages
 * Note: In the simplified implementation, this returns an empty array.
 * The full @convex-dev/agent implementation would return message history.
 */
export const getThreadMessages = query({
  args: { threadId: v.string() },
  handler: async (_ctx, _args): Promise<Array<{ role: string; content: string }>> => {
    // TODO: Implement message persistence when using full agent component
    return [];
  },
});

/**
 * Get streaming deltas
 * Note: Simplified implementation - returns empty.
 */
export const getStreamDeltas = query({
  args: { threadId: v.string(), since: v.optional(v.number()) },
  handler: async (_ctx, _args): Promise<Array<{ delta: string; timestamp: number }>> => {
    // TODO: Implement streaming when using full agent component
    return [];
  },
});
