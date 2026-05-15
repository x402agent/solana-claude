import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["dist/**", "node_modules/**"],
    typecheck: {
      include: ["tests/**/*.test.ts"],
    },
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "api/**/*.ts"],
      exclude: ["lib/context/**"],
      reporter: ["text", "html", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
    },
  },
});
