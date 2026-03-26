import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/contracts/**/*.spec.ts", "tests/unit/**/*.spec.ts"],
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
