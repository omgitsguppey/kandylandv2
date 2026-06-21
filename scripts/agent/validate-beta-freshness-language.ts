import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildFreshnessActionList } from "../../src/lib/agent-score/freshness-actions";

type BetaFreshnessLanguageReport = {
  generatedAtUtc: string;
  reportKey: "beta-freshness-language";
  currentHead: string;
  summary: {
    internalGitMetadataPreserved: boolean;
    userFacingHeadLanguageRemoved: boolean;
    plainFreshnessMessagesEnabled: boolean;
    refreshActionsMapped: boolean;
    validatorsStillUseInternalHead: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  technicalTermsFound: string[];
  replacedMessages: string[];
  refreshCommandMap: ReturnType<typeof buildFreshnessActionList>;
  fixesApplied: string[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const reportPath = "agent/state/beta-freshness-language.generated.json";
const docsPath = "docs/agent-truth/beta-freshness-language.md";

const targetedDocs = [
  "docs/agent-truth/current-beta-exit-status.md",
  "docs/agent-truth/public-beta-score.md",
  "docs/agent-truth/evidence-capture-status.md",
  "docs/agent-truth/beta-evidence-gap-map.md",
];

const generatedReports = [
  "agent/state/public-beta-score.generated.json",
  "agent/state/current-beta-exit-status.generated.json",
  "agent/state/evidence-capture-status.generated.json",
  "agent/state/beta-evidence-gap-map.generated.json",
];

const refreshReports = [
  "agent/state/public-beta-score.generated.json",
  "agent/state/current-beta-exit-status.generated.json",
  "agent/state/evidence-capture-status.generated.json",
  "agent/state/source-truth-authority-map.generated.json",
  "agent/state/final-cost-audit-lock.generated.json",
  "agent/state/creator-dashboard-role-boundary.generated.json",
  "agent/state/creator-fan-pass-crm-broadcast.generated.json",
  "agent/state/creator-dashboard-overview-stats.generated.json",
  "agent/state/beta-health-algorithm-v2.generated.json",
];

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function readText(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(relativePath: string): Record<string, unknown> {
  const source = readText(relativePath);
  if (!source) return {};
  return JSON.parse(source) as Record<string, unknown>;
}

function stringsFrom(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringsFrom);
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "currentHead" && key !== "sourceCommit" && key !== "commitSha")
      .flatMap(([, nested]) => stringsFrom(nested));
  }
  return [];
}

function visibleReportStrings() {
  const strings: string[] = [];
  for (const report of generatedReports) {
    const parsed = readJson(report);
    for (const key of [
      "summary",
      "readinessStatusReason",
      "launchBlockers",
      "scoreExplanation",
      "nuancedScoreExplanation",
      "recommendedNextActions",
      "nextExactSteps",
      "remainingBlockers",
      "deferredOwnerReview",
      "staleArtifacts",
    ]) {
      strings.push(...stringsFrom(parsed[key]));
    }
    const gates = parsed.evidenceGates;
    if (Array.isArray(gates)) {
      for (const gate of gates) {
        const record = gate as Record<string, unknown>;
        strings.push(...stringsFrom({
          label: record.label,
          detail: record.detail,
          recommendedAction: record.recommendedAction,
          partialReason: record.partialReason,
        }));
      }
    }
  }
  return strings;
}

function findVisibleTechnicalTerms() {
  const findings: string[] = [];
  const visibleStrings = visibleReportStrings();
  for (const [index, value] of visibleStrings.entries()) {
    if (/\bHEAD\b|current HEAD|sourceCommit mismatch|currentHead mismatch|runtimeCodeChangedSinceReport/iu.test(value)) {
      findings.push(`generated-visible-string[${index}]: ${value}`);
    }
  }

  for (const doc of targetedDocs) {
    const lines = readText(doc).split(/\r?\n/u);
    lines.forEach((line, index) => {
      if (/\bHEAD\b|current HEAD|sourceCommit mismatch|currentHead mismatch|runtimeCodeChangedSinceReport/iu.test(line)) {
        findings.push(`${doc}:${index + 1}: ${line}`);
      }
    });
  }

  return findings;
}

function buildReport(now = new Date()): BetaFreshnessLanguageReport {
  const core = readText("src/lib/agent-score/core.ts");
  const helper = readText("src/lib/agent-score/freshness-language.ts");
  const actionHelper = readText("src/lib/agent-score/freshness-actions.ts");
  const test = readText("tests/unit/beta-freshness-language.spec.ts");
  const publicScore = readText("agent/state/public-beta-score.generated.json");
  const betaScore = readJson("agent/state/public-beta-score.generated.json");
  const termsFound = findVisibleTechnicalTerms();
  const refreshCommandMap = buildFreshnessActionList(refreshReports);
  const internalGitMetadataPreserved = core.includes("currentHead?: string")
    && core.includes("sourceCommit?: string")
    && publicScore.includes('"currentHead"')
    && publicScore.includes("sourceCommit=");
  const plainFreshnessMessagesEnabled = helper.includes("latest code version")
    && helper.includes("Evidence is outdated")
    && helper.includes("Evidence is current")
    && helper.includes("new runtime code landed after this report");
  const refreshActionsMapped = refreshCommandMap.length >= 9
    && refreshCommandMap.some((entry) => entry.command === "npm run score:beta && npm run check:beta-score")
    && actionHelper.includes("No refresh command is registered for this report yet.");
  const validatorsStillUseInternalHead = readText("scripts/agent/validate-public-beta-score.ts").includes("report.currentHead")
    && readText("scripts/agent/validate-current-beta-exit-status.ts").includes("report.currentHead");
  const helperMissingTests = !test.includes("describeCommitFreshness")
    || !test.includes("getRefreshCommandForReport");
  const scoreExplanation = JSON.stringify(betaScore.scoreExplanation ?? {});
  const scoreExplanationPlain = !/sourceCommit mismatch|current HEAD|\bHEAD\b/iu.test(scoreExplanation);
  const p0Count = termsFound.length > 0 || !internalGitMetadataPreserved || !refreshActionsMapped || !plainFreshnessMessagesEnabled
    ? 1
    : 0;
  const p1Count = helperMissingTests || !scoreExplanationPlain || !validatorsStillUseInternalHead ? 1 : 0;

  return {
    generatedAtUtc: now.toISOString(),
    reportKey: "beta-freshness-language",
    currentHead: currentHead(),
    summary: {
      internalGitMetadataPreserved,
      userFacingHeadLanguageRemoved: termsFound.length === 0,
      plainFreshnessMessagesEnabled,
      refreshActionsMapped,
      validatorsStillUseInternalHead,
      p0Count,
      p1Count,
      p2Count: 0,
    },
    technicalTermsFound: termsFound,
    replacedMessages: [
      "Replaced Git shorthand with latest code version.",
      "Replaced source-version mismatch jargon with report was generated before the latest code changes.",
      "Replaced stale generated report phrasing with refresh outdated generated reports.",
      "Replaced runtime drift field names with new runtime code landed after this report.",
    ],
    refreshCommandMap,
    fixesApplied: [
      "Added beta freshness plain-language helper.",
      "Added beta report refresh command map.",
      "Updated beta score freshness labels and recommendations.",
      "Updated beta readiness generated docs to say latest code version.",
    ],
    prCleanupActions: [],
    nextFixOrder: termsFound.length > 0
      ? ["Replace remaining visible technical freshness terms in targeted beta reports."]
      : [],
  };
}

function writeDocs(report: BetaFreshnessLanguageReport) {
  const lines = [
    "# Beta Freshness Language",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Latest code version: ${report.currentHead}`,
    "",
    "## Doctrine",
    "",
    "- Internal freshness metadata remains available for validators.",
    "- User and operator report copy uses plain language such as latest code version, refresh this report, evidence is current, and evidence is outdated.",
    "- Beta exit source lanes remain strict. Plain language does not turn missing evidence into source evidence.",
    "",
    "## Summary",
    "",
    `- Internal metadata preserved: ${report.summary.internalGitMetadataPreserved}`,
    `- User-facing technical language removed: ${report.summary.userFacingHeadLanguageRemoved}`,
    `- Plain freshness messages enabled: ${report.summary.plainFreshnessMessagesEnabled}`,
    `- Refresh actions mapped: ${report.summary.refreshActionsMapped}`,
    `- Validators still use internal metadata: ${report.summary.validatorsStillUseInternalHead}`,
    "",
    "## Refresh Command Map",
    "",
    ...report.refreshCommandMap.map((entry) =>
      `- ${entry.reportPath}: ${entry.command ?? "unregistered"}; ${entry.actionLabel} - ${entry.actionDetail}`),
    "",
    "## Replaced Messages",
    "",
    ...report.replacedMessages.map((entry) => `- ${entry}`),
    "",
    "## Remaining Findings",
    "",
    ...(report.technicalTermsFound.length > 0 ? report.technicalTermsFound.map((entry) => `- ${entry}`) : ["- None."]),
    "",
  ];
  mkdirSync(join(repoRoot, dirname(docsPath)), { recursive: true });
  writeFileSync(join(repoRoot, docsPath), `${lines.join("\n")}\n`);
}

export function validateBetaFreshnessLanguageReport(report: BetaFreshnessLanguageReport) {
  const failures: string[] = [];
  if (report.reportKey !== "beta-freshness-language") failures.push("reportKey must be beta-freshness-language.");
  if (report.currentHead !== currentHead()) failures.push("currentHead must match git HEAD.");
  if (!report.summary.internalGitMetadataPreserved) failures.push("internal JSON metadata fields currentHead/sourceCommit must be preserved.");
  if (!report.summary.userFacingHeadLanguageRemoved) failures.push("user/operator-facing beta freshness messages must not contain unexplained HEAD/currentHead language.");
  if (!report.summary.plainFreshnessMessagesEnabled) failures.push("freshness helper must emit plain freshness messages.");
  if (!report.summary.refreshActionsMapped) failures.push("refresh command map must exist for common beta reports.");
  if (!report.summary.validatorsStillUseInternalHead) failures.push("validators must still compare internal currentHead metadata.");
  if (report.technicalTermsFound.length > 0) failures.push("technical freshness terms remain in visible beta report copy.");
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) failures.push("beta freshness language report must have no P0/P1 findings.");
  return failures;
}

function main() {
  const report = buildReport();
  writeDocs(report);
  mkdirSync(join(repoRoot, dirname(reportPath)), { recursive: true });
  writeFileSync(join(repoRoot, reportPath), `${JSON.stringify(report, null, 2)}\n`);

  const failures = validateBetaFreshnessLanguageReport(report);
  if (failures.length > 0) {
    console.error("Beta freshness language validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    for (const finding of report.technicalTermsFound.slice(0, 20)) console.error(`  ${finding}`);
    process.exit(1);
  }

  console.log("Beta freshness language validation passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
