import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type PhaseCheckStatus = "passed" | "failed" | "not_run";

export type ErrorHandlingFinalReadinessReport = {
  generatedAtUtc: string;
  reportKey: "error-handling-final-readiness";
  currentHead: string;
  summary: {
    phase1LanguageContract: "pass" | "fail";
    phase2BugReportReward: "pass" | "fail";
    phase3SurfaceWiring: "pass" | "fail";
    phase4DebugTruth: "pass" | "deferred" | "fail";
    rawUserErrorLeaks: number;
    bugReportRewardGd: number;
    rewardCreditsRewardBalanceOnly: boolean;
    purchasedBalanceUntouched: boolean;
    duplicateGuard: boolean;
    dailyCapGuard: boolean;
    debugTruthVisibility: boolean;
    betaCanUseErrorPhaseAsSourceComplete: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  phaseChecks: Array<{ command: string; status: PhaseCheckStatus; evidence: string }>;
  rawErrorLeakFindings: string[];
  debugTruthFindings: string[];
  rewardSafetyFindings: string[];
  deferredFindings: string[];
  nextFixOrder: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactPath = join(repoRoot, "agent/state/error-handling-final-readiness.generated.json");
const betaStatusPath = join(repoRoot, "agent/state/current-beta-exit-status.generated.json");

const phaseCommands = [
  "npm run check:error-language-contract",
  "npm run check:bug-report-reward-flow",
  "npm run check:human-error-surface-wiring",
  "npm run check:error-truth-debug-visibility",
] as const;

const rawLeakFiles = [
  "src/components/Creators/CreatorExperiencesPanel.tsx",
  "src/components/Creators/CreatorRequestsManager.tsx",
  "src/components/Creators/CreatorBookingsManager.tsx",
  "src/components/Creators/CreatorFanPassManager.tsx",
  "src/components/Creators/CreatorBroadcastManager.tsx",
  "src/components/PurchaseModal.tsx",
  "src/components/Drops",
  "src/app/drops",
  "src/components/Chat/ChatExperience.tsx",
];

const rawLeakPattern = /Internal server error|Something went wrong|Unknown error|unknown error|toast\.error\(error\.message|setError\(error\.message|String\(error\)|FirebaseError|ZodError/u;

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function read(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function readArtifact() {
  if (!existsSync(artifactPath)) {
    throw new Error("Missing agent/state/error-handling-final-readiness.generated.json.");
  }
  return JSON.parse(readFileSync(artifactPath, "utf8")) as ErrorHandlingFinalReadinessReport;
}

function runCommand(command: string) {
  const result = spawnSync("cmd.exe", ["/c", command], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  return result.status === 0;
}

function scanRawLeaks() {
  const findings: string[] = [];
  for (const target of rawLeakFiles) {
    const absolute = join(repoRoot, target);
    if (!existsSync(absolute)) continue;
    const files = execFileSync("git", ["ls-files", target], { cwd: repoRoot, encoding: "utf8" })
      .split(/\r?\n/u)
      .filter(Boolean)
      .filter((file) => /\.(tsx?|jsx?)$/u.test(file));
    for (const file of files) {
      const source = read(join(repoRoot, file));
      if (rawLeakPattern.test(source)) {
        findings.push(relative(repoRoot, file).replace(/\\/g, "/"));
      }
    }
  }
  return [...new Set(findings)];
}

export function validateErrorHandlingFinalReadinessReport(
  report: ErrorHandlingFinalReadinessReport | null,
  head: string,
) {
  const failures: string[] = [];
  if (!report) return ["error-handling-final-readiness artifact missing."];
  if (report.reportKey !== "error-handling-final-readiness") failures.push("reportKey must be error-handling-final-readiness.");
  if (report.currentHead !== head) failures.push(`report currentHead must match git HEAD (${head}).`);
  if (report.summary.phase1LanguageContract !== "pass") failures.push("phase1LanguageContract must pass.");
  if (report.summary.phase2BugReportReward !== "pass") failures.push("phase2BugReportReward must pass.");
  if (report.summary.phase3SurfaceWiring !== "pass") failures.push("phase3SurfaceWiring must pass.");
  if (!["pass", "deferred"].includes(report.summary.phase4DebugTruth)) failures.push("phase4DebugTruth must be pass or deferred.");
  if (report.summary.rawUserErrorLeaks !== 0) failures.push("rawUserErrorLeaks must be 0.");
  if (report.summary.bugReportRewardGd !== 10) failures.push("bug report reward amount must be 10.");
  if (!report.summary.rewardCreditsRewardBalanceOnly) failures.push("bug report rewards must credit reward balance only.");
  if (!report.summary.purchasedBalanceUntouched) failures.push("bug report rewards must not touch purchased balance.");
  if (!report.summary.duplicateGuard) failures.push("duplicateGuard must be true.");
  if (!report.summary.dailyCapGuard) failures.push("dailyCapGuard must be true.");
  if (report.summary.phase4DebugTruth === "pass" && !report.summary.debugTruthVisibility) {
    failures.push("debugTruthVisibility must be true when phase4DebugTruth is pass.");
  }
  if (!report.summary.betaCanUseErrorPhaseAsSourceComplete) {
    failures.push("betaCanUseErrorPhaseAsSourceComplete must be true after source-complete error readiness.");
  }
  for (const command of phaseCommands) {
    const represented = report.phaseChecks.some((check) => check.command === command && check.status === "passed");
    if (!represented) failures.push(`${command} must be represented as passed.`);
  }
  if ((report.nextFixOrder?.length ?? 0) === 0) failures.push("nextFixOrder must not be empty.");
  const betaStatus = read(betaStatusPath);
  if (!betaStatus.includes("error_handling_source_complete") || !betaStatus.includes("Manual testing can focus on product behavior because user/creator raw error leaks are source-blocked.")) {
    failures.push("current beta exit status must mention error phase readiness.");
  }
  return failures;
}

function validateSource() {
  const failures: string[] = [];
  const rawLeaks = scanRawLeaks();
  if (rawLeaks.length > 0) {
    failures.push(`raw user-facing dev strings remain in selected surfaces: ${rawLeaks.join(", ")}.`);
  }

  const notice = read(join(repoRoot, "src/components/errors/HumanErrorNotice.tsx"));
  if (/debugOnlyDetails|operatorMessage/u.test(notice)) {
    failures.push("HumanErrorNotice must not render debugOnlyDetails or operatorMessage.");
  }
  const contract = read(join(repoRoot, "src/lib/errors/bug-report-contract.ts"));
  if (!contract.includes("BUG_REPORT_REWARD_GD = 10")) failures.push("BUG_REPORT_REWARD_GD must remain 10.");
  const bugRoute = read(join(repoRoot, "src/app/api/bug-reports/route.ts"));
  if (!bugRoute.includes("rewardCreditGumDrops: BUG_REPORT_REWARD_GD") || !bugRoute.includes("purchasedCreditGumDrops: 0")) {
    failures.push("bug report reward transaction must credit reward GumDrops only.");
  }
  if (!bugRoute.includes("BUG_REPORT_DUPLICATE_WINDOW_MS") || !bugRoute.includes("BUG_REPORT_DAILY_REWARD_CAP")) {
    failures.push("duplicate and daily cap protections must remain in bug report route.");
  }
  const adminRoute = read(join(repoRoot, "src/app/api/admin/debug/bug-reports/route.ts"));
  if (/\b(runTransaction|\.set\(|\.update\(|\.delete\(|creditSourceAwareGumdrops|gumDropsPurchasedBalance|gumDropsRewardBalance)\b/u.test(adminRoute)) {
    failures.push("admin/debug bug reports route must not mutate reports or balances.");
  }
  if (!read(join(repoRoot, "src/lib/errors/bug-report-admin-summary.ts")).includes("SENSITIVE_ADMIN_KEY_PATTERN")) {
    failures.push("admin bug report summary redaction must exist.");
  }
  return failures;
}

function main() {
  const failures: string[] = [];
  let report: ErrorHandlingFinalReadinessReport | null = null;
  try {
    report = readArtifact();
  } catch (error) {
    failures.push((error as Error).message);
  }

  for (const command of phaseCommands) {
    if (!runCommand(command)) {
      failures.push(`${command} failed.`);
    }
  }
  failures.push(...validateErrorHandlingFinalReadinessReport(report, currentHead()));
  failures.push(...validateSource());

  if (failures.length > 0) {
    console.error("Error handling final readiness validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("Error handling final readiness validation passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
