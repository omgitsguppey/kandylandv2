import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  AUTH_READINESS_REPORT_PATH,
  KANDYDROPS_PROJECT_ID,
  buildWifBootstrapPlan,
  type CodexAuthReadinessReport,
} from "../../src/lib/config-hardening/devops/auth-surface-contract";

const root = process.cwd();
const reportPath = path.join(root, AUTH_READINESS_REPORT_PATH);
const apply = process.argv.includes("--apply");

function readReport(): CodexAuthReadinessReport | null {
  if (!existsSync(reportPath)) return null;
  try {
    return JSON.parse(readFileSync(reportPath, "utf8")) as CodexAuthReadinessReport;
  } catch {
    return null;
  }
}

const report = readReport();
const projectId = report?.projectId ?? KANDYDROPS_PROJECT_ID;
const plan = buildWifBootstrapPlan(projectId);

console.log("Codex native cloud auth bootstrap plan");
console.log(`Project: ${projectId}`);
console.log(`Readiness report: ${AUTH_READINESS_REPORT_PATH}${report ? "" : " (missing; run npm run check:codex-auth first)"}`);
console.log("");

if (report) {
  console.log(`Current overall status: ${report.overallStatus}`);
  console.log(`Can Codex run cloud read checks now: ${report.canCodexRunCloudReadChecks ? "yes" : "no"}`);
  console.log(`Can Codex set up WIF without manual bootstrap: ${report.canCodexSetupWif ? "potentially, after explicit approval" : "no"}`);
  if (report.missingTools.length > 0) console.log(`Missing tools: ${report.missingTools.join(", ")}`);
  if (report.missingAuth.length > 0) console.log(`Missing auth: ${report.missingAuth.join(", ")}`);
  if (report.insufficientScopes.length > 0) console.log(`Insufficient scope or wrong project: ${report.insufficientScopes.join(", ")}`);
  console.log("");
}

console.log("Planned WIF setup commands (do not run without explicit owner approval):");
for (const command of plan) {
  console.log(`- ${command}`);
}

if (apply) {
  console.error("");
  console.error("--apply was provided, but this repo-side readiness task is read-only. Execute the printed commands manually or in a separately approved mutation task.");
  process.exit(1);
}
