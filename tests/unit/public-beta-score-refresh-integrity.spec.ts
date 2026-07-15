import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  collectGeneratedReportEvidence,
  exactRefreshCommandsForPlan,
  readAdminTruthSampleEvidence,
  readProviderSmokeEvidence,
  readRegressionRiskRefreshEvidence,
  readRuntimeSmokeEvidence,
  readUiSurfaceCoverageEvidence,
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

  it("preserves a fresh current required report's failed validation state", () => {
    const reportPath = "agent/state/targeted-behavior-evidence.generated.json";
    writeFileSync(join(root, reportPath), `${JSON.stringify({
      generatedAtUtc: "2026-07-14T11:00:00.000Z",
      sourceCommit: head,
      status: "failed",
      passed: false,
      validationFailures: ["required child validator failed"],
    })}\n`);

    const report = collectGeneratedReportEvidence(root, head, now)
      .find((entry) => entry.path === reportPath);

    expect(report).toMatchObject({
      freshness: "fresh",
      versionStatus: "current_head",
      validationState: "failed",
      validationDetail: "required child validator failed",
    });
  });

  it("rejects contradictory provider and runtime gate fields", () => {
    writeFileSync(join(root, "agent", "state", "provider-smoke-evidence.generated.json"), `${JSON.stringify({
      generatedAtUtc: "2026-07-14T11:00:00.000Z",
      providerSmoke: { status: "formal_provider_smoke_passed", passed: true },
      readinessImpact: { providerSmokeGatePassed: false },
      paypalRefillSmoke: { status: "passed" },
      validationFailures: [],
    })}\n`);
    writeFileSync(join(root, "agent", "state", "runtime-smoke-evidence.generated.json"), `${JSON.stringify({
      generatedAtUtc: "2026-07-14T11:00:00.000Z",
      overallStatus: "formal_runtime_smoke_passed",
      runtimeDeploymentSmokePassed: false,
      readinessImpact: { runtimeGatePassed: true },
      validationFailures: [],
    })}\n`);

    expect(readProviderSmokeEvidence(root)).toMatchObject({ status: "failed", passed: false });
    expect(readRuntimeSmokeEvidence(root)).toMatchObject({ status: "failed", passed: false });
  });

  it("lets current formal provider proof supersede operator-only payment context", () => {
    writeFileSync(join(root, "agent", "state", "operator-revenue-smoke.generated.json"), `${JSON.stringify({
      summary: {
        revenueSmokeStatus: "operator_confirmed_revenue_smoke",
        amountUsdConfirmed: 25,
      },
      plainLanguageNote: "Operator-confirmed revenue is context only.",
    })}\n`);
    writeFileSync(join(root, "agent", "state", "provider-smoke-evidence.generated.json"), `${JSON.stringify({
      generatedAtUtc: "2026-07-14T11:00:00.000Z",
      providerSmoke: { status: "formal_provider_smoke_passed", passed: true },
      readinessImpact: { providerSmokeGatePassed: true },
      paypalRefillSmoke: { status: "formal_provider_smoke_passed", formalRepoArtifactAttached: true },
      validationFailures: [],
    })}\n`);

    const provider = readProviderSmokeEvidence(root);

    expect(provider).toMatchObject({ status: "formal_provider_smoke_passed", passed: true });
    expect(provider.detail).toContain("current provider-backed source artifact controls this gate");
  });

  it("rejects generated source artifacts that claim pass while retaining validation failures", () => {
    writeFileSync(join(root, "agent", "state", "provider-smoke-evidence.generated.json"), `${JSON.stringify({
      generatedAtUtc: "2026-07-14T11:00:00.000Z",
      providerSmoke: { status: "formal_provider_smoke_passed", passed: true },
      readinessImpact: { providerSmokeGatePassed: true },
      paypalRefillSmoke: { status: "passed" },
      validationFailures: ["mixed provider artifact set is invalid"],
    })}\n`);
    writeFileSync(join(root, "agent", "state", "runtime-smoke-evidence.generated.json"), `${JSON.stringify({
      generatedAtUtc: "2026-07-14T11:00:00.000Z",
      overallStatus: "formal_runtime_smoke_passed",
      runtimeDeploymentSmokePassed: true,
      readinessImpact: { runtimeGatePassed: true },
      validationFailures: ["mixed runtime artifact set is invalid"],
    })}\n`);
    writeFileSync(join(root, "agent", "state", "ui-visual-smoke-minimal.generated.json"), `${JSON.stringify({
      generatedAtUtc: "2026-07-14T11:00:00.000Z",
      status: "source_surface_checks_current",
      passed: true,
      validationFailures: ["surface contract failed"],
      surfaces: [],
      summary: {},
      formalGateImpact: { clearsUiSurfaceCoverage: true },
    })}\n`);
    writeFileSync(join(root, "agent", "state", "admin-truth-sample-evidence.generated.json"), `${JSON.stringify({
      generatedAtUtc: "2026-07-14T11:00:00.000Z",
      status: "passed",
      freshAdminTruthSampleAttached: true,
      formalAdminTruthSamplePassed: false,
      sampleCount: 1,
      readinessImpact: { adminTruthSampleGatePassed: true },
    })}\n`);

    expect(readProviderSmokeEvidence(root)).toMatchObject({ status: "failed", passed: false });
    expect(readRuntimeSmokeEvidence(root)).toMatchObject({ status: "failed", passed: false });
    expect(readUiSurfaceCoverageEvidence(root).passed).toBe(false);
    expect(readAdminTruthSampleEvidence(root).passed).toBe(false);
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

  it.each([
    ["agent/state/current-beta-exit-status.generated.json", "agent/state/ui-visual-smoke-minimal.generated.json", "npm run check:current-beta-exit-status"],
    ["agent/state/evidence-capture-status.generated.json", "agent/state/operator-revenue-smoke.generated.json", "npm run check:evidence-capture-status"],
  ])("does not infer composite report currency when %s inputs change", (artifactPath, changedInput, refreshCommand) => {
    const plan = buildRefreshPlan([{
      artifactPath,
      generatedAtUtc: "2026-07-14T11:00:00.000Z",
      sourceCommit: "older",
      changedFilesSinceArtifactHead: [changedInput],
    }], {
      currentCodeVersion: head,
      nowUtc: "2026-07-14T12:00:00.000Z",
    });

    expect(plan[0]).toMatchObject({
      status: "stale_source_version",
      needsRefresh: true,
      refreshCommand,
    });
  });
});
