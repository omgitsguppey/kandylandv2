import { describe, expect, it } from "vitest";

import {
  buildCiReleaseDisciplineReport,
  validateCiReleaseDisciplineReport,
} from "../../src/lib/config-hardening/ci-release-discipline";

describe("ci release discipline", () => {
  it("keeps deploy/provider risk out of normal validation lanes", () => {
    const report = buildCiReleaseDisciplineReport();
    const validation = validateCiReleaseDisciplineReport(report);

    expect(report.workflows.length).toBeGreaterThan(0);
    expect(report.workflows.some((workflow) => workflow.file === ".github/workflows/ci.yml")).toBe(true);
    expect(report.releaseNotesFreshnessOwner).toBe("check:release-notes");
    expect(validation.ok).toBe(true);
  });
});
