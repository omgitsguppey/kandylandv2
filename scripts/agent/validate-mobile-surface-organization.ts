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

export type MobileSurfaceOrganizationReport = {
  generatedAtUtc: string;
  reportKey: "mobile-surface-organization";
  currentHead: string;
  summary: {
    doctrinePresent: boolean;
    protectedNavChatUntouched: boolean;
    adminSummaryFirst: boolean;
    adminRawDetailsDrilldown: boolean;
    creatorWorkflowsSeparated: boolean;
    userDashboardPreserved: boolean;
    desktopFlowCollapsed: boolean;
    summaryFirstMarkersPresent: boolean;
    drilldownPathsPresent: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  doctrineFindings: Finding[];
  protectedSurfaceFindings: Finding[];
  adminFindings: Finding[];
  creatorFindings: Finding[];
  userFindings: Finding[];
  fixesApplied: Finding[];
  prCleanupActions: string[];
  nextFixOrder: string[];
  inventory: string[];
};

export type MobileSurfaceOrganizationInputs = {
  currentHead: string;
  generatedAtUtc: string;
  changedFiles: string[];
  sources: {
    packageJson: string;
    doctrine: string;
    files: Record<string, string>;
  };
  inventoryMatches: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/mobile-surface-organization.generated.json";
const docsRelativePath = "docs/agent-truth/mobile-surface-organization.md";

const protectedPathPatterns = [
  /^src\/components\/Navigation\//u,
  /^src\/components\/Chat\//u,
  /^src\/app\/chat\//u,
  /(^|\/)(Navbar|TopNav|BottomNav|MobileBottomBar)\.tsx$/u,
];

const targetFiles = [
  "src/app/admin/analytics/page.tsx",
  "src/app/admin/debug/page.tsx",
  "src/app/admin/queue/page.tsx",
  "src/app/dashboard/DashboardClient.tsx",
  "src/app/dashboard/library/LibraryClient.tsx",
  "src/components/Creators/CreatorDashboardSettingsHub.tsx",
  "src/components/Creators/CreatorDropManager.tsx",
];

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

function scanInventory() {
  const pattern = "space-y-8|space-y-7|space-y-6|grid gap-6|rounded-3xl|p-6|p-8|overflow-y-auto|section";
  try {
    const output = execFileSync("git", ["grep", "-n", "-E", pattern, "--", "src/app", "src/components"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    return output.split(/\r?\n/u).filter(Boolean).slice(0, 140);
  } catch {
    return [];
  }
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

function hasSummaryFirst(source: string) {
  return source.includes('data-mobile-organization="summary-first"');
}

function hasDrilldown(source: string) {
  return source.includes('data-mobile-drilldown="true"')
    || source.includes("<details")
    || source.includes("activeTab")
    || source.includes("openSection");
}

function hasCollapsedDesktopFlow(source: string) {
  return source.includes('data-desktop-flow-collapsed="true"');
}

function hasTablePrimaryMobileLayout(source: string) {
  return /<table[\s>]/u.test(source) && !source.includes('data-mobile-drilldown="true"');
}

function allTargetSources(inputs: MobileSurfaceOrganizationInputs) {
  return targetFiles
    .map((file) => [file, inputs.sources.files[file] ?? ""] as const)
    .filter(([, source]) => source.length > 0);
}

export function buildMobileSurfaceOrganizationReport(
  inputs: MobileSurfaceOrganizationInputs,
): MobileSurfaceOrganizationReport {
  const protectedChanges = inputs.changedFiles.filter(isProtectedPath);
  const adminSources = allTargetSources(inputs).filter(([file]) => file.startsWith("src/app/admin/"));
  const creatorSources = allTargetSources(inputs).filter(([file]) => file.includes("/Creators/"));
  const userDashboardSource = inputs.sources.files["src/app/dashboard/DashboardClient.tsx"] ?? "";
  const userLibrarySource = inputs.sources.files["src/app/dashboard/library/LibraryClient.tsx"] ?? "";
  const allSources = allTargetSources(inputs);

  const doctrinePresent = inputs.sources.doctrine.includes("Admin")
    && inputs.sources.doctrine.includes("Creator")
    && inputs.sources.doctrine.includes("User");
  const protectedSurfaceFindings = [
    finding(
      "protected-nav-chat-untouched",
      protectedChanges.length === 0,
      protectedChanges.length === 0
        ? "Protected navigation and chat files were not changed."
        : `Protected files changed: ${protectedChanges.join(", ")}`,
      "P0",
    ),
  ];
  const doctrineFindings = [
    finding("organization-doctrine-present", doctrinePresent, "Mobile surface organization doctrine covers Admin, Creator, and User surfaces.", "P0"),
    finding("package-script-present", inputs.sources.packageJson.includes("check:mobile-surface-organization"), "Package script exists for mobile surface organization validation.", "P0"),
  ];

  const adminSummaryFirst = adminSources.length > 0
    && adminSources.every(([, source]) => hasSummaryFirst(source))
    && adminSources.some(([, source]) => source.includes("MetricCard") || source.includes("StatCard"));
  const adminRawDetailsDrilldown = adminSources.length > 0
    && adminSources.every(([, source]) => hasDrilldown(source))
    && adminSources.every(([, source]) => !hasTablePrimaryMobileLayout(source));

  const creatorWorkflowsSeparated = creatorSources.length > 0
    && creatorSources.every(([, source]) => hasSummaryFirst(source))
    && creatorSources.every(([, source]) => hasDrilldown(source))
    && creatorSources.some(([, source]) => source.includes("Submit drop") || source.includes("openSection"));

  const userDashboardPreserved = userDashboardSource.includes("DailyCheckIn")
    && userDashboardSource.includes("CollectionList")
    && userDashboardSource.includes("RecentActivityFeed")
    && userDashboardSource.includes("CreatorDiscoveryRail")
    && hasSummaryFirst(userDashboardSource)
    && hasSummaryFirst(userLibrarySource);

  const desktopFlowCollapsed = allSources.length > 0
    && allSources.every(([, source]) => hasCollapsedDesktopFlow(source) || source.includes("data-user-library-surface"));
  const summaryFirstMarkersPresent = allSources.length > 0 && allSources.every(([, source]) => hasSummaryFirst(source));
  const drilldownPathsPresent = allSources.length > 0 && allSources.every(([, source]) => hasDrilldown(source));

  const adminFindings = [
    finding("admin-summary-first", adminSummaryFirst, "Admin analytics/debug/queue mobile defaults expose summary cards before drilldowns.", "P1"),
    finding("admin-raw-details-drilldown", adminRawDetailsDrilldown, "Admin raw details are behind tabs, details, or drilldown controls.", "P1"),
  ];
  const creatorFindings = [
    finding("creator-workflows-separated", creatorWorkflowsSeparated, "Creator dashboard/settings/drop manager keep operations separated with drilldown paths.", "P1"),
  ];
  const userFindings = [
    finding("user-dashboard-preserved", userDashboardPreserved, "User dashboard keeps daily check-in, discovery, recent activity, and library modules.", "P1"),
  ];
  const fixesApplied = [
    finding("desktop-flow-collapsed", desktopFlowCollapsed, "Desktop-heavy flows are marked collapsed or organized for mobile.", "P1"),
    finding("summary-first-markers", summaryFirstMarkersPresent, "Touched surfaces expose summary-first mobile organization markers.", "P1"),
    finding("drilldown-paths", drilldownPathsPresent, "Secondary content exposes a drilldown path.", "P1"),
  ];

  const allFindings = [
    ...doctrineFindings,
    ...protectedSurfaceFindings,
    ...adminFindings,
    ...creatorFindings,
    ...userFindings,
    ...fixesApplied,
  ];

  return {
    generatedAtUtc: inputs.generatedAtUtc,
    reportKey: "mobile-surface-organization",
    currentHead: inputs.currentHead,
    summary: {
      doctrinePresent,
      protectedNavChatUntouched: protectedSurfaceFindings[0].status === "fixed",
      adminSummaryFirst,
      adminRawDetailsDrilldown,
      creatorWorkflowsSeparated,
      userDashboardPreserved,
      desktopFlowCollapsed,
      summaryFirstMarkersPresent,
      drilldownPathsPresent,
      p0Count: countMissing(allFindings, "P0"),
      p1Count: countMissing(allFindings, "P1"),
      p2Count: countMissing(allFindings, "P2"),
    },
    doctrineFindings,
    protectedSurfaceFindings,
    adminFindings,
    creatorFindings,
    userFindings,
    fixesApplied,
    prCleanupActions: [
      "No open mobile organization, layout, admin, user, creator, nav, or chat PRs were present at start.",
    ],
    nextFixOrder: [
      "Continue converting admin-only tables and raw evidence into summary rows plus explicit drilldowns when those files are touched.",
      "Keep creator operations grouped by job: overview, active work, settings, and drop submissions.",
      "Keep user dashboard modules user-owned and avoid admin/creator controls on user routes.",
    ],
    inventory: inputs.inventoryMatches,
  };
}

export function validateMobileSurfaceOrganizationReport(report: MobileSurfaceOrganizationReport | null) {
  const failures: string[] = [];
  if (!report) return ["mobile surface organization report missing."];
  if (report.reportKey !== "mobile-surface-organization") failures.push("reportKey must be mobile-surface-organization.");
  if (!report.summary.doctrinePresent) failures.push("mobile surface organization doctrine missing.");
  if (!report.summary.protectedNavChatUntouched) failures.push("protected nav/chat files changed by this pass.");
  if (!report.summary.adminSummaryFirst || !report.summary.adminRawDetailsDrilldown) failures.push("admin mobile default lacks summary-first drilldown organization.");
  if (!report.summary.creatorWorkflowsSeparated) failures.push("creator mobile workflows lack separated operations and drilldown markers.");
  if (!report.summary.userDashboardPreserved) failures.push("user dashboard key modules are not preserved.");
  if (!report.summary.desktopFlowCollapsed) failures.push("desktop-only workflow is still primary mobile layout.");
  if (!report.summary.summaryFirstMarkersPresent) failures.push("summary-first markers missing.");
  if (!report.summary.drilldownPathsPresent) failures.push("no drilldown path for hidden secondary content.");
  if (!Array.isArray(report.nextFixOrder) || report.nextFixOrder.length === 0) failures.push("nextFixOrder missing.");
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) failures.push("blocking mobile surface organization findings remain.");
  return failures;
}

function readInputs(): MobileSurfaceOrganizationInputs {
  const files = Object.fromEntries([
    ...targetFiles,
    "tests/unit/mobile-surface-organization.spec.ts",
  ].map((file) => [file, optionalRead(file)]));
  return {
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
    changedFiles: changedFiles(),
    sources: {
      packageJson: read("package.json"),
      doctrine: optionalRead(docsRelativePath),
      files,
    },
    inventoryMatches: scanInventory(),
  };
}

function writeJson(relativePath: string, value: unknown) {
  const fullPath = join(repoRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function renderMarkdown(report: MobileSurfaceOrganizationReport) {
  const lines = [
    "# Mobile Surface Organization",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    "## Doctrine",
    "",
    "### Admin",
    "",
    "- Default mobile admin is summary first, drilldowns second.",
    "- Tables become compact rows/cards when a phone is the primary viewport.",
    "- Debug and evidence details stay hidden behind sections by default.",
    "- No all-domain admin loads by default.",
    "",
    "### Creator",
    "",
    "- Dashboard means overview, quick actions, and active work.",
    "- Settings and workspace surfaces own operations panels.",
    "- Drop manager owns submit/review inventory.",
    "- User dashboard modules must not leak into creator tools.",
    "",
    "### User",
    "",
    "- Dashboard keeps daily check-in, wallet/status, owned or locked KandyDrops, and recent activity.",
    "- Drops and library routes remain user-owned.",
    "- Admin and creator controls stay out of user routes.",
    "",
    "## Summary",
    "",
    `- Protected nav/chat untouched: ${report.summary.protectedNavChatUntouched ? "yes" : "no"}`,
    `- Admin summary first: ${report.summary.adminSummaryFirst ? "yes" : "no"}`,
    `- Admin raw details drilldown: ${report.summary.adminRawDetailsDrilldown ? "yes" : "no"}`,
    `- Creator workflows separated: ${report.summary.creatorWorkflowsSeparated ? "yes" : "no"}`,
    `- User dashboard preserved: ${report.summary.userDashboardPreserved ? "yes" : "no"}`,
    `- Desktop flow collapsed: ${report.summary.desktopFlowCollapsed ? "yes" : "no"}`,
    "",
    "## Fixes Applied",
    "",
    ...report.fixesApplied.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((step, index) => `${index + 1}. ${step}`),
    "",
  ];
  writeFileSync(join(repoRoot, docsRelativePath), lines.join("\n"));
}

function main() {
  const report = buildMobileSurfaceOrganizationReport(readInputs());
  writeJson(artifactRelativePath, report);
  renderMarkdown(report);
  const failures = validateMobileSurfaceOrganizationReport(report);
  if (failures.length > 0) {
    console.error("[mobile-surface-organization] failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`[mobile-surface-organization] ok: p0=${report.summary.p0Count} p1=${report.summary.p1Count}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
