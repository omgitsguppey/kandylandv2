import { describe, expect, it } from "vitest";

import { buildSignalProblemRankReport } from "../../scripts/agent/rank-signal-problems";
import {
  SIGNAL_FINDING_SCHEMA_VERSION,
  buildSignalSarifProjection,
  type SignalFinding,
} from "@/lib/agent-score/signal-finding-contract";

function finding(input: Partial<SignalFinding> & Pick<SignalFinding, "id" | "ruleId" | "title" | "sourceSurface" | "ownerLane" | "affectedFiles">): SignalFinding {
  const base = {
    id: input.id,
    ruleId: input.ruleId,
    title: input.title,
    severity: input.severity ?? "moderate",
    confidence: input.confidence ?? "high",
    sourceSurface: input.sourceSurface,
    ownerLane: input.ownerLane,
    evidence: input.evidence ?? [
      {
        kind: "source" as const,
        source: "unit-fixture",
        summary: "Synthetic source-only SIGNAL fixture.",
        freshness: "current" as const,
        redacted: false,
      },
    ],
    affectedFiles: input.affectedFiles,
    rootCauseHypothesis: input.rootCauseHypothesis ?? "Synthetic local source graph risk.",
    staleEvidence: input.staleEvidence ?? "current",
    terminalProof: input.terminalProof ?? "targeted",
    recommendedNextAction: input.recommendedNextAction ?? "Run the smallest owning validator before changing source.",
  };

  return {
    schemaVersion: SIGNAL_FINDING_SCHEMA_VERSION,
    ...base,
    minimalVerificationCommands: input.minimalVerificationCommands ?? ["npm run typecheck"],
    sarif: buildSignalSarifProjection(base),
  };
}

describe("SIGNAL problem ranker", () => {
  it("ranks high-risk source-truth findings without claiming runtime proof", () => {
    const sourceGraph = {
      schemaVersion: SIGNAL_FINDING_SCHEMA_VERSION,
      generatedAtUtc: "2026-06-07T00:00:00.000Z",
      reportPath: "agent/state/signal-source-graph.generated.json",
      gitStatus: "available" as const,
      sourceFileDiscovery: "git" as const,
      toolingDegraded: false,
      degradationReason: null,
      inventoryBaselineStatus: "current" as const,
      summary: {
        findingCount: 2,
        byRule: {},
        byOwnerLane: {},
        bySourceSurface: {},
      },
      findings: [
        finding({
          id: "payment_entitlement_ui_server_import",
          ruleId: "signal.source-graph.ui-server-import",
          title: "UI file imports wallet entitlement server logic.",
          severity: "critical",
          sourceSurface: "wallet_economy_payment",
          ownerLane: "frontend",
          affectedFiles: [
            { path: "src/components/Wallet/CheckoutButton.tsx", role: "primary" },
            { path: "src/lib/server/entitlements.ts", role: "adjacent" },
          ],
          rootCauseHypothesis: "Wallet UI imports server-only entitlement logic.",
        }),
        finding({
          id: "stale_context",
          ruleId: "signal.source-graph.stale-generated-report",
          title: "Generated context is stale.",
          severity: "info",
          sourceSurface: "generated_artifact",
          ownerLane: "agent_context",
          affectedFiles: [{ path: "agent/context/example.generated.json", role: "generated" }],
          staleEvidence: "stale",
          minimalVerificationCommands: [],
        }),
      ],
    };

    const report = buildSignalProblemRankReport({
      sourceGraph,
      canonicalHelpers: [
        {
          path: "src/lib/server/entitlements.ts",
          family: "entitlement_server_truth",
          purpose: "Canonical entitlement source truth.",
        },
      ],
      packageScripts: { "signal:rank": "tsx scripts/agent/rank-signal-problems.ts" },
    });

    expect(report.rankedProblems[0]?.id).toBe("payment_entitlement_ui_server_import");
    expect(report.rankedProblems[0]?.terminalRequirement).toBe("signoff");
    expect(report.rankedProblems[0]?.queueCategory).toBe("external_proof_required");
    expect(report.rankedProblems[0]?.minimalVerification.category).toBe("signoff_only_check");
    expect(report.rankedProblems[0]?.canonicalOwner).toContain("entitlement_server_truth");
    expect(report.rankedProblems[0]?.evidenceClassifications).toContain("source_only");
    expect(report.rankedProblems[0]?.evidenceClassifications).not.toContain("provider_runtime_proof");
    expect(report.rankedProblems[0]?.sourceTruthCaveat).toContain("Source-only evidence");
    expect(report.rankedProblems[0]?.dimensions.fixability).toBeGreaterThan(0);
    expect(report.rankedProblems[0]?.dimensions.protectedDomainRisk).toBeGreaterThan(0);
    expect(report.summary.providerRuntimeProofCount).toBe(0);
    expect(report.summary.staleGeneratedSnapshotCount).toBe(1);
    expect(report.summary.byQueueCategory.external_proof_required).toBe(1);
    expect(report.summary.byQueueCategory.archive_stale_evidence).toBe(1);
    expect(report.compactQueue.external_proof_required[0]?.id).toBe("payment_entitlement_ui_server_import");
  });

  it("ranks complete rank input instead of only compact emitted examples", () => {
    const lowRiskFindings = Array.from({ length: 100 }, (_, index) =>
      finding({
        id: `low_${index}`,
        ruleId: "signal.source-graph.unknown-owner-lane",
        title: `Low-risk unknown owner ${index}`,
        severity: "minor",
        sourceSurface: "repo_intelligence",
        ownerLane: "agent_context",
        affectedFiles: [{ path: `scripts/agent/helper-${index}.ts`, role: "primary" }],
        minimalVerificationCommands: [],
      }),
    );
    const highRisk = finding({
      id: "high_risk_hidden_after_cap",
      ruleId: "signal.source-graph.ui-server-import",
      title: "Hidden high-risk payment UI imports server logic.",
      severity: "critical",
      sourceSurface: "wallet_economy_payment",
      ownerLane: "frontend",
      affectedFiles: [
        { path: "src/components/Wallet/CheckoutButton.tsx", role: "primary" },
        { path: "src/lib/server/payment-ledger.ts", role: "adjacent" },
      ],
    });

    const report = buildSignalProblemRankReport({
      sourceGraph: {
        schemaVersion: SIGNAL_FINDING_SCHEMA_VERSION,
        generatedAtUtc: "2026-06-07T00:00:00.000Z",
        reportPath: "agent/state/signal-source-graph.generated.json",
        gitStatus: "available",
        sourceFileDiscovery: "git",
        toolingDegraded: false,
        degradationReason: null,
        inventoryBaselineStatus: "current",
        summary: {
          findingCount: 101,
          byRule: {},
          byOwnerLane: {},
          bySourceSurface: {},
        },
        findings: {
          totalCount: 101,
          emittedCount: 100,
          examples: lowRiskFindings,
          topRiskExamples: [highRisk],
        },
        rankInputFindings: [...lowRiskFindings, highRisk],
      },
      canonicalHelpers: [],
      packageScripts: { "signal:rank": "tsx scripts/agent/rank-signal-problems.ts" },
    });

    expect(report.summary.sourceFindingCount).toBe(101);
    expect(report.summary.rankInputFindingCount).toBe(101);
    expect(report.rankedProblems.some((problem) => problem.id === "high_risk_hidden_after_cap")).toBe(true);
    expect(report.rankedProblems[0]?.id).toBe("high_risk_hidden_after_cap");
  });

  it("adds degraded source-discovery caveats to ranked findings", () => {
    const sourceGraph = {
      schemaVersion: SIGNAL_FINDING_SCHEMA_VERSION,
      generatedAtUtc: "2026-06-07T00:00:00.000Z",
      reportPath: "agent/state/signal-source-graph.generated.json",
      gitStatus: "missing" as const,
      sourceFileDiscovery: "repo_inventory" as const,
      toolingDegraded: true,
      degradationReason: "spawnSync git ENOENT",
      inventoryBaselineStatus: "unknown" as const,
      summary: {
        findingCount: 1,
        byRule: {},
        byOwnerLane: {},
        bySourceSurface: {},
      },
      findings: {
        totalCount: 1,
        emittedCount: 1,
        examples: [
          finding({
            id: "degraded_orphan",
            ruleId: "signal.source-graph.orphan-candidate",
            title: "Potential orphan from fallback inventory.",
            sourceSurface: "repo_intelligence",
            ownerLane: "agent_context",
            affectedFiles: [{ path: "scripts/agent/maybe-orphan.ts", role: "primary" }],
          }),
        ],
        topRiskExamples: [],
      },
    };

    const report = buildSignalProblemRankReport({
      sourceGraph,
      canonicalHelpers: [],
      packageScripts: { "signal:rank": "tsx scripts/agent/rank-signal-problems.ts" },
    });

    expect(report.rankedProblems[0]?.sourceTruthCaveat).toContain("Source discovery was degraded");
    expect(report.rankedProblems[0]?.sourceTruthCaveat).toContain("repo_inventory");
  });
});
