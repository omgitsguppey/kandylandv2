import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import {
  DEBUG_TRACKING_SUMMARY_LANE_IDS,
  buildDebugPanelTrackingSummary,
} from "@/lib/debug/debug-panel-tracking-summary";

const REPORT_PATH = "agent/state/debug-tracking-simplification.generated.json";
const DOC_PATH = "docs/agent-truth/debug-tracking-simplification.md";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function gitOutput(command: string) {
  try {
    return execSync(command, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function listChangedFiles() {
  const names = new Set<string>();
  for (const command of ["git diff --name-only", "git diff --cached --name-only", "git ls-files --others --exclude-standard"]) {
    for (const line of gitOutput(command).split(/\r?\n/u)) {
      if (line.trim()) names.add(line.trim());
    }
  }
  return [...names].sort();
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function countOccurrences(source: string, text: string) {
  return source.split(text).length - 1;
}

function writeDoc(report: {
  generatedAtUtc: string;
  status: "pass" | "fail";
  currentHead: string;
  changedFiles: string[];
  checks: Record<string, boolean>;
  validationFailures: string[];
}) {
  mkdirSync(dirname(DOC_PATH), { recursive: true });
  writeFileSync(DOC_PATH, [
    "# Debug Tracking Simplification",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Contract",
    "",
    "- Admin Debug passes one tracking summary into the compact Now tab before source-heavy drilldowns.",
    "- The summary has one lane per tracking system: identity, consent, event envelope, behavior math, feature telemetry coverage, legacy recovery, wallet funnel, runtime/debug evidence, cost/4xx, and open P1/P2 backlog.",
    "- Each lane has a source owner, source of truth, status, severity, score impact, and drilldown target.",
    "- Raw tables and dumps remain available behind drilldowns but do not render before the summary.",
    "- The compact `/api/admin/debug` response includes the tracking summary by default. Full raw detail still requires explicit drilldown.",
    "- User, creator, chat, and navigation surfaces are protected from this admin-only pass.",
    "",
    "## Checks",
    "",
    ...Object.entries(report.checks).map(([key, passed]) => `- ${passed ? "pass" : "fail"}: ${key}`),
    "",
    "## Changed Files",
    "",
    ...(report.changedFiles.length > 0 ? report.changedFiles.map((file) => `- ${file}`) : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length > 0 ? report.validationFailures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n"));
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = gitOutput("git rev-parse HEAD") || "unknown";
  const changedFiles = listChangedFiles();
  const failures: string[] = [];

  const summarySource = read("src/lib/debug/debug-panel-tracking-summary.ts");
  const panelSource = read("src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx");
  const pageSource = read("src/app/admin/debug/page.tsx");
  const nowTabSource = read("src/app/admin/debug/components/DebugTabNow.tsx");
  const compactRouteSource = read("src/lib/server/admin-debug/summary.ts");
  const fullRouteSource = read("src/app/api/admin/debug/route.ts");
  const testSource = read("tests/unit/debug-tracking-simplification.spec.ts");
  const packageJson = read("package.json");

  const summary = buildDebugPanelTrackingSummary({
    identityHandoff: { status: "live", duplicateCountGuardActive: true },
    eventEnvelope: { status: "live", missingEnvelopeFieldsByFeature: [] },
    legacyRecovery: { status: "ready_for_dry_run_review", mutationsAllowed: false },
    telemetryHealth: {
      summary: { degraded: 1, runtimeUnproven: 1, unavailable: 0, configMissing: 0 },
      lanes: [{ id: "client_tracking" }, { id: "event_facts" }],
    },
    behavioralSnapshotStatus: { status: "source_ready" },
    routeRuntimeHealthSummary: { fail: 0, warn: 1, stale: 1 },
    runtimeWarningSummary: { failed: 0, degraded: 1, total: 2 },
    debugBacklogSummary: { p0P1Open: 1, open: 4 },
    stats: { receiptsLast7d: 3 },
    costControls: { status: "bounded_initial_summary" },
  });
  const laneIds = summary.lanes.map((lane) => lane.id);
  const chatFunctionalityLockScoped = changedFiles.includes("scripts/agent/validate-chat-functionality-score-lock.ts")
    && changedFiles.includes("src/lib/chat/chat-telemetry-contract.ts");
  const allowedChatFunctionalityLockFiles = new Set([
    "src/components/Chat/ChatExperience.tsx",
    "src/lib/chat/chat-telemetry-contract.ts",
    "src/lib/server/chat.ts",
  ]);
  const protectedChangedFiles = changedFiles.filter((file) =>
    (
      /(^|\/)(chat|top-nav|bottom-nav|navbar|navigation)(\/|\.|$)/iu.test(file)
        || /^src\/app\/(creator|creator-dashboard|profile|drops|wallet|chat)\//u.test(file)
        || /^src\/components\/(Chat|Navigation|Navbar|TopNav|BottomNav|Creator|Wallet)\b/u.test(file)
    )
    && !(chatFunctionalityLockScoped && allowedChatFunctionalityLockFiles.has(file)));

  const checks = {
    summaryContractExists: summarySource.includes("buildDebugPanelTrackingSummary") && summarySource.includes("DEBUG_TRACKING_SUMMARY_LANE_IDS"),
    requiredLanesPresent: DEBUG_TRACKING_SUMMARY_LANE_IDS.every((id) => laneIds.includes(id)),
    oneTrackingSystemPerLane: new Set(summary.lanes.map((lane) => lane.trackingSystem)).size === summary.lanes.length
      && summary.validation.duplicateTrackingSystems.length === 0,
    everyLaneHasOwnerAndSource: summary.lanes.every((lane) => Boolean(lane.sourceOwner && lane.sourceOfTruth && lane.drilldownTarget)),
    rawDetailsCollapsedByDefault: summary.rawDetailsDefaultOpen === false
      && summary.rawDetailPolicy === "drilldown_only"
      && panelSource.includes("data-admin-debug-raw-default={String(Boolean(trackingSummary?.rawDetailsDefaultOpen))}"),
    panelRendersBeforeTabDrilldowns: pageSource.includes("trackingSummary={data?.trackingSummary}")
      && !pageSource.includes("<DebugTrackingSummaryPanel trackingSummary={data?.trackingSummary} />")
      && nowTabSource.indexOf("<DebugTrackingSummaryPanel trackingSummary={trackingSummary} />") > -1
      && nowTabSource.indexOf("<DebugTrackingSummaryPanel trackingSummary={trackingSummary} />") < nowTabSource.indexOf("<DebugRecoveryEvidenceSummary"),
    compactRouteIncludesSummaryByDefault: compactRouteSource.includes("trackingSummary")
      && compactRouteSource.includes("buildDebugPanelTrackingSummary")
      && fullRouteSource.includes("section === \"all\"")
      && fullRouteSource.includes("buildAdminDebugSummaryPayload"),
    fullRouteIncludesSummary: fullRouteSource.includes("trackingSummary: buildDebugPanelTrackingSummary"),
    p1P2BacklogSurfaced: summary.validation.p1P2BacklogSurfaced === true
      && summary.lanes.some((lane) => lane.id === "open_p1_p2_backlog" && lane.criticalCount > 0),
    defaultPanelAvoidsRawDumps: !panelSource.includes("<pre")
      && countOccurrences(panelSource, "<details") >= 1
      && panelSource.includes("Raw tables and dumps stay collapsed"),
    duplicateMonitorGroupsModeled: [
      "identity",
      "consent",
      "event_envelope",
      "behavior_math",
      "feature_coverage",
      "legacy_recovery",
      "wallet_funnel",
      "runtime_debug",
      "cost",
      "backlog",
    ].every((group) => summary.duplicateMonitorGroups.includes(group)),
    unitTestCoversSummary: testSource.includes("raw details collapsed") && testSource.includes("p1 or p2 backlog"),
    packageScriptPresent: packageJson.includes('"check:debug-tracking-simplification": "tsx scripts/agent/validate-debug-tracking-simplification.ts"'),
    userCreatorChatNavUntouched: protectedChangedFiles.length === 0,
  };

  for (const [key, passed] of Object.entries(checks)) {
    if (!passed) failures.push(key);
  }

  const report = {
    generatedAtUtc,
    reportKey: "debug-tracking-simplification",
    currentHead,
    status: failures.length > 0 ? "fail" as const : "pass" as const,
    changedFiles,
    summary: {
      defaultView: summary.defaultView,
      rawDetailPolicy: summary.rawDetailPolicy,
      laneCount: summary.lanes.length,
      p1LaneCount: summary.lanes.filter((lane) => lane.severity === "p1").length,
      p2LaneCount: summary.lanes.filter((lane) => lane.severity === "p2").length,
      duplicateTrackingSystems: summary.validation.duplicateTrackingSystems,
      p1P2BacklogSurfaced: summary.validation.p1P2BacklogSurfaced,
    },
    laneIds: summary.lanes.map((lane) => lane.id),
    checks,
    protectedChangedFiles,
    validationFailures: failures,
  };

  writeJson(REPORT_PATH, report);
  writeDoc(report);

  if (failures.length > 0) {
    console.error(`Debug tracking simplification validation failed: ${failures.join(", ")}`);
    process.exit(1);
  }

  console.log(`Debug tracking simplification validation passed with ${summary.lanes.length} summary lanes.`);
}

main();
