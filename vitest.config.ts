import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: [
      "tests/contracts/**/*.spec.ts",
      "tests/contracts/**/*.spec.tsx",
      "tests/unit/**/*.spec.ts",
      "tests/unit/**/*.spec.tsx",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage/contracts",
    },
    alias: {
      "server-only": "node_modules/server-only/empty.js"
    }
  },
});
