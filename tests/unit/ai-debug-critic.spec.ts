import { describe, expect, it } from "vitest";

import {
  AI_DEBUG_CRITIC_CHECKS,
  buildAiDebugCriticReport,
  summarizeAiDebugCritic,
} from "@/lib/debug/ai-debug-critic";

describe("ai debug critic", () => {
  it("blocks fake evidence, duplicate systems, protected files, monolith growth, and orphaned telemetry", () => {
    const report = buildAiDebugCriticReport({
      changedFiles: [
        "src/components/Navigation/Navbar.tsx",
        "src/app/api/paypal/capture/route.ts",
        "src/lib/debug/new-debug-backlog-copy.ts",
        "src/lib/analytics/new-telemetry-sidepath.ts",
        "src/components/AdminHugePanel.tsx",
      ],
      fileLineCounts: {
        "src/components/AdminHugePanel.tsx": 735,
      },
      proposedFixSummary: "Clears provider smoke and runtime proof from source validators only.",
      debugBacklog: [
        {
          id: "provider-smoke",
          title: "Provider smoke missing",
          owner: "evidence",
          surface: "runtime",
          severity: "p1",
          source: "beta_score",
          status: "open",
          fixClass: "evidence_refresh",
          scoreDimensionImpact: ["runtimeHealth", "evidenceCompleteness"],
          scoreImpact: 12,
          sourceFiles: ["agent/state/provider-smoke-evidence.generated.json"],
          sourceRoute: "runtime/provider-smoke",
          evidenceStatus: "formal_missing",
          evidenceReason: "Formal provider artifact is missing.",
          exactNextAction: "Run the formal provider smoke artifact lane.",
          sourceMessage: "Runtime unverified.",
        },
      ],
      betaScoreBlockers: [
        {
          id: "runtime-provider-smoke",
          label: "Runtime/provider smoke",
          evidenceStatus: "formal_missing",
          requiredArtifact: "agent/state/provider-smoke-evidence.generated.json",
        },
      ],
      evidenceStatus: {
        formalArtifacts: [],
        sourceOnlyClaims: ["provider smoke", "runtime proof"],
      },
      telemetryGraph: {
        canonicalEventFiles: ["src/lib/behavioral/event-fact-normalizer.ts"],
        changedTelemetryFiles: ["src/lib/analytics/new-telemetry-sidepath.ts"],
      },
      validatorMap: {
        suggestedValidators: ["npm run check:beta-score"],
      },
    });

    expect(report.criticStatus).toBe("blocked");
    expect(report.findings.map((finding) => finding.check)).toEqual(expect.arrayContaining([
      "no_fake_evidence",
      "no_formal_gate_cleared_without_artifact",
      "no_duplicate_systems",
      "no_chat_nav_touch_without_explicit_request",
      "no_payment_math_change_without_explicit_request",
      "no_monolith_growth_without_split_plan",
      "no_orphaned_telemetry",
      "no_source_ready_as_runtime_proof",
    ]));
    expect(report.unsafeChanges).toContain("src/components/Navigation/Navbar.tsx");
    expect(report.unsafeChanges).toContain("src/app/api/paypal/capture/route.ts");
    expect(report.duplicateSystems).toContain("src/lib/debug/new-debug-backlog-copy.ts");
    expect(report.monolithRisks[0]?.file).toBe("src/components/AdminHugePanel.tsx");
    expect(report.evidenceMisclassificationRisks.length).toBeGreaterThan(0);
    expect(report.findings.find((finding) => finding.check === "no_fake_evidence")?.actionClass).toBe("blocked_formal_evidence");
    expect(report.suggestedValidators).toEqual(expect.arrayContaining([
      "npm run check:ai-debug-critic",
      "npm run check:beta-score",
    ]));
  });

  it("does not request source changes for formal-only stale evidence gates", () => {
    const report = buildAiDebugCriticReport({
      changedFiles: ["src/lib/debug/ai-debug-critic.ts"],
      proposedFixSummary: "Separates formal evidence gates from code changes without clearing runtime gates.",
      debugBacklog: [
        {
          id: "stale-runtime-smoke",
          title: "Runtime smoke is stale",
          owner: "runtime_evidence",
          surface: "runtime_evidence",
          severity: "p1",
          source: "evidence",
          status: "open",
          fixClass: "evidence_refresh",
          scoreDimensionImpact: ["runtimeHealth"],
          scoreImpact: 16,
          sourceFiles: ["agent/state/runtime-smoke-evidence.generated.json"],
          sourceRoute: "agent/state/runtime-smoke-evidence.generated.json",
          evidenceStatus: "stale",
          evidenceReason: "Formal runtime smoke artifact is stale.",
          exactNextAction: "Attach formal deployed runtime smoke evidence before clearing this beta gate.",
          sourceMessage: "Runtime smoke is unverified.",
          refreshCommand: "npm run check:runtime-smoke-evidence",
        },
      ],
      betaScoreBlockers: [],
      evidenceStatus: {
        formalArtifacts: [],
        sourceOnlyClaims: [],
      },
    });

    expect(report.criticStatus).toBe("pass");
    expect(report.findings[0]?.check).toBe("no_patch_on_top_of_stale_logic");
    expect(report.findings[0]?.actionClass).toBe("blocked_formal_evidence");
    expect(report.findings[0]?.severity).toBe("info");
  });

  it("passes a source-only critic update with explicit validators and local-only AI behavior", () => {
    const report = buildAiDebugCriticReport({
      changedFiles: [
        "src/lib/debug/ai-debug-critic.ts",
        "scripts/agent/validate-ai-debug-critic.ts",
        "tests/unit/ai-debug-critic.spec.ts",
      ],
      proposedFixSummary: "Adds source-only critic checks without runtime provider calls.",
      debugBacklog: [],
      betaScoreBlockers: [],
      doctrineIndex: { surfaces: ["admin-debug", "ai-panel"] },
      validatorMap: {
        suggestedValidators: [
          "npm run check:ai-debug-critic",
          "npm run check:debug-evidence-pipeline",
        ],
      },
      evidenceStatus: {
        formalArtifacts: [],
        sourceOnlyClaims: [],
      },
    });

    expect(report.criticStatus).toBe("pass");
    expect(report.requiredFixes).toEqual([]);
    expect(summarizeAiDebugCritic(report).blockedFindings).toBe(0);
  });

  it("keeps every required critic check registered", () => {
    expect(AI_DEBUG_CRITIC_CHECKS.map((check) => check.id)).toEqual([
      "no_patch_on_top_of_stale_logic",
      "no_duplicate_systems",
      "no_fake_evidence",
      "no_formal_gate_cleared_without_artifact",
      "no_monolith_growth_without_split_plan",
      "no_chat_nav_touch_without_explicit_request",
      "no_payment_math_change_without_explicit_request",
      "no_unowned_debug_warning",
      "no_orphaned_telemetry",
      "no_hardcoded_ui_scale_regression",
      "no_new_cost_path_without_guard",
      "no_source_ready_as_runtime_proof",
    ]);
  });
});
