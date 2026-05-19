import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { PublicBetaFinding, PublicBetaScoreReport } from "./core";
import {
  PUBLIC_BETA_ALLOWED_COMMANDS,
  PUBLIC_BETA_COMMAND_BUDGET_MAX,
  PUBLIC_BETA_FORBIDDEN_COMMANDS,
} from "./weights";

export const PUBLIC_BETA_SCORE_REPORT_PATH = "agent/state/public-beta-score.generated.json";

export function buildPublicBetaCommandBudget(): PublicBetaScoreReport["commandBudget"] {
  return {
    allowedCommands: [...PUBLIC_BETA_ALLOWED_COMMANDS],
    forbiddenCommands: [...PUBLIC_BETA_FORBIDDEN_COMMANDS],
    maxCommands: PUBLIC_BETA_COMMAND_BUDGET_MAX,
  };
}

export function buildRecommendedNextActions(
  findings: PublicBetaFinding[],
  evidenceGates: PublicBetaScoreReport["evidenceGates"] = [],
) {
  const evidenceActions = evidenceGates
    .filter((gate) => gate.status !== "Ready")
    .map((gate) => `${gate.status}: ${gate.recommendedAction}`);

  if (findings.length === 0) {
    return Array.from(new Set([
      ...evidenceActions,
      "Keep using `npm run score:beta` and targeted tests before public beta UI/economy changes.",
    ]));
  }

  const actions = findings
    .slice(0, 5)
    .map((finding) => `${finding.severity.toUpperCase()}: ${finding.title} (${finding.filePath})`);
  if (findings.some((finding) => finding.canAutofix && finding.autofixConfidence >= 0.95)) {
    actions.unshift("Run `npm run repair:beta` to review deterministic safe fixes before applying them.");
  }
  return Array.from(new Set([...evidenceActions, ...actions]));
}

export function buildMinimalVerificationCommands(typeScriptTouched = true) {
  return [
    "npm run score:beta",
    "npm run check:beta-score",
    "npm run repair:beta",
    "npx vitest run --config vitest.contracts.config.ts tests/unit/public-beta-score.spec.ts",
    ...(typeScriptTouched ? ["npm run typecheck"] : []),
  ];
}

export function writePublicBetaScoreReport(report: PublicBetaScoreReport, root = process.cwd()) {
  const fullPath = join(root, PUBLIC_BETA_SCORE_REPORT_PATH);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(report, null, 2)}\n`);
  return fullPath;
}

export function readPublicBetaScoreReport(root = process.cwd()) {
  const fullPath = join(root, PUBLIC_BETA_SCORE_REPORT_PATH);
  if (!existsSync(fullPath)) {
    return null;
  }

  return JSON.parse(readFileSync(fullPath, "utf8")) as PublicBetaScoreReport;
}

export function printPublicBetaScoreSummary(report: PublicBetaScoreReport) {
  console.log(`Public beta score: ${report.overallScore}/100 (${report.readinessStatus}; legacy ${report.overallStatus})`);
  console.log(`Health v2: ${report.healthScore}/100 (${report.launchGateStatus}) source=${report.sourceHealthScore} runtime=${report.runtimeHealthScore} evidence=${report.evidenceCompletenessScore} freshness=${report.freshnessScore} cost=${report.costRiskScore} regression=${report.regressionRiskScore}`);
  console.log(`Scanner score: ${report.scannerScore}/100 (${report.scannerStatus})`);
  console.log(`Evidence score: ${report.evidenceScore}/100`);
  console.log(`Deduped findings: ${report.dedupedFindingCount}`);
  console.log(`Safe autofixes available: ${report.safeAutofixesAvailable}`);
  if (report.evidenceCapsApplied.length > 0) {
    console.log("Evidence caps:");
    for (const cap of report.evidenceCapsApplied.slice(0, 6)) {
      console.log(`- ${cap}`);
    }
  }
  const topFindings = report.findings.slice(0, 5);
  if (topFindings.length > 0) {
    console.log("Top findings:");
    for (const finding of topFindings) {
      console.log(`- [${finding.severity}] ${finding.title} (${finding.filePath}${finding.line ? `:${finding.line}` : ""})`);
    }
  } else {
    console.log("Top findings: none");
  }
  console.log("Minimal next commands:");
  for (const command of report.minimalVerificationCommands.slice(0, report.commandBudget.maxCommands)) {
    console.log(`- ${command}`);
  }
  console.log(`Forbidden by default: ${report.commandBudget.forbiddenCommands.join(", ")}`);
}
