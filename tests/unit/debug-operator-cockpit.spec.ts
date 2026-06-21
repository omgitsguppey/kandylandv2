import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildDebugOperatorCockpit,
  validateDebugOperatorCockpit,
  type DebugOperatorCockpitInput,
} from "@/lib/debug/debug-operator-cockpit";

const baseInput: DebugOperatorCockpitInput = {
  scoreImpactQueue: [
    {
      artifact: "runtime_provider_smoke",
      staleReason: "runtime_unverified",
      refreshCommand: "Attach provider-backed site activity evidence, then run npm run check:evidence-capture-status",
      scoreImpactEstimate: 16.33,
      owner: "runtime",
      dependencyOrder: 1,
      canRunAutomatically: false,
      blockedReason: "Formal evidence artifact required; source queue cannot generate proof.",
      source: "score_impact",
      expectedOutcome: "Remain blocked until a human attaches the required formal artifact.",
    },
    {
      artifact: "agent/state/beta-evidence-gap-map.generated.json",
      staleReason: "stale",
      refreshCommand: "npm run check:beta-evidence-gap-map",
      scoreImpactEstimate: 1.8,
      owner: "beta",
      dependencyOrder: 2,
      canRunAutomatically: true,
      blockedReason: "",
      source: "refresh_plan",
      expectedOutcome: "Refresh generated artifact from current source.",
    },
  ],
  criticalRuntimeWarnings: [
    {
      id: "runtime-warning-1",
      severity: "critical",
      owner: "runtime",
      message: "Runtime evidence is unknown.",
      nextAction: "Attach deployed route evidence before claiming live runtime status.",
      truthState: "unknown",
    },
  ],
  adminTruthStatus: {
    state: "unknown",
    label: "Admin truth sample",
    nextAction: "Run npm run check:admin-truth-sample-evidence after artifact is attached.",
  },
  telemetryLaneStatus: {
    state: "degraded",
    label: "Telemetry lane",
    nextAction: "Run npm run check:telemetry-dependency-graph.",
  },
  costOwnerReviewLanes: [
    {
      id: "google-cost",
      owner: "cost",
      label: "Google Cost",
      state: "degraded",
      nextAction: "Run npm run check:global-cost.",
    },
  ],
  aiCriticFindings: [
    {
      id: "no_fake_evidence",
      severity: "required",
      title: "Do not fake evidence",
      requiredFix: "Keep source checks separate from runtime proof.",
    },
  ],
  recoveryPlaybooks: [
    {
      id: "fake_evidence_recovery",
      title: "Fake Evidence Recovery",
      triggerPatterns: ["source-only output described as runtime proof"],
      commands: ["npm run check:ai-debug-critic"],
      validators: ["npm run check:ai-debug-critic"],
      forbiddenActions: ["no_production_reads", "no_deploy", "no_payment_gumdrop_math_changes", "no_chat_nav_edits"],
    },
  ],
};

describe("debug operator cockpit", () => {
  it("keeps the operator cockpit in the guarded Control Tower default view", () => {
    const controlTowerSource = readFileSync(
      join(process.cwd(), "src/app/admin/debug/components/DebugControlTower.tsx"),
      "utf8",
    );

    expect(controlTowerSource).toContain("<DebugOperatorCockpit cockpit={model.operatorCockpit} />");
  });

  it("orders the default cockpit while keeping formal evidence out of source-fix sections", () => {
    const cockpit = buildDebugOperatorCockpit(baseInput, {
      generatedAtUtc: "2026-05-21T06:15:00.000Z",
      currentHead: "abc1234",
    });

    expect(cockpit.defaultSections.map((section) => section.id)).toEqual([
      "score_impact_queue",
      "critical_runtime_debug_warnings",
      "stale_artifact_refresh_queue",
      "admin_truth_status",
      "telemetry_lane_status",
      "cost_owner_review_lanes",
      "ai_critic_requested_changes",
      "recovery_playbook_cta",
    ]);
    expect(JSON.stringify(cockpit.defaultSections[0].items)).not.toContain("runtime_provider_smoke");
    expect(cockpit.defaultSections[2].items[0]).toMatchObject({
      artifact: "agent/state/beta-evidence-gap-map.generated.json",
      refreshCommand: "npm run check:beta-evidence-gap-map",
    });
    expect(cockpit.rawDumpDefaultOpen).toBe(false);
    expect(validateDebugOperatorCockpit(cockpit)).toEqual([]);
  });

  it("fails validation when unknown data lacks a next action", () => {
    const cockpit = buildDebugOperatorCockpit({
      ...baseInput,
      adminTruthStatus: {
        state: "unknown",
        label: "Admin truth sample",
        nextAction: "No action needed.",
      },
      scoreImpactQueue: [
        {
          ...baseInput.scoreImpactQueue[1],
          refreshCommand: "",
          scoreImpactEstimate: 3,
        },
      ],
    });

    expect(validateDebugOperatorCockpit(cockpit)).toEqual(expect.arrayContaining([
      expect.stringContaining("unknown shown healthy"),
    ]));
  });
});
