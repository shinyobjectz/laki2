<p align="center">
  <img src="assets/laki2-banner.jpeg" alt="Laki2 Banner" width="100%">
</p>

# Laki2

> Self-hosted AI agent runtime in an E2B sandbox with local Convex backend.

Laki2 is a fully autonomous development environment that runs inside an [E2B](https://e2b.dev) sandbox. It uses a **self-hosted Convex backend** for persistence, real-time sync, and agent orchestration - all contained within the sandbox.

## Features

| Feature | Description |
|---------|-------------|
| **Local Convex** | Self-hosted Convex backend for persistence & real-time queries |
| **Code Execution** | Bash, Node.js, Python execution with output capture |
| **LSP Hosting** | TypeScript, Python, Rust language servers for intelligent editing |
| **Browser Automation** | Headless browser for web interaction |
| **Subagents** | Spawn specialized agents for parallel/delegated work |
| **Beads Planning** | Distributed task tracking with dependency resolution |
| **Artifact Storage** | Persist outputs that survive session end |
| **Checkpointing** | Resume long-running tasks across timeout boundaries |

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- [E2B API Key](https://e2b.dev) 
- [Convex](https://convex.dev) account (for cloud sync)

### Installation

```bash
# Clone the repo
git clone https://github.com/shinyobjectz/laki2.git
cd laki2

# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Add your E2B_API_KEY and OPENROUTER_API_KEY
```

### Development

```bash
# Start local Convex dev server
bun dev

# Run tests
bun test

# Type check
bun typecheck
```

### Building the E2B Template

```bash
# Build and push the custom template (~1 min)
bun template:custom

# Build base + custom template (~5 min)
bun template:build
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              E2B SANDBOX                                     │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     CONVEX LOCAL BACKEND                            │    │
│  │                                                                      │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │    │
│  │  │  Threads   │  │  Messages  │  │   Beads    │  │  Artifacts │   │    │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │    │
│  │                                                                      │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │                    WORKSPACE AGENT                            │  │    │
│  │  │  file_read │ file_write │ bash │ lsp │ browser │ subagent   │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                       RUNTIME PROCESSES                              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │    │
│  │  │  TypeScript  │  │    Python    │  │ File Watcher │              │    │
│  │  │  LSP Server  │  │  LSP Server  │  │   (chokidar) │              │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
laki2/
├── convex/                 # Convex backend (runs inside sandbox)
│   ├── agent/              # Agent orchestration
│   ├── tools/              # AI SDK tool definitions
│   ├── actions/            # Node.js implementations
│   ├── state/              # State management
│   ├── planning/           # Beads task tracking
│   ├── context/            # Session & context
│   ├── prompts/            # System prompts
│   └── schema.ts           # Database schema
│
├── runtime/                # Sandbox runtime processes
│   ├── entrypoint.ts       # Main startup script
│   ├── browser/            # Browser automation
│   ├── lsp/                # LSP server management
│   └── services/           # Background services
│
├── shared/                 # Shared code (host & sandbox)
│   ├── types.ts            # TypeScript types
│   ├── schemas/            # Zod schemas
│   └── constants.ts        # Paths, limits, defaults
│
└── template/               # E2B template building
    └── build.ts            # Template builder script
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start local Convex dev server |
| `bun deploy` | Deploy to Convex cloud |
| `bun test` | Run unit tests |
| `bun typecheck` | TypeScript type check |
| `bun template:build` | Build full E2B template |
| `bun template:custom` | Build custom layer only |

## License

MIT

## Links

- [E2B Documentation](https://e2b.dev/docs)
- [Convex Documentation](https://docs.convex.dev)
- [Convex Agent SDK](https://docs.convex.dev/agents)
