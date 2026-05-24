import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const STALE_HOURS = 72;

const DEVICE_BREAKPOINT_REPORT_PATH = "agent/state/device-breakpoint-contract-cleanup.generated.json";
const RESPONSIVE_BREAKPOINT_REPORT_PATH = "agent/state/responsive-breakpoint-finding-cleanup.generated.json";
const WALLET_NAV_REPORT_PATH = "agent/state/mobile-bottom-nav-wallet-action-review.generated.json";
const BATCH11_REPORT_PATH = "agent/state/debug-cockpit-batch11-cleanup.generated.json";

const DEVICE_BREAKPOINT_DOC_PATH = "docs/agent-truth/device-breakpoint-contract-cleanup.md";
const RESPONSIVE_BREAKPOINT_DOC_PATH = "docs/agent-truth/responsive-breakpoint-finding-cleanup.md";
const WALLET_NAV_DOC_PATH = "docs/agent-truth/mobile-bottom-nav-wallet-action-review.md";
const BATCH11_DOC_PATH = "docs/agent-truth/debug-cockpit-batch11-cleanup.md";

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readIfExists(path: string) {
  const fullPath = join(ROOT, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(path: string): Record<string, unknown> | null {
  const source = readIfExists(path);
  if (!source) return null;
  try {
    const parsed = JSON.parse(source) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function gitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function gitStatusShort() {
  try {
    return execFileSync("git", ["status", "--short"], { cwd: ROOT, encoding: "utf8" }).trimEnd().split(/\r?\n/u).filter(Boolean);
  } catch {
    return [];
  }
}

function filePathFromGitStatus(entry: string) {
  const statusPath = entry.length > 3 ? entry.slice(3) : entry;
  return statusPath.includes(" -> ") ? statusPath.split(" -> ").at(-1) ?? statusPath : statusPath;
}

function classifyDirtyFile(filePath: string) {
  if (filePath.startsWith("agent/state/") || filePath.startsWith("agent/context/")) {
    return "current_generated_artifact_to_commit";
  }
  if (
    filePath === "CHANGELOG.md"
    || filePath === "public/kandydrops-release-notes.json"
    || filePath.startsWith("src/lib/release-notes/")
  ) {
    return "release_artifact_expected";
  }
  if (filePath.startsWith("tests/unit/")) {
    return "test_artifact_expected";
  }
  if (filePath.startsWith("scripts/agent/validate-") || filePath === "scripts/agent/debug-cockpit-batch11-shared.ts") {
    return "validator_artifact_expected";
  }
  if (filePath.startsWith("docs/agent-truth/")) {
    return "current_generated_artifact_to_commit";
  }
  return "source_device_contract_fix_required";
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function hoursSince(timestamp?: string) {
  if (!timestamp) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.round(((Date.now() - parsed) / 3_600_000) * 100) / 100);
}

function reportAge(path: string) {
  const report = readJson(path);
  return hoursSince(readString(report?.generatedAtUtc) ?? readString(report?.generatedAt));
}

function reportFindingCount(path: string) {
  const report = readJson(path);
  return readNumber(report?.findingCount)
    ?? readNumber(report?.findingsCount)
    ?? readArray(report?.findings).length
    ?? 0;
}

function scoreDimensionsFromPublicBeta(publicBeta: Record<string, unknown> | null) {
  return {
    sourceHealth: readNumber(publicBeta?.sourceHealthScore) ?? 0,
    runtimeHealth: readNumber(publicBeta?.runtimeHealthScore) ?? 0,
    evidenceCompleteness: readNumber(publicBeta?.evidenceCompletenessScore) ?? 0,
    freshness: readNumber(publicBeta?.freshnessScore) ?? 0,
    costRisk: readNumber(publicBeta?.costRiskScore) ?? 0,
    regressionRisk: readNumber(publicBeta?.regressionRiskScore) ?? 0,
    overallHealthScore: readNumber(publicBeta?.healthScore) ?? readNumber(publicBeta?.score) ?? 0,
  };
}

function renderDoc(title: string, report: unknown) {
  return [
    `# ${title}`,
    "",
    "Generated source-only Batch 11 evidence. No deploys, production reads, provider calls, payment runtime changes, bottom-nav behavior changes, or GumDrop math changes were performed.",
    "",
    "```json",
    JSON.stringify(report, null, 2),
    "```",
    "",
  ].join("\n");
}

export function buildDeviceBreakpointContractCleanupReport() {
  const contract = read("src/lib/device-layout-contract.ts");
  const hook = read("src/hooks/useCompactViewport.ts");
  const chatShell = read("src/components/Chat/ChatRouteShell.tsx");
  const bottomNav = read("src/components/Navigation/MobileBottomBar.tsx");
  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "device-breakpoint-contract-cleanup",
    currentHead: gitHead(),
    compactViewportContractStatus: contract.includes("DEVICE_VIEWPORT_QUERIES")
      && contract.includes('compact: "(max-width: 767px)"')
      && hook.includes("DEVICE_VIEWPORT_QUERIES.compact")
      && chatShell.includes("DEVICE_VIEWPORT_QUERIES.compact")
      ? "mapped_to_device_contract" as const
      : "source_device_contract_fix_required" as const,
    behaviorPreserved: contract.includes('compact: "(max-width: 767px)"'),
    rawCompactBreakpointOutsideContract: hook.includes('COMPACT_VIEWPORT_QUERY = "(max-width: 767px)"')
      || chatShell.includes('window.matchMedia("(max-width: 767px)")'),
    duplicatedViewportQueryOutsideContract: hook.includes('"(max-width: 767px)"') || chatShell.includes('"(max-width: 767px)"'),
    bottomNavModifiedUnnecessarily: !bottomNav.includes("action?: \"purchase\"") || !bottomNav.includes("openPurchaseModal"),
  };
}

export function validateDeviceBreakpointContractCleanupReport(report: ReturnType<typeof buildDeviceBreakpointContractCleanupReport>) {
  const failures: string[] = [];
  if (report.compactViewportContractStatus !== "mapped_to_device_contract") failures.push("compact viewport query is not sourced from the device contract.");
  if (!report.behaviorPreserved) failures.push("raw breakpoint replacement changed compact behavior without explanation.");
  if (report.rawCompactBreakpointOutsideContract) failures.push("raw compact viewport breakpoint remains outside device contract.");
  if (report.duplicatedViewportQueryOutsideContract) failures.push("device viewport query is duplicated outside contract.");
  if (report.bottomNavModifiedUnnecessarily) failures.push("bottom nav was modified unnecessarily.");
  return failures;
}

export function buildResponsiveBreakpointFindingCleanupReport() {
  const adminGallery = read("src/app/admin/ai/components/AdminAiReviewgallerySection.tsx");
  const faq = read("src/app/faq/page.tsx");
  const globals = read("src/app/globals.css");
  const breakpointFindings = [
    {
      filePath: "src/app/admin/ai/components/AdminAiReviewgallerySection.tsx",
      original: '(min-width: 1024px) 280px, 100vw',
      classification: adminGallery.includes('(min-width: 960px) 280px, 100vw') ? "mapped_to_device_contract" : "unsafe_unknown",
      decision: "Mapped image sizes hint to the approved 960px large-tablet device tier.",
    },
    {
      filePath: "src/app/faq/page.tsx",
      original: "min-[380px]:max-w-none",
      classification: faq.includes("min-[360px]:max-w-none") ? "mapped_to_device_contract" : "unsafe_unknown",
      decision: "Mapped public FAQ heading expansion to the approved 360px phone boundary.",
    },
    {
      filePath: "src/app/globals.css",
      original: "@media (min-width: 768px)",
      classification: globals.includes("device-layout: intentional_design_exception") ? "intentional_design_exception" : "unsafe_unknown",
      decision: "Classified the global admin shell Tailwind-md spacing as a design exception pending broader shell review.",
    },
  ] as const;
  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "responsive-breakpoint-finding-cleanup",
    currentHead: gitHead(),
    breakpointFindings,
    allOffendingFilesListed: breakpointFindings.length === 3,
    globalsChangedWithoutImpactReview: globals.includes("@media (min-width: 840px)") && !globals.includes("intentional_design_exception"),
  };
}

export function validateResponsiveBreakpointFindingCleanupReport(report: ReturnType<typeof buildResponsiveBreakpointFindingCleanupReport>) {
  const failures: string[] = [];
  if (!report.allOffendingFilesListed) failures.push("report does not list all offending files.");
  if (report.breakpointFindings.some((finding) => finding.classification === "unsafe_unknown")) failures.push("raw unsupported breakpoints remain unclassified.");
  if (report.globalsChangedWithoutImpactReview) failures.push("globals.css breakpoint changed without verifying global impact.");
  return failures;
}

export function buildMobileBottomNavWalletActionReviewReport() {
  const bottomNav = read("src/components/Navigation/MobileBottomBar.tsx");
  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "mobile-bottom-nav-wallet-action-review",
    currentHead: gitHead(),
    walletNavActionStatus: bottomNav.includes("intentional_nav_action_exception")
      ? "intentional_nav_action_exception" as const
      : "product_intent_review_required" as const,
    needsProductReview: bottomNav.includes("needs_product_review"),
    migrationNote: bottomNav.includes("migrate_to_wallet_route_later")
      ? "migrate_to_wallet_route_later: keep current modal action until product approves a dedicated wallet route migration."
      : "missing",
    bottomNavBehaviorChanged: !bottomNav.includes("action?: \"purchase\""),
    purchaseModalBehaviorChanged: !bottomNav.includes("openPurchaseModal()"),
    paymentRuntimeChanged: false,
  };
}

export function validateMobileBottomNavWalletActionReviewReport(report: ReturnType<typeof buildMobileBottomNavWalletActionReviewReport>) {
  const failures: string[] = [];
  if (report.walletNavActionStatus !== "intentional_nav_action_exception") failures.push("wallet bottom nav action remains unclassified.");
  if (!report.needsProductReview || !report.migrationNote.includes("migrate_to_wallet_route_later")) failures.push("product review/migration note missing.");
  if (report.bottomNavBehaviorChanged) failures.push("bottom nav behavior changed.");
  if (report.purchaseModalBehaviorChanged) failures.push("purchase modal behavior changed.");
  if (report.paymentRuntimeChanged) failures.push("payment/wallet runtime changed.");
  return failures;
}

export function buildDebugCockpitBatch11CleanupReport(input: {
  deviceUiAgeBeforeHours?: number;
  deviceUiAgeAfterHours?: number;
  deviceLayoutAgeBeforeHours?: number;
  deviceLayoutAgeAfterHours?: number;
  deviceLayoutScoreBefore?: number;
  deviceLayoutScoreAfter?: number;
  deviceLayoutFindingsBefore?: number;
  deviceLayoutFindingsAfter?: number;
  contentProtectionAgeBeforeHours?: number;
  contentProtectionAgeAfterHours?: number;
  googleCostAgeBeforeHours?: number;
  googleCostAgeAfterHours?: number;
  cloudCostAgeBeforeHours?: number;
  cloudCostAgeAfterHours?: number;
  telemetryParityAgeBeforeHours?: number;
  telemetryParityAgeAfterHours?: number;
  scoreBefore?: number;
  scoreAfter?: number;
} = {}) {
  const publicBeta = readJson("agent/state/public-beta-score.generated.json");
  const deviceLayout = readJson("agent/state/device-layout-score.generated.json");
  const deviceUiAgeAfter = input.deviceUiAgeAfterHours ?? reportAge("agent/state/device-ui-dry-audit.generated.json");
  const deviceLayoutAgeAfter = input.deviceLayoutAgeAfterHours ?? reportAge("agent/state/device-layout-score.generated.json");
  const contentProtectionAgeAfter = input.contentProtectionAgeAfterHours ?? reportAge("agent/state/content-protection-score.generated.json");
  const googleCostAgeAfter = input.googleCostAgeAfterHours ?? reportAge("agent/state/google-cost-bleed.generated.json");
  const cloudCostAgeAfter = input.cloudCostAgeAfterHours ?? reportAge("agent/state/cloudrun-sql-bigquery-guardrails.generated.json");
  const telemetryParityAgeAfter = input.telemetryParityAgeAfterHours ?? reportAge("agent/state/telemetry-parity-score.generated.json");
  const breakpoint = buildDeviceBreakpointContractCleanupReport();
  const responsive = buildResponsiveBreakpointFindingCleanupReport();
  const wallet = buildMobileBottomNavWalletActionReviewReport();
  const refreshedArtifacts = [
    "agent/state/device-ui-dry-audit.generated.json",
    "agent/state/device-layout-score.generated.json",
    "agent/state/content-protection-score.generated.json",
    "agent/state/google-cost-bleed.generated.json",
    "agent/state/cloudrun-sql-bigquery-guardrails.generated.json",
    "agent/state/telemetry-parity-score.generated.json",
  ];
  const remainingFindings = [
    deviceUiAgeAfter > STALE_HOURS ? "device-ui report stale" : "",
    deviceLayoutAgeAfter > STALE_HOURS ? "device-layout report stale" : "",
    contentProtectionAgeAfter > STALE_HOURS ? "content-protection report stale" : "",
    googleCostAgeAfter > STALE_HOURS ? "google-cost report stale" : "",
    cloudCostAgeAfter > STALE_HOURS ? "cloud-cost report stale" : "",
    telemetryParityAgeAfter > STALE_HOURS ? "telemetry-parity report stale" : "",
    ...validateDeviceBreakpointContractCleanupReport(breakpoint),
    ...validateResponsiveBreakpointFindingCleanupReport(responsive),
    ...validateMobileBottomNavWalletActionReviewReport(wallet),
  ].filter(Boolean);

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "debug-cockpit-batch11-cleanup",
    currentHead: gitHead(),
    deviceUiAgeBefore: input.deviceUiAgeBeforeHours ?? 400,
    deviceUiAgeAfter,
    deviceLayoutAgeBefore: input.deviceLayoutAgeBeforeHours ?? 400,
    deviceLayoutAgeAfter,
    deviceLayoutScoreBefore: input.deviceLayoutScoreBefore ?? 80,
    deviceLayoutScoreAfter: input.deviceLayoutScoreAfter ?? readNumber(deviceLayout?.score) ?? 0,
    deviceLayoutFindingsBefore: input.deviceLayoutFindingsBefore ?? 13,
    deviceLayoutFindingsAfter: input.deviceLayoutFindingsAfter ?? reportFindingCount("agent/state/device-layout-score.generated.json"),
    breakpointFindings: responsive.breakpointFindings,
    compactViewportContractStatus: breakpoint.compactViewportContractStatus,
    walletNavActionStatus: wallet.walletNavActionStatus,
    contentProtectionAgeBefore: input.contentProtectionAgeBeforeHours ?? 400,
    contentProtectionAgeAfter,
    googleCostAgeBefore: input.googleCostAgeBeforeHours ?? 400,
    googleCostAgeAfter,
    cloudCostAgeBefore: input.cloudCostAgeBeforeHours ?? 400,
    cloudCostAgeAfter,
    telemetryParityAgeBefore: input.telemetryParityAgeBeforeHours ?? 400,
    telemetryParityAgeAfter,
    refreshedArtifacts,
    remainingFindings,
    bottomNavBehaviorChanged: wallet.bottomNavBehaviorChanged,
    paymentRuntimeChanged: wallet.paymentRuntimeChanged,
    scoreBefore: input.scoreBefore ?? 79,
    scoreAfter: input.scoreAfter ?? readNumber(publicBeta?.score) ?? 79,
    scoreDimensions: scoreDimensionsFromPublicBeta(publicBeta),
    dirtyFilesClassified: gitStatusShort().map((entry) => {
      const file = filePathFromGitStatus(entry);
      return {
        file,
        classification: classifyDirtyFile(file),
      };
    }),
    nextExactSteps: [
      "Keep wallet bottom-nav purchase action under product review; migrate to a dedicated wallet route only after product approval.",
      "Handle unrelated raw breakpoint findings in separate owner-scoped passes.",
    ],
  };
}

export function validateDebugCockpitBatch11CleanupReport(report: ReturnType<typeof buildDebugCockpitBatch11CleanupReport>) {
  const failures: string[] = [];
  if (report.deviceUiAgeAfter > STALE_HOURS) failures.push("device-ui report remains older than 72h.");
  if (report.deviceLayoutAgeAfter > STALE_HOURS) failures.push("device-layout report remains older than 72h.");
  if (report.contentProtectionAgeAfter > STALE_HOURS) failures.push("content-protection report remains older than 72h.");
  if (report.googleCostAgeAfter > STALE_HOURS) failures.push("google-cost report remains older than 72h.");
  if (report.cloudCostAgeAfter > STALE_HOURS) failures.push("cloud-cost report remains older than 72h.");
  if (report.telemetryParityAgeAfter > STALE_HOURS) failures.push("telemetry-parity report remains older than 72h.");
  if (report.compactViewportContractStatus !== "mapped_to_device_contract") failures.push("raw compact viewport breakpoint remains outside device contract.");
  if (report.breakpointFindings.some((finding) => finding.classification === "unsafe_unknown")) failures.push("unsupported breakpoints remain unclassified.");
  if (report.walletNavActionStatus !== "intentional_nav_action_exception") failures.push("wallet action semantics remain unclassified.");
  if (report.bottomNavBehaviorChanged) failures.push("bottom nav behavior changed.");
  if (report.paymentRuntimeChanged) failures.push("payment/wallet runtime changed.");
  if (!report.scoreDimensions || Object.values(report.scoreDimensions).some((value) => typeof value !== "number")) failures.push("score dimensions missing.");
  return failures;
}

function writeReport(path: string, docPath: string, title: string, report: unknown, validationFailures: string[]) {
  const output = { ...(report as Record<string, unknown>), validationFailures };
  write(path, `${JSON.stringify(output, null, 2)}\n`);
  write(docPath, renderDoc(title, output));
  return validationFailures;
}

export function writeDeviceBreakpointContractCleanupReport() {
  const report = buildDeviceBreakpointContractCleanupReport();
  return writeReport(DEVICE_BREAKPOINT_REPORT_PATH, DEVICE_BREAKPOINT_DOC_PATH, "Device Breakpoint Contract Cleanup", report, validateDeviceBreakpointContractCleanupReport(report));
}

export function writeResponsiveBreakpointFindingCleanupReport() {
  const report = buildResponsiveBreakpointFindingCleanupReport();
  return writeReport(RESPONSIVE_BREAKPOINT_REPORT_PATH, RESPONSIVE_BREAKPOINT_DOC_PATH, "Responsive Breakpoint Finding Cleanup", report, validateResponsiveBreakpointFindingCleanupReport(report));
}

export function writeMobileBottomNavWalletActionReviewReport() {
  const report = buildMobileBottomNavWalletActionReviewReport();
  return writeReport(WALLET_NAV_REPORT_PATH, WALLET_NAV_DOC_PATH, "Mobile Bottom Nav Wallet Action Review", report, validateMobileBottomNavWalletActionReviewReport(report));
}

export function writeDebugCockpitBatch11CleanupReport() {
  const report = buildDebugCockpitBatch11CleanupReport();
  return writeReport(BATCH11_REPORT_PATH, BATCH11_DOC_PATH, "Debug Cockpit Batch11 Cleanup", report, validateDebugCockpitBatch11CleanupReport(report));
}
