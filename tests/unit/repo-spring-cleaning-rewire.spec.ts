import { describe, expect, it } from "vitest";

import {
  buildRepoSpringCleaningRewireReport,
  validateRepoSpringCleaningRewireReport,
} from "../../scripts/agent/validate-repo-spring-cleaning-rewire";

const REPORT = buildRepoSpringCleaningRewireReport({
  now: new Date("2026-05-14T12:00:00.000Z"),
});

describe("repo spring cleaning rewire inventory", () => {
  it("builds the required top-level report fields", () => {
    expect(REPORT.reportKey).toBe("repo-spring-cleaning-rewire");
    expect(REPORT.generatedAtUtc).toBe("2026-05-14T12:00:00.000Z");
    expect(REPORT.currentHead).toEqual(expect.any(String));
    expect(REPORT.generatedReportInventory.length).toBeGreaterThan(0);
    expect(validateRepoSpringCleaningRewireReport(REPORT)).toEqual([]);
  });

  it("inventories generated reports with owner and consumer metadata", () => {
    const publicBetaScore = REPORT.generatedReportInventory.find((item) =>
      item.path === "agent/state/public-beta-score.generated.json");

    expect(publicBetaScore).toBeDefined();
    expect(publicBetaScore?.usageEvidence.length).toBeGreaterThan(0);
    expect(typeof publicBetaScore?.consumedByScore).toBe("boolean");
    expect(typeof publicBetaScore?.consumedByAdminDebug).toBe("boolean");
    expect(publicBetaScore?.action).toEqual(expect.any(String));
  });

  it("captures required fake-authority risks", () => {
    const keys = REPORT.fakeAuthorityRisks.map((finding) => finding.findingKey);

    expect(keys).toEqual(expect.arrayContaining([
      "public-beta-score-ui-aggregate-score-drift",
      "watch-seconds-total-can-look-canonical",
      "creator-dashboard-stats-object-presence-live-risk",
      "admin-debug-generated-reports-can-look-live-while-stale",
      "provider-smoke-operator-report-can-look-like-pass",
    ]));
    expect(REPORT.fakeAuthorityRisks.some((finding) => finding.severity === "P0")).toBe(true);
  });

  it("keeps UI cleanup source-backed instead of filename-backed", () => {
    const creatorHub = REPORT.disconnectedUiSurfaces.find((finding) =>
      finding.findingKey === "creator-dashboard-settings-hub-fake-live-risk");

    expect(creatorHub?.routeOrComponent).toBe("CreatorDashboardSettingsHub");
    expect(creatorHub?.sourceMetadataPresent).toBe(false);
    expect(creatorHub?.brokenOrSelfLoopLinks).toBe(true);
    expect(creatorHub?.usageEvidence.length).toBeGreaterThan(0);
  });

  it("classifies cleanup candidates without declaring runtime files unused", () => {
    const cleanupTypes = REPORT.cleanupCandidates.map((finding) => finding.cleanupType);

    expect(cleanupTypes).toEqual(expect.arrayContaining([
      "archive_candidate",
      "merge_candidate",
      "validator_replacement_candidate",
      "legacy_lane_candidate",
      "needs_human_review",
    ]));
    expect(REPORT.cleanupCandidates.every((finding) =>
      !finding.description.toLowerCase().includes("safe to delete")
      && !finding.recommendedAction.toLowerCase().includes("delete"))).toBe(true);
  });

  it("provides severity counts and a ranked fix order", () => {
    const totalSeverity = REPORT.summary.p0Count
      + REPORT.summary.p1Count
      + REPORT.summary.p2Count
      + REPORT.summary.p3Count;
    const totalFindings = REPORT.doctrineConflicts.length
      + REPORT.validatorConflicts.length
      + REPORT.legacyLaneCandidates.length
      + REPORT.fakeAuthorityRisks.length
      + REPORT.disconnectedUiSurfaces.length
      + REPORT.cleanupCandidates.length;

    expect(totalSeverity).toBe(totalFindings);
    expect(REPORT.recommendedFixOrder[0]?.stepKey).toBe("phase-one-score-evidence-ingestion");
    expect(REPORT.recommendedFixOrder.map((item) => item.stepKey)).toEqual(expect.arrayContaining([
      "creator-dashboard-source-sample-contract",
      "admin-debug-canonical-score-connection",
      "watch-time-test-contract-lock",
      "generated-report-owner-and-staleness-cleanup",
    ]));
  });
});
