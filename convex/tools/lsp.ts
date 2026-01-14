/**
 * LSP Tools
 *
 * Tool definitions for Language Server Protocol operations.
 * Provides intelligent code assistance for TypeScript, Python, and Rust.
 */

import { tool } from "ai";
import { z } from "zod";
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Create LSP tools bound to a Convex action context.
 */
export function createLspTools(ctx: ActionCtx) {
  return {
    lsp_diagnostics: tool({
      description:
        "Get diagnostics (errors, warnings) for a file. Use this to check for issues after editing.",
      parameters: z.object({
        path: z.string().describe("Absolute path to the file"),
        language: z
          .enum(["typescript", "python", "rust"])
          .optional()
          .describe("Language (auto-detected from extension if not provided)"),
      }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.lsp.getDiagnostics, {
          path: args.path,
          language: args.language,
        });
      },
    }),

    lsp_completions: tool({
      description:
        "Get code completions at a specific position. Use this when writing code to see available options.",
      parameters: z.object({
        path: z.string().describe("Absolute path to the file"),
        line: z.number().describe("Line number (0-indexed)"),
        character: z.number().describe("Character position in line (0-indexed)"),
      }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.lsp.getCompletions, args);
      },
    }),

    lsp_hover: tool({
      description:
        "Get hover information (types, documentation) at a position. Use this to understand code.",
      parameters: z.object({
        path: z.string().describe("Absolute path to the file"),
        line: z.number().describe("Line number (0-indexed)"),
        character: z.number().describe("Character position in line (0-indexed)"),
      }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.lsp.getHover, args);
      },
    }),

    lsp_definition: tool({
      description: "Go to the definition of a symbol. Use this to find where something is defined.",
      parameters: z.object({
        path: z.string().describe("Absolute path to the file"),
        line: z.number().describe("Line number (0-indexed)"),
        character: z.number().describe("Character position in line (0-indexed)"),
      }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.lsp.getDefinition, args);
      },
    }),

    lsp_references: tool({
      description: "Find all references to a symbol. Use this to see where something is used.",
      parameters: z.object({
        path: z.string().describe("Absolute path to the file"),
        line: z.number().describe("Line number (0-indexed)"),
        character: z.number().describe("Character position in line (0-indexed)"),
      }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.lsp.getReferences, args);
      },
    }),

    lsp_rename: tool({
      description: "Get rename edits for a symbol across files. Returns the edits without applying them.",
      parameters: z.object({
        path: z.string().describe("Absolute path to the file"),
        line: z.number().describe("Line number (0-indexed)"),
        character: z.number().describe("Character position in line (0-indexed)"),
        newName: z.string().describe("New name for the symbol"),
      }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.lsp.getRenameEdits, args);
      },
    }),
  };
}
