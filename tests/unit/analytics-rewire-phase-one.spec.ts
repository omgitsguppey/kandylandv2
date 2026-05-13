import { describe, expect, it } from "vitest";

import {
  DUPLICATE_SNAPSHOT_AUTHORITY_RULE,
  RAW_DISPLAY_RISK_COLLECTIONS,
  STALE_GENERATED_REPORT_WINDOW_MS,
  VENDOR_EVIDENCE_ONLY_RULE,
  buildAnalyticsRewirePhaseOneReport,
  validateAnalyticsRewirePhaseOneReport,
} from "../../scripts/agent/analytics-rewire-phase-one";

const REPORT = buildAnalyticsRewirePhaseOneReport({ now: new Date("2026-05-12T12:00:00.000Z") });

describe("analytics rewire phase one inventory", () => {
  it("builds a report with the required top-level contract", () => {
    expect(REPORT.reportKey).toBe("analytics-rewire-phase-one");
    expect(REPORT.generatedAtUtc).toBe("2026-05-12T12:00:00.000Z");
    expect(REPORT.phasesCovered).toEqual(expect.arrayContaining([
      "0. Rewire Inventory Contract",
      "1. Truth-Lane Inventory Implementation",
      "2. Lost Data Discovery",
      "3. Truth Source Selection",
      "8. Snapshot Authority Collapse",
    ]));
    expect(REPORT.summary.laneCount).toBe(REPORT.lanes.length);
    expect(REPORT.summary.issueCount).toBe(REPORT.issues.length);
    expect(REPORT.summary.orphanCandidateCount).toBe(REPORT.orphanCandidates.length);
    expect(validateAnalyticsRewirePhaseOneReport(REPORT)).toEqual([]);
  });

  it("records the duplicate snapshot authority rule", () => {
    expect(DUPLICATE_SNAPSHOT_AUTHORITY_RULE.competingAuthorities).toEqual([
      "analytics_aggregate_stats/realtime_summary",
      "analytics_admin_metric_snapshots",
    ]);
    expect(DUPLICATE_SNAPSHOT_AUTHORITY_RULE.recommendedAuthority).toBe("analytics_admin_metric_snapshots");

    expect(REPORT.duplicateAuthorities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metricOrLane: "admin_analytics_snapshot_authority",
          recommendedAuthority: "analytics_admin_metric_snapshots",
        }),
      ]),
    );
  });

  it("keeps raw realtime listener collections in the display-risk scan set", () => {
    expect(RAW_DISPLAY_RISK_COLLECTIONS).toEqual([
      "analytics_event_facts",
      "analytics_guest_batches",
      "analytics_sessions",
      "analytics_watch_sessions",
      "behavioral_timeline_facts",
    ]);
  });

  it("defines vendor lanes as evidence-only, not product truth", () => {
    expect(VENDOR_EVIDENCE_ONLY_RULE.vendors).toEqual(["GA4", "PostHog", "BigQuery"]);
    expect(VENDOR_EVIDENCE_ONLY_RULE.allowedRoles).toContain("evidence");
    expect(VENDOR_EVIDENCE_ONLY_RULE.forbiddenRole).toContain("product/admin display truth");

    const vendorLanes = REPORT.lanes.filter((lane) => lane.category === "vendor_evidence");
    expect(vendorLanes.length).toBeGreaterThanOrEqual(3);
    expect(vendorLanes.every((lane) => lane.sourceOfTruthStatus === "evidence_only")).toBe(true);
  });

  it("uses a 24 hour generated-report freshness window", () => {
    expect(STALE_GENERATED_REPORT_WINDOW_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("requires every lane to carry a recommended owner", () => {
    expect(REPORT.lanes.length).toBeGreaterThan(0);
    expect(REPORT.lanes.every((lane) => lane.recommendedOwner.length > 0)).toBe(true);
  });

  it("includes orphan candidates with recovery fields", () => {
    expect(REPORT.orphanCandidates.length).toBeGreaterThan(0);
    expect(REPORT.orphanCandidates[0]).toEqual(expect.objectContaining({
      key: expect.any(String),
      writtenPath: expect.any(String),
      writerFiles: expect.any(Array),
      consumerFiles: expect.any(Array),
      validatorFiles: expect.any(Array),
      recoveryValue: expect.any(String),
      recommendedAction: expect.any(String),
    }));
  });
});
