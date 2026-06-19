import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ARTIFACT = "agent/state/creator-surface-routing.generated.json";

type Finding = {
  id: string;
  status: "fixed" | "verified" | "deferred";
  severity: "p0" | "p1" | "p2";
  file: string;
  summary: string;
};

export type CreatorSurfaceRoutingReport = {
  generatedAtUtc: string;
  reportKey: "creator-surface-routing";
  currentHead: string;
  summary: {
    baseDashboardRoute: "/dashboard/creator";
    creatorSettingsRoute: "/dashboard/creator/settings";
    userSettingsRoute: "/settings";
    sidebarRoutesChecked: boolean;
    navPillsChecked: boolean;
    rawErrorLeaks: number;
    mobileLayoutFixes: number;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  routes: Finding[];
  navigationFindings: Finding[];
  mobileFindings: Finding[];
  errorFindings: Finding[];
  fixesApplied: string[];
  nextFixOrder: string[];
};

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function has(path: string) {
  return existsSync(join(ROOT, path));
}

function currentHead() {
  return execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
}

function includesAll(source: string, snippets: string[]) {
  return snippets.every((snippet) => source.includes(snippet));
}

function hasPlainSettingsAccountLabel(source: string) {
  return /href="\/(?:dashboard\/)?settings"[^>]+label="Settings"|label="Settings"[^>]+href="\/(?:dashboard\/)?settings"|title="Settings"|aria-label="Open settings"/u.test(source);
}

export function buildCreatorSurfaceRoutingReport(): CreatorSurfaceRoutingReport {
  const creatorDashboardPage = read("src/app/dashboard/creator/page.tsx");
  const creatorSettingsPagePath = "src/app/dashboard/creator/settings/page.tsx";
  const creatorSettingsPage = has(creatorSettingsPagePath) ? read(creatorSettingsPagePath) : "";
  const routing = read("src/lib/creator-profile-routing.ts");
  const landing = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
  const quickActions = read("src/components/Dashboard/creator-workspace/CreatorDashboardQuickActions.tsx");
  const overviewModule = read("src/components/Dashboard/creator-workspace/CreatorDashboardOverviewModule.tsx");
  const sourceNotice = read("src/components/Dashboard/creator-workspace/CreatorDashboardSourceNotice.tsx");
  const settingsHub = read("src/components/Creators/CreatorDashboardSettingsHub.tsx");
  const sidebar = read("src/components/Navigation/ProfileSidebar.tsx");
  const dropdown = read("src/components/Navigation/ProfileDropdown.tsx");
  const userSettings = read("src/components/Settings/UserSettingsPage.tsx");
  const legacyProfileCreator = read("src/app/dashboard/profile/creator/page.tsx");

  const failures: Finding[] = [];
  const routeFindings: Finding[] = [];
  const navigationFindings: Finding[] = [];
  const mobileFindings: Finding[] = [];
  const errorFindings: Finding[] = [];

  const add = (bucket: Finding[], finding: Finding, ok: boolean) => {
    if (ok) {
      bucket.push(finding);
      return;
    }
    failures.push({ ...finding, status: "deferred" });
  };

  add(routeFindings, {
    id: "creator-dashboard-landing-route",
    status: "fixed",
    severity: "p1",
    file: "src/app/dashboard/creator/page.tsx",
    summary: "/dashboard/creator renders the Creator Dashboard landing route, not the operations settings hub.",
  }, creatorDashboardPage.includes("CreatorDashboardLandingRoute") && !creatorDashboardPage.includes("CreatorDashboardSettingsHub"));

  add(routeFindings, {
    id: "creator-settings-workspace-route",
    status: "fixed",
    severity: "p1",
    file: creatorSettingsPagePath,
    summary: "/dashboard/creator/settings renders CreatorDashboardSettingsHub as the creator operations workspace.",
  }, includesAll(creatorSettingsPage, ["CreatorDashboardSettingsHub", "CreatorDashboardSettingsPage"]));

  add(routeFindings, {
    id: "route-constants",
    status: "verified",
    severity: "p2",
    file: "src/lib/creator-profile-routing.ts",
    summary: "Creator dashboard, creator settings, drop manage, user settings, and profile route constants are explicit.",
  }, includesAll(routing, [
    'CREATOR_DASHBOARD_ROUTE = "/dashboard/creator"',
    'CREATOR_SETTINGS_ROUTE = "/dashboard/creator/settings"',
    'CREATOR_DROP_MANAGE_ROUTE = "/dashboard/creator/drops"',
    'CREATOR_DROP_ROUTE_STATE = "creator_submission"',
    'USER_SETTINGS_ROUTE = "/settings"',
    'USER_PROFILE_ROUTE = "/settings"',
  ]));

  add(navigationFindings, {
    id: "base-dashboard-settings-pill",
    status: "fixed",
    severity: "p1",
    file: "src/components/Dashboard/creator-workspace/CreatorDashboardQuickActions.tsx",
    summary: "The landing dashboard Creator settings pill links to the creator settings workspace.",
  }, quickActions.includes("href={CREATOR_SETTINGS_ROUTE}") && !quickActions.includes('<Link href="/dashboard/profile" className="flex shrink-0 items-center justify-center gap-2 rounded-full'));

  add(navigationFindings, {
    id: "base-dashboard-drop-cta-manage-only",
    status: "fixed",
    severity: "p1",
    file: "src/components/Dashboard/creator-workspace/CreatorDashboardQuickActions.tsx",
    summary: "The landing dashboard Manage drops CTA points to the creator drop submission manager.",
  }, includesAll(quickActions, ["Manage drops", "href={CREATOR_DROP_MANAGE_ROUTE}", "data-create-drop-route-state={CREATOR_DROP_ROUTE_STATE}"])
    && routing.includes('CREATOR_DROP_MANAGE_ROUTE = "/dashboard/creator/drops"')
    && routing.includes('CREATOR_DROP_ROUTE_STATE = "creator_submission"')
    && !quickActions.includes('href="/dashboard/drops"')
    && !/Create drop/u.test(quickActions));

  add(navigationFindings, {
    id: "sidebar-separate-routes",
    status: "fixed",
    severity: "p1",
    file: "src/components/Navigation/ProfileSidebar.tsx",
    summary: "Sidebar keeps Creator Dashboard for the landing route and adds Creator Settings for operations.",
  }, includesAll(sidebar, ["label=\"Creator Dashboard\"", "label=\"Creator Settings\"", "href={CREATOR_DASHBOARD_ROUTE}", "href={CREATOR_SETTINGS_ROUTE}"]));

  add(navigationFindings, {
    id: "dropdown-separate-routes",
    status: "fixed",
    severity: "p1",
    file: "src/components/Navigation/ProfileDropdown.tsx",
    summary: "Profile dropdown keeps separate creator landing and creator settings destinations.",
  }, includesAll(dropdown, ["label=\"Creator Dashboard\"", "label=\"Creator Settings\"", "href={CREATOR_DASHBOARD_ROUTE}", "href={CREATOR_SETTINGS_ROUTE}"]));

  add(navigationFindings, {
    id: "account-settings-labels",
    status: "fixed",
    severity: "p2",
    file: "src/components/Navigation/ProfileSidebar.tsx",
    summary: "Account settings links use Account Settings, not ambiguous Settings, while creator operations use Creator Settings.",
  }, [sidebar, dropdown].every((source) => source.includes("Account Settings") && source.includes("USER_SETTINGS_ROUTE") && !hasPlainSettingsAccountLabel(source)));

  add(navigationFindings, {
    id: "user-settings-not-creator-operations",
    status: "fixed",
    severity: "p1",
    file: "src/components/Settings/UserSettingsPage.tsx",
    summary: "User settings stays account-only and routes creator operations to Creator Settings.",
  }, includesAll(userSettings, ["Creator tools moved to Creator Settings.", "Open Creator Settings", "href={CREATOR_SETTINGS_ROUTE}"]));

  add(navigationFindings, {
    id: "legacy-profile-creator-settings-route",
    status: "fixed",
    severity: "p2",
    file: "src/app/dashboard/profile/creator/page.tsx",
    summary: "Legacy creator settings notice points to Creator Settings, not the dashboard landing route.",
  }, includesAll(legacyProfileCreator, ["Creator settings now live in Creator Settings.", "Open Creator Settings", "href={CREATOR_SETTINGS_ROUTE}"]));

  add(mobileFindings, {
    id: "landing-mobile-density",
    status: "fixed",
    severity: "p1",
    file: "src/components/Dashboard/CreatorWorkspacePanel.tsx",
    summary: "Creator Dashboard landing uses one compact Creator Overview module and bottom-nav-safe spacing.",
  }, includesAll(`${landing}\n${overviewModule}`, [
    'data-creator-dashboard-landing-density="mobile_compact"',
    'data-creator-landing-mobile-density="compact_v2"',
    'data-bottom-nav-safe="true"',
    'data-report-issue-safe-offset="bottom-nav"',
    'data-creator-overview-module="compact_v1"',
    'data-creator-dashboard-overview-density="mobile_compact"',
    'data-creator-dashboard-content-scope="creator_owned_or_assigned"',
    "pb-[calc(env(safe-area-inset-bottom)+9rem)]",
  ]) && !landing.includes('data-creator-landing-metric-card="compact_v2"'));

  add(mobileFindings, {
    id: "settings-workspace-mobile-density",
    status: "verified",
    severity: "p1",
    file: "src/components/Creators/CreatorDashboardSettingsHub.tsx",
    summary: "Creator Settings workspace keeps compact mobile density and safe bottom spacing.",
  }, includesAll(settingsHub, [
    'data-creator-dashboard-density="mobile_compact"',
    'data-bottom-nav-safe="true"',
    'data-report-issue-safe-offset="bottom-nav"',
    'data-creator-dashboard-card-density="mobile_compact"',
    "pb-[calc(env(safe-area-inset-bottom)+7rem)]",
  ]));

  const scannedUserCreatorSources = [
    ["src/components/Dashboard/CreatorWorkspacePanel.tsx", landing],
    ["src/components/Creators/CreatorDashboardSettingsHub.tsx", settingsHub],
    ["src/app/dashboard/creator/page.tsx", creatorDashboardPage],
    [creatorSettingsPagePath, creatorSettingsPage],
  ] as const;
  const rawErrorLeaks = scannedUserCreatorSources.filter(([, source]) => /creator settings:\s*Internal server error|>\s*Internal server error\s*<|body\.error\}/u.test(source)).length;

  add(errorFindings, {
    id: "raw-creator-settings-internal-error-blocked",
    status: "fixed",
    severity: "p1",
    file: "src/components/Dashboard/creator-workspace/CreatorDashboardSourceNotice.tsx",
    summary: "Creator settings load failures use HumanErrorNotice instead of concatenating raw module errors.",
  }, rawErrorLeaks === 0
    && includesAll(`${landing}\n${sourceNotice}`, ["HumanErrorNotice", "dashboard_source_unavailable", "settingsBugReporter.submit"]));

  const p0Count = failures.filter((finding) => finding.severity === "p0").length;
  const p1Count = failures.filter((finding) => finding.severity === "p1").length;
  const p2Count = failures.filter((finding) => finding.severity === "p2").length;

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "creator-surface-routing",
    currentHead: currentHead(),
    summary: {
      baseDashboardRoute: "/dashboard/creator",
      creatorSettingsRoute: "/dashboard/creator/settings",
      userSettingsRoute: "/settings",
      sidebarRoutesChecked: navigationFindings.some((finding) => finding.id === "sidebar-separate-routes"),
      navPillsChecked: navigationFindings.some((finding) => finding.id === "base-dashboard-settings-pill"),
      rawErrorLeaks,
      mobileLayoutFixes: mobileFindings.length,
      p0Count,
      p1Count,
      p2Count,
    },
    routes: routeFindings,
    navigationFindings,
    mobileFindings,
    errorFindings,
    fixesApplied: [
      "Moved CreatorDashboardSettingsHub from /dashboard/creator to /dashboard/creator/settings.",
      "Restored /dashboard/creator as the Creator Dashboard landing route.",
      "Updated sidebar, dropdown, user settings, and legacy creator-settings CTAs to separate dashboard and settings destinations.",
      "Renamed account settings navigation labels to Account Settings.",
      "Replaced separate mobile landing metric cards with one compact Creator Overview module and kept bottom-nav/report-issue spacing explicit.",
      "Replaced the library fallback with a creator drop submission manager route.",
      "Translated base dashboard creator settings load failures through HumanErrorNotice.",
    ],
    nextFixOrder: [
      "Run UI source coverage for /dashboard/creator and /dashboard/creator/settings before optional visual reproduction.",
      "Keep future creator operations links pointed at /dashboard/creator/settings unless a more specific manager route exists.",
    ],
  };
}

export function validateCreatorSurfaceRoutingReport(report: CreatorSurfaceRoutingReport) {
  const failures: string[] = [];
  if (report.reportKey !== "creator-surface-routing") failures.push("reportKey must be creator-surface-routing");
  if (report.currentHead !== currentHead()) failures.push("currentHead must match git HEAD");
  if (report.summary.baseDashboardRoute !== "/dashboard/creator") failures.push("base dashboard route must be /dashboard/creator");
  if (report.summary.creatorSettingsRoute !== "/dashboard/creator/settings") failures.push("creator settings route must be /dashboard/creator/settings");
  if (!report.summary.sidebarRoutesChecked) failures.push("sidebar routes were not checked");
  if (!report.summary.navPillsChecked) failures.push("creator settings nav pill was not checked");
  if (report.summary.rawErrorLeaks !== 0) failures.push("raw creator settings error leaks remain");
  if (report.summary.mobileLayoutFixes < 2) failures.push("both creator surfaces must have mobile layout fixes represented");
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) failures.push("P0/P1 creator surface routing blockers remain");
  if (report.nextFixOrder.length === 0) failures.push("nextFixOrder must not be empty");
  return failures;
}

const report = buildCreatorSurfaceRoutingReport();
writeFileSync(join(ROOT, ARTIFACT), `${JSON.stringify(report, null, 2)}\n`, "utf8");
const failures = validateCreatorSurfaceRoutingReport(report);

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`[creator-surface-routing] ${failure}`);
  }
  process.exit(1);
}

console.log(`[creator-surface-routing] PASS route=${report.summary.baseDashboardRoute} settings=${report.summary.creatorSettingsRoute} rawErrorLeaks=${report.summary.rawErrorLeaks}`);
