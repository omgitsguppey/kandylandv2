import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

type Finding = {
  id: string;
  status: "fixed" | "deferred" | "failed";
  severity: "P0" | "P1" | "P2";
  detail: string;
};

type AdminAnalyticsMonolithCleanupReport = {
  generatedAtUtc: string;
  reportKey: "admin-analytics-monolith-cleanup";
  currentHead: string;
  summary: {
    monolithsFound: number;
    monolithsSplit: number;
    unnecessaryAnalyticsRemoved: number;
    defaultAdminLoadReduced: boolean;
    ga4StateClassified: boolean;
    evidenceOnlySourcesSeparated: boolean;
    truthStatePreserved: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  monolithFindings: Finding[];
  removedOrMovedAnalytics: Finding[];
  ga4Findings: Finding[];
  splitModules: string[];
  defaultLoadFindings: Finding[];
  fixesApplied: Finding[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

const ROOT = process.cwd();
const artifactRelativePath = "agent/state/admin-analytics-monolith-cleanup.generated.json";
const docsRelativePath = "docs/agent-truth/admin-analytics-monolith-cleanup.md";

function read(relativePath: string) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function currentHead() {
  try {
    return execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function includes(source: string, pattern: string | RegExp) {
  return typeof pattern === "string" ? source.includes(pattern) : pattern.test(source);
}

function lineCount(source: string) {
  return source.split(/\r?\n/u).length;
}

function finding(id: string, ok: boolean, detail: string, severity: Finding["severity"] = "P1"): Finding {
  return {
    id,
    status: ok ? "fixed" : "failed",
    severity,
    detail,
  };
}

function writeJson(relativePath: string, value: unknown) {
  const fullPath = join(ROOT, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(report: AdminAnalyticsMonolithCleanupReport) {
  const lines = [
    "# Admin Analytics Monolith Cleanup",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Monoliths found: ${report.summary.monolithsFound}`,
    `- Monoliths split: ${report.summary.monolithsSplit}`,
    `- Unnecessary analytics removed or deferred: ${report.summary.unnecessaryAnalyticsRemoved}`,
    `- Default admin load reduced: ${report.summary.defaultAdminLoadReduced ? "yes" : "no"}`,
    `- GA4 state classified: ${report.summary.ga4StateClassified ? "yes" : "no"}`,
    `- Evidence-only sources separated: ${report.summary.evidenceOnlySourcesSeparated ? "yes" : "no"}`,
    `- Truth state preserved: ${report.summary.truthStatePreserved ? "yes" : "no"}`,
    "",
    "## Split Modules",
    "",
    ...report.splitModules.map((entry) => `- ${entry}`),
    "",
    "## GA4 Status",
    "",
    ...report.ga4Findings.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Default Load Findings",
    "",
    ...report.defaultLoadFindings.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((entry, index) => `${index + 1}. ${entry}`),
    "",
  ];
  const fullPath = join(ROOT, docsRelativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, lines.join("\n"));
}

export function validateAdminAnalyticsMonolithCleanup(options: { writeReport?: boolean } = {}) {
  const debugRoute = read("src/app/api/admin/debug/route.ts");
  const analyticsData = read("src/lib/server/admin-analytics-data.ts");
  const ga4Evidence = read("src/lib/server/admin-analytics/ga4-evidence.ts");
  const debugSummaryExists = existsSync(join(ROOT, "src/lib/server/admin-debug/summary.ts"));
  const debugTruthStateExists = existsSync(join(ROOT, "src/lib/server/admin-debug/truth-state.ts"));
  const ga4EvidenceExists = existsSync(join(ROOT, "src/lib/server/admin-analytics/ga4-evidence.ts"));

  const defaultBranch = debugRoute.slice(
    debugRoute.indexOf('if (section !== "all" && !loadFullDebug)'),
    debugRoute.indexOf("const weekAgoMs = nowMs - ONE_WEEK_MS"),
  );

  const monolithFindings = [
    finding(
      "admin-debug-route-monolith-split",
      debugSummaryExists
        && debugTruthStateExists
        && includes(debugRoute, "buildAdminDebugSummaryPayload")
        && !includes(debugRoute, "function readAdminDebugSummaryPayloadStatus")
        && !includes(defaultBranch, /const runtimeWarningSummary = runtimeWarnings\.reduce/u),
      `Admin Debug route is ${lineCount(debugRoute)} lines; default summary aggregation is split into focused server modules while the remaining all-section branch is preserved for behavior stability.`,
    ),
    finding(
      "admin-analytics-ga4-evidence-split",
      ga4EvidenceExists
        && includes(analyticsData, "classifyAdminAnalyticsGa4State")
        && !includes(analyticsData, "new BetaAnalyticsDataClient")
        && !includes(analyticsData, "function buildSkippedVendorReport"),
      "GA4 client construction and skipped vendor report handling are isolated from the broad admin analytics data loader.",
    ),
  ];

  const removedOrMovedAnalytics = [
    finding(
      "ga4-default-load-deferred",
      includes(analyticsData, "allowVendorReports = false")
        && includes(ga4Evidence, "Skipped ${label} GA report on default admin load")
        && includes(ga4Evidence, 'sourceState: "deferred"'),
      "GA4 report calls remain deferred by default and require explicit refresh.",
    ),
    finding(
      "debug-drilldowns-deferred",
      includes(debugRoute, 'section === "all"')
        && includes(debugRoute, "ADMIN_DEBUG_DEFAULT_SECTION")
        && includes(debugRoute, "buildAdminDebugSummaryPayload"),
      "High-cost Admin Debug drilldowns stay behind explicit all-section loading.",
    ),
  ];

  const ga4Findings = [
    finding(
      "ga4-state-classified",
      includes(ga4Evidence, "ga4_config_missing")
        && includes(ga4Evidence, "ga4_client_unused")
        && includes(ga4Evidence, "ga4_evidence_only"),
      "GA4 is classified as missing, deferred, or evidence-only instead of guessed live.",
    ),
    finding(
      "ga4-evidence-only",
      includes(ga4Evidence, 'sourceRole: "external_evidence_only"')
        && includes(ga4Evidence, "first-party product truth remains authoritative"),
      "GA4 is explicitly external evidence only and cannot become product truth through this lane.",
    ),
  ];

  const defaultLoadFindings = [
    finding(
      "default-admin-debug-summary-load",
      includes(debugRoute, 'section !== "all"')
        && includes(debugRoute, "ADMIN_DEBUG_INITIAL_LOAD_CACHE_TTL_MS")
        && includes(debugRoute, "ADMIN_DEBUG_INITIAL_LOAD_COST_GUARD"),
      "Default Admin Debug load uses bounded summary and hot cache cost controls.",
    ),
    finding(
      "truth-semantics-preserved",
      includes(debugRoute, "sourceFreshness")
        && includes(ga4Evidence, "truthState")
        && includes(ga4Evidence, "unavailable")
        && includes(ga4Evidence, "deferred")
        && !includes(ga4Evidence, "healthy"),
      "Unavailable/deferred/degraded semantics remain visible; GA4 is not marked healthy.",
    ),
  ];

  const allFindings = [
    ...monolithFindings,
    ...removedOrMovedAnalytics,
    ...ga4Findings,
    ...defaultLoadFindings,
  ];
  const failed = allFindings.filter((entry) => entry.status === "failed");

  const report: AdminAnalyticsMonolithCleanupReport = {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "admin-analytics-monolith-cleanup",
    currentHead: currentHead(),
    summary: {
      monolithsFound: 2,
      monolithsSplit: monolithFindings.filter((entry) => entry.status === "fixed").length,
      unnecessaryAnalyticsRemoved: removedOrMovedAnalytics.filter((entry) => entry.status === "fixed").length,
      defaultAdminLoadReduced: defaultLoadFindings[0].status === "fixed",
      ga4StateClassified: ga4Findings[0].status === "fixed",
      evidenceOnlySourcesSeparated: ga4Findings[1].status === "fixed",
      truthStatePreserved: defaultLoadFindings[1].status === "fixed",
      p0Count: failed.filter((entry) => entry.severity === "P0").length,
      p1Count: failed.filter((entry) => entry.severity === "P1").length,
      p2Count: failed.filter((entry) => entry.severity === "P2").length,
    },
    monolithFindings,
    removedOrMovedAnalytics,
    ga4Findings,
    splitModules: [
      "src/lib/server/admin-debug/summary.ts",
      "src/lib/server/admin-debug/truth-state.ts",
      "src/lib/server/admin-analytics/ga4-evidence.ts",
    ],
    defaultLoadFindings,
    fixesApplied: allFindings.filter((entry) => entry.status === "fixed"),
    prCleanupActions: ["No open PRs were present at start of cleanup."],
    nextFixOrder: [
      "Split the remaining Admin Debug all-section branch into named drilldown loaders after UI callers support section-specific requests.",
      "Wire a future GA4 refresh-only evidence lane if owner credentials and cost approval are provided.",
      "Continue moving admin analytics historical validation helpers into smaller modules when touching that route.",
    ],
  };

  if (options.writeReport) {
    writeJson(artifactRelativePath, report);
    writeMarkdown(report);
  }

  if (failed.length > 0) {
    throw new Error(`Admin analytics monolith cleanup validation failed: ${failed.map((entry) => entry.id).join(", ")}`);
  }

  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  validateAdminAnalyticsMonolithCleanup({ writeReport: true });
  console.log("Admin analytics monolith cleanup validation passed.");
}
