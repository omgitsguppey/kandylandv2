import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: [
      {
        find: "@",
        replacement: path.join(dirname, "src"),
      },
      {
        find: "@google-cloud/vertexai",
        replacement: path.join(dirname, "tests/support/google-cloud-vertexai.mock.ts"),
      },
      {
        find: "firebase-admin/firestore",
        replacement: path.join(dirname, "tests/support/firebase-admin-firestore.mock.ts"),
      },
      {
        find: "firebase-admin",
        replacement: path.join(dirname, "tests/support/firebase-admin.mock.ts"),
      },
    ],
  },
  test: {
    environment: "node",
    include: [
      "tests/contracts/**/*.spec.ts",
      "tests/contracts/**/*.spec.tsx",
      "tests/unit/**/*.spec.ts",
      "tests/unit/**/*.spec.tsx",
    ],
    alias: {
      "server-only": "node_modules/server-only/empty.js",
    },
    setupFiles: ["tests/setup/deterministic-mocks.ts", "tests/setup/jest-dom.ts"],
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage/contracts",
    },
  },
});
