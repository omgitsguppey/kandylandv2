import { describe, expect, it } from "vitest";

import {
  buildCodexFrontendMemoryWritebackReport,
  validateCodexFrontendMemoryWritebackReport,
} from "@/lib/frontend-hardening/client-state-ownership";

describe("codex frontend memory writeback", () => {
  it("records the required frontend consolidation memory lesson", () => {
    const report = buildCodexFrontendMemoryWritebackReport({ currentHead: "test-head" });

    expect(report.memorySource).toBe("AGENTS.md");
    expect(report.entriesAdded).toBeGreaterThanOrEqual(1);
    expect(report.mistakePatternsCaptured).toContain("Do not solve frontend parity by adding another wrapper/hook when an existing surface state, telemetry, or role resolver already owns the behavior.");
  });

  it("fails when repo memory lacks the frontend lesson", () => {
    const report = buildCodexFrontendMemoryWritebackReport({ currentHead: "test-head" });
    const validation = validateCodexFrontendMemoryWritebackReport(report);

    expect(validation.failures).toEqual([]);
  });
});
