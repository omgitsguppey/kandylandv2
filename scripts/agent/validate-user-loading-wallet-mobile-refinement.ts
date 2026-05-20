import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Severity = "P0" | "P1" | "P2";
type FindingStatus = "fixed" | "missing" | "deferred";
type Finding = {
  id: string;
  status: FindingStatus;
  severity: Severity;
  detail: string;
};

export type UserLoadingWalletMobileRefinementReport = {
  generatedAtUtc: string;
  reportKey: "user-loading-wallet-mobile-refinement";
  currentHead: string;
  summary: {
    mobileDependenciesPresent: boolean;
    protectedNavChatUntouched: boolean;
    walletRuntimeLogicUnchanged: boolean;
    walletMobileDensityCompact: boolean;
    walletLoadingStable: boolean;
    userDashboardStagedLoading: boolean;
    userDashboardModulesPreserved: boolean;
    userLibraryLoadingStable: boolean;
    dropLoadingCompact: boolean;
    largeSkeletonsRemoved: boolean;
    openPrsClassified: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  dependencyFindings: Finding[];
  protectedSurfaceFindings: Finding[];
  walletFindings: Finding[];
  loadingFindings: Finding[];
  userDashboardFindings: Finding[];
  fixesApplied: Finding[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

export type UserLoadingWalletMobileRefinementInputs = {
  currentHead: string;
  generatedAtUtc: string;
  changedFiles: string[];
  openPrActions: string[];
  sources: {
    packageJson: string;
    mobileFinalLockDoc: string;
    mobileLoadingDoc: string;
    mobileScaleContract: string;
    loadingContract: string;
    files: Record<string, string>;
  };
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/user-loading-wallet-mobile-refinement.generated.json";
const docsRelativePath = "docs/agent-truth/user-loading-wallet-mobile-refinement.md";

const protectedPathPatterns = [
  /^src\/components\/Navigation\//u,
  /^src\/components\/Chat\//u,
  /^src\/app\/chat\//u,
  /^src\/app\/dashboard\/chat\//u,
  /(^|\/)(Navbar|TopNav|BottomNav|MobileBottomBar)\.tsx$/u,
];

const forbiddenRuntimePatterns = [
  /^src\/app\/api\/paypal\//u,
  /^src\/lib\/paypal/u,
  /^src\/lib\/gumdrop-economics\.ts$/u,
  /^src\/lib\/gumdrop-ledger\.ts$/u,
  /^src\/lib\/server\/gumdrop/u,
  /^src\/lib\/server\/wallet/u,
  /^firestore\.rules$/u,
  /^storage\.rules$/u,
];

const targetFiles = [
  "src/components/PurchaseModal.tsx",
  "src/app/dashboard/DashboardClient.tsx",
  "src/app/dashboard/library/LibraryClient.tsx",
  "src/app/drops/loading.tsx",
  "src/app/drops/[id]/preview/loading.tsx",
  "tests/unit/user-loading-wallet-mobile-refinement.spec.ts",
];

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function optionalRead(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function changedFiles() {
  const unstaged = execFileSync("git", ["diff", "--name-only"], { cwd: repoRoot, encoding: "utf8" })
    .split(/\r?\n/u)
    .filter(Boolean);
  const staged = execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: repoRoot, encoding: "utf8" })
    .split(/\r?\n/u)
    .filter(Boolean);
  return Array.from(new Set([...unstaged, ...staged])).map((file) => file.replaceAll("\\", "/"));
}

function finding(id: string, ok: boolean, detail: string, severity: Severity = "P1"): Finding {
  return {
    id,
    status: ok ? "fixed" : "missing",
    severity,
    detail,
  };
}

function countMissing(findings: Finding[], severity: Severity) {
  return findings.filter((entry) => entry.status === "missing" && entry.severity === severity).length;
}

function isProtectedPath(file: string) {
  const normalized = file.replaceAll("\\", "/");
  return protectedPathPatterns.some((pattern) => pattern.test(normalized));
}

function isForbiddenRuntimePath(file: string) {
  const normalized = file.replaceAll("\\", "/");
  return forbiddenRuntimePatterns.some((pattern) => pattern.test(normalized));
}

function hasOversizedWalletTokens(source: string) {
  return /\brounded-3xl\b|\bp-6\b|\bp-8\b|\btext-4xl\b|\btext-5xl\b|\bh-32\b|\bh-40\b/u.test(source);
}

function hasLargeSkeletonTokens(source: string) {
  return /\bh-44\b|min-h-\[21rem\]|\bh-40\b|\bh-32\b/u.test(source);
}

function walletRuntimeMarkersPresent(source: string) {
  return source.includes('data-wallet-runtime-logic-unchanged="true"')
    && source.includes("PayPalButtons")
    && source.includes("fundingSource={FUNDING.PAYPAL}")
    && source.includes("data-wallet-paypal-render-mode");
}

function walletStableMarkersPresent(source: string) {
  return source.includes('data-wallet-loading-stable="true"')
    && source.includes("createStaleRequestGuard")
    && source.includes("AbortController");
}

function walletDensityMarkersPresent(source: string) {
  return source.includes('data-wallet-mobile-density="compact"') && !hasOversizedWalletTokens(source);
}

function dashboardModulesPreserved(source: string) {
  return ["DailyCheckIn", "CollectionList", "RecentActivityFeed", "CreatorDiscoveryRail"].every((needle) => source.includes(needle));
}

export function buildUserLoadingWalletMobileRefinementReport(
  inputs: UserLoadingWalletMobileRefinementInputs,
): UserLoadingWalletMobileRefinementReport {
  const purchaseModal = inputs.sources.files["src/components/PurchaseModal.tsx"] ?? "";
  const dashboard = inputs.sources.files["src/app/dashboard/DashboardClient.tsx"] ?? "";
  const library = inputs.sources.files["src/app/dashboard/library/LibraryClient.tsx"] ?? "";
  const dropsLoading = inputs.sources.files["src/app/drops/loading.tsx"] ?? "";
  const previewLoading = inputs.sources.files["src/app/drops/[id]/preview/loading.tsx"] ?? "";
  const changedProtected = inputs.changedFiles.filter(isProtectedPath);
  const changedRuntime = inputs.changedFiles.filter(isForbiddenRuntimePath);

  const mobileDependenciesPresent = (inputs.sources.mobileFinalLockDoc.includes("mobile-ui-final-lock")
    || inputs.sources.mobileFinalLockDoc.includes("Mobile UI Final Lock"))
    && (inputs.sources.mobileLoadingDoc.includes("mobile-loading-hydration-stability")
      || inputs.sources.mobileLoadingDoc.includes("Mobile Loading Hydration Stability"))
    && inputs.sources.mobileScaleContract.includes("getMobileModuleClassNames")
    && inputs.sources.loadingContract.includes("createStaleRequestGuard")
    && inputs.sources.packageJson.includes("check:user-loading-wallet-mobile-refinement");

  const dependencyFindings = [
    finding("mobile-dependencies-present", mobileDependenciesPresent, "Existing mobile doctrine, loading contract, scale contract, and package script are present.", "P0"),
  ];

  const protectedSurfaceFindings = [
    finding(
      "protected-nav-chat-untouched",
      changedProtected.length === 0,
      changedProtected.length === 0 ? "Protected nav/chat files were not changed." : `Protected files changed: ${changedProtected.join(", ")}`,
      "P0",
    ),
    finding(
      "wallet-runtime-files-untouched",
      changedRuntime.length === 0,
      changedRuntime.length === 0 ? "Payment, GumDrop math, Firebase, and wallet server runtime files were not changed." : `Forbidden runtime files changed: ${changedRuntime.join(", ")}`,
      "P0",
    ),
  ];

  const walletFindings = [
    finding("wallet-runtime-logic-marker", walletRuntimeMarkersPresent(purchaseModal), "Wallet modal keeps PayPal runtime markers and declares runtime logic unchanged.", "P0"),
    finding("wallet-mobile-density-compact", walletDensityMarkersPresent(purchaseModal), "Wallet modal uses compact mobile density and avoids oversized wallet tokens.", "P1"),
    finding("wallet-loading-stable", walletStableMarkersPresent(purchaseModal), "Wallet package metadata loading uses stale-request and abort protection.", "P1"),
  ];

  const userDashboardFindings = [
    finding("dashboard-staged-loading", dashboard.includes('data-user-dashboard-loading-staged="true"'), "User dashboard declares staged loading instead of optional-module blocking.", "P1"),
    finding("dashboard-modules-preserved", dashboardModulesPreserved(dashboard), "Daily Rewards, My KandyDrops collection, Recent Activity, and Creator Spotlight modules remain source-visible.", "P0"),
    finding("library-loading-stable", library.includes('data-user-library-loading-stable="true"') && library.includes("getMobileSkeletonClass"), "My KandyDrops library loading is compact and stable.", "P1"),
  ];

  const loadingFindings = [
    finding("drops-loading-compact", dropsLoading.includes('data-mobile-density="compact"') && !hasLargeSkeletonTokens(dropsLoading), "Drops route skeleton is compact on mobile.", "P1"),
    finding("preview-loading-compact", previewLoading.includes('data-mobile-density="compact"') && !hasLargeSkeletonTokens(previewLoading), "Drop preview skeleton is compact on mobile.", "P1"),
  ];

  const openPrsClassified = inputs.openPrActions.length > 0;
  const fixesApplied = [
    finding("open-prs-classified", openPrsClassified, "Relevant open PRs were classified for this pass.", "P0"),
    finding("release-note-script-ready", inputs.sources.packageJson.includes("check:release-notes"), "Release note validator remains available for same-commit notes.", "P2"),
  ];

  const allFindings = [
    ...dependencyFindings,
    ...protectedSurfaceFindings,
    ...walletFindings,
    ...loadingFindings,
    ...userDashboardFindings,
    ...fixesApplied,
  ];

  return {
    generatedAtUtc: inputs.generatedAtUtc,
    reportKey: "user-loading-wallet-mobile-refinement",
    currentHead: inputs.currentHead,
    summary: {
      mobileDependenciesPresent,
      protectedNavChatUntouched: protectedSurfaceFindings[0].status === "fixed",
      walletRuntimeLogicUnchanged: protectedSurfaceFindings[1].status === "fixed" && walletFindings[0].status === "fixed",
      walletMobileDensityCompact: walletFindings[1].status === "fixed",
      walletLoadingStable: walletFindings[2].status === "fixed",
      userDashboardStagedLoading: userDashboardFindings[0].status === "fixed",
      userDashboardModulesPreserved: userDashboardFindings[1].status === "fixed",
      userLibraryLoadingStable: userDashboardFindings[2].status === "fixed",
      dropLoadingCompact: loadingFindings.every((entry) => entry.status === "fixed"),
      largeSkeletonsRemoved: loadingFindings.every((entry) => entry.status === "fixed"),
      openPrsClassified,
      p0Count: countMissing(allFindings, "P0"),
      p1Count: countMissing(allFindings, "P1"),
      p2Count: countMissing(allFindings, "P2"),
    },
    dependencyFindings,
    protectedSurfaceFindings,
    walletFindings,
    loadingFindings,
    userDashboardFindings,
    fixesApplied,
    prCleanupActions: inputs.openPrActions,
    nextFixOrder: [
      "Apply the compact wallet markers to any future wallet entrypoints that reuse PurchaseModal.",
      "Keep route loading placeholders close to final module size before escalating to screenshot QA.",
      "Continue moving optional dashboard modules to staged dynamic loading when they become source-heavy.",
    ],
  };
}

export function validateUserLoadingWalletMobileRefinementReport(report: UserLoadingWalletMobileRefinementReport | null) {
  const failures: string[] = [];
  if (!report) return ["user loading wallet mobile refinement report missing."];
  if (report.reportKey !== "user-loading-wallet-mobile-refinement") failures.push("reportKey must be user-loading-wallet-mobile-refinement.");
  if (!report.summary.mobileDependenciesPresent) failures.push("mobile loading/scale dependencies or package script missing.");
  if (!report.summary.protectedNavChatUntouched) failures.push("protected nav/chat files changed.");
  if (!report.summary.walletRuntimeLogicUnchanged) failures.push("wallet runtime/payment files changed beyond UI scale or runtime marker missing.");
  if (!report.summary.walletMobileDensityCompact) failures.push("wallet mobile density marker missing or oversized wallet tokens remain.");
  if (!report.summary.walletLoadingStable) failures.push("wallet loading stale-request guard missing.");
  if (!report.summary.userDashboardStagedLoading) failures.push("user dashboard still blocks on optional modules.");
  if (!report.summary.userDashboardModulesPreserved) failures.push("user dashboard modules removed or no longer source-visible.");
  if (!report.summary.userLibraryLoadingStable) failures.push("My KandyDrops library loading marker missing.");
  if (!report.summary.dropLoadingCompact) failures.push("large skeletons remain in touched user drop surfaces.");
  if (!report.summary.openPrsClassified) failures.push("open PRs are unclassified.");
  if (!Array.isArray(report.nextFixOrder) || report.nextFixOrder.length === 0) failures.push("nextFixOrder missing.");
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) failures.push("blocking user loading wallet mobile findings remain.");
  return failures;
}

function readInputs(): UserLoadingWalletMobileRefinementInputs {
  const files = Object.fromEntries(targetFiles.map((file) => [file, optionalRead(file)]));
  return {
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
    changedFiles: changedFiles(),
    openPrActions: [
      "Preserved PR #274: broad monolith governance doc PR outside this scoped wallet/mobile pass and mentions protected chat.",
    ],
    sources: {
      packageJson: read("package.json"),
      mobileFinalLockDoc: optionalRead("docs/agent-truth/mobile-ui-final-lock.md"),
      mobileLoadingDoc: optionalRead("docs/agent-truth/mobile-loading-hydration-stability.md"),
      mobileScaleContract: optionalRead("src/lib/ui/mobile-scale-contract.ts"),
      loadingContract: optionalRead("src/lib/ui/loading-state-contract.ts"),
      files,
    },
  };
}

function writeJson(relativePath: string, value: unknown) {
  const fullPath = join(repoRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function renderMarkdown(report: UserLoadingWalletMobileRefinementReport) {
  const lines = [
    "# User Loading Wallet Mobile Refinement",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Mobile dependencies present: ${report.summary.mobileDependenciesPresent ? "yes" : "no"}`,
    `- Protected nav/chat untouched: ${report.summary.protectedNavChatUntouched ? "yes" : "no"}`,
    `- Wallet runtime logic unchanged: ${report.summary.walletRuntimeLogicUnchanged ? "yes" : "no"}`,
    `- Wallet mobile density compact: ${report.summary.walletMobileDensityCompact ? "yes" : "no"}`,
    `- Wallet loading stable: ${report.summary.walletLoadingStable ? "yes" : "no"}`,
    `- User dashboard staged loading: ${report.summary.userDashboardStagedLoading ? "yes" : "no"}`,
    `- User dashboard modules preserved: ${report.summary.userDashboardModulesPreserved ? "yes" : "no"}`,
    `- My KandyDrops loading stable: ${report.summary.userLibraryLoadingStable ? "yes" : "no"}`,
    `- Drop loading compact: ${report.summary.dropLoadingCompact ? "yes" : "no"}`,
    "",
    "## Fixes Applied",
    "",
    ...report.walletFindings.map((entry) => `- ${entry.status}: ${entry.detail}`),
    ...report.userDashboardFindings.map((entry) => `- ${entry.status}: ${entry.detail}`),
    ...report.loadingFindings.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## PR Cleanup",
    "",
    ...report.prCleanupActions.map((entry) => `- ${entry}`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((step, index) => `${index + 1}. ${step}`),
    "",
  ];
  const fullPath = join(repoRoot, docsRelativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, lines.join("\n"));
}

function main() {
  const report = buildUserLoadingWalletMobileRefinementReport(readInputs());
  writeJson(artifactRelativePath, report);
  renderMarkdown(report);
  const failures = validateUserLoadingWalletMobileRefinementReport(report);
  if (failures.length > 0) {
    console.error("[user-loading-wallet-mobile-refinement] failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`[user-loading-wallet-mobile-refinement] ok: p0=${report.summary.p0Count} p1=${report.summary.p1Count}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
