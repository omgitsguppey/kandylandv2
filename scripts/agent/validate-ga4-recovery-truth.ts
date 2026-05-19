import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildGa4EvidenceState,
  shouldRunGa4AdminRefresh,
  type Ga4Status,
} from "../../src/lib/analytics/ga4-truth";

type Severity = "P0" | "P1" | "P2";

type Finding = {
  id: string;
  status: "fixed" | "missing" | "deferred";
  severity: Severity;
  detail: string;
};

type Ga4RecoveryTruthReport = {
  generatedAtUtc: string;
  reportKey: "ga4-recovery-truth";
  currentHead: string;
  summary: {
    ga4Status: Ga4Status;
    clientGa4Configured: boolean;
    serverDataApiConfigured: boolean;
    firstPartyAnalyticsPrimary: boolean;
    ga4EvidenceOnly: boolean;
    ga4UnavailableNotZero: boolean;
    defaultDataApiCallsBlocked: boolean;
    consentGateRespected: boolean;
    retryCostGuarded: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  inventory: Finding[];
  fixesApplied: Finding[];
  adminIntegrationFindings: Finding[];
  clientIntegrationFindings: Finding[];
  costFindings: Finding[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/ga4-recovery-truth.generated.json";
const docsRelativePath = "docs/agent-truth/ga4-recovery-truth.md";

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

function count(findings: Finding[], severity: Severity) {
  return findings.filter((entry) => entry.status === "missing" && entry.severity === severity).length;
}

function writeJson(relativePath: string, value: unknown) {
  const fullPath = join(repoRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(report: Ga4RecoveryTruthReport) {
  const lines = [
    "# GA4 Recovery Truth",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- GA4 status: ${report.summary.ga4Status}`,
    `- Client GA4 configured: ${report.summary.clientGa4Configured ? "yes" : "no"}`,
    `- Server Data API configured: ${report.summary.serverDataApiConfigured ? "yes" : "no"}`,
    `- First-party analytics primary: ${report.summary.firstPartyAnalyticsPrimary ? "yes" : "no"}`,
    `- GA4 evidence-only: ${report.summary.ga4EvidenceOnly ? "yes" : "no"}`,
    `- Missing GA4 shown as unavailable, not zero: ${report.summary.ga4UnavailableNotZero ? "yes" : "no"}`,
    `- Default Data API calls blocked: ${report.summary.defaultDataApiCallsBlocked ? "yes" : "no"}`,
    `- Consent gate respected: ${report.summary.consentGateRespected ? "yes" : "no"}`,
    `- Retry/cost guard present: ${report.summary.retryCostGuarded ? "yes" : "no"}`,
    "",
    "## Inventory",
    "",
    ...report.inventory.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Admin Integration",
    "",
    ...report.adminIntegrationFindings.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Client Integration",
    "",
    ...report.clientIntegrationFindings.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Cost Guards",
    "",
    ...report.costFindings.map((entry) => `- ${entry.status}: ${entry.detail}`),
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

export function validateGa4RecoveryTruth(options: { writeReport?: boolean } = {}) {
  const route = read("src/app/api/admin/analytics/historical/route.ts");
  const adminAnalyticsData = read("src/lib/server/admin-analytics-data.ts");
  const ga4Evidence = read("src/lib/server/admin-analytics/ga4-evidence.ts");
  const ga4Truth = read("src/lib/analytics/ga4-truth.ts");
  const ga4Tracker = read("src/components/Analytics/Ga4EvidenceTracker.tsx");
  const layout = read("src/app/layout.tsx");
  const analyticsDoctrine = read("docs/agent-truth/analytics-source-hierarchy.md");
  const packageJson = read("package.json");

  const evidenceState = buildGa4EvidenceState({
    measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.GA_MEASUREMENT_ID,
    propertyId: process.env.GA_PROPERTY_ID,
    apiSecretPresent: Boolean(process.env.GA_API_SECRET),
    clientCodePresent: has("src/components/Analytics/Ga4EvidenceTracker.tsx"),
    serverDataApiDependencyPresent: packageJson.includes("@google-analytics/data"),
  });

  const missingConfigState = buildGa4EvidenceState({});
  const inventory = [
    finding(
      "ga4-client-support-present",
      packageJson.includes("@next/third-parties") && has("src/components/Analytics/Ga4EvidenceTracker.tsx"),
      "Client GA4 support exists through a consent-gated evidence tracker.",
    ),
    finding(
      "ga4-server-data-api-present",
      packageJson.includes("@google-analytics/data") && ga4Evidence.includes("BetaAnalyticsDataClient"),
      "Server Data API dependency exists but is classified as external evidence.",
    ),
    finding(
      "first-party-analytics-primary",
      analyticsDoctrine.includes("Product truth comes from first-party event ledgers")
        || analyticsDoctrine.includes("first-party product records"),
      "Analytics source hierarchy keeps first-party event facts and rollups as product truth.",
    ),
  ];

  const adminIntegrationFindings = [
    finding(
      "ga4-missing-config-not-blocking",
      !route.includes("requiresSetup: true") && !route.includes("GA_PROPERTY_ID is missing from environment variables"),
      "Missing GA4 config no longer blocks the historical admin analytics route.",
      "P0",
    ),
    finding(
      "ga4-unavailable-not-zero",
      missingConfigState.trafficValue === null
        && missingConfigState.displayValue === "Unavailable"
        && route.includes("ga4_external_evidence"),
      "Missing GA4 evidence is displayed as unavailable and never as zero traffic.",
      "P0",
    ),
    finding(
      "ga4-not-product-truth",
      route.includes('canonicalSource: "analytics_event_facts+analytics_rollups_daily"')
        && route.includes("ga4_external_evidence")
        && ga4Truth.includes('productTruthSource: "first_party_analytics"'),
      "Admin historical analytics keeps first-party sources canonical and GA4 as external evidence.",
      "P0",
    ),
  ];

  const clientIntegrationFindings = [
    finding(
      "client-env-gated",
      ga4Tracker.includes("NEXT_PUBLIC_GA_MEASUREMENT_ID") && ga4Tracker.includes("isGa4ClientEnabled"),
      "Client GA4 cannot load without a public measurement ID.",
      "P0",
    ),
    finding(
      "client-consent-gated",
      ga4Tracker.includes("canUseAnonymousAnalytics")
        && ga4Tracker.includes("subscribeToPrivacySettings")
        && ga4Tracker.includes("applyAnalyticsConsentToGtag"),
      "Client GA4 respects the existing analytics consent gate.",
      "P0",
    ),
    finding(
      "client-mounted-once",
      layout.includes("<Ga4EvidenceTracker />"),
      "Root layout mounts the GA4 evidence tracker once without replacing first-party DeepTracker.",
    ),
  ];

  const costFindings = [
    finding(
      "default-data-api-blocked",
      adminAnalyticsData.includes("allowGa4VendorReports")
        && adminAnalyticsData.includes("shouldRunGa4AdminRefresh")
        && ga4Evidence.includes("Skipped ${label} GA report on default admin load"),
      "Default admin analytics load does not call GA4 Data API.",
      "P0",
    ),
    finding(
      "explicit-refresh-ttl-guarded",
      ga4Truth.includes("GA4_ADMIN_REFRESH_TTL_MS")
        && shouldRunGa4AdminRefresh({
          explicitRefresh: true,
          propertyId: "123",
          lastRunAtMs: 1000,
          nowMs: 1000 + 60_000,
        }) === false,
      "GA4 evidence refresh requires explicit refresh and respects the retry TTL.",
      "P0",
    ),
  ];

  const fixesApplied = [
    finding("ga4-truth-helper", has("src/lib/analytics/ga4-truth.ts"), "Added shared GA4 truth and cost-guard helper."),
    finding("ga4-client-tracker", has("src/components/Analytics/Ga4EvidenceTracker.tsx"), "Added consent-gated GA4 evidence tracker."),
    finding("ga4-admin-fallback", route.includes("buildGa4EvidenceState"), "Admin historical analytics records GA4 evidence state without blocking first-party fallback."),
  ];

  const allFindings = [
    ...inventory,
    ...adminIntegrationFindings,
    ...clientIntegrationFindings,
    ...costFindings,
    ...fixesApplied,
  ];

  const report: Ga4RecoveryTruthReport = {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "ga4-recovery-truth",
    currentHead: currentHead(),
    summary: {
      ga4Status: evidenceState.status,
      clientGa4Configured: evidenceState.clientGa4Configured,
      serverDataApiConfigured: evidenceState.serverDataApiConfigured,
      firstPartyAnalyticsPrimary: evidenceState.firstPartyAnalyticsPrimary,
      ga4EvidenceOnly: evidenceState.ga4EvidenceOnly,
      ga4UnavailableNotZero: missingConfigState.trafficValue === null && missingConfigState.displayValue === "Unavailable",
      defaultDataApiCallsBlocked: costFindings[0].status === "fixed",
      consentGateRespected: clientIntegrationFindings[1].status === "fixed",
      retryCostGuarded: costFindings[1].status === "fixed",
      p0Count: count(allFindings, "P0"),
      p1Count: count(allFindings, "P1"),
      p2Count: count(allFindings, "P2"),
    },
    inventory,
    fixesApplied,
    adminIntegrationFindings,
    clientIntegrationFindings,
    costFindings,
    prCleanupActions: ["No open GA4, analytics, PostHog, admin analytics, script/env PRs found at start."],
    nextFixOrder: [
      "If owner-approved GA4 evidence is needed, add measurement/property configuration and run only explicit refreshes.",
      "Keep first-party analytics event facts and rollups as product truth for admin totals.",
      "Use GA4 snapshots as external comparison evidence, not live totals.",
    ],
  };

  if (options.writeReport) {
    writeJson(artifactRelativePath, report);
    writeMarkdown(report);
  }

  const failed = allFindings.filter((entry) => entry.status === "missing");
  if (failed.length > 0) {
    for (const entry of failed) {
      console.error(`[ga4-recovery-truth] ${entry.id}: ${entry.detail}`);
    }
    process.exitCode = 1;
  }

  return report;
}

validateGa4RecoveryTruth({ writeReport: true });
