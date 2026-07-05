import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildRefreshPlan } from "../../src/lib/agent-score/refresh-safeguards";
import { REFRESH_ARTIFACT_REGISTRY } from "../../src/lib/agent-score/refresh-registry";
import { readGeneratedArtifactGitContext } from "../../src/lib/agent-score/generated-artifact-version-policy";

type FormalEvidenceStatus = "missing" | "incomplete" | "complete";
type EvidenceLaneStatus =
  | "formal_missing"
  | "formal_complete"
  | "source_surface_checked"
  | "source_surface_gap"
  | "operator_confirmed"
  | "source_ready_runtime_proof_required"
  | "owner_review_required";

export type BetaEvidenceLanePrepLane = {
  id:
    | "ui_surface_coverage"
    | "provider_smoke"
    | "operator_confirmed_revenue_smoke"
    | "runtime_smoke"
    | "admin_truth_sample"
    | "runtime_watch_time_proof"
    | "cost_owner_review"
    | "speed_security_owner_review";
  label: string;
  folder: string;
  template: string;
  checklist: string;
  validatorCommand: string;
  status: EvidenceLaneStatus;
  statusEnum: EvidenceLaneStatus[];
  requiredForBetaExit: boolean;
  sourceReady: boolean;
  completeAsProductSignal: boolean;
  clearsFormalProviderGate: boolean;
  scoreImpact: string;
  launchGateImpact: string;
  nextAction: string;
};

export type BetaEvidenceLanePrepReport = {
  generatedAtUtc: string;
  reportKey: "beta-evidence-lane-prep";
  currentHead: string;
  summary: {
    laneCount: number;
    formalMissingCount: number;
    sourceReadyCount: number;
    operatorConfirmedCount: number;
    betaExitReady: false;
    providerSmokeGateCleared: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  lanes: BetaEvidenceLanePrepLane[];
  sourceReadyLanes: string[];
  operatorConfirmedLanes: string[];
  formalMissingLanes: string[];
  operatorPlainLanguageNote: string;
  refreshPlan: Array<{
    artifactPath: string;
    status: string;
    nextAction: string;
    refreshCommand: string | null;
  }>;
  staleReports: Array<{
    artifactPath: string;
    status: string;
    nextAction: string;
    refreshCommand: string | null;
  }>;
  nextExactSteps: string[];
};

type BuildInput = {
  currentHead?: string;
  generatedAtUtc?: string;
  evidenceCaptureSummary?: Partial<{
    uiSurfaceCoverageEvidence: FormalEvidenceStatus;
    providerSmokeEvidence: FormalEvidenceStatus;
    runtimeSmokeEvidence: FormalEvidenceStatus;
    adminTruthSampleEvidence: FormalEvidenceStatus;
    canStartBetaExitReview: boolean;
  }>;
  operatorRevenueSmoke?: Partial<{
    revenueSmokeStatus: string;
    amountUsdConfirmed: number;
    product: string;
    plainLanguageNote: string;
    providerArtifactAttached: boolean;
    formalProviderSmokePassed: boolean;
    providerSmokeGateStatus: string;
  }>;
  refreshPlan?: Array<{
    artifactPath: string;
    status: string;
    nextAction: string;
    refreshCommand: string | null;
  }>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const reportRelativePath = "agent/state/beta-evidence-lane-prep.generated.json";
const docsRelativePath = "docs/agent-truth/beta-evidence-lane-prep.md";
const reportPath = join(repoRoot, reportRelativePath);
const docsPath = join(repoRoot, docsRelativePath);

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function readJson(relativePath: string): Record<string, unknown> {
  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) return {};
  return JSON.parse(readFileSync(fullPath, "utf8")) as Record<string, unknown>;
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function normalizeProviderBackedEvidenceNote(note: string) {
  return note
    .replace(/Formal provider evidence is still separate\./giu, "Provider-backed site activity evidence is still separate.")
    .replace(/formal provider smoke/giu, "provider-backed site activity evidence")
    .replace(/formal provider\/app proof/giu, "provider-backed site activity evidence");
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function formalStatus(status: unknown): EvidenceLaneStatus {
  return status === "complete" ? "formal_complete" : "formal_missing";
}

function uiSurfaceCoverageStatus(status: unknown): EvidenceLaneStatus {
  return status === "complete" ? "source_surface_checked" : "source_surface_gap";
}

function artifactInput(relativePath: string, head: string) {
  const parsed = readJson(relativePath);
  if (Object.keys(parsed).length === 0) {
    return {
      artifactPath: relativePath,
      currentCodeVersion: head,
      exists: false,
    };
  }
  const artifactHead = readString(parsed.sourceCommit ?? parsed.currentHead) || undefined;
  const gitContext = artifactHead
    ? readGeneratedArtifactGitContext(repoRoot, artifactHead, relativePath)
    : null;
  return {
    artifactPath: relativePath,
    generatedAtUtc: readString(parsed.generatedAtUtc ?? parsed.generatedAt) || undefined,
    sourceCommit: artifactHead,
    currentHead: readString(parsed.currentHead) || undefined,
    currentCodeVersion: head,
    parentHead: gitContext?.parentHead,
    changedFilesInHead: gitContext?.changedFilesInHead,
    changedFilesSinceArtifactHead: gitContext?.changedFilesSinceArtifactHead,
    exists: true,
  };
}

function lane(input: BetaEvidenceLanePrepLane): BetaEvidenceLanePrepLane {
  return input;
}

function readWorkspaceInput(head: string): Required<Pick<BuildInput, "evidenceCaptureSummary" | "operatorRevenueSmoke" | "refreshPlan">> {
  const evidence = readJson("agent/state/evidence-capture-status.generated.json");
  const evidenceSummary = (evidence.summary && typeof evidence.summary === "object" ? evidence.summary : {}) as Record<string, unknown>;
  const operator = readJson("agent/state/operator-revenue-smoke.generated.json");
  const operatorSummary = (operator.summary && typeof operator.summary === "object" ? operator.summary : {}) as Record<string, unknown>;
  const refreshPlan = buildRefreshPlan(REFRESH_ARTIFACT_REGISTRY.map((entry) => artifactInput(entry.artifactPath, head)), {
    currentCodeVersion: head,
    nowUtc: new Date().toISOString(),
  }).map((entry) => ({
    artifactPath: entry.artifactPath,
    status: entry.status,
    nextAction: entry.nextAction,
    refreshCommand: entry.refreshCommand,
  }));

  return {
    evidenceCaptureSummary: {
      uiSurfaceCoverageEvidence: evidenceSummary.uiSurfaceCoverageEvidence as FormalEvidenceStatus | undefined,
      providerSmokeEvidence: evidenceSummary.providerSmokeEvidence as FormalEvidenceStatus | undefined,
      runtimeSmokeEvidence: evidenceSummary.runtimeSmokeEvidence as FormalEvidenceStatus | undefined,
      adminTruthSampleEvidence: evidenceSummary.adminTruthSampleEvidence as FormalEvidenceStatus | undefined,
      canStartBetaExitReview: evidenceSummary.canStartBetaExitReview === true,
    },
    operatorRevenueSmoke: {
      revenueSmokeStatus: readString(operatorSummary.revenueSmokeStatus, "not_recorded"),
      amountUsdConfirmed: readNumber(operatorSummary.amountUsdConfirmed, 0),
      product: readString(operatorSummary.product, "unknown"),
      plainLanguageNote: readString(operator.plainLanguageNote, ""),
      providerArtifactAttached: operatorSummary.providerArtifactAttached === true,
      formalProviderSmokePassed: operatorSummary.formalProviderSmokePassed === true,
      providerSmokeGateStatus: readString(operatorSummary.providerSmokeGateStatus, "missing_formal_evidence"),
    },
    refreshPlan,
  };
}

export function buildBetaEvidenceLanePrepReport(input: BuildInput = {}): BetaEvidenceLanePrepReport {
  const current = input.currentHead ?? currentHead();
  const generatedAtUtc = input.generatedAtUtc ?? new Date().toISOString();
  const workspace = input.evidenceCaptureSummary && input.operatorRevenueSmoke && input.refreshPlan
    ? {
      evidenceCaptureSummary: input.evidenceCaptureSummary,
      operatorRevenueSmoke: input.operatorRevenueSmoke,
      refreshPlan: input.refreshPlan,
    }
    : readWorkspaceInput(current);
  const evidence = {
    ...workspace.evidenceCaptureSummary,
    ...input.evidenceCaptureSummary,
  };
  const operator = {
    ...workspace.operatorRevenueSmoke,
    ...input.operatorRevenueSmoke,
  };
  const refreshPlan = (input.refreshPlan ?? workspace.refreshPlan)
    .filter((entry) => entry.artifactPath !== reportRelativePath);
  const operatorConfirmed = operator.revenueSmokeStatus === "operator_confirmed_revenue_smoke";
  const providerFormalPassed = operator.formalProviderSmokePassed === true || evidence.providerSmokeEvidence === "complete";
  const operatorPlainLanguageNote = operatorConfirmed
    ? normalizeProviderBackedEvidenceNote(readString(operator.plainLanguageNote, ""))
      || "Operator-confirmed GumDrop revenue smoke was recorded. Provider-backed site activity evidence is still separate."
    : "No operator-confirmed GumDrop revenue smoke is recorded.";

  const lanes: BetaEvidenceLanePrepLane[] = [
    lane({
      id: "ui_surface_coverage",
      label: "UI surface coverage",
      folder: "agent/state",
      template: "agent/state/ui-visual-smoke-minimal.generated.json",
      checklist: "docs/agent-truth/ui-visual-smoke-minimal.md",
      validatorCommand: "npm run check:ui-visual-smoke-minimal",
      status: uiSurfaceCoverageStatus(evidence.uiSurfaceCoverageEvidence),
      statusEnum: ["source_surface_gap", "source_surface_checked"],
      requiredForBetaExit: true,
      sourceReady: evidence.uiSurfaceCoverageEvidence === "complete",
      completeAsProductSignal: evidence.uiSurfaceCoverageEvidence === "complete",
      clearsFormalProviderGate: false,
      scoreImpact: "Raises UI confidence when deterministic source coverage can find disconnected surfaces before visual review.",
      launchGateImpact: "Required for beta exit as source coverage; browser reproduction is optional only to reproduce a source-reported UI issue.",
      nextAction: "Run npm run check:ui-visual-smoke-minimal and fix any source-reported UI surface gap.",
    }),
    lane({
      id: "provider_smoke",
      label: "Provider-backed site activity evidence",
      folder: "agent/evidence/provider-smoke",
      template: "agent/evidence/provider-smoke/evidence.template.json",
      checklist: "docs/agent-truth/provider-smoke-evidence-checklist.md",
      validatorCommand: "EVIDENCE_STRICT=1 npm run check:provider-smoke-evidence",
      status: providerFormalPassed ? "formal_complete" : "formal_missing",
      statusEnum: ["formal_missing", "formal_complete"],
      requiredForBetaExit: true,
      sourceReady: false,
      completeAsProductSignal: false,
      clearsFormalProviderGate: providerFormalPassed,
      scoreImpact: "Raises provider confidence only after redacted provider-backed site activity evidence is attached.",
      launchGateImpact: "Required for beta exit; operator confirmation alone does not clear this gate.",
      nextAction: "Attach redacted provider-backed site activity evidence only if the operator chooses to clear the provider lane.",
    }),
    lane({
      id: "operator_confirmed_revenue_smoke",
      label: "Operator-confirmed revenue smoke",
      folder: "agent/state",
      template: "agent/state/operator-revenue-smoke.generated.json",
      checklist: "docs/agent-truth/operator-revenue-smoke.md",
      validatorCommand: "npm run check:operator-revenue-smoke",
      status: operatorConfirmed ? "operator_confirmed" : "formal_missing",
      statusEnum: ["operator_confirmed", "formal_missing"],
      requiredForBetaExit: false,
      sourceReady: operatorConfirmed,
      completeAsProductSignal: operatorConfirmed,
      clearsFormalProviderGate: false,
      scoreImpact: "Improves product confidence notes as real GumDrop revenue signal.",
      launchGateImpact: `${operatorPlainLanguageNote} It does not clear provider-backed site activity evidence or beta exit.`,
      nextAction: "Keep this acknowledged as real product signal; provider-backed site activity evidence is optional for acknowledging the sale.",
    }),
    lane({
      id: "runtime_smoke",
      label: "Deployed route evidence",
      folder: "agent/evidence/runtime-smoke",
      template: "agent/evidence/runtime-smoke/evidence.template.json",
      checklist: "docs/agent-truth/runtime-smoke-evidence-checklist.md",
      validatorCommand: "EVIDENCE_STRICT=1 npm run check:runtime-smoke-evidence",
      status: formalStatus(evidence.runtimeSmokeEvidence),
      statusEnum: ["formal_missing", "formal_complete"],
      requiredForBetaExit: true,
      sourceReady: false,
      completeAsProductSignal: false,
      clearsFormalProviderGate: false,
      scoreImpact: "Raises runtime confidence after deployed route and flow evidence is attached.",
      launchGateImpact: "Required for beta exit; local validators are not deployed route evidence.",
      nextAction: "Attach deployed route evidence using the runtime evidence template.",
    }),
    lane({
      id: "admin_truth_sample",
      label: "Admin source sample evidence",
      folder: "agent/evidence/admin-truth-sample",
      template: "agent/evidence/admin-truth-sample/evidence.template.json",
      checklist: "docs/agent-truth/admin-truth-sample-evidence-checklist.md",
      validatorCommand: "EVIDENCE_STRICT=1 npm run check:admin-truth-sample-evidence",
      status: formalStatus(evidence.adminTruthSampleEvidence),
      statusEnum: ["formal_missing", "formal_complete"],
      requiredForBetaExit: true,
      sourceReady: false,
      completeAsProductSignal: false,
      clearsFormalProviderGate: false,
      scoreImpact: "Raises admin-truth confidence after a fresh redacted source sample is attached.",
      launchGateImpact: "Required for beta exit; admin UI presence alone does not clear this lane.",
      nextAction: "Attach a redacted admin source sample with source freshness and sample count.",
    }),
    lane({
      id: "runtime_watch_time_proof",
      label: "Runtime watch-time source evidence",
      folder: "agent/evidence/runtime-smoke",
      template: "agent/evidence/runtime-smoke/evidence.template.json",
      checklist: "docs/agent-truth/runtime-smoke-evidence-checklist.md",
      validatorCommand: "npm run check:runtime-watch-time-v2 && EVIDENCE_STRICT=1 npm run check:runtime-smoke-evidence",
      status: "source_ready_runtime_proof_required",
      statusEnum: ["source_ready_runtime_proof_required", "formal_complete"],
      requiredForBetaExit: true,
      sourceReady: true,
      completeAsProductSignal: false,
      clearsFormalProviderGate: false,
      scoreImpact: "Keeps watch-time source readiness separate from deployed playback evidence.",
      launchGateImpact: "Source-ready watch-time logic still needs deployed media activity evidence before beta exit.",
      nextAction: "Attach deployed playback evidence showing runtime watch-time v2 on real media routes.",
    }),
    lane({
      id: "cost_owner_review",
      label: "Cost owner-review",
      folder: "agent/state",
      template: "docs/agent-truth/final-cost-audit-lock.md",
      checklist: "docs/agent-truth/final-cost-audit-lock.md",
      validatorCommand: "npm run check:final-cost-audit-lock",
      status: "owner_review_required",
      statusEnum: ["owner_review_required", "formal_complete"],
      requiredForBetaExit: false,
      sourceReady: false,
      completeAsProductSignal: false,
      clearsFormalProviderGate: false,
      scoreImpact: "Keeps external cost posture visible without pretending source inventory is billing evidence.",
      launchGateImpact: "Owner-review context only unless a P0/P1 cost blocker appears.",
      nextAction: "Attach owner-reviewed cost evidence when the operator chooses to formalize the lane.",
    }),
    lane({
      id: "speed_security_owner_review",
      label: "Speed/security owner-review",
      folder: "agent/state",
      template: "docs/agent-truth/speed-security-hardening.md",
      checklist: "docs/agent-truth/speed-security-hardening.md",
      validatorCommand: "npm run check:speed-security",
      status: "owner_review_required",
      statusEnum: ["owner_review_required", "formal_complete"],
      requiredForBetaExit: false,
      sourceReady: false,
      completeAsProductSignal: false,
      clearsFormalProviderGate: false,
      scoreImpact: "Keeps speed/security P2 backlog visible without blocking unrelated source-ready lanes.",
      launchGateImpact: "Owner-review context unless findings escalate to beta-exit blockers.",
      nextAction: "Keep owner-review backlog visible and refresh the speed/security report when needed.",
    }),
  ];

  const formalMissingLanes = lanes.filter((entry) => entry.status === "formal_missing").map((entry) => entry.id);
  const sourceReadyLanes = lanes.filter((entry) => entry.sourceReady).map((entry) => entry.id);
  const operatorConfirmedLanes = lanes.filter((entry) => entry.status === "operator_confirmed").map((entry) => entry.id);
  const staleReports = refreshPlan
    .filter((entry) => entry.status !== "current")
    .map((entry) => ({
      artifactPath: entry.artifactPath,
      status: entry.status,
      nextAction: entry.nextAction,
      refreshCommand: entry.refreshCommand,
    }));

  return {
    generatedAtUtc,
    reportKey: "beta-evidence-lane-prep",
    currentHead: current,
    summary: {
      laneCount: lanes.length,
      formalMissingCount: formalMissingLanes.length,
      sourceReadyCount: sourceReadyLanes.length,
      operatorConfirmedCount: operatorConfirmedLanes.length,
      betaExitReady: false,
      providerSmokeGateCleared: providerFormalPassed,
      p0Count: 0,
      p1Count: formalMissingLanes.length,
      p2Count: staleReports.length,
    },
    lanes,
    sourceReadyLanes,
    operatorConfirmedLanes,
    formalMissingLanes,
    operatorPlainLanguageNote,
    refreshPlan,
    staleReports,
    nextExactSteps: [
      "Use this lane map before attaching evidence so source-ready, operator-confirmed, formal-missing, and owner-review states stay separate.",
      "Keep operator-confirmed revenue smoke acknowledged without requiring provider-backed site activity evidence for that acknowledgement.",
      "Attach provider-backed site activity evidence only when the operator chooses to clear the provider lane.",
      ...Array.from(new Set(refreshPlan.map((entry) => entry.refreshCommand).filter((command): command is string => Boolean(command))))
        .map((command) => `Refresh supporting report with ${command}.`),
    ],
  };
}

export function validateBetaEvidenceLanePrepReport(report: BetaEvidenceLanePrepReport | null, head: string) {
  const failures: string[] = [];
  if (!report) return ["beta-evidence-lane-prep artifact missing"];
  if (report.reportKey !== "beta-evidence-lane-prep") failures.push("reportKey must be beta-evidence-lane-prep.");
  if (report.currentHead !== head) failures.push("currentHead must match the latest code version.");
  const requiredIds = [
    "ui_surface_coverage",
    "provider_smoke",
    "operator_confirmed_revenue_smoke",
    "runtime_smoke",
    "admin_truth_sample",
    "runtime_watch_time_proof",
    "cost_owner_review",
    "speed_security_owner_review",
  ];
  const laneMap = new Map(report.lanes.map((entry) => [entry.id, entry]));
  for (const id of requiredIds) {
    const laneEntry = laneMap.get(id as BetaEvidenceLanePrepLane["id"]);
    if (!laneEntry) {
      failures.push(`missing lane ${id}.`);
      continue;
    }
    if (
      !laneEntry.folder
      || !laneEntry.template
      || !laneEntry.checklist
      || !laneEntry.validatorCommand
      || !laneEntry.status
      || laneEntry.statusEnum.length === 0
      || !laneEntry.scoreImpact
      || !laneEntry.launchGateImpact
      || !laneEntry.nextAction
    ) {
      failures.push(`${id} must include folder, template, checklist, validator, status enum, score impact, launch gate impact, and next action.`);
    }
  }
  const operatorLane = laneMap.get("operator_confirmed_revenue_smoke");
  const providerLane = laneMap.get("provider_smoke");
  if (operatorLane?.status === "operator_confirmed") {
    if (!operatorLane.completeAsProductSignal) failures.push("operator-confirmed revenue must count as product signal.");
    if (operatorLane.clearsFormalProviderGate) failures.push("operator-confirmed revenue must not clear provider-backed site activity lane.");
    if (/required|must attach|must provide/iu.test(operatorLane.nextAction) && /provider|screenshot/iu.test(operatorLane.nextAction)) {
      failures.push("operator-confirmed revenue wording must not require unnecessary provider-backed source evidence.");
    }
  }
  if (providerLane?.status === "formal_complete" && operatorLane?.status === "operator_confirmed" && operatorLane.clearsFormalProviderGate) {
    failures.push("provider lane cannot clear from operator-confirmed revenue smoke.");
  }
  if (report.summary.betaExitReady) failures.push("beta exit ready must remain false.");
  if (report.summary.providerSmokeGateCleared && providerLane?.status !== "formal_complete") {
    failures.push("provider lane cannot clear without provider-backed site activity evidence.");
  }
  for (const stale of report.staleReports) {
    if (!stale.nextAction || !stale.refreshCommand) {
      failures.push(`stale report ${stale.artifactPath} must include a refresh action.`);
    }
  }
  if (!report.sourceReadyLanes.includes("runtime_watch_time_proof")) {
    failures.push("runtime watch-time source-evidence lane must be represented.");
  }
  if (operatorLane?.status === "operator_confirmed" && !report.operatorConfirmedLanes.includes("operator_confirmed_revenue_smoke")) {
    failures.push("operator-confirmed lane must be represented.");
  }
  if (!report.operatorPlainLanguageNote.includes("Provider-backed site activity evidence is still separate.")) {
    failures.push("operator plain-language note must separate confirmed revenue from provider-backed site activity evidence.");
  }
  if (report.nextExactSteps.length === 0) failures.push("nextExactSteps must not be empty.");
  return failures;
}

function renderDocs(report: BetaEvidenceLanePrepReport) {
  return `# Beta Evidence Lane Prep

Generated: ${report.generatedAtUtc}

## Summary

- Lane count: ${report.summary.laneCount}
- Formal-missing lanes: ${report.summary.formalMissingCount}
- Source-ready lanes: ${report.sourceReadyLanes.join(", ") || "none"}
- Operator-confirmed lanes: ${report.operatorConfirmedLanes.join(", ") || "none"}
- Beta exit ready: ${report.summary.betaExitReady}

${report.operatorPlainLanguageNote}

## Lanes

${report.lanes.map((entry) => `- ${entry.id}: ${entry.status}; folder: \`${entry.folder}\`; template: \`${entry.template}\`; checklist: \`${entry.checklist}\`; validator: \`${entry.validatorCommand}\`; next: ${entry.nextAction}`).join("\n")}

## Stale Supporting Reports

${report.staleReports.length > 0 ? report.staleReports.map((entry) => `- ${entry.artifactPath}: ${entry.nextAction}`).join("\n") : "- None."}

## Next Exact Steps

${report.nextExactSteps.map((step, index) => `${index + 1}. ${step}`).join("\n")}
`;
}

function writeReport(report: BetaEvidenceLanePrepReport) {
  mkdirSync(dirname(reportPath), { recursive: true });
  mkdirSync(dirname(docsPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(docsPath, renderDocs(report));
}

function main() {
  const report = buildBetaEvidenceLanePrepReport({
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
  });
  writeReport(report);
  const failures = validateBetaEvidenceLanePrepReport(report, currentHead());
  if (failures.length > 0) {
    console.error("Beta evidence lane prep validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Beta evidence lane prep passed. lanes=${report.summary.laneCount} operator=${report.operatorConfirmedLanes.length} betaExit=${report.summary.betaExitReady}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
