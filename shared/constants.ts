/**
 * Shared Constants - Paths, limits, and defaults
 *
 * Configuration values used across the sandbox agent.
 */

// ============================================
// Paths
// ============================================

export const PATHS = {
  // Root directories
  WORKSPACE: "/home/user/workspace",
  ARTIFACTS: "/home/user/artifacts",
  CONVEX_DATA: "/home/user/.convex",
  SANDBOX_AGENT: "/home/user/sandbox-agent",

  // Binary locations
  BUN: "/home/user/.bun/bin/bun",
  CONVEX_BACKEND: "/usr/local/bin/convex-backend",
  AGENT_BROWSER: "/usr/local/bin/agent-browser",

  // LSP binaries
  TYPESCRIPT_LSP: "typescript-language-server",
  PYTHON_LSP: "pylsp",
  RUST_LSP: "rust-analyzer",
} as const;

// ============================================
// Network
// ============================================

export const NETWORK = {
  // Convex backend
  CONVEX_PORT: 3210,
  CONVEX_SITE_PORT: 3211,
  CONVEX_URL: "http://localhost:3210",

  // Health check endpoints
  HEALTH_CHECK_INTERVAL_MS: 10000,
  HEALTH_CHECK_TIMEOUT_MS: 5000,
} as const;

// ============================================
// Limits
// ============================================

export const LIMITS = {
  // File operations
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_EDIT_SIZE_BYTES: 1 * 1024 * 1024,  // 1MB
  MAX_GLOB_RESULTS: 1000,
  MAX_GREP_MATCHES: 500,

  // Output truncation
  MAX_STDOUT_LENGTH: 50000,
  MAX_STDERR_LENGTH: 50000,
  MAX_DIFF_LENGTH: 100000,

  // Timeouts
  DEFAULT_COMMAND_TIMEOUT_MS: 120000,    // 2 minutes
  MAX_COMMAND_TIMEOUT_MS: 600000,        // 10 minutes
  LSP_REQUEST_TIMEOUT_MS: 30000,         // 30 seconds
  BROWSER_ACTION_TIMEOUT_MS: 30000,      // 30 seconds

  // Checkpointing
  MAX_CHECKPOINT_MESSAGE_HISTORY: 50,
  MAX_CHECKPOINT_FILE_STATE: 1000,

  // Beads
  MAX_BEADS_PER_QUERY: 100,
  MAX_BEAD_TITLE_LENGTH: 200,
  MAX_BEAD_DESCRIPTION_LENGTH: 10000,

  // Sync queue
  MAX_SYNC_ATTEMPTS: 3,
  SYNC_RETRY_DELAY_MS: 5000,
} as const;

// ============================================
// Defaults
// ============================================

export const DEFAULTS = {
  // Beads
  BEAD_PRIORITY: 2, // Medium
  BEAD_TYPE: "task",

  // Checkpoints
  CHECKPOINT_CLEANUP_DAYS: 7,

  // Context
  CONTEXT_CACHE_TTL_MS: 3600000, // 1 hour

  // Verification
  TEST_COMMAND: "bun test",
  LINT_COMMAND: "bun run lint",
  TYPECHECK_COMMAND: "bunx tsc --noEmit",

  // LSP
  DEFAULT_LANGUAGE: "typescript",

  // Browser
  BROWSER_VIEWPORT_WIDTH: 1280,
  BROWSER_VIEWPORT_HEIGHT: 720,
} as const;

// ============================================
// File Extensions
// ============================================

export const FILE_EXTENSIONS = {
  TYPESCRIPT: [".ts", ".tsx", ".mts", ".cts"],
  JAVASCRIPT: [".js", ".jsx", ".mjs", ".cjs"],
  PYTHON: [".py", ".pyi"],
  RUST: [".rs"],
  JSON: [".json", ".jsonc"],
  YAML: [".yaml", ".yml"],
  MARKDOWN: [".md", ".mdx"],
  HTML: [".html", ".htm"],
  CSS: [".css", ".scss", ".sass", ".less"],
  CONFIG: [".toml", ".ini", ".cfg", ".conf"],
} as const;

// Helper to get language from file path
export function getLanguageFromPath(path: string): "typescript" | "python" | "rust" | null {
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();

  if (FILE_EXTENSIONS.TYPESCRIPT.includes(ext as any) ||
      FILE_EXTENSIONS.JAVASCRIPT.includes(ext as any)) {
    return "typescript";
  }
  if (FILE_EXTENSIONS.PYTHON.includes(ext as any)) {
    return "python";
  }
  if (FILE_EXTENSIONS.RUST.includes(ext as any)) {
    return "rust";
  }

  return null;
}

// ============================================
// Error Codes
// ============================================

export const ERROR_CODES = {
  // File operations
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  EDIT_MISMATCH: "EDIT_MISMATCH",

  // Command execution
  COMMAND_TIMEOUT: "COMMAND_TIMEOUT",
  COMMAND_FAILED: "COMMAND_FAILED",
  DANGEROUS_COMMAND: "DANGEROUS_COMMAND",

  // LSP
  LSP_NOT_RUNNING: "LSP_NOT_RUNNING",
  LSP_REQUEST_FAILED: "LSP_REQUEST_FAILED",

  // Browser
  BROWSER_NOT_READY: "BROWSER_NOT_READY",
  BROWSER_NAVIGATION_FAILED: "BROWSER_NAVIGATION_FAILED",

  // Agent
  THREAD_NOT_FOUND: "THREAD_NOT_FOUND",
  CHECKPOINT_NOT_FOUND: "CHECKPOINT_NOT_FOUND",
  SUBAGENT_FAILED: "SUBAGENT_FAILED",
} as const;
