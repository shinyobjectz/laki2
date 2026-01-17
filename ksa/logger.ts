/**
 * Logger KSA - Knowledge, Skills, and Abilities for Semantic Logging
 *
 * Provides clean, user-friendly logging functions that emit structured logs
 * for beautiful UI display using ai-elements components.
 *
 * Usage in agent code:
 * ```typescript
 * import { log, logPlan, logTask, logThinking, logSearch, logSource } from './ksa/logger';
 *
 * // Simple log
 * log.info("Starting analysis...");
 *
 * // Planning
 * logPlan("Research Project", "Gathering information about the topic", [
 *   { title: "Search web", status: "complete" },
 *   { title: "Analyze results", status: "active" },
 *   { title: "Generate report", status: "pending" },
 * ]);
 *
 * // Task completion
 * logTask("Collected 5 data sources", true);
 *
 * // Thinking/reasoning
 * logThinking("Evaluating which sources are most relevant...");
 *
 * // Search results
 * logSearch("Web research", [
 *   { title: "Article 1", url: "https://...", description: "..." },
 * ]);
 *
 * // Sources/citations
 * logSource("Wikipedia", "https://wikipedia.org/...", "Background information");
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export type UILogType =
  | 'plan'      // → Plan component (multi-step execution plan)
  | 'thinking'  // → ChainOfThought step (reasoning)
  | 'task'      // → Queue item (task in progress/done)
  | 'search'    // → ChainOfThoughtSearchResults (search results)
  | 'source'    // → Sources component (reference)
  | 'file'      // → File operation indicator
  | 'text'      // → Generic text log
  | 'tool';     // → Tool execution indicator

export interface PlanStep {
  title: string;
  description?: string;
  status: 'pending' | 'active' | 'complete' | 'error';
}

export interface SearchResult {
  title: string;
  url: string;
  description?: string;
}

export interface StructuredLog {
  type: UILogType;
  label: string;
  status?: 'pending' | 'active' | 'complete' | 'error';
  icon?: string;
  details?: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// Cloud Logging Interface
// ============================================================================

/**
 * Send a structured log to the cloud for real-time UI display.
 * This function is available in the sandbox environment.
 */
async function sendLog(log: StructuredLog): Promise<void> {
  const gatewayUrl = process.env.GATEWAY_URL || process.env.CONVEX_URL;
  const jwt = process.env.SANDBOX_JWT;
  const sessionId = process.env.SESSION_ID;

  if (!gatewayUrl || !jwt || !sessionId) {
    // Fallback to console if cloud not configured
    console.log(`[${log.type}] ${log.label}`);
    return;
  }

  try {
    await fetch(`${gatewayUrl}/agent/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        path: 'agent.workflows.sandboxConvex.appendLogs',
        type: 'mutation',
        args: {
          sessionId,
          logs: [log],
        },
      }),
    }).catch(() => {}); // Fire and forget
  } catch {
    // Ignore errors - don't block execution
    console.log(`[${log.type}] ${log.label}`);
  }
}

// ============================================================================
// Simple Logging API
// ============================================================================

/**
 * Simple log object for basic logging needs.
 */
export const log = {
  /**
   * Log an informational message.
   * @example log.info("Processing started");
   */
  info(message: string): void {
    sendLog({
      type: 'text',
      label: message,
      status: 'complete',
      icon: 'info',
    });
    console.log(`[info] ${message}`);
  },

  /**
   * Log a warning message.
   * @example log.warn("Rate limit approaching");
   */
  warn(message: string): void {
    sendLog({
      type: 'text',
      label: `⚠️ ${message}`,
      status: 'complete',
      icon: 'warning',
    });
    console.warn(`[warn] ${message}`);
  },

  /**
   * Log an error message.
   * @example log.error("Failed to fetch data");
   */
  error(message: string): void {
    sendLog({
      type: 'text',
      label: `❌ ${message}`,
      status: 'error',
      icon: 'error',
    });
    console.error(`[error] ${message}`);
  },

  /**
   * Log a debug message (only shown in verbose mode).
   * @example log.debug("Response payload:", data);
   */
  debug(message: string, data?: unknown): void {
    console.log(`[debug] ${message}`, data);
  },
};

// ============================================================================
// Semantic Logging Functions
// ============================================================================

/**
 * Log an execution plan with steps.
 * Renders as a Plan component in the UI.
 *
 * @example
 * logPlan("Research Task", "Gathering market intelligence", [
 *   { title: "Search competitors", status: "complete" },
 *   { title: "Analyze pricing", status: "active" },
 *   { title: "Generate report", status: "pending" },
 * ]);
 */
export function logPlan(title: string, description: string, steps: PlanStep[]): void {
  sendLog({
    type: 'plan',
    label: title,
    details: description,
    status: steps.some(s => s.status === 'active') ? 'active' : 'complete',
    data: { steps },
  });
  console.log(`[plan] ${title}: ${description}`);
  steps.forEach(s => console.log(`  [${s.status}] ${s.title}`));
}

/**
 * Log a thinking/reasoning step.
 * Renders as a ChainOfThought step in the UI.
 *
 * @example
 * logThinking("Analyzing the data patterns to identify trends...");
 */
export function logThinking(message: string, description?: string): void {
  sendLog({
    type: 'thinking',
    label: message,
    details: description,
    status: 'complete',
    icon: 'lightbulb',
  });
  console.log(`[thinking] ${message}`);
}

/**
 * Log a task as in-progress or completed.
 * Renders as a Queue item in the UI.
 *
 * @example
 * logTask("Fetching user data", false);  // In progress
 * logTask("Fetched 150 records", true);  // Completed
 */
export function logTask(label: string, completed: boolean = false, description?: string): void {
  sendLog({
    type: 'task',
    label,
    details: description,
    status: completed ? 'complete' : 'active',
    icon: completed ? 'check' : 'loader',
  });
  console.log(`[task] ${completed ? '✓' : '○'} ${label}`);
}

/**
 * Log search results.
 * Renders as ChainOfThoughtSearchResults in the UI.
 *
 * @example
 * logSearch("Market research", [
 *   { title: "Industry Report 2024", url: "https://...", description: "..." },
 *   { title: "Competitor Analysis", url: "https://...", description: "..." },
 * ]);
 */
export function logSearch(label: string, results: SearchResult[]): void {
  sendLog({
    type: 'search',
    label: `${label} (${results.length} results)`,
    status: 'complete',
    icon: 'search',
    data: { results },
  });
  console.log(`[search] ${label}: ${results.length} results`);
  results.slice(0, 3).forEach(r => console.log(`  - ${r.title}`));
}

/**
 * Log a source/citation.
 * Renders in the Sources component in the UI.
 *
 * @example
 * logSource("Wikipedia", "https://en.wikipedia.org/...", "Background context");
 */
export function logSource(title: string, url: string, description?: string): void {
  sendLog({
    type: 'source',
    label: title,
    details: description,
    status: 'complete',
    icon: 'link',
    data: { url },
  });
  console.log(`[source] ${title}: ${url}`);
}

/**
 * Log a file operation.
 * Renders with file icon in the UI.
 *
 * @example
 * logFile("read", "/path/to/file.txt", "Reading configuration");
 * logFile("write", "/output/report.pdf", "Generated PDF report");
 */
export function logFile(operation: 'read' | 'write' | 'edit', path: string, label: string): void {
  sendLog({
    type: 'file',
    label,
    status: 'complete',
    icon: operation === 'read' ? 'file-text' : 'file-plus',
    data: { operation, path },
  });
  console.log(`[file:${operation}] ${label} - ${path}`);
}

/**
 * Log a tool/action execution.
 * Renders with tool icon in the UI.
 *
 * @example
 * logTool("browser", "Taking screenshot of dashboard");
 * logTool("api", "Calling external service");
 */
export function logTool(toolName: string, label: string, details?: string): void {
  sendLog({
    type: 'tool',
    label,
    details,
    status: 'complete',
    icon: 'wrench',
    data: { toolName },
  });
  console.log(`[tool:${toolName}] ${label}`);
}

// ============================================================================
// Progress Tracking
// ============================================================================

/**
 * Create a progress tracker for multi-step operations.
 *
 * @example
 * const progress = createProgress("Data Processing", 4);
 * progress.step("Loading data");
 * progress.step("Cleaning data");
 * progress.step("Analyzing patterns");
 * progress.complete("Processing complete");
 */
export function createProgress(title: string, totalSteps: number) {
  let currentStep = 0;
  const steps: PlanStep[] = Array(totalSteps)
    .fill(null)
    .map((_, i) => ({
      title: `Step ${i + 1}`,
      status: 'pending' as const,
    }));

  // Initial plan log
  logPlan(title, `0/${totalSteps} steps complete`, steps);

  return {
    /**
     * Mark the current step as complete and move to the next.
     */
    step(label: string, description?: string): void {
      if (currentStep < totalSteps) {
        steps[currentStep] = {
          title: label,
          description,
          status: 'complete',
        };
        currentStep++;

        // Update next step to active if there is one
        if (currentStep < totalSteps) {
          steps[currentStep].status = 'active';
        }

        logPlan(title, `${currentStep}/${totalSteps} steps complete`, steps);
      }
    },

    /**
     * Mark the progress as complete with a final message.
     */
    complete(message: string): void {
      steps.forEach(s => (s.status = 'complete'));
      logPlan(title, message, steps);
      logTask(message, true);
    },

    /**
     * Mark the progress as failed with an error message.
     */
    fail(error: string): void {
      if (currentStep < totalSteps) {
        steps[currentStep].status = 'error';
      }
      logPlan(title, `Failed: ${error}`, steps);
      log.error(error);
    },
  };
}
