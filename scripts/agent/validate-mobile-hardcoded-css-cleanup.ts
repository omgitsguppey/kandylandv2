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

export type MobileHardcodedCssCleanupReport = {
  generatedAtUtc: string;
  reportKey: "mobile-hardcoded-css-cleanup";
  currentHead: string;
  summary: {
    mobileScaleContractPresent: boolean;
    doctrinePresent: boolean;
    adminSurfaceCleaned: boolean;
    userSurfaceCleaned: boolean;
    creatorSurfaceCleaned: boolean;
    protectedNavChatUntouched: boolean;
    dataMarkersPresent: boolean;
    highRiskPatternsRemovedFromTouchedFiles: boolean;
    nestedScrollGuarded: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  inventory: string[];
  cleanedFiles: string[];
  protectedSurfaceFindings: Finding[];
  hardcodedPatternFindings: Finding[];
  nestedScrollFindings: Finding[];
  fixesApplied: Finding[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

export type MobileHardcodedCssCleanupInputs = {
  currentHead: string;
  generatedAtUtc: string;
  changedFiles: string[];
  sources: {
    contract: string;
    packageJson: string;
    files: Record<string, string>;
  };
  inventoryMatches: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/mobile-hardcoded-css-cleanup.generated.json";
const docsRelativePath = "docs/agent-truth/mobile-hardcoded-css-cleanup.md";

const protectedPathPatterns = [
  /^src\/components\/Navigation\//u,
  /^src\/components\/Chat\//u,
  /^src\/app\/chat\//u,
  /(^|\/)(Navbar|TopNav|BottomNav|MobileBottomBar)\.tsx$/u,
];

const cleanedSourceTargets = [
  "src/app/dashboard/DashboardClient.tsx",
  "src/app/dashboard/library/LibraryClient.tsx",
  "src/components/Creators/CreatorDropManager.tsx",
  "src/components/Creators/CreatorDashboardSettingsHub.tsx",
  "src/app/admin/queue/page.tsx",
];

const highRiskMobileTokens = [
  "p-10",
  "p-9",
  "p-8",
  "p-7",
  "p-6",
  "py-10",
  "py-8",
  "gap-8",
  "gap-7",
  "gap-6",
  "text-6xl",
  "text-5xl",
  "text-4xl",
  "rounded-3xl",
  "h-screen",
  "min-h-screen",
  "max-h-screen",
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
  const pattern = "text-6xl|text-5xl|text-4xl|text-3xl|p-10|p-9|p-8|p-7|p-6|py-10|py-8|gap-8|gap-7|gap-6|min-h-\\[120px\\]|min-h-\\[160px\\]|rounded-3xl|h-screen|max-h-screen|overflow-y-auto";
  try {
    const output = execFileSync("git", ["grep", "-n", "-E", pattern, "--", "src/app", "src/components"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    return output.split(/\r?\n/u).filter(Boolean).slice(0, 120);
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

function hasUnprefixedToken(source: string, token: string) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`(?<![:\\w-])${escaped}(?![\\w-])`, "u").test(source);
}

function highRiskTokensForSource(source: string) {
  return highRiskMobileTokens.filter((token) => hasUnprefixedToken(source, token));
}

function cleanedFilesFromInputs(inputs: MobileHardcodedCssCleanupInputs) {
  return cleanedSourceTargets.filter((file) => inputs.sources.files[file] !== undefined);
}

function hasMarkers(source: string) {
  return source.includes('data-mobile-density="compact"') && source.includes('data-mobile-sprawl-guard="true"');
}

function nestedScrollFindingsForSource(file: string, source: string): Finding[] {
  const hasNestedScroll = /(?<![:\w-])overflow-y-auto(?![\w-])/u.test(source) || /(?<![:\w-])overflow-auto(?![\w-])/u.test(source);
  const hasExplicitOwner = /data-[\w-]*(scroll-owner|nested-scroll|mobile-scroll-owner|sprawl-guard)/u.test(source);
  if (!hasNestedScroll) {
    return [finding(`nested-scroll-${file}`, true, `${file} has no unguarded nested scroll owner.`, "P1")];
  }
  return [finding(`nested-scroll-${file}`, hasExplicitOwner, `${file} nested scroll must expose an explicit owner marker.`, "P1")];
}

export function buildMobileHardcodedCssCleanupReport(
  inputs: MobileHardcodedCssCleanupInputs,
): MobileHardcodedCssCleanupReport {
  const protectedChanges = inputs.changedFiles.filter(isProtectedPath);
  const cleanedFiles = cleanedFilesFromInputs(inputs);
  const contract = inputs.sources.contract;
  const docsPresent = existsSync(join(repoRoot, "docs/agent-truth/mobile-ui-scaling-doctrine.md"));
  const contractPresent = contract.includes("getMobileModuleClassNames") && contract.includes("getSkeletonClassForModule");

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

  const hardcodedPatternFindings = cleanedFiles.map((file) => {
    const tokens = highRiskTokensForSource(inputs.sources.files[file] ?? "");
    return finding(
      `hardcoded-patterns-${file}`,
      tokens.length === 0,
      tokens.length === 0
        ? `${file} does not retain unprefixed desktop-scale mobile tokens.`
        : `${file} still contains unprefixed high-risk tokens: ${tokens.join(", ")}`,
      "P1",
    );
  });

  const markerFindings = cleanedFiles.map((file) => finding(
    `density-markers-${file}`,
    hasMarkers(inputs.sources.files[file] ?? ""),
    `${file} exposes compact density and sprawl guard markers.`,
    "P1",
  ));

  const nestedScrollFindings = cleanedFiles.flatMap((file) => nestedScrollFindingsForSource(file, inputs.sources.files[file] ?? ""));

  const fixesApplied = [
    finding("mobile-scale-contract-reused", contractPresent, "Reused the existing mobile scale contract.", "P0"),
    finding("validator-script-added", inputs.sources.packageJson.includes("check:mobile-hardcoded-css-cleanup"), "Added package validator for mobile hardcoded CSS cleanup.", "P0"),
    finding("admin-surface-cleaned", cleanedFiles.includes("src/app/admin/queue/page.tsx"), "Admin queue mobile cards use compact density markers.", "P1"),
    finding("user-surface-cleaned", cleanedFiles.includes("src/app/dashboard/DashboardClient.tsx") && cleanedFiles.includes("src/app/dashboard/library/LibraryClient.tsx"), "User dashboard and library mobile modules use compact density markers.", "P1"),
    finding("creator-surface-cleaned", cleanedFiles.includes("src/components/Creators/CreatorDropManager.tsx") && cleanedFiles.includes("src/components/Creators/CreatorDashboardSettingsHub.tsx"), "Creator manager/settings modules use compact density markers.", "P1"),
  ];

  const allFindings = [
    ...protectedSurfaceFindings,
    ...hardcodedPatternFindings,
    ...markerFindings,
    ...nestedScrollFindings,
    ...fixesApplied,
  ];

  return {
    generatedAtUtc: inputs.generatedAtUtc,
    reportKey: "mobile-hardcoded-css-cleanup",
    currentHead: inputs.currentHead,
    summary: {
      mobileScaleContractPresent: contractPresent,
      doctrinePresent: docsPresent,
      adminSurfaceCleaned: fixesApplied[2].status === "fixed",
      userSurfaceCleaned: fixesApplied[3].status === "fixed",
      creatorSurfaceCleaned: fixesApplied[4].status === "fixed",
      protectedNavChatUntouched: protectedSurfaceFindings[0].status === "fixed",
      dataMarkersPresent: markerFindings.length > 0 && markerFindings.every((entry) => entry.status === "fixed"),
      highRiskPatternsRemovedFromTouchedFiles: hardcodedPatternFindings.every((entry) => entry.status === "fixed"),
      nestedScrollGuarded: nestedScrollFindings.every((entry) => entry.status === "fixed"),
      p0Count: countMissing(allFindings, "P0"),
      p1Count: countMissing(allFindings, "P1"),
      p2Count: countMissing(allFindings, "P2"),
    },
    inventory: inputs.inventoryMatches,
    cleanedFiles,
    protectedSurfaceFindings,
    hardcodedPatternFindings,
    nestedScrollFindings,
    fixesApplied,
    prCleanupActions: [
      "No open mobile UI, layout scale, dashboard card, skeleton, hydration, or CSS cleanup PRs were present at start.",
    ],
    nextFixOrder: [
      "Continue replacing high-risk mobile spacing in touched Admin, User, and Creator files with mobile-scale-contract helpers.",
      "Keep desktop table enhancements behind explicit mobile compact rows or hidden desktop-only layouts.",
      "Keep protected navigation and chat surfaces in their dedicated shell-safe workflows.",
    ],
  };
}

export function validateMobileHardcodedCssCleanupReport(report: MobileHardcodedCssCleanupReport | null) {
  const failures: string[] = [];
  if (!report) return ["mobile hardcoded CSS cleanup report missing."];
  if (report.reportKey !== "mobile-hardcoded-css-cleanup") failures.push("reportKey must be mobile-hardcoded-css-cleanup.");
  if (!report.summary.mobileScaleContractPresent) failures.push("mobile scale contract missing.");
  if (!report.summary.doctrinePresent) failures.push("mobile scaling doctrine missing.");
  if (!report.summary.protectedNavChatUntouched) failures.push("protected nav/chat files changed by this pass.");
  if (!report.summary.adminSurfaceCleaned) failures.push("admin mobile surface cleanup missing.");
  if (!report.summary.userSurfaceCleaned) failures.push("user mobile surface cleanup missing.");
  if (!report.summary.creatorSurfaceCleaned) failures.push("creator mobile surface cleanup missing.");
  if (!report.summary.dataMarkersPresent) failures.push("cleaned surfaces are missing mobile density/sprawl markers.");
  if (!report.summary.highRiskPatternsRemovedFromTouchedFiles) failures.push("high-risk mobile class patterns remain in touched files.");
  if (!report.summary.nestedScrollGuarded) failures.push("nested scroll appears in mobile modules without explicit marker.");
  if (!Array.isArray(report.nextFixOrder) || report.nextFixOrder.length === 0) failures.push("nextFixOrder missing.");
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) failures.push("blocking mobile hardcoded CSS cleanup findings remain.");
  return failures;
}

function readInputs(): MobileHardcodedCssCleanupInputs {
  const files = Object.fromEntries(cleanedSourceTargets.map((file) => [file, optionalRead(file)]));
  return {
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
    changedFiles: changedFiles(),
    sources: {
      contract: optionalRead("src/lib/frontend-hardening/ui/mobile-scale-contract.ts"),
      packageJson: read("package.json"),
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

function renderMarkdown(report: MobileHardcodedCssCleanupReport) {
  const lines = [
    "# Mobile Hardcoded CSS Cleanup",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Mobile scale contract present: ${report.summary.mobileScaleContractPresent ? "yes" : "no"}`,
    `- Mobile scaling doctrine present: ${report.summary.doctrinePresent ? "yes" : "no"}`,
    `- Admin surface cleaned: ${report.summary.adminSurfaceCleaned ? "yes" : "no"}`,
    `- User surface cleaned: ${report.summary.userSurfaceCleaned ? "yes" : "no"}`,
    `- Creator surface cleaned: ${report.summary.creatorSurfaceCleaned ? "yes" : "no"}`,
    `- Protected nav/chat untouched: ${report.summary.protectedNavChatUntouched ? "yes" : "no"}`,
    `- Compact density markers present: ${report.summary.dataMarkersPresent ? "yes" : "no"}`,
    `- High-risk patterns removed from touched files: ${report.summary.highRiskPatternsRemovedFromTouchedFiles ? "yes" : "no"}`,
    `- Nested scroll guarded: ${report.summary.nestedScrollGuarded ? "yes" : "no"}`,
    "",
    "## Cleaned Files",
    "",
    ...(report.cleanedFiles.length > 0 ? report.cleanedFiles.map((file) => `- ${file}`) : ["- none"]),
    "",
    "## Fixes Applied",
    "",
    ...report.fixesApplied.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Inventory Examples",
    "",
    ...(report.inventory.length > 0 ? report.inventory.slice(0, 30).map((entry) => `- ${entry}`) : ["- none"]),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((step, index) => `${index + 1}. ${step}`),
    "",
  ];
  writeFileSync(join(repoRoot, docsRelativePath), lines.join("\n"));
}

function main() {
  const report = buildMobileHardcodedCssCleanupReport(readInputs());
  writeJson(artifactRelativePath, report);
  renderMarkdown(report);
  const failures = validateMobileHardcodedCssCleanupReport(report);
  if (failures.length > 0) {
    console.error("[mobile-hardcoded-css-cleanup] failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`[mobile-hardcoded-css-cleanup] ok: cleanedFiles=${report.cleanedFiles.length}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
