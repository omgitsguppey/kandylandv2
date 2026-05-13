import { describe, expect, it } from "vitest";

import {
  CANONICAL_SNAPSHOT_AUTHORITY,
  LEGACY_REALTIME_SUMMARY_AUTHORITY,
  RAW_DISPLAY_RISK_COLLECTIONS,
  buildSnapshotAdminVendorCostRewireReport,
  validateSnapshotAdminVendorCostRewireReport,
} from "../../scripts/agent/snapshot-admin-vendor-cost-rewire";

const REPORT = buildSnapshotAdminVendorCostRewireReport({ now: new Date("2026-05-13T12:00:00.000Z") });

describe("snapshot/admin/vendor/cost rewire", () => {
  it("builds the required top-level report fields", () => {
    expect(REPORT.reportKey).toBe("snapshot-admin-vendor-cost-rewire");
    expect(REPORT.generatedAtUtc).toBe("2026-05-13T12:00:00.000Z");
    expect(REPORT.phasesCovered).toEqual(expect.arrayContaining([
      "8. Snapshot Authority Collapse",
      "Admin Analytics Display Source Rules",
      "Admin Debug Recovery Evidence Rules",
      "Vendor Evidence Boundary",
    ]));
    expect(REPORT.summary.snapshotAuthorityCount).toBe(REPORT.snapshotAuthorities.length);
    expect(validateSnapshotAdminVendorCostRewireReport(REPORT)).toEqual([]);
  });

  it("imports source report metadata for Phase 1, Phase 2, and Phase 3", () => {
    expect(REPORT.sourceReports.phaseOneInventory.path).toBe("agent/state/analytics-rewire-phase-one.generated.json");
    expect(REPORT.sourceReports.phaseTwoIdentityPrivacy.path).toBe("agent/state/identity-privacy-raw-ledger-rewire.generated.json");
    expect(REPORT.sourceReports.phaseThreeRecoveryDryRun.path).toBe("agent/state/lost-data-recovery-dry-run.generated.json");
    expect(REPORT.sourceReports.phaseOneInventory.laneCount).toBeGreaterThan(0);
    expect(REPORT.sourceReports.phaseTwoIdentityPrivacy.privacyRuleCount).toBeGreaterThan(0);
    expect(REPORT.sourceReports.phaseThreeRecoveryDryRun.recoverableLaneCount).toBeGreaterThan(0);
  });

  it("makes analytics_admin_metric_snapshots canonical", () => {
    const authority = REPORT.snapshotAuthorities.find((entry) => entry.authorityKey === CANONICAL_SNAPSHOT_AUTHORITY);

    expect(authority?.status).toBe("canonical");
    expect(authority?.displayAllowed).toBe(true);
    expect(authority?.fakeZeroProtectionRequired).toBe(true);
    expect(authority?.sourceLabelRequired).toBe(true);
  });

  it("demotes realtime summary behind the canonical snapshot authority", () => {
    const realtimeSummary = REPORT.snapshotAuthorities.find((entry) => entry.pathOrCollection === LEGACY_REALTIME_SUMMARY_AUTHORITY);

    expect(realtimeSummary?.status).not.toBe("canonical");
    expect(realtimeSummary?.displayAllowed).toBe(false);
    expect(realtimeSummary?.fallbackAllowed).toBe(true);
    expect(realtimeSummary?.demoteBehind).toBe(CANONICAL_SNAPSHOT_AUTHORITY);
  });

  it("forbids raw display risk collections as Admin Analytics display truth", () => {
    const rawBan = REPORT.adminDisplayRules.find((rule) => rule.ruleKey === "raw-collection-display-ban");

    expect(rawBan?.appliesTo).toEqual(expect.arrayContaining([...RAW_DISPLAY_RISK_COLLECTIONS]));
    expect(rawBan?.forbiddenSources).toEqual(expect.arrayContaining([
      "direct Admin Analytics display truth",
      "raw guest batch display",
      "raw session display",
      "raw watch session display",
    ]));
  });

  it("keeps GA4, PostHog, and BigQuery as evidence/export/estimate/debug parity only", () => {
    const roles = new Map(REPORT.vendorBoundaries.map((boundary) => [boundary.vendorKey, boundary.allowedRole]));

    expect(roles.get("GA4")).toBe("estimate_only");
    expect(roles.get("PostHog")).toBe("evidence_only");
    expect(roles.get("BigQuery")).toBe("export_only");
    expect(REPORT.vendorBoundaries.every((boundary) => boundary.forbiddenRole.includes("truth"))).toBe(true);
  });

  it("includes required cost simplification candidates", () => {
    const candidateKeys = REPORT.costSimplificationCandidates.map((candidate) => candidate.candidateKey);

    expect(candidateKeys).toEqual(expect.arrayContaining([
      "admin-raw-realtime-listeners",
      "admin-raw-display-fallback-routes",
      "duplicate-snapshot-authority",
      "vendor-guest-estimates-without-source-confidence",
      "stale-generated-reports-as-authority",
    ]));
  });

  it("keeps high-value recovered data Debug-first before Admin Analytics", () => {
    for (const laneKey of [
      "analytics_identity_links",
      "guest_tracking_indexes",
      "user_journey_indexes",
      "behavioral_timeline_facts",
      "analytics_legacy_recovered_events",
    ]) {
      const item = REPORT.recoverySurfacingPlan.find((entry) => entry.laneKey === laneKey);
      expect(item?.firstSurfaceTarget).toBe("Admin Debug");
      expect(item?.confidenceLabelRequired).toBe(true);
      expect(item?.requiredBeforeAdminAnalytics).toContain("Admin Debug source evidence");
    }
  });

  it("limits purchase and unlock facts to server/source truth snapshots before Admin Analytics", () => {
    const purchase = REPORT.recoverySurfacingPlan.find((entry) => entry.laneKey === "purchase_facts");
    const unlock = REPORT.recoverySurfacingPlan.find((entry) => entry.laneKey === "unlock_facts");

    expect(purchase?.targetSnapshotAuthority).toBe(CANONICAL_SNAPSHOT_AUTHORITY);
    expect(purchase?.sourceTruthLabel).toBe("required_operational_transaction_truth");
    expect(purchase?.requiredBeforeAdminAnalytics.join(" ")).toContain("server/payment transaction truth snapshot");

    expect(unlock?.targetSnapshotAuthority).toBe(CANONICAL_SNAPSHOT_AUTHORITY);
    expect(unlock?.sourceTruthLabel).toBe("required_operational_entitlement_truth");
    expect(unlock?.requiredBeforeAdminAnalytics.join(" ")).toContain("server entitlement truth snapshot");
  });

  it("keeps runtime risks as report issues instead of validator failures", () => {
    expect(REPORT.issues.map((issue) => issue.issueKey)).toEqual(expect.arrayContaining([
      "duplicate-snapshot-authority-collapse-needed",
      "raw-display-fallback-runtime-simplification-needed",
      "cost-simplification-runtime-pass-required",
      "vendor-boundary-runtime-labeling-needed",
    ]));
    expect(validateSnapshotAdminVendorCostRewireReport(REPORT)).toEqual([]);
  });

  it("downgrades duplicate authority, raw fallback, and cost issues after the cost runtime pass", () => {
    const duplicate = REPORT.issues.find((entry) => entry.issueKey === "duplicate-snapshot-authority-collapse-needed");
    const rawFallback = REPORT.issues.find((entry) => entry.issueKey === "raw-display-fallback-runtime-simplification-needed");
    const cost = REPORT.issues.find((entry) => entry.issueKey === "cost-simplification-runtime-pass-required");

    expect(duplicate?.severity).toBe("P2");
    expect(duplicate?.description).toContain("materializer metadata marks raw sources as input or Debug evidence");
    expect(duplicate?.blocksRuntimeSimplification).toBe(false);

    expect(rawFallback?.severity).toBe("P2");
    expect(rawFallback?.description).toContain("no longer mounts raw Firestore realtime listeners");
    expect(rawFallback?.blocksRuntimeSimplification).toBe(false);

    expect(cost?.severity).toBe("P2");
    expect(cost?.description).toContain("direct raw Firestore listeners are disabled");
    expect(cost?.blocksRuntimeSimplification).toBe(false);
  });

  it("downgrades Debug recovery surfacing after the Admin Debug evidence payload lands", () => {
    const issue = REPORT.issues.find((entry) => entry.issueKey === "admin-debug-recovery-surfacing-required");

    expect(issue?.severity).toBe("P2");
    expect(issue?.title).toContain("partially landed");
    expect(issue?.description).toContain("productionAllowedNow=false");
  });

  it("downgrades vendor boundary issue after module source labels land", () => {
    const issue = REPORT.issues.find((entry) => entry.issueKey === "vendor-boundary-runtime-labeling-needed");

    expect(issue?.severity).toBe("P2");
    expect(issue?.title).toContain("module level");
    expect(issue?.description).toContain("label vendor evidence");
    expect(issue?.blocksRuntimeSimplification).toBe(false);
  });
});
