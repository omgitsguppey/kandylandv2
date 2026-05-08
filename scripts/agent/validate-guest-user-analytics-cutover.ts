import { getPackageScripts, readJsonFile } from "./shared";

type CutoverReport = {
  status: "pass" | "warning" | "fail";
  score: number;
  checks: Array<{ id: string; pass: boolean; detail: string }>;
  criticalBlockers: string[];
  exactValidatorsToRun: string[];
};

const REPORT_PATH = "agent/state/guest-user-analytics-cutover.generated.json";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  const scripts = getPackageScripts("package.json");
  assert(scripts["score:guest-user-analytics"], "package.json is missing score:guest-user-analytics");
  assert(scripts["check:guest-user-analytics"], "package.json is missing check:guest-user-analytics");

  const report = readJsonFile<CutoverReport>(REPORT_PATH);
  assert(Array.isArray(report.checks) && report.checks.length >= 9, "cutover report is incomplete");
  assert(report.criticalBlockers.length === 0, `critical blockers remain:\n- ${report.criticalBlockers.join("\n- ")}`);
  assert(report.score >= 80, `cutover score too low: ${report.score}`);
  assert(report.status !== "fail", "cutover status is fail");
  assert(report.exactValidatorsToRun.includes("npm run check:guest-user-analytics"), "report must include exact validator command");

  console.log(`Guest/user analytics cutover validated: ${report.score}/100 (${report.status})`);
}

main();
