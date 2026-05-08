import { getPackageScripts, readJsonFile } from "./shared";

type ScoreReport = {
  status: "pass" | "warning" | "fail";
  score: number;
  criticalBlockers: string[];
  checks: Array<{ id: string; pass: boolean }>;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function main() {
  const scripts = getPackageScripts("package.json");
  assert(scripts["score:user-tracking-indexes"], "Missing score:user-tracking-indexes script.");
  assert(scripts["check:user-tracking-index-cutover"], "Missing check:user-tracking-index-cutover script.");

  const report = readJsonFile<ScoreReport>("agent/state/user-tracking-index-cutover.generated.json");
  assert(report.status !== "fail", "User tracking index cutover failed.");
  assert(report.score >= 80, `User tracking index score too low: ${report.score}`);
  assert(report.criticalBlockers.length === 0, `Critical blockers:\n- ${report.criticalBlockers.join("\n- ")}`);
  assert(report.checks.every((check) => check.pass), "One or more required checks failed.");

  console.log(`User tracking index cutover validated: ${report.score}/100 (${report.status})`);
}

main();
