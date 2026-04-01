import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["tests/firebase/**/*.spec.ts"],
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
