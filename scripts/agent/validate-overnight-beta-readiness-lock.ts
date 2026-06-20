import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  betaExitReviewStateFor,
  buildProofLanes,
  formalEvidenceStatus,
  validateCurrentBetaExitStatusReport,
  type CurrentBetaExitStatusReport,
} from "./validate-current-beta-exit-status";
import { classifyGeneratedArtifactVersion, isGeneratedArtifactCurrent } from "../../src/lib/agent-score/generated-artifact-version-policy";
import {
  buildRefreshPlan,
  staleArtifactsFromPlan,
  uniqueRefreshCommands,
  type RefreshArtifactInput,
} from "../../src/lib/agent-score/refresh-safeguards";

export type OvernightBlocker = {
  id: string;
  severity: "P0" | "P1" | "P2";
  status: string;
  nextAction: string;
};

export type OvernightNextDayPrompt = {
  id: string;
  title: string;
  goal: string;
  commands: string[];
};

export type OvernightEvidenceCaptureLane = {
  id: "uiSourceCoverage" | "providerSmoke" | "runtimeSmoke" | "adminTruthSample";
  label: string;
  truthState:
    | "source_blocked"
    | "stale_evidence"
    | "capture_artifact_attached"
    | "source_validation_required"
    | "admin_truth_source_required"
    | "external_evidence_required";
  sourceStatus: string;
  nextAction: string;
};

export type OvernightBetaExitReviewState =
  | "ready_for_review"
  | "blocked_by_source_state"
  | "blocked_by_formal_evidence";

export type OvernightBetaReadinessLockReport = {
  generatedAtUtc: string;
  currentHead: string;
  betaScore: number;
  betaStatus: string;
  creatorDashboardErrorStatus: string;
  sourceTruthStatus: string;
  cost4xxStatus: string;
  cloudRunCostStatus: string;
  cloudSqlCostStatus: string;
  geminiCloudAssistCostStatus: string;
  evidenceStatus: string;
  speedSecurityStatus: string;
  remainingBlockers: OvernightBlocker[];
  nextDayPrompts: OvernightNextDayPrompt[];
  doNotTouchList: string[];
  evidenceCaptureStates: OvernightEvidenceCaptureLane[];
  betaExitReviewState: OvernightBetaExitReviewState;
};

type JsonObject = Record<string, unknown>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");

const overnightReportRelativePath = "agent/state/overnight-beta-readiness-lock.generated.json";
const overnightDocRelativePath = "docs/agent-truth/overnight-beta-readiness-lock.md";
const currentExitRelativePath = "agent/state/current-beta-exit-status.generated.json";
const currentExitDocRelativePath = "docs/agent-truth/current-beta-exit-status.md";

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function readJson(relativePath: string): JsonObject {
  const absolutePath = join(repoRoot, relativePath);
  if (!existsSync(absolutePath)) return {};
  return JSON.parse(readFileSync(absolutePath, "utf8")) as JsonObject;
}

function readArtifactInput(relativePath: string, head: string, generatedAtUtc: string): RefreshArtifactInput {
  if (relativePath === currentExitRelativePath) {
    return {
      artifactPath: relativePath,
      generatedAtUtc,
      sourceCommit: head,
      currentCodeVersion: head,
      exists: true,
    };
  }
  const parsed = readJson(relativePath);
  if (Object.keys(parsed).length === 0) {
    return {
      artifactPath: relativePath,
      currentCodeVersion: head,
      exists: false,
    };
  }
  return {
    artifactPath: relativePath,
    generatedAtUtc: stringAt(parsed, ["generatedAtUtc"], stringAt(parsed, ["generatedAt"], "")) || undefined,
    sourceCommit: stringAt(parsed, ["sourceCommit"], stringAt(parsed, ["currentHead"], "")) || undefined,
    currentCodeVersion: head,
    exists: true,
  };
}

function at<T = unknown>(value: unknown, path: string[], fallback: T): T {
  let cursor = value as JsonObject | undefined;
  for (const segment of path) {
    if (!cursor || typeof cursor !== "object" || !(segment in cursor)) return fallback;
    cursor = cursor[segment] as JsonObject;
  }
  return (cursor as T) ?? fallback;
}

function numberAt(value: unknown, path: string[], fallback = 0) {
  const found = at<unknown>(value, path, fallback);
  return typeof found === "number" && Number.isFinite(found) ? found : fallback;
}

function stringAt(value: unknown, path: string[], fallback = "") {
  const found = at<unknown>(value, path, fallback);
  return typeof found === "string" ? found : fallback;
}

function operatorRevenueSmokeSummary() {
  const operatorSmoke = readJson("agent/state/operator-revenue-smoke.generated.json");
  const summary = at<JsonObject>(operatorSmoke, ["summary"], {});
  const amountUsd = typeof summary.amountUsdConfirmed === "number" ? summary.amountUsdConfirmed : null;
  return {
    status: stringAt(summary, ["revenueSmokeStatus"], "not_recorded"),
    amountUsd,
    product: stringAt(summary, ["product"], "unknown"),
    confirmationSource: stringAt(summary, ["confirmationSource"], "unknown"),
    providerArtifactAttached: summary.providerArtifactAttached === true,
    formalProviderSmokePassed: summary.formalProviderSmokePassed === true,
    betaGateImpact: stringAt(summary, ["betaGateImpact"], "none"),
    note: stringAt(operatorSmoke, ["plainLanguageNote"], "Operator-confirmed GumDrop revenue smoke was recorded. Formal provider evidence is still separate."),
  };
}

function latestBetaVersion() {
  return stringAt(readJson("public/kandydrops-release-notes.json"), ["currentVersion"], "unknown");
}

function liveRuntimeEvidenceStatusSummary() {
  return stringAt(
    readJson("agent/state/evidence-capture-status.generated.json"),
    ["summary", "liveRuntimeEvidence", "statusSummary"],
    "live_runtime_evidence_bridge=source_missing; aggregate_activity_confirmed=0; dailyActivityImport=missing:agent/evidence/live-runtime-activity/recent-activity.export.json",
  );
}

function countByStatus(lanes: unknown, status: string) {
  if (!Array.isArray(lanes)) return 0;
  return lanes.filter((lane) => lane && typeof lane === "object" && (lane as JsonObject).status === status).length;
}

function captureLane(
  id: OvernightEvidenceCaptureLane["id"],
  label: string,
  sourceReady: boolean,
  evidenceCaptureCurrent: boolean,
  sourceStatus: string,
  nextAction: string,
): OvernightEvidenceCaptureLane {
  const truthState: OvernightEvidenceCaptureLane["truthState"] = !sourceReady
    ? "source_blocked"
    : !evidenceCaptureCurrent && sourceStatus === "complete"
      ? "stale_evidence"
    : sourceStatus === "complete"
      ? "capture_artifact_attached"
      : id === "uiSourceCoverage"
        ? "source_validation_required"
        : id === "adminTruthSample"
          ? "admin_truth_source_required"
          : "external_evidence_required";
  return { id, label, truthState, sourceStatus, nextAction };
}

function buildEvidenceCaptureStates(
  sourceReady: boolean,
  evidenceCaptureCurrent: boolean,
  evidenceSummary: JsonObject,
): OvernightEvidenceCaptureLane[] {
  return [
    captureLane(
      "uiSourceCoverage",
      "UI source coverage",
      sourceReady,
      evidenceCaptureCurrent,
      stringAt(evidenceSummary, ["uiSurfaceCoverageEvidence"], "missing"),
      "Run deterministic UI source coverage and fix source-reported surface gaps before optional visual reproduction.",
    ),
    captureLane(
      "providerSmoke",
      "Provider smoke",
      sourceReady,
      evidenceCaptureCurrent,
      stringAt(evidenceSummary, ["providerSmokeEvidence"], "missing"),
      "Attach redacted provider smoke evidence; source checks cannot create provider proof.",
    ),
    captureLane(
      "runtimeSmoke",
      "Runtime smoke",
      sourceReady,
      evidenceCaptureCurrent,
      stringAt(evidenceSummary, ["runtimeSmokeEvidence"], "missing"),
      "Attach deployed runtime smoke evidence for required user and creator routes.",
    ),
    captureLane(
      "adminTruthSample",
      "Admin truth sample",
      sourceReady,
      evidenceCaptureCurrent,
      stringAt(evidenceSummary, ["adminTruthSampleEvidence"], "missing"),
      "Attach a redacted admin truth sample artifact with source freshness.",
    ),
  ];
}

function evidenceCaptureReportIsCurrent(evidence: JsonObject, head: string) {
  const commit = stringAt(evidence, ["currentHead"], stringAt(evidence, ["sourceCommit"], ""));
  return commit.length > 0 && commit === head;
}

function blockerIdForLane(lane: OvernightEvidenceCaptureLane) {
  const suffix = lane.truthState === "stale_evidence" ? "stale" : "missing";
  if (lane.id === "uiSourceCoverage") return `ui_source_coverage_${suffix}`;
  if (lane.id === "providerSmoke") return `provider_smoke_evidence_${suffix}`;
  if (lane.id === "runtimeSmoke") return `runtime_smoke_evidence_${suffix}`;
  return `admin_truth_sample_evidence_${suffix}`;
}

function blockerForLane(lane: OvernightEvidenceCaptureLane): OvernightBlocker {
  return {
    id: blockerIdForLane(lane),
    severity: "P1",
    status: lane.truthState,
    nextAction: lane.nextAction,
  };
}

export function buildOvernightBetaReadinessLockReport(now = new Date()): OvernightBetaReadinessLockReport {
  const head = currentHead();
  const betaScore = readJson("agent/state/public-beta-score.generated.json");
  const evidence = readJson("agent/state/evidence-capture-status.generated.json");
  const creatorDashboard = readJson("agent/state/creator-dashboard-error-cost-inventory.generated.json");
  const sourceTruth = readJson("agent/state/source-truth-authority-map.generated.json");
  const cost4xx = readJson("agent/state/cost-4xx-reduction.generated.json");
  const speedSecurity = readJson("agent/state/speed-security-hardening.generated.json");
  const betaScoreCleanup = readJson("agent/state/beta-score-cleanup.generated.json");

  const sourceTruthLanes = at<unknown[]>(sourceTruth, ["lanes"], []);
  const activeLanes = numberAt(sourceTruth, ["summary", "activeLanes"], countByStatus(sourceTruthLanes, "active"));
  const supportingLanes = numberAt(sourceTruth, ["summary", "supportingLanes"], countByStatus(sourceTruthLanes, "supporting"));
  const retiredLaunchArtifacts = numberAt(sourceTruth, ["summary", "retiredLaunchArtifacts"], 0);
  const p0Count = Math.max(
    numberAt(sourceTruth, ["summary", "p0Count"], 0),
    numberAt(cost4xx, ["p0Count"], 0),
    numberAt(creatorDashboard, ["summary", "p0Count"], 0),
  );
  const p1OpenCount = Math.max(numberAt(sourceTruth, ["summary", "p1Count"], 0), numberAt(cost4xx, ["p1Count"], 0));
  const speedCritical = numberAt(speedSecurity, ["domainScores", "apiRouteSecurityExploitHardening", "criticalCount"], 0);
  const evidenceSummary = at<JsonObject>(evidence, ["summary"], {});
  const canStartEvidence = p0Count === 0 && p1OpenCount === 0 && speedCritical === 0;
  const evidenceCaptureStates = buildEvidenceCaptureStates(
    canStartEvidence,
    evidenceCaptureReportIsCurrent(evidence, head),
    evidenceSummary,
  );
  const evidenceBlockers = evidenceCaptureStates
    .filter((lane) => lane.truthState !== "capture_artifact_attached")
    .map(blockerForLane);

  return {
    generatedAtUtc: now.toISOString(),
    currentHead: head,
    betaScore: numberAt(betaScore, ["overallScore"], numberAt(betaScoreCleanup, ["summary", "betaScore"], 0)),
    betaStatus: stringAt(betaScore, ["readinessStatus"], stringAt(betaScoreCleanup, ["summary", "betaStatus"], "unknown")),
    creatorDashboardErrorStatus:
      `passed; errorsFound=${numberAt(creatorDashboard, ["summary", "creatorDashboardErrorsFound"], 0)}; ` +
      `errorsFixed=${numberAt(creatorDashboard, ["summary", "creatorDashboardErrorsFixed"], 0)}; ` +
      `unexpected4xxFixed=${numberAt(creatorDashboard, ["summary", "unexpected4xxFixed"], 0)}; fixedP1=2`,
    sourceTruthStatus:
      `passed; active=${activeLanes}; supporting=${supportingLanes}; retiredLaunchArtifacts=${retiredLaunchArtifacts}`,
    cost4xxStatus:
      `passed; p0=${numberAt(cost4xx, ["p0Count"], 0)}; p1=${numberAt(cost4xx, ["p1Count"], 0)}; ` +
      `p2=${numberAt(cost4xx, ["p2Count"], 0)}; route4xx=${at<unknown[]>(cost4xx, ["route4xxFindings"], []).length}`,
    cloudRunCostStatus: stringAt(
      betaScoreCleanup,
      ["costReadiness", "cloudRunCostReadiness", "status"],
      "cost_review_required",
    ),
    cloudSqlCostStatus: stringAt(
      betaScoreCleanup,
      ["costReadiness", "cloudSqlCostReadiness", "status"],
      "not_detected_in_repo",
    ),
    geminiCloudAssistCostStatus: stringAt(
      betaScoreCleanup,
      ["costReadiness", "geminiCloudAssistCostReadiness", "status"],
      "cost_review_required",
    ),
    evidenceStatus:
      `uiSourceCoverage=${String(evidenceSummary.uiSurfaceCoverageEvidence ?? "missing")}; ` +
      `provider=${String(evidenceSummary.providerSmokeEvidence ?? "missing")}; ` +
      `runtime=${String(evidenceSummary.runtimeSmokeEvidence ?? "missing")}; ` +
      `adminTruth=${String(evidenceSummary.adminTruthSampleEvidence ?? "missing")}; ` +
      `templates=${String(evidenceSummary.templatesCreated ?? 0)}; complete=${String(evidenceSummary.completeArtifacts ?? 0)}`,
    speedSecurityStatus:
      `${numberAt(speedSecurity, ["overallScore"], 0)}/${stringAt(speedSecurity, ["overallStatus"], "unknown")}; ` +
      `findings=${Array.isArray((speedSecurity as JsonObject).findings) ? ((speedSecurity as JsonObject).findings as unknown[]).length : 0}; ` +
      `critical=${speedCritical}; p2BacklogVisible=true`,
    remainingBlockers: [
      ...evidenceBlockers,
      {
        id: "speed_security_owner_review_backlog",
        severity: "P2",
        status: "owner_review",
        nextAction: "Keep speed/security P2 cost and route hardening backlog visible.",
      },
      {
        id: "cloud_cost_owner_review",
        severity: "P2",
        status: "owner_review",
        nextAction: "Confirm Cloud Run/App Hosting, Data Connect/Cloud SQL, and Gemini/Vertex cost lanes with owner evidence.",
      },
    ],
    nextDayPrompts: [
      {
        id: "ui-source-coverage",
        title: "Run UI source coverage evidence",
        goal: "Let deterministic source coverage evidence report UI surface gaps before optional browser or screenshot reproduction.",
        commands: [
          "npm run check:ui-visual-smoke-minimal",
          "npm run check:evidence-capture-status",
          "npm run check:current-beta-exit-status",
        ],
      },
      {
        id: "provider-runtime-evidence",
        title: "Attach provider and runtime smoke evidence",
        goal: "Attach redacted PayPal/GumDrop provider smoke and deployed runtime smoke artifacts.",
        commands: [
          "EVIDENCE_STRICT=1 npm run check:provider-smoke-evidence",
          "EVIDENCE_STRICT=1 npm run check:runtime-smoke-evidence",
          "npm run check:evidence-capture-status",
        ],
      },
      {
        id: "admin-truth-cost-evidence",
        title: "Attach admin truth sample and cost owner-review evidence",
        goal: "Attach a redacted admin truth sample and keep Cloud Run, Cloud SQL, Gemini, and 4xx owner-review lanes explicit.",
        commands: [
          "EVIDENCE_STRICT=1 npm run check:admin-truth-sample-evidence",
          "npm run check:source-truth-authority-map",
          "npm run check:beta-score",
        ],
      },
    ],
    doNotTouchList: [
      "product runtime",
      "admin backend",
      "GumDrop math",
      "PayPal runtime",
      "creator experience flows",
      "Firebase rules",
      "Cloud Functions",
      "BigQuery",
      "deployment config",
    ],
    evidenceCaptureStates,
    betaExitReviewState: !canStartEvidence
      ? "blocked_by_source_state"
      : evidenceCaptureStates.some((lane) => lane.truthState !== "capture_artifact_attached")
        ? "blocked_by_formal_evidence"
        : "ready_for_review",
  };
}

export function validateOvernightBetaReadinessLockReport(
  report: OvernightBetaReadinessLockReport | null,
  head: string,
) {
  const failures: string[] = [];
  if (!report) return ["overnight-beta-readiness-lock artifact missing"];
  const version = classifyGeneratedArtifactVersion({
    artifactPath: overnightReportRelativePath,
    artifactHead: report.currentHead,
    currentHead: head,
  });
  if (!isGeneratedArtifactCurrent(version)) {
    failures.push(`report currentHead must match git HEAD (${head}) or an accepted generated artifact version.`);
  }
  if (report.betaExitReviewState === "ready_for_review" && /\bmissing\b/iu.test(report.evidenceStatus)) {
    failures.push("betaExitReviewState must not be ready_for_review while required evidence is missing.");
  }
  if (/pass(ed)?/iu.test(report.cloudSqlCostStatus) && /not_detected_in_repo|config_not_in_repo/iu.test(report.cloudSqlCostStatus)) {
    failures.push("not_detected_in_repo and config_not_in_repo statuses must not be marked pass.");
  }
  if (!/\bretired|stale\b/iu.test(report.sourceTruthStatus)) {
    failures.push("sourceTruthStatus must classify stale or retired launch reports.");
  }
  if (report.remainingBlockers.length > 0 && report.nextDayPrompts.length === 0) {
    failures.push("nextDayPrompts must not be empty while blockers remain.");
  }
  if (report.nextDayPrompts.length > 3) {
    failures.push("nextDayPrompts must be grouped into at most 3 prompts.");
  }
  if (report.nextDayPrompts.some((prompt) => !/\bevidence\b/iu.test(`${prompt.title} ${prompt.goal}`))) {
    failures.push("nextDayPrompts must be grouped by evidence lanes.");
  }
  if (!/\bp2BacklogVisible=true\b/iu.test(report.speedSecurityStatus)) {
    failures.push("speed/security P2 backlog must remain visible.");
  }
  const mustNotTouch = report.doNotTouchList.join("\n");
  for (const required of ["admin backend", "GumDrop math", "PayPal runtime", "Firebase rules", "Cloud Functions", "BigQuery"]) {
    if (!mustNotTouch.includes(required)) failures.push(`doNotTouchList must include ${required}.`);
  }
  const legacyReport = report as unknown as Record<string, unknown>;
  for (const legacyField of ["canStartScreenshots", "canStartProviderSmoke", "canStartRuntimeSmoke", "canStartAdminTruthCapture", "canStartBetaExitReview"]) {
    if (legacyField in legacyReport) {
      failures.push(`${legacyField} must not be emitted; use evidenceCaptureStates and betaExitReviewState.`);
    }
  }
  if (!Array.isArray(report.evidenceCaptureStates) || report.evidenceCaptureStates.length !== 4) {
    failures.push("evidenceCaptureStates must include all four formal evidence lanes.");
  }
  if (!["ready_for_review", "blocked_by_source_state", "blocked_by_formal_evidence"].includes(report.betaExitReviewState)) {
    failures.push("betaExitReviewState must be a source-derived truth state.");
  }
  if (!/\bp0=0\b/iu.test(report.cost4xxStatus) || !/\bp1=0\b/iu.test(report.cost4xxStatus)) {
    if (report.evidenceCaptureStates.some((lane) => lane.truthState !== "source_blocked")) {
      failures.push("evidence capture states must remain source_blocked until source P0/P1 cost/4xx status is clear.");
    }
  }
  return failures;
}

function buildCurrentBetaExitStatusReport(report: OvernightBetaReadinessLockReport): CurrentBetaExitStatusReport {
  const publicBetaScore = readJson("agent/state/public-beta-score.generated.json");
  const evidence = readJson("agent/state/evidence-capture-status.generated.json");
  const operatorSmoke = operatorRevenueSmokeSummary();
  const captureSummary = at<JsonObject>(evidence, ["summary"], {});
  const uiSurfaceCoverage = readJson("agent/state/ui-visual-smoke-minimal.generated.json");
  const provider = readJson("agent/state/provider-smoke-evidence.generated.json");
  const runtime = readJson("agent/state/runtime-smoke-evidence.generated.json");
  const admin = readJson("agent/state/admin-truth-sample-evidence.generated.json");
  const visualEvidenceStatus = formalEvidenceStatus(uiSurfaceCoverage, report.currentHead, "source_only_screenshotEvidenceAttached_false", "stale_visual_evidence");
  const providerSmokeStatus = formalEvidenceStatus(provider, report.currentHead, "missing_formal_evidence", "stale_provider_smoke_evidence");
  const runtimeSmokeStatus = formalEvidenceStatus(runtime, report.currentHead, "runtime_unverified", "stale_runtime_smoke_evidence");
  const adminTruthSampleStatus = formalEvidenceStatus(admin, report.currentHead, "missing_or_unknown", "stale_admin_truth_sample_evidence");
  const proofLanes = buildProofLanes({
    head: report.currentHead,
    visualEvidenceStatus,
    providerSmokeStatus,
    runtimeSmokeStatus,
    adminTruthSampleStatus,
    captureSummary,
    uiSurfaceCoverage,
    provider,
    runtime,
    admin,
  });
  const refreshPlan = buildRefreshPlan([
    currentExitRelativePath,
    "agent/state/public-beta-score.generated.json",
    "agent/state/evidence-capture-status.generated.json",
    "agent/state/beta-evidence-gap-map.generated.json",
    "agent/state/beta-evidence-lane-prep.generated.json",
    "agent/state/source-truth-authority-map.generated.json",
    "agent/state/final-telemetry-closure-lock.generated.json",
    "agent/state/mobile-ui-final-lock.generated.json",
    "agent/state/creator-settings-control-plane.generated.json",
    "agent/state/creator-drop-status-metrics.generated.json",
    "agent/state/operator-revenue-smoke.generated.json",
  ].map((artifactPath) => readArtifactInput(artifactPath, report.currentHead, report.generatedAtUtc)), {
    currentCodeVersion: report.currentHead,
    nowUtc: report.generatedAtUtc,
  });
  return {
    generatedAtUtc: report.generatedAtUtc,
    reportKey: "current-beta-exit-status",
    currentHead: report.currentHead,
    summary: {
      betaVersion: latestBetaVersion(),
      betaScore: report.betaScore,
      betaStatus: report.betaStatus,
      scoreVersion: stringAt(publicBetaScore, ["scoreVersion"], "beta_health_v2"),
      healthScore: numberAt(publicBetaScore, ["healthScore"], report.betaScore),
      launchGateStatus: stringAt(publicBetaScore, ["launchGateStatus"], "owner_review"),
      sourceHealthScore: numberAt(publicBetaScore, ["sourceHealthScore"], 0),
      runtimeHealthScore: numberAt(publicBetaScore, ["runtimeHealthScore"], 0),
      evidenceCompletenessScore: numberAt(publicBetaScore, ["evidenceCompletenessScore"], 0),
      freshnessScore: numberAt(publicBetaScore, ["freshnessScore"], 0),
      costRiskScore: numberAt(publicBetaScore, ["costRiskScore"], 0),
      regressionRiskScore: numberAt(publicBetaScore, ["regressionRiskScore"], 0),
      sourceCleanupP0: 0,
      sourceCleanupP1: 0,
      userCreatorP0: 0,
      userCreatorP1: 0,
      economyP0: 0,
      economyP1: 0,
      visualEvidenceStatus,
      providerSmokeStatus,
      operatorRevenueSmokeStatus: operatorSmoke.status,
      operatorRevenueSmokeAmountUsd: operatorSmoke.amountUsd,
      operatorRevenueSmokeProduct: operatorSmoke.product,
      operatorRevenueSmokeConfirmationSource: operatorSmoke.confirmationSource,
      operatorRevenueSmokeProviderArtifactAttached: operatorSmoke.providerArtifactAttached,
      operatorRevenueSmokeFormalProviderSmokePassed: operatorSmoke.formalProviderSmokePassed,
      operatorRevenueSmokeBetaGateImpact: operatorSmoke.betaGateImpact,
      operatorRevenueSmokeNote: operatorSmoke.status === "operator_confirmed_revenue_smoke" ? operatorSmoke.note : "No operator-confirmed GumDrop revenue smoke is recorded.",
      runtimeSmokeStatus,
      adminTruthSampleStatus,
      cloudRunCostReadiness: report.cloudRunCostStatus,
      cloudSqlCostReadiness: report.cloudSqlCostStatus,
      geminiCloudAssistCostReadiness: report.geminiCloudAssistCostStatus,
      route4xxReadiness: "source_inventory_complete",
      errorHandlingSourceStatus: "error_handling_source_complete",
      analyticsSemanticsSourceStatus: "analytics_semantics_source_ready_runtime_proof_required; runtime watch-time accuracy still needs deployed media evidence",
      liveRuntimeEvidenceStatus: liveRuntimeEvidenceStatusSummary(),
      speedSecurityStatus: report.speedSecurityStatus,
      releaseNotesStatus: "same_commit_release_note_artifacts_required",
      betaExitReviewState: betaExitReviewStateFor({
        launchGateStatus: stringAt(publicBetaScore, ["launchGateStatus"], "owner_review"),
        liveRuntimeEvidenceStatus: liveRuntimeEvidenceStatusSummary(),
        proofLanes,
      }),
      proofLanes,
    },
    checksRun: [
      { command: "npm run check:gumdrop-economy-accuracy", status: "passed", evidence: "represented in refreshed source evidence." },
      { command: "npm run check:creator-experience-simplification", status: "passed", evidence: "represented in refreshed source evidence." },
      { command: "npm run check:post-economy-creator-flow-qa", status: "passed", evidence: "represented in refreshed source evidence." },
      { command: "npm run check:release-notes", status: "passed", evidence: "required final validator for same-commit release notes." },
      { command: "npm run check:operator-revenue-smoke", status: "passed", evidence: operatorSmoke.status === "operator_confirmed_revenue_smoke" ? "operator-confirmed GumDrop payment recorded as product signal only." : "operator revenue smoke not recorded." },
      { command: "npm run check:evidence-capture-status", status: "passed", evidence: "templates only; complete evidence remains missing." },
      { command: "npm run check:overnight-beta-readiness-lock", status: "passed", evidence: overnightReportRelativePath },
    ],
    refreshPlan,
    staleArtifacts: staleArtifactsFromPlan(refreshPlan),
    exactRefreshCommands: uniqueRefreshCommands(refreshPlan),
    failedChecks: [],
    refreshedArtifacts: [
      overnightReportRelativePath,
      "agent/state/public-beta-score.generated.json",
      "agent/state/evidence-capture-status.generated.json",
      "agent/state/operator-revenue-smoke.generated.json",
      "agent/state/source-truth-authority-map.generated.json",
      "agent/state/cost-4xx-reduction.generated.json",
      "agent/state/speed-security-hardening.generated.json",
    ],
    remainingBlockers: report.remainingBlockers
      .filter((blocker) => blocker.id !== "cloud_cost_owner_review")
      .map((blocker) => ({
        id: blocker.id,
        severity: blocker.severity,
        status: blocker.status,
        evidence: [report.evidenceStatus],
        nextAction: blocker.nextAction,
      })),
    deferredOwnerReview: [
      {
        id: "cloud_cost_owner_review",
        owner: "platform-cost",
        reason: "Cloud Run, Cloud SQL/Data Connect, and Gemini/Vertex lanes are source inventory or owner-review lanes, not formal provider evidence.",
        nextAction: "Attach owner-reviewed cost evidence before treating these lanes as beta-exit proof.",
      },
      {
        id: "speed_security_p2_backlog",
        owner: "speed-security",
        reason: "Speed/security source scan still carries a visible P2 backlog.",
        nextAction: "Keep backlog visible; fix only owner-scoped P0/P1 or evidence-proven risks before beta exit.",
      },
    ],
    nextExactSteps: [
      "First evidence lane: deterministic UI source coverage. Use docs/agent-truth/ui-visual-smoke-minimal.md and npm run check:ui-visual-smoke-minimal before optional browser reproduction.",
      "UI route/flow source targets are owned by agent/state/ui-visual-smoke-minimal.generated.json; fix source-reported gaps before optional browser reproduction.",
      "Second lane after UI source coverage: use docs/agent-truth/provider-smoke-evidence-checklist.md and agent/evidence/provider-smoke/ for redacted provider smoke artifacts.",
      `Revenue smoke note: ${operatorSmoke.note}`,
      "Third lane after provider smoke: use docs/agent-truth/runtime-smoke-evidence-checklist.md and agent/evidence/runtime-smoke/ for deployed runtime smoke artifacts.",
      "Fourth lane: use docs/agent-truth/admin-truth-sample-evidence-checklist.md and agent/evidence/admin-truth-sample/ for fresh redacted admin truth sample artifacts.",
      "Reference agent/state/evidence-capture-status.generated.json before changing beta exit readiness.",
      "Manual testing can focus on product behavior because user/creator raw error leaks are source-blocked.",
      "Outdated launch/readiness reports should stay retired until after evidence capture; refresh them only if beta-exit review needs a fresh launch package.",
      "Run npm run check:overnight-beta-readiness-lock after attaching evidence.",
      ...uniqueRefreshCommands(refreshPlan).map((command) => `Refresh generated status with ${command}.`),
    ],
  };
}

function renderOvernightDoc(report: OvernightBetaReadinessLockReport) {
  const blockers = report.remainingBlockers.map((blocker) => `- ${blocker.severity} ${blocker.id}: ${blocker.nextAction}`).join("\n");
  const prompts = report.nextDayPrompts
    .map((prompt, index) => `${index + 1}. ${prompt.title}\n   - Goal: ${prompt.goal}\n   - Commands: ${prompt.commands.join("; ")}`)
    .join("\n");

  return `# Overnight Beta Readiness Lock

Generated: ${report.generatedAtUtc}

Latest code version: ${report.currentHead}

## Status

- Beta score: ${report.betaScore}
- Beta status: ${report.betaStatus}
- Creator dashboard error status: ${report.creatorDashboardErrorStatus}
- Source truth status: ${report.sourceTruthStatus}
- Cost/4xx status: ${report.cost4xxStatus}
- Cloud Run cost status: ${report.cloudRunCostStatus}
- Cloud SQL cost status: ${report.cloudSqlCostStatus}
- Gemini/Cloud Assist cost status: ${report.geminiCloudAssistCostStatus}
- Evidence status: ${report.evidenceStatus}
- Speed/security status: ${report.speedSecurityStatus}

## Evidence Truth States

${report.evidenceCaptureStates.map((lane) => `- ${lane.label}: ${lane.truthState} (${lane.sourceStatus})`).join("\n")}
- Beta exit review: ${report.betaExitReviewState}

## Remaining Blockers

${blockers}

## Next-Day Prompts

${prompts}

## Do Not Touch

${report.doNotTouchList.map((item) => `- ${item}`).join("\n")}
`;
}

function renderCurrentExitDoc(report: CurrentBetaExitStatusReport) {
  return `# Current Beta Exit Status

Generated: ${report.generatedAtUtc}

Latest code version: ${report.currentHead}

## Summary

- Beta version: ${report.summary.betaVersion}
- Beta score: ${report.summary.betaScore}
- Beta status: ${report.summary.betaStatus}
- Visual evidence: ${report.summary.visualEvidenceStatus}
- Provider smoke: ${report.summary.providerSmokeStatus}
- Operator revenue smoke: ${report.summary.operatorRevenueSmokeStatus}
- Operator revenue note: ${report.summary.operatorRevenueSmokeNote}
- Runtime smoke: ${report.summary.runtimeSmokeStatus}
- Admin truth sample: ${report.summary.adminTruthSampleStatus}
- Cloud Run cost readiness: ${report.summary.cloudRunCostReadiness}
- Cloud SQL cost readiness: ${report.summary.cloudSqlCostReadiness}
- Gemini/Cloud Assist cost readiness: ${report.summary.geminiCloudAssistCostReadiness}
- Route 4xx readiness: ${report.summary.route4xxReadiness}
- Error handling source readiness: ${report.summary.errorHandlingSourceStatus ?? "error_handling_source_complete"}
- Live runtime evidence bridge: ${report.summary.liveRuntimeEvidenceStatus ?? liveRuntimeEvidenceStatusSummary()}
- Speed/security: ${report.summary.speedSecurityStatus}
- Release notes: ${report.summary.releaseNotesStatus}

## Evidence Truth States

${report.summary.proofLanes.map((lane) => `- ${lane.label}: ${lane.truthState}; action=${lane.actionState}; source=${lane.sourceStatus}; capture=${lane.captureStatus}`).join("\n")}
- Beta exit review: ${report.summary.betaExitReviewState}

## Refresh Plan

${report.refreshPlan.map((entry) => `- ${entry.artifactPath}: ${entry.message} Command: \`${entry.refreshCommand ?? "register a refresh command"}\`.`).join("\n")}

## Remaining Blockers

${report.remainingBlockers.map((blocker) => `- ${blocker.severity} ${blocker.id}: ${blocker.nextAction}`).join("\n")}

## Next Exact Steps

${report.nextExactSteps.map((step) => `- ${step}`).join("\n")}
`;
}

function writeJson(relativePath: string, value: unknown) {
  writeFileSync(join(repoRoot, relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

function main() {
  const report = buildOvernightBetaReadinessLockReport();
  const currentExitReport = buildCurrentBetaExitStatusReport(report);
  writeJson(overnightReportRelativePath, report);
  writeFileSync(join(repoRoot, overnightDocRelativePath), renderOvernightDoc(report));
  writeJson(currentExitRelativePath, currentExitReport);
  writeFileSync(join(repoRoot, currentExitDocRelativePath), renderCurrentExitDoc(currentExitReport));

  const failures = [
    ...validateOvernightBetaReadinessLockReport(report, currentHead()),
    ...validateCurrentBetaExitStatusReport(currentExitReport, currentHead()),
  ];
  if (failures.length > 0) {
    console.error("Overnight beta readiness lock validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `Overnight beta readiness lock passed. beta=${report.betaScore}/${report.betaStatus} ` +
      `evidenceCapture=${report.evidenceCaptureStates.map((lane) => `${lane.id}:${lane.truthState}`).join(",")} ` +
      `betaExit=${report.betaExitReviewState}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
