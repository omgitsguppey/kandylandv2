import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { evaluateAdminTruthSampleEvidence } from "./validate-admin-truth-sample-evidence";
import { evaluateProviderSmokeEvidence } from "./validate-provider-smoke-evidence";
import { evaluateRuntimeSmokeEvidence } from "./validate-runtime-smoke-evidence";
import {
  buildRefreshPlan,
  staleArtifactsFromPlan,
  uniqueRefreshCommands,
  type ArtifactRefreshStatus,
  type RefreshArtifactInput,
} from "../../src/lib/agent-score/refresh-safeguards";
import {
  classifyGeneratedArtifactFromGit,
  isGeneratedArtifactCurrent,
} from "../../src/lib/agent-score/generated-artifact-version-policy";

type EvidenceStatus = "missing" | "incomplete" | "complete" | "stale";

type EvidenceLaneStatuses = {
  uiSurfaceCoverageEvidence: EvidenceStatus;
  providerSmokeEvidence: EvidenceStatus;
  runtimeSmokeEvidence: EvidenceStatus;
  adminTruthSampleEvidence: EvidenceStatus;
};

type LiveRuntimeEvidenceCapture = {
  statusSummary: string;
  expectedImportPath: string;
  foundImportPaths: string[];
};

type OperatorRevenueSmokeSummary = {
  revenueSmokeStatus: "operator_confirmed_revenue_smoke" | "not_recorded";
  amountUsdConfirmed: number | null;
  product: "GumDrops" | "unknown";
  confirmationSource: "operator_confirmed" | "unknown";
  providerArtifactAttached: boolean;
  formalProviderSmokePassed: boolean;
  betaGateImpact: "product_signal_only" | "none";
};

type BuildOptions = {
  currentHead: string;
  generatedAtUtc: string;
  laneStatuses: EvidenceLaneStatuses;
  templatesCreated: number;
  completeArtifacts: number;
  currentBetaExitCanStart: boolean;
  operatorRevenueSmoke?: OperatorRevenueSmokeSummary;
  liveRuntimeEvidence?: Partial<LiveRuntimeEvidenceCapture>;
};

export type EvidenceCaptureStatusReport = {
  generatedAtUtc: string;
  reportKey: "evidence-capture-status";
  currentHead: string;
  summary: EvidenceLaneStatuses & {
    templatesCreated: number;
    completeArtifacts: number;
    strictModeReady: boolean;
    canStartBetaExitReview: boolean;
    operatorRevenueSmoke: OperatorRevenueSmokeSummary;
    liveRuntimeEvidence: LiveRuntimeEvidenceCapture;
  };
  evidenceFolders: Array<{
    lane: keyof EvidenceLaneStatuses;
    folder: string;
    templatePath: string;
    status: EvidenceStatus;
  }>;
  sourceReadyEvidence: string[];
  operatorConfirmedEvidence: string[];
  formalMissingEvidence: string[];
  missingEvidence: string[];
  completeEvidence: string[];
  nextExactSteps: string[];
  refreshPlan: ArtifactRefreshStatus[];
  staleArtifacts: ReturnType<typeof staleArtifactsFromPlan>;
  exactRefreshCommands: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const reportRelativePath = "agent/state/evidence-capture-status.generated.json";
const reportPath = join(repoRoot, reportRelativePath);
const docsRelativePath = "docs/agent-truth/evidence-capture-status.md";
const docsPath = join(repoRoot, docsRelativePath);
const currentBetaExitPath = join(repoRoot, "agent/state/current-beta-exit-status.generated.json");
const operatorRevenueSmokePath = join(repoRoot, "agent/state/operator-revenue-smoke.generated.json");
const liveEvidenceGatePath = join(repoRoot, "agent/state/live-evidence-gate-replacement.generated.json");
const expectedDailyActivityImportPath = "agent/evidence/live-runtime-activity/recent-activity.export.json";
const uiSurfaceCoverageArtifactPath = "agent/state/ui-visual-smoke-minimal.generated.json";
const uiSurfaceCoverageOwnedInputPaths = [
  "scripts/agent/validate-ui-visual-smoke-minimal.ts",
  "scripts/agent/check-ui-surface-coverage.ts",
  "src/lib/evidence/ui-visual-smoke-contract.ts",
] as const;
const evidenceCaptureOwnedInputPaths = [
  "scripts/agent/validate-evidence-capture-status.ts",
  "scripts/agent/validate-admin-truth-sample-evidence.ts",
  "scripts/agent/validate-provider-smoke-evidence.ts",
  "scripts/agent/validate-runtime-smoke-evidence.ts",
  "scripts/agent/validate-ui-visual-smoke-minimal.ts",
  "scripts/agent/check-ui-surface-coverage.ts",
  "src/lib/agent-score/generated-artifact-version-policy.ts",
  "src/lib/agent-score/refresh-registry.ts",
  "src/lib/agent-score/refresh-safeguards.ts",
  "src/lib/evidence/ui-visual-smoke-contract.ts",
] as const;
let currentCommitContext: { parentHead: string | null; changedFilesInHead: string[] } | null = null;

const laneLabels: Record<keyof EvidenceLaneStatuses, string> = {
  uiSurfaceCoverageEvidence: "UI surface coverage evidence",
  providerSmokeEvidence: "provider-backed site activity evidence",
  runtimeSmokeEvidence: "deployed route evidence",
  adminTruthSampleEvidence: "admin source sample evidence",
};

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function currentGeneratedCommitContext() {
  if (currentCommitContext) return currentCommitContext;
  let parentHead: string | null = null;
  try {
    parentHead = execFileSync("git", ["rev-parse", "HEAD^"], { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    parentHead = null;
  }
  const changedFilesOutput = execFileSync("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
  currentCommitContext = {
    parentHead,
    changedFilesInHead: changedFilesOutput.length > 0
      ? changedFilesOutput.split(/\r?\n/u).map((path) => path.replace(/\\/g, "/"))
      : [],
  };
  return currentCommitContext;
}

function readCurrentBetaExitCanStart() {
  if (!existsSync(currentBetaExitPath)) return false;
  const report = JSON.parse(readFileSync(currentBetaExitPath, "utf8")) as { summary?: { canStartBetaExitReview?: unknown } };
  return report.summary?.canStartBetaExitReview === true;
}

function allLanesComplete(laneStatuses: EvidenceLaneStatuses) {
  return Object.values(laneStatuses).every((status) => status === "complete");
}

function formatOrList(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")}, or ${items[items.length - 1]}`;
}

function defaultOperatorRevenueSmoke(): OperatorRevenueSmokeSummary {
  return {
    revenueSmokeStatus: "not_recorded",
    amountUsdConfirmed: null,
    product: "unknown",
    confirmationSource: "unknown",
    providerArtifactAttached: false,
    formalProviderSmokePassed: false,
    betaGateImpact: "none",
  };
}

function readOperatorRevenueSmoke(): OperatorRevenueSmokeSummary {
  if (!existsSync(operatorRevenueSmokePath)) return defaultOperatorRevenueSmoke();
  const report = JSON.parse(readFileSync(operatorRevenueSmokePath, "utf8")) as {
    summary?: Partial<OperatorRevenueSmokeSummary>;
  };
  const summary = report.summary ?? {};
  return {
    revenueSmokeStatus: summary.revenueSmokeStatus === "operator_confirmed_revenue_smoke"
      ? "operator_confirmed_revenue_smoke"
      : "not_recorded",
    amountUsdConfirmed: typeof summary.amountUsdConfirmed === "number" ? summary.amountUsdConfirmed : null,
    product: summary.product === "GumDrops" ? "GumDrops" : "unknown",
    confirmationSource: summary.confirmationSource === "operator_confirmed" ? "operator_confirmed" : "unknown",
    providerArtifactAttached: summary.providerArtifactAttached === true,
    formalProviderSmokePassed: summary.formalProviderSmokePassed === true,
    betaGateImpact: summary.betaGateImpact === "product_signal_only" ? "product_signal_only" : "none",
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readReport(): EvidenceCaptureStatusReport | null {
  if (!existsSync(reportPath)) return null;
  try {
    return JSON.parse(readFileSync(reportPath, "utf8")) as EvidenceCaptureStatusReport;
  } catch {
    return null;
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function looksLikeGitSha(value: string) {
  return /^[a-f0-9]{7,40}$/iu.test(value);
}

function summarizeLiveRuntimeEvidenceFromArtifact(): LiveRuntimeEvidenceCapture {
  if (!existsSync(liveEvidenceGatePath)) {
    return {
      statusSummary: `live_runtime_evidence_bridge=source_missing; dailyActivityImport=missing:${expectedDailyActivityImportPath}`,
      expectedImportPath: expectedDailyActivityImportPath,
      foundImportPaths: [],
    };
  }
  const parsed = JSON.parse(readFileSync(liveEvidenceGatePath, "utf8")) as Record<string, unknown>;
  const systems = Array.isArray(parsed.liveEvidenceBySystem) ? parsed.liveEvidenceBySystem.map(readRecord) : [];
  const statuses = systems.map((system) => readString(system.liveRuntimeEvidenceStatus) ?? "source_missing");
  const firstDailyImport = systems.map((system) => readRecord(system.dailyActivityImport)).find((daily) => readString(daily.expectedPath));
  const expectedImportPath = readString(firstDailyImport?.expectedPath) ?? expectedDailyActivityImportPath;
  const foundImportPaths = Array.isArray(firstDailyImport?.foundPaths)
    ? firstDailyImport.foundPaths.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    : [];
  const count = (status: string) => statuses.filter((entry) => entry === status).length;
  const leadingStatus = count("live_activity_confirmed") > 0
    ? "live_activity_confirmed"
    : count("aggregate_activity_confirmed") > 0
      ? "aggregate_activity_confirmed"
      : count("source_ready_waiting_for_activity") > 0
        ? "source_ready_waiting_for_activity"
        : count("not_observed_but_expected") > 0
          ? "not_observed_but_expected"
          : "source_missing";
  return {
    statusSummary: [
      `live_runtime_evidence_bridge=${leadingStatus}`,
      `live_activity_confirmed=${count("live_activity_confirmed")}`,
      `aggregate_activity_confirmed=${count("aggregate_activity_confirmed")}`,
      `source_ready_waiting_for_activity=${count("source_ready_waiting_for_activity")}`,
      `not_observed_but_expected=${count("not_observed_but_expected")}`,
      `runtime_export_required=${count("runtime_export_required")}`,
      `provider_required=${count("provider_required")}`,
      `admin_truth_source_required=${count("admin_truth_source_required")}`,
      `billing_required=${count("billing_required")}`,
      `source_missing=${count("source_missing")}`,
      `dailyActivityImport=${foundImportPaths.length > 0 ? "present" : "missing"}:${expectedImportPath}`,
    ].join("; "),
    expectedImportPath,
    foundImportPaths,
  };
}

function normalizeLiveRuntimeEvidence(input?: Partial<LiveRuntimeEvidenceCapture>): LiveRuntimeEvidenceCapture {
  const fromArtifact = summarizeLiveRuntimeEvidenceFromArtifact();
  return {
    statusSummary: input?.statusSummary ?? fromArtifact.statusSummary,
    expectedImportPath: input?.expectedImportPath ?? fromArtifact.expectedImportPath,
    foundImportPaths: input?.foundImportPaths ?? fromArtifact.foundImportPaths,
  };
}

function readArtifactInput(relativePath: string, head: string, generatedAtUtc: string): RefreshArtifactInput {
  if (relativePath === reportRelativePath) {
    return {
      artifactPath: relativePath,
      generatedAtUtc,
      sourceCommit: head,
      currentCodeVersion: head,
      exists: true,
    };
  }
  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) {
    return {
      artifactPath: relativePath,
      currentCodeVersion: head,
      exists: false,
    };
  }
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as Record<string, unknown>;
  const readString = (value: unknown) => typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
  const sourceCommit = readString(parsed.sourceCommit) ?? readString(parsed.currentHead);
  const gitContext = sourceCommit && sourceCommit !== head ? currentGeneratedCommitContext() : null;
  return {
    artifactPath: relativePath,
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
    sourceCommit,
    currentCodeVersion: head,
    parentHead: gitContext?.parentHead,
    changedFilesInHead: gitContext?.changedFilesInHead,
    exists: true,
  };
}

function evaluateUiSurfaceCoverageEvidence(head: string): {
  status: EvidenceStatus;
  templateExists: boolean;
  completeArtifacts: string[];
} {
  const fullPath = join(repoRoot, uiSurfaceCoverageArtifactPath);
  if (!existsSync(fullPath)) {
    return { status: "missing", templateExists: false, completeArtifacts: [] };
  }
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as Record<string, unknown>;
  const artifactHead = readString(parsed.currentHead ?? parsed.sourceCommit);
  const validationFailures = Array.isArray(parsed.validationFailures)
    ? parsed.validationFailures.filter(Boolean)
    : [];
  if (artifactHead && artifactHead !== head) {
    const version = classifyGeneratedArtifactFromGit({
      cwd: repoRoot,
      artifactPath: uiSurfaceCoverageArtifactPath,
      artifactHead,
      ownedSourcePaths: [...uiSurfaceCoverageOwnedInputPaths],
    });
    if (
      isGeneratedArtifactCurrent(version)
      && parsed.passed === true
      && parsed.status === "source_surface_checks_current"
      && validationFailures.length === 0
    ) {
      return { status: "complete", templateExists: true, completeArtifacts: [uiSurfaceCoverageArtifactPath] };
    }
    return { status: "stale", templateExists: true, completeArtifacts: [] };
  }
  if (parsed.passed === true && parsed.status === "source_surface_checks_current" && validationFailures.length === 0) {
    return { status: "complete", templateExists: true, completeArtifacts: [uiSurfaceCoverageArtifactPath] };
  }
  return { status: "incomplete", templateExists: true, completeArtifacts: [] };
}

export function buildEvidenceCaptureStatusReport(options: BuildOptions): EvidenceCaptureStatusReport {
  const canStartBetaExitReview = allLanesComplete(options.laneStatuses) && options.currentBetaExitCanStart;
  const missingEvidence = (Object.entries(options.laneStatuses) as Array<[keyof EvidenceLaneStatuses, EvidenceStatus]>)
    .filter(([, status]) => status !== "complete")
    .map(([lane, status]) => `${laneLabels[lane]} is ${status}.`);
  const completeEvidence = (Object.entries(options.laneStatuses) as Array<[keyof EvidenceLaneStatuses, EvidenceStatus]>)
    .filter(([, status]) => status === "complete")
    .map(([lane]) => `${laneLabels[lane]} is complete.`);
  const operatorRevenueSmoke = options.operatorRevenueSmoke ?? defaultOperatorRevenueSmoke();
  const liveRuntimeEvidence = normalizeLiveRuntimeEvidence(options.liveRuntimeEvidence);
  const sourceReadyEvidence = [
    options.laneStatuses.uiSurfaceCoverageEvidence === "complete"
      ? "UI surface coverage is source-checked; visual review is optional follow-up only after a source-reported UI issue."
      : "UI surface coverage needs deterministic source validation before optional browser reproduction.",
    "runtime watch-time source lane is source-ready but still needs deployed playback proof.",
    `live runtime evidence bridge: ${liveRuntimeEvidence.statusSummary}`,
  ];
  const operatorConfirmedEvidence = operatorRevenueSmoke.revenueSmokeStatus === "operator_confirmed_revenue_smoke"
    ? ["operator-confirmed GumDrop revenue smoke is recorded as product signal only."]
    : [];
  const protectedProofLanes = [
    "provider-backed activity",
    ...(options.laneStatuses.adminTruthSampleEvidence === "complete" ? [] : ["admin source sample"]),
    "billing",
    "exact-user",
  ];
  const formalMissingEvidence = [
    ...missingEvidence,
    "provider-backed site activity evidence remains source-required until redacted provider/app evidence or first-party server-confirmed ledger/webhook activity is attached.",
    `site activity evidence clears connected site-activity lanes; ${formatOrList(protectedProofLanes)} lanes need matching source exports before clearing.`,
  ];
  const refreshPlan = buildRefreshPlan([
    reportRelativePath,
    "agent/state/current-beta-exit-status.generated.json",
    "agent/state/public-beta-score.generated.json",
    "agent/state/beta-evidence-gap-map.generated.json",
    "agent/state/beta-evidence-lane-prep.generated.json",
    "agent/state/operator-revenue-smoke.generated.json",
    "agent/state/final-telemetry-closure-lock.generated.json",
    "agent/state/mobile-ui-final-lock.generated.json",
    "agent/state/creator-settings-control-plane.generated.json",
    "agent/state/creator-drop-status-metrics.generated.json",
  ].map((artifactPath) => readArtifactInput(artifactPath, options.currentHead, options.generatedAtUtc)), {
    currentCodeVersion: options.currentHead,
    nowUtc: options.generatedAtUtc,
  });

  return {
    generatedAtUtc: options.generatedAtUtc,
    reportKey: "evidence-capture-status",
    currentHead: options.currentHead,
    summary: {
      ...options.laneStatuses,
      templatesCreated: options.templatesCreated,
      completeArtifacts: options.completeArtifacts,
      strictModeReady: true,
      canStartBetaExitReview,
      operatorRevenueSmoke,
      liveRuntimeEvidence,
    },
    evidenceFolders: [
      {
        lane: "uiSurfaceCoverageEvidence",
        folder: "agent/state",
        templatePath: "docs/agent-truth/ui-visual-smoke-minimal.md",
        status: options.laneStatuses.uiSurfaceCoverageEvidence,
      },
      {
        lane: "providerSmokeEvidence",
        folder: "agent/evidence/provider-smoke",
        templatePath: "agent/evidence/provider-smoke/evidence.template.json",
        status: options.laneStatuses.providerSmokeEvidence,
      },
      {
        lane: "runtimeSmokeEvidence",
        folder: "agent/evidence/runtime-smoke",
        templatePath: "agent/evidence/runtime-smoke/evidence.template.json",
        status: options.laneStatuses.runtimeSmokeEvidence,
      },
      {
        lane: "adminTruthSampleEvidence",
        folder: "agent/evidence/admin-truth-sample",
        templatePath: "agent/evidence/admin-truth-sample/evidence.template.json",
        status: options.laneStatuses.adminTruthSampleEvidence,
      },
    ],
    sourceReadyEvidence,
    operatorConfirmedEvidence,
    formalMissingEvidence,
    missingEvidence,
    completeEvidence,
    nextExactSteps: [
      "Run deterministic UI source coverage and device UI source checks; fix any source-reported UI surface gaps before optional browser reproduction.",
      "Copy agent/evidence/provider-smoke/evidence.template.json to a dated JSON artifact after provider-backed site activity evidence is captured; redact provider tokens and secrets.",
      "Run npm run capture:truthful-evidence -- --runtime-smoke to intentionally generate deployed route evidence without provider/payment calls.",
      "Run npm run capture:truthful-evidence -- --admin-truth to generate a bounded redacted admin source sample without deployed route probes.",
      `Drop privacy-safe daily aggregate activity export at ${liveRuntimeEvidence.expectedImportPath}.`,
      "Run EVIDENCE_STRICT=1 npm run check:provider-smoke-evidence once provider-backed site activity evidence is expected to be complete.",
      "Run EVIDENCE_STRICT=1 npm run check:runtime-smoke-evidence once deployed route evidence is expected to be complete.",
      "Run EVIDENCE_STRICT=1 npm run check:admin-truth-sample-evidence once admin source sample evidence is expected to be complete.",
      "Run npm run check:beta-evidence-lane-prep to see every source-to-proof lane with checklist, validator, and launch impact.",
      ...uniqueRefreshCommands(refreshPlan).map((command) => `Refresh generated status with ${command}.`),
    ],
    refreshPlan,
    staleArtifacts: staleArtifactsFromPlan(refreshPlan),
    exactRefreshCommands: uniqueRefreshCommands(refreshPlan),
  };
}

export function validateEvidenceCaptureStatusReport(
  report: EvidenceCaptureStatusReport | null,
  head: string,
) {
  const failures: string[] = [];

  if (!report) return ["evidence capture status artifact missing"];
  if (report.reportKey !== "evidence-capture-status") {
    failures.push("reportKey must be evidence-capture-status.");
  }
  const reportVersionCurrent = report.currentHead !== head
    && looksLikeGitSha(report.currentHead)
    ? isGeneratedArtifactCurrent(classifyGeneratedArtifactFromGit({
      cwd: repoRoot,
      artifactPath: reportRelativePath,
      artifactHead: report.currentHead,
      ownedSourcePaths: [...evidenceCaptureOwnedInputPaths],
    }))
    : false;
  if (report.currentHead !== head && !reportVersionCurrent) {
    failures.push(`evidence capture status currentHead must match git HEAD (${head}).`);
  }
  if (!report.summary.strictModeReady) {
    failures.push("evidence capture status must record strictModeReady=true.");
  }
  if (report.summary.completeArtifacts < 0) {
    failures.push("completeArtifacts must not be negative.");
  }
  if (report.summary.templatesCreated < 4) {
    failures.push("templatesCreated must include provider/runtime/admin evidence templates and the UI source coverage artifact.");
  }

  const lanes: EvidenceLaneStatuses = {
    uiSurfaceCoverageEvidence: report.summary.uiSurfaceCoverageEvidence,
    providerSmokeEvidence: report.summary.providerSmokeEvidence,
    runtimeSmokeEvidence: report.summary.runtimeSmokeEvidence,
    adminTruthSampleEvidence: report.summary.adminTruthSampleEvidence,
  };
  const lanesComplete = allLanesComplete(lanes);
  if ((!lanesComplete || !readCurrentBetaExitCanStart()) && report.summary.canStartBetaExitReview) {
    failures.push("canStartBetaExitReview must remain false until all evidence lanes are complete and current beta exit status agrees.");
  }
  if (!lanesComplete && report.missingEvidence.length === 0) {
    failures.push("missingEvidence must not be empty while evidence lanes are missing or incomplete.");
  }
  if (!Array.isArray(report.sourceReadyEvidence) || !report.sourceReadyEvidence.some((entry) => /runtime watch-time/iu.test(entry))) {
    failures.push("sourceReadyEvidence must represent source-ready runtime watch-time proof separately.");
  }
  if (
    !report.summary.liveRuntimeEvidence?.expectedImportPath
    || !report.summary.liveRuntimeEvidence.statusSummary.includes("live_runtime_evidence_bridge=")
    || !report.summary.liveRuntimeEvidence.statusSummary.includes(report.summary.liveRuntimeEvidence.expectedImportPath)
  ) {
    failures.push("evidence capture status must represent the live runtime evidence bridge and daily activity import path.");
  }
  if (!report.sourceReadyEvidence.some((entry) => entry.includes("live runtime evidence bridge:"))) {
    failures.push("sourceReadyEvidence must include live runtime evidence bridge status.");
  }
  if (!Array.isArray(report.formalMissingEvidence) || !report.formalMissingEvidence.some((entry) => /provider-backed site activity evidence remains source-required/iu.test(entry))) {
    failures.push("formalMissingEvidence must keep provider-backed site activity separated from operator confirmation and tied to provider/app source evidence.");
  }
  if (!report.formalMissingEvidence.some((entry) => /clears connected site-activity lanes; provider-backed activity, .*billing, .*exact-user lanes need matching source exports/iu.test(entry))) {
    failures.push("formalMissingEvidence must explain that live activity clears connected site lanes while protected lanes need matching source exports.");
  }
  const operatorRevenueSmoke = report.summary.operatorRevenueSmoke;
  if (operatorRevenueSmoke?.revenueSmokeStatus === "operator_confirmed_revenue_smoke") {
    if (!Array.isArray(report.operatorConfirmedEvidence) || !report.operatorConfirmedEvidence.some((entry) => /operator-confirmed GumDrop revenue smoke/iu.test(entry))) {
      failures.push("operatorConfirmedEvidence must acknowledge operator-confirmed revenue smoke.");
    }
    if (!(typeof operatorRevenueSmoke.amountUsdConfirmed === "number" && operatorRevenueSmoke.amountUsdConfirmed > 0) || operatorRevenueSmoke.product !== "GumDrops") {
      failures.push("operator-confirmed revenue smoke must keep amount/product fields.");
    }
    if (operatorRevenueSmoke.formalProviderSmokePassed || operatorRevenueSmoke.providerArtifactAttached) {
      failures.push("operator-confirmed revenue smoke must not clear provider-backed site activity evidence.");
    }
    if (operatorRevenueSmoke.betaGateImpact !== "product_signal_only") {
      failures.push("operator-confirmed revenue smoke must be product_signal_only.");
    }
  }
  if ((report.nextExactSteps?.length ?? 0) === 0) {
    failures.push("nextExactSteps must not be empty.");
  }
  if (!Array.isArray(report.refreshPlan) || report.refreshPlan.length === 0) {
    failures.push("refreshPlan must exist.");
  }
  if (!Array.isArray(report.staleArtifacts)) {
    failures.push("staleArtifacts must exist.");
  } else if (report.staleArtifacts.some((entry) => !entry.nextAction || !entry.refreshCommand)) {
    failures.push("staleArtifacts must include nextAction and refreshCommand.");
  }
  if (!Array.isArray(report.exactRefreshCommands) || !report.exactRefreshCommands.includes("npm run check:evidence-capture-status")) {
    failures.push("exactRefreshCommands must include evidence capture refresh command.");
  }
  for (const folder of [
    "agent/state",
    "agent/evidence/provider-smoke",
    "agent/evidence/runtime-smoke",
    "agent/evidence/admin-truth-sample",
  ]) {
    if (!report.evidenceFolders.some((entry) => entry.folder === folder)) {
      failures.push(`evidenceFolders must include ${folder}.`);
    }
  }

  return failures;
}

function buildFromWorkspace() {
  const head = currentHead();
  const uiSurfaceCoverage = evaluateUiSurfaceCoverageEvidence(head);
  const provider = evaluateProviderSmokeEvidence();
  const runtime = evaluateRuntimeSmokeEvidence();
  const admin = evaluateAdminTruthSampleEvidence();
  const laneStatuses: EvidenceLaneStatuses = {
    uiSurfaceCoverageEvidence: uiSurfaceCoverage.status,
    providerSmokeEvidence: provider.status,
    runtimeSmokeEvidence: runtime.status,
    adminTruthSampleEvidence: admin.status,
  };
  const templatesCreated = [uiSurfaceCoverage, provider, runtime, admin].filter((lane) => lane.templateExists).length;
  const completeArtifacts = [uiSurfaceCoverage, provider, runtime, admin].reduce(
    (count, lane) => count + lane.completeArtifacts.length,
    0,
  );

  return buildEvidenceCaptureStatusReport({
    currentHead: head,
    generatedAtUtc: new Date().toISOString(),
    laneStatuses,
    templatesCreated,
    completeArtifacts,
    currentBetaExitCanStart: readCurrentBetaExitCanStart(),
    operatorRevenueSmoke: readOperatorRevenueSmoke(),
    liveRuntimeEvidence: summarizeLiveRuntimeEvidenceFromArtifact(),
  });
}

function writeDocs(report: EvidenceCaptureStatusReport) {
  const lines = [
    "# Evidence Capture Status",
    "",
    "Artifact: `agent/state/evidence-capture-status.generated.json`",
    "",
    `Generated: ${report.generatedAtUtc}`,
    "",
    `Latest code version: \`${report.currentHead}\``,
    "",
    "## Summary",
    "",
    `- UI surface coverage evidence: \`${report.summary.uiSurfaceCoverageEvidence}\`.`,
    `- Provider-backed site activity evidence: \`${report.summary.providerSmokeEvidence}\`.`,
    `- Deployed route evidence: \`${report.summary.runtimeSmokeEvidence}\`.`,
    `- Admin source sample evidence: \`${report.summary.adminTruthSampleEvidence}\`.`,
    `- Templates created: ${report.summary.templatesCreated}.`,
    `- Complete artifacts: ${report.summary.completeArtifacts}.`,
    `- Strict mode ready: ${report.summary.strictModeReady ? "yes" : "no"}.`,
    `- Beta exit review can start: ${report.summary.canStartBetaExitReview ? "yes" : "no"}.`,
    `- Operator revenue smoke: \`${report.summary.operatorRevenueSmoke.revenueSmokeStatus}\`.`,
    `- Live runtime evidence: \`${report.summary.liveRuntimeEvidence.statusSummary}\`.`,
    `- Daily activity import path: \`${report.summary.liveRuntimeEvidence.expectedImportPath}\`.`,
    `- Operator confirmed amount/product: ${report.summary.operatorRevenueSmoke.amountUsdConfirmed ?? "n/a"} ${report.summary.operatorRevenueSmoke.product}.`,
    `- Provider-backed evidence from operator confirmation: ${report.summary.operatorRevenueSmoke.formalProviderSmokePassed ? "yes" : "no"}.`,
    "",
    report.summary.operatorRevenueSmoke.revenueSmokeStatus === "operator_confirmed_revenue_smoke"
      ? "Operator-confirmed GumDrop revenue smoke was recorded. Provider-backed site activity evidence is still separate."
      : "No operator-confirmed revenue smoke artifact is recorded.",
    "",
    "Templates are scaffolding only. They use `template_not_evidence` and do not count as complete evidence.",
    "",
    "## Evidence Folders",
    "",
    ...report.evidenceFolders.map((folder) => `- \`${folder.folder}\` - ${folder.status}; template \`${folder.templatePath}\`.`),
    "",
    "## Missing Evidence",
    "",
    ...(report.missingEvidence.length > 0 ? report.missingEvidence.map((item) => `- ${item}`) : ["- None."]),
    "",
    "## Source-Ready Evidence",
    "",
    ...(report.sourceReadyEvidence.length > 0 ? report.sourceReadyEvidence.map((item) => `- ${item}`) : ["- None."]),
    "",
    "## Operator-Confirmed Evidence",
    "",
    ...(report.operatorConfirmedEvidence.length > 0 ? report.operatorConfirmedEvidence.map((item) => `- ${item}`) : ["- None."]),
    "",
    "## Typed Evidence Still Required",
    "",
    ...(report.formalMissingEvidence.length > 0 ? report.formalMissingEvidence.map((item) => `- ${item}`) : ["- None."]),
    "",
    "## Refresh Plan",
    "",
    ...report.refreshPlan.map((entry) => `- ${entry.artifactPath}: ${entry.message} Command: \`${entry.refreshCommand ?? "register a refresh command"}\`.`),
    "",
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((step, index) => `${index + 1}. ${step}`),
    "",
  ];
  writeFileSync(docsPath, `${lines.join("\n")}\n`);
}

function main() {
  const head = currentHead();
  const forceRefresh = process.argv.includes("--refresh") || process.env.EVIDENCE_CAPTURE_STATUS_REFRESH === "1";
  const existing = readReport();
  const existingVersion = existing
    ? classifyGeneratedArtifactFromGit({
      cwd: repoRoot,
      artifactPath: reportRelativePath,
      artifactHead: existing.currentHead,
      ownedSourcePaths: [...evidenceCaptureOwnedInputPaths],
    })
    : null;
  const report = !forceRefresh && existing && existingVersion && isGeneratedArtifactCurrent(existingVersion)
    ? existing
    : buildFromWorkspace();
  if (report !== existing) {
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    writeDocs(report);
  }

  const failures = validateEvidenceCaptureStatusReport(report, head);
  if (failures.length > 0) {
    console.error("Evidence capture status validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `Evidence capture status passed. uiSurfaceCoverage=${report.summary.uiSurfaceCoverageEvidence} ` +
      `provider=${report.summary.providerSmokeEvidence} runtime=${report.summary.runtimeSmokeEvidence} ` +
      `admin=${report.summary.adminTruthSampleEvidence} betaExit=${report.summary.canStartBetaExitReview}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
