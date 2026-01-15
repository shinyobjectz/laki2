# Lakitu KSAs (Knowledge, Skills, and Abilities)

> **Why "KSA"?** The terms "tools" and "skills" are overloaded in AI agent codebases.
> Every framework (AI SDK, MCP, Claude, OpenCode) uses them differently.
> **KSA** is a distinct term that won't be confused with other implementations.

## What is a KSA?

A KSA is a comprehensive capability module that combines:

- **Knowledge**: Documentation and context (like MCP descriptions)
- **Skills**: Executable TypeScript functions (like tool implementations)
- **Abilities**: What the agent can accomplish (like Claude skills guidance)

KSAs are designed for **code execution** - the agent imports and calls them directly.

## Quick Reference

| KSA | Functions | Import |
|-----|-----------|--------|
| **web** | `search`, `scrape`, `news` | `from './ksa/web'` |
| **file** | `read`, `write`, `edit`, `glob`, `grep`, `ls` | `from './ksa/file'` |
| **pdf** | `generate` | `from './ksa/pdf'` |
| **beads** | `create`, `update`, `close`, `list`, `getReady`, `get` | `from './ksa/beads'` |
| **browser** | `open`, `screenshot`, `click`, `type`, `getText`, `getHtml` | `from './ksa/browser'` |

## Usage

The agent writes TypeScript that imports from KSAs:

```typescript
import { search, scrape } from './ksa/web';
import { write } from './ksa/file';
import { generate } from './ksa/pdf';

// Research a topic
const results = await search('AI news 2025');

// Get detailed content
const content = await scrape(results[0].url);

// Save as PDF
await generate(content.markdown, 'ai-report', 'AI News Report');
```

## How KSAs Differ From...

| Concept | What It Is | How KSA Differs |
|---------|------------|-----------------|
| **AI SDK tool()** | JSON schema + execute function for tool calling | KSA is plain TypeScript, no JSON schema |
| **MCP Tool** | Server-defined capability with protocol | KSA is local files, no protocol overhead |
| **Claude Skill** | Prompt-based capability guidance | KSA includes actual executable code |
| **Function Call** | LLM generates JSON to call function | KSA: LLM generates code that imports & calls |

## KSA File Examples

### Web Research

```typescript
import { search, scrape, news } from './ksa/web';

// Search the web
const results = await search('TypeScript best practices');
for (const r of results) {
  console.log(`${r.title}: ${r.url}`);
}

// Get content from a URL
const content = await scrape('https://example.com/article');
console.log(content.markdown);

// Get recent news
const articles = await news('AI', 5);
```

### File Operations

```typescript
import { read, write, edit, glob, grep } from './ksa/file';

// Read a file
const content = await read('/home/user/workspace/README.md');

// Write a file
await write('/home/user/workspace/output.txt', 'Hello, world!');

// Edit a file (find and replace)
await edit('/home/user/workspace/config.ts', 'debug: false', 'debug: true');

// Find TypeScript files
const tsFiles = await glob('**/*.ts');

// Search for patterns
const todos = await grep('TODO:');
```

### PDF Generation

```typescript
import { generate } from './ksa/pdf';

await generate(`# Quarterly Report

## Summary
Key findings from this quarter...

## Metrics
- Revenue: $1.2M
- Growth: 15%
`, 'quarterly-report', 'Q4 2025 Report');

// Creates /home/user/artifacts/quarterly-report.pdf
```

### Task Tracking

```typescript
import { create, update, close, list, getReady } from './ksa/beads';

// Create a task
const id = await create({
  title: 'Implement search feature',
  type: 'feature',
  priority: 1,
});

// Update status
await update(id, { status: 'in_progress' });

// List open tasks
const tasks = await list({ status: 'open' });

// Get ready tasks (no blockers)
const ready = await getReady();

// Close when done
await close(id, 'Search feature implemented and tested');
```

### Browser Automation

```typescript
import { open, screenshot, click, type, getText } from './ksa/browser';

// Open a page
await open('https://example.com');

// Take a screenshot
const { path } = await screenshot('homepage');

// Interact with elements
await click('button.login');
await type('input[name="email"]', 'user@example.com');

// Get page content
const text = await getText();
```

## Working Directories

| Path | Purpose |
|------|---------|
| `/home/user/workspace/` | Working directory for code and files |
| `/home/user/artifacts/` | Persistent outputs (PDFs, screenshots) |
| `/home/user/ksa/` | KSA modules (read-only) |

## Adding New KSAs

See `packages/lakitu/CLAUDE.md` for instructions.
