import { describe, expect, it } from "vitest";

import {
  buildTestFixtureMemoryWritebackReport,
  validateTestFixtureMemoryWritebackReport,
} from "../../src/lib/test-hardening/test-fixture-memory-writeback";

describe("test fixture memory writeback", () => {
  it("records durable lessons for fixture, mock, validator, and artifact discipline", () => {
    const report = buildTestFixtureMemoryWritebackReport();
    const validation = validateTestFixtureMemoryWritebackReport(report);

    expect(report.memoryEntriesRequired).toBe(5);
    expect(report.memoryEntriesPresent).toBe(5);
    expect(report.mistakePatternsCaptured).toContain("fake DTO/fixture drift");
    expect(report.mistakePatternsCaptured).toContain("mock evidence class");
    expect(validation.ok).toBe(true);
  });
});
