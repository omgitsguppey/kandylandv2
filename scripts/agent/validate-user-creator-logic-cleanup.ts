import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type Severity = "p0" | "p1" | "p2";
type FindingStatus = "fixed" | "verified" | "deferred" | "blocked";

type Finding = {
  id: string;
  status: FindingStatus;
  severity: Severity;
  file: string;
  summary: string;
};

export type UserCreatorLogicCleanupReport = {
  generatedAtUtc: string;
  reportKey: "user-creator-logic-cleanup";
  currentHead: string;
  summary: {
    conflictsFound: number;
    conflictsFixed: number;
    monolithsSplit: number;
    routeConstantsConsolidated: boolean;
    surfaceGatesNormalized: boolean;
    fanPassCrmConsolidated: boolean;
    broadcastAudienceConsolidated: boolean;
    userDashboardPreserved: boolean;
    creatorDashboardPreserved: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  conflictFindings: Finding[];
  splitFindings: Finding[];
  staleLogicRemoved: Finding[];
  routeFindings: Finding[];
  crmFindings: Finding[];
  fixesApplied: string[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, "..", "..");
const artifactPath = join(root, "agent/state/user-creator-logic-cleanup.generated.json");
const docPath = join(root, "docs/agent-truth/user-creator-logic-cleanup.md");

const splitModulePaths = [
  "src/components/Dashboard/creator-workspace/CreatorDashboardOverviewModule.tsx",
  "src/components/Dashboard/creator-workspace/CreatorDashboardQuickActions.tsx",
  "src/components/Dashboard/creator-workspace/CreatorBroadcastCard.tsx",
  "src/components/Dashboard/creator-workspace/CreatorActionQueuePanel.tsx",
  "src/components/Dashboard/creator-workspace/CreatorFanPassCrmPanel.tsx",
  "src/components/Dashboard/creator-workspace/CreatorDashboardSourceNotice.tsx",
] as const;

function read(relativePath: string) {
  const path = join(root, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
}

function lineCount(source: string) {
  return source.split(/\r?\n/u).length;
}

function includesAll(source: string, needles: string[]) {
  return needles.every((needle) => source.includes(needle));
}

function hasAny(source: string, needles: string[]) {
  return needles.some((needle) => source.includes(needle));
}

function finding(id: string, severity: Severity, file: string, summary: string, ok: boolean): Finding {
  return { id, severity, file, summary, status: ok ? "fixed" : "blocked" };
}

function verified(id: string, severity: Severity, file: string, summary: string): Finding {
  return { id, severity, file, summary, status: "verified" };
}

function countActive(findings: Finding[], severity: Severity) {
  return findings.filter((entry) => entry.severity === severity && (entry.status === "blocked" || entry.status === "deferred")).length;
}

function splitModulesExistAndAreFocused() {
  return splitModulePaths.every((path) => {
    const source = read(path);
    return source.length > 0 && lineCount(source) < 300;
  });
}

function writeDoc(report: UserCreatorLogicCleanupReport) {
  const lines = [
    "# User Creator Logic Cleanup",
    "",
    `Generated source: \`agent/state/user-creator-logic-cleanup.generated.json\``,
    "",
    "## Result",
    "",
    `- Conflicts found: ${report.summary.conflictsFound}`,
    `- Conflicts fixed: ${report.summary.conflictsFixed}`,
    `- Monoliths split: ${report.summary.monolithsSplit}`,
    `- Route constants consolidated: ${report.summary.routeConstantsConsolidated ? "yes" : "no"}`,
    `- Creator dashboard preserved: ${report.summary.creatorDashboardPreserved ? "yes" : "no"}`,
    `- User dashboard preserved: ${report.summary.userDashboardPreserved ? "yes" : "no"}`,
    "",
    "## Fixed Conflicts",
    "",
    ...report.fixesApplied.map((item) => `- ${item}`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((item) => `- ${item}`),
    "",
    "## Validation",
    "",
    "Run:",
    "",
    "```bash",
    "npm run check:user-creator-logic-cleanup",
    "```",
    "",
  ];

  mkdirSync(dirname(docPath), { recursive: true });
  writeFileSync(docPath, `${lines.join("\n")}\n`, "utf8");
}

export function buildUserCreatorLogicCleanupReport(): UserCreatorLogicCleanupReport {
  const workspacePath = "src/components/Dashboard/CreatorWorkspacePanel.tsx";
  const dashboardPath = "src/app/dashboard/DashboardClient.tsx";
  const routingPath = "src/lib/creator-profile-routing.ts";
  const workspace = read(workspacePath);
  const dashboard = read(dashboardPath);
  const routing = read(routingPath);
  const splitSources = splitModulePaths.map((path) => read(path)).join("\n");
  const creatorSurface = `${read("src/app/dashboard/creator/page.tsx")}\n${workspace}\n${splitSources}`;
  const navSource = [
    read("src/components/Navigation/ProfileSidebar.tsx"),
    read("src/components/Navigation/ProfileDropdown.tsx"),
    read("src/components/Navigation/MobileBottomBar.tsx"),
  ].join("\n");
  const oldLandingValidator = read("scripts/agent/validate-creator-landing-dashboard-mobile.ts");
  const oldLandingTest = read("tests/unit/creator-landing-dashboard-mobile.spec.ts");
  const oldLandingDoc = read("docs/agent-truth/creator-landing-dashboard-mobile.md");

  const workspaceSplit = splitModulesExistAndAreFocused() &&
    lineCount(workspace) < 500 &&
    includesAll(workspace, [
      "CreatorDashboardOverviewModule",
      "CreatorDashboardQuickActions",
      "CreatorBroadcastCard",
      "CreatorActionQueuePanel",
      "CreatorFanPassCrmPanel",
      "CreatorDashboardSourceNotice",
    ]);
  const routeConstantsConsolidated = includesAll(routing, [
    'CREATOR_DASHBOARD_ROUTE = "/dashboard/creator"',
    'CREATOR_SETTINGS_ROUTE = "/dashboard/creator/settings"',
    'CREATOR_DROP_MANAGE_ROUTE = "/dashboard/creator/drops"',
    'USER_SETTINGS_ROUTE = "/dashboard/settings"',
    'USER_LIBRARY_ROUTE = "/dashboard/library"',
  ]) && !/CREATOR_DROP_MANAGE_ROUTE = "\/dashboard\/library"/u.test(routing);
  const surfaceGatesNormalized = includesAll(creatorSurface, [
    'data-dashboard-surface="creator_dashboard"',
    'data-creator-dashboard-content-boundary="creator_only"',
    'data-user-dashboard-modules-rendered="false"',
  ]) && includesAll(dashboard, [
    'data-dashboard-surface="user_dashboard"',
    "router.replace(CREATOR_DASHBOARD_ROUTE)",
  ]);
  const userDashboardPreserved = includesAll(dashboard, ["<DailyCheckIn", "<CreatorDiscoveryRail", "<RecentActivityFeed", "<CollectionList"]);
  const creatorDashboardPreserved = includesAll(creatorSurface, ["CreatorWorkspacePanel", "CreatorDashboardOverviewModule", "CreatorDashboardQuickActions"])
    && !hasAny(creatorSurface, ["<DailyCheckIn", "<CreatorDiscoveryRail", "<RecentActivityFeed", "<CollectionList", "Owned / Locked"]);
  const fanPassCrmConsolidated = splitSources.includes("FanPassSubscriberRow")
    && splitSources.includes('data-fan-pass-crm="mobile_v1"')
    && read("src/components/Creators/FanPassSubscriberRow.tsx").includes('data-raw-user-id-hidden="true"')
    && !`${splitSources}\n${read("src/components/Creators/CreatorFanPassManager.tsx")}`.includes("subscription.userId || subscription.id");
  const broadcastAudienceConsolidated = splitSources.includes('data-broadcast-audience="all_fans"')
    && splitSources.includes("Audience: Fans")
    && !/all followers|Tell followers|Broadcast sent to followers|for followers/iu.test(splitSources);
  const staleLandingLogicRemoved = includesAll(`${oldLandingValidator}\n${oldLandingTest}\n${oldLandingDoc}`, [
    'CREATOR_DROP_MANAGE_ROUTE = "/dashboard/creator/drops"',
    'CREATOR_DROP_ROUTE_STATE = "creator_submission"',
    "/dashboard/creator/drops",
  ]) && !/CREATOR_DROP_MANAGE_ROUTE = "\/dashboard\/library"|createDropRouteState.*manage_only|createDropHref.*\/dashboard\/library/u.test(`${oldLandingValidator}\n${oldLandingTest}\n${oldLandingDoc}`);
  const routeConstantsDuplicated = /href="\/dashboard\/creator"|href="\/dashboard\/creator\/settings"|href="\/dashboard\/settings"/u.test(navSource);

  const conflictFindings = [
    verified("creator-workspace-monolith", "p1", workspacePath, "CreatorWorkspacePanel mixed route shell, overview, actions, broadcasts, queues, CRM, and source notices before this split."),
    verified("stale-creator-landing-route-contract", "p1", "scripts/agent/validate-creator-landing-dashboard-mobile.ts", "Older creator landing validator still pointed Manage drops at My KandyDrops before this cleanup."),
  ];
  const splitFindings = [
    finding("creator-workspace-split", "p1", workspacePath, "Creator workspace rendering is split into focused modules and the orchestration file is below 500 lines.", workspaceSplit),
  ];
  const staleLogicRemoved = [
    finding("stale-landing-manage-only-route-removed", "p1", "tests/unit/creator-landing-dashboard-mobile.spec.ts", "Stale Manage drops to My KandyDrops expectations were replaced with creator submission route truth.", staleLandingLogicRemoved),
  ];
  const routeFindings = [
    finding("route-constants-consolidated", "p1", routingPath, "Creator and user route constants have one source of truth, including USER_LIBRARY_ROUTE.", routeConstantsConsolidated),
    finding("surface-gates-normalized", "p1", "src/app/dashboard", "Creator and user dashboard route bodies remain separated.", surfaceGatesNormalized),
    finding("user-dashboard-preserved", "p1", dashboardPath, "Normal user dashboard modules remain on /dashboard.", userDashboardPreserved),
    finding("creator-dashboard-preserved", "p1", workspacePath, "Creator dashboard modules remain on /dashboard/creator without user dashboard leakage.", creatorDashboardPreserved),
    finding("duplicate-inline-dashboard-routes-removed", "p2", "src/components/Navigation", "Navigation uses route constants instead of duplicated dashboard/settings literals.", !routeConstantsDuplicated),
  ];
  const crmFindings = [
    finding("fan-pass-crm-consolidated", "p1", "src/components/Dashboard/creator-workspace/CreatorFanPassCrmPanel.tsx", "Fan Pass CRM uses the shared readable subscriber row.", fanPassCrmConsolidated),
    finding("broadcast-audience-consolidated", "p1", "src/components/Dashboard/creator-workspace/CreatorBroadcastCard.tsx", "Broadcast audience copy and marker stay explicit as Fans/all_fans.", broadcastAudienceConsolidated),
  ];
  const allFindings = [...splitFindings, ...staleLogicRemoved, ...routeFindings, ...crmFindings];

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "user-creator-logic-cleanup",
    currentHead: currentHead(),
    summary: {
      conflictsFound: conflictFindings.length,
      conflictsFixed: allFindings.filter((entry) => entry.status === "fixed").length,
      monolithsSplit: workspaceSplit ? 1 : 0,
      routeConstantsConsolidated,
      surfaceGatesNormalized,
      fanPassCrmConsolidated,
      broadcastAudienceConsolidated,
      userDashboardPreserved,
      creatorDashboardPreserved,
      p0Count: countActive(allFindings, "p0"),
      p1Count: countActive(allFindings, "p1"),
      p2Count: countActive(allFindings, "p2"),
    },
    conflictFindings,
    splitFindings,
    staleLogicRemoved,
    routeFindings,
    crmFindings,
    fixesApplied: [
      "Split CreatorWorkspacePanel rendering into focused creator dashboard modules while keeping the route export stable.",
      "Consolidated creator/user route constants and added USER_LIBRARY_ROUTE for the user-owned My KandyDrops surface.",
      "Updated stale creator landing route checks from manage-only library fallback to the creator drop submission route.",
      "Kept Fan Pass CRM row rendering and broadcast audience copy in single focused creator modules.",
    ],
    prCleanupActions: ["No open PRs were present at start of cleanup."],
    nextFixOrder: [
      "Keep future creator dashboard additions inside focused creator-workspace modules instead of growing CreatorWorkspacePanel.",
      "Handle admin analytics/debug monolith cleanup in a separate admin-scoped pass.",
      "Attach mobile screenshot evidence for creator and user dashboard route boundaries after deployment.",
    ],
  };
}

export function validateUserCreatorLogicCleanupReport(report: UserCreatorLogicCleanupReport) {
  const failures: string[] = [];
  if (report.reportKey !== "user-creator-logic-cleanup") failures.push("reportKey must be user-creator-logic-cleanup");
  if (report.currentHead !== currentHead()) failures.push("currentHead must match git HEAD");
  if (report.summary.conflictsFound < 1) failures.push("conflict map must record conflicts found before cleanup");
  if (report.summary.conflictsFixed < 1) failures.push("cleanup must record fixed conflicts");
  if (report.summary.monolithsSplit < 1) failures.push("creator workspace monolith split was required but not completed");
  if (!report.summary.routeConstantsConsolidated) failures.push("route constants are not consolidated");
  if (!report.summary.surfaceGatesNormalized) failures.push("surface gates are not normalized");
  if (!report.summary.fanPassCrmConsolidated) failures.push("Fan Pass CRM rendering is not consolidated");
  if (!report.summary.broadcastAudienceConsolidated) failures.push("broadcast audience config is not consolidated");
  if (!report.summary.userDashboardPreserved) failures.push("normal user dashboard modules are not preserved");
  if (!report.summary.creatorDashboardPreserved) failures.push("creator dashboard modules are not preserved");
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) failures.push("unresolved P0/P1 user creator logic conflicts remain");
  if (report.nextFixOrder.length === 0) failures.push("nextFixOrder must not be empty");
  return failures;
}

function main() {
  const report = buildUserCreatorLogicCleanupReport();
  mkdirSync(dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeDoc(report);
  const failures = validateUserCreatorLogicCleanupReport(report);

  if (failures.length > 0) {
    console.error("User/creator logic cleanup validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`User/creator logic cleanup passed: conflicts=${report.summary.conflictsFound}, fixed=${report.summary.conflictsFixed}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
