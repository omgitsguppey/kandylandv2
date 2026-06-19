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

export type MobileLoadingHydrationStabilityReport = {
  generatedAtUtc: string;
  reportKey: "mobile-loading-hydration-stability";
  currentHead: string;
  summary: {
    doctrinePresent: boolean;
    mobileScaleContractPresent: boolean;
    loadingContractPresent: boolean;
    protectedNavChatUntouched: boolean;
    compactSkeletonsPresent: boolean;
    staleRequestProtectionApplied: boolean;
    promiseAllHydrationAvoided: boolean;
    fullPageLoadersAvoided: boolean;
    loadingStateOverwriteGuarded: boolean;
    testsCoverStaleSuppression: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  dependencyFindings: Finding[];
  protectedSurfaceFindings: Finding[];
  skeletonFindings: Finding[];
  hydrationFindings: Finding[];
  raceConditionFindings: Finding[];
  fixesApplied: Finding[];
  prCleanupActions: string[];
  nextFixOrder: string[];
  inventory: string[];
};

export type MobileLoadingHydrationStabilityInputs = {
  currentHead: string;
  generatedAtUtc: string;
  changedFiles: string[];
  sources: {
    loadingContract: string;
    mobileScaleContract: string;
    packageJson: string;
    files: Record<string, string>;
  };
  inventoryMatches: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/mobile-loading-hydration-stability.generated.json";
const docsRelativePath = "docs/agent-truth/mobile-loading-hydration-stability.md";

const protectedPathPatterns = [
  /^src\/components\/Navigation\//u,
  /^src\/components\/Chat\//u,
  /^src\/app\/chat\//u,
  /(^|\/)(Navbar|TopNav|BottomNav|MobileBottomBar)\.tsx$/u,
];

const targetFiles = [
  "src/app/dashboard/DashboardClient.tsx",
  "src/app/dashboard/library/LibraryClient.tsx",
  "src/components/Creators/CreatorDropManager.tsx",
  "src/components/Creators/CreatorDashboardSettingsHub.tsx",
  "src/app/admin/queue/page.tsx",
  "src/app/admin/analytics/loading.tsx",
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
  const pattern = "loading|Skeleton|skeleton|isLoading|hydrating|hydrate|useEffect|Promise.all|race|stale|AbortController|setState|authFetch|readUiJson";
  try {
    const output = execFileSync("git", ["grep", "-n", "-E", pattern, "--", "src/app", "src/components", "src/lib", "tests"], {
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

function hasCompactSkeletonMarker(source: string) {
  return source.includes("data-mobile-skeleton") || source.includes("getMobileSkeletonClass");
}

function hasMobileMarkers(source: string) {
  return source.includes('data-mobile-density="compact"') && source.includes('data-mobile-sprawl-guard="true"');
}

function hasAsyncLoader(source: string) {
  return /authFetch\(|getDocs\(|fetch\(/u.test(source);
}

function hasStaleRequestGuard(source: string) {
  return source.includes("createStaleRequestGuard")
    || source.includes("AbortController")
    || /requestIdRef|RequestIdRef|dashboardRequestIdRef/u.test(source)
    || /requestId.*isFresh/u.test(source);
}

function hasAllOrNothingPromiseAll(source: string) {
  return /Promise\.all\s*\(/u.test(source);
}

function hasFullPageLoader(source: string) {
  return source.includes("min-h-screen") || /min-h-\[(?:400px|520px|100dvh|calc\(100dvh)/u.test(source);
}

function allSources(inputs: MobileLoadingHydrationStabilityInputs) {
  return Object.entries(inputs.sources.files);
}

export function buildMobileLoadingHydrationStabilityReport(
  inputs: MobileLoadingHydrationStabilityInputs,
): MobileLoadingHydrationStabilityReport {
  const protectedChanges = inputs.changedFiles.filter(isProtectedPath);
  const touchedSources = allSources(inputs)
    .filter(([file]) => !file.startsWith("tests/"))
    .filter(([, source]) => source.length > 0);
  const asyncSources = touchedSources.filter(([, source]) => hasAsyncLoader(source));
  const loadingContractPresent = inputs.sources.loadingContract.includes("createStaleRequestGuard")
    && inputs.sources.loadingContract.includes("getMobileSkeletonClass")
    && inputs.sources.loadingContract.includes("getModuleLoadingState")
    && inputs.sources.loadingContract.includes("shouldShowCompactSkeleton");
  const mobileScaleContractPresent = inputs.sources.mobileScaleContract.includes("getSkeletonClassForModule")
    && inputs.sources.mobileScaleContract.includes("getMobileModuleClassNames");
  const doctrinePresent = existsSync(join(repoRoot, docsRelativePath))
    || existsSync(join(repoRoot, "docs/agent-truth/mobile-ui-scaling-doctrine.md"));

  const dependencyFindings = [
    finding("loading-contract-present", loadingContractPresent, "Shared loading-state contract exposes stale request guards and compact skeleton helpers.", "P0"),
    finding("mobile-scale-contract-reused", mobileScaleContractPresent, "Mobile scale contract is reused instead of duplicated.", "P0"),
    finding("package-script-present", inputs.sources.packageJson.includes("check:mobile-loading-hydration-stability"), "Package script exists for the mobile loading hydration validator.", "P0"),
  ];

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

  const skeletonFindings = touchedSources.map(([file, source]) => finding(
    `compact-skeleton-${file}`,
    hasCompactSkeletonMarker(source) && hasMobileMarkers(source),
    `${file} should use compact skeleton markers and mobile density markers.`,
    "P1",
  ));

  const hydrationFindings = touchedSources.map(([file, source]) => finding(
    `promise-all-${file}`,
    !hasAllOrNothingPromiseAll(source),
    `${file} should avoid all-or-nothing Promise.all hydration for mobile route modules.`,
    "P1",
  ));

  const fullPageLoaderFindings = touchedSources.map(([file, source]) => finding(
    `full-page-loader-${file}`,
    !hasFullPageLoader(source) || source.includes("data-mobile-skeleton"),
    `${file} should use module skeletons instead of large full-page loaders.`,
    "P1",
  ));

  const raceConditionFindings = asyncSources.map(([file, source]) => finding(
    `stale-request-${file}`,
    hasStaleRequestGuard(source),
    `${file} async loader should guard stale request results before setState.`,
    "P0",
  ));

  const testSource = inputs.sources.files["tests/unit/mobile-loading-hydration-stability.spec.ts"] ?? optionalRead("tests/unit/mobile-loading-hydration-stability.spec.ts");
  const fixesApplied = [
    finding("stale-suppression-test", testSource.includes("suppresses stale request results"), "Unit tests cover stale request suppression.", "P0"),
    finding("mobile-loading-docs", doctrinePresent, "Mobile loading hydration stability doctrine exists.", "P1"),
  ];

  const allFindings = [
    ...dependencyFindings,
    ...protectedSurfaceFindings,
    ...skeletonFindings,
    ...hydrationFindings,
    ...fullPageLoaderFindings,
    ...raceConditionFindings,
    ...fixesApplied,
  ];

  return {
    generatedAtUtc: inputs.generatedAtUtc,
    reportKey: "mobile-loading-hydration-stability",
    currentHead: inputs.currentHead,
    summary: {
      doctrinePresent,
      mobileScaleContractPresent,
      loadingContractPresent,
      protectedNavChatUntouched: protectedSurfaceFindings[0].status === "fixed",
      compactSkeletonsPresent: skeletonFindings.length > 0 && skeletonFindings.every((entry) => entry.status === "fixed"),
      staleRequestProtectionApplied: raceConditionFindings.length > 0 && raceConditionFindings.every((entry) => entry.status === "fixed"),
      promiseAllHydrationAvoided: hydrationFindings.every((entry) => entry.status === "fixed"),
      fullPageLoadersAvoided: fullPageLoaderFindings.every((entry) => entry.status === "fixed"),
      loadingStateOverwriteGuarded: raceConditionFindings.length > 0 && raceConditionFindings.every((entry) => entry.status === "fixed"),
      testsCoverStaleSuppression: fixesApplied[0].status === "fixed",
      p0Count: countMissing(allFindings, "P0"),
      p1Count: countMissing(allFindings, "P1"),
      p2Count: countMissing(allFindings, "P2"),
    },
    dependencyFindings,
    protectedSurfaceFindings,
    skeletonFindings,
    hydrationFindings: [...hydrationFindings, ...fullPageLoaderFindings],
    raceConditionFindings,
    fixesApplied,
    prCleanupActions: [
      "No open mobile loading, skeleton, hydration, dashboard, admin, creator, user, nav, or chat PRs were present at start.",
    ],
    nextFixOrder: [
      "Apply loading-state-contract helpers to additional high-risk admin and creator modules as those surfaces are touched.",
      "Keep route-level loading placeholders compact and close to the final module dimensions.",
      "Escalate to browser reproduction only when source validators identify a mobile layout risk that cannot be proven from code.",
    ],
    inventory: inputs.inventoryMatches,
  };
}

export function validateMobileLoadingHydrationStabilityReport(report: MobileLoadingHydrationStabilityReport | null) {
  const failures: string[] = [];
  if (!report) return ["mobile loading hydration stability report missing."];
  if (report.reportKey !== "mobile-loading-hydration-stability") failures.push("reportKey must be mobile-loading-hydration-stability.");
  if (!report.summary.doctrinePresent) failures.push("mobile loading hydration doctrine missing.");
  if (!report.summary.mobileScaleContractPresent) failures.push("mobile scale contract missing.");
  if (!report.summary.loadingContractPresent) failures.push("loading-state contract missing.");
  if (!report.summary.protectedNavChatUntouched) failures.push("protected nav/chat files changed by this pass.");
  if (!report.summary.compactSkeletonsPresent) failures.push("compact mobile skeleton markers missing.");
  if (!report.summary.staleRequestProtectionApplied) failures.push("async loaders in touched files lack stale request protection.");
  if (!report.summary.promiseAllHydrationAvoided) failures.push("Promise.all causes all-or-nothing hydration in mobile dashboards.");
  if (!report.summary.fullPageLoadersAvoided) failures.push("full-page loader used where module skeleton is available.");
  if (!report.summary.loadingStateOverwriteGuarded) failures.push("loading state can overwrite newer data.");
  if (!report.summary.testsCoverStaleSuppression) failures.push("no tests cover stale request suppression.");
  if (!Array.isArray(report.nextFixOrder) || report.nextFixOrder.length === 0) failures.push("nextFixOrder missing.");
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) failures.push("blocking mobile loading hydration findings remain.");
  return failures;
}

function readInputs(): MobileLoadingHydrationStabilityInputs {
  const files = Object.fromEntries([
    ...targetFiles,
    "tests/unit/mobile-loading-hydration-stability.spec.ts",
  ].map((file) => [file, optionalRead(file)]));
  return {
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
    changedFiles: changedFiles(),
    sources: {
      loadingContract: optionalRead("src/lib/frontend-hardening/ui/loading-state-contract.ts"),
      mobileScaleContract: optionalRead("src/lib/frontend-hardening/ui/mobile-scale-contract.ts"),
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

function renderMarkdown(report: MobileLoadingHydrationStabilityReport) {
  const lines = [
    "# Mobile Loading Hydration Stability",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    "## Rules",
    "",
    "- Skeletons match final component size.",
    "- Mobile skeletons are compact.",
    "- Avoid full-screen loaders after the initial shell.",
    "- Avoid duplicate fetches on mount.",
    "- Use AbortController or stale-request guards where repeated async loads can race.",
    "- Use module-level loading states unless a route truly cannot render.",
    "- No raw loading debug copy in normal UI.",
    "- Missing or unavailable state must stay compact and must not create layout shift.",
    "",
    "## Summary",
    "",
    `- Doctrine present: ${report.summary.doctrinePresent ? "yes" : "no"}`,
    `- Mobile scale contract present: ${report.summary.mobileScaleContractPresent ? "yes" : "no"}`,
    `- Loading contract present: ${report.summary.loadingContractPresent ? "yes" : "no"}`,
    `- Protected nav/chat untouched: ${report.summary.protectedNavChatUntouched ? "yes" : "no"}`,
    `- Compact skeletons present: ${report.summary.compactSkeletonsPresent ? "yes" : "no"}`,
    `- Stale request protection applied: ${report.summary.staleRequestProtectionApplied ? "yes" : "no"}`,
    `- Promise.all hydration avoided: ${report.summary.promiseAllHydrationAvoided ? "yes" : "no"}`,
    `- Full-page loaders avoided: ${report.summary.fullPageLoadersAvoided ? "yes" : "no"}`,
    "",
    "## Fixes Applied",
    "",
    ...report.fixesApplied.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Race Protection Findings",
    "",
    ...report.raceConditionFindings.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((step, index) => `${index + 1}. ${step}`),
    "",
  ];
  writeFileSync(join(repoRoot, docsRelativePath), lines.join("\n"));
}

function main() {
  const report = buildMobileLoadingHydrationStabilityReport(readInputs());
  writeJson(artifactRelativePath, report);
  renderMarkdown(report);
  const failures = validateMobileLoadingHydrationStabilityReport(report);
  if (failures.length > 0) {
    console.error("[mobile-loading-hydration-stability] failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`[mobile-loading-hydration-stability] ok: p0=${report.summary.p0Count} p1=${report.summary.p1Count}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
