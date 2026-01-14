import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    // Convex test requires this
    server: {
      deps: {
        inline: ["convex-test"],
      },
    },
  },
});
