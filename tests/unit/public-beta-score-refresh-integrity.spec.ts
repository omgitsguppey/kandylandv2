import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  collectGeneratedReportEvidence,
  exactRefreshCommandsForPlan,
  readActivityVerificationEvidence,
  readAdminTruthSampleEvidence,
  readDebugRuntimeEvidenceForScore,
  readProviderSmokeEvidence,
  readPersonMetricsHydrationEvidence,
  readRegressionRiskRefreshEvidence,
  readRuntimeSmokeEvidence,
  readSourceBackedRuntimeConfidenceEvidence,
  readTargetedBehaviorEvidence,
  readUiSurfaceCoverageEvidence,
} from "../../scripts/agent/score-public-beta-readiness";
import { TARGETED_VALIDATORS } from "../../scripts/agent/validate-targeted-behavior-evidence";
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

  function git(args: string[]) {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  }

  function initializeGitRepo() {
    git(["init", "-q"]);
    git(["config", "user.email", "score-integrity@example.test"]);
    git(["config", "user.name", "Score Integrity Test"]);
    git(["config", "core.autocrlf", "false"]);
    writeFileSync(join(root, "source-marker.txt"), "base\n");
    git(["add", "source-marker.txt"]);
    git(["-c", "commit.gpgSign=false", "commit", "-qm", "base source"]);
    return git(["rev-parse", "HEAD"]);
  }

  function commit(paths: string[], message: string) {
    git(["add", "--", ...paths]);
    git(["-c", "commit.gpgSign=false", "commit", "-qm", message]);
    return git(["rev-parse", "HEAD"]);
  }

  function writeRegressionRefresh(value: Record<string, unknown>, fixtureHead = head) {
    writeFileSync(
      join(root, "agent", "state", "regression-risk-high-blast-refresh.generated.json"),
      `${JSON.stringify({
        generatedAtUtc: "2026-07-14T11:00:00.000Z",
        sourceCommit: fixtureHead,
        highBlastCoverageCurrent: true,
        scoreAfter: { regressionRisk: 94 },
        failedLanes: [],
        inFlightLanes: [],
        ...value,
      }, null, 2)}\n`,
    );
  }

  function targetedBehaviorFixture(overrides: Record<string, unknown> = {}, fixtureHead = head) {
    const validatorResults = TARGETED_VALIDATORS.map((validator) => ({
      id: validator.id,
      command: validator.command,
      status: "pass",
      artifactPath: validator.artifactPath,
      reportKey: validator.id,
      currentHead: fixtureHead,
      sourceCommit: fixtureHead,
      artifactGeneratedAtUtc: "2026-07-14T11:00:00.000Z",
      canClearSourceGate: true,
      childValidationFailures: [] as string[],
      blocker: undefined as string | undefined,
      surfaces: [...validator.surfaces],
      proves: validator.proves,
      doesNotProve: "Does not prove runtime, provider, or admin truth.",
    }));
    return {
      reportKey: "targeted-behavior-evidence",
      generatedAtUtc: "2026-07-14T11:00:00.000Z",
      currentHead: fixtureHead,
      sourceCommit: fixtureHead,
      latestCodeVersion: fixtureHead,
      status: "passed",
      overallStatus: "passed",
      passed: true,
      canClearSourceGate: true,
      validationFailures: [],
      validatorResults,
      surfacesCovered: [...new Set(TARGETED_VALIDATORS.flatMap((validator) => validator.surfaces))],
      doesNotClear: ["provider_smoke", "runtime_smoke", "admin_truth_sample"],
      formalEvidenceImpact: "source_behavior_only",
      readinessImpact: { targetedBehaviorGatePassed: true },
      ...overrides,
    };
  }

  function writeTargetedBehavior(value: Record<string, unknown>) {
    writeFileSync(
      join(root, "agent", "state", "targeted-behavior-evidence.generated.json"),
      `${JSON.stringify(value, null, 2)}\n`,
    );
  }

  function personMetricsFixture(overrides: Record<string, unknown> = {}, fixtureHead = head) {
    return {
      reportKey: "person-metrics-hydration",
      status: "pass",
      passed: true,
      generatedAtUtc: "2026-07-14T11:00:00.000Z",
      currentHead: fixtureHead,
      sourceCommit: fixtureHead,
      canClearSourceGate: true,
      canClearRuntimeGate: false,
      canClearProviderGate: false,
      canClearAdminTruthGate: false,
      validationFailures: [],
      productionReadsRequired: false,
      legacyMutationAllowed: false,
      evidenceMode: "source_validation_fixture",
      fakeMetricsUsed: true,
      debugLane: { gaps: 0 },
      ...overrides,
    };
  }

  function writeJsonArtifact(fileName: string, value: Record<string, unknown>) {
    writeFileSync(
      join(root, "agent", "state", fileName),
      `${JSON.stringify(value, null, 2)}\n`,
    );
  }

  function writeSameCommitScoreArtifacts(fixtureHead: string, targeted = targetedBehaviorFixture({}, fixtureHead)) {
    writeTargetedBehavior(targeted);
    writeJsonArtifact("person-metrics-hydration.generated.json", personMetricsFixture({}, fixtureHead));
    writeJsonArtifact("ui-visual-smoke-minimal.generated.json", {
      generatedAtUtc: "2026-07-14T11:00:00.000Z",
      currentHead: fixtureHead,
      sourceCommit: fixtureHead,
      status: "source_surface_checks_current",
      passed: true,
      validationFailures: [],
      nonUiLanesBlocked: false,
      formalGateImpact: {
        clearsUiSurfaceCoverage: true,
        clearsProviderSmoke: false,
        clearsDeployedRuntimeSmoke: false,
        clearsAdminTruthSmoke: false,
      },
      surfaces: [{
        surfaceId: "dashboard-mobile",
        surfaceGroup: "dashboard",
        route: "/dashboard",
        deviceBand: "mobile",
        requiresVisualSmokeReason: "Source-level device coverage is required.",
        status: "source_checked",
        blocksScoreForUiOnly: false,
      }],
      summary: { missingSurfaceIds: [], failedSurfaceIds: [] },
    });
    writeJsonArtifact("live-evidence-gate-replacement.generated.json", {
      generatedAtUtc: "2026-07-14T11:00:00.000Z",
      currentHead: fixtureHead,
      sourceCommit: fixtureHead,
      liveEvidenceBySystem: [{
        liveRuntimeEvidenceStatus: "live_activity_confirmed",
        dailyActivityImport: {
          expectedPath: "agent/evidence/live-runtime-activity/recent-activity.export.json",
          foundPaths: ["agent/evidence/live-runtime-activity/recent-activity.export.json"],
          schema: "live-runtime-activity-export",
        },
      }],
    });
    writeJsonArtifact("activity-verification-engine.generated.json", {
      generatedAtUtc: "2026-07-14T11:00:00.000Z",
      currentHead: fixtureHead,
      sourceCommit: fixtureHead,
      status: "pass",
      fakeActivityUsed: false,
      productionReadsRequired: false,
      formalGateImpact: {
        clearsFormalProvider: false,
        clearsDeployedRuntime: false,
        clearsFormalAdminTruth: false,
      },
      summary: { verifiedByActivity: 1, sourceReadyNoActivity: 0 },
      features: [{ scoreEligible: true, confidenceScore: 82 }],
    });
    writeRegressionRefresh({}, fixtureHead);
  }

  it("scores synthetic person-metric validation as source wiring only when it is explicitly labeled", () => {
    const path = join(root, "agent", "state", "person-metrics-hydration.generated.json");
    const base = personMetricsFixture();
    writeFileSync(path, `${JSON.stringify(base, null, 2)}\n`);

    expect(readPersonMetricsHydrationEvidence(root, head, now)).toMatchObject({
      status: "source_ready_person_metrics_hydration",
      passed: true,
    });
    expect(readDebugRuntimeEvidenceForScore(root).path).toBe("agent/state/debug-runtime-evidence.generated.json");

    writeFileSync(path, `${JSON.stringify({ ...base, fakeMetricsUsed: false }, null, 2)}\n`);
    expect(readPersonMetricsHydrationEvidence(root, head, now)).toMatchObject({
      status: "failed",
      passed: false,
      detail: "Person metrics hydration evidence is missing required source-ready guardrails.",
    });
  });

  it.each([
    ["wrong report key", { reportKey: "not-person-metrics" }],
    ["stale timestamp", { generatedAtUtc: "2026-07-12T11:00:00.000Z" }],
    ["wrong head", { currentHead: "f".repeat(40) }],
    ["missing source commit", { sourceCommit: undefined }],
    ["missing failure array", { validationFailures: undefined }],
    ["retained validation failures", { validationFailures: ["failed"] }],
    ["runtime gate claim", { canClearRuntimeGate: true }],
  ])("rejects person-metric source evidence with %s", (_label, override) => {
    writeJsonArtifact("person-metrics-hydration.generated.json", personMetricsFixture(override));

    expect(readPersonMetricsHydrationEvidence(root, head, now)).toMatchObject({ status: "failed", passed: false });
  });

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

  it("accepts targeted behavior evidence only under the strict internally consistent source-only contract", () => {
    writeTargetedBehavior(targetedBehaviorFixture());

    expect(readTargetedBehaviorEvidence(root, head, now)).toMatchObject({
      status: "passed",
      passed: true,
    });
  });

  it.each([
    ["missing report key", { reportKey: undefined }],
    ["wrong report key", { reportKey: "another-report" }],
    ["wrong current head", { currentHead: "f".repeat(40) }],
    ["missing source commit", { sourceCommit: undefined }],
    ["validation failures", { validationFailures: ["child failed"] }],
    ["missing source gate", { canClearSourceGate: undefined }],
    ["missing source-only classification", { formalEvidenceImpact: undefined }],
    ["stale timestamp", { generatedAtUtc: "2026-07-12T11:00:00.000Z" }],
    ["non-string validation failure", { validationFailures: [123] }],
    ["missing validator results", { validatorResults: undefined }],
    ["non-record validator results", { validatorResults: [null, 1, "child"] }],
  ])("rejects targeted behavior evidence with %s", (_label, override) => {
    writeTargetedBehavior(targetedBehaviorFixture(override));

    expect(readTargetedBehaviorEvidence(root, head, now)).toMatchObject({
      status: "failed",
      passed: false,
    });
  });

  it("rejects a top-level pass that hides a failed targeted child lane", () => {
    const fixture = targetedBehaviorFixture();
    fixture.validatorResults[0] = {
      ...fixture.validatorResults[0],
      status: "fail",
      canClearSourceGate: false,
      childValidationFailures: ["child failed"],
      blocker: "child failed",
    };
    writeTargetedBehavior(fixture);

    expect(readTargetedBehaviorEvidence(root, head, now)).toMatchObject({
      status: "failed",
      passed: false,
    });
  });

  it("accepts artifact-only commit snapshots through the central version policy", () => {
    const parentHead = initializeGitRepo();
    writeSameCommitScoreArtifacts(parentHead);
    const committedHead = commit(["agent/state"], "generated score snapshots");

    expect(readTargetedBehaviorEvidence(root, committedHead, now)).toMatchObject({
      status: "passed",
      passed: true,
      sourceCommit: parentHead,
      versionStatus: "same_commit_snapshot",
    });
    expect(readPersonMetricsHydrationEvidence(root, committedHead, now)).toMatchObject({
      status: "source_ready_person_metrics_hydration",
      passed: true,
      sourceCommit: parentHead,
      versionStatus: "same_commit_snapshot",
    });
    expect(readUiSurfaceCoverageEvidence(root)).toMatchObject({
      passed: true,
      sourceCommit: parentHead,
      versionStatus: "same_commit_snapshot",
    });
    expect(readSourceBackedRuntimeConfidenceEvidence(root)).toMatchObject({
      status: "source_ready_live_activity_confirmed",
      passed: true,
      sourceCommit: parentHead,
      versionStatus: "same_commit_snapshot",
    });
    expect(readActivityVerificationEvidence(root)).toMatchObject({
      status: "source_ready_activity_verification",
      passed: true,
      sourceCommit: parentHead,
      versionStatus: "same_commit_snapshot",
    });
    expect(readRegressionRiskRefreshEvidence(root, committedHead, now)).toMatchObject({
      highBlastCoverageCurrent: true,
      sourceCommit: parentHead,
      versionStatus: "same_commit_snapshot",
    });
  }, 15_000);

  it("rejects snapshots after a later commit that did not refresh the artifact", () => {
    const parentHead = initializeGitRepo();
    writeSameCommitScoreArtifacts(parentHead);
    commit(["agent/state"], "generated score snapshots");
    writeFileSync(join(root, "source-marker.txt"), "changed after snapshots\n");
    const laterHead = commit(["source-marker.txt"], "later source change");

    expect(readTargetedBehaviorEvidence(root, laterHead, now)).toMatchObject({
      status: "failed",
      passed: false,
      versionStatus: "stale_source_version",
    });
    expect(readPersonMetricsHydrationEvidence(root, laterHead, now)).toMatchObject({
      status: "failed",
      passed: false,
      versionStatus: "stale_source_version",
    });
    expect(readUiSurfaceCoverageEvidence(root).versionStatus).toBe("stale_source_version");
    expect(readSourceBackedRuntimeConfidenceEvidence(root).versionStatus).toBe("stale_source_version");
    expect(readActivityVerificationEvidence(root).versionStatus).toBe("stale_source_version");
    expect(readRegressionRiskRefreshEvidence(root, laterHead, now)).toMatchObject({
      highBlastCoverageCurrent: false,
      versionStatus: "stale_source_version",
    });
  }, 15_000);

  it("does not let same-commit version acceptance hide child provenance mismatches", () => {
    const parentHead = initializeGitRepo();
    const targeted = targetedBehaviorFixture({}, parentHead);
    targeted.validatorResults[0] = {
      ...targeted.validatorResults[0],
      sourceCommit: "f".repeat(40),
    };
    writeTargetedBehavior(targeted);
    const committedHead = commit(
      ["agent/state/targeted-behavior-evidence.generated.json"],
      "mismatched generated snapshot",
    );

    expect(readTargetedBehaviorEvidence(root, committedHead, now)).toMatchObject({
      status: "failed",
      passed: false,
      versionStatus: "same_commit_snapshot",
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
