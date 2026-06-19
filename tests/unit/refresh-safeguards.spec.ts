import { describe, expect, it } from "vitest";

import {
  buildPlainRefreshMessage,
  buildRefreshPlan,
  classifyStaleArtifact,
  getArtifactRefreshStatus,
  getRefreshCommand,
} from "../../src/lib/agent-score/refresh-safeguards";
import { REFRESH_ARTIFACT_REGISTRY } from "../../src/lib/agent-score/refresh-registry";
import {
  buildRefreshSafeguardsReport,
  validateRefreshSafeguardsReport,
} from "../../scripts/agent/validate-refresh-safeguards";

describe("refresh safeguards", () => {
  it("maps required beta, telemetry, mobile, creator, and operator artifacts to exact refresh commands", () => {
    expect(getRefreshCommand("agent/state/public-beta-score.generated.json")).toBe("npm run score:beta && npm run check:beta-score");
    expect(getRefreshCommand("agent/state/current-beta-exit-status.generated.json")).toBe("npm run check:current-beta-exit-status");
    expect(getRefreshCommand("agent/state/final-telemetry-closure-lock.generated.json")).toBe("npm run check:final-telemetry-closure-lock");
    expect(getRefreshCommand("agent/state/mobile-ui-final-lock.generated.json")).toBe("npm run check:mobile-ui-final-lock");
    expect(getRefreshCommand("agent/state/creator-settings-control-plane.generated.json")).toBe("npm run check:creator-settings-control-plane");
    expect(getRefreshCommand("agent/state/creator-drop-status-metrics.generated.json")).toBe("npm run check:creator-drop-status-metrics");
    expect(getRefreshCommand("agent/state/operator-revenue-smoke.generated.json")).toBe("npm run check:operator-revenue-smoke");
    expect(getRefreshCommand("agent/state/beta-evidence-lane-prep.generated.json")).toBe("npm run check:beta-evidence-lane-prep");
    expect(REFRESH_ARTIFACT_REGISTRY.some((entry) => entry.artifactPath === "agent/state/evidence-capture-status.generated.json")).toBe(true);
  });

  it("classifies source-version and age stale artifacts with plain refresh actions", () => {
    const staleByHead = getArtifactRefreshStatus({
      artifactPath: "agent/state/current-beta-exit-status.generated.json",
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      sourceCommit: "old",
      currentCodeVersion: "new",
      nowUtc: "2026-05-20T13:00:00.000Z",
    });
    const staleByAge = getArtifactRefreshStatus({
      artifactPath: "agent/state/mobile-ui-final-lock.generated.json",
      generatedAtUtc: "2026-05-18T12:00:00.000Z",
      sourceCommit: "new",
      currentCodeVersion: "new",
      nowUtc: "2026-05-20T13:00:00.000Z",
    });

    expect(staleByHead.status).toBe("stale_source_version");
    expect(staleByHead.nextAction).toContain("npm run check:current-beta-exit-status");
    expect(staleByAge.status).toBe("stale_age");
    expect(staleByAge.message).toContain("Refresh this report from the latest code version");
    expect(staleByAge.message).not.toMatch(/\bHEAD\b|currentHead/u);
  });

  it("builds refresh plans with commands and no raw Git jargon in user-facing messages", () => {
    const plan = buildRefreshPlan([
      {
        artifactPath: "agent/state/public-beta-score.generated.json",
        generatedAtUtc: "2026-05-20T12:00:00.000Z",
        sourceCommit: "old",
      },
      {
        artifactPath: "agent/state/operator-revenue-smoke.generated.json",
        generatedAtUtc: "2026-05-20T12:00:00.000Z",
        sourceCommit: "new",
      },
    ], {
      currentCodeVersion: "new",
      nowUtc: "2026-05-20T13:00:00.000Z",
    });

    expect(plan.some((entry) => entry.artifactPath === "agent/state/public-beta-score.generated.json" && entry.needsRefresh)).toBe(true);
    expect(plan.every((entry) => entry.refreshCommand)).toBe(true);
    expect(plan.map((entry) => entry.message).join("\n")).not.toMatch(/\bHEAD\b|currentHead/u);
  });

  it("keeps same-commit generated report snapshots out of the stale queue", () => {
    const plan = buildRefreshPlan([
      {
        artifactPath: "agent/state/public-beta-score.generated.json",
        generatedAtUtc: "2026-05-20T12:00:00.000Z",
        sourceCommit: "parent",
      },
    ], {
      currentCodeVersion: "head",
      parentHead: "parent",
      changedFilesInHead: ["agent/state/public-beta-score.generated.json"],
      nowUtc: "2026-05-20T13:00:00.000Z",
    });

    expect(plan[0]?.status).toBe("same_commit_snapshot");
    expect(plan[0]?.needsRefresh).toBe(false);
    expect(plan[0]?.message).toContain("same-commit generated report snapshot");
  });

  it("keeps formal gates blocked when stale evidence exists", () => {
    const stale = classifyStaleArtifact({
      artifactPath: "agent/state/provider-smoke-evidence.generated.json",
      generatedAtUtc: "2026-05-18T12:00:00.000Z",
      currentCodeVersion: "new",
      nowUtc: "2026-05-20T13:00:00.000Z",
    });

    expect(stale.formalEvidenceGateCanClear).toBe(false);
    expect(buildPlainRefreshMessage(stale)).not.toMatch(/\bHEAD\b|currentHead/u);
  });

  it("builds and validates the refresh safeguards report", () => {
    const report = buildRefreshSafeguardsReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-20T13:00:00.000Z",
      nowUtc: "2026-05-20T13:00:00.000Z",
      artifacts: [
        {
          artifactPath: "agent/state/current-beta-exit-status.generated.json",
          generatedAtUtc: "2026-05-20T12:00:00.000Z",
          sourceCommit: "old",
        },
        {
          artifactPath: "agent/state/operator-revenue-smoke.generated.json",
          generatedAtUtc: "2026-05-20T12:00:00.000Z",
          sourceCommit: "head",
        },
      ],
    });

    expect(report.summary.refreshPlanReady).toBe(true);
    expect(report.refreshPlan.length).toBeGreaterThan(0);
    expect(report.summary.formalEvidenceGateClearedFromStaleArtifact).toBe(false);
    expect(validateRefreshSafeguardsReport(report, "head")).toEqual([]);
  });
});
