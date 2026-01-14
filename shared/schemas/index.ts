/**
 * Shared Schemas - Zod validation schemas
 *
 * Used for runtime validation of tool inputs and API payloads.
 */

import { z } from "zod";

// ============================================
// File Operations
// ============================================

export const filePathSchema = z.string()
  .min(1, "Path cannot be empty")
  .refine(
    (p) => p.startsWith("/") || p.startsWith("./"),
    "Path must be absolute or relative"
  );

export const fileReadArgsSchema = z.object({
  path: filePathSchema,
  encoding: z.enum(["utf8", "base64"]).default("utf8"),
});

export const fileWriteArgsSchema = z.object({
  path: filePathSchema,
  content: z.string(),
  createDirs: z.boolean().default(true),
});

export const fileEditArgsSchema = z.object({
  path: filePathSchema,
  oldContent: z.string().min(1, "Old content cannot be empty"),
  newContent: z.string(),
});

export const globArgsSchema = z.object({
  pattern: z.string().min(1, "Pattern cannot be empty"),
  cwd: z.string().default("/home/user/workspace"),
  maxResults: z.number().int().positive().max(1000).default(100),
});

export const grepArgsSchema = z.object({
  pattern: z.string().min(1, "Pattern cannot be empty"),
  path: z.string().default("/home/user/workspace"),
  fileGlob: z.string().optional(),
  maxMatches: z.number().int().positive().max(500).default(50),
});

// ============================================
// Bash Execution
// ============================================

export const bashArgsSchema = z.object({
  command: z.string().min(1, "Command cannot be empty"),
  cwd: z.string().optional(),
  timeoutMs: z.number().int().positive().max(600000).default(120000),
});

// ============================================
// Beads (Task Tracking)
// ============================================

export const beadTypeSchema = z.enum(["task", "bug", "feature", "epic", "chore"]);
export const beadStatusSchema = z.enum(["open", "in_progress", "blocked", "closed"]);
export const beadPrioritySchema = z.number().int().min(0).max(4);

export const beadCreateArgsSchema = z.object({
  title: z.string().min(1).max(200),
  type: beadTypeSchema.default("task"),
  priority: beadPrioritySchema.default(2),
  description: z.string().max(10000).optional(),
  labels: z.array(z.string()).optional(),
  parentId: z.string().optional(),
  blockedBy: z.array(z.string()).optional(),
});

export const beadUpdateArgsSchema = z.object({
  id: z.string(),
  status: beadStatusSchema.optional(),
  priority: beadPrioritySchema.optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  labels: z.array(z.string()).optional(),
  blockedBy: z.array(z.string()).optional(),
});

// ============================================
// LSP Operations
// ============================================

export const languageSchema = z.enum(["typescript", "python", "rust"]);

export const lspPositionSchema = z.object({
  line: z.number().int().min(0),
  character: z.number().int().min(0),
});

export const lspDiagnosticsArgsSchema = z.object({
  path: filePathSchema,
  language: languageSchema.optional(),
});

export const lspCompletionArgsSchema = z.object({
  path: filePathSchema,
  line: z.number().int().min(0),
  character: z.number().int().min(0),
  language: languageSchema.optional(),
});

export const lspHoverArgsSchema = z.object({
  path: filePathSchema,
  line: z.number().int().min(0),
  character: z.number().int().min(0),
  language: languageSchema.optional(),
});

// ============================================
// Browser Operations
// ============================================

export const browserOpenArgsSchema = z.object({
  url: z.string().url(),
});

export const browserSnapshotArgsSchema = z.object({
  interactive: z.boolean().default(true),
});

export const browserClickArgsSchema = z.object({
  ref: z.string().regex(/^@e\d+$/, "Ref must be in format @e1, @e2, etc."),
});

export const browserTypeArgsSchema = z.object({
  text: z.string(),
});

export const browserPressArgsSchema = z.object({
  key: z.string(),
});

export const browserScrollArgsSchema = z.object({
  direction: z.enum(["up", "down", "top", "bottom"]),
});

// ============================================
// Subagent Operations
// ============================================

export const subagentSpawnArgsSchema = z.object({
  name: z.string().min(1).max(50),
  task: z.string().min(1).max(10000),
  tools: z.array(z.string()).default([]),
  model: z.string().default("gpt-4o-mini"),
});

export const subagentQueryArgsSchema = z.object({
  subagentId: z.string(),
});

// ============================================
// Artifacts
// ============================================

export const artifactSaveArgsSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().default("text/plain"),
  path: filePathSchema,
  content: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================
// Checkpoints
// ============================================

export const checkpointReasonSchema = z.enum([
  "timeout",
  "token_limit",
  "manual",
  "error_recovery",
]);

export const checkpointCreateArgsSchema = z.object({
  sessionId: z.string(),
  threadId: z.string(),
  iteration: z.number().int().min(0),
  nextTask: z.string(),
  reason: checkpointReasonSchema,
  metadata: z.record(z.unknown()).optional(),
});

// Export all schemas
export const schemas = {
  file: {
    read: fileReadArgsSchema,
    write: fileWriteArgsSchema,
    edit: fileEditArgsSchema,
    glob: globArgsSchema,
    grep: grepArgsSchema,
  },
  bash: bashArgsSchema,
  beads: {
    create: beadCreateArgsSchema,
    update: beadUpdateArgsSchema,
    type: beadTypeSchema,
    status: beadStatusSchema,
  },
  lsp: {
    diagnostics: lspDiagnosticsArgsSchema,
    completion: lspCompletionArgsSchema,
    hover: lspHoverArgsSchema,
    language: languageSchema,
  },
  browser: {
    open: browserOpenArgsSchema,
    snapshot: browserSnapshotArgsSchema,
    click: browserClickArgsSchema,
    type: browserTypeArgsSchema,
    press: browserPressArgsSchema,
    scroll: browserScrollArgsSchema,
  },
  subagent: {
    spawn: subagentSpawnArgsSchema,
    query: subagentQueryArgsSchema,
  },
  artifact: {
    save: artifactSaveArgsSchema,
  },
  checkpoint: {
    create: checkpointCreateArgsSchema,
  },
};
