import { describe, expect, it } from "vitest";

import {
  buildConfigInfraMemoryWritebackReport,
  validateConfigInfraMemoryWritebackReport,
} from "../../src/lib/config-hardening/config-infra-memory-writeback";

describe("config infra memory writeback", () => {
  it("requires durable config/deployment lessons in repo memory", () => {
    const report = buildConfigInfraMemoryWritebackReport();
    const validation = validateConfigInfraMemoryWritebackReport(report);

    expect(report.requiredLessons.length).toBeGreaterThanOrEqual(8);
    expect(validation.ok).toBe(true);
  });
});
