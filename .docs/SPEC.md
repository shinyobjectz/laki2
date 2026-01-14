# Sandbox Agent Specification

> Self-contained AI agent runtime in an E2B sandbox with local Convex backend.

## Overview

The Sandbox Agent is a fully autonomous development environment that runs inside an E2B sandbox. It uses a **self-hosted Convex backend** for persistence, real-time sync, and agent orchestration - all contained within the sandbox.

### Key Capabilities

| Feature | Description |
|---------|-------------|
| **Local Convex** | Self-hosted Convex backend for persistence & real-time queries |
| **Code Execution** | Bash, Node.js, Python execution with output capture |
| **LSP Hosting** | TypeScript, Python, Rust language servers for intelligent editing |
| **Browser Automation** | Vercel agent-browser for web interaction |
| **Subagents** | Spawn specialized agents for parallel/delegated work |
| **Beads Planning** | Distributed task tracking with dependency resolution |
| **Artifact Storage** | Persist outputs that survive session end |
| **Checkpointing** | Resume long-running tasks across timeout boundaries |

---

## Directory Structure (Proposed Reorganization)

```
packages/sandbox-agent/
├── SPEC.md                     # This file
├── package.json
├── tsconfig.json
│
├── convex/                     # ═══ CONVEX BACKEND (runs inside sandbox) ═══
│   ├── _generated/             # Auto-generated types
│   ├── convex.config.ts        # Component configuration
│   ├── schema.ts               # Database schema
│   │
│   ├── agent/                  # Agent orchestration
│   │   ├── index.ts            # Main workspace agent definition
│   │   ├── threads.ts          # Thread management
│   │   ├── streaming.ts        # Stream delta handling
│   │   └── subagents.ts        # Subagent spawning & coordination
│   │
│   ├── tools/                  # AI SDK tool definitions (call actions)
│   │   ├── index.ts            # createAllTools factory
│   │   ├── file.ts             # file_read, file_write, file_edit, glob, grep
│   │   ├── bash.ts             # Shell execution
│   │   ├── beads.ts            # Task tracking
│   │   ├── artifacts.ts        # Artifact persistence
│   │   ├── lsp.ts              # LSP operations (diagnostics, completions)
│   │   ├── browser.ts          # agent-browser integration
│   │   └── subagent.ts         # Spawn/query subagents
│   │
│   ├── actions/                # Node.js implementations (fs, child_process)
│   │   ├── index.ts
│   │   ├── file.ts             # Actual filesystem operations
│   │   ├── bash.ts             # spawn/exec implementation
│   │   ├── lsp.ts              # LSP server management
│   │   └── browser.ts          # agent-browser CLI wrapper
│   │
│   ├── state/                  # State management
│   │   ├── files.ts            # File state tracking with diffs
│   │   ├── edits.ts            # Edit history for rollback
│   │   ├── verification.ts     # Test/lint verification engine
│   │   └── checkpoints.ts      # Checkpoint persistence
│   │
│   ├── planning/               # Beads-style planning system
│   │   ├── beads.ts            # Task CRUD operations
│   │   ├── dependencies.ts     # Dependency graph resolution
│   │   ├── execution.ts        # Task execution ordering
│   │   └── sync.ts             # Git/cloud sync queue
│   │
│   ├── context/                # Context window orchestration
│   │   ├── session.ts          # Session memory
│   │   ├── cache.ts            # Context caching
│   │   └── compression.ts      # Context compression for long tasks
│   │
│   └── prompts/                # System prompts
│       ├── system.ts           # Base system prompt
│       └── modes.ts            # Mode-specific prompts (plan, build, etc.)
│
├── runtime/                    # ═══ SANDBOX RUNTIME (Node.js processes) ═══
│   ├── entrypoint.ts           # Main sandbox startup script
│   ├── convex-server.ts        # Start convex-local-backend
│   │
│   ├── lsp/                    # LSP server management
│   │   ├── manager.ts          # LSP lifecycle (start/stop/restart)
│   │   ├── typescript.ts       # tsserver wrapper
│   │   ├── python.ts           # pylsp/pyright wrapper
│   │   └── rust.ts             # rust-analyzer wrapper
│   │
│   ├── browser/                # Browser automation
│   │   ├── agent-browser.ts    # Vercel agent-browser wrapper
│   │   └── screenshot.ts       # Screenshot capture
│   │
│   └── services/               # Background services
│       ├── file-watcher.ts     # Filesystem change detection
│       └── event-forwarder.ts  # Forward events to Convex
│
├── shared/                     # ═══ SHARED CODE (host & sandbox) ═══
│   ├── types.ts                # Common TypeScript types
│   ├── schemas/                # Zod schemas shared across layers
│   │   ├── beads.ts
│   │   ├── artifacts.ts
│   │   └── tools.ts
│   └── constants.ts            # Paths, limits, defaults
│
└── template/                   # ═══ E2B TEMPLATE BUILDING (runs on host) ═══
    ├── build.ts                # Main template builder
    ├── base.ts                 # Base template (Ubuntu + Bun + Convex)
    ├── custom.ts               # Custom template (sandbox-agent code)
    └── test.ts                 # Template integration tests
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              E2B SANDBOX                                     │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     CONVEX LOCAL BACKEND                            │    │
│  │                     (convex-local-backend)                          │    │
│  │                                                                      │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │    │
│  │  │  Threads   │  │  Messages  │  │   Beads    │  │  Artifacts │   │    │
│  │  │   Table    │  │   Table    │  │   Table    │  │   Table    │   │    │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │    │
│  │                                                                      │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │                    WORKSPACE AGENT                            │  │    │
│  │  │  ┌─────────────────────────────────────────────────────────┐ │  │    │
│  │  │  │                     TOOLS                                │ │  │    │
│  │  │  │  file_read │ file_write │ file_edit │ bash │ beads     │ │  │    │
│  │  │  │  lsp_diag  │ lsp_complete │ browser  │ subagent        │ │  │    │
│  │  │  └─────────────────────────────────────────────────────────┘ │  │    │
│  │  │                           │                                   │  │    │
│  │  │                           ▼                                   │  │    │
│  │  │  ┌─────────────────────────────────────────────────────────┐ │  │    │
│  │  │  │                   ACTIONS                                │ │  │    │
│  │  │  │  fs/promises │ child_process │ LSP clients │ browser CLI │ │  │    │
│  │  │  └─────────────────────────────────────────────────────────┘ │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                       RUNTIME PROCESSES                              │    │
│  │                                                                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │    │
│  │  │  TypeScript  │  │    Python    │  │     Rust     │              │    │
│  │  │  LSP Server  │  │  LSP Server  │  │  LSP Server  │              │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │    │
│  │                                                                      │    │
│  │  ┌──────────────┐  ┌──────────────┐                                │    │
│  │  │ agent-browser│  │ File Watcher │                                │    │
│  │  │  (headless)  │  │   (chokidar) │                                │    │
│  │  └──────────────┘  └──────────────┘                                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  /home/user/workspace/          ← User's project files                      │
│  /home/user/.convex/            ← Convex data directory                     │
│  /home/user/artifacts/          ← Persistent artifacts                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ HTTP (polling)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLOUD CONVEX                                       │
│                                                                              │
│  convex/agent/workflows/sandboxConvex.ts                                    │
│  - createSession()     → Spawn E2B sandbox                                  │
│  - pollCompletion()    → Check status via HTTP                              │
│  - handleResults()     → Sync artifacts to cloud storage                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. Local Convex Backend

The sandbox runs `convex-local-backend` - the same open-source code as Convex Cloud. This provides:

- **Reactive Queries**: Real-time updates without polling
- **Transactional Mutations**: ACID guarantees for all writes
- **File Storage**: Store artifacts up to 1GB per file
- **Scheduled Functions**: Cron jobs and delayed execution
- **Vector Search**: Embeddings for RAG if needed

```typescript
// convex/agent/index.ts
import { Agent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components } from "./_generated/api";
import { createAllTools } from "../tools";

export const workspaceAgent = new Agent(components.agent, {
  name: "Workspace Agent",
  chat: openai.chat("gpt-4o"),  // Via OpenRouter
  instructions: SYSTEM_PROMPT,
  saveStreamDeltas: true,
});

export const run = action({
  args: { prompt: v.string() },
  handler: async (ctx, { prompt }) => {
    const tools = createAllTools(ctx);
    const { thread } = await workspaceAgent.createThread(ctx);
    return await thread.generateText({ prompt, tools });
  },
});
```

### 2. Tool Architecture

Tools are thin wrappers that call internal actions for actual implementation:

```typescript
// convex/tools/file.ts
export function createFileTools(ctx: ActionCtx) {
  return {
    file_read: tool({
      description: "Read file contents",
      parameters: z.object({ path: z.string() }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.file.readFile, args);
      },
    }),
    // ...
  };
}

// convex/actions/file.ts
export const readFile = internalAction({
  args: { path: v.string() },
  handler: async (ctx, { path }) => {
    const fs = await import("fs/promises");
    return await fs.readFile(path, "utf8");
  },
});
```

### 3. LSP Integration

Language servers provide intelligent code assistance:

```typescript
// convex/tools/lsp.ts
export function createLspTools(ctx: ActionCtx) {
  return {
    lsp_diagnostics: tool({
      description: "Get diagnostics (errors/warnings) for a file",
      parameters: z.object({
        path: z.string(),
        language: z.enum(["typescript", "python", "rust"]),
      }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.lsp.getDiagnostics, args);
      },
    }),

    lsp_completions: tool({
      description: "Get code completions at a position",
      parameters: z.object({
        path: z.string(),
        line: z.number(),
        character: z.number(),
      }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.lsp.getCompletions, args);
      },
    }),

    lsp_hover: tool({
      description: "Get hover information (docs, types) at a position",
      parameters: z.object({
        path: z.string(),
        line: z.number(),
        character: z.number(),
      }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.lsp.getHover, args);
      },
    }),
  };
}
```

### 4. Browser Automation (agent-browser)

Vercel's agent-browser provides headless browser control:

```typescript
// convex/tools/browser.ts
export function createBrowserTools(ctx: ActionCtx) {
  return {
    browser_open: tool({
      description: "Navigate to a URL",
      parameters: z.object({ url: z.string().url() }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.browser.open, args);
      },
    }),

    browser_snapshot: tool({
      description: "Get interactive elements from current page",
      parameters: z.object({ interactive: z.boolean().default(true) }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.browser.snapshot, args);
      },
    }),

    browser_click: tool({
      description: "Click an element by ref (e.g., @e1)",
      parameters: z.object({ ref: z.string() }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.browser.click, args);
      },
    }),

    browser_type: tool({
      description: "Type text into the focused element",
      parameters: z.object({ text: z.string() }),
      execute: async (args) => {
        return await ctx.runAction(internal.actions.browser.type, args);
      },
    }),
  };
}

// convex/actions/browser.ts
export const open = internalAction({
  args: { url: v.string() },
  handler: async (ctx, { url }) => {
    const { execSync } = await import("child_process");
    const result = execSync(`agent-browser open "${url}"`, { encoding: "utf8" });
    return { success: true, output: result };
  },
});
```

### 5. Subagent System

Spawn specialized agents for parallel work:

```typescript
// convex/tools/subagent.ts
export function createSubagentTools(ctx: ActionCtx) {
  return {
    subagent_spawn: tool({
      description: "Spawn a specialized subagent for a task",
      parameters: z.object({
        name: z.string().describe("Subagent name/role"),
        task: z.string().describe("Task description"),
        tools: z.array(z.string()).describe("Tools to enable"),
        model: z.string().default("gpt-4o-mini"),
      }),
      execute: async (args) => {
        // Create a new thread for the subagent
        const subagentDef = new Agent(components.agent, {
          name: args.name,
          chat: openai.chat(args.model),
          instructions: `You are ${args.name}. Complete this task: ${args.task}`,
        });

        const { threadId, thread } = await subagentDef.createThread(ctx, {
          metadata: { parentThread: ctx.threadId, role: args.name },
        });

        // Run asynchronously
        await ctx.scheduler.runAfter(0, internal.agent.subagents.execute, {
          threadId,
          task: args.task,
          tools: args.tools,
        });

        return { subagentId: threadId, status: "spawned" };
      },
    }),

    subagent_status: tool({
      description: "Check status of a spawned subagent",
      parameters: z.object({ subagentId: z.string() }),
      execute: async (args) => {
        return await ctx.runQuery(api.agent.subagents.getStatus, args);
      },
    }),

    subagent_result: tool({
      description: "Get the result from a completed subagent",
      parameters: z.object({ subagentId: z.string() }),
      execute: async (args) => {
        return await ctx.runQuery(api.agent.subagents.getResult, args);
      },
    }),
  };
}
```

### 6. Beads Planning System

Full task tracking with dependency resolution:

```typescript
// convex/planning/beads.ts

// Schema
export const beadsTable = defineTable({
  // Identity
  id: v.string(),          // Short ID like "ABC-123"
  title: v.string(),
  description: v.optional(v.string()),

  // Classification
  type: v.union(
    v.literal("task"),
    v.literal("bug"),
    v.literal("feature"),
    v.literal("epic"),
    v.literal("chore")
  ),
  priority: v.number(),    // 0=critical, 1=high, 2=medium, 3=low, 4=backlog
  labels: v.array(v.string()),

  // Hierarchy
  parentId: v.optional(v.id("beads")),
  childIds: v.array(v.id("beads")),

  // Dependencies
  blockedBy: v.array(v.id("beads")),  // Tasks that must complete first
  blocks: v.array(v.id("beads")),      // Tasks waiting on this one

  // Status
  status: v.union(
    v.literal("open"),
    v.literal("in_progress"),
    v.literal("blocked"),
    v.literal("closed")
  ),
  closedReason: v.optional(v.string()),

  // Assignment
  assignee: v.optional(v.string()),    // Agent or user
  threadId: v.optional(v.string()),    // Active work thread

  // Tracking
  createdAt: v.number(),
  updatedAt: v.number(),
  closedAt: v.optional(v.number()),

  // Context
  relatedFiles: v.array(v.string()),   // Files touched
  artifacts: v.array(v.id("artifacts")),
})
.index("by_status", ["status"])
.index("by_priority", ["priority", "status"])
.index("by_parent", ["parentId"])
.index("by_assignee", ["assignee", "status"]);

// Queries
export const getReady = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    // Get open tasks with no blockers, sorted by priority
    const open = await ctx.db
      .query("beads")
      .withIndex("by_status", q => q.eq("status", "open"))
      .collect();

    const ready = open.filter(task => {
      // No blockers, or all blockers are closed
      if (task.blockedBy.length === 0) return true;
      // Check if all blockers are done
      return task.blockedBy.every(async (blockerId) => {
        const blocker = await ctx.db.get(blockerId);
        return blocker?.status === "closed";
      });
    });

    // Sort by priority (0 first)
    ready.sort((a, b) => a.priority - b.priority);

    return ready.slice(0, limit);
  },
});

// Mutations
export const create = mutation({
  args: {
    title: v.string(),
    type: v.optional(v.string()),
    priority: v.optional(v.number()),
    description: v.optional(v.string()),
    parentId: v.optional(v.id("beads")),
    blockedBy: v.optional(v.array(v.id("beads"))),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const id = generateShortId();  // "ABC-123"

    const taskId = await ctx.db.insert("beads", {
      id,
      title: args.title,
      type: (args.type as any) || "task",
      priority: args.priority ?? 2,
      description: args.description,
      parentId: args.parentId,
      childIds: [],
      blockedBy: args.blockedBy || [],
      blocks: [],
      status: "open",
      labels: args.labels || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      relatedFiles: [],
      artifacts: [],
    });

    // Update parent's childIds
    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (parent) {
        await ctx.db.patch(args.parentId, {
          childIds: [...parent.childIds, taskId],
        });
      }
    }

    // Update blockedBy tasks' blocks array
    for (const blockerId of args.blockedBy || []) {
      const blocker = await ctx.db.get(blockerId);
      if (blocker) {
        await ctx.db.patch(blockerId, {
          blocks: [...blocker.blocks, taskId],
        });
      }
    }

    return { id, _id: taskId };
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("beads"),
    status: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, reason }) => {
    const task = await ctx.db.get(id);
    if (!task) throw new Error("Task not found");

    const updates: any = {
      status,
      updatedAt: Date.now(),
    };

    if (status === "closed") {
      updates.closedAt = Date.now();
      updates.closedReason = reason;

      // Notify blocked tasks they may be unblocked
      for (const blockedId of task.blocks) {
        await ctx.scheduler.runAfter(0, internal.planning.dependencies.checkUnblock, {
          taskId: blockedId,
        });
      }
    }

    await ctx.db.patch(id, updates);
  },
});
```

### 7. Checkpoint System

Resume long-running tasks across E2B timeout boundaries:

```typescript
// convex/state/checkpoints.ts

export const create = mutation({
  args: {
    threadId: v.string(),
    iteration: v.number(),
    reason: v.union(
      v.literal("timeout"),
      v.literal("token_limit"),
      v.literal("manual")
    ),
    // State to preserve
    fileState: v.array(v.object({
      path: v.string(),
      contentHash: v.string(),
      size: v.number(),
    })),
    beadsState: v.array(v.object({
      id: v.string(),
      status: v.string(),
    })),
    nextTask: v.string(),  // What to do when resumed
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("checkpoints", {
      ...args,
      status: "active",
      createdAt: Date.now(),
    });
  },
});

export const restore = internalMutation({
  args: { checkpointId: v.id("checkpoints") },
  handler: async (ctx, { checkpointId }) => {
    const checkpoint = await ctx.db.get(checkpointId);
    if (!checkpoint) throw new Error("Checkpoint not found");

    // Mark as restored
    await ctx.db.patch(checkpointId, {
      status: "restored",
      restoredAt: Date.now(),
    });

    return checkpoint;
  },
});
```

---

## Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ════════════════════════════════════════════════════════════════════
  // PLANNING (Beads)
  // ════════════════════════════════════════════════════════════════════
  beads: defineTable({
    id: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    type: v.string(),
    priority: v.number(),
    labels: v.array(v.string()),
    parentId: v.optional(v.id("beads")),
    childIds: v.array(v.id("beads")),
    blockedBy: v.array(v.id("beads")),
    blocks: v.array(v.id("beads")),
    status: v.string(),
    closedReason: v.optional(v.string()),
    assignee: v.optional(v.string()),
    threadId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    closedAt: v.optional(v.number()),
    relatedFiles: v.array(v.string()),
    artifacts: v.array(v.id("artifacts")),
  })
    .index("by_status", ["status"])
    .index("by_priority", ["priority", "status"])
    .index("by_parent", ["parentId"]),

  // ════════════════════════════════════════════════════════════════════
  // ARTIFACTS
  // ════════════════════════════════════════════════════════════════════
  artifacts: defineTable({
    name: v.string(),
    type: v.string(),           // MIME type
    content: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),  // For large files
    path: v.string(),
    size: v.number(),
    metadata: v.optional(v.any()),
    threadId: v.optional(v.string()),
    createdAt: v.number(),
    syncedToCloud: v.boolean(),
  })
    .index("by_name", ["name"])
    .index("by_thread", ["threadId"]),

  // ════════════════════════════════════════════════════════════════════
  // FILE STATE
  // ════════════════════════════════════════════════════════════════════
  fileState: defineTable({
    path: v.string(),
    contentHash: v.string(),
    size: v.optional(v.number()),
    lastOperation: v.string(),
    lastAccessAt: v.number(),
    accessCount: v.number(),
    threadId: v.optional(v.string()),
    lastEditId: v.optional(v.id("editHistory")),
    createdAt: v.number(),
  })
    .index("by_path", ["path"])
    .index("by_thread", ["threadId"]),

  editHistory: defineTable({
    path: v.string(),
    fileStateId: v.optional(v.id("fileState")),
    oldContentHash: v.string(),
    newContentHash: v.string(),
    diff: v.string(),
    verified: v.boolean(),
    threadId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_path", ["path"])
    .index("by_file_state", ["fileStateId"]),

  // ════════════════════════════════════════════════════════════════════
  // VERIFICATION
  // ════════════════════════════════════════════════════════════════════
  verificationResults: defineTable({
    editId: v.optional(v.id("editHistory")),
    path: v.string(),
    success: v.boolean(),
    checks: v.array(v.object({
      name: v.string(),
      success: v.boolean(),
      output: v.optional(v.string()),
      durationMs: v.optional(v.number()),
    })),
    threadId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_path", ["path"])
    .index("by_edit", ["editId"]),

  testBaselines: defineTable({
    threadId: v.string(),
    result: v.any(),
    createdAt: v.number(),
  })
    .index("by_thread", ["threadId"]),

  // ════════════════════════════════════════════════════════════════════
  // AGENT DECISIONS
  // ════════════════════════════════════════════════════════════════════
  agentDecisions: defineTable({
    timestamp: v.number(),
    threadId: v.string(),
    task: v.string(),
    decisionType: v.string(),
    selectedTools: v.optional(v.array(v.string())),
    reasoning: v.string(),
    expectedOutcome: v.optional(v.string()),
  })
    .index("by_thread", ["threadId"])
    .index("by_timestamp", ["timestamp"]),

  toolExecutions: defineTable({
    decisionId: v.optional(v.id("agentDecisions")),
    tool: v.string(),
    args: v.any(),
    result: v.any(),
    durationMs: v.number(),
    success: v.boolean(),
    error: v.optional(v.string()),
    threadId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_decision", ["decisionId"])
    .index("by_tool", ["tool"]),

  // ════════════════════════════════════════════════════════════════════
  // SESSION & CONTEXT
  // ════════════════════════════════════════════════════════════════════
  sessionMemory: defineTable({
    sessionId: v.string(),
    key: v.string(),
    value: v.any(),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_key", ["sessionId", "key"]),

  contextCache: defineTable({
    threadId: v.string(),
    contentHash: v.string(),
    compressed: v.string(),
    tokenCount: v.number(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_thread", ["threadId"]),

  // ════════════════════════════════════════════════════════════════════
  // CHECKPOINTS
  // ════════════════════════════════════════════════════════════════════
  checkpoints: defineTable({
    sessionId: v.string(),
    threadId: v.string(),
    iteration: v.number(),
    messageHistory: v.array(v.object({
      role: v.string(),
      content: v.string(),
      timestamp: v.optional(v.number()),
    })),
    fileState: v.array(v.object({
      path: v.string(),
      contentHash: v.string(),
      size: v.number(),
      lastModified: v.number(),
    })),
    beadsState: v.array(v.object({
      id: v.string(),
      title: v.string(),
      status: v.string(),
      type: v.string(),
      priority: v.number(),
    })),
    artifactsProduced: v.array(v.string()),
    nextTask: v.string(),
    reason: v.string(),
    status: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    restoredAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index("by_session", ["sessionId"])
    .index("by_status", ["status"]),

  // ════════════════════════════════════════════════════════════════════
  // SYNC QUEUE
  // ════════════════════════════════════════════════════════════════════
  syncQueue: defineTable({
    type: v.string(),
    itemId: v.string(),
    operation: v.string(),
    payload: v.optional(v.any()),
    status: v.string(),
    attempts: v.number(),
    lastAttempt: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_type", ["type", "status"]),

  // ════════════════════════════════════════════════════════════════════
  // SUBAGENTS
  // ════════════════════════════════════════════════════════════════════
  subagents: defineTable({
    parentThreadId: v.string(),
    threadId: v.string(),
    name: v.string(),
    task: v.string(),
    tools: v.array(v.string()),
    model: v.string(),
    status: v.string(),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_parent", ["parentThreadId"])
    .index("by_status", ["status"]),

  // ════════════════════════════════════════════════════════════════════
  // LSP STATE
  // ════════════════════════════════════════════════════════════════════
  lspServers: defineTable({
    language: v.string(),
    pid: v.optional(v.number()),
    status: v.string(),
    port: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    lastHealthCheck: v.optional(v.number()),
  })
    .index("by_language", ["language"]),
});
```

---

## E2B Template

### Base Template

```typescript
// template/base.ts
export const baseTemplate = Template()
  .fromImage("e2bdev/code-interpreter:latest")

  // System dependencies
  .runCmd(`
    sudo apt-get update && sudo apt-get install -y \
      git curl sqlite3 libsqlite3-dev \
      build-essential python3-pip \
      chromium-browser  # For agent-browser
  `)

  // Bun runtime
  .runCmd(`
    export HOME=/home/user && \
    curl -fsSL https://bun.sh/install | bash
  `)

  // Convex local backend
  .runCmd(`
    curl -L https://github.com/get-convex/convex-backend/releases/latest/download/convex-local-backend-linux-x64.zip -o /tmp/convex.zip && \
    unzip /tmp/convex.zip -d /tmp && \
    sudo mv /tmp/convex-local-backend /usr/local/bin/convex-backend && \
    sudo chmod +x /usr/local/bin/convex-backend
  `)

  // Node.js for npx convex
  .runCmd(`
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && \
    sudo apt-get install -y nodejs
  `)

  // Vercel agent-browser
  .runCmd(`
    npm install -g @anthropic/agent-browser
  `)

  // LSP servers
  .runCmd(`
    npm install -g typescript typescript-language-server && \
    pip3 install python-lsp-server && \
    curl -L https://github.com/rust-lang/rust-analyzer/releases/latest/download/rust-analyzer-x86_64-unknown-linux-gnu.gz | gunzip > /usr/local/bin/rust-analyzer && \
    chmod +x /usr/local/bin/rust-analyzer
  `)

  // Directory structure
  .runCmd(`
    mkdir -p /home/user/workspace /home/user/.convex /home/user/artifacts
  `)

  .setEnvs({
    HOME: "/home/user",
    PATH: "/home/user/.bun/bin:/usr/local/bin:/usr/bin:/bin",
    CONVEX_URL: "http://localhost:3210",
  });
```

### Custom Template

```typescript
// template/custom.ts
export const customTemplate = (baseId: string) =>
  Template()
    .fromTemplate(baseId)

    // Copy sandbox-agent code
    .copy("../", "/home/user/sandbox-agent")

    // Install dependencies
    .runCmd(`
      cd /home/user/sandbox-agent && \
      bun install
    `)

    // Deploy to local Convex
    .runCmd(`
      cd /home/user/sandbox-agent && \
      npx convex deploy --local
    `)

    // Create startup script
    .runCmd(`
      cat > /home/user/start.sh << 'EOF'
#!/bin/bash
# Start Convex backend
convex-backend --port 3210 --site-port 3211 &

# Wait for backend
sleep 2

# Start LSP servers
typescript-language-server --stdio &
pylsp &

# Start file watcher
bun /home/user/sandbox-agent/runtime/services/file-watcher.ts &

echo "Sandbox ready"
EOF
      chmod +x /home/user/start.sh
    `);
```

---

## Usage from Cloud

```typescript
// convex/agent/workflows/sandboxConvex.ts
import { Sandbox } from "e2b";

export const createSession = internalAction({
  args: {
    prompt: v.string(),
    context: v.optional(v.any()),
    timeoutMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Spawn E2B sandbox
    const sandbox = await Sandbox.create("convex-sandbox-agent", {
      timeoutMs: args.timeoutMs || 300000,  // 5 min default
    });

    // Start services
    await sandbox.commands.run("/home/user/start.sh");

    // Run agent
    const result = await sandbox.commands.run(
      `cd /home/user/sandbox-agent && bun run agent "${args.prompt}"`,
      { timeoutMs: args.timeoutMs }
    );

    // Get artifacts
    const artifacts = await sandbox.files.list("/home/user/artifacts");

    // Sync to cloud
    for (const artifact of artifacts) {
      const content = await sandbox.files.read(artifact.path);
      await ctx.runMutation(internal.artifacts.syncFromSandbox, {
        name: artifact.name,
        content,
      });
    }

    return {
      status: result.exitCode === 0 ? "completed" : "failed",
      output: result.stdout,
      error: result.stderr,
      artifacts: artifacts.map(a => a.name),
    };
  },
});
```

---

## Next Steps

1. **Implement LSP actions** - TypeScript/Python/Rust server management
2. **Implement browser actions** - agent-browser CLI wrapper
3. **Implement subagent system** - Thread-based subagent spawning
4. **Test E2B template** - Build and validate in E2B
5. **Wire to kanban** - Connect sandboxConvex to card execution
6. **Add dependency graph** - Full beads dependency resolution

---

## References

- [Convex Agent SDK](https://docs.convex.dev/agents)
- [Convex Self-Hosting](https://github.com/get-convex/convex-backend)
- [E2B Documentation](https://e2b.dev/docs)
- [Vercel agent-browser](https://github.com/vercel-labs/agent-browser)
- [Beads Issue Tracking](https://github.com/steveyegge/beads)
