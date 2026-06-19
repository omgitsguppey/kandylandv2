import { describe, expect, it } from "vitest";

import {
  buildOvernightFinalIntegrationLockReport,
  validateOvernightFinalIntegrationLockReport,
  type OvernightFinalDependencyStatus,
} from "../../scripts/agent/validate-overnight-final-integration-lock";

const readyDependencies: OvernightFinalDependencyStatus[] = [
  { id: "overnight-wiring-integrity", status: "passed", required: true, detail: "ready", nextAction: "Keep current." },
  { id: "existing-algorithm-refinement", status: "passed", required: true, detail: "ready", nextAction: "Keep current." },
  { id: "user-loading-wallet-mobile-refinement", status: "passed", required: true, detail: "ready", nextAction: "Keep current." },
  { id: "creator-drop-status-metrics", status: "passed", required: true, detail: "ready", nextAction: "Keep current." },
  { id: "mobile-ui-final-lock", status: "passed", required: true, detail: "ready", nextAction: "Keep current." },
  { id: "final-telemetry-closure-lock", status: "passed", required: true, detail: "ready", nextAction: "Keep current." },
  { id: "beta-health-scoring", status: "passed", required: true, detail: "ready", nextAction: "Keep current." },
];

describe("overnight final integration lock", () => {
  it("passes when final dependencies are represented, PRs are classified, and beta remains evidence-gated", () => {
    const report = buildOvernightFinalIntegrationLockReport({
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      currentHead: "head",
      changedFiles: ["scripts/agent/validate-overnight-final-integration-lock.ts"],
      untrackedFiles: [],
      dependencyStatus: readyDependencies,
      prCleanupActions: ["Preserved PR #275: unrelated admin analytics optimization."],
      openPrs: [{ number: 275, title: "Admin analytics optimization", classification: "preserved_unrelated" }],
      betaScore: 41.92,
      betaStatus: "Stale evidence",
      betaEvidenceReady: false,
      mobileScaleSweepFindings: ["Existing non-chat mobile scale patterns remain as residual source risks."],
      fixesApplied: [],
      smallScaleFixes: [],
    });

    expect(report.summary.chatUntouched).toBe(true);
    expect(report.summary.navUntouched).toBe(true);
    expect(report.summary.betaScore).toBe(41.92);
    expect(report.summary.betaStatus).toBe("Stale evidence");
    expect(report.summary.p0Count).toBe(0);
    expect(validateOvernightFinalIntegrationLockReport(report)).toEqual([]);
  });

  it("fails if a critical dependency is missing without a next action", () => {
    const report = buildOvernightFinalIntegrationLockReport({
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      currentHead: "head",
      changedFiles: [],
      untrackedFiles: [],
      dependencyStatus: [
        ...readyDependencies,
        { id: "creator-drop-status-metrics", status: "missing_dependency", required: true, detail: "missing", nextAction: "" },
      ],
      prCleanupActions: [],
      openPrs: [],
      betaScore: 41.92,
      betaStatus: "Stale evidence",
      betaEvidenceReady: false,
      mobileScaleSweepFindings: [],
      fixesApplied: [],
      smallScaleFixes: [],
    });

    expect(validateOvernightFinalIntegrationLockReport(report)).toContain("critical overnight dependency missing without status or next action.");
  });

  it("allows stale creator drop metrics only as a visible remaining risk", () => {
    const report = buildOvernightFinalIntegrationLockReport({
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      currentHead: "head",
      changedFiles: [],
      untrackedFiles: [],
      dependencyStatus: readyDependencies.map((dependency) =>
        dependency.id === "creator-drop-status-metrics"
          ? {
            ...dependency,
            status: "stale",
            detail: "creator drop metrics artifact is stale.",
            nextAction: "Run npm run check:creator-drop-status-metrics.",
          }
          : dependency,
      ),
      prCleanupActions: [],
      openPrs: [],
      betaScore: 41.92,
      betaStatus: "Stale evidence",
      betaEvidenceReady: false,
      mobileScaleSweepFindings: [],
      fixesApplied: [],
      smallScaleFixes: [],
    });

    expect(report.summary.creatorDropStatusMetricsStatus).toBe("stale");
    expect(report.remainingRisks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "creator-drop-status-metrics",
        severity: "P2",
      }),
    ]));
    expect(validateOvernightFinalIntegrationLockReport(report)).toEqual([]);
  });

  it("fails when chat or navigation files changed", () => {
    const report = buildOvernightFinalIntegrationLockReport({
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      currentHead: "head",
      changedFiles: ["src/components/Chat/ChatExperience.tsx", "src/components/Navigation/ProfileSidebar.tsx"],
      untrackedFiles: [],
      dependencyStatus: readyDependencies,
      prCleanupActions: [],
      openPrs: [],
      betaScore: 41.92,
      betaStatus: "Stale evidence",
      betaEvidenceReady: false,
      mobileScaleSweepFindings: [],
      fixesApplied: [],
      smallScaleFixes: [],
    });

    const failures = validateOvernightFinalIntegrationLockReport(report);
    expect(failures).toContain("chat files changed.");
    expect(failures).toContain("nav files changed.");
  });

  it("fails when open PRs are not classified", () => {
    const report = buildOvernightFinalIntegrationLockReport({
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      currentHead: "head",
      changedFiles: [],
      untrackedFiles: [],
      dependencyStatus: readyDependencies,
      prCleanupActions: [],
      openPrs: [{ number: 274, title: "Broad monolith audit" }],
      betaScore: 41.92,
      betaStatus: "Stale evidence",
      betaEvidenceReady: false,
      mobileScaleSweepFindings: [],
      fixesApplied: [],
      smallScaleFixes: [],
    });

    expect(validateOvernightFinalIntegrationLockReport(report)).toContain("open PRs are unclassified.");
  });

  it("fails when beta evidence is falsely marked complete", () => {
    const report = buildOvernightFinalIntegrationLockReport({
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      currentHead: "head",
      changedFiles: [],
      untrackedFiles: [],
      dependencyStatus: readyDependencies,
      prCleanupActions: [],
      openPrs: [],
      betaScore: 41.92,
      betaStatus: "Stale evidence",
      betaEvidenceReady: true,
      mobileScaleSweepFindings: [],
      fixesApplied: [],
      smallScaleFixes: [],
    });

    expect(validateOvernightFinalIntegrationLockReport(report)).toContain("beta evidence is falsely marked complete.");
  });
});
