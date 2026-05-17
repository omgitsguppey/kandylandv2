import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { PublicBetaCostReadiness, PublicBetaCostReadinessLane } from "../../src/lib/agent-score/core";

export type StaleReportClassification = {
  reportKey: string;
  path: string;
  classification: "active" | "retired" | "archive" | "needs_refresh";
  authority: string;
  action: string;
};

export type BetaScoreCleanupReport = {
  generatedAtUtc: string;
  reportKey: "beta-score-cleanup";
  currentHead: string;
  summary: {
    betaScore: number;
    betaStatus: string;
    scannerScore: number;
    evidenceScore: number;
    evidenceCaps: number;
    staleReportsRetired: number;
    activeReportsNeedingRefresh: number;
    costReadinessLanes: number;
    canStartBetaExitReview: boolean;
  };
  scoreExplanation: {
    scoreMath: string[];
    missingEvidenceCaps: string[];
    scannerScoreWarning: string;
  };
  costReadiness: PublicBetaCostReadiness;
  staleReportClassifications: StaleReportClassification[];
  fixesApplied: string[];
  nextExactSteps: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/beta-score-cleanup.generated.json";
const artifactPath = join(repoRoot, artifactRelativePath);
const docsRelativePath = "docs/agent-truth/beta-score-cleanup.md";
const docsPath = join(repoRoot, docsRelativePath);

function currentHead(root = repoRoot) {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
}

function readJson(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) return null;
  return JSON.parse(readFileSync(fullPath, "utf8")) as Record<string, unknown>;
}

function readObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function laneFromScore(scoreCostReadiness: Record<string, unknown>, key: keyof PublicBetaCostReadiness): PublicBetaCostReadinessLane {
  const lane = readObject(scoreCostReadiness[key]);
  return {
    status: readString(lane.status, "missing_inventory"),
    detail: readString(lane.detail, "Cost readiness lane is missing detail."),
    evidence: readStringArray(lane.evidence),
    blocksBetaExit: lane.blocksBetaExit === true,
  };
}

function buildStaleReportClassifications(): StaleReportClassification[] {
  return [
    {
      reportKey: "final-launch-readiness-report",
      path: "agent/state/final-launch-readiness-report.generated.json",
      classification: "retired",
      authority: "agent/state/evidence-capture-status.generated.json and current-beta-exit-status now own beta-exit evidence freshness.",
      action: "Do not use as required beta score freshness; keep as historical launch evidence only.",
    },
    {
      reportKey: "launch-readiness-report",
      path: "agent/state/launch-readiness-report.generated.json",
      classification: "retired",
      authority: "Evidence capture lanes supersede legacy launch readiness freshness.",
      action: "Do not use as required beta score freshness.",
    },
    {
      reportKey: "launch-pr-triage",
      path: "agent/state/launch-pr-triage.generated.json",
      classification: "retired",
      authority: "Same-commit release-note and current evidence validators supersede stale PR triage freshness.",
      action: "Do not block score freshness on this legacy report.",
    },
    {
      reportKey: "repo-spring-cleaning-rewire",
      path: "agent/state/repo-spring-cleaning-rewire.generated.json",
      classification: "archive",
      authority: "Repo spring-cleaning evidence is governance backlog, not live beta exit proof.",
      action: "Refresh only in the repo-governance owner lane.",
    },
    {
      reportKey: "debug-panel-output-triage",
      path: "agent/state/debug-panel-output-triage.generated.json",
      classification: "archive",
      authority: "Debug panel output triage is historical source evidence.",
      action: "Do not treat as current runtime evidence without a fresh owner pass.",
    },
    {
      reportKey: "speed-security-hardening",
      path: "agent/state/speed-security-hardening.generated.json",
      classification: "active",
      authority: "npm run check:speed-security validates the active speed/security lane.",
      action: "Keep P2 cost/security backlog visible; refresh through speed/security owner work.",
    },
    {
      reportKey: "public-beta-score",
      path: "agent/state/public-beta-score.generated.json",
      classification: "active",
      authority: "npm run score:beta writes currentHead and cost-readiness sublanes.",
      action: "Regenerate with npm run score:beta after source or evidence artifact changes.",
    },
  ];
}

export function buildBetaScoreCleanupReport(head = currentHead()): BetaScoreCleanupReport {
  const score = readJson("agent/state/public-beta-score.generated.json") ?? {};
  const costReadinessRaw = readObject(score.costReadiness);
  const evidenceCapDetails = readStringArray(score.evidenceCapDetails);
  const staleReportClassifications = buildStaleReportClassifications();
  const costReadiness: PublicBetaCostReadiness = {
    cloudRunCostReadiness: laneFromScore(costReadinessRaw, "cloudRunCostReadiness"),
    cloudSqlCostReadiness: laneFromScore(costReadinessRaw, "cloudSqlCostReadiness"),
    geminiCloudAssistCostReadiness: laneFromScore(costReadinessRaw, "geminiCloudAssistCostReadiness"),
    route4xxReadiness: laneFromScore(costReadinessRaw, "route4xxReadiness"),
  };

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "beta-score-cleanup",
    currentHead: head,
    summary: {
      betaScore: readNumber(score.overallScore),
      betaStatus: readString(score.readinessStatus, "Unknown evidence"),
      scannerScore: readNumber(score.scannerScore),
      evidenceScore: readNumber(score.evidenceScore),
      evidenceCaps: evidenceCapDetails.length,
      staleReportsRetired: staleReportClassifications.filter((entry) => entry.classification === "retired").length,
      activeReportsNeedingRefresh: staleReportClassifications.filter((entry) => entry.classification === "needs_refresh").length,
      costReadinessLanes: Object.keys(costReadiness).length,
      canStartBetaExitReview: false,
    },
    scoreExplanation: {
      scoreMath: [
        "Source safety contributes 25 points because deterministic scanner findings are clean.",
        "Targeted behavior contributes 20 points because source/economy/user-creator validators pass.",
        "Freshness integrity contributes 10 points because legacy launch reports are retired from required freshness math and current source evidence artifacts are represented.",
        "Visual/manual, runtime/provider, admin truth, and debug/runtime evidence lanes still score zero until formal artifacts exist.",
      ],
      missingEvidenceCaps: evidenceCapDetails,
      scannerScoreWarning: "Scanner score 100 is scanner-only source hygiene and must never be read as beta readiness.",
    },
    costReadiness,
    staleReportClassifications,
    fixesApplied: [
      "Added scoreExplanation to public beta score output.",
      "Added Cloud Run, Cloud SQL, Gemini/Cloud Assist, and route 4xx cost-readiness lanes.",
      "Retired legacy launch/readiness reports from required beta score freshness math.",
    ],
    nextExactSteps: [
      "Attach real manual screenshot evidence before clearing visual/manual caps.",
      "Attach formal provider smoke evidence before clearing provider caps.",
      "Attach deployed runtime smoke evidence before clearing runtime caps.",
      "Attach a fresh admin truth sample before clearing admin truth caps.",
      "Review Cloud Run/App Hosting, Cloud SQL/Data Connect, and Gemini/Vertex cost lanes with owner evidence before beta exit.",
    ],
  };
}

export function validateBetaScoreCleanupReport(report: BetaScoreCleanupReport | null, head: string) {
  const failures: string[] = [];
  if (!report) return ["beta-score-cleanup artifact missing"];
  if (report.reportKey !== "beta-score-cleanup") failures.push("reportKey must be beta-score-cleanup.");
  if (report.currentHead !== head) failures.push(`report currentHead must match git HEAD (${head}).`);
  if (!report.scoreExplanation?.scoreMath?.length) failures.push("beta score lacks explanation.");
  if (!report.scoreExplanation?.missingEvidenceCaps?.length) failures.push("missing evidence caps must stay represented.");
  if (/beta ready|readiness is ready/iu.test(report.scoreExplanation?.scannerScoreWarning ?? "")) {
    failures.push("scannerScore 100 must not be presented as beta readiness.");
  }
  const costLanes = Object.values(report.costReadiness ?? {});
  if (costLanes.length !== 4) failures.push("cost readiness lanes missing.");
  if (costLanes.some((lane) => /\bpass(ed)?\b/iu.test(String(lane.status)))) {
    failures.push("cost readiness lanes must not mark not-detected or source-only inventory as pass.");
  }
  if (!report.staleReportClassifications?.length) failures.push("stale report classification missing.");
  if (report.summary.canStartBetaExitReview && report.summary.evidenceCaps > 0) {
    failures.push("canStartBetaExitReview must stay false while evidence caps remain.");
  }
  if ((report.nextExactSteps?.length ?? 0) === 0) failures.push("nextExactSteps must not be empty.");
  return failures;
}

function renderDocs(report: BetaScoreCleanupReport) {
  const costLines = Object.entries(report.costReadiness)
    .map(([key, lane]) => `- ${key}: \`${lane.status}\` - ${lane.detail}`)
    .join("\n");
  const staleLines = report.staleReportClassifications
    .map((entry) => `- ${entry.reportKey}: \`${entry.classification}\` - ${entry.action}`)
    .join("\n");

  return `# Beta Score Cleanup

Artifact: \`${artifactRelativePath}\`
Validator: \`npm run check:beta-score-cleanup\`

Generated: ${report.generatedAtUtc}
Current source head: \`${report.currentHead}\`

## Summary

- Beta score: ${report.summary.betaScore}/100, \`${report.summary.betaStatus}\`.
- Scanner score: ${report.summary.scannerScore}/100. This is scanner-only source hygiene, not beta readiness.
- Evidence score: ${report.summary.evidenceScore}/100.
- Evidence caps represented: ${report.summary.evidenceCaps}.
- Cost-readiness lanes represented: ${report.summary.costReadinessLanes}.
- Beta exit review can start: ${report.summary.canStartBetaExitReview ? "yes" : "no"}.

## Score Explanation

${report.scoreExplanation.scoreMath.map((line) => `- ${line}`).join("\n")}

Missing evidence caps:

${report.scoreExplanation.missingEvidenceCaps.map((line) => `- ${line}`).join("\n")}

${report.scoreExplanation.scannerScoreWarning}

## Cost Readiness

${costLines}

These lanes are source inventory and owner-review signals. \`not_detected_in_repo\`, \`config_not_in_repo\`, and \`source_inventory_complete\` are not formal beta-exit passes.

## Stale Report Classification

${staleLines}

## Next Exact Steps

${report.nextExactSteps.map((step, index) => `${index + 1}. ${step}`).join("\n")}
`;
}

function writeReport(report: BetaScoreCleanupReport) {
  mkdirSync(dirname(artifactPath), { recursive: true });
  mkdirSync(dirname(docsPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(docsPath, renderDocs(report), "utf8");
}

function main() {
  const report = buildBetaScoreCleanupReport();
  writeReport(report);
  const failures = validateBetaScoreCleanupReport(report, currentHead());
  if (failures.length > 0) {
    console.error("Beta score cleanup validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Beta score cleanup passed. beta=${report.summary.betaScore}/${report.summary.betaStatus} costLanes=${report.summary.costReadinessLanes}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
