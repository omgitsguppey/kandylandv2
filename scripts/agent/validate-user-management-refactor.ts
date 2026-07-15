import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildUserManagementRefactorReport,
  type UserManagementRefactorReport,
} from "@/lib/admin/user-management-contract";
import { buildPersonMetricsHydrationReport } from "@/lib/analytics/person-metrics-hydration";
import type { UserAnalytics, UsersSummary } from "@/types/admin-analytics";
import type { UserProfile } from "@/types/db";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/user-management-refactor.generated.json";
const DOC_PATH = "docs/agent-truth/user-management-refactor.md";
const VALIDATOR_PATH = "scripts/agent/validate-user-management-refactor.ts";
const TEST_PATH = "tests/unit/user-management-refactor.spec.ts";
const PACKAGE_SCRIPT = "check:user-management-refactor";

const SCORE_DIMENSION_KEYS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
] as const;

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readJson<T>(path: string): T | null {
  try {
    return JSON.parse(read(path)) as T;
  } catch {
    return null;
  }
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function trackedFiles() {
  return run("git", ["ls-files", "src", "scripts", "docs", "agent", "tests"])
    .split(/\r?\n/u)
    .map((entry) => entry.trim().replace(/\\/gu, "/"))
    .filter(Boolean);
}

function sampleUser(): UserProfile {
  return {
    uid: "validator_user",
    email: "validator@example.com",
    displayName: "Validator User",
    username: "validator",
    photoURL: null,
    role: "creator",
    gumDropsBalance: 100,
    gumDropsPaidBalance: 60,
    gumDropsRewardBalance: 40,
    unlockedContent: ["drop_validator"],
    createdAt: Date.now() - 60_000,
    status: "active",
    isVerified: true,
    onboardingCompleted: true,
    notificationSettings: {
      inAppEnabled: true,
      browserPushEnabled: true,
      newDropAlerts: true,
      expiringSoonAlerts: true,
    },
    privacySettings: {
      allowRecommendations: true,
      showInAnonymousStats: true,
      anonymousAnalyticsEnabled: true,
      identifiedAnalyticsEnabled: true,
      honorGlobalPrivacyControl: true,
    },
    creatorApplication: {
      signupType: "creator",
      submissionStatus: "onboarding_submitted",
      approvalStatus: "creator_approved",
      queuePosition: 1,
      onboardingStartedAt: Date.now() - 120_000,
      submittedAt: Date.now() - 120_000,
      onboardingSubmittedAt: Date.now() - 120_000,
      awaitingManualReviewAt: Date.now() - 120_000,
      updatedAt: Date.now() - 60_000,
      creatorDisplayName: "Validator User",
      creatorPrimaryPlatform: "instagram",
      creatorContentFocus: "validator",
      bypassFanOnboarding: false,
      legalStatus: "legal_signed",
      idVerificationStatus: "id_verified",
      segmentationStatus: "segment_assigned",
    },
  } as UserProfile;
}

function sampleAnalytics(): UserAnalytics {
  return {
    uid: "validator_user",
    username: "validator",
    eventCount: 8,
    sessionCount: 2,
    viewCount: 5,
    engagedViewCount: 4,
    passiveViewCount: 1,
    bounceCount: 0,
    unwrapCount: 1,
    purchaseCount: 1,
    authSuccessCount: 1,
    onboardingStartCount: 1,
    onboardingCompletionCount: 1,
    watchSecondsTotal: 120,
    watchHours: 0.03,
    avgLoadMs: 200,
    lastSeenAt: Date.now() - 60_000,
    grossRevenueUsd: 9.99,
    grossRevenueCents: 999,
    adjustedProfitUsd: 8.5,
    adjustedProfitCents: 850,
    retailValueUsd: 12,
    bonusValueUsd: 2,
    bonusGumDrops: 20,
    deliveredGumDrops: 120,
    paidGumDrops: 100,
    averageOrderUsd: 9.99,
    effectiveUsdPer100Gd: 8.33,
    unlockSpendGdTotal: 40,
    lastPurchaseAt: Date.now() - 30_000,
    bundleYieldRatio: 0.83,
    commerceTruthLabel: "live",
    commerceSourceLabel: "server purchase verification facts",
    commerceEmptyReason: null,
    metricTruthLabel: "live",
    metricSourceLabel: "canonical person metrics hydration",
    metricIntegrityFailures: [],
    recoveredFromFacts: false,
  };
}

function sampleSummary(): UsersSummary {
  return {
    totalUsers: 1,
    totalCreators: 1,
    totalAdmins: 0,
    verifiedUsers: 1,
    activeUsers: 1,
    suspendedUsers: 0,
    bannedUsers: 0,
    notificationsEnabledUsers: 1,
    onboardingCompletedUsers: 1,
    activeLast7Days: 1,
    returnedInLast7Days: 1,
    totalEvents: 8,
    totalUnwraps: 1,
    totalPurchases: 1,
    totalWatchHours: 0.03,
    grossRevenueUsd: 9.99,
    adjustedProfitUsd: 8.5,
    bonusValueUsd: 2,
    bonusGumDrops: 20,
    deliveredGumDrops: 120,
    paidGumDrops: 100,
    unlockSpendGdTotal: 40,
    averageOrderUsd: 9.99,
    effectiveUsdPer100Gd: 8.33,
    payingUsers: 1,
    commerceTruthLabel: "live",
    commerceSourceLabel: "server purchase verification facts",
    commerceEmptyReason: null,
    kpiCards: [],
  };
}

function classifyOldUserManagementLogic(): UserManagementRefactorReport["oldUserManagementLogic"] {
  return trackedFiles().flatMap<UserManagementRefactorReport["oldUserManagementLogic"][number]>((path) => {
    if (!existsSync(join(ROOT, path))) return [];
    if (path === VALIDATOR_PATH || path === TEST_PATH || path === DOC_PATH || path === "src/lib/admin/user-management-contract.ts") return [];
    if (!/^(src\/app\/admin\/users|src\/app\/admin\/user\/|src\/app\/api\/admin\/users|src\/lib\/admin|src\/lib\/server\/admin-user|src\/lib\/debug\/debug-panel-tracking-summary)/u.test(path)) return [];
    const source = read(path);
    if (/duplicate_user_table/iu.test(source)) return [{ path, classification: "duplicate_user_table" }];
    if (/stale_user_detail/iu.test(source)) return [{ path, classification: "stale_user_detail" }];
    if (/orphan_user_metric/iu.test(source)) return [{ path, classification: "orphan_user_metric" }];
    if (/<pre[\s\S]{0,200}JSON\.stringify/iu.test(source)) return [{ path, classification: "raw_dump_default" }];
    if (/adminDb\.collection\("users"\)\.get\(\)/u.test(source) && !source.includes("mode === \"summary\"")) return [{ path, classification: "route_cost_risk" }];
    return [];
  });
}

function packageScriptPresent() {
  const packageJson = readJson<{ scripts?: Record<string, string> }>("package.json");
  return packageJson?.scripts?.[PACKAGE_SCRIPT] === `tsx ${VALIDATOR_PATH}`;
}

function validatorAuthorityPresent() {
  const authority = readJson<{
    validators?: Record<string, { packageScripts?: string[]; status?: string }>;
    packageScripts?: Record<string, { validators?: string[]; status?: string }>;
  }>("agent/context/validator-authority.json");
  return Boolean(
    authority?.validators?.[VALIDATOR_PATH]?.packageScripts?.includes(PACKAGE_SCRIPT)
    && authority?.packageScripts?.[PACKAGE_SCRIPT]?.validators?.includes(VALIDATOR_PATH),
  );
}

function renderDoc(report: UserManagementRefactorReport) {
  const summaryRows = report.summaries.map((summary) =>
    `- ${summary.identity.userId}: identity=${summary.identity.identityConfidence}; account=${summary.accountState.status}; role=${summary.creatorRole.role}; consent=${summary.consentMode.mode}; activity=${summary.activitySummary.state}; lowConfidence=${summary.personMetricConfidence.lowConfidenceCount}; lastActivity=${summary.lastActivity.source}/${summary.lastActivity.freshness}`,
  );
  const scoreRows = Object.entries(report.scoreImpactByDimension).map(([dimension, impact]) =>
    `- ${dimension}: before=${impact.before}; after=${impact.after}; ${impact.reason}`,
  );
  const dirtyRows = report.dirtyFiles.map((file) => `- ${file.path}: ${file.classification}`);
  const oldRows = report.oldUserManagementLogic.map((entry) => `- ${entry.path}: ${entry.classification}`);
  return [
    "# User Management Refactor",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead ?? "unknown"}`,
    "",
    "## Contract",
    "",
    "- User management defaults to a compact summary list, search/filter, status chips, activity/confidence summary, and drilldown-only raw rows.",
    "- Per-user detail is organized by identity handoff, consent/tracking, activity metrics, wallet/payment funnel, drops/unwraps, support/account safety, and debug/telemetry confidence.",
    "- User-level metric confidence is pulled from person metrics hydration when available. Missing sources remain collecting/unavailable, not fake zero.",
    "- The admin users route keeps a bounded summary mode and does not require production reads in this validator.",
    "",
    "## Debug Lane",
    "",
    `- Label: ${report.debugLane.label}`,
    `- Users summarized: ${report.debugLane.usersSummarized}`,
    `- Low-confidence metrics: ${report.debugLane.lowConfidenceMetrics}`,
    `- Raw dumps before summary: ${report.debugLane.rawDumpsBeforeSummary}`,
    `- Duplicate user metric sections: ${report.debugLane.duplicateUserMetricSections}`,
    `- Summary-first route: ${report.debugLane.summaryFirstRoute}`,
    "",
    "## User Summaries",
    "",
    ...(summaryRows.length ? summaryRows : ["- none"]),
    "",
    "## Score Impact",
    "",
    ...scoreRows,
    "",
    "## Dirty Files",
    "",
    ...(dirtyRows.length ? dirtyRows : ["- none"]),
    "",
    "## Old User Management Logic",
    "",
    ...(oldRows.length ? oldRows : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = run("git", ["rev-parse", "HEAD"]) || "unknown";
  const dirty = changedFiles();
  const oldUserManagementLogic = classifyOldUserManagementLogic();
  const personMetricsHydration = buildPersonMetricsHydrationReport({ generatedAtUtc });
  const report = buildUserManagementRefactorReport({
    users: [sampleUser()],
    analyticsByUser: { validator_user: sampleAnalytics() },
    summary: sampleSummary(),
    personMetricsHydration,
    generatedAtUtc,
    currentHead,
    changedFiles: dirty,
    oldUserManagementLogic,
  });
  const failures = [...report.validationFailures];
  const page = read("src/app/admin/users/page.tsx");
  const route = read("src/app/api/admin/users/route.ts");
  const debugSummary = read("src/lib/debug/debug-panel-tracking-summary.ts");
  const adminDebugSummary = read("src/lib/server/admin-debug/summary.ts");
  const adminDebugRoute = read("src/app/api/admin/debug/route.ts");

  if (!page.includes("data-admin-user-management-summary-lane")) failures.push("user management default view lacks summary lane.");
  if (/<pre[\s\S]{0,200}JSON\.stringify/iu.test(page)) failures.push("user management default view shows raw dumps before summary.");
  if (!page.includes("data-admin-user-management-identity-handoff")) failures.push("identity handoff summary not visible.");
  if (!page.includes("data-admin-user-management-consent-mode")) failures.push("consent mode not visible.");
  if (!page.includes("data-admin-user-management-metric-confidence")) failures.push("metric confidence missing.");
  if (!page.includes("guestLinkStatus.state")) failures.push("guest/user link status not visible.");
  if (!page.includes("<details")) failures.push("raw event rows are not hidden behind drilldown.");
  if (!route.includes('mode === "summary"') || !route.includes("readAdminUsersFastSummarySnapshot")) failures.push("route lacks bounded summary-first mode.");
  if (!debugSummary.includes("user_management") || !adminDebugSummary.includes("userManagementRefactor") || !adminDebugRoute.includes("userManagementRefactor")) failures.push("debug panel lacks User management lane.");
  if (/user_metrics_confidence_panel|individual_user_metrics_debug|duplicate_user_metrics_section/iu.test(page + debugSummary)) failures.push("duplicate user metrics sections remain.");
  if (!SCORE_DIMENSION_KEYS.every((dimension) => report.scoreImpactByDimension[dimension])) failures.push("score dimension impact missing.");
  if (!packageScriptPresent()) failures.push("package script check:user-management-refactor is missing.");
  if (!validatorAuthorityPresent()) failures.push("validator authority missing.");
  if (oldUserManagementLogic.some((entry) => entry.classification === "duplicate_user_table" || entry.classification === "raw_dump_default")) failures.push("old duplicate/raw user management logic remains active.");
  if (report.dirtyFiles.some((file) => file.classification === "unsafe_unknown")) failures.push("dirty files unclassified.");
  if (report.validation.chatNavPaymentRuntimeChanged) failures.push("chat/nav/payment runtime changed.");
  if (!currentHead || !/^[0-9a-f]{40}$/iu.test(currentHead)) failures.push("current Git head is missing or is not a full commit SHA.");

  const output = {
    ...report,
    sourceCommit: currentHead ?? "unknown",
    status: failures.length > 0 ? "fail" as const : "pass" as const,
    passed: failures.length === 0,
    canClearSourceGate: failures.length === 0,
    validationFailures: [...new Set(failures)],
  };

  write(REPORT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  write(DOC_PATH, renderDoc(output));

  if (output.validationFailures.length > 0) {
    console.error(`User management refactor validation failed:\n${output.validationFailures.map((failure) => `- ${failure}`).join("\n")}`);
    process.exit(1);
  }

  console.log(`User management refactor validation passed: users=${output.debugLane.usersSummarized}, lowConfidence=${output.debugLane.lowConfidenceMetrics}, summaryFirst=${output.debugLane.summaryFirstRoute}.`);
}

main();
