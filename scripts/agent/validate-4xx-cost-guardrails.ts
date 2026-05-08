import { getPackageScripts, readJsonFile } from "./shared";

type ScoreReport = {
  status: "pass" | "warning" | "fail";
  score: number;
  checks: Array<{ id: string; pass: boolean }>;
  criticalBlockers: string[];
  routeReports: Array<{ routePattern: string; class: string; riskTier: string }>;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function main() {
  const scripts = getPackageScripts("package.json");
  assert(scripts["score:4xx-cost"], "Missing score:4xx-cost script.");
  assert(scripts["check:4xx-cost"], "Missing check:4xx-cost script.");

  const report = readJsonFile<ScoreReport>("agent/state/4xx-cost-guardrails.generated.json");
  assert(report.status !== "fail", "4xx cost guardrails failed.");
  assert(report.score >= 80, `4xx cost guardrails score too low: ${report.score}`);
  assert(report.criticalBlockers.length === 0, `Critical blockers:\n- ${report.criticalBlockers.join("\n- ")}`);
  assert(report.checks.every((check) => check.pass), "One or more 4xx cost checks failed.");
  assert(report.routeReports.length > 0, "Route-level 4xx cost report is missing.");

  console.log(`4xx cost guardrails validated: ${report.score}/100 (${report.status})`);
}

main();
