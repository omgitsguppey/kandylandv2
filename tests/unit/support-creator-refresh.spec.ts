import { describe, expect, it } from "vitest";

import {
  buildSupportCreatorRefreshReport,
  validateSupportCreatorRefreshReport,
} from "../../scripts/agent/debug-cockpit-batch13-shared";

describe("Batch 13 support and creator refresh", () => {
  it("keeps support and creator lanes current or explicitly reviewed", () => {
    const report = buildSupportCreatorRefreshReport();

    expect(report.supportPolicyStatus).toBe("pass_current");
    expect(report.supportRecoveryStatus).not.toBe("unknown");
    expect(report.creatorLaneStatus).toMatch(/review_current|pass_current/);
    expect(report.creatorLaneLegacyStatus).not.toBe("unknown");
    expect(report.missingScriptsTreatedAsPass).toBe(false);
    expect(validateSupportCreatorRefreshReport(report)).toEqual([]);
  });
});
