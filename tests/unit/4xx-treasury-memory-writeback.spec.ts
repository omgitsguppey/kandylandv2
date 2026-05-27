import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";

describe("4xx treasury memory writeback", () => {
  it("records 4xx and Treasury consolidation lessons in repo memory", () => {
    const memory = [
      readFileSync("AGENTS.md", "utf8"),
      readFileSync("REPO_MEMORY_LEDGER.md", "utf8"),
      readFileSync("agent/index/known-pitfalls.json", "utf8"),
    ].join("\n");

    expect(memory).toContain("Classify 4xx errors before fixing them.");
    expect(memory).toContain("Never let 4xx diagnostics create retry storms");
    expect(memory).toContain("check the Treasury owner map");
    expect(memory).toContain("Treasury reports must be compact, redacted, reconcilable, and confidence-labeled");
  });
});
