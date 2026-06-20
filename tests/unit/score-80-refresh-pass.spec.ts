import { describe, expect, it } from "vitest";

import {
  buildScore80RefreshPassReport,
  validateScore80RefreshPassReport,
  type Score80RefreshLaneResult,
} from "../../scripts/agent/validate-score-80-refresh-pass";

const currentHead = "abc123";

function lane(overrides: Partial<Score80RefreshLaneResult> = {}): Score80RefreshLaneResult {
  return {
    artifactPath: "agent/state/source-truth-authority-map.generated.json",
    command: "npm run check:source-truth-authority-map",
    status: "refreshed",
    currentHead,
    refreshAction: "Refreshed from the latest code version.",
    scoreImpact: "implemented_lane_current",
    ...overrides,
  };
}

describe("score 80 refresh pass", () => {
  it("passes when implemented stale lanes were refreshed and formal evidence remains separate", () => {
    const report = buildScore80RefreshPassReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead,
      oldScore: 41.92,
      newScore: 48.5,
      betaStatus: "Evidence pending",
      openPrs: [],
      dirtyFiles: [],
      lanes: [
        lane(),
        lane({
          artifactPath: "agent/state/final-telemetry-closure-lock.generated.json",
          command: "npm run check:final-telemetry-closure-lock",
        }),
      ],
      missingScripts: [],
      remainingStaleArtifacts: [],
      formalEvidenceGates: [
        { id: "provider_smoke", status: "missing_formal_evidence", betaExitGate: true },
      ],
    });

    expect(report.summary.staleImplementedLaneArtifacts).toBe(0);
    expect(report.summary.betaExitReady).toBe(false);
    expect(report.nextExactSteps.join("\n")).not.toMatch(/formal manual|manual visual/iu);
    expect(validateScore80RefreshPassReport(report)).toEqual([]);
  });

  it("fails when a stale implemented-lane artifact has no refresh action", () => {
    const report = buildScore80RefreshPassReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead,
      oldScore: 41.92,
      newScore: 41.92,
      betaStatus: "Stale evidence",
      openPrs: [],
      dirtyFiles: [],
      lanes: [
        lane({
          status: "stale_blocked",
          artifactPath: "agent/state/mobile-ui-final-lock.generated.json",
          command: "",
          refreshAction: "",
        }),
      ],
      missingScripts: [],
      remainingStaleArtifacts: [
        {
          artifactPath: "agent/state/mobile-ui-final-lock.generated.json",
          status: "stale_source_version",
          refreshAction: "",
        },
      ],
      formalEvidenceGates: [
        { id: "provider_smoke", status: "missing_formal_evidence", betaExitGate: true },
      ],
    });

    expect(validateScore80RefreshPassReport(report)).toContain(
      "stale implemented-lane artifact lacks a refresh action.",
    );
  });
});
