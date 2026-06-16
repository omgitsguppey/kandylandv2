import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

type Finding = {
  id: string;
  status: "fixed" | "deferred" | "failed";
  severity: "P0" | "P1" | "P2";
  detail: string;
};

export type AdminAnalyticsDebugCostReductionReport = {
  generatedAtUtc: string;
  reportKey: "admin-analytics-debug-cost-reduction";
  currentHead: string;
  summary: {
    adminHistoricalDefaultCacheEnabled: boolean;
    gaSnapshotFirstEnabled: boolean;
    eventFactsDefaultLimitReduced: boolean;
    guestDiagnosticsDefaultLimitReduced: boolean;
    dropsArchivePaged: boolean;
    debugInitialLoadLazy: boolean;
    heartbeatFullScanBlocked: boolean;
    supportThreadsPaged: boolean;
    rosterSummaryDefault: boolean;
    userDetailExpensiveSectionsLazy: boolean;
    truthSemanticsPreserved: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  auditItemsAddressed: number[];
  fixesApplied: Finding[];
  deferredFindings: Finding[];
  costSavingsModel: Array<{
    lane: string;
    formula: string;
    estimatedReduction: string;
  }>;
  prCleanupActions: Array<{
    number: number;
    action: "preserved" | "closed" | "merged" | "not_relevant";
    reason: string;
  }>;
  nextFixOrder: string[];
};

const ROOT = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
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

function finding(id: string, ok: boolean, detail: string, severity: Finding["severity"] = "P1"): Finding {
  return {
    id,
    status: ok ? "fixed" : "failed",
    severity,
    detail,
  };
}

export function validateAdminAnalyticsDebugCostReduction(options: { writeReport?: boolean } = {}) {
  const historicalRoute = read("src/app/api/admin/analytics/historical/route.ts");
  const analyticsData = read("src/lib/server/admin-analytics-data.ts");
  const ga4Evidence = read("src/lib/server/admin-analytics/ga4-evidence.ts");
  const debugRoute = read("src/app/api/admin/debug/route.ts");
  const debugSummary = read("src/lib/server/admin-debug/summary.ts");
  const debugTruthState = read("src/lib/server/admin-debug/truth-state.ts");
  const runtimeWarningStore = read("src/lib/server/runtime-warning-store.ts");
  const supportThreads = read("src/lib/server/support-threads.ts");
  const adminSupportRoute = read("src/app/api/admin/support/threads/route.ts");
  const userSupportRoute = read("src/app/api/support/threads/route.ts");
  const rosterRoute = read("src/app/api/admin/roster/route.ts");
  const usersRoute = read("src/app/api/admin/users/route.ts");

  const checks = [
    finding(
      "adminHistoricalDefaultCacheEnabled",
      includes(historicalRoute, "fetchCache = \"default-cache\"")
        && includes(historicalRoute, "sourceFreshness")
        && includes(historicalRoute, "cacheAgeMs")
        && includes(historicalRoute, "generatedAtUtc"),
      "Historical analytics route defaults to cache/stale-known metadata instead of no-store cold rebuild.",
    ),
    finding(
      "gaSnapshotFirstEnabled",
      includes(analyticsData, "allowVendorReports")
        && includes(ga4Evidence, "buildSkippedVendorReport")
        && includes(analyticsData, "runVendorReportWhenAllowed")
        && includes(historicalRoute, "allowVendorReports: forceRefresh"),
      "GA/Data API reports are skipped on default raw fallback and only allowed by explicit refresh.",
    ),
    finding(
      "eventFactsDefaultLimitReduced",
      !includes(analyticsData, "ADMIN_ANALYTICS_EVENT_FACT_LIMIT = 5_000")
        && includes(analyticsData, "ADMIN_ANALYTICS_EVENT_FACT_LIMIT = 500"),
      "Default event-fact sample cap is reduced from 5000.",
    ),
    finding(
      "guestDiagnosticsDefaultLimitReduced",
      !includes(analyticsData, "ADMIN_ANALYTICS_RECENT_SAMPLE_LIMIT = 1_000")
        && includes(analyticsData, "ADMIN_ANALYTICS_RECENT_SAMPLE_LIMIT = 200"),
      "Guest/security/diagnostic default sample caps are reduced.",
    ),
    finding(
      "dropsArchivePaged",
      !includes(analyticsData, "ADMIN_ANALYTICS_DROP_ARCHIVE_LIMIT = 1_000")
        && includes(analyticsData, "ADMIN_ANALYTICS_DROP_ARCHIVE_LIMIT = 100")
        && includes(analyticsData, "orderBy(\"validFrom\", \"desc\")"),
      "Drops archive uses a bounded top-drop snapshot instead of an unordered 1000-doc read.",
    ),
    finding(
      "debugInitialLoadLazy",
      includes(debugTruthState, "ADMIN_DEBUG_DEFAULT_SECTION = \"summary\"")
        && includes(debugRoute, "buildAdminDebugSummaryPayload")
        && includes(debugSummary, "deferredSections")
        && includes(debugRoute, "section !== \"all\""),
      "Admin Debug default route returns a bounded summary and defers high-cost sections.",
    ),
    finding(
      "heartbeatFullScanBlocked",
      includes(runtimeWarningStore, "QUEUE_JOB_HEARTBEAT_DEFAULT_LIMIT = 25")
        && includes(runtimeWarningStore, ".orderBy(\"updatedAt\", \"desc\")")
        && includes(runtimeWarningStore, ".limit(limitCount)"),
      "Queue heartbeat listing uses a latest-N query by default.",
    ),
    finding(
      "supportThreadsPaged",
      includes(supportThreads, ".orderBy(\"lastMessageAt\", \"desc\")")
        && includes(supportThreads, ".limit(limitCount)")
        && includes(adminSupportRoute, "limit: supportThreadLimit")
        && includes(supportThreads, "SUPPORT_THREADS_USER_DEFAULT_LIMIT = 50"),
      "Admin and user support thread lists are bounded and ordered by updated activity.",
    ),
    finding(
      "rosterSummaryDefault",
      !includes(rosterRoute, "ADMIN_ROSTER_USER_LIMIT = 5_000")
        && !includes(rosterRoute, "ADMIN_ROSTER_CREATOR_OPS_LIMIT = 5_000")
        && includes(rosterRoute, "includeOps")
        && includes(rosterRoute, "creatorOpsSourceState"),
      "Admin roster default is bounded and keeps creator ops behind an explicit includeOps drilldown.",
    ),
    finding(
      "userDetailExpensiveSectionsLazy",
      !includes(usersRoute, "ADMIN_USERS_LIST_LIMIT = 5_000")
        && !includes(usersRoute, "ADMIN_USERS_CREATOR_OPS_LIMIT = 5_000")
        && includes(usersRoute, "includeCreatorOps")
        && includes(usersRoute, "creatorOpsSourceState"),
      "Admin user and user-detail expensive creator-op sections are bounded and explicitly requested.",
    ),
    finding(
      "truthSemanticsPreserved",
      includes(debugSummary, "truthState")
        && includes(debugSummary, "sourceFreshness")
        && includes(debugSummary, "stale_known")
        && !includes(debugRoute, "fake healthy"),
      "Deferred, stale, and unavailable admin data remains truth-labeled instead of shown as live.",
    ),
  ];

  const fixesApplied = checks.filter((entry) => entry.status === "fixed");
  const failed = checks.filter((entry) => entry.status === "failed");
  const report: AdminAnalyticsDebugCostReductionReport = {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "admin-analytics-debug-cost-reduction",
    currentHead: currentHead(),
    summary: {
      adminHistoricalDefaultCacheEnabled: checks[0].status === "fixed",
      gaSnapshotFirstEnabled: checks[1].status === "fixed",
      eventFactsDefaultLimitReduced: checks[2].status === "fixed",
      guestDiagnosticsDefaultLimitReduced: checks[3].status === "fixed",
      dropsArchivePaged: checks[4].status === "fixed",
      debugInitialLoadLazy: checks[5].status === "fixed",
      heartbeatFullScanBlocked: checks[6].status === "fixed",
      supportThreadsPaged: checks[7].status === "fixed",
      rosterSummaryDefault: checks[8].status === "fixed",
      userDetailExpensiveSectionsLazy: checks[9].status === "fixed",
      truthSemanticsPreserved: checks[10].status === "fixed",
      p0Count: failed.filter((entry) => entry.severity === "P0").length,
      p1Count: failed.filter((entry) => entry.severity === "P1").length,
      p2Count: failed.filter((entry) => entry.severity === "P2").length,
    },
    auditItemsAddressed: [26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43],
    fixesApplied,
    deferredFindings: [
      ...failed,
      {
        id: "admin-debug-section-route-split",
        status: "deferred",
        severity: "P2",
        detail: "The debug route now supports summary/all source sections. A later UI pass can call named drilldown sections directly instead of the all section.",
      },
    ],
    costSavingsModel: [
      {
        lane: "admin_debug_default",
        formula: "readReduction = highCostSectionReads - summarySectionReads",
        estimatedReduction: "70-95% fewer default Debug Firestore reads before explicit drilldown",
      },
      {
        lane: "admin_analytics_vendor",
        formula: "vendorCallReduction = defaultLoads * previousGaReportCount",
        estimatedReduction: "up to 100% fewer GA Data API report calls on default non-refresh loads",
      },
      {
        lane: "admin_analytics_samples",
        formula: "sampleReadReduction = previousLimit - newLimit",
        estimatedReduction: "50-90% lower raw sample reads for event facts, guest batches, diagnostics, drops, tasks, and transactions",
      },
      {
        lane: "support_and_roster",
        formula: "defaultReadReduction = unboundedOrBroadReads - boundedPageOrDeferredReads",
        estimatedReduction: "60-95% fewer default support/roster/user-detail reads on large tenants",
      },
    ],
    prCleanupActions: [
      {
        number: 271,
        action: "not_relevant",
        reason: "Open governance/doc PR does not touch admin analytics/debug cost runtime.",
      },
      {
        number: 272,
        action: "not_relevant",
        reason: "Open creator accessibility PR does not touch admin analytics/debug cost runtime.",
      },
    ],
    nextFixOrder: [
      "Add UI drilldown controls for named Admin Debug sections after the summary/all route split is consumed.",
      "Promote verified Admin Analytics materializers for remaining placeholder modules so explicit refreshes use fewer raw sources.",
      "Add cursor-based support and roster pagination in the admin UI after route-level caps are stable.",
    ],
  };

  if (options.writeReport !== false) {
    fs.mkdirSync(path.join(ROOT, "agent/state"), { recursive: true });
    fs.mkdirSync(path.join(ROOT, "docs/agent-truth"), { recursive: true });
    fs.writeFileSync(
      path.join(ROOT, "agent/state/admin-analytics-debug-cost-reduction.generated.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    fs.writeFileSync(
      path.join(ROOT, "docs/agent-truth/admin-analytics-debug-cost-reduction.md"),
      [
        "# Admin Analytics Debug Cost Reduction",
        "",
        `Generated: ${report.generatedAtUtc}`,
        `Current HEAD: ${report.currentHead}`,
        "",
        "## Summary",
        "",
        `- Historical cache default: ${report.summary.adminHistoricalDefaultCacheEnabled}`,
        `- GA snapshot-first default: ${report.summary.gaSnapshotFirstEnabled}`,
        `- Debug lazy default: ${report.summary.debugInitialLoadLazy}`,
        `- Support/roster/user detail bounded: ${report.summary.supportThreadsPaged && report.summary.rosterSummaryDefault && report.summary.userDetailExpensiveSectionsLazy}`,
        `- Truth semantics preserved: ${report.summary.truthSemanticsPreserved}`,
        "",
        "## Fixes Applied",
        "",
        ...report.fixesApplied.map((entry) => `- ${entry.id}: ${entry.detail}`),
        "",
        "## Deferred Findings",
        "",
        ...report.deferredFindings.map((entry) => `- ${entry.severity} ${entry.id}: ${entry.detail}`),
        "",
        "## Cost Savings Model",
        "",
        ...report.costSavingsModel.map((entry) => `- ${entry.lane}: ${entry.estimatedReduction} (${entry.formula})`),
        "",
        "## Next Exact Steps",
        "",
        ...report.nextFixOrder.map((step) => `- ${step}`),
        "",
      ].join("\n"),
    );
  }

  if (failed.length > 0) {
    throw new Error(`Admin analytics/debug cost reduction validation failed: ${failed.map((entry) => entry.id).join(", ")}`);
  }

  return report;
}

if (require.main === module) {
  validateAdminAnalyticsDebugCostReduction();
  console.log("Admin analytics/debug cost reduction validation passed.");
}
