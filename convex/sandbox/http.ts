/**
 * Sandbox HTTP Endpoints
 *
 * Provides observability endpoints for the E2B sandbox.
 * These run on port 3211 (site port) alongside Convex backend.
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

/**
 * Metrics endpoint - returns sandbox health and resource usage.
 * Used by pool health checks and Claude Code observability.
 *
 * GET /metrics
 *
 * Response:
 * {
 *   status: string,
 *   timestamp: number
 * }
 *
 * Note: Full system metrics (CPU, memory) would require Node.js APIs
 * which aren't available in the Convex V8 runtime. For detailed metrics,
 * use the sandbox's HTTP server or E2B's metrics API instead.
 */
http.route({
  path: "/metrics",
  method: "GET",
  handler: httpAction(async () => {
    // Convex V8 runtime doesn't have access to Node.js APIs like 'os'
    // Return basic metrics that are available
    const metrics = {
      status: "running",
      services: {
        convex: "running",
      },
      timestamp: Date.now(),
    };

    return new Response(JSON.stringify(metrics), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    });
  }),
});

/**
 * Health check endpoint - simple ping for pool management.
 * Used by E2B pool to verify sandbox is responsive.
 *
 * GET /health
 */
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(JSON.stringify({ status: "ok", timestamp: Date.now() }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * Version endpoint - returns SDK version for debugging.
 * Used by pool health checks.
 *
 * GET /version
 *
 * Note: Version is hardcoded since Convex V8 runtime doesn't have
 * access to Node.js fs APIs. Update this when publishing new versions.
 */
http.route({
  path: "/version",
  method: "GET",
  handler: httpAction(async () => {
    // Convex V8 runtime can't read files directly
    // Version is set at build time
    const version = "0.1.66"; // UPDATE THIS ON RELEASE

    return new Response(JSON.stringify({ version, timestamp: Date.now() }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
