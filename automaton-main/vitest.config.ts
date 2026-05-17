import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 30_000,
    include: ["src/__tests__/**/*.test.ts"],
  },
});
