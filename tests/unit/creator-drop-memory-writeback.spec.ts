import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("creator drop memory writeback", () => {
  it("records creator workflow chain rules in repo memory sources", () => {
    const agents = read("AGENTS.md");
    const ledger = read("REPO_MEMORY_LEDGER.md");
    const pitfalls = read("agent/index/known-pitfalls.json");

    for (const source of [agents, ledger, pitfalls]) {
      expect(source).toContain("inspect the entire workflow chain");
      expect(source).toContain("remain creator-visible but user-hidden until admin approval");
      expect(source).toContain("Every creator workflow must expose creator-facing status and admin-facing status");
      expect(source).toContain("Creator feature 4xx errors need user-readable recovery states");
      expect(source).toContain("Reuse and consolidate instead of adding parallel creator systems");
    }
  });
});
