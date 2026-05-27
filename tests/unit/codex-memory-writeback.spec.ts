import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildCodexMemoryWritebackReport,
  validateCodexMemoryWritebackReport,
} from "@/lib/backend-hardening/backend-service-consolidator";

describe("codex memory writeback", () => {
  it("records backend consolidation rules in repo memory sources", () => {
    const report = buildCodexMemoryWritebackReport({ currentHead: "test-head" });
    const agents = readFileSync("AGENTS.md", "utf8");
    const ledger = readFileSync("REPO_MEMORY_LEDGER.md", "utf8");

    expect(report.memoryWriteback.entriesAdded).toBeGreaterThanOrEqual(1);
    expect(report.memoryWriteback.mistakePatternsCaptured).toContain("parallel backend subsystem");
    expect(agents).toContain("Backend Consolidation Rules");
    expect(ledger).toContain("\"domain\": \"backend_consolidation\"");
  });

  it("fails when writeback misses the required anti-expansion lessons", () => {
    const report = buildCodexMemoryWritebackReport({ currentHead: "test-head" });
    const result = validateCodexMemoryWritebackReport(report);

    expect(result.failures).toEqual([]);
  });
});
