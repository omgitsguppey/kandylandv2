import { describe, expect, it } from "vitest";

import {
  REQUIRED_RECOVERY_LANE_KEYS,
  buildLostDataRecoveryDryRunReport,
  validateLostDataRecoveryDryRunReport,
} from "../../scripts/agent/lost-data-recovery-dry-run";

const REPORT = buildLostDataRecoveryDryRunReport({ now: new Date("2026-05-13T12:00:00.000Z") });

describe("lost data recovery dry run", () => {
  it("builds the required top-level report fields", () => {
    expect(REPORT.reportKey).toBe("lost-data-recovery-dry-run");
    expect(REPORT.generatedAtUtc).toBe("2026-05-13T12:00:00.000Z");
    expect(REPORT.phasesCovered).toEqual(expect.arrayContaining([
      "6. Legacy Recovery Mapper",
      "14. Data Retention, Archive, And Cleanup Policy Planning",
      "17. Recovery Surfacing Planning",
    ]));
    expect(REPORT.summary.recoverableLaneCount).toBe(REPORT.recoveryLanes.length);
    expect(validateLostDataRecoveryDryRunReport(REPORT)).toEqual([]);
  });

  it("imports Phase 1 and Phase 2 source report metadata", () => {
    expect(REPORT.sourceReports.phaseOneInventory.path).toBe("agent/state/analytics-rewire-phase-one.generated.json");
    expect(REPORT.sourceReports.phaseTwoIdentityPrivacy.path).toBe("agent/state/identity-privacy-raw-ledger-rewire.generated.json");
    expect(REPORT.sourceReports.phaseOneInventory.laneCount).toBeGreaterThan(0);
    expect(REPORT.sourceReports.phaseTwoIdentityPrivacy.identityLaneCount).toBeGreaterThan(0);
  });

  it("includes the required recovery lanes", () => {
    const laneKeys = REPORT.recoveryLanes.map((lane) => lane.laneKey);

    expect(laneKeys).toEqual(expect.arrayContaining([...REQUIRED_RECOVERY_LANE_KEYS]));
    expect(laneKeys).toEqual(expect.arrayContaining([
      "analytics_identity_links",
      "guest_tracking_indexes",
      "behavioral_timeline_facts",
      "analytics_watch_sessions",
      "purchase_facts",
      "unlock_facts",
      "support_recovery_facts",
      "analytics_legacy_recovered_events",
    ]));
  });

  it("adds surfacing and consent metadata to every recovery lane", () => {
    for (const lane of REPORT.recoveryLanes) {
      expect(lane.consentRequirement).toEqual(expect.any(String));
      expect(lane.canSurfaceInAdminDebug).toEqual(expect.any(Boolean));
      expect(lane.canSurfaceInAdminAnalytics).toEqual(expect.any(Boolean));
      expect(lane.canBackfillLater).toEqual(expect.any(Boolean));
    }
  });

  it("keeps every dry-run backfill stage production-disabled", () => {
    expect(REPORT.dryRunBackfillPlan.map((step) => step.stepKey)).toEqual([
      "stage-a-static-inventory",
      "stage-b-emulator-mapper-validation",
      "stage-c-dry-run-recovery-snapshot",
      "stage-d-admin-debug-surfacing",
      "stage-e-admin-analytics-surfacing",
      "stage-f-production-backfill-approval",
    ]);
    expect(REPORT.dryRunBackfillPlan.every((step) => step.productionAllowedNow === false)).toBe(true);
  });

  it("keeps legacy recovered events Debug-only and needs_review by default", () => {
    const lane = REPORT.recoveryLanes.find((entry) => entry.laneKey === "analytics_legacy_recovered_events");

    expect(lane?.firstSurfaceTarget).toBe("Admin Debug");
    expect(lane?.consentRequirement).toBe("needs_review");
    expect(lane?.canSurfaceInAdminAnalytics).toBe(false);
    expect(lane?.canSurfaceInAdminDebug).toBe(true);
  });

  it("marks purchase and unlock facts as required operational Admin Analytics candidates", () => {
    for (const laneKey of ["purchase_facts", "unlock_facts"]) {
      const lane = REPORT.recoveryLanes.find((entry) => entry.laneKey === laneKey);
      expect(lane?.consentRequirement).toBe("required_operational_only");
      expect(lane?.canSurfaceInAdminAnalytics).toBe(true);
      expect(lane?.canSurfaceInAdminDebug).toBe(true);
    }
  });

  it("keeps vendor evidence out of canonical product truth", () => {
    const exportStatus = REPORT.recoveryLanes.find((entry) => entry.laneKey === "analytics_export_status");

    expect(exportStatus?.sourceType).toBe("vendor_evidence");
    expect(exportStatus?.canSurfaceInAdminAnalytics).toBe(false);
    expect(exportStatus?.recommendedAction).toContain("evidence only");
  });

  it("includes legacy field mappings for known recovery risks", () => {
    expect(REPORT.legacyFieldMappings.map((mapping) => mapping.mappingKey)).toEqual(expect.arrayContaining([
      "legacy-page-duration",
      "legacy-guest-session-ids",
      "legacy-event-name",
      "ga-current-day",
      "realtime-summary-fallback",
    ]));
  });
});

