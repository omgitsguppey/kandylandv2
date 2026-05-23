import { describe, expect, it } from "vitest";

import {
  groupDebugSignals,
  summarizeDebugSignalGroups,
  validateDebugSignalGroups,
} from "@/lib/debug/debug-signal-grouping";

describe("debug signal grouping", () => {
  it("groups duplicate missing-materializer signals by root cause instead of raw row count", () => {
    const signals = Array.from({ length: 80 }, (_, index) => ({
      signalId: `missing-materializer-${index}`,
      signalType: "missing_materializer",
      severity: "p1" as const,
      actionability: "score_impacting" as const,
      rootCause: "missing_materializer",
      materializerLane: "event_fact_to_person_metric",
      featureId: `feature-${index}`,
      eventFamily: "activity",
      scoreDimensionsAffected: ["evidenceCompleteness" as const],
      estimatedPointImpact: 4,
      owner: "analytics",
      nextAction: "Map event_fact_to_person_metric materializer before treating these events as hydrated.",
      sourceFiles: ["src/lib/analytics/person-metrics-hydration.ts"],
      validator: "npm run check:person-metrics-hydration",
    }));

    const groups = groupDebugSignals(signals);
    const summary = summarizeDebugSignalGroups(groups, signals.length);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      count: 80,
      rootCause: "missing_materializer",
      actionability: "score_impacting",
      hiddenByDefault: false,
      estimatedPointImpact: 4,
      nextAction: "Map event_fact_to_person_metric materializer before treating these events as hydrated.",
    });
    expect(groups[0].examples).toHaveLength(5);
    expect(summary.rawSignalCount).toBe(80);
    expect(summary.groupedSignalCount).toBe(1);
    expect(summary.p1GroupCount).toBe(1);
    expect(summary.rawP1P2SignalCount).toBe(80);
  });

  it("collapses quiet future activity into one hidden catalog group", () => {
    const signals = Array.from({ length: 400 }, (_, index) => ({
      signalId: `future-activity-${index}`,
      signalType: "future_activity",
      severity: "info" as const,
      actionability: "quiet_future_activity" as const,
      rootCause: "future_activity_placeholder",
      featureId: `feature-${index}`,
      eventFamily: "future_activity",
      scoreDimensionsAffected: [],
      estimatedPointImpact: 0,
      owner: "telemetry",
      nextAction: "No operator action until real user activity exists.",
      sourceFiles: ["agent/state/future-activity-signal-reclassification.generated.json"],
      validator: "npm run check:future-activity-signal-reclassification",
    }));

    const groups = groupDebugSignals(signals);
    const summary = summarizeDebugSignalGroups(groups, signals.length);

    expect(groups).toHaveLength(1);
    expect(groups[0].hiddenByDefault).toBe(true);
    expect(groups[0].count).toBe(400);
    expect(groups[0].groupLabel).toContain("Future activity catalog");
    expect(groups[0].examples).toHaveLength(5);
    expect(summary.quietFutureActivityGroupCount).toBe(1);
    expect(summary.actionableFutureActivitySignalCount).toBe(0);
    expect(summary.p1GroupCount).toBe(0);
    expect(summary.p2GroupCount).toBe(0);
  });

  it("keeps unique critical issues individual", () => {
    const groups = groupDebugSignals([
      {
        signalId: "critical-runtime-a",
        signalType: "runtime_error",
        severity: "critical",
        actionability: "fix_now",
        rootCause: "route_crash",
        featureId: "admin_debug",
        scoreDimensionsAffected: ["runtimeHealth"],
        estimatedPointImpact: 10,
        owner: "platform",
        nextAction: "Fix the admin debug route crash.",
        sourceFiles: ["src/app/api/admin/debug/route.ts"],
      },
      {
        signalId: "critical-runtime-b",
        signalType: "runtime_error",
        severity: "critical",
        actionability: "fix_now",
        rootCause: "route_crash",
        featureId: "admin_debug",
        scoreDimensionsAffected: ["runtimeHealth"],
        estimatedPointImpact: 10,
        owner: "platform",
        nextAction: "Fix the second admin debug route crash.",
        sourceFiles: ["src/app/api/admin/debug/route.ts"],
      },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.every((group) => group.count === 1 && group.hiddenByDefault === false)).toBe(true);
  });

  it("groups formal gate duplicates by gate and keeps them visible as evidence work", () => {
    const groups = groupDebugSignals([
      {
        signalId: "provider-smoke-a",
        signalType: "formal_gate",
        severity: "p1",
        actionability: "formal_gate",
        rootCause: "blocked_formal_evidence",
        gateId: "provider_runtime_smoke",
        scoreDimensionsAffected: ["runtimeHealth"],
        estimatedPointImpact: 16.33,
        owner: "runtime_evidence",
        nextAction: "Attach formal provider/runtime smoke evidence.",
        sourceFiles: ["agent/state/public-beta-score.generated.json"],
      },
      {
        signalId: "provider-smoke-b",
        signalType: "formal_gate",
        severity: "p1",
        actionability: "formal_gate",
        rootCause: "blocked_formal_evidence",
        gateId: "provider_runtime_smoke",
        scoreDimensionsAffected: ["evidenceCompleteness"],
        estimatedPointImpact: 4.5,
        owner: "runtime_evidence",
        nextAction: "Attach formal provider/runtime smoke evidence.",
        sourceFiles: ["agent/state/debug-runtime-evidence.generated.json"],
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      actionability: "formal_gate",
      rootCause: "blocked_formal_evidence",
      count: 2,
      hiddenByDefault: false,
      estimatedPointImpact: 16.33,
    });
    expect(groups[0].scoreDimensionsAffected).toEqual(["runtimeHealth", "evidenceCompleteness"]);
    expect(validateDebugSignalGroups(groups, 2)).toEqual([]);
  });
});
