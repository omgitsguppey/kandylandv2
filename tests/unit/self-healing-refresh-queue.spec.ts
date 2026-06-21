import { describe, expect, it } from "vitest";

import {
  buildSelfHealingRefreshQueue,
  validateSelfHealingRefreshQueue,
  type SelfHealingRefreshQueueReport,
} from "@/lib/agent-score/self-healing-refresh-queue";
import type { ArtifactRefreshStatus } from "@/lib/agent-score/refresh-safeguards";

function staleArtifact(input: Partial<ArtifactRefreshStatus> & { artifactPath: string; refreshCommand: string }): ArtifactRefreshStatus {
  return {
    artifactPath: input.artifactPath,
    reportKey: input.reportKey ?? input.artifactPath.replace(/^agent\/state\//u, "").replace(/\.generated\.json$/u, ""),
    label: input.label ?? input.artifactPath,
    status: input.status ?? "stale_source_version",
    needsRefresh: true,
    refreshCommand: input.refreshCommand,
    owner: input.owner ?? "evidence",
    maxAgeHours: input.maxAgeHours ?? 24,
    message: input.message ?? "Artifact is stale.",
    nextAction: input.nextAction ?? `Run: ${input.refreshCommand}`,
    formalEvidenceGateCanClear: false,
  };
}

describe("self-healing refresh queue", () => {
  it("orders stale score-impact artifacts with commands, owners, and score impact", () => {
    const report = buildSelfHealingRefreshQueue({
      refreshPlan: [
        staleArtifact({
          artifactPath: "agent/state/beta-evidence-gap-map.generated.json",
          refreshCommand: "npm run check:beta-evidence-gap-map",
          owner: "evidence",
        }),
        staleArtifact({
          artifactPath: "agent/state/overnight-final-integration-lock.generated.json",
          refreshCommand: "npm run check:overnight-final-integration-lock",
          owner: "repo",
        }),
      ],
      scoreImpactArtifacts: [
        {
          id: "agent/state/overnight-final-integration-lock.generated.json",
          pointImpact: 2,
          refreshCommand: "npm run check:overnight-final-integration-lock",
        },
        {
          id: "agent/state/beta-evidence-gap-map.generated.json",
          pointImpact: 1.8,
          refreshCommand: "npm run check:beta-evidence-gap-map",
        },
      ],
    });

    expect(report.queue.map((entry) => entry.artifact)).toEqual([
      "agent/state/overnight-final-integration-lock.generated.json",
      "agent/state/beta-evidence-gap-map.generated.json",
    ]);
    expect(report.queue[0]).toMatchObject({
      dependencyOrder: 1,
      canRunAutomatically: true,
      scoreImpactEstimate: 2,
      owner: "repo",
    });
    expect(report.queue[1].dependencyOrder).toBe(2);
    expect(validateSelfHealingRefreshQueue(report)).toEqual([]);
  });

  it("blocks source evidence lanes instead of suggesting fake automated proof", () => {
    const report = buildSelfHealingRefreshQueue({
      refreshPlan: [],
      scoreImpactArtifacts: [
        {
          id: "runtime_provider_smoke",
          status: "Runtime unverified: Runtime/provider smoke",
          pointImpact: 16.33,
          refreshCommand: "Produce provider-backed site activity evidence, then run npm run check:evidence-capture-status",
        },
      ],
    });

    expect(report.queue[0]).toMatchObject({
      artifact: "runtime_provider_smoke",
      staleReason: "Provider-backed site activity required",
      canRunAutomatically: false,
      blockedReason: expect.stringContaining("provider-backed site activity evidence required"),
    });
    expect(JSON.stringify(report)).not.toContain("Runtime unverified:");
    expect(JSON.stringify(report)).not.toContain("Unknown evidence:");
    expect(validateSelfHealingRefreshQueue(report)).toEqual([]);
  });

  it("routes UI evidence requests into deterministic source coverage", () => {
    const report = buildSelfHealingRefreshQueue({
      refreshPlan: [],
      scoreImpactArtifacts: [
        {
          id: "agent/state/ui-visual-smoke-minimal.generated.json",
          status: "blocked_source_evidence: targeted visual source evidence required",
          pointImpact: 2,
          refreshCommand: "Produce UI source coverage evidence, then run npm run check:evidence-capture-status",
        },
      ],
    });

    expect(report.queue[0]).toMatchObject({
      artifact: "agent/state/ui-visual-smoke-minimal.generated.json",
      staleReason: "UI source coverage required",
      refreshCommand: "npm run check:ui-visual-smoke-minimal",
      canRunAutomatically: true,
      blockedReason: "",
    });
    expect(JSON.stringify(report)).not.toContain("screenshot required");
    expect(validateSelfHealingRefreshQueue(report)).toEqual([]);
  });

  it("normalizes UI evidence requests into source coverage without touching provider evidence lanes", () => {
    const report = buildSelfHealingRefreshQueue({
      refreshPlan: [],
      scoreImpactArtifacts: [
        {
          id: "ui_source_coverage",
          status: "source evidence required for mobile UI surface",
          pointImpact: 2,
          refreshCommand: "Produce UI source coverage evidence, then run npm run check:evidence-capture-status",
        },
        {
          id: "provider_source_evidence",
          status: "source evidence required for provider-backed site activity",
          pointImpact: 4,
          refreshCommand: "Produce provider-backed site activity evidence, then run npm run check:evidence-capture-status",
        },
      ],
    });

    expect(report.queue.find((entry) => entry.artifact === "ui_source_coverage")).toMatchObject({
      staleReason: "UI source coverage required",
      refreshCommand: "npm run check:ui-visual-smoke-minimal",
      canRunAutomatically: true,
      blockedReason: "",
    });
    expect(report.queue.find((entry) => entry.artifact === "provider_source_evidence")).toMatchObject({
      staleReason: "Provider-backed site activity required",
      canRunAutomatically: false,
      blockedReason: expect.stringContaining("provider-backed site activity evidence required"),
    });
    expect(JSON.stringify(report)).not.toContain("manual visual");
    expect(validateSelfHealingRefreshQueue(report)).toEqual([]);
  });

  it("blocks hyphenated formal proof artifact paths from automatic refresh", () => {
    const report = buildSelfHealingRefreshQueue({
      refreshPlan: [],
      scoreImpactArtifacts: [
        {
          id: "agent/state/provider-smoke-evidence.generated.json",
          status: "stale",
          pointImpact: 4,
          refreshCommand: "npm run check:provider-smoke-evidence",
        },
        {
          id: "agent/state/runtime-smoke-evidence.generated.json",
          status: "stale",
          pointImpact: 3,
          refreshCommand: "npm run check:runtime-smoke-evidence",
        },
        {
          id: "agent/state/admin-truth-sample-evidence.generated.json",
          status: "stale",
          pointImpact: 2,
          refreshCommand: "npm run check:admin-truth-sample-evidence",
        },
      ],
    });

    expect(report.queue).toEqual([
      expect.objectContaining({
        artifact: "agent/state/provider-smoke-evidence.generated.json",
        staleReason: "Provider-backed site activity required",
        canRunAutomatically: false,
        blockedReason: expect.stringContaining("provider-backed site activity evidence required"),
      }),
      expect.objectContaining({
        artifact: "agent/state/runtime-smoke-evidence.generated.json",
        staleReason: "Deployed runtime route evidence required",
        canRunAutomatically: false,
        blockedReason: expect.stringContaining("deployed runtime route evidence required"),
      }),
      expect.objectContaining({
        artifact: "agent/state/admin-truth-sample-evidence.generated.json",
        staleReason: "Admin source activity sample required",
        canRunAutomatically: false,
        blockedReason: expect.stringContaining("redacted admin source activity sample required"),
      }),
    ]);
    expect(report.summary).toMatchObject({
      total: 3,
      automatic: 0,
      blocked: 3,
    });
    expect(validateSelfHealingRefreshQueue(report)).toEqual([]);
  });

  it("uses registered refresh commands for score-impact artifacts that omit commands", () => {
    const report = buildSelfHealingRefreshQueue({
      refreshPlan: [],
      scoreImpactArtifacts: [
        {
          id: "agent/state/current-beta-exit-status.generated.json",
          status: "stale_source_version",
          pointImpact: 1,
        },
      ],
    });

    expect(report.queue[0]).toMatchObject({
      artifact: "agent/state/current-beta-exit-status.generated.json",
      refreshCommand: "npm run check:current-beta-exit-status",
      canRunAutomatically: true,
    });
    expect(validateSelfHealingRefreshQueue(report)).toEqual([]);
  });

  it("does not queue stale score-impact aliases when the registered artifact is already current", () => {
    const report = buildSelfHealingRefreshQueue({
      currentArtifactPaths: ["agent/state/public-beta-score.generated.json"],
      refreshPlan: [],
      scoreImpactArtifacts: [
        {
          id: "agent/state/public-beta-score.generated.json",
          status: "unknown",
          pointImpact: 43.4,
          refreshCommand: "npm run check:beta-score",
        },
        {
          id: "agent/state/score-80-path-lock.generated.json",
          status: "source_backed",
          pointImpact: 12,
          refreshCommand: "npm run check:beta-score",
        },
      ],
    });

    expect(report.queue.map((entry) => entry.artifact)).toEqual([
      "agent/state/score-80-path-lock.generated.json",
    ]);
    expect(validateSelfHealingRefreshQueue(report)).toEqual([]);
  });

  it("rejects missing impact, missing order, and forbidden commands", () => {
    const invalid: SelfHealingRefreshQueueReport = {
      generatedAtUtc: "2026-05-21T12:00:00.000Z",
      reportKey: "self-healing-refresh-queue",
      currentHead: "abc",
      sourceCommit: "abc",
      overallStatus: "pass",
      queue: [
        {
          artifact: "agent/state/bad.generated.json",
          staleReason: "stale_source_version",
          refreshCommand: "firebase deploy",
          scoreImpactEstimate: 0,
          owner: "repo",
          dependencyOrder: 0,
          canRunAutomatically: true,
          blockedReason: "",
          source: "refresh_plan",
          expectedOutcome: "Refresh artifact.",
        },
      ],
      summary: {
        total: 1,
        automatic: 1,
        blocked: 0,
        totalScoreImpactEstimate: 0,
      },
      integration: {
        betaScoreRefreshPlan: true,
        debugBacklog: true,
        adminDebugPanelSource: true,
        finalLockReports: true,
      },
      validationFailures: [],
    };

    expect(validateSelfHealingRefreshQueue(invalid)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("lacks dependency ordering"),
        expect.stringContaining("has no score impact estimate"),
        expect.stringContaining("contains forbidden command"),
      ]),
    );
  });
});
