import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
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

export type CreatorNavRoleConsolidationReport = {
  generatedAtUtc: string;
  reportKey: "creator-nav-role-consolidation";
  currentHead: string;
  summary: {
    routeMatrixCanonical: boolean;
    staleDoctrineRemoved: boolean;
    duplicateNavConstantsRemoved: boolean;
    accountSettingsLabelCanonical: boolean;
    creatorDashboardRouteCanonical: boolean;
    creatorSettingsRouteCanonical: boolean;
    userDashboardModulesBlockedOnCreatorRoute: boolean;
    normalUserDashboardPreserved: boolean;
    fanPassCrmUsesReadableIdentity: boolean;
    broadcastAudienceExplicit: boolean;
    oldFollowersCopyRemoved: boolean;
    oldMetricGridRemoved: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  doctrineFindings: Finding[];
  routeFindings: Finding[];
  navFindings: Finding[];
  crmFindings: Finding[];
  backendFindings: Finding[];
  fixesApplied: string[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactPath = join(repoRoot, "agent/state/creator-nav-role-consolidation.generated.json");

function read(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readCreatorWorkspaceModules() {
  const folder = join(repoRoot, "src/components/Dashboard/creator-workspace");
  if (!existsSync(folder)) return "";
  return readdirSync(folder)
    .filter((name) => /\.(ts|tsx)$/u.test(name))
    .sort()
    .map((name) => read(`src/components/Dashboard/creator-workspace/${name}`))
    .join("\n");
}

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function includesAll(source: string, snippets: string[]) {
  return snippets.every((snippet) => source.includes(snippet));
}

function finding(id: string, severity: Severity, file: string, summary: string, status: FindingStatus = "fixed"): Finding {
  return { id, severity, file, summary, status };
}

function blockedUnless(ok: boolean, id: string, severity: Severity, file: string, summary: string) {
  return finding(id, severity, file, summary, ok ? "fixed" : "blocked");
}

function countSeverity(findings: Finding[], severity: Severity) {
  return findings.filter((entry) => entry.severity === severity && (entry.status === "blocked" || entry.status === "deferred")).length;
}

function hasAny(source: string, needles: string[]) {
  return needles.some((needle) => source.includes(needle));
}

function creatorFacingFollowersCopyExists(source: string) {
  return /all followers|Tell followers|Broadcast sent to followers|for followers|blast to all followers/iu.test(source);
}

export function buildCreatorNavRoleConsolidationReport(): CreatorNavRoleConsolidationReport {
  const routing = read("src/lib/creator-profile-routing.ts");
  const sidebar = read("src/components/Navigation/ProfileSidebar.tsx");
  const dropdown = read("src/components/Navigation/ProfileDropdown.tsx");
  const bottomNav = read("src/components/Navigation/MobileBottomBar.tsx");
  const dashboardClient = read("src/app/dashboard/DashboardClient.tsx");
  const creatorPage = read("src/app/dashboard/creator/page.tsx");
  const workspace = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
  const workspaceModules = readCreatorWorkspaceModules();
  const fanPassManager = read("src/components/Creators/CreatorFanPassManager.tsx");
  const subscriberRow = read("src/components/Creators/FanPassSubscriberRow.tsx");
  const broadcastManager = read("src/components/Creators/CreatorBroadcastManager.tsx");
  const broadcastsRoute = read("src/app/api/creator/broadcasts/route.ts");
  const subscriptionsRoute = read("src/app/api/creator/subscriptions/route.ts");
  const profileCreatorTools = read("src/app/dashboard/profile/components/ProfileCreatorToolsSection.tsx");
  const profileState = read("src/app/dashboard/profile/hooks/useProfileState.tsx");
  const consolidationDoc = read("docs/agent-truth/creator-nav-role-consolidation.md");
  const docs = [
    consolidationDoc,
    read("docs/agent-truth/creator-surface-routing.md"),
    read("docs/agent-truth/creator-dashboard-role-boundary.md"),
    read("docs/agent-truth/creator-fan-pass-crm-broadcast.md"),
    read("docs/agent-truth/creator-dashboard-overview-stats.md"),
    read("docs/agent-truth/user-creator-ui-parity.md"),
    read("docs/agent-truth/creator-settings-source-health.md"),
  ].join("\n");
  const creatorSurface = `${creatorPage}\n${workspace}\n${workspaceModules}`;
  const creatorUi = `${workspace}\n${workspaceModules}\n${fanPassManager}\n${subscriberRow}\n${broadcastManager}\n${profileCreatorTools}\n${profileState}`;
  const nav = `${sidebar}\n${dropdown}\n${bottomNav}`;
  const userModuleNeedles = ["<DailyCheckIn", "<CreatorDiscoveryRail", "<RecentActivityFeed", "<CollectionList", "Owned / Locked", 'data-library-tabs="owned_locked"'];

  const routeMatrixCanonical = includesAll(routing, [
    'CREATOR_DASHBOARD_ROUTE = "/dashboard/creator"',
    'CREATOR_SETTINGS_ROUTE = "/dashboard/creator/settings"',
    'USER_SETTINGS_ROUTE = "/settings"',
    'USER_PROFILE_ROUTE = "/settings"',
  ]) && includesAll(consolidationDoc, [
    "| `/dashboard` | User dashboard surface |",
    "| `/dashboard/creator` | Creator dashboard landing |",
    "| `CREATOR_SETTINGS_ROUTE` | Creator settings/workspace |",
    "| `/settings` | Account Settings |",
    "| `/dashboard/settings`, `/dashboard/profile`, `/profile/settings`, `/account` | Account Settings redirects |",
  ]);
  const staleDoctrineRemoved = !/Creator Settings is the same as Account Settings|creator dashboard includes user dashboard below it|public discovery visibility is creator dashboard content count truth/iu.test(docs)
    && !/raw user IDs are acceptable normal subscriber CRM labels/iu.test(docs);
  const duplicateNavConstantsRemoved = includesAll(nav, ["CREATOR_DASHBOARD_ROUTE", "CREATOR_SETTINGS_ROUTE", "USER_SETTINGS_ROUTE"])
    && !/href="\/settings"/u.test(`${sidebar}\n${dropdown}`)
    && !/label="Settings"|title="Settings"|aria-label="Open settings"/u.test(`${sidebar}\n${dropdown}`);
  const accountSettingsLabelCanonical = includesAll(`${sidebar}\n${dropdown}`, ['label="Account Settings"', "href={USER_SETTINGS_ROUTE}"]);
  const creatorDashboardRouteCanonical = includesAll(nav, ['label="Creator Dashboard"', "href={CREATOR_DASHBOARD_ROUTE}"])
    && bottomNav.includes("creatorDashboardHref")
    && bottomNav.includes("CREATOR_DASHBOARD_ROUTE");
  const creatorSettingsRouteCanonical = includesAll(nav, ['label="Creator Settings"', "href={CREATOR_SETTINGS_ROUTE}"]);
  const userDashboardModulesBlockedOnCreatorRoute = creatorPage.includes("CreatorDashboardLandingRoute")
    && includesAll(creatorSurface, [
      'data-dashboard-surface="creator_dashboard"',
      'data-creator-dashboard-content-boundary="creator_only"',
      'data-user-dashboard-modules-rendered="false"',
    ])
    && !hasAny(creatorSurface, userModuleNeedles);
  const normalUserDashboardPreserved = includesAll(dashboardClient, [
    'data-dashboard-surface="user_dashboard"',
    "<DailyCheckIn",
    "<CreatorDiscoveryRail",
    "<RecentActivityFeed",
    "<CollectionList",
    "router.replace(CREATOR_DASHBOARD_ROUTE)",
  ]) && !dashboardClient.includes("CreatorWorkspacePanel");
  const fanPassCrmUsesReadableIdentity = includesAll(`${workspace}\n${workspaceModules}\n${fanPassManager}`, ["FanPassSubscriberRow", 'data-fan-pass-crm="mobile_v1"'])
    && includesAll(subscriberRow, ["fanLabel", "fanHandle", "fanDisplayName", 'data-raw-user-id-hidden="true"'])
    && includesAll(subscriptionsRoute, ["fanUsername", "fanDisplayName", "fanIdentitySource"])
    && !creatorUi.includes("subscription.userId || subscription.id")
    && !fanPassManager.includes("shortUserId(subscriber.userId)");
  const broadcastAudienceExplicit = includesAll(`${workspace}\n${workspaceModules}\n${broadcastManager}`, ['data-broadcast-audience="all_fans"', "Audience: Fans"])
    && includesAll(broadcastsRoute, ["CREATOR_BROADCAST_SUPPORTED_AUDIENCE", "supportedAudience", "all_fans"]);
  const oldFollowersCopyRemoved = !creatorFacingFollowersCopyExists(creatorUi);
  const oldMetricGridRemoved = creatorSurface.includes('data-creator-overview-module="compact_v1"')
    && creatorSurface.includes('data-creator-dashboard-overview-density="mobile_compact"')
    && !creatorSurface.includes('data-creator-landing-metric-card="compact_v2"');

  const doctrineFindings = [
    blockedUnless(routeMatrixCanonical, "route-matrix-doc", "p1", "docs/agent-truth/creator-nav-role-consolidation.md", "Canonical creator/user route matrix is documented."),
    blockedUnless(staleDoctrineRemoved, "stale-doctrine-removed", "p1", "docs/agent-truth/*.md", "Conflicting creator settings, followers, raw id, public discovery, and dashboard stacking doctrine is absent."),
  ];
  const routeFindings = [
    blockedUnless(routeMatrixCanonical, "route-constants-canonical", "p1", "src/lib/creator-profile-routing.ts", "Creator dashboard, creator settings, account settings, and profile route constants are canonical."),
    blockedUnless(userDashboardModulesBlockedOnCreatorRoute, "creator-dashboard-route-scoped", "p1", "src/app/dashboard/creator/page.tsx", "/dashboard/creator renders creator-only content."),
    blockedUnless(normalUserDashboardPreserved, "user-dashboard-preserved", "p1", "src/app/dashboard/DashboardClient.tsx", "/dashboard remains the normal user dashboard and redirects creator-role accounts."),
  ];
  const navFindings = [
    blockedUnless(duplicateNavConstantsRemoved, "nav-constants-consolidated", "p1", "src/components/Navigation", "Visible nav uses canonical route constants without duplicate account settings literals."),
    blockedUnless(accountSettingsLabelCanonical, "account-settings-label", "p1", "src/components/Navigation", "Account menus label USER_SETTINGS_ROUTE as Account Settings."),
    blockedUnless(creatorDashboardRouteCanonical, "creator-dashboard-nav", "p1", "src/components/Navigation", "Creator Dashboard nav points to /dashboard/creator."),
    blockedUnless(creatorSettingsRouteCanonical, "creator-settings-nav", "p1", "src/components/Navigation", "Creator Settings nav points to /dashboard/creator/settings."),
  ];
  const crmFindings = [
    blockedUnless(fanPassCrmUsesReadableIdentity, "crm-readable-identity", "p1", "src/components/Creators/FanPassSubscriberRow.tsx", "Fan Pass CRM uses hydrated readable fan identity and hides raw ids."),
    blockedUnless(broadcastAudienceExplicit, "broadcast-audience-explicit", "p1", "src/components/Creators/CreatorBroadcastManager.tsx", "Broadcast UI and route expose explicit Fans audience."),
    blockedUnless(oldFollowersCopyRemoved, "followers-copy-removed", "p1", "src/app/dashboard/profile", "Creator-facing broadcast copy says Fans instead of followers."),
    blockedUnless(oldMetricGridRemoved, "old-metric-grid-removed", "p1", "src/components/Dashboard/CreatorWorkspacePanel.tsx", "Creator Dashboard uses one compact overview module."),
  ];
  const backendFindings = [
    blockedUnless(subscriptionsRoute.includes("identityFieldsRedacted: true"), "subscriber-privacy-redacted", "p1", "src/app/api/creator/subscriptions/route.ts", "Subscriber API redacts private identity fields in normal creator responses."),
    blockedUnless(broadcastsRoute.includes("unsupported_broadcast_audience"), "broadcast-unsupported-audience", "p2", "src/app/api/creator/broadcasts/route.ts", "Unsupported broadcast audiences fail with a human-safe validation error."),
  ];
  const allFindings = [...doctrineFindings, ...routeFindings, ...navFindings, ...crmFindings, ...backendFindings];

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "creator-nav-role-consolidation",
    currentHead: currentHead(),
    summary: {
      routeMatrixCanonical,
      staleDoctrineRemoved,
      duplicateNavConstantsRemoved,
      accountSettingsLabelCanonical,
      creatorDashboardRouteCanonical,
      creatorSettingsRouteCanonical,
      userDashboardModulesBlockedOnCreatorRoute,
      normalUserDashboardPreserved,
      fanPassCrmUsesReadableIdentity,
      broadcastAudienceExplicit,
      oldFollowersCopyRemoved,
      oldMetricGridRemoved,
      p0Count: countSeverity(allFindings, "p0"),
      p1Count: countSeverity(allFindings, "p1"),
      p2Count: countSeverity(allFindings, "p2"),
    },
    doctrineFindings,
    routeFindings,
    navFindings,
    crmFindings,
    backendFindings,
    fixesApplied: [
      "Consolidated account menu settings links on USER_SETTINGS_ROUTE.",
      "Marked the creator landing route with data-dashboard-surface=\"creator_dashboard\".",
      "Removed remaining creator-facing followers copy from profile creator broadcast tools.",
      "Locked route, nav, CRM, broadcast, and dashboard boundary doctrine into a single consolidation report.",
    ],
    prCleanupActions: [],
    nextFixOrder: [
      "Run deterministic UI source coverage for /dashboard/creator and account nav; use browser reproduction only if it reports a concrete navigation issue.",
      "Keep future creator dashboard additions route-scoped and update this consolidation validator when adding new creator nav destinations.",
    ],
  };
}

export function validateCreatorNavRoleConsolidationReport(report: CreatorNavRoleConsolidationReport) {
  const failures: string[] = [];
  if (report.reportKey !== "creator-nav-role-consolidation") failures.push("reportKey must be creator-nav-role-consolidation");
  if (report.currentHead !== currentHead()) failures.push("currentHead must match git HEAD");
  if (!report.summary.routeMatrixCanonical) failures.push("route matrix is not canonical");
  if (!report.summary.staleDoctrineRemoved) failures.push("stale doctrine conflict remains");
  if (!report.summary.duplicateNavConstantsRemoved) failures.push("duplicate nav route constants or settings literals remain");
  if (!report.summary.accountSettingsLabelCanonical) failures.push("Account Settings nav is not canonical");
  if (!report.summary.creatorDashboardRouteCanonical) failures.push("Creator Dashboard nav does not point to the creator dashboard route");
  if (!report.summary.creatorSettingsRouteCanonical) failures.push("Creator Settings nav does not point to the creator settings route");
  if (!report.summary.userDashboardModulesBlockedOnCreatorRoute) failures.push("/dashboard/creator renders user dashboard modules");
  if (!report.summary.normalUserDashboardPreserved) failures.push("normal user dashboard modules are not preserved");
  if (!report.summary.fanPassCrmUsesReadableIdentity) failures.push("Fan Pass CRM readable identity is not consolidated");
  if (!report.summary.broadcastAudienceExplicit) failures.push("broadcast audience marker is missing");
  if (!report.summary.oldFollowersCopyRemoved) failures.push("old followers copy remains in creator-facing UI");
  if (!report.summary.oldMetricGridRemoved) failures.push("old standalone creator metric grid remains");
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) failures.push("P0/P1 creator nav role consolidation blockers remain");
  if ((report.nextFixOrder?.length ?? 0) === 0) failures.push("nextFixOrder must not be empty");
  return failures;
}

function main() {
  const report = buildCreatorNavRoleConsolidationReport();
  const failures = validateCreatorNavRoleConsolidationReport(report);
  mkdirSync(dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);

  if (failures.length > 0) {
    console.error("Creator nav role consolidation validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("Creator nav role consolidation validation passed.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
