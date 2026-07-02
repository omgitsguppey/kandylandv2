import { describe, expect, it } from "vitest";

import {
  buildScore80RefreshQueueExecutionReport,
  validateScore80RefreshQueueExecutionReport,
  type Score80RefreshCommandResult,
} from "../../scripts/agent/validate-score-80-refresh-queue-execution";

const commandResults: Score80RefreshCommandResult[] = [
  {
    command: "npm run check:self-healing-refresh-queue",
    status: "passed",
    queueArtifact: "agent/state/self-healing-refresh-queue.generated.json",
    classification: "safe_automatic_refresh",
    reason: "Refresh queue validator is safe and source-only.",
  },
  {
    command: "npm run check:refresh-safeguards",
    status: "passed",
    queueArtifact: "agent/state/refresh-safeguards.generated.json",
    classification: "safe_automatic_refresh",
    reason: "Refresh safeguards validator is safe and source-only.",
  },
  {
    command: "Produce provider-backed site activity evidence, then run npm run check:evidence-capture-status",
    status: "blocked",
    queueArtifact: "runtime_provider_smoke",
    classification: "blocked_source_activity_evidence",
    reason: "Provider-backed site activity evidence required; source queue cannot generate it automatically.",
  },
  {
    command: "npm run check:provider-smoke-evidence",
    status: "skipped",
    queueArtifact: "agent/state/provider-smoke-evidence.generated.json",
    classification: "blocked_source_activity_evidence",
    reason: "Provider smoke evidence must not be generated or cleared by this source-only pass.",
  },
];

describe("score 80 refresh queue execution", () => {
  it("classifies queue execution without clearing source evidence gates", () => {
    const report = buildScore80RefreshQueueExecutionReport({
      generatedAtUtc: "2026-05-21T18:00:00.000Z",
      currentHead: "head",
      oldScore: 77.76,
      newScore: 77.76,
      commandResults,
      dirtyFiles: [
        {
          path: "agent/state/self-healing-refresh-queue.generated.json",
          classification: "current_generated_artifact_to_commit",
          reason: "Safe queue refresh artifact.",
        },
      ],
      openPrs: [
        {
          number: 278,
          title: "Reduce duplicate computation in high-ROI aggregation hotspot",
          url: "https://github.com/omgitsguppey/kandylandv2/pull/278",
          classification: "deferred_unrelated",
          reason: "Outside score-impact refresh queue execution.",
        },
      ],
      staleArtifactsStillTracked: [],
    });

    expect(report.status).toBe("pass");
    expect(report.queueEntriesRun).toBe(2);
    expect(report.queueEntriesBlocked).toBe(1);
    expect(report.formalGateImpact).toEqual({
      clearsUiSourceCoverage: false,
      clearsRuntime: false,
      clearsProvider: false,
      clearsAdminTruth: false,
    });
    expect(report.blockedEntries.map((entry) => entry.queueArtifact)).toEqual(expect.arrayContaining([
      "runtime_provider_smoke",
      "agent/state/provider-smoke-evidence.generated.json",
    ]));
    expect(JSON.stringify(report)).not.toMatch(/Provider smoke evidence requires|Runtime smoke evidence requires/u);
    expect(validateScore80RefreshQueueExecutionReport(report)).toEqual([]);
  });

  it("fails on unclassified queue entries, skipped safe refreshes, or dirty files without classification", () => {
    const report = buildScore80RefreshQueueExecutionReport({
      generatedAtUtc: "2026-05-21T18:00:00.000Z",
      currentHead: "head",
      oldScore: 77.76,
      newScore: 77.76,
      commandResults: [
        {
          command: "npm run check:beta-freshness-language",
          status: "skipped",
          queueArtifact: "agent/state/beta-freshness-language.generated.json",
          classification: "safe_automatic_refresh",
          reason: "",
        },
      ],
      dirtyFiles: [
        {
          path: "agent/state/unclassified.generated.json",
          classification: "unsafe_unknown",
          reason: "",
        },
      ],
      openPrs: [],
      staleArtifactsStillTracked: [],
    });

    expect(validateScore80RefreshQueueExecutionReport(report)).toEqual(expect.arrayContaining([
      expect.stringContaining("safe automatic refresh entries were skipped without reason"),
      expect.stringContaining("dirty files are unclassified"),
    ]));
  });
});
