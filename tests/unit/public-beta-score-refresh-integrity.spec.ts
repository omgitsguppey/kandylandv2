import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  collectGeneratedReportEvidence,
  exactRefreshCommandsForPlan,
  readRegressionRiskRefreshEvidence,
} from "../../scripts/agent/score-public-beta-readiness";
import { scoreRegressionRisk } from "../../src/lib/agent-score/evidence-quality";
import { buildRefreshPlan } from "../../src/lib/agent-score/refresh-safeguards";

const head = "0123456789abcdef0123456789abcdef01234567";
const now = Date.parse("2026-07-14T12:00:00.000Z");

describe("public beta score refresh integrity", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "kandydrops-score-refresh-"));
    mkdirSync(join(root, "agent", "state"), { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { force: true, recursive: true });
  });

  function writeRegressionRefresh(value: Record<string, unknown>) {
    writeFileSync(
      join(root, "agent", "state", "regression-risk-high-blast-refresh.generated.json"),
      `${JSON.stringify({
        generatedAtUtc: "2026-07-14T11:00:00.000Z",
        sourceCommit: head,
        highBlastCoverageCurrent: true,
        scoreAfter: { regressionRisk: 94 },
        failedLanes: [],
        inFlightLanes: [],
        ...value,
      }, null, 2)}\n`,
    );
  }

  it("accepts high-blast coverage only when its timestamp and source version are current", () => {
    writeRegressionRefresh({});

    expect(readRegressionRiskRefreshEvidence(root, head, now)?.highBlastCoverageCurrent).toBe(true);
  });

  it.each([
    ["older source version", { sourceCommit: "older" }],
    ["stale timestamp", { generatedAtUtc: "2026-07-12T11:00:00.000Z" }],
    ["future timestamp", { generatedAtUtc: "2026-07-15T11:00:00.000Z" }],
    ["invalid timestamp", { generatedAtUtc: "not-a-timestamp" }],
  ])("rejects high-blast coverage with %s", (_label, override) => {
    writeRegressionRefresh(override);

    expect(readRegressionRiskRefreshEvidence(root, head, now)?.highBlastCoverageCurrent).toBe(false);
  });

  it("keeps current high-blast evidence from short-circuiting other regression risks", () => {
    const result = scoreRegressionRisk({
      highBlastRefreshCurrent: true,
      highBlastRefreshScore: 94,
      requiredReports: [{
        path: "agent/state/targeted-behavior-evidence.generated.json",
        freshness: "stale",
      }],
      runtimeCodeChangedSinceReport: true,
    });

    expect(result.score).toBeLessThan(94);
    expect(result.reasons.join("\n")).toContain("Current high-blast regression refresh");
    expect(result.reasons.join("\n")).toContain("targeted-behavior-evidence.generated.json is stale");
    expect(result.reasons.join("\n")).toContain("New runtime code landed");
  });

  it("does not infer required-report freshness from malformed JSON or filesystem mtime", () => {
    const reportPath = "agent/state/targeted-behavior-evidence.generated.json";
    writeFileSync(join(root, reportPath), "{ malformed json");

    const report = collectGeneratedReportEvidence(root, head, now)
      .find((entry) => entry.path === reportPath);

    expect(report).toMatchObject({
      freshness: "unknown",
      currentHead: head,
      versionStatus: "missing_version",
    });
    expect(report?.generatedAt).toBeUndefined();
    expect(report?.ageHours).toBeUndefined();
  });

  it("requires both source-version and timestamp metadata for a required report", () => {
    const reportPath = "agent/state/targeted-behavior-evidence.generated.json";
    writeFileSync(join(root, reportPath), `${JSON.stringify({
      sourceCommit: head,
      status: "passed",
    })}\n`);

    const report = collectGeneratedReportEvidence(root, head, now)
      .find((entry) => entry.path === reportPath);

    expect(report?.freshness).toBe("unknown");
  });

  it("emits exact refresh commands only for entries that need refresh", () => {
    const plan = buildRefreshPlan([
      {
        artifactPath: "agent/state/public-beta-score.generated.json",
        generatedAtUtc: "2026-07-14T11:00:00.000Z",
        sourceCommit: head,
      },
      {
        artifactPath: "agent/state/current-beta-exit-status.generated.json",
        generatedAtUtc: "2026-07-14T11:00:00.000Z",
        sourceCommit: "older",
      },
    ], {
      currentCodeVersion: head,
      nowUtc: "2026-07-14T12:00:00.000Z",
    });

    expect(exactRefreshCommandsForPlan(plan)).toEqual([
      "npm run check:current-beta-exit-status",
    ]);
  });
});
