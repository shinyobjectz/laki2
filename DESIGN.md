# Sandbox Agent - Plugin System Design

## Overview

The sandbox-agent supports custom plugins, tools, and skills that extend the agent's capabilities. All external API calls are routed through the cloud Convex backend for security and rate limiting.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Cloud Convex Backend                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Plugin Registry (convex/features/plugins/)          │   │
│  │  - Store plugin definitions                          │   │
│  │  - Manage enabled/disabled state                     │   │
│  │  - Custom tools + custom skills                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Gateway (convex/gateway.ts + http.ts /agent/call)  │   │
│  │  - JWT verification                                  │   │
│  │  - Static whitelist (built-in tools)               │   │
│  │  - Dynamic whitelist (user plugins + custom tools) │   │
│  │  - Route to services                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Services (convex/services/)                          │   │
│  │  - External API wrappers                             │   │
│  │  - Rate limiting                                     │   │
│  │  - Cost tracking                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP + JWT
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ E2B Sandbox (sandbox-agent)                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Tool Runtime                                         │   │
│  │  - Load tools from registry                          │   │
│  │  - Execute tool logic                                │   │
│  │  - Call gateway for external APIs                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ convex-local-backend                                 │   │
│  │  - Beads (task tracking)                             │   │
│  │  - File state                                        │   │
│  │  - Checkpoints                                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Schema (Implemented)

### Custom Tools Table

Flat structure compatible with existing `crudTools.ts`:

```typescript
// convex/schema/plugins.ts
customTools: defineTable({
  toolId: v.string(),           // Unique identifier
  name: v.string(),
  description: v.string(),
  category: v.union(...),       // core, research, content, workflow, integration
  exports: v.array(v.object({   // Functions this tool provides
    name: v.string(),
    description: v.string(),
  })),
  implementation: v.string(),   // JavaScript code
  servicePath: v.optional(v.string()),  // Gateway service path
  configSchema: v.optional(v.any()),
  isBuiltIn: v.boolean(),       // Always false for custom
  userId: v.optional(v.string()),
  orgId: v.optional(v.string()),
  vendorId: v.optional(v.string()),
  enabled: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_org", ["orgId"])
  .index("by_toolId", ["toolId"]);
```

### Custom Skills Table

```typescript
customSkills: defineTable({
  skillId: v.string(),          // Unique identifier
  name: v.string(),
  description: v.string(),
  icon: v.optional(v.string()),
  category: v.union(...),       // research, coding, writing, analysis, automation, custom
  tools: v.array(v.string()),   // Tool IDs included in this skill
  prompt: v.string(),           // Agent guidance prompt
  configSchema: v.optional(v.any()),
  userId: v.optional(v.string()),
  orgId: v.optional(v.string()),
  enabled: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_org", ["orgId"])
  .index("by_skillId", ["skillId"]);
```

### Plugins Table (for bundled tools + skills)

```typescript
plugins: defineTable({
  pluginId: v.string(),
  name: v.string(),
  version: v.string(),
  description: v.string(),
  author: v.string(),
  icon: v.optional(v.string()),
  homepage: v.optional(v.string()),
  tools: v.array(toolDefinitionValidator),
  skills: v.array(skillDefinitionValidator),
  requiredServices: v.array(v.string()),
  status: v.union("active", "disabled", "pending_review", "deprecated"),
  visibility: v.union("public", "private", "organization"),
  ownerId: v.optional(v.string()),
  orgId: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  category: v.optional(v.string()),
  installCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_pluginId", ["pluginId"])
  .index("by_status", ["status"])
  .index("by_visibility", ["visibility"])
  .index("by_author", ["author"])
  .index("by_owner", ["ownerId"])
  .index("by_org", ["orgId"]);
```

### Plugin Installations

```typescript
pluginInstalls: defineTable({
  userId: v.string(),
  pluginId: v.id("plugins"),
  config: v.optional(v.any()),
  enabled: v.boolean(),
  installedAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_plugin", ["pluginId"])
  .index("by_user_plugin", ["userId", "pluginId"]);
```

## Gateway Integration (Implemented)

The gateway (`convex/gateway.ts`) enforces three levels of whitelisting:

1. **Static whitelist**: Built-in tools from `@agent/metadata`
2. **Session config**: Per-session allowed services
3. **Plugin whitelist**: User's installed plugins + custom tools (via `getWhitelistedServices`)

```typescript
// convex/gateway.ts - whitelist check
if (!isWhitelisted(path)) {
  const session = await ctx.runQuery(...);
  const allowedServices = session?.config?.allowedServices || [];

  let allowed = allowedServices.includes(path);

  // Check user's plugin-based whitelist
  if (!allowed && session?.userId) {
    const userWhitelist = await ctx.runQuery(
      internal.features.plugins.registry.getWhitelistedServices,
      { userId: session.userId }
    );
    allowed = userWhitelist.includes(path);
  }

  if (!allowed) {
    return errorResponse(`Forbidden: ${path}`, 403);
  }
}
```

## Registry API (Implemented)

### Plugin Operations
- `createPlugin` - Create a new plugin
- `updatePlugin` - Update plugin definition
- `getPlugin` - Get plugin by ID
- `getPluginByPluginId` - Get plugin by string ID
- `listPlugins` - List plugins with filters

### Installation
- `installPlugin` - Install plugin for user
- `uninstallPlugin` - Remove plugin installation
- `getInstalledPlugins` - Get user's installed plugins

### Custom Tools/Skills
- `createCustomTool` - Create standalone tool
- `getCustomTools` - Get user's custom tools
- `createCustomSkill` - Create standalone skill
- `getCustomSkills` - Get user's custom skills

### Internal (Gateway)
- `getWhitelistedServices` - Get all service paths for whitelist
- `getSessionToolsAndSkills` - Get tools/skills for sandbox session

## Tool Categories

| Category | Description | Examples |
|----------|-------------|----------|
| `core` | Core functionality | built-in tools |
| `research` | Research & data gathering | web search, scraping |
| `content` | Content creation | copywriting, docs |
| `workflow` | Workflow automation | triggers, integrations |
| `integration` | External integrations | APIs, services |

## Skill Categories

| Category | Description | Examples |
|----------|-------------|----------|
| `research` | Information gathering | Web Research, News |
| `coding` | Software development | Code Analysis, Testing |
| `writing` | Content creation | Copywriting, Docs |
| `analysis` | Data analysis | Firmography, SEO |
| `automation` | Task automation | Workflows, Triggers |
| `custom` | User-defined | - |

## Implementation Status

### Phase 1: Core Infrastructure ✅
- [x] Plugin schema in main Convex backend
- [x] Plugin registry CRUD operations
- [x] Gateway whitelist from plugin definitions
- [ ] Sandbox plugin cache (optional, for performance)

### Phase 2: Built-in Plugins
- [ ] Port existing tools to plugin format
- [ ] Create default skill bundles
- [ ] Add plugin versioning

### Phase 3: Custom Plugins
- [ ] Plugin marketplace UI
- [ ] Custom plugin upload/validation
- [ ] Plugin configuration UI

### Phase 4: Advanced Features
- [ ] Plugin dependencies
- [ ] Plugin sharing/export
- [ ] Plugin analytics
