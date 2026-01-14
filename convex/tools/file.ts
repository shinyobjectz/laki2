/**
 * File Tools
 *
 * Tool definitions for file operations.
 * Tools are thin wrappers that describe parameters and call internal actions.
 */

import { tool } from "ai";
import { z } from "zod";
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Create file tools bound to a Convex action context.
 * This allows tools to call internal actions for the actual implementation.
 */
export function createFileTools(ctx: ActionCtx) {
  return {
    file_read: tool({
      description:
        "Read the contents of a file. Always use this before editing to verify current state.",
      parameters: z.object({
        path: z.string().describe("Absolute path to the file"),
        encoding: z.enum(["utf8", "base64"]).default("utf8"),
      }),
      execute: async (args) => {
        const result = await ctx.runAction(internal.actions.file.readFile, {
          path: args.path,
          encoding: args.encoding,
        });

        // Track file access in state
        if (result.success) {
          await ctx.runMutation(internal.state.files.internalTrackFileAccess, {
            path: args.path,
            operation: "read",
            size: result.size,
          });
        }

        return result;
      },
    }),

    file_write: tool({
      description:
        "Write content to a new file. Use file_edit for existing files.",
      parameters: z.object({
        path: z.string().describe("Absolute path for the new file"),
        content: z.string().describe("Content to write"),
        createDirs: z.boolean().default(true).describe("Create parent directories if needed"),
      }),
      execute: async (args) => {
        const result = await ctx.runAction(internal.actions.file.writeFile, {
          path: args.path,
          content: args.content,
          createDirs: args.createDirs,
        });

        // Track file creation in state
        if (result.success) {
          await ctx.runMutation(internal.state.files.internalTrackFileAccess, {
            path: args.path,
            operation: "write",
            size: args.content.length,
          });
        }

        return result;
      },
    }),

    file_edit: tool({
      description:
        "Edit an existing file by replacing old content with new content. The old_content must exactly match a portion of the current file.",
      parameters: z.object({
        path: z.string().describe("Absolute path to the file"),
        old_content: z.string().describe("Exact content to replace (must match current file)"),
        new_content: z.string().describe("New content to insert"),
      }),
      execute: async (args) => {
        const result = await ctx.runAction(internal.actions.file.editFile, {
          path: args.path,
          oldContent: args.old_content,
          newContent: args.new_content,
        });

        // Track edit in state
        if (result.success && result.previousContent && result.newContent) {
          await ctx.runMutation(internal.state.files.internalRecordEdit, {
            path: args.path,
            oldContent: result.previousContent,
            newContent: result.newContent,
            diff: result.diff || "",
            verified: true,
          });
        }

        return result;
      },
    }),

    file_glob: tool({
      description: "Find files matching a glob pattern",
      parameters: z.object({
        pattern: z.string().describe("Glob pattern (e.g., '**/*.ts')"),
        cwd: z.string().default("/home/user/workspace").describe("Directory to search in"),
        maxResults: z.number().default(100),
      }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.file.globFiles, {
          pattern: args.pattern,
          cwd: args.cwd,
          maxResults: args.maxResults,
        });
      },
    }),

    file_grep: tool({
      description: "Search for a pattern in files",
      parameters: z.object({
        pattern: z.string().describe("Search pattern (regex)"),
        path: z.string().default("/home/user/workspace").describe("File or directory to search"),
        glob: z.string().optional().describe("File pattern filter (e.g., '*.ts')"),
        maxMatches: z.number().default(50),
      }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.file.grepFiles, {
          pattern: args.pattern,
          path: args.path,
          fileGlob: args.glob,
          maxMatches: args.maxMatches,
        });
      },
    }),

    file_ls: tool({
      description: "List files and directories",
      parameters: z.object({
        path: z.string().describe("Directory path"),
        showHidden: z.boolean().default(false),
      }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.file.listDir, {
          path: args.path,
          showHidden: args.showHidden,
        });
      },
    }),
  };
}

// Legacy export for compatibility - tools without context binding
// These will need to be bound to a context before use
export const fileTools = {
  file_read: {
    description: "Read the contents of a file",
    parameters: z.object({
      path: z.string(),
      encoding: z.enum(["utf8", "base64"]).default("utf8"),
    }),
  },
  file_write: {
    description: "Write content to a new file",
    parameters: z.object({
      path: z.string(),
      content: z.string(),
      createDirs: z.boolean().default(true),
    }),
  },
  file_edit: {
    description: "Edit an existing file",
    parameters: z.object({
      path: z.string(),
      old_content: z.string(),
      new_content: z.string(),
    }),
  },
  file_glob: {
    description: "Find files matching a glob pattern",
    parameters: z.object({
      pattern: z.string(),
      cwd: z.string().default("/home/user/workspace"),
      maxResults: z.number().default(100),
    }),
  },
  file_grep: {
    description: "Search for a pattern in files",
    parameters: z.object({
      pattern: z.string(),
      path: z.string().default("/home/user/workspace"),
      glob: z.string().optional(),
      maxMatches: z.number().default(50),
    }),
  },
  file_ls: {
    description: "List files and directories",
    parameters: z.object({
      path: z.string(),
      showHidden: z.boolean().default(false),
    }),
  },
};
