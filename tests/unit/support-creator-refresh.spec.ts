import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildSupportCreatorRefreshReport,
  validateSupportCreatorRefreshReport,
} from "../../scripts/agent/debug-cockpit-batch13-shared";
import { expectNoFailuresOrOnlyNamedIsolation } from "./utils/source-validator-contract";

describe("Batch 13 support and creator refresh", () => {
  it("keeps support and creator lanes current or explicitly reviewed", () => {
    const report = buildSupportCreatorRefreshReport();
    const supportPolicy = JSON.parse(
      readFileSync("agent/state/support-policy-surface-cleanup.generated.json", "utf8"),
    ) as {
      status?: string;
      checks?: Record<string, boolean>;
      validationFailures?: unknown[];
    };

    if (supportPolicy.status === "pass") {
      expect(report.supportPolicyStatus).toBe("pass_current");
    } else {
      expect(report.supportPolicyStatus).toBe("review");
      expect(supportPolicy.validationFailures?.length ?? 0).toBeGreaterThan(0);
      expect(Object.entries(supportPolicy.checks ?? {}).filter(([, value]) => value === false).map(([key]) => key)).toEqual([
        "protectedSurfacesUntouched",
      ]);
      expectNoFailuresOrOnlyNamedIsolation({
        failures: supportPolicy.validationFailures ?? [],
        expectedIsolationFailures: ["protectedSurfacesUntouched failed."],
      });
    }
    expect(report.supportRecoveryStatus).not.toBe("unknown");
    expect(report.creatorLaneStatus).toMatch(/review_current|pass_current/);
    expect(report.creatorLaneLegacyStatus).not.toBe("unknown");
    expect(report.missingScriptsTreatedAsPass).toBe(false);
    expectNoFailuresOrOnlyNamedIsolation({
      failures: validateSupportCreatorRefreshReport(report),
      expectedIsolationFailures: ["support policy surface is not current pass."],
    });
  });
});
