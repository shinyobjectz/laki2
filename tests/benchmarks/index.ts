/**
 * Lakitu Agent Framework Benchmarks
 *
 * Comprehensive benchmarking suite to evaluate agent capabilities against
 * standard benchmarks and real-world tasks.
 *
 * Categories:
 * - Code Generation (HumanEval-style)
 * - File Operations (read/write/edit accuracy)
 * - Web Search (information retrieval)
 * - Multi-step Reasoning (SWE-bench style)
 * - Error Recovery
 * - Latency & Efficiency
 */

import { ConvexClient } from "convex/browser";

// ============================================================================
// Types
// ============================================================================

export interface BenchmarkResult {
  name: string;
  category: string;
  passed: boolean;
  duration: number; // ms
  error?: string;
  output?: string;
  metrics?: {
    tokensUsed?: number;
    stepsExecuted?: number;
    codeExecutions?: number;
  };
}

export interface BenchmarkSuite {
  name: string;
  category: string;
  description: string;
  tasks: BenchmarkTask[];
}

export interface BenchmarkTask {
  name: string;
  prompt: string;
  expectedBehavior: string;
  validator: (result: SessionResult) => boolean;
  timeout?: number; // ms
}

export interface SessionResult {
  success: boolean;
  response?: string;
  error?: string;
  logs?: string[];
  artifacts?: any[];
  duration: number;
  codeExecutions?: Array<{
    code: string;
    output: string;
    success: boolean;
  }>;
}

// ============================================================================
// Benchmark Runner
// ============================================================================

export class BenchmarkRunner {
  private client: ConvexClient;
  private userId: string;
  private results: BenchmarkResult[] = [];

  constructor(convexUrl: string, userId = "benchmark-user") {
    this.client = new ConvexClient(convexUrl);
    this.userId = userId;
  }

  async runSuite(suite: BenchmarkSuite): Promise<BenchmarkResult[]> {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`SUITE: ${suite.name}`);
    console.log(`Category: ${suite.category}`);
    console.log(`Tasks: ${suite.tasks.length}`);
    console.log(`${"=".repeat(60)}\n`);

    const suiteResults: BenchmarkResult[] = [];

    for (const task of suite.tasks) {
      const result = await this.runTask(task, suite.category);
      suiteResults.push(result);
      this.results.push(result);
      this.printResult(result);
    }

    return suiteResults;
  }

  async runTask(task: BenchmarkTask, category: string): Promise<BenchmarkResult> {
    const start = Date.now();
    const timeout = task.timeout || 120_000; // 2 min default

    try {
      // Start agent session
      const sessionResult = await this.executeSession(task.prompt, timeout);

      const duration = Date.now() - start;
      const passed = task.validator(sessionResult);

      return {
        name: task.name,
        category,
        passed,
        duration,
        output: sessionResult.response,
        error: sessionResult.error,
        metrics: {
          codeExecutions: sessionResult.codeExecutions?.length || 0,
        },
      };
    } catch (error) {
      return {
        name: task.name,
        category,
        passed: false,
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async executeSession(prompt: string, timeout: number): Promise<SessionResult> {
    const start = Date.now();

    try {
      // Call the Lakitu startSession action
      const result = await Promise.race([
        this.client.action("lakitu:startSession" as any, {
          projectId: `benchmark-${Date.now()}`,
          prompt,
          config: {},
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeout)
        ),
      ]);

      return {
        success: (result as any).success,
        response: (result as any).response,
        error: (result as any).error,
        logs: (result as any).logs,
        artifacts: (result as any).artifacts,
        duration: Date.now() - start,
        codeExecutions: (result as any).codeExecutions,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - start,
      };
    }
  }

  private printResult(result: BenchmarkResult): void {
    const status = result.passed ? "✓ PASS" : "✗ FAIL";
    const color = result.passed ? "\x1b[32m" : "\x1b[31m";
    console.log(
      `${color}${status}\x1b[0m ${result.name} (${result.duration}ms)` +
        (result.error ? ` - ${result.error.slice(0, 100)}` : "")
    );
  }

  getSummary(): {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    avgDuration: number;
    byCategory: Record<string, { passed: number; total: number }>;
  } {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.passed).length;
    const failed = total - passed;
    const avgDuration =
      this.results.reduce((sum, r) => sum + r.duration, 0) / total;

    const byCategory: Record<string, { passed: number; total: number }> = {};
    for (const r of this.results) {
      if (!byCategory[r.category]) {
        byCategory[r.category] = { passed: 0, total: 0 };
      }
      byCategory[r.category].total++;
      if (r.passed) byCategory[r.category].passed++;
    }

    return {
      total,
      passed,
      failed,
      passRate: (passed / total) * 100,
      avgDuration,
      byCategory,
    };
  }

  printSummary(): void {
    const summary = this.getSummary();
    console.log(`\n${"=".repeat(60)}`);
    console.log("BENCHMARK SUMMARY");
    console.log(`${"=".repeat(60)}`);
    console.log(`Total: ${summary.total}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Pass Rate: ${summary.passRate.toFixed(1)}%`);
    console.log(`Avg Duration: ${summary.avgDuration.toFixed(0)}ms`);
    console.log("\nBy Category:");
    for (const [cat, stats] of Object.entries(summary.byCategory)) {
      const rate = ((stats.passed / stats.total) * 100).toFixed(1);
      console.log(`  ${cat}: ${stats.passed}/${stats.total} (${rate}%)`);
    }
    console.log(`${"=".repeat(60)}\n`);
  }
}

// ============================================================================
// Benchmark Suites
// ============================================================================

/**
 * Code Generation Benchmarks (HumanEval-style)
 */
export const codeGenerationSuite: BenchmarkSuite = {
  name: "Code Generation",
  category: "code",
  description: "Tests ability to generate correct code from descriptions",
  tasks: [
    {
      name: "fibonacci",
      prompt: "Write a TypeScript function that returns the nth Fibonacci number. Test it with n=10 and print the result.",
      expectedBehavior: "Should output 55",
      validator: (r) => r.success && r.response?.includes("55") || r.codeExecutions?.some(e => e.output.includes("55")) || false,
    },
    {
      name: "palindrome",
      prompt: "Write a function to check if a string is a palindrome. Test with 'racecar' and 'hello', print results.",
      expectedBehavior: "Should identify racecar as palindrome, hello as not",
      validator: (r) => r.success && (r.response?.toLowerCase().includes("true") && r.response?.toLowerCase().includes("false")) || false,
    },
    {
      name: "array_sum",
      prompt: "Write a function that sums all numbers in an array. Test with [1,2,3,4,5] and print the result.",
      expectedBehavior: "Should output 15",
      validator: (r) => r.success && (r.response?.includes("15") || r.codeExecutions?.some(e => e.output.includes("15"))) || false,
    },
    {
      name: "factorial",
      prompt: "Write a recursive factorial function. Calculate factorial(7) and print it.",
      expectedBehavior: "Should output 5040",
      validator: (r) => r.success && (r.response?.includes("5040") || r.codeExecutions?.some(e => e.output.includes("5040"))) || false,
    },
    {
      name: "prime_check",
      prompt: "Write a function to check if a number is prime. Test with 17 and 18, print results.",
      expectedBehavior: "Should identify 17 as prime, 18 as not",
      validator: (r) => r.success || false,
    },
  ],
};

/**
 * File Operations Benchmarks
 */
export const fileOperationsSuite: BenchmarkSuite = {
  name: "File Operations",
  category: "file",
  description: "Tests file read, write, and edit capabilities",
  tasks: [
    {
      name: "write_and_read",
      prompt: "Create a file called test.txt with the content 'Hello Benchmark'. Then read it back and confirm the contents.",
      expectedBehavior: "Should write and read back correctly",
      validator: (r) => r.success && (r.response?.includes("Hello Benchmark") || r.codeExecutions?.some(e => e.output.includes("Hello Benchmark"))) || false,
    },
    {
      name: "edit_file",
      prompt: "Create a file config.json with {\"version\": 1}. Then edit it to change version to 2. Read and confirm.",
      expectedBehavior: "Should edit the version to 2",
      validator: (r) => r.success && (r.response?.includes("2") || r.codeExecutions?.some(e => e.output.includes('"version": 2') || e.output.includes('"version":2'))) || false,
    },
    {
      name: "list_directory",
      prompt: "List the contents of the current working directory and report how many files/folders exist.",
      expectedBehavior: "Should list directory contents",
      validator: (r) => r.success || false,
    },
  ],
};

/**
 * Web Search Benchmarks
 */
export const webSearchSuite: BenchmarkSuite = {
  name: "Web Search",
  category: "search",
  description: "Tests web search and information retrieval",
  tasks: [
    {
      name: "factual_search",
      prompt: "Search the web for 'TypeScript release date' and tell me when TypeScript was first released.",
      expectedBehavior: "Should find TypeScript was released in 2012",
      validator: (r) => r.success && (r.response?.includes("2012") || r.response?.includes("October")) || false,
      timeout: 60_000,
    },
    {
      name: "current_info",
      prompt: "Search for 'Convex database' and summarize what it is in one sentence.",
      expectedBehavior: "Should describe Convex as a backend/database platform",
      validator: (r) => r.success && (r.response?.toLowerCase().includes("backend") || r.response?.toLowerCase().includes("database") || r.response?.toLowerCase().includes("real-time")) || false,
      timeout: 60_000,
    },
  ],
};

/**
 * Multi-step Reasoning Benchmarks (SWE-bench style)
 */
export const multiStepSuite: BenchmarkSuite = {
  name: "Multi-step Reasoning",
  category: "reasoning",
  description: "Tests ability to break down and execute complex tasks",
  tasks: [
    {
      name: "create_project_structure",
      prompt: "Create a simple project structure with: 1) src/index.ts that exports a greet function, 2) src/utils.ts with a helper function, 3) package.json with name 'test-project'. List the files when done.",
      expectedBehavior: "Should create 3 files with correct structure",
      validator: (r) => r.success && (r.codeExecutions?.length || 0) >= 3 || false,
      timeout: 90_000,
    },
    {
      name: "debug_code",
      prompt: `I have this buggy code that should sum numbers but always returns 0:
function sum(arr) {
  let total = 0;
  for (let i = 0; i <= arr.length; i++) {
    total = arr[i];
  }
  return total;
}
Find and fix the bugs, then test with [1,2,3,4,5].`,
      expectedBehavior: "Should fix the bugs (= instead of +=, <= instead of <) and output 15",
      validator: (r) => r.success && (r.response?.includes("15") || r.codeExecutions?.some(e => e.output.includes("15"))) || false,
    },
  ],
};

/**
 * Error Recovery Benchmarks
 */
export const errorRecoverySuite: BenchmarkSuite = {
  name: "Error Recovery",
  category: "recovery",
  description: "Tests ability to recover from errors and retry",
  tasks: [
    {
      name: "syntax_error_recovery",
      prompt: "Execute this code and fix any errors: console.log('hello world'",
      expectedBehavior: "Should recognize the missing parenthesis and fix it",
      validator: (r) => r.success && (r.response?.toLowerCase().includes("hello") || r.codeExecutions?.some(e => e.output.toLowerCase().includes("hello"))) || false,
    },
    {
      name: "missing_file_handling",
      prompt: "Try to read a file called 'nonexistent-file-12345.txt'. If it doesn't exist, create it with 'File created' content and read it again.",
      expectedBehavior: "Should handle missing file gracefully and create it",
      validator: (r) => r.success && (r.response?.includes("created") || r.codeExecutions?.some(e => e.output.includes("File created"))) || false,
    },
  ],
};

/**
 * All benchmark suites
 */
export const allSuites: BenchmarkSuite[] = [
  codeGenerationSuite,
  fileOperationsSuite,
  webSearchSuite,
  multiStepSuite,
  errorRecoverySuite,
];

// ============================================================================
// CLI Runner
// ============================================================================

export async function runAllBenchmarks(convexUrl: string): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("LAKITU AGENT FRAMEWORK BENCHMARKS");
  console.log("=".repeat(60));
  console.log(`Target: ${convexUrl}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log("=".repeat(60) + "\n");

  const runner = new BenchmarkRunner(convexUrl);

  for (const suite of allSuites) {
    await runner.runSuite(suite);
  }

  runner.printSummary();
}

// Default export for CLI usage
export default { runAllBenchmarks, BenchmarkRunner, allSuites };
