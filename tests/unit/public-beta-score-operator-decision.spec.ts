import { describe, expect, it } from "vitest";

import {
  buildPublicBetaScoreReport,
  type PublicBetaCostReadiness,
  type PublicBetaEvidenceArtifact,
  type PublicBetaEvidenceInput,
  type PublicBetaFindingInput,
} from "@/lib/agent-score/core";
import { buildPublicBetaCommandBudget } from "@/lib/agent-score/reporting";

const CURRENT_HEAD = "current-head";
const OLD_HEAD = "old-head";
const FRESH_GENERATED_AT = new Date().toISOString();
const STALE_GENERATED_AT = "2000-01-01T00:00:00.000Z";

function formalArtifact(input: {
  path: string;
  detail: string;
  evidence: string[];
}): PublicBetaEvidenceArtifact {
  return {
    ...input,
    status: "passed",
    passed: true,
    generatedAtUtc: FRESH_GENERATED_AT,
    sourceCommit: CURRENT_HEAD,
  };
}

function cleanCostReadiness(): PublicBetaCostReadiness {
  return {
    cloudRunCostReadiness: {
      status: "source_ready_batched_or_cached",
      detail: "Cloud Run work is batched and cached.",
      evidence: ["cloudRun=source_ready_batched_or_cached"],
      blocksBetaExit: false,
    },
    cloudSqlCostReadiness: {
      status: "source_inventory_complete",
      detail: "Cloud SQL inventory is complete.",
      evidence: ["cloudSql=source_inventory_complete"],
      blocksBetaExit: false,
    },
    geminiCloudAssistCostReadiness: {
      status: "source_ready_batched_or_cached",
      detail: "AI cost work is batched and cached.",
      evidence: ["gemini=source_ready_batched_or_cached"],
      blocksBetaExit: false,
    },
    route4xxReadiness: {
      status: "source_ready_retry_storm_guarded",
      detail: "Route retry storms are guarded.",
      evidence: ["route4xx=source_ready_retry_storm_guarded"],
      blocksBetaExit: false,
    },
  };
}

function passingEvidence(): PublicBetaEvidenceInput {
  return {
    requiredReports: [{
      path: "agent/state/source-truth-authority-map.generated.json",
      generatedAt: FRESH_GENERATED_AT,
      freshness: "fresh",
      sourceCommit: CURRENT_HEAD,
      currentHead: CURRENT_HEAD,
      versionStatus: "current_head",
      validationState: "passed",
    }],
    targetedBehaviorEvidence: formalArtifact({
      path: "agent/state/targeted-behavior-evidence.generated.json",
      detail: "Targeted behavior validators passed.",
      evidence: ["targetedBehavior.status=passed"],
    }),
    uiSurfaceCoverageEvidence: {
      path: "agent/state/ui-visual-smoke-minimal.generated.json",
      status: "source_surface_checks_current",
      passed: true,
      detail: "Deterministic UI source coverage passed.",
      evidence: [
        "uiVisualSmoke.status=source_surface_checks_current",
        "uiVisualSmoke.requiredSurfaces=admin-debug",
        "uiVisualSmoke.missingSurfaces=",
      ],
      generatedAtUtc: FRESH_GENERATED_AT,
      sourceCommit: CURRENT_HEAD,
    },
    providerSmokeEvidence: formalArtifact({
      path: "agent/state/provider-smoke-evidence.generated.json",
      detail: "Provider-backed source activity evidence passed.",
      evidence: ["formal_provider_smoke_passed"],
    }),
    runtimeSmokeEvidence: formalArtifact({
      path: "agent/state/runtime-smoke-evidence.generated.json",
      detail: "Deployed runtime route evidence passed.",
      evidence: ["formal_runtime_smoke_passed"],
    }),
    adminTruthSampleEvidence: formalArtifact({
      path: "agent/state/admin-truth-sample-evidence.generated.json",
      detail: "Admin source activity sample passed.",
      evidence: [
        "formal_admin_truth_sample_passed",
        "formalAdminTruthSamplePassed=true",
        "sampleCount=1",
      ],
    }),
    costReadiness: cleanCostReadiness(),
  };
}

function buildReport(
  findings: PublicBetaFindingInput[] = [],
  evidence: PublicBetaEvidenceInput = passingEvidence(),
) {
  return buildPublicBetaScoreReport(findings, {
    generatedAt: FRESH_GENERATED_AT,
    currentHead: CURRENT_HEAD,
    commandBudget: buildPublicBetaCommandBudget(),
    evidence,
  });
}

function sourceActivitySubstitute(
  overrides: Partial<PublicBetaEvidenceArtifact> = {},
): PublicBetaEvidenceArtifact {
  return {
    path: "agent/state/live-evidence-gate-replacement.generated.json",
    status: "source_ready_live_activity_confirmed",
    passed: true,
    detail: "First-party site activity says the connected lane needs no provider artifact.",
    evidence: [
      "liveRuntimeEvidence.firstPartySiteActivityConfirmed=3",
      "liveRuntimeEvidence.providerRequired=0",
      "liveRuntimeEvidence.blockedSiteActivityLanes=0",
      "launchGateImpact=site_activity_can_clear_connected_site_activity_lanes",
    ],
    generatedAtUtc: FRESH_GENERATED_AT,
    sourceCommit: CURRENT_HEAD,
    ...overrides,
  };
}

function missingProviderEvidence(): PublicBetaEvidenceArtifact {
  return {
    path: "agent/state/provider-smoke-evidence.generated.json",
    status: "missing_formal_evidence",
    passed: false,
    detail: "Provider-backed source activity evidence is missing.",
    evidence: ["providerArtifactStatus=missing_formal_evidence"],
  };
}

describe("public beta operator-decision invariants", () => {
  it.each([
    {
      lane: "provider",
      override: {
        providerSmokeEvidence: {
          ...formalArtifact({
            path: "agent/state/provider-smoke-evidence.generated.json",
            detail: "Provider-backed source activity evidence passed on an old revision.",
            evidence: ["formal_provider_smoke_passed"],
          }),
          sourceCommit: OLD_HEAD,
        },
      },
      evidenceGate: "runtimeProviderSmoke",
      clearanceGate: "providerSmoke",
    },
    {
      lane: "runtime",
      override: {
        runtimeSmokeEvidence: {
          ...formalArtifact({
            path: "agent/state/runtime-smoke-evidence.generated.json",
            detail: "Deployed runtime route evidence passed on an old revision.",
            evidence: ["formal_runtime_smoke_passed"],
          }),
          sourceCommit: OLD_HEAD,
        },
      },
      evidenceGate: "runtimeProviderSmoke",
      clearanceGate: "deployedRuntimeSmoke",
    },
    {
      lane: "admin",
      override: {
        adminTruthSampleEvidence: {
          ...formalArtifact({
            path: "agent/state/admin-truth-sample-evidence.generated.json",
            detail: "Admin source activity sample passed on an old revision.",
            evidence: ["formal_admin_truth_sample_passed", "sampleCount=1"],
          }),
          sourceCommit: OLD_HEAD,
        },
      },
      evidenceGate: "adminTruthSamples",
      clearanceGate: "adminTruthSample",
    },
  ] as const)("does not clear head-mismatched $lane evidence", ({ override, evidenceGate, clearanceGate }) => {
    const report = buildReport([], { ...passingEvidence(), ...override });
    const gate = report.evidenceGates.find((candidate) => candidate.id === evidenceGate);

    expect(gate?.status).not.toBe("Ready");
    expect(report.launchClearance.formalGates[clearanceGate].cleared).toBe(false);
    expect(report.operatorDecision.releaseReadiness.ready).toBe(false);
    expect(report.evidenceGates.filter((candidate) => candidate.status === "Ready" && candidate.blocksLaunch)).toEqual([]);
  });

  it.each([
    ["passed:false", { passed: false }],
    ["stale artifact", { generatedAtUtc: STALE_GENERATED_AT }],
    ["old source commit", { sourceCommit: OLD_HEAD }],
  ] as const)("does not let a %s source-activity substitute clear the provider lane", (_label, overrides) => {
    const evidence = passingEvidence();
    evidence.providerSmokeEvidence = missingProviderEvidence();
    evidence.sourceBackedRuntimeConfidenceEvidence = sourceActivitySubstitute(overrides);

    const report = buildReport([], evidence);
    const gate = report.evidenceGates.find((candidate) => candidate.id === "runtimeProviderSmoke");

    expect(gate?.status).not.toBe("Ready");
    expect(gate?.blocksLaunch).toBe(true);
    expect(report.launchGateStatus).not.toBe("launch_ready");
    expect(report.operatorDecision.releaseReadiness.ready).toBe(false);
  });

  it.each([
    ["failed", "source_surface_checks_failed"],
    ["contradictory", "source_surface_checks_current"],
  ] as const)("blocks launch for %s UI source coverage", (_label, status) => {
    const evidence = passingEvidence();
    evidence.uiSurfaceCoverageEvidence = {
      ...evidence.uiSurfaceCoverageEvidence!,
      status,
      passed: false,
    };

    const report = buildReport([], evidence);
    const gate = report.evidenceGates.find((candidate) => candidate.id === "uiSourceCoverage");

    expect(gate).toMatchObject({ blocksLaunch: true });
    expect(gate?.status).not.toBe("Ready");
    expect(report.launchClearance.formalGates.uiSurfaceCoverage.cleared).toBe(false);
    expect(report.launchGateStatus).not.toBe("launch_ready");
    expect(report.operatorDecision.releaseReadiness.ready).toBe(false);
  });

  it("keeps major source findings in needs_fix and release-not-ready state", () => {
    const findings: PublicBetaFindingInput[] = [
      {
        domain: "layout",
        category: "unsafe-shell",
        title: "Shared shell violates the device layout contract",
        severity: "major",
        confidence: 0.99,
        blastRadius: "global",
        filePath: "src/components/AppShell.tsx",
        canAutofix: false,
        autofixConfidence: 0,
        escalation: "Repair the canonical shell and run its targeted validator.",
        evidence: ["unsafe fixed viewport shell"],
        docsBasis: ["repo"],
      },
      {
        domain: "telemetry",
        category: "identity-handoff",
        title: "Person attribution drops the guest handoff",
        severity: "major",
        confidence: 0.99,
        blastRadius: "shared",
        filePath: "src/lib/analytics/person-metrics.ts",
        canAutofix: false,
        autofixConfidence: 0,
        escalation: "Repair the canonical identity handoff and run its targeted validator.",
        evidence: ["linked guest action is not attributed"],
        docsBasis: ["repo"],
      },
    ];

    const report = buildReport(findings);

    expect(report.operatorDecision.sourceReadiness.status).toBe("needs_fix");
    expect(report.operatorDecision.actionQueues.sourceFixes).toHaveLength(2);
    expect(report.operatorDecision.releaseReadiness.ready).toBe(false);
    expect(report.launchGateStatus).not.toBe("launch_ready");
    expect(report.evidenceGates.find((gate) => gate.id === "sourceSafety")).toMatchObject({
      blocksLaunch: true,
      status: "Needs review",
    });
  });

  it("routes non-blocking cost owner review to owner_review instead of launch_ready", () => {
    const evidence = passingEvidence();
    evidence.costReadiness = cleanCostReadiness();
    evidence.costReadiness.cloudRunCostReadiness = {
      status: "owner_review",
      detail: "Cloud billing still needs its owner review.",
      evidence: ["cloudRun=owner_review"],
      blocksBetaExit: false,
    };

    const report = buildReport([], evidence);

    expect(report.launchGateStatus).toBe("owner_review");
    expect(report.operatorDecision.releaseReadiness.ready).toBe(false);
    expect(report.operatorDecision.actionQueues.ownerReview).toHaveLength(1);
  });

  it("treats blocksBetaExit cost truth as a blocked launch", () => {
    const evidence = passingEvidence();
    evidence.costReadiness = cleanCostReadiness();
    evidence.costReadiness.cloudRunCostReadiness = {
      status: "source_inventory_complete",
      detail: "The cost owner explicitly blocks beta exit.",
      evidence: ["cloudRun=source_inventory_complete", "ownerDecision=block_beta_exit"],
      blocksBetaExit: true,
    };

    const report = buildReport([], evidence);

    expect(report.launchGateStatus).toBe("blocked");
    expect(report.operatorDecision.releaseReadiness.ready).toBe(false);
    expect(report.launchBlockers.join("\n")).toContain("blocks beta exit");
  });

  it("normalizes all ready positive-weight gates to an evidence score of 100", () => {
    const report = buildReport();
    const positiveWeightGates = report.evidenceGates.filter((gate) => gate.maxScore > 0);

    expect(positiveWeightGates.length).toBeGreaterThan(0);
    expect(positiveWeightGates.every((gate) => gate.status === "Ready")).toBe(true);
    expect(report.evidenceScore).toBe(100);
    expect(report.launchGateStatus).toBe("launch_ready");
    expect(report.operatorDecision.sourceReadiness.status).toBe("ready");
    expect(report.operatorDecision.releaseReadiness.ready).toBe(true);
  });

  it("clears provider and protected payment gates when formal proof accompanies operator context", () => {
    const evidence = passingEvidence();
    evidence.providerSmokeEvidence = {
      ...evidence.providerSmokeEvidence!,
      evidence: [
        ...evidence.providerSmokeEvidence!.evidence,
        "operatorRevenueSmoke.status=operator_confirmed_revenue_smoke",
        "operatorRevenueSmoke.providerBackedSiteActivityPassed=false",
      ],
    };

    const report = buildReport([], evidence);

    expect(report.launchClearance.formalGates.providerSmoke.cleared).toBe(true);
    expect(report.launchClearance.formalGates.paymentSourceOfFunds.cleared).toBe(true);
    expect(report.operatorDecision.releaseReadiness.ready).toBe(true);
  });

  it("keeps optional advisory changes out of required health and release decisions", () => {
    const withoutDebugEvidence = buildReport();
    const evidenceWithDebug = passingEvidence();
    evidenceWithDebug.debugEvidence = {
      telemetry: [{
        id: "debug-telemetry-1",
        fingerprint: "debug-telemetry-1",
        source: "audit",
        severity: "info",
        category: "telemetry",
        message: "Source diagnostic was observed.",
        humanMessage: "Source diagnostic was observed.",
        occurrenceCount: 1,
        firstSeenAt: Date.now(),
        lastSeenAt: Date.now(),
      }],
    };
    const withDebugEvidence = buildReport([], evidenceWithDebug);
    const withoutDebugGate = withoutDebugEvidence.evidenceGates.find((gate) => gate.id === "debugRuntimeEvidence");
    const withDebugGate = withDebugEvidence.evidenceGates.find((gate) => gate.id === "debugRuntimeEvidence");

    expect(withoutDebugGate?.status).not.toBe(withDebugGate?.status);
    expect(withoutDebugEvidence.evidenceAdvisories.length).toBeGreaterThan(withDebugEvidence.evidenceAdvisories.length);
    expect(withDebugEvidence.runtimeHealthScore).toBe(withoutDebugEvidence.runtimeHealthScore);
    expect(withDebugEvidence.evidenceCompletenessScore).toBe(withoutDebugEvidence.evidenceCompletenessScore);
    expect(withDebugEvidence.evidenceScore).toBe(withoutDebugEvidence.evidenceScore);
    expect(withDebugEvidence.launchGateStatus).toBe(withoutDebugEvidence.launchGateStatus);
    expect(withDebugEvidence.operatorDecision.releaseReadiness).toEqual(
      withoutDebugEvidence.operatorDecision.releaseReadiness,
    );
  });

  it("prioritizes a launch-blocking refresh before optional debug advice", () => {
    const evidence = passingEvidence();
    evidence.uiSurfaceCoverageEvidence = {
      ...evidence.uiSurfaceCoverageEvidence!,
      sourceCommit: OLD_HEAD,
    };

    const report = buildReport([], evidence);

    expect(report.operatorDecision.actionQueues.sourceVerification[0]).toMatchObject({
      id: expect.stringContaining("debugRuntimeEvidence"),
      blocksLaunch: false,
    });
    expect(report.operatorDecision.primaryAction).toMatchObject({
      lane: "evidence_refresh",
      title: "UI source coverage",
      blocksLaunch: true,
    });
  });

  it("does not treat a fresh current failed required report as ready", () => {
    const evidence = passingEvidence();
    evidence.requiredReports = evidence.requiredReports?.map((report) => ({
      ...report,
      validationState: "failed",
      validationDetail: "required child validator failed",
    }));

    const report = buildReport([], evidence);
    const freshnessGate = report.evidenceGates.find((gate) => gate.id === "freshnessIntegrity");

    expect(freshnessGate).toMatchObject({ status: "Blocked", blocksLaunch: true });
    expect(report.operatorDecision.releaseReadiness.ready).toBe(false);
  });

  it("does not accept an unrecognized passing status as formal evidence", () => {
    const evidence = passingEvidence();
    evidence.providerSmokeEvidence = {
      ...evidence.providerSmokeEvidence!,
      status: "green_enough",
      passed: true,
    };

    const report = buildReport([], evidence);
    const gate = report.evidenceGates.find((candidate) => candidate.id === "runtimeProviderSmoke");

    expect(gate?.status).not.toBe("Ready");
    expect(gate?.blocksLaunch).toBe(true);
    expect(report.launchClearance.formalGates.providerSmoke.cleared).toBe(false);
    expect(report.operatorDecision.releaseReadiness.ready).toBe(false);
  });

  it.each([
    ["stale current-by-impact", { generatedAtUtc: STALE_GENERATED_AT, sourceCommit: OLD_HEAD, versionStatus: "current_by_impact" as const }],
    ["future timestamp", { generatedAtUtc: "2999-01-01T00:00:00.000Z" }],
  ])("does not let %s formal evidence clear launch", (_label, override) => {
    const evidence = passingEvidence();
    evidence.providerSmokeEvidence = {
      ...evidence.providerSmokeEvidence!,
      ...override,
    };

    const report = buildReport([], evidence);
    const gate = report.evidenceGates.find((candidate) => candidate.id === "runtimeProviderSmoke");

    expect(gate?.status).not.toBe("Ready");
    expect(report.launchClearance.formalGates.providerSmoke.cleared).toBe(false);
    expect(report.operatorDecision.releaseReadiness.ready).toBe(false);
  });
});
