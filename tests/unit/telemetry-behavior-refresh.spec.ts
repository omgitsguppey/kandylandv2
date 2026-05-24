import { describe, expect, it } from "vitest";

import {
  buildTelemetryBehaviorRefreshReport,
  validateTelemetryBehaviorRefreshReport,
} from "../../scripts/agent/debug-cockpit-batch13-shared";

describe("Batch 13 telemetry and behavior refresh", () => {
  it("refreshes source artifacts without promoting external analytics archive evidence", () => {
    const report = buildTelemetryBehaviorRefreshReport();

    expect(report.telemetryParityAgeAfter).toBeLessThanOrEqual(72);
    expect(report.privacyBehaviorLegacyHeadStatus).toBe("current");
    expect(report.monolithOrphanHeadStatus).toBe("current_warning");
    expect(report.eventCatalogStatusAfter).toBe("current");
    expect(report.externalAnalyticsArchiveStatus).toBe("archive_only_external_evidence");
    expect(report.legacyRecoveryMutatesProduction).toBe(false);
    expect(validateTelemetryBehaviorRefreshReport(report)).toEqual([]);
  });
});
