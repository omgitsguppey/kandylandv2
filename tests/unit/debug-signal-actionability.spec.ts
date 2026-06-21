import { describe, expect, it } from "vitest";

import {
  classifyDebugSignalActionability,
  scoreDebugSignalActionability,
  summarizeDebugSignalActionability,
} from "@/lib/debug/debug-signal-actionability";
import {
  buildDebugBacklog,
  summarizeDebugBacklog,
  validateDebugBacklog,
} from "@/lib/debug/debug-backlog-builder";

describe("debug signal actionability", () => {
  it("keeps quiet future activity out of default P1/P2 debug work", () => {
    const scored = classifyDebugSignalActionability({
      signalId: "future-wallet-open",
      signalType: "future_activity",
      severity: "p1",
      sourceMessage: "future_real_activity_pending",
      scoreImpact: 99,
      scoreDimensionsAffected: ["runtimeHealth"],
      owner: "telemetry",
      nextAction: "Bridge is wired; wait for real user activity.",
    });

    expect(scored.actionability).toBe("quiet_future_activity");
    expect(scored.severity).toBe("info");
    expect(scored.defaultVisible).toBe(false);
    expect(scored.estimatedPointImpact).toBe(0);
    expect(scored.scoreDimensionsAffected).toEqual([]);
  });

  it("classifies formal_gate evidence lanes separately from telemetry bugs", () => {
    const scored = classifyDebugSignalActionability({
      signalId: "provider-smoke",
      signalType: "telemetry",
      severity: "p1",
      evidenceStatus: "runtime_unverified",
      scoreDimensionsAffected: ["runtimeHealth"],
      scoreImpact: 16.33,
      owner: "provider_evidence",
      nextAction: "Attach redacted provider-backed site activity evidence and deployed route evidence.",
      sourceMessage: "Provider-backed site activity and deployed route evidence remain missing.",
    });

    expect(scored.actionability).toBe("formal_gate");
    expect(scored.signalType).toBe("formal_gate");
    expect(scored.defaultVisible).toBe(true);
    expect(scored.estimatedPointImpact).toBe(16.33);
    expect(scored.nextAction).toContain("provider-backed site activity");
    expect(scored.nextAction).not.toMatch(/formal provider smoke|runtime\/provider smoke/iu);
  });

  it("collapses duplicate debug signals under one parent and keeps score impact on the parent", () => {
    const summary = summarizeDebugSignalActionability([
      {
        signalId: "runtime-smoke-a",
        dedupeKey: "runtime-smoke",
        signalType: "beta_score",
        severity: "p1",
        scoreDimensionsAffected: ["runtimeHealth"],
        scoreImpact: 10,
        owner: "runtime_evidence",
        nextAction: "Attach deployed route evidence.",
      },
      {
        signalId: "runtime-smoke-b",
        dedupeKey: "runtime-smoke",
        signalType: "debug_panel",
        severity: "p2",
        scoreDimensionsAffected: ["runtimeHealth"],
        scoreImpact: 2,
        owner: "admin_debug",
        nextAction: "Same deployed route evidence blocker.",
      },
    ]);

    expect(summary.totalSignals).toBe(2);
    expect(summary.uniqueSignals).toBe(1);
    expect(summary.duplicateSignalCount).toBe(1);
    expect(summary.defaultVisibleSignals).toHaveLength(1);
    expect(summary.defaultVisibleSignals[0]).toMatchObject({
      signalId: "runtime-smoke-a",
      actionability: "score_impacting",
      estimatedPointImpact: 10,
      duplicateChildren: ["runtime-smoke-b"],
    });
  });

  it("requires owner, next action, and point impact for score-impacting signals", () => {
    const failures = scoreDebugSignalActionability([
      {
        signalId: "missing-impact",
        signalType: "debug_panel",
        severity: "p1",
        scoreDimensionsAffected: ["evidenceCompleteness"],
        scoreImpact: 0,
        owner: "",
        nextAction: "",
      },
    ]).validationFailures;

    expect(failures).toEqual(expect.arrayContaining([
      expect.stringContaining("lacks owner"),
      expect.stringContaining("lacks nextAction"),
      expect.stringContaining("lacks estimatedPointImpact"),
    ]));
  });

  it("passes debug backlog items through actionability scoring before summary", () => {
    const backlog = buildDebugBacklog({
      publicBetaScore: {
        runtimeHealthScore: 67.75,
        evidenceCompletenessScore: 39.25,
        evidenceCapDetails: [
          "Source evidence required: Provider-backed site activity + deployed route evidence - Provider-backed site activity and deployed route evidence are missing.",
        ],
      },
      debugPanelItems: [
        {
          key: "future_activity_catalog",
          label: "Future activity catalog",
          uiTruthState: "review",
          issue: "future_real_activity_pending",
          recommendedAction: "No action needed until real user activity exists.",
          sourceArtifact: "agent/state/future-activity-signal-reclassification.generated.json",
          owningValidator: "npm run check:future-activity-signal-reclassification",
        },
      ],
    });

    const summary = summarizeDebugBacklog(backlog);
    const quiet = backlog.find((item) => item.id === "debug-panel-future-activity-catalog");
    const formal = backlog.find((item) => item.id.startsWith("beta-cap-source-evidence-required-provider-backed-site-activity-deployed-route-evidence"));

    expect(quiet?.actionability).toBe("quiet_future_activity");
    expect(quiet?.severity).toBe("info");
    expect(quiet?.defaultVisible).toBe(false);
    expect(formal?.actionability).toBe("formal_gate");
    expect(formal?.source).toBe("beta_score");
    expect(summary.defaultVisible).toBe(1);
    expect(summary.quietFutureActivity).toBe(1);
    expect(summary.p0P1Open).toBe(1);
    expect(JSON.stringify(backlog)).not.toMatch(/formal provider smoke|runtime\/provider smoke|deployed runtime smoke/iu);
    expect(validateDebugBacklog(backlog)).toEqual([]);
  });
});
