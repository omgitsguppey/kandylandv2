import { describe, expect, it } from "vitest";

import {
  buildDebugCockpitBatch11CleanupReport,
  validateDebugCockpitBatch11CleanupReport,
} from "../../scripts/agent/debug-cockpit-batch11-shared";

describe("debug cockpit batch11 cleanup report", () => {
  it("records refreshed device, cost, content, and telemetry report freshness", () => {
    const report = buildDebugCockpitBatch11CleanupReport({
      deviceUiAgeBeforeHours: 400,
      deviceUiAgeAfterHours: 0.01,
      deviceLayoutAgeBeforeHours: 400,
      deviceLayoutAgeAfterHours: 0.01,
      contentProtectionAgeBeforeHours: 400,
      contentProtectionAgeAfterHours: 0.01,
      googleCostAgeBeforeHours: 400,
      googleCostAgeAfterHours: 0.01,
      cloudCostAgeBeforeHours: 400,
      cloudCostAgeAfterHours: 0.01,
      telemetryParityAgeBeforeHours: 400,
      telemetryParityAgeAfterHours: 0.01,
      deviceLayoutScoreBefore: 80,
      deviceLayoutScoreAfter: 92,
      deviceLayoutFindingsBefore: 13,
      deviceLayoutFindingsAfter: 6,
      scoreBefore: 79,
      scoreAfter: 79,
    });

    expect(report.compactViewportContractStatus).toBe("mapped_to_device_contract");
    expect(report.walletNavActionStatus).toBe("intentional_nav_action_exception");
    expect(report.refreshedArtifacts).toEqual(expect.arrayContaining([
      "agent/state/device-ui-dry-audit.generated.json",
      "agent/state/device-layout-score.generated.json",
      "agent/state/content-protection-score.generated.json",
      "agent/state/google-cost-bleed.generated.json",
      "agent/state/cloudrun-sql-bigquery-guardrails.generated.json",
      "agent/state/telemetry-parity-score.generated.json",
    ]));
    expect(validateDebugCockpitBatch11CleanupReport(report)).toEqual([]);
  });
});
