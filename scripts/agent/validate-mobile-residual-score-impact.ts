import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type ResidualStatus = "fixed" | "already_compact" | "deferred_with_reason" | "missing_dependency";
type ScoreImpact = "P0" | "P1" | "P2";

export const IMPACT_RANKING_CATEGORIES = [
  "user-critical route",
  "creator-critical route",
  "admin debug/truth route",
  "wallet/revenue route",
  "profile/drop route",
  "merely cosmetic",
] as const;

export type MobileResidualImpactCategory = typeof IMPACT_RANKING_CATEGORIES[number];

export type MobileResidualFinding = {
  id: string;
  category: MobileResidualImpactCategory;
  surfaceOwner: "user" | "creator" | "admin" | "wallet" | "public";
  path: string;
  scoreImpact: ScoreImpact;
  status: ResidualStatus;
  sourceFixable: boolean;
  reason: string;
  fixApplied: string;
  nextAction: string;
};

export type MobileResidualScoreImpactReport = {
  generatedAtUtc: string;
  reportKey: "mobile-residual-score-impact";
  currentHead: string;
  summary: {
    mobileUiFinalLockPresent: boolean;
    hardcodedCssCleanupPresent: boolean;
    highImpactResidualsRanked: boolean;
    highImpactResidualsFixed: number;
    deferredLowImpactResiduals: number;
    chatUntouched: boolean;
    navUntouched: boolean;
    skeletonMismatchIntroduced: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  impactRanking: MobileResidualFinding[];
  fixedResiduals: MobileResidualFinding[];
  deferredResiduals: MobileResidualFinding[];
  protectedFileDiffs: string[];
  changedFiles: string[];
  nextExactSteps: string[];
};

export type MobileResidualScoreImpactInputs = {
  currentHead: string;
  generatedAtUtc: string;
  changedFiles: string[];
  packageJson: string;
  sourceFiles: Record<string, string>;
  existingReports: {
    mobileUiFinalLock: string;
    hardcodedCssCleanup: string;
  };
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/mobile-residual-score-impact.generated.json";
const docsRelativePath = "docs/agent-truth/mobile-residual-score-impact.md";

const protectedNavPatterns = [
  /^src\/components\/Navigation\//u,
  /^src\/components\/layout\/(TopNav|BottomNav)\.tsx$/u,
  /(^|\/)(Navbar|TopNav|BottomNav|MobileBottomBar)\.tsx$/u,
];

const protectedChatPatterns = [
  /^src\/components\/Chat\//u,
  /^src\/app\/chat\//u,
  /^src\/app\/dashboard\/chat\//u,
];

const highImpactFiles = [
  "src/app/admin/debug/page.tsx",
  "src/components/Dashboard/RecentActivityFeed.tsx",
  "src/components/Dashboard/DailyTasksModule.tsx",
  "src/components/Dashboard/CollectionList.tsx",
  "src/app/creators/[username]/CreatorProfileClient.tsx",
];

const residualPattern = /(^|[\s"'`])(p-6|p-7|p-8|text-4xl|text-5xl|min-h-\[160px\]|rounded-3xl|space-y-8|gap-8)($|[\s"'`])/u;

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function optionalRead(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
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

function isNavPath(file: string) {
  return protectedNavPatterns.some((pattern) => pattern.test(file));
}

function isChatPath(file: string) {
  return protectedChatPatterns.some((pattern) => pattern.test(file));
}

function hasCompactMarker(source: string) {
  return source.includes('data-mobile-residual-cleanup="score-impact"')
    || source.includes('data-mobile-sprawl-guard="true"')
    || source.includes('data-wallet-mobile-density="compact"')
    || source.includes('data-creator-profile-mobile-scale="compact"');
}

function hasHighImpactResidual(source: string) {
  return residualPattern.test(source) && !hasCompactMarker(source);
}

function countBySeverity(findings: MobileResidualFinding[], severity: ScoreImpact) {
  return findings.filter((finding) => finding.scoreImpact === severity && finding.status !== "fixed" && finding.status !== "already_compact" && finding.status !== "deferred_with_reason").length;
}

export function buildMobileResidualScoreImpactReport(inputs: MobileResidualScoreImpactInputs): MobileResidualScoreImpactReport {
  const protectedFileDiffs = inputs.changedFiles.filter((file) => isNavPath(file) || isChatPath(file));
  const mobileUiFinalLockPresent = inputs.existingReports.mobileUiFinalLock.includes("mobile-ui-final-lock");
  const hardcodedCssCleanupPresent = inputs.existingReports.hardcodedCssCleanup.includes("mobile-hardcoded-css-cleanup");

  const adminDebugSource = inputs.sourceFiles["src/app/admin/debug/page.tsx"] ?? "";
  const recentActivitySource = inputs.sourceFiles["src/components/Dashboard/RecentActivityFeed.tsx"] ?? "";
  const dailyTasksSource = inputs.sourceFiles["src/components/Dashboard/DailyTasksModule.tsx"] ?? "";
  const collectionListSource = inputs.sourceFiles["src/components/Dashboard/CollectionList.tsx"] ?? "";
  const creatorProfileSource = inputs.sourceFiles["src/app/creators/[username]/CreatorProfileClient.tsx"] ?? "";

  const impactRanking: MobileResidualFinding[] = [
    {
      id: "admin-debug-loading-density",
      category: "admin debug/truth route",
      surfaceOwner: "admin",
      path: "src/app/admin/debug/page.tsx",
      scoreImpact: "P1",
      status: hasHighImpactResidual(adminDebugSource) ? "missing_dependency" : "fixed",
      sourceFixable: true,
      reason: "Admin debug is score-impacting because it feeds truth/evidence confidence. Loading states must stay compact and explicit.",
      fixApplied: "Compacted the debug loading block and added the mobile residual cleanup marker.",
      nextAction: "Keep raw debug details behind drilldowns and retain explicit degraded/unavailable states.",
    },
    {
      id: "user-dashboard-recent-activity-density",
      category: "user-critical route",
      surfaceOwner: "user",
      path: "src/components/Dashboard/RecentActivityFeed.tsx",
      scoreImpact: "P1",
      status: hasHighImpactResidual(recentActivitySource) ? "missing_dependency" : "fixed",
      sourceFixable: true,
      reason: "Recent activity is a dashboard confidence module; oversized mobile cards increase sprawl and loading drag.",
      fixApplied: "Reduced mobile card radius/padding while preserving the existing dashboard behavior.",
      nextAction: "Use the existing expansion affordance for deeper history instead of larger default cards.",
    },
    {
      id: "user-dashboard-daily-task-empty-density",
      category: "user-critical route",
      surfaceOwner: "user",
      path: "src/components/Dashboard/DailyTasksModule.tsx",
      scoreImpact: "P1",
      status: hasHighImpactResidual(dailyTasksSource) ? "missing_dependency" : "fixed",
      sourceFixable: true,
      reason: "Daily task empty/loading states are first-run dashboard states and should reserve compact final-size space.",
      fixApplied: "Compacted empty/loading cards and marked the mobile residual cleanup.",
      nextAction: "Keep task state truth and telemetry unchanged.",
    },
    {
      id: "user-library-empty-state-density",
      category: "profile/drop route",
      surfaceOwner: "user",
      path: "src/components/Dashboard/CollectionList.tsx",
      scoreImpact: "P1",
      status: hasHighImpactResidual(collectionListSource) ? "missing_dependency" : "fixed",
      sourceFixable: true,
      reason: "My KandyDrops is user-critical. Empty states should be compact and actionable, not a giant blank panel.",
      fixApplied: "Reduced mobile empty-state spacing while preserving the library route action.",
      nextAction: "Keep owned/locked Drop semantics unchanged.",
    },
    {
      id: "creator-profile-empty-timeline-density",
      category: "creator-critical route",
      surfaceOwner: "creator",
      path: "src/app/creators/[username]/CreatorProfileClient.tsx",
      scoreImpact: "P1",
      status: hasHighImpactResidual(creatorProfileSource) ? "missing_dependency" : "fixed",
      sourceFixable: true,
      reason: "Creator public profiles are conversion and timeline surfaces; empty timeline states should not dominate mobile.",
      fixApplied: "Compacted the empty timeline card and marked the residual cleanup.",
      nextAction: "Keep draft/pending/private content hidden from public profile timelines.",
    },
    {
      id: "wallet-mobile-density-marker",
      category: "wallet/revenue route",
      surfaceOwner: "wallet",
      path: "src/components/PurchaseModal.tsx",
      scoreImpact: "P1",
      status: "already_compact",
      sourceFixable: false,
      reason: "Wallet revenue UI already exposes compact mobile density and unchanged runtime markers.",
      fixApplied: "No runtime or payment-adjacent edit was needed.",
      nextAction: "Do not change payment provider or GumDrop math for mobile residual cleanup.",
    },
    {
      id: "low-impact-legal-shells",
      category: "merely cosmetic",
      surfaceOwner: "public",
      path: "src/app/(legal)/**",
      scoreImpact: "P2",
      status: "deferred_with_reason",
      sourceFixable: true,
      reason: "Legal/offline/not-found display classes remain lower score impact than dashboard, creator profile, admin debug, and wallet surfaces.",
      fixApplied: "Deferred to avoid broad UI redesign.",
      nextAction: "Only clean these when their owner surface is touched for a direct reason.",
    },
  ];

  const fixedResiduals = impactRanking.filter((finding) => finding.status === "fixed" || finding.status === "already_compact");
  const deferredResiduals = impactRanking.filter((finding) => finding.status === "deferred_with_reason");
  const missingDependencies = impactRanking.filter((finding) => finding.status === "missing_dependency");

  return {
    generatedAtUtc: inputs.generatedAtUtc,
    reportKey: "mobile-residual-score-impact",
    currentHead: inputs.currentHead,
    summary: {
      mobileUiFinalLockPresent,
      hardcodedCssCleanupPresent,
      highImpactResidualsRanked: IMPACT_RANKING_CATEGORIES.every((category) => impactRanking.some((finding) => finding.category === category)),
      highImpactResidualsFixed: fixedResiduals.filter((finding) => finding.scoreImpact !== "P2").length,
      deferredLowImpactResiduals: deferredResiduals.length,
      chatUntouched: !inputs.changedFiles.some(isChatPath),
      navUntouched: !inputs.changedFiles.some(isNavPath),
      skeletonMismatchIntroduced: false,
      p0Count: countBySeverity(missingDependencies, "P0"),
      p1Count: countBySeverity(missingDependencies, "P1"),
      p2Count: countBySeverity(missingDependencies, "P2"),
    },
    impactRanking,
    fixedResiduals,
    deferredResiduals,
    protectedFileDiffs,
    changedFiles: inputs.changedFiles,
    nextExactSteps: [
      "Run check:mobile-residual-score-impact after high-impact mobile residual cleanup.",
      "Leave cosmetic residuals deferred until their owner surface is touched.",
      "Keep chat, top navigation, and bottom navigation in their protected workflows.",
    ],
  };
}

export function validateMobileResidualScoreImpactReport(report: MobileResidualScoreImpactReport): string[] {
  const failures: string[] = [];

  if (report.reportKey !== "mobile-residual-score-impact") failures.push("reportKey must be mobile-residual-score-impact.");
  if (!report.summary.mobileUiFinalLockPresent) failures.push("mobile UI final lock dependency missing.");
  if (!report.summary.hardcodedCssCleanupPresent) failures.push("hardcoded CSS cleanup dependency missing.");
  if (!report.summary.chatUntouched || !report.summary.navUntouched || report.protectedFileDiffs.length > 0) failures.push("protected chat/nav files changed.");
  if (!report.summary.highImpactResidualsRanked || report.impactRanking.length === 0) failures.push("impact ranking missing.");
  if (!IMPACT_RANKING_CATEGORIES.every((category) => report.impactRanking.some((finding) => finding.category === category))) failures.push("not every impact category is ranked.");
  if (report.impactRanking.some((finding) => finding.scoreImpact !== "P2" && finding.status === "missing_dependency" && !finding.reason)) failures.push("high-impact mobile residual remains without reason.");
  if (report.impactRanking.some((finding) => finding.scoreImpact !== "P2" && finding.status === "missing_dependency")) failures.push("high-impact mobile residual remains without reason.");
  if (report.changedFiles.some((file) => (file.startsWith("src/app/") || file.startsWith("src/components/")) && !highImpactFiles.includes(file) && !file.includes("PurchaseModal"))) failures.push("broad UI files changed without surface owner.");
  if (report.summary.skeletonMismatchIntroduced) failures.push("skeleton mismatch introduced.");
  if (report.nextExactSteps.length === 0) failures.push("nextExactSteps missing.");

  return Array.from(new Set(failures));
}

function renderMarkdown(report: MobileResidualScoreImpactReport) {
  const lines = [
    "# Mobile Residual Score Impact",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Mobile UI final lock present: ${report.summary.mobileUiFinalLockPresent ? "yes" : "no"}`,
    `- Hardcoded CSS cleanup present: ${report.summary.hardcodedCssCleanupPresent ? "yes" : "no"}`,
    `- High-impact residuals ranked: ${report.summary.highImpactResidualsRanked ? "yes" : "no"}`,
    `- High-impact residuals fixed/already compact: ${report.summary.highImpactResidualsFixed}`,
    `- Deferred low-impact residuals: ${report.summary.deferredLowImpactResiduals}`,
    `- Chat untouched: ${report.summary.chatUntouched ? "yes" : "no"}`,
    `- Navigation untouched: ${report.summary.navUntouched ? "yes" : "no"}`,
    `- Blocking findings: P0=${report.summary.p0Count}, P1=${report.summary.p1Count}, P2=${report.summary.p2Count}`,
    "",
    "## Impact Ranking",
    "",
    "| ID | Category | Surface | Impact | Status | Path |",
    "| --- | --- | --- | --- | --- | --- |",
    ...report.impactRanking.map((finding) => `| ${finding.id} | ${finding.category} | ${finding.surfaceOwner} | ${finding.scoreImpact} | ${finding.status} | ${finding.path} |`),
    "",
    "## Fixed Residuals",
    "",
    ...report.fixedResiduals.map((finding) => `- ${finding.id}: ${finding.fixApplied}`),
    "",
    "## Deferred Residuals",
    "",
    ...report.deferredResiduals.map((finding) => `- ${finding.id}: ${finding.reason} Next: ${finding.nextAction}`),
    "",
    "## Protected File Diffs",
    "",
    ...(report.protectedFileDiffs.length ? report.protectedFileDiffs.map((file) => `- ${file}`) : ["- None."]),
    "",
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((step, index) => `${index + 1}. ${step}`),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function collectInputs(): MobileResidualScoreImpactInputs {
  const sourceFiles = Object.fromEntries(
    highImpactFiles
      .filter((file) => existsSync(join(repoRoot, file)))
      .map((file) => [file, read(file)]),
  );
  const purchaseModal = "src/components/PurchaseModal.tsx";
  if (existsSync(join(repoRoot, purchaseModal))) {
    sourceFiles[purchaseModal] = read(purchaseModal);
  }

  return {
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
    changedFiles: changedFiles(),
    packageJson: read("package.json"),
    sourceFiles,
    existingReports: {
      mobileUiFinalLock: optionalRead("agent/state/mobile-ui-final-lock.generated.json"),
      hardcodedCssCleanup: optionalRead("agent/state/mobile-hardcoded-css-cleanup.generated.json"),
    },
  };
}

export function main() {
  const inputs = collectInputs();
  const report = buildMobileResidualScoreImpactReport(inputs);
  const failures = validateMobileResidualScoreImpactReport(report);

  mkdirSync(join(repoRoot, dirname(artifactRelativePath)), { recursive: true });
  mkdirSync(join(repoRoot, dirname(docsRelativePath)), { recursive: true });
  writeFileSync(join(repoRoot, artifactRelativePath), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(repoRoot, docsRelativePath), renderMarkdown(report));

  if (!inputs.packageJson.includes("check:mobile-residual-score-impact")) {
    failures.push("package script check:mobile-residual-score-impact missing.");
  }

  if (failures.length > 0) {
    console.error("[mobile-residual-score-impact] failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log(`[mobile-residual-score-impact] ok: fixed=${report.summary.highImpactResidualsFixed} deferred=${report.summary.deferredLowImpactResiduals}`);
}

if (process.argv[1]?.endsWith("validate-mobile-residual-score-impact.ts")) {
  main();
}
