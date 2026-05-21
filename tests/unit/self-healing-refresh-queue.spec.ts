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

  it("blocks formal evidence refreshes instead of suggesting fake automated proof", () => {
    const report = buildSelfHealingRefreshQueue({
      refreshPlan: [],
      scoreImpactArtifacts: [
        {
          id: "runtime_provider_smoke",
          status: "Runtime unverified: Runtime/provider smoke",
          pointImpact: 16.33,
          refreshCommand: "Attach formal provider smoke evidence, then run npm run check:evidence-capture-status",
        },
      ],
    });

    expect(report.queue[0]).toMatchObject({
      artifact: "runtime_provider_smoke",
      canRunAutomatically: false,
      blockedReason: expect.stringContaining("Formal evidence artifact required"),
    });
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
