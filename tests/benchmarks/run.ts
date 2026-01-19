#!/usr/bin/env bun
/**
 * Lakitu Benchmark Runner
 *
 * Usage:
 *   bun tests/benchmarks/run.ts [--url <convex-url>] [--suite <suite-name>]
 *
 * Examples:
 *   bun tests/benchmarks/run.ts
 *   bun tests/benchmarks/run.ts --suite code
 *   bun tests/benchmarks/run.ts --url https://your-convex.convex.cloud
 */

import { runAllBenchmarks, BenchmarkRunner, allSuites } from "./index";

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let convexUrl = process.env.CONVEX_URL || "https://earnest-shrimp-308.convex.cloud";
  let suiteName: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--url" && args[i + 1]) {
      convexUrl = args[i + 1];
      i++;
    } else if (args[i] === "--suite" && args[i + 1]) {
      suiteName = args[i + 1];
      i++;
    } else if (args[i] === "--help") {
      console.log(`
Lakitu Benchmark Runner

Usage:
  bun tests/benchmarks/run.ts [options]

Options:
  --url <url>      Convex deployment URL (default: env CONVEX_URL)
  --suite <name>   Run specific suite: code, file, search, reasoning, recovery
  --help           Show this help

Suites:
  code       Code generation (HumanEval-style)
  file       File operations (read/write/edit)
  search     Web search and retrieval
  reasoning  Multi-step reasoning (SWE-bench style)
  recovery   Error recovery
`);
      process.exit(0);
    }
  }

  console.log(`\n🍄 Lakitu Benchmark Runner\n`);
  console.log(`Convex URL: ${convexUrl}`);

  if (suiteName) {
    // Run specific suite
    const suite = allSuites.find(
      (s) => s.category === suiteName || s.name.toLowerCase().includes(suiteName.toLowerCase())
    );

    if (!suite) {
      console.error(`Suite not found: ${suiteName}`);
      console.error(`Available: ${allSuites.map((s) => s.category).join(", ")}`);
      process.exit(1);
    }

    const runner = new BenchmarkRunner(convexUrl);
    await runner.runSuite(suite);
    runner.printSummary();
  } else {
    // Run all suites
    await runAllBenchmarks(convexUrl);
  }
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
