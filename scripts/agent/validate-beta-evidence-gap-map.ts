import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  buildRefreshPlan,
  staleArtifactsFromPlan,
  uniqueRefreshCommands,
  type ArtifactRefreshStatus,
  type RefreshArtifactInput,
} from "../../src/lib/agent-score/refresh-safeguards";
import { REFRESH_ARTIFACT_REGISTRY } from "../../src/lib/agent-score/refresh-registry";
import { readGeneratedArtifactGitContext } from "../../src/lib/agent-score/generated-artifact-version-policy";

export type BetaEvidenceGapLane = {
  id: string;
  status: string;
  requiredForExit: boolean;
  currentArtifact: string;
  missingFiles: string[];
  exactFolder: string;
  exactTemplate: string;
  exactCheckCommand: string;
  scoreImpact: string;
  launchImpact: string;
  nextAction: string;
};

export type BetaEvidenceGapMapReport = {
  generatedAtUtc: string;
  reportKey: "beta-evidence-gap-map";
  currentHead: string;
  betaScore: number;
  betaStatus: string;
  launchGateStatus: string;
  canStartBetaExitReview: boolean;
  evidenceLanes: BetaEvidenceGapLane[];
  sourceReadyLanes: string[];
  runtimeProofMissingLanes: string[];
  ownerReviewLanes: string[];
  staleArtifacts: Array<{ artifact: string; reason: string }>;
  refreshPlan: ArtifactRefreshStatus[];
  exactRefreshCommands: string[];
  nextExactSteps: string[];
};

type EvidenceCaptureInput = {
  uiSurfaceCoverageEvidence: string;
  providerSmokeEvidence: string;
  runtimeSmokeEvidence: string;
  adminTruthSampleEvidence: string;
};

type BuildInput = {
  currentHead: string;
  generatedAtUtc: string;
  betaScore: number;
  betaStatus: string;
  launchGateStatus: string;
  canStartBetaExitReview: boolean;
  evidenceCapture: EvidenceCaptureInput;
  runtimeWatchStatus: string;
  revenueProviderStatus: string;
  operatorRevenueSmokeNote: string;
  finalCostStatus: string;
  speedSecurityStatus: string;
  staleArtifacts: Array<{ artifact: string; reason: string }>;
  refreshPlan?: ArtifactRefreshStatus[];
  exactRefreshCommands?: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const reportPath = "agent/state/beta-evidence-gap-map.generated.json";
const docsPath = "docs/agent-truth/beta-evidence-gap-map.md";

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function readText(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson<T = Record<string, unknown>>(relativePath: string): T | null {
  const source = readText(relativePath);
  if (!source) return null;
  return JSON.parse(source) as T;
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function lane(input: BetaEvidenceGapLane): BetaEvidenceGapLane {
  return input;
}

function missingWhen(status: string, filePath: string) {
  return /missing|unverified|unknown|operator_(reported|confirmed)|owner_review|source_ready/iu.test(status) ? [filePath] : [];
}

export function buildBetaEvidenceGapMapReport(input: BuildInput): BetaEvidenceGapMapReport {
  const refreshPlan = input.refreshPlan ?? [];
  const lanes: BetaEvidenceGapLane[] = [
    lane({
      id: "ui_surface_coverage",
      status: input.evidenceCapture.uiSurfaceCoverageEvidence,
      requiredForExit: true,
      currentArtifact: "agent/state/evidence-capture-status.generated.json",
      missingFiles: missingWhen(input.evidenceCapture.uiSurfaceCoverageEvidence, "agent/state/ui-visual-smoke-minimal.generated.json"),
      exactFolder: "agent/state",
      exactTemplate: "agent/state/ui-visual-smoke-minimal.generated.json",
      exactCheckCommand: "npm run check:ui-visual-smoke-minimal",
      scoreImpact: "Raises UI confidence when deterministic surface checks find disconnected modals, panels, and routes before visual review.",
      launchImpact: "Required for beta exit as source UI coverage; screenshots are optional only to reproduce source-reported issues.",
      nextAction: "Run npm run check:ui-visual-smoke-minimal and fix any source-reported UI surface gap.",
    }),
    lane({
      id: "provider_smoke",
      status: input.evidenceCapture.providerSmokeEvidence,
      requiredForExit: true,
      currentArtifact: "agent/state/evidence-capture-status.generated.json",
      missingFiles: missingWhen(input.evidenceCapture.providerSmokeEvidence, "agent/evidence/provider-smoke/*.json"),
      exactFolder: "agent/evidence/provider-smoke",
      exactTemplate: "agent/evidence/provider-smoke/evidence.template.json",
      exactCheckCommand: "EVIDENCE_STRICT=1 npm run check:provider-smoke-evidence",
      scoreImpact: "Raises provider/runtime confidence after redacted provider proof is attached.",
      launchImpact: "Required for beta exit; operator reports alone remain non-passing.",
      nextAction: "Attach redacted provider smoke proof with request/response summary or provider status packet.",
    }),
    lane({
      id: "runtime_smoke",
      status: input.evidenceCapture.runtimeSmokeEvidence,
      requiredForExit: true,
      currentArtifact: "agent/state/evidence-capture-status.generated.json",
      missingFiles: missingWhen(input.evidenceCapture.runtimeSmokeEvidence, "agent/evidence/runtime-smoke/*.json"),
      exactFolder: "agent/evidence/runtime-smoke",
      exactTemplate: "agent/evidence/runtime-smoke/evidence.template.json",
      exactCheckCommand: "EVIDENCE_STRICT=1 npm run check:runtime-smoke-evidence",
      scoreImpact: "Raises runtime health when deployed route loading and critical flows are proven.",
      launchImpact: "Required for beta exit; local static validators are not deployed runtime proof.",
      nextAction: "Attach deployed runtime smoke proof for critical user and creator routes.",
    }),
    lane({
      id: "admin_truth_sample",
      status: input.evidenceCapture.adminTruthSampleEvidence,
      requiredForExit: true,
      currentArtifact: "agent/state/evidence-capture-status.generated.json",
      missingFiles: missingWhen(input.evidenceCapture.adminTruthSampleEvidence, "agent/evidence/admin-truth-sample/*.json"),
      exactFolder: "agent/evidence/admin-truth-sample",
      exactTemplate: "agent/evidence/admin-truth-sample/evidence.template.json",
      exactCheckCommand: "EVIDENCE_STRICT=1 npm run check:admin-truth-sample-evidence",
      scoreImpact: "Raises admin truth confidence when a fresh redacted source sample is attached.",
      launchImpact: "Required for beta exit; debug presence without formal sample is not enough.",
      nextAction: "Attach a fresh redacted admin truth sample artifact.",
    }),
    lane({
      id: "runtime_watch_time_v2_deployed_proof",
      status: /runtime_proof_required|deferred_source_ready/iu.test(input.runtimeWatchStatus)
        ? "source_ready_runtime_proof_required"
        : input.runtimeWatchStatus,
      requiredForExit: true,
      currentArtifact: "agent/state/runtime-watch-time-v2.generated.json",
      missingFiles: ["agent/evidence/runtime-smoke/runtime-watch-time-v2-deployed-proof.json"],
      exactFolder: "agent/evidence/runtime-smoke",
      exactTemplate: "agent/evidence/runtime-smoke/evidence.template.json",
      exactCheckCommand: "EVIDENCE_STRICT=1 npm run check:runtime-smoke-evidence",
      scoreImpact: "Keeps analytics/watch-time source health separate from deployed playback proof.",
      launchImpact: "Source-ready runtime watch-time does not prove deployed media playback accuracy.",
      nextAction: "Attach deployed playback evidence showing runtime watch-time v2 on real media routes.",
    }),
    lane({
      id: "revenue_provider_smoke",
      status: input.revenueProviderStatus,
      requiredForExit: true,
      currentArtifact: "agent/state/provider-smoke-evidence.generated.json",
      missingFiles: ["agent/evidence/provider-smoke/revenue-provider-smoke.json"],
      exactFolder: "agent/evidence/provider-smoke",
      exactTemplate: "agent/evidence/provider-smoke/evidence.template.json",
      exactCheckCommand: "EVIDENCE_STRICT=1 npm run check:provider-smoke-evidence",
      scoreImpact: "Could raise provider and payment confidence after formal redacted revenue proof is attached.",
      launchImpact: `${input.operatorRevenueSmokeNote} Operator-confirmed revenue is product signal only and must not be treated as passed formal provider evidence.`,
      nextAction: "Optional: attach redacted formal proof for the $50 GumDrop payment under provider smoke evidence if the operator chooses.",
    }),
    lane({
      id: "final_cost_owner_review",
      status: input.finalCostStatus,
      requiredForExit: false,
      currentArtifact: "agent/state/final-cost-audit-lock.generated.json",
      missingFiles: ["owner-reviewed cost console evidence"],
      exactFolder: "agent/state",
      exactTemplate: "docs/agent-truth/final-cost-audit-lock.md",
      exactCheckCommand: "npm run check:final-cost-audit-lock",
      scoreImpact: "Keeps cost risk partial until owner-reviewed Cloud Run, SQL, Gemini, and BigQuery evidence exists.",
      launchImpact: "Owner-review cost lanes are not passes; they remain visible launch-risk context.",
      nextAction: "Attach owner-reviewed cost evidence for external Cloud SQL, Gemini/Cloud Assist, and hosted-runner lanes.",
    }),
    lane({
      id: "speed_security_owner_review",
      status: input.speedSecurityStatus,
      requiredForExit: false,
      currentArtifact: "agent/state/speed-security-hardening.generated.json",
      missingFiles: ["owner-reviewed speed/security P2 backlog disposition"],
      exactFolder: "agent/state",
      exactTemplate: "docs/agent-truth/speed-security-hardening.md",
      exactCheckCommand: "npm run check:speed-security",
      scoreImpact: "Keeps speed/security P2 backlog visible without pretending it is runtime evidence.",
      launchImpact: "P2 backlog is owner-review context unless it escalates to P0/P1.",
      nextAction: "Keep speed/security P2 backlog visible and owner-review before beta exit.",
    }),
  ];

  return {
    generatedAtUtc: input.generatedAtUtc,
    reportKey: "beta-evidence-gap-map",
    currentHead: input.currentHead,
    betaScore: input.betaScore,
    betaStatus: input.betaStatus,
    launchGateStatus: input.launchGateStatus,
    canStartBetaExitReview: input.canStartBetaExitReview,
    evidenceLanes: lanes,
    sourceReadyLanes: lanes
      .filter((entry) => /source_ready/iu.test(entry.status))
      .map((entry) => entry.id),
    runtimeProofMissingLanes: lanes
      .filter((entry) => entry.requiredForExit && /missing|unverified|unknown|operator_reported|source_ready|runtime_proof_required/iu.test(entry.status))
      .map((entry) => entry.id),
    ownerReviewLanes: lanes
      .filter((entry) => /owner_review|cost_review_required/iu.test(entry.status))
      .map((entry) => entry.id),
    staleArtifacts: input.staleArtifacts,
    refreshPlan,
    exactRefreshCommands: input.exactRefreshCommands ?? uniqueRefreshCommands(refreshPlan),
    nextExactSteps: [
      `1. ${input.operatorRevenueSmokeNote}`,
      "2. Optional formal provider/app artifact for the $50 GumDrop payment can be stored under agent/evidence/provider-smoke/; it is not required for acknowledging the sale.",
      "3. Run deterministic UI surface coverage and fix any source-reported user, creator, or admin surface gap.",
      "4. Attach deployed runtime smoke evidence for route loading and critical flows under agent/evidence/runtime-smoke/.",
      "5. Attach a fresh redacted admin truth sample under agent/evidence/admin-truth-sample/.",
      "6. Attach deployed runtime watch-time v2 playback proof under runtime smoke evidence.",
      "7. Attach owner-reviewed Cloud SQL/Gemini/cost console evidence without treating source-only inventory as pass.",
      "8. Keep speed/security P2 backlog visible for owner review.",
    ],
  };
}

function artifactInput(relativePath: string, head: string): RefreshArtifactInput {
  const parsed = readJson<Record<string, unknown>>(relativePath);
  if (!parsed) {
    return {
      artifactPath: relativePath,
      currentCodeVersion: head,
      exists: false,
    };
  }
  const artifactHead = readString(parsed.sourceCommit ?? parsed.currentHead);
  const gitContext = artifactHead
    ? readGeneratedArtifactGitContext(repoRoot, artifactHead, relativePath)
    : null;
  return {
    artifactPath: relativePath,
    generatedAtUtc: readString(parsed.generatedAtUtc ?? parsed.generatedAt),
    sourceCommit: artifactHead,
    currentHead: readString(parsed.currentHead),
    currentCodeVersion: head,
    parentHead: gitContext?.parentHead,
    changedFilesInHead: gitContext?.changedFilesInHead,
    changedFilesSinceArtifactHead: gitContext?.changedFilesSinceArtifactHead,
    exists: true,
  };
}

function buildFromWorkspace() {
  const head = currentHead();
  const beta = readJson<Record<string, unknown>>("agent/state/public-beta-score.generated.json") ?? {};
  const betaExit = readJson<Record<string, unknown>>("agent/state/current-beta-exit-status.generated.json") ?? {};
  const betaSummary = (betaExit.summary && typeof betaExit.summary === "object" ? betaExit.summary : {}) as Record<string, unknown>;
  const evidence = readJson<Record<string, unknown>>("agent/state/evidence-capture-status.generated.json") ?? {};
  const evidenceSummary = (evidence.summary && typeof evidence.summary === "object" ? evidence.summary : {}) as Record<string, unknown>;
  const runtimeWatch = readJson<Record<string, unknown>>("agent/state/runtime-watch-time-v2.generated.json") ?? {};
  const provider = readJson<Record<string, unknown>>("agent/state/provider-smoke-evidence.generated.json") ?? {};
  const operatorSmoke = readJson<Record<string, unknown>>("agent/state/operator-revenue-smoke.generated.json") ?? {};
  const operatorSummary = (operatorSmoke.summary && typeof operatorSmoke.summary === "object" ? operatorSmoke.summary : {}) as Record<string, unknown>;
  const paypal = (provider.paypalRefillSmoke && typeof provider.paypalRefillSmoke === "object" ? provider.paypalRefillSmoke : {}) as Record<string, unknown>;
  const finalCost = readJson<Record<string, unknown>>("agent/state/final-cost-audit-lock.generated.json") ?? {};
  const costSummary = (finalCost.summary && typeof finalCost.summary === "object" ? finalCost.summary : {}) as Record<string, unknown>;
  const refreshPlan = buildRefreshPlan(REFRESH_ARTIFACT_REGISTRY.map((entry) => artifactInput(entry.artifactPath, head)), {
    currentCodeVersion: head,
    nowUtc: new Date().toISOString(),
  });

  const operatorRevenueSmokeNote = "A real $50 GumDrop payment was operator-confirmed. Formal provider evidence is still separate.";
  const revenueProviderStatus = readString(operatorSummary.revenueSmokeStatus) === "operator_confirmed_revenue_smoke"
    ? "operator_confirmed_revenue_smoke"
    : readString(paypal.status) === "operator_reported_not_formal_provider_smoke"
    ? "operator_reported_unattached"
    : readString(paypal.status, "missing_formal_evidence");

  return buildBetaEvidenceGapMapReport({
    currentHead: head,
    generatedAtUtc: new Date().toISOString(),
    betaScore: readNumber(beta.overallScore ?? betaSummary.betaScore),
    betaStatus: readString(beta.readinessStatus ?? betaSummary.betaStatus, "Unknown evidence"),
    launchGateStatus: readString(beta.launchGateStatus ?? betaSummary.launchGateStatus, "owner_review"),
    canStartBetaExitReview: betaSummary.canStartBetaExitReview === true,
    evidenceCapture: {
      uiSurfaceCoverageEvidence: readString(evidenceSummary.uiSurfaceCoverageEvidence, "missing"),
      providerSmokeEvidence: readString(evidenceSummary.providerSmokeEvidence, "missing"),
      runtimeSmokeEvidence: readString(evidenceSummary.runtimeSmokeEvidence, "missing"),
      adminTruthSampleEvidence: readString(evidenceSummary.adminTruthSampleEvidence, "missing"),
    },
    runtimeWatchStatus: readString(runtimeWatch.runtimeWatchTimeStatus ?? (runtimeWatch.summary as Record<string, unknown> | undefined)?.integrationStatus, "source_ready_runtime_proof_required"),
    revenueProviderStatus,
    operatorRevenueSmokeNote,
    finalCostStatus: readString(costSummary.cloudSqlCostReadiness, "owner_review_required"),
    speedSecurityStatus: /p2BacklogVisible=true|beta-risk/iu.test(readString(betaSummary.speedSecurityStatus))
      ? "owner_review_required"
      : readString(betaSummary.speedSecurityStatus, "owner_review_required"),
    staleArtifacts: [
      ...staleArtifactsFromPlan(refreshPlan).map((entry) => ({
        artifact: entry.artifactPath,
        reason: entry.nextAction,
      })),
    ],
    refreshPlan,
    exactRefreshCommands: uniqueRefreshCommands(refreshPlan),
  });
}

export function validateBetaEvidenceGapMapReport(report: BetaEvidenceGapMapReport | null, head: string) {
  const failures: string[] = [];
  if (!report) return ["beta-evidence-gap-map artifact missing"];
  if (report.reportKey !== "beta-evidence-gap-map") failures.push("reportKey must be beta-evidence-gap-map.");
  if (report.currentHead !== head) failures.push("currentHead must match git HEAD.");

  const requiredLaneIds = [
    "ui_surface_coverage",
    "provider_smoke",
    "runtime_smoke",
    "admin_truth_sample",
    "runtime_watch_time_v2_deployed_proof",
    "revenue_provider_smoke",
    "final_cost_owner_review",
    "speed_security_owner_review",
  ];
  const laneMap = new Map(report.evidenceLanes.map((entry) => [entry.id, entry]));
  for (const id of requiredLaneIds) {
    if (!laneMap.has(id)) failures.push(`missing evidence lane ${id}.`);
  }
  for (const laneEntry of report.evidenceLanes) {
    if (!laneEntry.exactFolder) failures.push(`${laneEntry.id} must include exactFolder.`);
    if (!laneEntry.exactTemplate) failures.push(`${laneEntry.id} must include exactTemplate.`);
    if (!laneEntry.exactCheckCommand) failures.push(`${laneEntry.id} must include exactCheckCommand.`);
    if (!laneEntry.nextAction) failures.push(`${laneEntry.id} must include nextAction.`);
  }
  const revenue = laneMap.get("revenue_provider_smoke");
  if (
    revenue
    && /operator_(reported|confirmed)/iu.test(revenue.status)
    && /\b(formal_provider_smoke_passed|formal_revenue_smoke_passed|passed_formal_evidence)\b/iu.test(`${revenue.status} ${revenue.launchImpact}`)
  ) {
    failures.push("operator revenue smoke must not be treated as formal evidence.");
  }
  if (report.canStartBetaExitReview && report.evidenceLanes.some((entry) => entry.requiredForExit && /missing|unverified|unknown|operator_(reported|confirmed)|source_ready|runtime_proof_required/iu.test(entry.status))) {
    failures.push("canStartBetaExitReview must remain false while required evidence lanes are missing.");
  }
  if (revenue?.status === "operator_confirmed_revenue_smoke" && !revenue.launchImpact.includes("A real $50 GumDrop payment was operator-confirmed. Formal provider evidence is still separate.")) {
    failures.push("operator-confirmed revenue smoke must include the plain-language separation note.");
  }
  const watch = laneMap.get("runtime_watch_time_v2_deployed_proof");
  if (watch && /source_ready/iu.test(watch.status) && !report.runtimeProofMissingLanes.includes("runtime_watch_time_v2_deployed_proof")) {
    failures.push("runtime watch-time source-ready status must stay in runtimeProofMissingLanes.");
  }
  if (!Array.isArray(report.refreshPlan) || report.refreshPlan.length === 0) {
    failures.push("refreshPlan must be present.");
  } else if (report.staleArtifacts.length === 0 && report.refreshPlan.some((entry) => entry.needsRefresh)) {
    failures.push("staleArtifacts must list reports that need refresh or prove none are stale.");
  }
  if (!Array.isArray(report.exactRefreshCommands) || !report.exactRefreshCommands.includes("npm run check:source-truth-authority-map")) {
    failures.push("exactRefreshCommands must include source-truth refresh.");
  }
  if (report.nextExactSteps.length === 0) failures.push("nextExactSteps must not be empty.");
  return failures;
}

function writeDocs(report: BetaEvidenceGapMapReport) {
  const lines = [
    "# Beta Evidence Gap Map",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Latest code version: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Beta score/status: ${report.betaScore}/${report.betaStatus}`,
    `- Launch gate status: ${report.launchGateStatus}`,
    `- Beta exit review ready: ${report.canStartBetaExitReview}`,
    "",
    "## Evidence Lanes",
    "",
    ...report.evidenceLanes.map((entry) => `- ${entry.id}: ${entry.status}; command: \`${entry.exactCheckCommand}\`; next: ${entry.nextAction}`),
    "",
    "## Source Ready Lanes",
    "",
    ...(report.sourceReadyLanes.length ? report.sourceReadyLanes.map((entry) => `- ${entry}`) : ["- None."]),
    "",
    "## Runtime Proof Missing",
    "",
    ...(report.runtimeProofMissingLanes.length ? report.runtimeProofMissingLanes.map((entry) => `- ${entry}`) : ["- None."]),
    "",
    "## Owner Review Lanes",
    "",
    ...(report.ownerReviewLanes.length ? report.ownerReviewLanes.map((entry) => `- ${entry}`) : ["- None."]),
    "",
    "## Stale Artifacts",
    "",
    ...(report.staleArtifacts.length ? report.staleArtifacts.map((entry) => `- ${entry.artifact}: ${entry.reason}`) : ["- None detected."]),
    "",
    "## Refresh Plan",
    "",
    ...report.refreshPlan.map((entry) => `- ${entry.artifactPath}: ${entry.message} Command: \`${entry.refreshCommand ?? "register a refresh command"}\`.`),
    "",
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((entry) => `- ${entry}`),
    "",
  ];
  mkdirSync(join(repoRoot, dirname(docsPath)), { recursive: true });
  writeFileSync(join(repoRoot, docsPath), `${lines.join("\n")}\n`);
}

function main() {
  const report = buildFromWorkspace();
  mkdirSync(join(repoRoot, dirname(reportPath)), { recursive: true });
  writeFileSync(join(repoRoot, reportPath), `${JSON.stringify(report, null, 2)}\n`);
  writeDocs(report);

  const failures = validateBetaEvidenceGapMapReport(report, currentHead());
  if (failures.length > 0) {
    console.error("Beta evidence gap map validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`Beta evidence gap map passed. lanes=${report.evidenceLanes.length} beta=${report.betaScore}/${report.betaStatus}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
