import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type JsonObject = Record<string, any>;

export type AnalyticsSemanticsFinalLockInputs = {
  currentHead: string;
  generatedAtUtc: string;
  identityInventory: JsonObject | null;
  guestUserTransfer: JsonObject | null;
  legacyRecovery: JsonObject | null;
  runtimeWatchTime: JsonObject | null;
  publicBetaScore: JsonObject | null;
  currentBetaExitStatus: JsonObject | null;
};

export type AnalyticsSemanticsFinalLockReport = {
  generatedAtUtc: string;
  reportKey: "analytics-semantics-final-lock";
  currentHead: string;
  guestTrackingStatus: string;
  userTrackingStatus: string;
  guestUserTransferStatus: string;
  legacyRecoveryStatus: string;
  runtimeWatchTimeStatus: string;
  adminAnalyticsReadiness: string;
  betaScoreImpact: {
    betaScore: number | null;
    betaStatus: string;
    analyticsSemanticsSourceReady: boolean;
    runtimeEvidenceComplete: boolean;
    betaExitReady: boolean;
    currentBetaStatusMentionsAnalytics: boolean;
    note: string;
  };
  cloudRunCostStatus: string;
  cloudSqlCostStatus: string;
  geminiCloudAssistStatus: string;
  route4xxStatus: string;
  remainingBlockers: Array<{
    id: string;
    severity: "P1" | "P2";
    status: string;
    nextAction: string;
  }>;
  nextExactSteps: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");

const artifactRelativePath = "agent/state/analytics-semantics-final-lock.generated.json";
const docsRelativePath = "docs/agent-truth/analytics-semantics-final-lock.md";

const inputPaths = {
  identityInventory: "agent/state/analytics-identity-transfer-inventory.generated.json",
  guestUserTransfer: "agent/state/guest-user-identity-transfer.generated.json",
  legacyRecovery: "agent/state/analytics-legacy-history-reconciliation.generated.json",
  runtimeWatchTime: "agent/state/runtime-watch-time-v2.generated.json",
  publicBetaScore: "agent/state/public-beta-score.generated.json",
  currentBetaExitStatus: "agent/state/current-beta-exit-status.generated.json",
} as const;

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function readJsonIfExists(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) return null;
  return JSON.parse(readFileSync(fullPath, "utf8").replace(/^\uFEFF/u, "")) as JsonObject;
}

function reportKey(report: JsonObject | null) {
  return typeof report?.reportKey === "string" ? report.reportKey : "";
}

function statusFrom(report: JsonObject | null, ...paths: string[]) {
  for (const path of paths) {
    const value = path.split(".").reduce<any>((current, key) => current?.[key], report);
    if (typeof value === "string" && value.trim().length > 0) return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }
  return "missing";
}

function statusFromCostFinding(report: JsonObject | null, lane: string) {
  const findings = Array.isArray(report?.costFindings) ? report.costFindings : [];
  const match = findings.find((finding: JsonObject) => finding?.lane === lane);
  return typeof match?.status === "string" && match.status.trim().length > 0 ? match.status : "missing";
}

function hasCompleteRuntimeEvidence(currentBetaExitStatus: JsonObject | null) {
  const summary = currentBetaExitStatus?.summary ?? {};
  return /formal|passed|complete/iu.test(String(summary.runtimeSmokeStatus ?? ""))
    && !/missing|unverified|unknown|source_only/iu.test(String(summary.runtimeSmokeStatus ?? ""));
}

function betaExitReady(currentBetaExitStatus: JsonObject | null) {
  return currentBetaExitStatus?.summary?.canStartBetaExitReview === true;
}

function currentBetaMentionsAnalytics(currentBetaExitStatus: JsonObject | null) {
  const source = JSON.stringify(currentBetaExitStatus ?? {});
  return source.includes("analytics_semantics_source_ready")
    && source.includes("runtime watch-time accuracy still needs deployed media evidence");
}

function sourceReady(inputs: AnalyticsSemanticsFinalLockInputs) {
  return reportKey(inputs.identityInventory) === "analytics-identity-transfer-inventory"
    && reportKey(inputs.guestUserTransfer) === "guest-user-identity-transfer"
    && reportKey(inputs.legacyRecovery) === "analytics-legacy-history-reconciliation"
    && reportKey(inputs.runtimeWatchTime) === "runtime-watch-time-v2"
    && inputs.guestUserTransfer?.summary?.historicalGuestEventsDuplicated === false
    && inputs.legacyRecovery?.summary?.overwritesCurrentTruth === false
    && inputs.runtimeWatchTime?.summary?.canonicalModelCreated === true;
}

export function buildAnalyticsSemanticsFinalLockReport(
  inputs: AnalyticsSemanticsFinalLockInputs,
): AnalyticsSemanticsFinalLockReport {
  const semanticsSourceReady = sourceReady(inputs);
  const runtimeEvidenceComplete = hasCompleteRuntimeEvidence(inputs.currentBetaExitStatus);
  const betaReady = betaExitReady(inputs.currentBetaExitStatus);
  const betaScore = inputs.publicBetaScore?.overallScore;
  const betaStatus = inputs.publicBetaScore?.readinessStatus ?? inputs.currentBetaExitStatus?.summary?.betaStatus ?? "unknown";
  const currentBetaStatusMentionsAnalytics = currentBetaMentionsAnalytics(inputs.currentBetaExitStatus);

  const cloudRunCostStatus = [
    statusFrom(inputs.runtimeWatchTime, "summary.cloudRunCostStatus"),
    "identity_transfer_bounded_link_first_no_history_fanout",
    "owner_review_cost_backlog_visible",
  ].join("; ");
  const cloudSqlCostStatus = [
    statusFrom(inputs.identityInventory, "summary.cloudSqlStatus"),
    statusFrom(inputs.guestUserTransfer, "summary.cloudSqlStatus"),
    statusFromCostFinding(inputs.legacyRecovery, "cloud_sql"),
    statusFrom(inputs.runtimeWatchTime, "summary.cloudSqlStatus"),
  ].join("; ");
  const geminiCloudAssistStatus = [
    statusFrom(inputs.identityInventory, "summary.geminiCloudAssistStatus"),
    statusFrom(inputs.guestUserTransfer, "summary.geminiCloudAssistStatus"),
    statusFromCostFinding(inputs.legacyRecovery, "gemini_cloud_assist"),
    statusFrom(inputs.runtimeWatchTime, "summary.geminiCloudAssistStatus"),
  ].join("; ");
  const route4xxStatus = [
    statusFrom(inputs.runtimeWatchTime, "summary.route4xxStatus"),
    "identity_transfer_expected_auth_4xx_non_retryable",
    "legacy_recovery_adds_no_user_facing_4xx",
  ].join("; ");

  return {
    generatedAtUtc: inputs.generatedAtUtc,
    reportKey: "analytics-semantics-final-lock",
    currentHead: inputs.currentHead,
    guestTrackingStatus: reportKey(inputs.identityInventory) === "analytics-identity-transfer-inventory"
      ? "source_ready_guest_data_remains_guest_until_linked"
      : "missing_identity_inventory",
    userTrackingStatus: reportKey(inputs.guestUserTransfer) === "guest-user-identity-transfer"
      ? "source_ready_userId_identityState_session_continuity"
      : "missing_guest_user_transfer",
    guestUserTransferStatus: reportKey(inputs.guestUserTransfer) === "guest-user-identity-transfer"
      ? "source_ready_link_first_no_double_count"
      : "missing_guest_user_transfer",
    legacyRecoveryStatus: reportKey(inputs.legacyRecovery) === "analytics-legacy-history-reconciliation"
      ? "source_ready_legacy_evidence_until_reconciled"
      : "missing_legacy_recovery",
    runtimeWatchTimeStatus: reportKey(inputs.runtimeWatchTime) === "runtime-watch-time-v2"
      ? "source_ready_runtime_watch_v2_runtime_proof_required"
      : "missing_runtime_watch_time_v2",
    adminAnalyticsReadiness: "source_ready_needs_fresh_admin_truth_sample_before_claiming_live_accuracy",
    betaScoreImpact: {
      betaScore: typeof betaScore === "number" ? betaScore : null,
      betaStatus,
      analyticsSemanticsSourceReady: semanticsSourceReady,
      runtimeEvidenceComplete,
      betaExitReady: betaReady,
      currentBetaStatusMentionsAnalytics,
      note: "Source-ready analytics semantics do not clear UI source coverage gaps, provider, runtime, admin truth, or stale-report evidence gates.",
    },
    cloudRunCostStatus,
    cloudSqlCostStatus,
    geminiCloudAssistStatus,
    route4xxStatus,
    remainingBlockers: [
      {
        id: "runtime_watch_time_v2_runtime_proof_missing",
        severity: "P1",
        status: "runtime_evidence_required",
        nextAction: "Wire the runtime watch tracker into the selected media viewer and attach deployed runtime watch evidence before claiming live accuracy.",
      },
      {
        id: "ui_provider_runtime_admin_evidence_missing",
        severity: "P1",
        status: "beta_exit_blocked",
        nextAction: "Run UI source coverage and attach provider smoke, runtime smoke, and admin truth sample evidence before beta exit review.",
      },
      {
        id: "cost_owner_review_backlog_visible",
        severity: "P2",
        status: "owner_review_required",
        nextAction: "Keep Cloud Run, Cloud SQL/Data Connect mirror, Gemini/Vertex, and 4xx lanes visible until owner-reviewed evidence exists.",
      },
    ],
    nextExactSteps: [
      "Run deterministic UI source coverage before optional browser reproduction; keep analytics semantics source-ready only.",
      "Wire runtime watch-time v2 into the selected media viewer and capture deployed runtime evidence before claiming live watch-time accuracy.",
      "Refresh provider smoke, runtime smoke, admin truth sample, and beta score artifacts after real evidence is attached.",
    ],
  };
}

export function validateAnalyticsSemanticsFinalLockReport(
  report: AnalyticsSemanticsFinalLockReport | null,
) {
  const failures: string[] = [];
  if (!report) return ["analytics semantics final lock report missing."];
  if (report.reportKey !== "analytics-semantics-final-lock") failures.push("reportKey must be analytics-semantics-final-lock.");
  if (!report.guestTrackingStatus.includes("source_ready")) failures.push("guest tracking semantics must be represented.");
  if (!report.userTrackingStatus.includes("source_ready")) failures.push("individual user tracking semantics must be represented.");
  if (!report.guestUserTransferStatus.includes("source_ready")) failures.push("guest-to-user transfer report must be represented.");
  if (!report.legacyRecoveryStatus.includes("source_ready")) failures.push("legacy recovery report must be represented.");
  if (!report.runtimeWatchTimeStatus.includes("runtime_watch_v2")) failures.push("runtime watch-time v2 report must be represented.");
  if (!report.runtimeWatchTimeStatus.includes("runtime_proof_required")) {
    failures.push("runtime watch time must distinguish source-ready from runtime-proven.");
  }
  if (!report.betaScoreImpact.analyticsSemanticsSourceReady) failures.push("analytics semantics must be source-ready when all semantic reports pass.");
  if (!report.betaScoreImpact.currentBetaStatusMentionsAnalytics) {
    failures.push("current beta exit status must mention analytics semantic readiness and runtime proof requirement.");
  }
  if (report.betaScoreImpact.betaExitReady && !report.betaScoreImpact.runtimeEvidenceComplete) {
    failures.push("beta exit must remain false without runtime evidence.");
  }
  if (report.betaScoreImpact.betaExitReady) {
    failures.push("beta exit must not be marked ready by analytics source readiness alone.");
  }
  for (const [label, value] of [
    ["cloudRunCostStatus", report.cloudRunCostStatus],
    ["cloudSqlCostStatus", report.cloudSqlCostStatus],
    ["geminiCloudAssistStatus", report.geminiCloudAssistStatus],
    ["route4xxStatus", report.route4xxStatus],
  ] as const) {
    if (typeof value !== "string" || value.trim().length === 0 || value.includes("missing")) {
      failures.push(`${label} must be represented.`);
    }
    if (/not_detected[^;,\n]*\bpass(ed)?\b|\bpass(ed)?\b[^;,\n]*not_detected/iu.test(value)) {
      failures.push(`${label} must not mark not_detected_in_repo as pass.`);
    }
  }
  if ((report.remainingBlockers?.length ?? 0) === 0) failures.push("remainingBlockers must stay visible.");
  if ((report.nextExactSteps?.length ?? 0) === 0) failures.push("nextExactSteps must not be empty.");
  return failures;
}

function readInputs(): AnalyticsSemanticsFinalLockInputs {
  return {
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
    identityInventory: readJsonIfExists(inputPaths.identityInventory),
    guestUserTransfer: readJsonIfExists(inputPaths.guestUserTransfer),
    legacyRecovery: readJsonIfExists(inputPaths.legacyRecovery),
    runtimeWatchTime: readJsonIfExists(inputPaths.runtimeWatchTime),
    publicBetaScore: readJsonIfExists(inputPaths.publicBetaScore),
    currentBetaExitStatus: readJsonIfExists(inputPaths.currentBetaExitStatus),
  };
}

function renderMarkdown(report: AnalyticsSemanticsFinalLockReport) {
  const blockers = report.remainingBlockers
    .map((blocker) => `| ${blocker.id} | ${blocker.severity} | ${blocker.status} | ${blocker.nextAction} |`)
    .join("\n");
  const nextSteps = report.nextExactSteps.map((step, index) => `${index + 1}. ${step}`).join("\n");

  return `# Analytics Semantics Final Lock

Generated: ${report.generatedAtUtc}
Current head: ${report.currentHead}

## Status

- Guest tracking: ${report.guestTrackingStatus}
- Individual user tracking: ${report.userTrackingStatus}
- Guest to user transfer: ${report.guestUserTransferStatus}
- Legacy recovery: ${report.legacyRecoveryStatus}
- Runtime watch time: ${report.runtimeWatchTimeStatus}
- Admin analytics readiness: ${report.adminAnalyticsReadiness}
- Beta score impact: score=${report.betaScoreImpact.betaScore}; status=${report.betaScoreImpact.betaStatus}; sourceReady=${report.betaScoreImpact.analyticsSemanticsSourceReady}; runtimeEvidenceComplete=${report.betaScoreImpact.runtimeEvidenceComplete}; betaExitReady=${report.betaScoreImpact.betaExitReady}

## Cost Lanes

- Cloud Run: ${report.cloudRunCostStatus}
- Cloud SQL/Data Connect: ${report.cloudSqlCostStatus}
- Gemini/Cloud Assist/Vertex: ${report.geminiCloudAssistStatus}
- 4xx: ${report.route4xxStatus}

## Remaining Blockers

| Id | Severity | Status | Next action |
| --- | --- | --- | --- |
${blockers}

## Next Exact Steps

${nextSteps}
`;
}

function writeReport(report: AnalyticsSemanticsFinalLockReport) {
  const artifactPath = join(repoRoot, artifactRelativePath);
  const docsPath = join(repoRoot, docsRelativePath);
  mkdirSync(dirname(artifactPath), { recursive: true });
  mkdirSync(dirname(docsPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(docsPath, renderMarkdown(report));
}

function main() {
  const report = buildAnalyticsSemanticsFinalLockReport(readInputs());
  const failures = validateAnalyticsSemanticsFinalLockReport(report);
  if (failures.length > 0) {
    console.error("Analytics semantics final lock validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  writeReport(report);
  console.log(
    `Analytics semantics final lock passed. sourceReady=${report.betaScoreImpact.analyticsSemanticsSourceReady} betaExitReady=${report.betaScoreImpact.betaExitReady}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
