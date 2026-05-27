import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";

describe("privacy data memory writeback", () => {
  it("records consent nuance, shared delete/export/redaction policy, behavioral privacy class, and drilldown audit rules", () => {
    const memory = [
      readFileSync("AGENTS.md", "utf8"),
      readFileSync("REPO_MEMORY_LEDGER.md", "utf8"),
      readFileSync("agent/index/known-pitfalls.json", "utf8"),
    ].join("\n");

    expect(memory).toContain("check the canonical privacy/data lifecycle policy");
    expect(memory).toContain("Consent denied does not mean");
    expect(memory).toContain("Delete account, data export, support/report issue, and admin debug must all use the same redaction and retention policy");
    expect(memory).toContain("Behavioral/user journey records must have privacy class");
    expect(memory).toContain("Raw drilldown requires explicit admin permission and audit reason");
  });
});
