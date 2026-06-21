import { describe, expect, it } from "vitest";

import {
  buildBlockedRefreshQueueResolverReport,
  validateBlockedRefreshQueueResolverReport,
  type BlockedRefreshQueueResolverReport,
} from "../../scripts/agent/validate-blocked-refresh-queue-resolver";

const blockedQueue = [
  {
    artifact: "debug_runtime_evidence",
    staleReason: "Unknown evidence: Debug/runtime evidence",
    refreshCommand: "Produce deployed runtime route evidence, then run npm run check:evidence-capture-status",
    scoreImpactEstimate: 16.33,
    owner: "runtime",
    dependencyOrder: 51,
    canRunAutomatically: false,
    blockedReason: "blocked_formal_evidence: deployed runtime route evidence required; source/debug evidence is partial only.",
    source: "score_impact",
    expectedOutcome: "Remain blocked until deployed runtime route evidence is produced.",
  },
  {
    artifact: "runtime_provider_smoke",
    staleReason: "Runtime unverified: Runtime/provider smoke",
    refreshCommand: "Produce provider-backed site activity evidence, then run npm run check:evidence-capture-status",
    scoreImpactEstimate: 16.33,
    owner: "runtime",
    dependencyOrder: 52,
    canRunAutomatically: false,
    blockedReason: "blocked_formal_evidence: provider-backed site activity evidence required; operator-confirmed usage remains partial confidence only.",
    source: "score_impact",
    expectedOutcome: "Remain blocked until provider-backed site activity evidence is produced.",
  },
  {
    artifact: "admin_truth_sample_evidence",
    staleReason: "Unknown evidence: Admin truth/sample evidence",
    refreshCommand: "Produce redacted admin source activity sample, then run npm run check:evidence-capture-status",
    scoreImpactEstimate: 12,
    owner: "admin",
    dependencyOrder: 53,
    canRunAutomatically: false,
    blockedReason: "blocked_formal_evidence: redacted admin source activity sample required; source samples remain partial confidence only.",
    source: "score_impact",
    expectedOutcome: "Remain blocked until a redacted admin source activity sample is produced.",
  },
  {
    artifact: "ui_source_coverage",
    staleReason: "Source coverage required: UI source checks",
    refreshCommand: "npm run check:ui-visual-smoke-minimal, then npm run check:evidence-capture-status",
    scoreImpactEstimate: 12,
    owner: "manual",
    dependencyOrder: 54,
    canRunAutomatically: false,
    blockedReason: "source_validation_required: deterministic UI source coverage must run before optional visual reproduction.",
    source: "score_impact",
    expectedOutcome: "Run source coverage and fix reported UI surface gaps before optional browser reproduction.",
  },
] as const;

describe("blocked refresh queue resolver", () => {
  it("classifies the four source-evidence blockers with exact next actions", () => {
    const report = buildBlockedRefreshQueueResolverReport({
      generatedAtUtc: "2026-05-21T19:00:00.000Z",
      currentHead: "head",
      queue: blockedQueue,
      oldScore: 76.23,
      newScore: 76.23,
      dirtyFiles: [],
      openPrs: [
        {
          number: 278,
          title: "Reduce duplicate computation in high-ROI aggregation hotspot",
          url: "https://github.com/omgitsguppey/kandylandv2/pull/278",
          classification: "deferred_unrelated",
          reason: "Outside blocked refresh queue resolver scope.",
        },
      ],
    });

    expect(report.status).toBe("pass");
    expect(report.blockedCount).toBe(4);
    expect(report.resolvedEntries).toHaveLength(4);
    expect(report.refreshableBlockedEntries).toEqual([]);
    expect(report.formalGateImpact).toEqual({
      clearsUiSourceCoverage: false,
      clearsRuntime: false,
      clearsProvider: false,
      clearsAdminTruth: false,
    });
    expect(report.resolvedEntries.map((entry) => entry.artifact)).toEqual([
      "debug_runtime_evidence",
      "runtime_provider_smoke",
      "admin_truth_sample_evidence",
      "ui_source_coverage",
    ]);
    expect(report.resolvedEntries.filter((entry) => entry.classification === "blocked_formal_evidence")).toHaveLength(3);
    expect(report.resolvedEntries.find((entry) => entry.artifact === "ui_source_coverage")).toMatchObject({
      classification: "failed_validator",
      formalGate: "none",
      scoreTreatment: "resolved_source_refreshable",
    });
    expect(report.resolvedEntries.find((entry) => entry.artifact === "ui_source_coverage")?.nextAction).toContain("check:ui-visual-smoke-minimal");
    expect(validateBlockedRefreshQueueResolverReport(report)).toEqual([]);
  });

  it("fails generic blocked reasons, auto-refresh formal blockers, and unclassified dirty files", () => {
    const report: BlockedRefreshQueueResolverReport = {
      generatedAtUtc: "2026-05-21T19:00:00.000Z",
      reportKey: "blocked-refresh-queue-resolver",
      currentHead: "head",
      status: "pass",
      oldScore: 76.23,
      newScore: 76.23,
      blockedCount: 1,
      resolvedEntries: [
        {
          artifact: "runtime_provider_smoke",
          owner: "runtime",
          scoreImpactEstimate: 16.33,
          classification: "blocked_formal_evidence",
          originalBlockedReason: "Source evidence record required; source queue cannot generate it automatically.",
          resolvedBlockedReason: "Source evidence record required; source queue cannot generate it automatically.",
          nextAction: "Produce provider-backed site activity evidence.",
          canRunAutomatically: true,
          formalGate: "provider",
          scoreTreatment: "blocked_formal_evidence_not_auto_refreshable",
        },
      ],
      refreshableBlockedEntries: [],
      obsoleteEntriesRetired: [],
      formalGateImpact: {
        clearsUiSourceCoverage: false,
        clearsRuntime: false,
        clearsProvider: false,
        clearsAdminTruth: false,
      },
      dirtyFiles: [
        {
          path: "src/lib/privacy/consent-tracking-policy.ts",
          classification: "unsafe_unknown",
          reason: "",
        },
      ],
      openPrs: [],
      validationFailures: [],
    };

    expect(validateBlockedRefreshQueueResolverReport(report)).toEqual(expect.arrayContaining([
      expect.stringContaining("blocked entries remain generic"),
      expect.stringContaining("source-evidence blocker is treated as auto-refreshable"),
      expect.stringContaining("dirty files are unclassified"),
    ]));
  });
});
