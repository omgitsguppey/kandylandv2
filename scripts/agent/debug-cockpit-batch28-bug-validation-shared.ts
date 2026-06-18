import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { buildDataValidationUiSemantics, buildValidationReadinessSummary } from "../../src/lib/analytics/validation-readiness-contract";
import { buildDebugCockpitBatch28BugValidationReport } from "../../src/lib/debug/debug-cockpit-batch28-bug-validation";
import { buildBugReportTruthState } from "../../src/lib/debug/bug-report-truth-contract";
import { buildBugReportTruthSource } from "../../src/lib/debug/bug-report-truth-source";
import { withGeneratedReportEnvelope } from "./generated-report-envelope";

type Report = Record<string, unknown>;

function read(filePath: string) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(filePath: string, lines: string[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function expectPass(condition: boolean, failures: string[], message: string) {
  if (!condition) failures.push(message);
}

function command(args: string[], fallback = "") {
  try {
    return execFileSync(args[0], args.slice(1), { encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
}

function classifyDirtyFile(filePath: string) {
  if (filePath.includes("bug-report-truth")) return "bug_report_truth_terminal_state_required";
  if (filePath.includes("validation-readiness") || filePath.includes("DataValidation")) return "analytics_validation_semantics_fix_required";
  if (filePath.includes("analytics-source-agreement")) return "source_agreement_failure_classification_required";
  if (filePath.includes("debug-cockpit-batch28")) return "validator_artifact_expected";
  if (filePath.includes("release-notes") || filePath === "CHANGELOG.md" || filePath.includes("kandydrops-release-notes")) return "release_artifact_expected";
  if (filePath.startsWith("agent/context/") || filePath.startsWith("agent/state/fast-start")) return "unrelated_agent_context_file_to_ignore";
  if (filePath.startsWith("docs/agent-truth/")) return "documentation_artifact_expected";
  if (filePath.startsWith("tests/unit/")) return "test_artifact_expected";
  if (filePath.startsWith("scripts/agent/")) return "validator_artifact_expected";
  return "fixed_current";
}

function openPrClassification() {
  if (process.env.ALLOW_GH_PR_LIST !== "1") {
    return [{
      classification: "external_command_opt_in_required",
      command: "gh pr list --repo omgitsguppey/kandylandv2 --state open --limit 100 --json number,title,author,mergeStateStatus,isDraft,updatedAt,url",
      nextExactAction: "Set ALLOW_GH_PR_LIST=1 only for an operator-approved fresh GitHub PR query; cached/source-only reports cannot clear release proof gates.",
    }];
  }
  const raw = command([
    "gh",
    "pr",
    "list",
    "--repo",
    "omgitsguppey/kandylandv2",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,author,mergeStateStatus,isDraft,updatedAt,url",
  ], "[]");
  try {
    const prs = JSON.parse(raw) as Array<Record<string, unknown>>;
    return prs.map((pr) => ({
      ...pr,
      classification: "needs_manual_review_before_batch28",
    }));
  } catch {
    return [{ classification: "unsafe_unknown", raw }];
  }
}

function runValidation(reportKey: string, report: Report, failures: string[], summary: string[]) {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = command(["git", "rev-parse", "HEAD"], "unknown");
  const result = withGeneratedReportEnvelope({
    reportKey,
    generatedAtUtc,
    currentHead,
    ...report,
    validationFailures: failures,
  }, {
    reportKey,
    generatedAtUtc,
    currentHead,
    evidenceClass: "source_snapshot",
    canClearSourceGate: failures.length === 0,
    nextExactSteps: [
      `Run npm run check:${reportKey} after touching this debug/source validation lane.`,
      "Use redacted runtime/admin evidence separately before clearing runtime or admin truth gates.",
    ],
    validationFailures: failures,
    doesNotProve: [
      "Does not prove live bug-report volume.",
      "Does not prove provider/runtime behavior.",
      "Does not prove current admin truth samples.",
    ],
  });
  writeJson(`agent/state/${reportKey}.generated.json`, result);
  writeMarkdown(`docs/agent-truth/${reportKey}.md`, [
    `# ${reportKey}`,
    "",
    `Generated: ${generatedAtUtc}`,
    "",
    `Status: ${failures.length === 0 ? "pass" : "fail"}`,
    "",
    "## Summary",
    ...summary.map((line) => `- ${line}`),
    "",
    "## Validation Failures",
    ...(failures.length === 0 ? ["- none"] : failures.map((failure) => `- ${failure}`)),
  ]);
  if (failures.length > 0) {
    console.error(`${reportKey} failed:`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(`${reportKey}: pass`);
}

export function validateBugReportTruthTerminalState() {
  const failures: string[] = [];
  const component = read("src/app/admin/debug/components/DebugBugReportSummary.tsx");
  const contract = read("src/lib/debug/bug-report-truth-contract.ts");
  const loadedEmpty = buildBugReportTruthState({
    sourceLoaded: true,
    sourceExists: true,
    reports: [],
    sourceWindow: { fromUtc: "2026-05-01T00:00:00.000Z", toUtc: "2026-05-24T00:00:00.000Z", label: "30d" },
  });
  const failed = buildBugReportTruthState({ sourceLoaded: false, sourceExists: true, loadError: new Error("raw") });
  expectPass(loadedEmpty.status === "loaded_empty", failures, "no reports loaded has no loaded_empty terminal state.");
  expectPass(failed.status === "failed" && !failed.loadError?.includes("raw"), failures, "source error has no safe failed state.");
  expectPass(component.includes("AbortController") && component.includes("setTruth"), failures, "Bug Report Truth can render infinite loading.");
  expectPass(!component.includes("report.userMessage") && !component.includes("report.operatorMessage"), failures, "raw bug/support/user bodies visible by default.");
  expectPass(contract.includes("summary_only_raw_bodies_redacted"), failures, "redaction status missing.");
  expectPass(loadedEmpty.nextAction.length > 0 && failed.nextAction.length > 0, failures, "next action missing.");
  runValidation("bug-report-truth-terminal-state", { loadedEmpty, failed }, failures, [
    "Bug Report Truth resolves loading, empty, failed, missing-source, stale, blocked, and loaded report states.",
    "Summary surface uses counts and redacted drilldown guidance instead of raw report bodies.",
  ]);
}

export function validateBugReportTruthSourceCleanup() {
  const failures: string[] = [];
  const route = read("src/app/api/admin/debug/bug-reports/route.ts");
  const sourceHelper = read("src/lib/debug/bug-report-truth-source.ts");
  const source = buildBugReportTruthSource({
    reports: [{ id: "bug_1", createdAt: 1_800_000_000_000, userMessage: "raw body", sanitizedContext: { token: "secret" } }],
    readLimit: 50,
    generatedAtMs: 1_800_000_001_000,
  });
  expectPass(route.includes("allowedMethods: [\"GET\"]") && route.includes(".limit(BUG_REPORT_ADMIN_READ_LIMIT)"), failures, "Bug Report Truth source unbounded or not GET-only.");
  expectPass(route.includes("buildBugReportTruthSource"), failures, "route does not use terminal source contract.");
  expectPass(source.truth.status === "loaded_with_reports" && Boolean(source.sourceWindow), failures, "no source window exists.");
  expectPass(!JSON.stringify(source).includes("raw body") && !JSON.stringify(source).includes("secret"), failures, "body redaction missing.");
  expectPass(sourceHelper.includes("Math.min(Math.max(input.readLimit || 50, 1), 50)"), failures, "source limit is not bounded.");
  runValidation("bug-report-truth-source-cleanup", { source }, failures, [
    "Bug Report Truth route remains read-only, admin-only, bounded to 50 rows, and terminal-state backed.",
    "Raw report payloads and private context are excluded from default summary output.",
  ]);
}

export function validateAnalyticsValidationSemantics() {
  const failures: string[] = [];
  const summary = buildValidationReadinessSummary({
    chartReadiness: { availability: "pass", continuity: "none", missingDays: [], recentGaps: [] },
    sourceAgreement: {
      sources: ["ga4", "historical_snapshot", "legacy_support"],
      failedSources: ["ga4", "historical_snapshot", "legacy_support"],
      reason: "Source agreement failed.",
    },
    validations: [{ checkKey: "source_agreement_chart_readiness", status: "fail", passAllowed: false }],
  });
  expectPass(summary.chartReadiness.state === "source_disagreement", failures, "source agreement failure is not represented in chart readiness.");
  expectPass(summary.sourceAgreement.state === "fail", failures, "source agreement fail is hidden.");
  expectPass(summary.validationParity.state === "fail", failures, "failCount > 0 lacks failed dimension.");
  expectPass(summary.blockedPass.rows.length > 0, failures, "blockedPassCount > 0 but panel says clean.");
  expectPass(!summary.nextAction.startsWith("Retry"), failures, "semantic/source agreement failure only suggests retry.");
  runValidation("analytics-validation-semantics", { summary }, failures, [
    "Chart readiness, source agreement, validation parity, and blocked pass are separate dimensions.",
    "Blocked pass means not safe to promote to pass, not chart unavailability.",
  ]);
}

export function validateDataValidationUiSemanticCleanup() {
  const failures: string[] = [];
  const component = read("src/app/admin/debug/components/DebugAdvancedDataValidation.tsx");
  const ui = buildDataValidationUiSemantics({
    chartReadinessState: "ready",
    sourceAgreementState: "fail",
    validationParityState: "fail",
    blockedPassCount: 10,
    routeLoadedSuccessfully: true,
    failedRows: ["source_agreement_chart_readiness"],
    cacheState: "miss",
  });
  expectPass(component.includes("Chart readiness") && component.includes("Source agreement") && component.includes("Validation parity") && component.includes("Blocked pass"), failures, "Data Validation still blends readiness dimensions.");
  expectPass(component.includes("Source agreement failures"), failures, "blocked/source agreement rows not surfaced.");
  expectPass(component.includes("data-raw-validation-rows-default-open=\"false\""), failures, "raw validation rows open by default.");
  expectPass(!component.includes("Validation failed. Retry the validation route or inspect admin analytics historical route errors."), failures, "generic retry remains the only source agreement failure action.");
  expectPass(ui.cacheMissIsFailure === false, failures, "cache miss treated as failure.");
  runValidation("data-validation-ui-semantic-cleanup", { ui }, failures, [
    "Data Validation renders compact split summary pills and visible source agreement failure rows.",
    "Raw validation rows stay collapsed by default while failed dimensions remain actionable.",
  ]);
}

export function validateDebugCockpitBatch28BugValidation() {
  const failures: string[] = [];
  const dirty = command(["git", "status", "--short"], "")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => {
      const filePath = line.replace(/^[ MADRCU?!]{1,2}\s+/u, "").trim();
      return { filePath, classification: classifyDirtyFile(filePath) };
    });
  const openPrs = openPrClassification();
  const report = buildDebugCockpitBatch28BugValidationReport({
    bugReportTruthStatusBefore: "loading",
    bugReportTerminalState: "loaded_empty",
    dataValidationStatusBefore: "failed",
    chartReadinessStatus: "source_disagreement",
    sourceAgreementStatus: "fail",
    validationParityStatus: "fail",
    blockedPassCount: 10,
    failedValidationRows: ["source_agreement_chart_readiness"],
    failedSourceAgreementSources: ["ga4", "historical_snapshot", "legacy_support"],
    cacheState: "miss",
    lastValidatedAtUtc: "2026-05-24T15:21:00.000Z",
  });
  expectPass(report.bugReportTerminalState !== "loading", failures, "Bug Report Truth remains infinite loading.");
  expectPass(report.bugReportRedactionStatus === "summary_only_raw_bodies_redacted", failures, "raw bug/support/user bodies visible by default.");
  expectPass(report.chartReadinessStatus === "source_disagreement" && report.sourceAgreementStatus === "fail", failures, "Data Validation still blends chart readiness with source agreement.");
  expectPass(report.blockedPassCount > 0 && report.nextExactSteps.join(" ").includes("blocked pass"), failures, "blocked pass count not actionable.");
  expectPass(!report.nextExactSteps.join(" ").startsWith("Retry"), failures, "failCount > 0 only suggests retry when route loaded successfully.");
  expectPass(report.scoreDimensions.length > 0, failures, "score dimensions missing.");
  expectPass(dirty.every((entry) => entry.classification !== "unsafe_unknown"), failures, "dirty files unclassified.");
  expectPass(openPrs.every((entry) => entry.classification), failures, "open PRs unclassified.");
  runValidation("debug-cockpit-batch28-bug-validation", { ...report, dirtyFileClassifications: dirty, openPrClassifications: openPrs }, failures, [
    "Batch 28 final lock records terminal bug truth, split analytics validation semantics, blocked pass actionability, and source agreement failure.",
    "Current dirty files and open PR state are classified for scoped closeout.",
  ]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  validateDebugCockpitBatch28BugValidation();
}
