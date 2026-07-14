import { describe, expect, it } from "vitest";

import {
  buildDebugCockpitBatch12CleanupReport,
  validateDebugCockpitBatch12CleanupReport,
} from "../../scripts/agent/debug-cockpit-batch12-shared";
import { expectNoFailuresOrOnlyNamedIsolation } from "./utils/source-validator-contract";

describe("debug cockpit Batch 12 cleanup lock", () => {
  it("locks current live issue, device, image, content, and GumDrop economy freshness without false source failures", () => {
    const report = buildDebugCockpitBatch12CleanupReport();

    expect(report.debugEvidenceAgeAfter).toBeLessThanOrEqual(72);
    expect(report.precatcherAgeAfter).toBeLessThanOrEqual(72);
    expect(report.deviceUiAgeAfter).toBeLessThanOrEqual(72);
    expect(report.deviceLayoutAgeAfter).toBeLessThanOrEqual(72);
    expect(report.hydrationAgeAfter).toBeLessThanOrEqual(72);
    expect(report.imageLoadingStatusAfter).not.toBe("WAIT");
    expect(report.imageLoadingTimestampStatus).toBe("generatedAt_present");
    expect(report.contentProtectionAgeAfter).toBeLessThanOrEqual(72);
    expect(report.gumdropEconomyAgeAfter).toBeLessThanOrEqual(72);
    expectNoFailuresOrOnlyNamedIsolation({
      failures: validateDebugCockpitBatch12CleanupReport(report),
      expectedIsolationFailures: [/^(?:GumDrop math\/source-of-funds changed|content protection guard weakened)\.$/u],
      allowedIsolationFailures: [
        "GumDrop math/source-of-funds changed.",
        "content protection guard weakened.",
      ],
    });
  });
});
