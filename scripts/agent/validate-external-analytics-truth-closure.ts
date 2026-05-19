import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  EXTERNAL_ANALYTICS_TRUTH_CONTRACT,
  buildExternalAnalyticsTruthState,
  validateExternalAnalyticsTruthClosure as validateExternalAnalyticsTruthContract,
  type ExternalAnalyticsStatus,
} from "../../src/lib/analytics/external-analytics-truth";

type Severity = "P0" | "P1" | "P2";
type FindingStatus = "fixed" | "missing" | "deferred";

type Finding = {
  id: string;
  status: FindingStatus;
  severity: Severity;
  detail: string;
};

type ExternalAnalyticsTruthClosureReport = {
  generatedAtUtc: string;
  reportKey: "external-analytics-truth-closure";
  currentHead: string;
  summary: {
    ga4Statuses: ExternalAnalyticsStatus[];
    posthogStatuses: ExternalAnalyticsStatus[];
    firstPartyAnalyticsPrimary: boolean;
    externalAnalyticsProductTruth: boolean;
    missingExternalAnalyticsNotZero: boolean;
    ga4ClientTrackerEnvGated: boolean;
    ga4ClientConsentGated: boolean;
    posthogEnvGated: boolean;
    posthogConsentGated: boolean;
    dataApiDefaultLoadBlocked: boolean;
    docsDoNotClaimUnsupportedGa4Live: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  inventory: Finding[];
  ga4Findings: Finding[];
  posthogFindings: Finding[];
  adminEvidenceFindings: Finding[];
  docsFindings: Finding[];
  fixesApplied: Finding[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/external-analytics-truth-closure.generated.json";
const docsRelativePath = "docs/agent-truth/external-analytics-truth-closure.md";

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function has(relativePath: string) {
  return existsSync(join(repoRoot, relativePath));
}

function finding(id: string, ok: boolean, detail: string, severity: Severity = "P1"): Finding {
  return {
    id,
    status: ok ? "fixed" : "missing",
    severity,
    detail,
  };
}

function countBlocking(findings: Finding[], severity: Severity) {
  return findings.filter((entry) => entry.status === "missing" && entry.severity === severity).length;
}

function writeJson(relativePath: string, value: unknown) {
  const fullPath = join(repoRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(report: ExternalAnalyticsTruthClosureReport) {
  const lines = [
    "# External Analytics Truth Closure",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- GA4 statuses: ${report.summary.ga4Statuses.join(", ")}`,
    `- PostHog statuses: ${report.summary.posthogStatuses.join(", ")}`,
    `- First-party analytics primary: ${report.summary.firstPartyAnalyticsPrimary ? "yes" : "no"}`,
    `- External analytics product truth: ${report.summary.externalAnalyticsProductTruth ? "yes" : "no"}`,
    `- Missing external analytics shown as zero traffic: ${report.summary.missingExternalAnalyticsNotZero ? "no" : "risk"}`,
    `- GA4 client env gated: ${report.summary.ga4ClientTrackerEnvGated ? "yes" : "no"}`,
    `- GA4 client consent gated: ${report.summary.ga4ClientConsentGated ? "yes" : "no"}`,
    `- PostHog env gated: ${report.summary.posthogEnvGated ? "yes" : "no"}`,
    `- PostHog consent gated: ${report.summary.posthogConsentGated ? "yes" : "no"}`,
    `- GA Data API default load blocked: ${report.summary.dataApiDefaultLoadBlocked ? "yes" : "no"}`,
    "",
    "## Inventory",
    "",
    ...report.inventory.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## GA4 Findings",
    "",
    ...report.ga4Findings.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## PostHog Findings",
    "",
    ...report.posthogFindings.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Admin Evidence",
    "",
    ...report.adminEvidenceFindings.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Docs",
    "",
    ...report.docsFindings.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Fixes Applied",
    "",
    ...report.fixesApplied.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((entry, index) => `${index + 1}. ${entry}`),
    "",
  ];

  const fullPath = join(repoRoot, docsRelativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, lines.join("\n"));
}

function sourceHasEnv(source: string, envKey: string) {
  return source.includes(`variable: ${envKey}`) || source.includes(envKey);
}

export function validateExternalAnalyticsTruthClosure(options: { writeReport?: boolean } = {}) {
  const packageJson = read("package.json");
  const appHosting = read("apphosting.yaml");
  const ga4Tracker = read("src/components/Analytics/Ga4EvidenceTracker.tsx");
  const posthogProvider = read("src/components/Analytics/CSPostHogProvider.tsx");
  const adminAnalyticsData = read("src/lib/server/admin-analytics-data.ts");
  const ga4Evidence = read("src/lib/server/admin-analytics/ga4-evidence.ts");
  const ga4Truth = read("src/lib/analytics/ga4-truth.ts");
  const analyticsTruthDoc = read("docs/agent-truth/analytics-truth-layer-v2.md");
  const cloudDoctrine = read("docs/doctrine/kandydrops-google-analytics-cloud-doctrine.md");

  const contractValidation = validateExternalAnalyticsTruthContract();
  const ga4ClientMeasurementIdPresent = sourceHasEnv(appHosting, "NEXT_PUBLIC_GA_MEASUREMENT_ID");
  const ga4ServerPropertyIdPresent = sourceHasEnv(appHosting, "GA_PROPERTY_ID");
  const posthogKeyPresent = sourceHasEnv(appHosting, "NEXT_PUBLIC_POSTHOG_KEY");
  const state = buildExternalAnalyticsTruthState({
    ga4ClientCodePresent: has("src/components/Analytics/Ga4EvidenceTracker.tsx"),
    ga4ClientMeasurementIdPresent,
    ga4ServerPropertyIdPresent,
    ga4ServerDataApiDependencyPresent: packageJson.includes("@google-analytics/data"),
    posthogClientCodePresent: has("src/components/Analytics/CSPostHogProvider.tsx"),
    posthogKeyPresent,
    explicitRefreshRequired: true,
  });

  const inventory = [
    finding("external-analytics-contract-present", has("src/lib/analytics/external-analytics-truth.ts"), "External analytics truth contract exists.", "P0"),
    finding("contract-validates", contractValidation.ok, contractValidation.ok
      ? "External analytics truth contract validates."
      : `External analytics truth contract findings: ${contractValidation.findings.join("; ")}`, "P0"),
    finding("ga4-recovery-reused", has("src/lib/analytics/ga4-truth.ts") && has("src/components/Analytics/Ga4EvidenceTracker.tsx"), "Existing GA4 recovery truth helper and consent-gated tracker are reused.", "P1"),
  ];

  const ga4Findings = [
    finding("ga4-state-not-unknown", state.ga4Statuses.length > 0, "GA4 has explicit statuses and no unknown state.", "P0"),
    finding("ga4-client-env-gated", ga4Tracker.includes("NEXT_PUBLIC_GA_MEASUREMENT_ID") && !ga4ClientMeasurementIdPresent, "GA4 client tracker is gated by NEXT_PUBLIC_GA_MEASUREMENT_ID; current App Hosting source does not expose that public key.", "P0"),
    finding("ga4-client-consent-gated", ga4Tracker.includes("canUseAnonymousAnalytics") && ga4Tracker.includes("subscribeToPrivacySettings"), "GA4 client tracker respects analytics consent.", "P0"),
    finding("ga4-server-evidence-configured", state.ga4Statuses.includes("ga4_server_configured"), "GA4 server evidence is configured in source through GA_PROPERTY_ID and the Data API dependency.", "P1"),
    finding("ga4-evidence-only", state.ga4Statuses.includes("ga4_evidence_only") && ga4Truth.includes('sourceRole: "external_evidence_only"'), "GA4 remains external evidence only.", "P0"),
  ];

  const posthogFindings = [
    finding("posthog-state-not-unknown", state.posthogStatuses.length > 0, "PostHog has explicit status and no unknown state.", "P0"),
    finding("posthog-env-gated", posthogProvider.includes("NEXT_PUBLIC_POSTHOG_KEY") && !posthogKeyPresent, "PostHog provider is source-gated and current App Hosting source does not configure PostHog.", "P0"),
    finding("posthog-consent-gated", posthogProvider.includes("canUseAnonymousAnalytics") && posthogProvider.includes("subscribeToPrivacySettings"), "PostHog capture respects analytics consent.", "P0"),
  ];

  const adminEvidenceFindings = [
    finding("missing-external-not-zero", state.missingExternalAnalyticsTrafficBehavior === "unavailable_not_zero" && state.displayTrafficValue === null, "Missing external analytics is unavailable evidence, not zero traffic.", "P0"),
    finding("external-not-product-truth", state.firstPartyAnalyticsPrimary && state.externalAnalyticsProductTruth === false, "External analytics cannot override first-party event facts and rollups.", "P0"),
    finding("data-api-default-load-blocked", adminAnalyticsData.includes("allowGa4VendorReports") && adminAnalyticsData.includes("shouldRunGa4AdminRefresh") && ga4Evidence.includes("Skipped ${label} GA report on default admin load"), "GA Data API calls remain blocked on default admin analytics load.", "P0"),
  ];

  const docsFindings = [
    finding("docs-keep-ga4-evidence-only", analyticsTruthDoc.includes("GA4 and BigQuery are verification/export lanes, not product truth by default.") && cloudDoctrine.includes("BigQuery and GA exports are analytics evidence only."), "Docs keep GA4 as evidence/export, not product truth.", "P0"),
    finding("docs-do-not-claim-live-ga4", !analyticsTruthDoc.includes("GA4 is live product truth") && !cloudDoctrine.includes("GA4 is live product truth"), "Docs do not claim unsupported live GA4 product truth.", "P0"),
  ];

  const fixesApplied = [
    finding("external-analytics-contract-added", has("src/lib/analytics/external-analytics-truth.ts"), "Added external analytics truth contract."),
    finding("external-analytics-validator-added", has("scripts/agent/validate-external-analytics-truth-closure.ts"), "Added external analytics truth validator."),
    finding("external-analytics-test-added", has("tests/unit/external-analytics-truth-closure.spec.ts"), "Added external analytics truth unit coverage."),
  ];

  const allFindings = [
    ...inventory,
    ...ga4Findings,
    ...posthogFindings,
    ...adminEvidenceFindings,
    ...docsFindings,
    ...fixesApplied,
  ];

  const report: ExternalAnalyticsTruthClosureReport = {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "external-analytics-truth-closure",
    currentHead: currentHead(),
    summary: {
      ga4Statuses: state.ga4Statuses,
      posthogStatuses: state.posthogStatuses,
      firstPartyAnalyticsPrimary: state.firstPartyAnalyticsPrimary,
      externalAnalyticsProductTruth: state.externalAnalyticsProductTruth,
      missingExternalAnalyticsNotZero: state.missingExternalAnalyticsTrafficBehavior === "unavailable_not_zero" && state.displayTrafficValue === null,
      ga4ClientTrackerEnvGated: ga4Findings[1].status === "fixed",
      ga4ClientConsentGated: ga4Findings[2].status === "fixed",
      posthogEnvGated: posthogFindings[1].status === "fixed",
      posthogConsentGated: posthogFindings[2].status === "fixed",
      dataApiDefaultLoadBlocked: adminEvidenceFindings[2].status === "fixed",
      docsDoNotClaimUnsupportedGa4Live: docsFindings.every((entry) => entry.status === "fixed"),
      p0Count: countBlocking(allFindings, "P0"),
      p1Count: countBlocking(allFindings, "P1"),
      p2Count: countBlocking(allFindings, "P2"),
    },
    inventory,
    ga4Findings,
    posthogFindings,
    adminEvidenceFindings,
    docsFindings,
    fixesApplied,
    prCleanupActions: ["No open GA4, PostHog, or external analytics truth PRs were present at start."],
    nextFixOrder: [
      "If client GA4 evidence is owner-approved, add NEXT_PUBLIC_GA_MEASUREMENT_ID in deployment config in a dedicated config pass.",
      "Keep GA Data API evidence behind explicit refresh and TTL; do not call it from default admin loads.",
      "If PostHog evidence is owner-approved, configure NEXT_PUBLIC_POSTHOG_KEY and keep consent gating intact.",
    ],
  };

  if (options.writeReport) {
    writeJson(artifactRelativePath, report);
    writeMarkdown(report);
  }

  const failed = allFindings.filter((entry) => entry.status === "missing");
  if (failed.length > 0) {
    throw new Error(`External analytics truth closure failed: ${failed.map((entry) => entry.id).join(", ")}`);
  }

  return report;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/agent/validate-external-analytics-truth-closure.ts")) {
  validateExternalAnalyticsTruthClosure({ writeReport: true });
  console.log("External analytics truth closure validation passed.");
}
