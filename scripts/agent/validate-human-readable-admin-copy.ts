import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

type Failure = {
  file?: string;
  message: string;
};

const failures: Failure[] = [];

function rel(file: string) {
  return file.replaceAll("\\", "/");
}

function read(file: string) {
  const absolute = path.join(root, file);
  if (!existsSync(absolute)) {
    failures.push({ file, message: "Required file is missing." });
    return "";
  }
  return readFileSync(absolute, "utf8");
}

function fail(file: string | undefined, message: string) {
  failures.push({ file, message });
}

const requiredFiles = [
  "src/lib/admin/copy/admin-truth-copy.ts",
  "src/lib/admin/copy/admin-copy-registry.ts",
  "src/lib/problem-state-copy.ts",
  "tests/unit/admin-truth-copy.spec.ts",
  "tests/unit/problem-state-copy.spec.ts",
  "docs/agent-truth/admin-copy-style-guide.md",
  "docs/agent-truth/human-readable-admin-truth.md",
];

for (const file of requiredFiles) {
  read(file);
}

const registry = read("src/lib/admin/copy/admin-copy-registry.ts");
const mapper = read("src/lib/admin/copy/admin-truth-copy.ts");
const problemCopy = read("src/lib/problem-state-copy.ts");
const debugCards = read("src/lib/admin-debug-summary-cards.ts");

for (const expected of [
  "buildOperatorStatusCopy",
  "buildDeveloperDebugCopy",
  "mapTechnicalStateToOperatorState",
  "getAdminActionLabel",
  "getAdminStatusSeverity",
  "getAdminStatusBadgeLabel",
  "getAdminStatusExplanation",
  "buildAdminDebugExplanation",
  "summarizeAdminIssueForOperator",
]) {
  if (!mapper.includes(`function ${expected}`) && !mapper.includes(`const ${expected}`)) {
    fail("src/lib/admin/copy/admin-truth-copy.ts", `Missing admin copy helper: ${expected}.`);
  }
}

for (const pattern of [
  "analytics_delayed",
  "refresh_running",
  "no_verified_snapshot",
  "guest_estimated",
  "source_mismatch",
  "parity_mismatch",
  "purchase_tracking_mismatch",
  "unlock_tracking_mismatch",
  "task_lifecycle_mismatch",
  "notification_duplicate_prevented",
  "notification_missing",
  "onboarding_discrepancy",
  "auth_timing_unavailable",
  "event_context_unavailable",
  "data_validation_moved_to_debug",
  "admin_excluded_from_user_metrics",
  "cache_stale_or_snapshot",
  "fake_zero_prevented",
]) {
  if (!registry.includes(pattern)) {
    fail("src/lib/admin/copy/admin-copy-registry.ts", `Missing registered admin copy pattern: ${pattern}.`);
  }
}

for (const expected of [
  "getPageProblemCopy",
  "getPaymentProblemCopy",
  "getUnlockProblemCopy",
  "getNotificationProblemCopy",
]) {
  if (!problemCopy.includes(`function ${expected}`)) {
    fail("src/lib/problem-state-copy.ts", `Missing user problem-state copy helper: ${expected}.`);
  }
}

for (const badge of ["LIVE", "UPDATED", "REFRESHING", "DELAYED", "EST", "PARTIAL", "WAIT", "REVIEW", "ERROR", "SNAP"]) {
  if (!registry.includes(`"${badge}"`)) {
    fail("src/lib/admin/copy/admin-copy-registry.ts", `Approved badge label is not registered: ${badge}.`);
  }
}

for (const field of ["operatorSummary", "technicalEvidence", "recommendedNextCheck", "sourceDetails", "debugExplanation"]) {
  if (!debugCards.includes(field)) {
    fail("src/lib/admin-debug-summary-cards.ts", `Debug summary cards must expose ${field}.`);
  }
}

const mainUiFiles = [
  "src/app/admin/analytics/page.tsx",
  "src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx",
  "src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx",
  "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx",
  "src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx",
  "src/components/Admin/Analytics/AdminOnboardingAnalyticsModules.tsx",
  "src/components/Admin/AdminModuleVerificationCard.tsx",
  "src/components/Admin/AdminModerationConsole.tsx",
  "src/components/Admin/AdminAiDescriptionOperations.tsx",
  "src/components/Admin/AiDropCoverGeneratorPanel.tsx",
  "src/components/Admin/AiDropDescriptionGeneratorPanel.tsx",
];

const userProblemStateFiles = [
  "src/app/error.tsx",
  "src/components/ErrorBoundary.tsx",
  "src/components/PurchaseModal.tsx",
  "src/components/DropCard.tsx",
  "src/components/DropPreviewModal.tsx",
  "src/components/Navigation/NotificationBell.tsx",
  "src/components/ui/NotFoundSurface.tsx",
];

const bannedMainUiPhrases = [
  "failed closed",
  "polled route snapshot",
  "realtime lane",
  "observers failed",
  "canonical rollup",
  "canonical authenticated events",
  "canonical event samples",
  "analytics_aggregate",
  "truth score",
  "pipeline health fail",
  "module coverage fail",
  "stale validated backend cache",
  "backend refresh runs",
  "fallback active",
  "Degraded:",
  "Graph source unavailable",
  "Realtime analytics is delayed",
  "last validated backend snapshot",
  "Prior-step raw ratio",
];

const blockedBadgeLiterals = [
  "\"STALE\"",
  "\"MIXED\"",
  "\"CACHE\"",
  "\"RAW\"",
];

for (const file of mainUiFiles) {
  const content = read(file);
  const lower = content.toLowerCase();
  for (const phrase of bannedMainUiPhrases) {
    const found = phrase === "Degraded:"
      ? content.includes(phrase)
      : lower.includes(phrase.toLowerCase());
    if (found) {
      fail(file, `Primary admin UI contains debug-only phrase: ${phrase}.`);
    }
  }

  for (const literal of blockedBadgeLiterals) {
    if (content.includes(literal)) {
      fail(file, `Primary admin UI contains non-approved badge literal: ${literal}.`);
    }
  }

  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    const previousLine = lines[index - 1] ?? "";
    if (line.includes("className") || previousLine.includes("className") || line.includes("import ") || line.includes("__KANDYDROPS")) {
      return;
    }
    const matches = line.matchAll(/(["'`])((?:\\.|(?!\1).){161,})\1/g);
    for (const match of matches) {
      fail(file, `Visible string is longer than 160 characters on line ${index + 1}: ${match[2].slice(0, 80)}...`);
    }
  });
}

for (const file of userProblemStateFiles) {
  const content = read(file);
  const lower = content.toLowerCase();
  for (const phrase of [
    ...bannedMainUiPhrases,
    "something went wrong",
    "error details unavailable",
    "real payments require next_public_paypal_client_id_live",
  ]) {
    const found = phrase === "Degraded:"
      ? content.includes(phrase)
      : lower.includes(phrase.toLowerCase());
    if (found) {
      fail(file, `User-visible problem state contains debug-only or vague phrase: ${phrase}.`);
    }
  }
}

for (const [file, helper] of [
  ["src/app/error.tsx", "getPageProblemCopy"],
  ["src/components/ErrorBoundary.tsx", "getPageProblemCopy"],
  ["src/components/PurchaseModal.tsx", "getPaymentProblemCopy"],
  ["src/components/DropCard.tsx", "getUnlockProblemCopy"],
  ["src/components/DropPreviewModal.tsx", "getUnlockProblemCopy"],
  ["src/components/Navigation/NotificationBell.tsx", "getNotificationProblemCopy"],
] as const) {
  const content = read(file);
  if (!content.includes(helper)) {
    fail(file, `Problem-state UI must use shared helper: ${helper}.`);
  }
}

for (const [file, rawErrorExpression] of [
  ["src/app/error.tsx", "error.message"],
  ["src/components/ErrorBoundary.tsx", "this.state.error.message"],
] as const) {
  const content = read(file);
  if (content.includes(rawErrorExpression)) {
    fail(file, "User-facing error boundary must not render raw technical error details.");
  }
}

const debugUiFiles = [
  "src/app/admin/debug/components/DebugPrimitives.tsx",
  "src/app/admin/debug/components/DebugAdvancedDataValidation.tsx",
  "src/app/admin/debug/components/DebugTabAi.tsx",
];

for (const file of debugUiFiles) {
  const content = read(file);
  if (!content.includes("Technical") && !content.includes("technical")) {
    fail(file, "Debug UI file should keep technical evidence available.");
  }
}

const debugPrimitives = read("src/app/admin/debug/components/DebugPrimitives.tsx");
for (const label of ["What this means", "Why it matters", "What to check next", "Technical evidence", "Source details"]) {
  if (!debugPrimitives.includes(label)) {
    fail("src/app/admin/debug/components/DebugPrimitives.tsx", `Explain-this helper is missing label: ${label}.`);
  }
}

const validationBuilder = read("src/lib/server/admin-analytics-historical-validation.ts");
for (const token of ["operatorSummary", "whyItMatters", "technicalEvidence", "sourceDetails", "passBlockedReason"]) {
  if (!validationBuilder.includes(token)) {
    fail("src/lib/server/admin-analytics-historical-validation.ts", `Data validation checks must expose ${token}.`);
  }
}

const docs = [
  "docs/agent-truth/admin-copy-style-guide.md",
  "docs/agent-truth/human-readable-admin-truth.md",
].map((file) => [file, read(file)] as const);

for (const [file, content] of docs) {
  for (const term of ["Live", "Updated", "Refreshing", "Verified snapshot shown", "Delayed", "Estimated", "Partial", "Waiting for first snapshot", "Needs review", "Unavailable", "No sample", "Source mismatch", "Open in Debug", "Refresh"]) {
    if (!content.includes(term)) {
      fail(file, `Doc is missing allowed copy term: ${term}.`);
    }
  }
  for (const phrase of ["failed closed", "polled route snapshot", "canonical rollup", "analytics_aggregate"]) {
    if (!content.includes(phrase)) {
      fail(file, `Doc is missing banned/debug-only phrase example: ${phrase}.`);
    }
  }
}

const copyTests = read("tests/unit/admin-truth-copy.spec.ts");
for (const expected of [
  "Live updates are delayed",
  "Verified snapshot shown",
  "Guest traffic is estimated",
  "Purchase tracking needs review",
  "No sample is available for this range",
]) {
  if (!copyTests.includes(expected)) {
    fail("tests/unit/admin-truth-copy.spec.ts", `Admin copy test is missing case: ${expected}.`);
  }
}

const problemCopyTests = read("tests/unit/problem-state-copy.spec.ts");
for (const expected of [
  "Checkout could not be verified",
  "Your wallet was not changed",
  "More GumDrops are needed",
  "Your GumDrops were not charged",
  "Notifications are unavailable",
]) {
  if (!problemCopyTests.includes(expected)) {
    fail("tests/unit/problem-state-copy.spec.ts", `Problem-state copy test is missing case: ${expected}.`);
  }
}

if (failures.length > 0) {
  console.error("Human-readable admin copy validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure.file ? `${rel(failure.file)}: ` : ""}${failure.message}`);
  }
  process.exit(1);
}

console.log("Human-readable admin copy validation passed.");
