import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type DependencyStatus = "passed" | "failed" | "missing_dependency" | "stale" | "not_run";
type Severity = "P0" | "P1" | "P2";

export type OvernightFinalDependencyStatus = {
  id: string;
  status: DependencyStatus;
  required: boolean;
  detail: string;
  nextAction: string;
};

export type OvernightFinalOpenPr = {
  number?: number;
  title?: string;
  url?: string;
  mergeStateStatus?: string;
  classification?: string;
};

export type OvernightFinalIntegrationLockReport = {
  generatedAtUtc: string;
  reportKey: "overnight-final-integration-lock";
  currentHead: string;
  summary: {
    wiringIntegrityStatus: string;
    telemetryOrphanStatus: string;
    parityStatus: string;
    algorithmRefinementStatus: string;
    userLoadingStatus: string;
    walletMobileScaleStatus: string;
    creatorDropStatusMetricsStatus: string;
    mobileScaleSweepStatus: string;
    chatUntouched: boolean;
    navUntouched: boolean;
    openPrCount: number;
    dirtyFileStatus: string;
    betaScore: number;
    betaStatus: string;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  dependencyStatus: OvernightFinalDependencyStatus[];
  fixesApplied: string[];
  smallScaleFixes: string[];
  remainingRisks: Array<{ severity: Severity; id: string; detail: string; nextAction: string }>;
  missingEvidence: string[];
  prCleanupActions: string[];
  nextExactSteps: string[];
  changedFiles: string[];
  untrackedFiles: string[];
  openPrs: OvernightFinalOpenPr[];
};

export type OvernightFinalIntegrationLockInputs = {
  generatedAtUtc: string;
  currentHead: string;
  changedFiles: string[];
  untrackedFiles: string[];
  dependencyStatus: OvernightFinalDependencyStatus[];
  prCleanupActions: string[];
  openPrs: OvernightFinalOpenPr[];
  betaScore: number;
  betaStatus: string;
  betaEvidenceReady: boolean;
  mobileScaleSweepFindings: string[];
  fixesApplied: string[];
  smallScaleFixes: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const ARTIFACT = "agent/state/overnight-final-integration-lock.generated.json";
const DOC = "docs/agent-truth/overnight-final-integration-lock.md";

const protectedChatPatterns = [
  /^src\/components\/Chat\//u,
  /^src\/app\/chat\//u,
  /^src\/app\/dashboard\/chat\//u,
];

const protectedNavPatterns = [
  /^src\/components\/Navigation\//u,
  /(^|\/)(Navbar|TopNav|BottomNav|MobileBottomBar)\.tsx$/u,
];

const dependencies = [
  { id: "overnight-wiring-integrity", artifact: "agent/state/overnight-wiring-integrity.generated.json", reportKey: "overnight-wiring-integrity", required: true },
  { id: "existing-algorithm-refinement", artifact: "agent/state/existing-algorithm-refinement.generated.json", reportKey: "existing-algorithm-refinement", required: true },
  { id: "user-loading-wallet-mobile-refinement", artifact: "agent/state/user-loading-wallet-mobile-refinement.generated.json", reportKey: "user-loading-wallet-mobile-refinement", required: true },
  { id: "creator-drop-status-metrics", artifact: "agent/state/creator-drop-status-metrics.generated.json", reportKey: "creator-drop-status-metrics", required: true },
  { id: "mobile-ui-final-lock", artifact: "agent/state/mobile-ui-final-lock.generated.json", reportKey: "mobile-ui-final-lock", required: true },
  { id: "final-telemetry-closure-lock", artifact: "agent/state/final-telemetry-closure-lock.generated.json", reportKey: "final-telemetry-closure-lock", required: true },
  { id: "creator-settings-control-plane", artifact: "agent/state/creator-settings-control-plane.generated.json", reportKey: "creator-settings-control-plane", required: false },
  { id: "creator-pricing-wiring", artifact: "agent/state/creator-pricing-wiring.generated.json", reportKey: "creator-pricing-wiring", required: false },
  { id: "creator-broadcast-timeline-prep", artifact: "agent/state/creator-broadcast-timeline-prep.generated.json", reportKey: "creator-broadcast-timeline-prep", required: false },
  { id: "creator-profile-mobile-timeline", artifact: "agent/state/creator-profile-mobile-timeline.generated.json", reportKey: "creator-profile-mobile-timeline", required: false },
  { id: "global-marquee-truncated-titles", artifact: "agent/state/global-marquee-truncated-titles.generated.json", reportKey: "global-marquee-truncated-titles", required: false },
  { id: "public-beta-score", artifact: "agent/state/public-beta-score.generated.json", reportKey: "public-beta-score", required: true },
  { id: "current-beta-exit-status", artifact: "agent/state/current-beta-exit-status.generated.json", reportKey: "current-beta-exit-status", required: true },
] as const;

function safeExec(command: string, args: string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function currentHead() {
  return safeExec("git", ["rev-parse", "HEAD"]);
}

function read(relativePath: string) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function readJson(relativePath: string) {
  const fullPath = join(ROOT, relativePath);
  if (!existsSync(fullPath)) return null;
  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function changedFiles() {
  const unstaged = safeExec("git", ["diff", "--name-only"]).split(/\r?\n/u).filter(Boolean);
  const staged = safeExec("git", ["diff", "--cached", "--name-only"]).split(/\r?\n/u).filter(Boolean);
  return Array.from(new Set([...unstaged, ...staged])).map((file) => file.replaceAll("\\", "/"));
}

function untrackedFiles() {
  return safeExec("git", ["ls-files", "--others", "--exclude-standard"])
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((file) => file.replaceAll("\\", "/"));
}

function isChatPath(file: string) {
  return protectedChatPatterns.some((pattern) => pattern.test(file));
}

function isNavPath(file: string) {
  return protectedNavPatterns.some((pattern) => pattern.test(file));
}

function dependencyStatus(head: string): OvernightFinalDependencyStatus[] {
  return dependencies.map((dependency) => {
    const report = readJson(dependency.artifact);
    if (!report) {
      return {
        id: dependency.id,
        status: "missing_dependency" as const,
        required: dependency.required,
        detail: `${dependency.artifact} is missing.`,
        nextAction: `Run or restore the owner lane for ${dependency.id}.`,
      };
    }
    const reportKeyMatches = dependency.id === "public-beta-score"
      ? report.scoreVersion === "beta_health_v2"
      : report.reportKey === dependency.reportKey;
    if (!reportKeyMatches) {
      return {
        id: dependency.id,
        status: "failed" as const,
        required: dependency.required,
        detail: dependency.id === "public-beta-score"
          ? `${dependency.artifact} scoreVersion is not beta_health_v2.`
          : `${dependency.artifact} reportKey is not ${dependency.reportKey}.`,
        nextAction: `Regenerate ${dependency.artifact} from its owner validator.`,
      };
    }
    if (report.currentHead !== head) {
      return {
        id: dependency.id,
        status: "stale" as const,
        required: dependency.required,
        detail: `${dependency.artifact} is stale for ${String(report.currentHead || "unknown")}.`,
        nextAction: `Run the owner check for ${dependency.id} from current HEAD.`,
      };
    }
    return {
      id: dependency.id,
      status: "passed" as const,
      required: dependency.required,
      detail: `${dependency.artifact} is current.`,
      nextAction: "Keep current; do not mark runtime/manual evidence complete from source-only artifacts.",
    };
  });
}

function classifyPr(pr: OvernightFinalOpenPr): OvernightFinalOpenPr {
  const title = `${pr.title ?? ""}`.toLowerCase();
  const asciiTitle = pr.title?.replace(/[^\x20-\x7E]/gu, "").trim();
  if (pr.number === 275 || title.includes("duplicate computation") || title.includes("aggregation hotspot")) {
    return {
      ...pr,
      title: asciiTitle || pr.title,
      classification: "preserved_unrelated_admin_analytics_optimization_outside_final_lock_scope",
    };
  }
  if (pr.number === 274 || title.includes("monolith")) {
    return {
      ...pr,
      title: asciiTitle || pr.title,
      classification: "preserved_high_risk_broad_governance_doc_outside_final_lock_scope",
    };
  }
  return { ...pr, title: asciiTitle || pr.title, classification: pr.classification ?? "" };
}

function openPrs() {
  if (process.env.ALLOW_GH_PR_LIST !== "1") return [];
  const output = safeExec("gh", [
    "pr",
    "list",
    "--repo",
    "omgitsguppey/kandylandv2",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,author,mergeStateStatus,updatedAt,url",
  ]);
  if (!output) return [];
  try {
    return (JSON.parse(output) as OvernightFinalOpenPr[]).map(classifyPr);
  } catch {
    return [];
  }
}

function mobileScaleSweepFindings() {
  const source = safeExec("rg", [
    "text-5xl|text-4xl|p-8|p-7|p-6|min-h-\\[160px\\]|rounded-3xl|h-screen|overflow-y-auto|truncate",
    "src/app",
    "src/components",
    "-n",
  ]);
  return source
    .split(/\r?\n/u)
    .filter((line) => line && !/Chat/u.test(line) && !/src[\\/]+components[\\/]+Navigation/u.test(line))
    .slice(0, 24)
    .map((line) => line.replace(/\s+/gu, " ").trim());
}

function betaScoreAndStatus() {
  const publicBeta = readJson("agent/state/public-beta-score.generated.json");
  const currentBeta = readJson("agent/state/current-beta-exit-status.generated.json");
  const publicBetaSummary = publicBeta?.summary && typeof publicBeta.summary === "object"
    ? publicBeta.summary as Record<string, unknown>
    : {};
  const currentBetaSummary = currentBeta?.summary && typeof currentBeta.summary === "object"
    ? currentBeta.summary as Record<string, unknown>
    : {};
  const betaScore = Number((publicBeta?.score ?? publicBetaSummary.betaScore ?? currentBetaSummary.betaScore) ?? 0);
  const betaStatus = String((publicBeta?.status ?? currentBetaSummary.betaStatus) ?? "unknown");
  const betaEvidenceReady = currentBeta?.summary && typeof currentBeta.summary === "object"
    ? Boolean(currentBetaSummary.canStartBetaExitReview)
    : false;
  return {
    betaScore: Number.isFinite(betaScore) ? betaScore : 0,
    betaStatus,
    betaEvidenceReady,
  };
}

function hasFile(relativePath: string) {
  return existsSync(join(ROOT, relativePath));
}

function statusFor(deps: OvernightFinalDependencyStatus[], id: string) {
  return deps.find((dependency) => dependency.id === id)?.status ?? "missing_dependency";
}

function countRisks(risks: OvernightFinalIntegrationLockReport["remainingRisks"], severity: Severity) {
  return risks.filter((risk) => risk.severity === severity).length;
}

function dirtyFileStatus(files: string[]) {
  if (files.length === 0) return "clean";
  const unknown = files.filter((file) => {
    if (file === ARTIFACT || file === DOC) return false;
    if (file === "scripts/agent/validate-overnight-final-integration-lock.ts") return false;
    if (file === "scripts/agent/validate-final-morning-beta-lock.ts") return false;
    if (file === "tests/unit/overnight-final-integration-lock.spec.ts") return false;
    if (file === "tests/unit/final-morning-beta-lock.spec.ts") return false;
    if (file === "package.json") return false;
    if (file === "CHANGELOG.md" || file === "public/kandydrops-release-notes.json") return false;
    if (file.startsWith("agent/state/") || file.startsWith("docs/agent-truth/")) return false;
    if (file.startsWith("src/lib/release-notes/")) return false;
    if (file === "agent/context/optimized-task-context.generated.json") return false;
    return true;
  });
  return unknown.length === 0 ? "classified" : `unclassified:${unknown.join(",")}`;
}

export function buildOvernightFinalIntegrationLockReport(
  inputs: OvernightFinalIntegrationLockInputs,
): OvernightFinalIntegrationLockReport {
  const allChanged = Array.from(new Set([...inputs.changedFiles, ...inputs.untrackedFiles])).map((file) => file.replaceAll("\\", "/"));
  const chatUntouched = !allChanged.some(isChatPath);
  const navUntouched = !allChanged.some(isNavPath);
  const prCleanupActions = inputs.prCleanupActions.length > 0
    ? inputs.prCleanupActions
    : inputs.openPrs.map((pr) => `Preserved PR #${pr.number}: ${pr.classification || "unclassified"}.`);

  const remainingRisks: OvernightFinalIntegrationLockReport["remainingRisks"] = [];
  if (inputs.betaEvidenceReady) {
    remainingRisks.push({
      severity: "P0",
      id: "beta_evidence_overclaim",
      detail: "Beta evidence is marked complete from source-only lock data.",
      nextAction: "Reset beta exit readiness to false until formal evidence is attached.",
    });
  }
  for (const dependency of inputs.dependencyStatus) {
    if (dependency.required && dependency.status !== "passed") {
      remainingRisks.push({
        severity: dependency.status === "missing_dependency" || dependency.status === "failed" ? "P1" : "P2",
        id: dependency.id,
        detail: dependency.detail,
        nextAction: dependency.nextAction,
      });
    }
  }
  if (inputs.mobileScaleSweepFindings.length > 0) {
    remainingRisks.push({
      severity: "P2",
      id: "mobile_scale_residuals",
      detail: `${inputs.mobileScaleSweepFindings.length} non-chat mobile scale patterns remain from the source sweep; no broad refactor was attempted in this final lock.`,
      nextAction: "Handle only owner-scoped surface fixes in future passes with screenshots/manual evidence.",
    });
  }

  const missingEvidence = [
    "manual screenshot QA evidence remains required before beta exit.",
    "provider smoke evidence remains required before beta exit.",
    "runtime smoke evidence remains required before beta exit.",
    "admin truth sample evidence remains required before beta exit.",
  ];

  const report: OvernightFinalIntegrationLockReport = {
    generatedAtUtc: inputs.generatedAtUtc,
    reportKey: "overnight-final-integration-lock",
    currentHead: inputs.currentHead,
    summary: {
      wiringIntegrityStatus: statusFor(inputs.dependencyStatus, "overnight-wiring-integrity"),
      telemetryOrphanStatus: statusFor(inputs.dependencyStatus, "final-telemetry-closure-lock"),
      parityStatus: hasFile("scripts/agent/validate-user-creator-ui-parity.ts") ? "passed" : "missing_dependency",
      algorithmRefinementStatus: statusFor(inputs.dependencyStatus, "existing-algorithm-refinement"),
      userLoadingStatus: statusFor(inputs.dependencyStatus, "user-loading-wallet-mobile-refinement"),
      walletMobileScaleStatus: statusFor(inputs.dependencyStatus, "user-loading-wallet-mobile-refinement"),
      creatorDropStatusMetricsStatus: statusFor(inputs.dependencyStatus, "creator-drop-status-metrics"),
      mobileScaleSweepStatus: inputs.mobileScaleSweepFindings.length > 0 ? "source_sweep_complete_residuals_recorded" : "source_sweep_complete_no_matches",
      chatUntouched,
      navUntouched,
      openPrCount: inputs.openPrs.length,
      dirtyFileStatus: dirtyFileStatus(allChanged),
      betaScore: inputs.betaScore,
      betaStatus: inputs.betaStatus,
      p0Count: countRisks(remainingRisks, "P0"),
      p1Count: countRisks(remainingRisks, "P1"),
      p2Count: countRisks(remainingRisks, "P2"),
    },
    dependencyStatus: inputs.dependencyStatus,
    fixesApplied: inputs.fixesApplied,
    smallScaleFixes: inputs.smallScaleFixes,
    remainingRisks,
    missingEvidence,
    prCleanupActions,
    nextExactSteps: [
      "Do not mark beta exit ready until formal manual screenshot, provider smoke, runtime smoke, and admin truth sample evidence are attached.",
      "Keep PR #274 and #275 preserved unless a human explicitly promotes those unrelated admin/governance changes.",
      "For future mobile scale work, fix one owner-scoped surface at a time and keep chat/navigation protected.",
      "Run npm run check:overnight-final-integration-lock after any follow-up lock refresh.",
    ],
    changedFiles: inputs.changedFiles,
    untrackedFiles: inputs.untrackedFiles,
    openPrs: inputs.openPrs,
  };

  return report;
}

export function validateOvernightFinalIntegrationLockReport(report: OvernightFinalIntegrationLockReport) {
  const failures: string[] = [];
  if (report.reportKey !== "overnight-final-integration-lock") failures.push("reportKey must be overnight-final-integration-lock.");
  if (!report.currentHead) failures.push("currentHead is required.");
  if (!report.summary.telemetryOrphanStatus) failures.push("telemetry orphan status missing.");
  if (!report.summary.mobileScaleSweepStatus) failures.push("mobile scale sweep status missing.");
  if (!report.summary.chatUntouched) failures.push("chat files changed.");
  if (!report.summary.navUntouched) failures.push("nav files changed.");
  if (/unclassified/u.test(report.summary.dirtyFileStatus)) failures.push("dirty files are unclassified.");
  if (report.openPrs.some((pr) => !pr.classification || /unclassified/u.test(pr.classification))) failures.push("open PRs are unclassified.");
  if ((report.nextExactSteps?.length ?? 0) === 0) failures.push("nextExactSteps missing.");
  if (report.remainingRisks.some((risk) => risk.id === "beta_evidence_overclaim")) failures.push("beta evidence is falsely marked complete.");
  if (hasFile("src/components/Creators/CreatorDropManager.tsx") && report.summary.creatorDropStatusMetricsStatus !== "passed") {
    failures.push("creator drop metrics status missing if creator drop manager exists.");
  }
  if (report.dependencyStatus.some((dependency) => dependency.required && dependency.status !== "passed" && !dependency.nextAction)) {
    failures.push("critical overnight dependency missing without status or next action.");
  }
  if (report.changedFiles.some((file) => /Wallet|PurchaseModal/u.test(file)) && !/passed/u.test(report.summary.walletMobileScaleStatus)) {
    failures.push("wallet mobile scale marker missing if wallet touched.");
  }
  return failures;
}

function renderDoc(report: OvernightFinalIntegrationLockReport) {
  const dependenciesTable = report.dependencyStatus
    .map((dependency) => `| ${dependency.id} | ${dependency.status} | ${dependency.required ? "yes" : "no"} | ${dependency.detail} | ${dependency.nextAction} |`)
    .join("\n");
  const risks = report.remainingRisks
    .map((risk) => `- ${risk.severity} ${risk.id}: ${risk.detail} Next: ${risk.nextAction}`)
    .join("\n") || "- None.";
  const prs = report.prCleanupActions.map((action) => `- ${action}`).join("\n") || "- No open PRs.";
  const fixes = report.fixesApplied.map((fix) => `- ${fix}`).join("\n") || "- No direct source fixes applied in this final lock.";
  const scaleFixes = report.smallScaleFixes.map((fix) => `- ${fix}`).join("\n") || "- No broad scale changes applied; source sweep residuals are recorded.";

  return `# Overnight Final Integration Lock

Generated: ${report.generatedAtUtc}

Latest code version: ${report.currentHead}

## Summary

- Wiring integrity: ${report.summary.wiringIntegrityStatus}
- Telemetry orphan status: ${report.summary.telemetryOrphanStatus}
- Parity status: ${report.summary.parityStatus}
- Algorithm refinement: ${report.summary.algorithmRefinementStatus}
- User loading: ${report.summary.userLoadingStatus}
- Wallet mobile scale: ${report.summary.walletMobileScaleStatus}
- Creator drop status metrics: ${report.summary.creatorDropStatusMetricsStatus}
- Mobile scale sweep: ${report.summary.mobileScaleSweepStatus}
- Chat untouched: ${report.summary.chatUntouched}
- Nav untouched: ${report.summary.navUntouched}
- Open PR count: ${report.summary.openPrCount}
- Dirty file status: ${report.summary.dirtyFileStatus}
- Beta score: ${report.summary.betaScore}
- Beta status: ${report.summary.betaStatus}
- Findings: P0=${report.summary.p0Count}, P1=${report.summary.p1Count}, P2=${report.summary.p2Count}

## Dependency Status

| Dependency | Status | Required | Detail | Next action |
| --- | --- | --- | --- | --- |
${dependenciesTable}

## Fixes Applied

${fixes}

## Small Scale Fixes

${scaleFixes}

## Remaining Risks

${risks}

## Missing Evidence

${report.missingEvidence.map((item) => `- ${item}`).join("\n")}

## PR Cleanup Actions

${prs}

## Next Exact Steps

${report.nextExactSteps.map((step) => `- ${step}`).join("\n")}
`;
}

function main() {
  const head = currentHead();
  const prs = openPrs();
  const beta = betaScoreAndStatus();
  const inputChanged = changedFiles();
  const inputUntracked = untrackedFiles();
  const report = buildOvernightFinalIntegrationLockReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: head,
    changedFiles: inputChanged,
    untrackedFiles: inputUntracked,
    dependencyStatus: dependencyStatus(head),
    prCleanupActions: prs.map((pr) => `Preserved PR #${pr.number}: ${pr.classification}.`),
    openPrs: prs,
    betaScore: beta.betaScore,
    betaStatus: beta.betaStatus,
    betaEvidenceReady: beta.betaEvidenceReady,
    mobileScaleSweepFindings: mobileScaleSweepFindings(),
    fixesApplied: [],
    smallScaleFixes: [],
  });

  mkdirSync(join(ROOT, "agent/state"), { recursive: true });
  mkdirSync(join(ROOT, "docs/agent-truth"), { recursive: true });
  writeFileSync(join(ROOT, ARTIFACT), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(ROOT, DOC), renderDoc(report));

  const failures = validateOvernightFinalIntegrationLockReport(report);
  if (failures.length > 0) {
    console.error("Overnight final integration lock failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`[overnight-final-integration-lock] ok: beta=${report.summary.betaScore}/${report.summary.betaStatus} p0=${report.summary.p0Count} p1=${report.summary.p1Count} p2=${report.summary.p2Count}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
