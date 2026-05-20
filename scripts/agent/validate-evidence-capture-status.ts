import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { evaluateAdminTruthSampleEvidence } from "./validate-admin-truth-sample-evidence";
import { evaluateManualScreenshotEvidence } from "./validate-manual-screenshot-evidence";
import { evaluateProviderSmokeEvidence } from "./validate-provider-smoke-evidence";
import { evaluateRuntimeSmokeEvidence } from "./validate-runtime-smoke-evidence";

type EvidenceStatus = "missing" | "incomplete" | "complete";

type EvidenceLaneStatuses = {
  manualScreenshotEvidence: EvidenceStatus;
  providerSmokeEvidence: EvidenceStatus;
  runtimeSmokeEvidence: EvidenceStatus;
  adminTruthSampleEvidence: EvidenceStatus;
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
  };
  evidenceFolders: Array<{
    lane: keyof EvidenceLaneStatuses;
    folder: string;
    templatePath: string;
    status: EvidenceStatus;
  }>;
  missingEvidence: string[];
  completeEvidence: string[];
  nextExactSteps: string[];
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

const laneLabels: Record<keyof EvidenceLaneStatuses, string> = {
  manualScreenshotEvidence: "manual screenshot evidence",
  providerSmokeEvidence: "provider smoke evidence",
  runtimeSmokeEvidence: "runtime smoke evidence",
  adminTruthSampleEvidence: "admin truth sample evidence",
};

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function readCurrentBetaExitCanStart() {
  if (!existsSync(currentBetaExitPath)) return false;
  const report = JSON.parse(readFileSync(currentBetaExitPath, "utf8")) as { summary?: { canStartBetaExitReview?: unknown } };
  return report.summary?.canStartBetaExitReview === true;
}

function allLanesComplete(laneStatuses: EvidenceLaneStatuses) {
  return Object.values(laneStatuses).every((status) => status === "complete");
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

export function buildEvidenceCaptureStatusReport(options: BuildOptions): EvidenceCaptureStatusReport {
  const canStartBetaExitReview = allLanesComplete(options.laneStatuses) && options.currentBetaExitCanStart;
  const missingEvidence = (Object.entries(options.laneStatuses) as Array<[keyof EvidenceLaneStatuses, EvidenceStatus]>)
    .filter(([, status]) => status !== "complete")
    .map(([lane, status]) => `${laneLabels[lane]} is ${status}.`);
  const completeEvidence = (Object.entries(options.laneStatuses) as Array<[keyof EvidenceLaneStatuses, EvidenceStatus]>)
    .filter(([, status]) => status === "complete")
    .map(([lane]) => `${laneLabels[lane]} is complete.`);

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
      operatorRevenueSmoke: options.operatorRevenueSmoke ?? defaultOperatorRevenueSmoke(),
    },
    evidenceFolders: [
      {
        lane: "manualScreenshotEvidence",
        folder: "agent/evidence/manual-screenshot-qa",
        templatePath: "agent/evidence/manual-screenshot-qa/evidence.template.json",
        status: options.laneStatuses.manualScreenshotEvidence,
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
    missingEvidence,
    completeEvidence,
    nextExactSteps: [
      "Copy agent/evidence/manual-screenshot-qa/evidence.template.json to a dated JSON artifact and attach screenshots under agent/evidence/manual-screenshot-qa/screenshots/.",
      "Copy agent/evidence/provider-smoke/evidence.template.json to a dated JSON artifact after provider smoke is run; redact provider tokens and secrets.",
      "Copy agent/evidence/runtime-smoke/evidence.template.json to a dated JSON artifact after deployed runtime smoke is run.",
      "Copy agent/evidence/admin-truth-sample/evidence.template.json to a dated JSON artifact after a fresh redacted admin truth sample is attached.",
      "Run EVIDENCE_STRICT=1 npm run check:manual-screenshot-evidence once manual screenshot evidence is expected to be complete.",
      "Run EVIDENCE_STRICT=1 npm run check:provider-smoke-evidence once provider smoke evidence is expected to be complete.",
      "Run EVIDENCE_STRICT=1 npm run check:runtime-smoke-evidence once runtime smoke evidence is expected to be complete.",
      "Run EVIDENCE_STRICT=1 npm run check:admin-truth-sample-evidence once admin truth evidence is expected to be complete.",
    ],
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
  if (report.currentHead !== head) {
    failures.push(`evidence capture status currentHead must match git HEAD (${head}).`);
  }
  if (!report.summary.strictModeReady) {
    failures.push("evidence capture status must record strictModeReady=true.");
  }
  if (report.summary.completeArtifacts < 0) {
    failures.push("completeArtifacts must not be negative.");
  }
  if (report.summary.templatesCreated < 4) {
    failures.push("templatesCreated must include all four evidence templates.");
  }

  const lanes: EvidenceLaneStatuses = {
    manualScreenshotEvidence: report.summary.manualScreenshotEvidence,
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
  const operatorRevenueSmoke = report.summary.operatorRevenueSmoke;
  if (operatorRevenueSmoke?.revenueSmokeStatus === "operator_confirmed_revenue_smoke") {
    if (operatorRevenueSmoke.amountUsdConfirmed !== 50 || operatorRevenueSmoke.product !== "GumDrops") {
      failures.push("operator-confirmed revenue smoke must keep amount/product fields.");
    }
    if (operatorRevenueSmoke.formalProviderSmokePassed || operatorRevenueSmoke.providerArtifactAttached) {
      failures.push("operator-confirmed revenue smoke must not clear formal provider evidence.");
    }
    if (operatorRevenueSmoke.betaGateImpact !== "product_signal_only") {
      failures.push("operator-confirmed revenue smoke must be product_signal_only.");
    }
  }
  if ((report.nextExactSteps?.length ?? 0) === 0) {
    failures.push("nextExactSteps must not be empty.");
  }
  for (const folder of [
    "agent/evidence/manual-screenshot-qa",
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
  const manual = evaluateManualScreenshotEvidence();
  const provider = evaluateProviderSmokeEvidence();
  const runtime = evaluateRuntimeSmokeEvidence();
  const admin = evaluateAdminTruthSampleEvidence();
  const laneStatuses: EvidenceLaneStatuses = {
    manualScreenshotEvidence: manual.status,
    providerSmokeEvidence: provider.status,
    runtimeSmokeEvidence: runtime.status,
    adminTruthSampleEvidence: admin.status,
  };
  const templatesCreated = [manual, provider, runtime, admin].filter((lane) => lane.templateExists).length;
  const completeArtifacts = [manual, provider, runtime, admin].reduce(
    (count, lane) => count + lane.completeArtifacts.length,
    0,
  );

  return buildEvidenceCaptureStatusReport({
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
    laneStatuses,
    templatesCreated,
    completeArtifacts,
    currentBetaExitCanStart: readCurrentBetaExitCanStart(),
    operatorRevenueSmoke: readOperatorRevenueSmoke(),
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
    `- Manual screenshot evidence: \`${report.summary.manualScreenshotEvidence}\`.`,
    `- Provider smoke evidence: \`${report.summary.providerSmokeEvidence}\`.`,
    `- Runtime smoke evidence: \`${report.summary.runtimeSmokeEvidence}\`.`,
    `- Admin truth sample evidence: \`${report.summary.adminTruthSampleEvidence}\`.`,
    `- Templates created: ${report.summary.templatesCreated}.`,
    `- Complete artifacts: ${report.summary.completeArtifacts}.`,
    `- Strict mode ready: ${report.summary.strictModeReady ? "yes" : "no"}.`,
    `- Beta exit review can start: ${report.summary.canStartBetaExitReview ? "yes" : "no"}.`,
    `- Operator revenue smoke: \`${report.summary.operatorRevenueSmoke.revenueSmokeStatus}\`.`,
    `- Operator confirmed amount/product: ${report.summary.operatorRevenueSmoke.amountUsdConfirmed ?? "n/a"} ${report.summary.operatorRevenueSmoke.product}.`,
    `- Formal provider proof from operator smoke: ${report.summary.operatorRevenueSmoke.formalProviderSmokePassed ? "yes" : "no"}.`,
    "",
    report.summary.operatorRevenueSmoke.revenueSmokeStatus === "operator_confirmed_revenue_smoke"
      ? "A real $50 GumDrop payment was operator-confirmed. Formal provider evidence is still separate."
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
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((step, index) => `${index + 1}. ${step}`),
    "",
  ];
  writeFileSync(docsPath, `${lines.join("\n")}\n`);
}

function main() {
  const report = buildFromWorkspace();
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  writeDocs(report);

  const failures = validateEvidenceCaptureStatusReport(report, currentHead());
  if (failures.length > 0) {
    console.error("Evidence capture status validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `Evidence capture status passed. manual=${report.summary.manualScreenshotEvidence} ` +
      `provider=${report.summary.providerSmokeEvidence} runtime=${report.summary.runtimeSmokeEvidence} ` +
      `admin=${report.summary.adminTruthSampleEvidence} betaExit=${report.summary.canStartBetaExitReview}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
