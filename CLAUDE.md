# Lakitu SDK - AI Agent Instructions

> **AUDIENCE**: This document is for YOU, the AI agent (Claude Code, Cursor, etc.) working on this codebase.
> Read this BEFORE writing any code.

---

## 🚨 CRITICAL: This Submodule is for PUBLISHING, Not Consuming

```
┌─────────────────────────────────────────────────────────────────────────┐
│  The submodule exists to PUBLISH changes to npm.                        │
│  All RUNTIME usage must go through the npm package @lakitu/sdk          │
│                                                                         │
│  ✅ bunx @lakitu/sdk build --custom    (uses npm - CORRECT)            │
│  ❌ bun ./cli/index.ts build --custom  (uses submodule - WRONG)        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why This Matters

When you run commands from the submodule directly:
- You're testing **uncommitted local code**, not what users will get
- Changes may work locally but fail after npm publish
- Sandbox builds use the **npm version**, not your local changes
- You create a false sense of "it works"

---

## ✅ CORRECT Patterns

### Running SDK Commands
```bash
# CORRECT - always use npm package
bunx @lakitu/sdk build --custom
npx @lakitu/sdk build --custom

# WRONG - bypasses npm, uses local code
bun ./cli/index.ts build --custom
node dist/cli/index.js build --custom
```

### Making Changes to the SDK
```bash
# 1. Edit files in this submodule
vim cli/commands/build.ts

# 2. Bump version in package.json (REQUIRED!)
#    0.1.54 → 0.1.55

# 3. Commit and push (triggers npm publish)
git add -A && git commit -m "feat: description" && git push origin main

# 4. WAIT for npm publish (DO NOT SKIP!)
for i in {1..15}; do
  ver=$(npm view @lakitu/sdk version 2>/dev/null)
  echo "Check $i: $ver"
  [ "$ver" = "0.1.55" ] && break
  sleep 8
done

# 5. Now rebuild sandbox (uses npm version)
cd /path/to/project.social
bun sandbox:custom
```

---

## ❌ ANTI-PATTERNS (Never Do These)

| Anti-Pattern | Why It's Wrong | Correct Approach |
|--------------|----------------|------------------|
| `bun ./cli/index.ts ...` | Uses local code, not npm | `bunx @lakitu/sdk ...` |
| Editing without version bump | npm won't publish | Always bump version |
| Rebuilding before npm publish | Uses old npm version | Poll `npm view` first |
| Using `bun link` | Creates confusing state | Use publish workflow |
| Testing via submodule | Masks publish issues | Publish, then test |

---

## Package Structure

```
submodules/lakitu-sdk/          # ← You are here (git submodule)
├── .git/                       #   Separate git history
├── package.json                #   Published as @lakitu/sdk
├── .github/workflows/          #   Auto-publishes to npm
├── cli/                        #   CLI commands (build, etc.)
├── ksa/                        #   Core KSA modules
├── convex/                     #   Sandbox + Cloud Convex code
└── template/                   #   E2B template builder
```

### NPM Publish Workflow

GitHub Actions auto-publishes when:
1. Push to `main` branch
2. `package.json` version changed

```yaml
# .github/workflows/publish.yml logic
if [ "$CURRENT" != "$NEW" ]; then npm publish; fi
```

**No version bump = No publish!**

---

## Sandbox Rebuild Requirements

The agent runs inside an E2B sandbox template built from the **npm package**, not the local submodule.

### TWO KSA Locations

| Location | Purpose | Rebuild Process |
|----------|---------|-----------------|
| **`/project.social/lakitu/*.ts`** | Project KSAs (canvas, stealth, etc.) | Edit → `bun sandbox:custom` |
| `submodules/lakitu-sdk/ksa/*.ts` | SDK KSAs (file, browser) | Edit → bump version → push → wait for npm → `bun sandbox:custom` |

### What Requires What

| Change | Version Bump? | Wait for npm? | Rebuild? |
|--------|---------------|---------------|----------|
| Project KSA (`/lakitu/*.ts`) | No | No | Yes |
| SDK KSA (`ksa/*.ts`) | **YES** | **YES** | Yes |
| CLI command (`cli/*.ts`) | **YES** | **YES** | Yes |
| Template builder (`template/*.ts`) | **YES** | **YES** | Yes |

### Common Mistakes

1. **Editing SDK files without version bump** → npm doesn't publish → sandbox uses old code
2. **Not waiting for npm publish** → `bun sandbox:custom` downloads old version
3. **Testing via submodule** → Works locally but fails in production

---

## Taxonomy Warning

> **CRITICAL**: The terms "tools" and "skills" are OVERLOADED in AI codebases.
> This project uses **KSA** (Knowledge, Skills, and Abilities) to avoid confusion.

| Term | In This Codebase | NOT This |
|------|------------------|----------|
| **KSA** | Plain TypeScript modules in `ksa/` | AI SDK tools, MCP tools, Claude skills |
| **tools** | LEGACY code being removed | Do not use this term |
| **skills** | Do not use | Overloaded term |

## The Architecture (DO NOT DEVIATE)

Lakitu uses **code execution**, NOT JSON tool calls.

```
CORRECT: Agent writes TypeScript → imports from ksa/ → E2B executes it
WRONG:   Agent makes JSON tool call → Executor parses JSON → Runs function
```

### What is a KSA?

A **KSA (Knowledge, Skills, and Abilities)** is a comprehensive capability module:

- **Knowledge**: JSDoc documentation explaining what it does
- **Skills**: Executable TypeScript functions
- **Abilities**: What the agent can accomplish with it

KSAs are designed for **code execution** - the agent imports and calls them directly.

### What This Means For You

When working on this codebase:

| If you see... | It is... | Do NOT... |
|---------------|----------|-----------|
| `ksa/*.ts` | ✅ CORRECT - KSA modules | Convert to tool() format |
| `convex/tools/*.ts` | ⚠️ LEGACY - being removed | Add more tool() definitions |
| `import { tool } from 'ai'` | ⚠️ LEGACY | Use this pattern |
| System prompt with code examples | ✅ CORRECT | Add JSON tool schemas |

## STOP: Read Before Touching Agent Code

### The Wrong Pattern (DO NOT ADD)

```typescript
// ❌ WRONG - JSON tool calling pattern (AI SDK, MCP, etc.)
import { tool } from 'ai';

export const searchTool = tool({
  description: 'Search the web',
  parameters: z.object({ query: z.string() }),
  execute: async (args) => { ... }
});

// Sending tool schemas to LLM:
const response = await llm.chat({
  tools: [searchTool],  // ❌ NO - don't send tool schemas
});

// Parsing tool calls:
if (response.tool_calls) {  // ❌ NO - don't parse JSON tool calls
  for (const tc of response.tool_calls) {
    await executeTool(tc.name, tc.args);
  }
}
```

### The Right Pattern (ADD THIS)

```typescript
// ✅ CORRECT - Code execution with KSAs

// KSAs are plain TypeScript functions in ksa/*.ts
export async function search(query: string): Promise<SearchResult[]> {
  // Implementation
}

// Agent loop does NOT send tool schemas
const response = await llm.chat({
  messages,  // No 'tools' property!
});

// Agent generates code, we execute it
const codeBlocks = extractCodeBlocks(response.content);
for (const code of codeBlocks) {
  await sandbox.execute(code);  // E2B runs the TypeScript
}
```

## Directory Structure

```
packages/lakitu/
├── ksa/                    # ✅ KSA MODULES (Knowledge, Skills, Abilities)
│   ├── _shared/            #    Gateway, localDb, config
│   ├── web.ts              #    Agent imports: from './ksa/web'
│   ├── file.ts
│   ├── pdf.ts
│   ├── beads.ts
│   └── browser.ts
│
├── loro/                   # ✅ CRDT utilities for persistence
│   ├── fs.ts               #    LoroFS - workspace filesystem tree
│   ├── beads.ts            #    LoroBeads - task tracking CRDT
│   └── index.ts            #    Exports: @lakitu/sdk/loro
│
├── convex/                 # Sandbox-local Convex backend
│   ├── cloud/              #    Cloud orchestration (lifecycleSandbox)
│   └── tools/              #    ⚠️ LEGACY - being removed
│
├── runtime/                # CLI commands for bash
│   └── generate-pdf        #    Called via: bash: generate-pdf "name"
│
├── template/               # E2B sandbox template builder
│   └── build.ts            #    Run: bun sandbox:custom
│
└── .github/workflows/      # CI/CD
    └── publish.yml         #    Auto-publish to npm on version bump
```

## When Adding New Capabilities

### Option A: Add a KSA (Preferred)

1. Create `ksa/mycapability.ts`:
```typescript
/**
 * MyCapability KSA - Knowledge, Skills, and Abilities
 *
 * Description of what this KSA enables.
 */

// Knowledge: Type definitions
export interface MyResult {
  // Types help the agent understand data structures
}

// Skills: Executable functions
/**
 * Function description with @example
 *
 * @example
 * const result = await myFunction('input');
 */
export async function myFunction(arg: string): Promise<MyResult> {
  // Abilities: The implementation
}
```

2. The agent uses it by writing code:
```typescript
import { myFunction } from './ksa/mycapability';
const result = await myFunction('input');
console.log(result);
```

3. **⚠️ REBUILD SANDBOX**: `bun sandbox:custom` from project root!

### Option B: Add a CLI Command (For File Output)

1. Create `runtime/my-command.ts`
2. Copy to `/usr/local/bin/` in `template/build.ts`
3. **⚠️ REBUILD SANDBOX**: `bun sandbox:custom`
4. Agent uses via: `bash: my-command "args"`

> **IMPORTANT**: Changes to ANY file in `packages/lakitu/` require `bun sandbox:custom` to take effect!

### NEVER Do This

```typescript
// ❌ NEVER add tool() definitions
import { tool } from 'ai';
export const myTool = tool({ ... });

// ❌ NEVER add to createAllTools()
export function createAllTools(ctx) {
  return {
    ...createMyTools(ctx),  // NO
  };
}

// ❌ NEVER send tool schemas to LLM
await llm.chat({ tools: [...] });
```

## Why KSAs + Code Execution

1. **No Confusion** - "KSA" won't be mistaken for AI SDK tools, MCP, or Claude skills
2. **Token Efficiency** - No tool schemas sent every request
3. **Model Agnostic** - Any LLM that generates code works
4. **Composable** - Agent chains operations naturally in code
5. **Debuggable** - You can read exactly what code ran
6. **Extensible** - Add KSAs by adding TypeScript files

## Quick Reference

| Task | Do This | NOT This |
|------|---------|----------|
| Run SDK command | `bunx @lakitu/sdk <cmd>` | `bun ./cli/index.ts <cmd>` |
| Add project KSA | `/lakitu/mycap.ts` → rebuild | Add to this submodule |
| Add SDK KSA | `ksa/mycap.ts` → bump → push → wait → rebuild | Forget version bump |
| Test changes | Publish to npm first, then test | Test via submodule |
| Rebuild sandbox | `bun sandbox:custom` (from project root) | Rebuild before npm publishes |

## SDK Change Workflow (Complete)

```bash
# ═══════════════════════════════════════════════════════════════
# 1. Make changes
# ═══════════════════════════════════════════════════════════════
cd submodules/lakitu-sdk
vim ksa/somefile.ts  # or cli/, template/, etc.

# ═══════════════════════════════════════════════════════════════
# 2. Bump version (REQUIRED!)
# ═══════════════════════════════════════════════════════════════
# Edit package.json: "version": "X.Y.Z" → "X.Y.Z+1"

# ═══════════════════════════════════════════════════════════════
# 3. Commit and push (triggers npm publish)
# ═══════════════════════════════════════════════════════════════
git add -A && git commit -m "feat: description" && git push origin main

# ═══════════════════════════════════════════════════════════════
# 4. WAIT for npm publish (DO NOT SKIP!)
# ═══════════════════════════════════════════════════════════════
for i in {1..15}; do
  ver=$(npm view @lakitu/sdk version 2>/dev/null)
  echo "Check $i: $ver"
  [ "$ver" = "NEW_VERSION" ] && echo "✅ Published!" && break
  sleep 8
done

# ═══════════════════════════════════════════════════════════════
# 5. Update parent repo
# ═══════════════════════════════════════════════════════════════
cd ../..
git add submodules/lakitu-sdk
git commit -m "chore: update lakitu-sdk to vX.Y.Z"
git push

# ═══════════════════════════════════════════════════════════════
# 6. Rebuild sandbox (now uses npm version)
# ═══════════════════════════════════════════════════════════════
bun sandbox:custom
```

## Verification Commands

```bash
# Check published npm version
npm view @lakitu/sdk version

# Check local submodule version
cat package.json | grep '"version"'

# Verify sandbox uses correct version (check build logs)
bun sandbox:custom 2>&1 | grep -i "lakitu"
```

## See Also

- `ksa/README.md` - KSA documentation and examples
- `.github/workflows/publish.yml` - NPM publish automation
- `/project.social/AGENTS.md` - Full project documentation
