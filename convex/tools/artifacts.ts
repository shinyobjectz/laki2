/**
 * Artifact Tools
 *
 * Save and retrieve important outputs that persist
 * after the agent session ends.
 */

import { tool } from "ai";
import { z } from "zod";
import type { ActionCtx } from "../_generated/server";
import { api, internal } from "../_generated/api";

/**
 * Create artifact tools bound to a Convex action context.
 */
export function createArtifactTools(ctx: ActionCtx) {
  return {
    artifact_save: tool({
      description:
        "Save an important output as an artifact. Artifacts persist after the session.",
      parameters: z.object({
        name: z.string().describe("Name for the artifact"),
        content: z.string().optional().describe("Content to save (for text artifacts)"),
        path: z.string().optional().describe("Path to file to save as artifact"),
        type: z.string().default("text/plain").describe("MIME type of the artifact"),
        metadata: z.record(z.any()).optional(),
      }),
      execute: async (args) => {
        let content = args.content;
        let size = 0;

        // If path provided, read from file via action
        if (args.path && !content) {
          const result = await ctx.runAction(internal.actions.file.readFile, {
            path: args.path,
          });

          if (!result.success) {
            return {
              success: false,
              error: `Failed to read file: ${result.error}`,
            };
          }

          content = result.content;
          size = result.size || 0;
        }

        if (!content) {
          return {
            success: false,
            error: "Either content or path must be provided",
          };
        }

        size = size || content.length;

        // Save to database
        const id = await ctx.runMutation(api.state.artifacts.save, {
          name: args.name,
          type: args.type,
          content,
          path: args.path || `/artifacts/${args.name}`,
          size,
          metadata: args.metadata,
        });

        // Queue for sync to cloud
        await ctx.runMutation(api.planning.sync.queueSync, {
          type: "artifact",
          itemId: id,
        });

        return {
          success: true,
          id,
          name: args.name,
          size,
          message: `Saved artifact: ${args.name}`,
        };
      },
    }),

    artifact_read: tool({
      description: "Read a previously saved artifact",
      parameters: z.object({
        name: z.string().describe("Name of the artifact to read"),
      }),
      execute: async (args) => {
        const artifact = await ctx.runQuery(api.state.artifacts.getByName, {
          name: args.name,
        });

        if (!artifact) {
          return {
            success: false,
            error: `Artifact not found: ${args.name}`,
          };
        }

        return {
          success: true,
          name: artifact.name,
          type: artifact.type,
          content: artifact.content,
          size: artifact.size,
          createdAt: artifact.createdAt,
          metadata: artifact.metadata,
        };
      },
    }),

    artifact_list: tool({
      description: "List all saved artifacts",
      parameters: z.object({
        limit: z.number().default(50),
      }),
      execute: async (args) => {
        const artifacts = await ctx.runQuery(api.state.artifacts.list, {
          limit: args.limit,
        });

        return {
          success: true,
          artifacts: artifacts.map((a: { _id: string; name: string; type: string; size: number; createdAt: number }) => ({
            id: a._id,
            name: a.name,
            type: a.type,
            size: a.size,
            createdAt: a.createdAt,
          })),
          count: artifacts.length,
        };
      },
    }),
  };
}

// Legacy export for compatibility
export const artifactTools = {
  artifact_save: {
    description: "Save an important output as an artifact",
    parameters: z.object({
      name: z.string(),
      content: z.string().optional(),
      path: z.string().optional(),
      type: z.string().default("text/plain"),
      metadata: z.record(z.any()).optional(),
    }),
  },
  artifact_read: {
    description: "Read a saved artifact",
    parameters: z.object({
      name: z.string(),
    }),
  },
  artifact_list: {
    description: "List all saved artifacts",
    parameters: z.object({
      limit: z.number().default(50),
    }),
  },
};
