import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  classifyFormalGate,
  isFormalGateSourceFix,
} from "@/lib/agent-score/formal-gate-classifier";
import {
  buildDebugOperatorCockpit,
  validateDebugOperatorCockpit,
  type DebugOperatorCockpitInput,
} from "@/lib/debug/debug-operator-cockpit";

function readJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, any>;
}

const cockpitInput: DebugOperatorCockpitInput = {
  scoreImpactQueue: [
    {
      artifact: "runtime_provider_smoke",
      staleReason: "Provider-backed site activity + deployed route evidence required",
      refreshCommand: "Attach redacted provider-backed site activity evidence, then run npm run check:evidence-capture-status",
      scoreImpactEstimate: 16.33,
      owner: "runtime",
      dependencyOrder: 1,
      canRunAutomatically: false,
      blockedReason: "blocked_formal_evidence: provider-backed site activity evidence required.",
      source: "score_impact",
      expectedOutcome: "Remain blocked until redacted provider-backed site activity evidence is attached.",
    },
    {
      artifact: "agent/state/score-80-path-lock.generated.json",
      staleReason: "source_backed",
      refreshCommand: "npm run check:beta-score",
      scoreImpactEstimate: 12,
      owner: "repo",
      dependencyOrder: 2,
      canRunAutomatically: true,
      blockedReason: "",
      source: "score_impact",
      expectedOutcome: "Refresh score-impact artifact and reduce freshness/regression drag if validation passes.",
    },
    {
      artifact: "agent/state/telemetry-parity-score.generated.json",
      staleReason: "clean_current",
      refreshCommand: "npm run check:telemetry-parity-score",
      scoreImpactEstimate: 0,
      owner: "telemetry",
      dependencyOrder: 3,
      canRunAutomatically: true,
      blockedReason: "",
      source: "score_impact",
      expectedOutcome: "Telemetry parity is current and clean.",
    },
    {
      artifact: "agent/state/public-beta-score.generated.json",
      staleReason: "stale",
      refreshCommand: "npm run score:beta && npm run check:beta-score",
      scoreImpactEstimate: 4,
      owner: "beta",
      dependencyOrder: 4,
      canRunAutomatically: true,
      blockedReason: "",
      source: "refresh_plan",
      expectedOutcome: "Refresh canonical beta score.",
    },
  ],
  criticalRuntimeWarnings: [
    {
      id: "runtime-provider-smoke",
      severity: "p1",
      owner: "runtime",
      message: "Provider-backed site activity + deployed route evidence required",
      nextAction: "Attach redacted provider-backed site activity evidence and deployed route evidence before clearing this beta gate.",
      truthState: "degraded",
    },
    {
      id: "route-debug-source-failure",
      severity: "p1",
      owner: "admin_debug",
      message: "Admin debug route returns source-backed route failure",
      nextAction: "Fix the route diagnostic source path.",
      truthState: "failed",
    },
  ],
  adminTruthStatus: {
    state: "degraded",
    label: "Admin source activity sample: source_ready_sample_required",
    nextAction: "Attach a redacted admin source activity sample before clearing the admin source sample gate.",
  },
  telemetryLaneStatus: {
    state: "live",
    label: "Telemetry parity: clean_current",
    nextAction: "Keep telemetry parity in drilldown; no fix-first action remains.",
  },
  costOwnerReviewLanes: [
    {
      id: "google-cost",
      owner: "cost",
      label: "Google cost external review remaining",
      state: "live",
      nextAction: "Keep external billing review collapsed until an owner artifact exists.",
    },
  ],
  aiCriticFindings: [
    {
      id: "no_patch_on_top_of_stale_logic",
      severity: "warning",
      title: "Stale debug logic is still active",
      requiredFix: "Open stale backlog items are refresh/formal/operator confirmation work; no source changes requested.",
    },
  ],
  recoveryPlaybooks: [
    {
      id: "stale_artifact_recovery",
      title: "Stale Artifact Recovery",
      triggerPatterns: ["refreshPlan.needsRefresh=true"],
      commands: ["npm run score:beta"],
      validators: ["npm run check:beta-score"],
      forbiddenActions: ["no_production_reads"],
    },
  ],
};

describe("debug cockpit batch 1 cleanup", () => {
  it("classifies source evidence gates as non-source bugs", () => {
    const runtimeGate = classifyFormalGate({
      id: "runtime_provider_smoke",
      label: "Provider-backed site activity + deployed route evidence",
      statusText: "Runtime unverified",
      nextAction: "Produce provider-backed site activity evidence.",
    });

    expect(runtimeGate.status).toBe("provider_artifact_required");
    expect(runtimeGate.queueClassification).toBe("formal_evidence");
    expect(isFormalGateSourceFix(runtimeGate)).toBe(false);
  });

  it("keeps formal, clean, retired, and external review lanes out of fix-first cockpit sections", () => {
    const cockpit = buildDebugOperatorCockpit(cockpitInput, {
      generatedAtUtc: "2026-05-24T12:00:00.000Z",
      currentHead: "abc123",
    });

    const scoreQueue = cockpit.defaultSections.find((section) => section.id === "score_impact_queue");
    const staleQueue = cockpit.defaultSections.find((section) => section.id === "stale_artifact_refresh_queue");
    const warnings = cockpit.defaultSections.find((section) => section.id === "critical_runtime_debug_warnings");
    const cost = cockpit.defaultSections.find((section) => section.id === "cost_owner_review_lanes");
    const critic = cockpit.defaultSections.find((section) => section.id === "ai_critic_requested_changes");
    const recovery = cockpit.defaultSections.find((section) => section.id === "recovery_playbook_cta");

    expect(JSON.stringify(scoreQueue?.items)).not.toContain("runtime_provider_smoke");
    expect(JSON.stringify(scoreQueue?.items)).not.toContain("score-80-path-lock");
    expect(JSON.stringify(scoreQueue?.items)).not.toContain("telemetry-parity-score");
    expect(staleQueue?.items).toHaveLength(1);
    expect(JSON.stringify(staleQueue?.items)).toContain("public-beta-score");
    expect(JSON.stringify(warnings?.items)).not.toContain("Runtime unverified");
    expect(JSON.stringify(cockpit)).not.toMatch(/runtime\/provider smoke|formal provider smoke|deployed runtime smoke|first-party admin sample|formal gate/iu);
    expect(cost?.state).toBe("live");
    expect(cost?.scoreImpactEstimate).toBe(0);
    expect(critic?.state).toBe("live");
    expect(recovery?.state).toBe("live");
    expect(validateDebugOperatorCockpit(cockpit)).toEqual([]);
  });

  it("writes a batch report with retired artifacts and source-ready formal sample status", () => {
    const report = readJson("agent/state/debug-cockpit-batch1-cleanup.generated.json");

    expect(report.adminTruthStatusAfter).toBe("source_ready_formal_sample_required");
    expect(report.telemetryParityStatusAfter).toBe("clean_current");
    expect(report.aiCriticStatusAfter).toMatch(/pass_with_formal_backlog_visible|no_source_changes_requested/);
    expect(report.costLaneDisplayStatus).toBe("collapsed_external_review_remaining");
    expect(report.scoreImpactingStaleArtifactCount).toBe(0);
    expect(report.staleArtifactsRetired).toEqual(expect.arrayContaining([
      expect.objectContaining({ artifact: "agent/state/score-80-path-lock.generated.json" }),
      expect.objectContaining({ artifact: "agent/state/final-launch-readiness-report.generated.json" }),
    ]));
    expect(JSON.stringify(report)).not.toMatch(/formal provider smoke|runtime\/provider smoke|deployed runtime smoke|first-party admin sample|formal admin truth gate/iu);
  });
});
