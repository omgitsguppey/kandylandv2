import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type ErrorTruthDebugVisibilityReport = {
  generatedAtUtc: string;
  reportKey: "error-truth-debug-visibility";
  currentHead: string;
  summary: {
    phase4Status: "pass" | "deferred" | "fail";
    routeCreated: boolean;
    componentCreated: boolean;
    adminReadOnly: boolean;
    maxReadLimit: number;
    redactionEnabled: boolean;
    rewardMutationAllowed: boolean;
    balanceMutationAllowed: boolean;
    rawSecretsVisible: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  routeFindings: string[];
  componentFindings: string[];
  redactionFindings: string[];
  deferredFindings: string[];
  nextFixOrder: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactPath = join(repoRoot, "agent/state/error-truth-debug-visibility.generated.json");
const routePath = join(repoRoot, "src/app/api/admin/debug/bug-reports/route.ts");
const helperPath = join(repoRoot, "src/lib/errors/bug-report-admin-summary.ts");
const componentPath = join(repoRoot, "src/app/admin/debug/components/DebugBugReportSummary.tsx");
const docPath = join(repoRoot, "docs/agent-truth/error-truth-debug-visibility.md");

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function read(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function readArtifact() {
  if (!existsSync(artifactPath)) {
    throw new Error("Missing agent/state/error-truth-debug-visibility.generated.json.");
  }
  return JSON.parse(readFileSync(artifactPath, "utf8")) as ErrorTruthDebugVisibilityReport;
}

export function validateErrorTruthDebugVisibilityReport(
  report: ErrorTruthDebugVisibilityReport | null,
  head: string,
) {
  const failures: string[] = [];
  if (!report) return ["error-truth-debug-visibility artifact missing."];
  if (report.reportKey !== "error-truth-debug-visibility") failures.push("reportKey must be error-truth-debug-visibility.");
  if (report.currentHead !== head) failures.push(`report currentHead must match git HEAD (${head}).`);
  if (!["pass", "deferred"].includes(report.summary.phase4Status)) {
    failures.push("phase4Status must be pass or deferred.");
  }
  if (report.summary.phase4Status === "pass") {
    if (!report.summary.routeCreated) failures.push("routeCreated must be true when phase4Status is pass.");
    if (!report.summary.componentCreated) failures.push("componentCreated must be true when phase4Status is pass.");
  }
  if (!report.summary.adminReadOnly) failures.push("admin debug bug report visibility must be read-only.");
  if (report.summary.maxReadLimit > 50) failures.push("admin debug bug report read limit must be at most 50.");
  if (!report.summary.redactionEnabled) failures.push("redaction must be enabled.");
  if (report.summary.rewardMutationAllowed) failures.push("admin/debug route must not allow reward mutation.");
  if (report.summary.balanceMutationAllowed) failures.push("admin/debug route must not allow balance mutation.");
  if (report.summary.rawSecretsVisible) failures.push("raw secrets must not be visible in debug bug report summary.");
  if ((report.nextFixOrder?.length ?? 0) === 0) failures.push("nextFixOrder must not be empty.");
  return failures;
}

function validateSource() {
  const failures: string[] = [];
  const route = read(routePath);
  const helper = read(helperPath);
  const component = read(componentPath);
  const doc = read(docPath);

  if (!route) failures.push("src/app/api/admin/debug/bug-reports/route.ts is missing.");
  if (!helper) failures.push("src/lib/errors/bug-report-admin-summary.ts is missing.");
  if (!component) failures.push("DebugBugReportSummary component is missing.");
  if (!doc) failures.push("docs/agent-truth/error-truth-debug-visibility.md is missing.");
  if (route && !route.includes('auth: "admin"')) failures.push("admin debug bug report route must require admin auth.");
  if (route && !route.includes("allowedMethods: [\"GET\"]")) failures.push("admin debug bug report route must declare GET-only allowed methods.");
  if (route && !route.includes(".limit(BUG_REPORT_ADMIN_READ_LIMIT)")) failures.push("admin debug bug report route must use a bounded read limit.");
  if (route && /\b(transaction\.|runTransaction|\.set\(|\.update\(|\.delete\(|creditSourceAwareGumdrops|gumDropsPurchasedBalance|gumDropsRewardBalance)\b/u.test(route)) {
    failures.push("admin debug bug report route must not mutate reports, rewards, or balances.");
  }
  if (helper && !/token\|secret\|password\|authorization\|cookie\|paypal\|capture\|clientsecret\|stack/i.test(helper)) {
    failures.push("admin summary helper must redact token/secret/password/authorization/cookie/paypal/capture/clientSecret/stack keys.");
  }
  if (component && !component.includes("data-debug-read-only=\"true\"")) {
    failures.push("DebugBugReportSummary must label read-only state.");
  }
  if (component && /dangerouslySetInnerHTML|debugOnlyDetails/u.test(component)) {
    failures.push("DebugBugReportSummary must not render raw debug details.");
  }
  return failures;
}

function main() {
  const failures: string[] = [];
  let report: ErrorTruthDebugVisibilityReport | null = null;
  try {
    report = readArtifact();
  } catch (error) {
    failures.push((error as Error).message);
  }

  failures.push(...validateErrorTruthDebugVisibilityReport(report, currentHead()));
  failures.push(...validateSource());

  if (failures.length > 0) {
    console.error("Error truth debug visibility validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("Error truth debug visibility validation passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
