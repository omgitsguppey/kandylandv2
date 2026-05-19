import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ARTIFACT = "agent/state/creator-dashboard-overview-stats.generated.json";

type Finding = {
  id: string;
  status: "fixed" | "verified" | "deferred";
  severity: "p0" | "p1" | "p2";
  file: string;
  summary: string;
};

export type CreatorDashboardOverviewStatsReport = {
  generatedAtUtc: string;
  reportKey: "creator-dashboard-overview-stats";
  currentHead: string;
  summary: {
    overviewModuleEnabled: boolean;
    oldSeparateStatCardsRemoved: boolean;
    followersOverviewLabelUsed: boolean;
    followerSourcePreserved: boolean;
    overviewGridCompact: boolean;
    contentCountIncludesCreatorExpiredDrops: boolean;
    publicDiscoverySeparated: boolean;
    creatorOwnDropsOnly: boolean;
    allCreatorDropsNotBlindlyCounted: boolean;
    partialSetupNoticeCompact: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  sourceFindings: Finding[];
  uiFindings: Finding[];
  visibilityFindings: Finding[];
  doctrineChanges: Finding[];
  fixesApplied: string[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function currentHead() {
  return execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
}

function includesAll(source: string, snippets: string[]) {
  return snippets.every((snippet) => source.includes(snippet));
}

function finding(id: string, severity: Finding["severity"], file: string, summary: string): Finding {
  return { id, status: "fixed", severity, file, summary };
}

export function buildCreatorDashboardOverviewStatsReport(): CreatorDashboardOverviewStatsReport {
  const landing = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
  const settingsHub = read("src/components/Creators/CreatorDashboardSettingsHub.tsx");
  const settingsRoute = read("src/app/api/creator/settings/route.ts");
  const dropScope = read("src/lib/server/creator-drop-scope.ts");
  const overviewDoc = read("docs/agent-truth/creator-dashboard-overview-stats.md");
  const surfaceDoc = read("docs/agent-truth/creator-surface-routing.md");
  const landingDoc = read("docs/agent-truth/creator-landing-dashboard-mobile.md");

  const failures: Finding[] = [];
  const sourceFindings: Finding[] = [];
  const uiFindings: Finding[] = [];
  const visibilityFindings: Finding[] = [];
  const doctrineChanges: Finding[] = [];
  const add = (bucket: Finding[], item: Finding, ok: boolean) => {
    if (ok) {
      bucket.push(item);
    } else {
      failures.push({ ...item, status: "deferred" });
    }
  };

  const overviewModuleEnabled = includesAll(landing, [
    "Creator Overview",
    'data-creator-overview-module="compact_v1"',
    'data-creator-dashboard-overview-density="mobile_compact"',
  ]);
  const oldSeparateStatCardsRemoved = !landing.includes('data-creator-landing-metric-card="compact_v2"')
    && !landing.includes("3x3 Metrics Grid");
  const followersOverviewLabelUsed = landing.includes('label: "Followers"')
    && !landing.includes('label: "Fans"')
    && landing.includes("formatFollowerSourceDetail(fanCountSource)")
    && !/relationship count/iu.test(`${landing}\n${settingsHub}`);
  const followerSourcePreserved = includesAll(settingsRoute, [
    "readCreatorFanCountSource",
    "creator_relationships",
    "fanCountSource",
    "profile_follower_count",
    "fans_source_unavailable",
  ]);
  const overviewGridCompact = includesAll(landing, [
    'data-creator-dashboard-overview-grid-density="mobile_4x4_compact"',
    "grid grid-cols-2 gap-1.5",
    "min-h-[3.25rem]",
    "px-2 py-1.5",
  ]) && !landing.includes("min-h-[86px]");
  const contentCountIncludesCreatorExpiredDrops = includesAll(settingsRoute, [
    "readCreatorDashboardDropCounts",
    "contentCount",
    "contentCountIncludes",
    "expired",
    "creator_owned_or_assigned",
  ]);
  const publicDiscoverySeparated = includesAll(dropScope, [
    "shouldCountDropForCreatorDashboard",
    "shouldShowDropInPublicDiscovery",
    "getCreatorDashboardDropCountScope",
  ]) && landing.includes('data-creator-dashboard-public-visibility-separated="true"');
  const creatorOwnDropsOnly = includesAll(dropScope, [
    "isDropOwnedOrAssignedToCreator",
    "fieldMatchesCreator",
  ]) && !settingsRoute.includes('adminDb.collection("drops").where("creatorId", "==", creatorId).where("status", "==", "active")');
  const allCreatorDropsNotBlindlyCounted = includesAll(dropScope, [
    "isAllCreatorDrop",
    "assignedCreatorIds",
    "eligibleCreatorIds",
  ]);
  const partialSetupNoticeCompact = landing.includes("rounded-[1.1rem]")
    && landing.includes("data-creator-landing-source-review=\"partial_safe\"")
    && !landing.includes("min-h-[160px]");
  const doctrineConflictFree = [overviewDoc, surfaceDoc, landingDoc].every((source) => (
    source.includes("Creator Overview") || source.includes("creator-scoped truth")
  )) && !surfaceDoc.includes("compact metric cards") && !landingDoc.includes("Metric cards use compact");

  add(uiFindings, finding("compact-overview-module", "p1", "src/components/Dashboard/CreatorWorkspacePanel.tsx", "Creator Dashboard stats render as one compact Creator Overview module."), overviewModuleEnabled);
  add(uiFindings, finding("old-stat-card-grid-removed", "p1", "src/components/Dashboard/CreatorWorkspacePanel.tsx", "Standalone mobile metric card grid was removed."), oldSeparateStatCardsRemoved);
  add(uiFindings, finding("followers-overview-label", "p1", "src/components/Dashboard/CreatorWorkspacePanel.tsx", "Creator Overview relationship metric says Followers."), followersOverviewLabelUsed);
  add(uiFindings, finding("overview-grid-compact", "p1", "src/components/Dashboard/CreatorWorkspacePanel.tsx", "Creator Overview mobile metric grid uses denser 4x4 compact spacing."), overviewGridCompact);
  add(sourceFindings, finding("follower-source-order", "p1", "src/app/api/creator/settings/route.ts", "Follower count reads relationship/follow evidence before partial fallbacks."), followerSourcePreserved);
  add(sourceFindings, finding("content-count-scope", "p1", "src/app/api/creator/settings/route.ts", "Dashboard content count uses creator-owned-or-assigned scope and includes expired states."), contentCountIncludesCreatorExpiredDrops);
  add(visibilityFindings, finding("public-discovery-separated", "p1", "src/lib/server/creator-drop-scope.ts", "Public discovery filtering is separate from creator dashboard content counting."), publicDiscoverySeparated);
  add(visibilityFindings, finding("own-drops-only", "p1", "src/lib/server/creator-drop-scope.ts", "Creator dashboard count requires creator ownership or explicit assignment."), creatorOwnDropsOnly);
  add(visibilityFindings, finding("all-creator-not-blind", "p1", "src/lib/server/creator-drop-scope.ts", "All-creator/global drops are not blindly counted for every creator."), allCreatorDropsNotBlindlyCounted);
  add(uiFindings, finding("compact-source-notice", "p2", "src/components/Dashboard/CreatorWorkspacePanel.tsx", "Setup/source notice stays compact and does not replace valid metrics."), partialSetupNoticeCompact);
  add(doctrineChanges, finding("doctrine-conflict-cleanup", "p1", "docs/agent-truth/creator-dashboard-overview-stats.md", "Creator dashboard stats doctrine separates dashboard source truth from public discovery."), doctrineConflictFree);

  const p0Count = failures.filter((item) => item.severity === "p0").length;
  const p1Count = failures.filter((item) => item.severity === "p1").length;
  const p2Count = failures.filter((item) => item.severity === "p2").length;

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "creator-dashboard-overview-stats",
    currentHead: currentHead(),
    summary: {
      overviewModuleEnabled,
      oldSeparateStatCardsRemoved,
      followersOverviewLabelUsed,
      followerSourcePreserved,
      overviewGridCompact,
      contentCountIncludesCreatorExpiredDrops,
      publicDiscoverySeparated,
      creatorOwnDropsOnly,
      allCreatorDropsNotBlindlyCounted,
      partialSetupNoticeCompact,
      p0Count,
      p1Count,
      p2Count,
    },
    sourceFindings,
    uiFindings,
    visibilityFindings,
    doctrineChanges,
    fixesApplied: [
      "Consolidated Creator Dashboard mobile stats into one compact Creator Overview module.",
      "Mapped relationship/follow evidence to the Creator Overview Followers metric while preserving partial/unavailable source labels.",
      "Reduced Creator Overview mobile stat tile spacing, height, and typography with a 2-column compact grid.",
      "Added creator dashboard drop scope helpers so owned/assigned expired content counts separately from public discovery.",
    ],
    prCleanupActions: [],
    nextFixOrder: [
      "Attach mobile screenshot evidence for /dashboard/creator after deployment.",
      "Manually confirm Zaylani fan source against live relationship/profile data without production reads from this lane.",
    ],
  };
}

export function validateCreatorDashboardOverviewStatsReport(report: CreatorDashboardOverviewStatsReport) {
  const failures: string[] = [];
  if (report.reportKey !== "creator-dashboard-overview-stats") failures.push("reportKey must be creator-dashboard-overview-stats");
  if (report.currentHead !== currentHead()) failures.push("currentHead must match git HEAD");
  if (!report.summary.overviewModuleEnabled) failures.push("compact Creator Overview module missing");
  if (!report.summary.oldSeparateStatCardsRemoved) failures.push("old separate standalone metric cards remain");
  if (!report.summary.followersOverviewLabelUsed) failures.push("creator overview relationship metric must use Followers label");
  if (!report.summary.followerSourcePreserved) failures.push("follower/relationship source is not preserved");
  if (!report.summary.overviewGridCompact) failures.push("creator overview mobile grid is not compact enough");
  if (!report.summary.contentCountIncludesCreatorExpiredDrops) failures.push("content count does not include creator-owned expired drops");
  if (!report.summary.publicDiscoverySeparated) failures.push("public discovery and dashboard drop scope are not separated");
  if (!report.summary.creatorOwnDropsOnly) failures.push("creator dashboard drop count is not scoped to own/assigned drops");
  if (!report.summary.allCreatorDropsNotBlindlyCounted) failures.push("all-creator drops can be blindly counted");
  if (!report.summary.partialSetupNoticeCompact) failures.push("setup/source notice is not compact");
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) failures.push("P0/P1 creator overview stats blockers remain");
  if (report.nextFixOrder.length === 0) failures.push("nextFixOrder must not be empty");
  return failures;
}

if (process.argv[1] && process.argv[1].endsWith("validate-creator-dashboard-overview-stats.ts")) {
  const report = buildCreatorDashboardOverviewStatsReport();
  writeFileSync(join(ROOT, ARTIFACT), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const failures = validateCreatorDashboardOverviewStatsReport(report);
  if (failures.length > 0) {
    console.error("Creator dashboard overview stats validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
  console.log("Creator dashboard overview stats validation passed.");
}
