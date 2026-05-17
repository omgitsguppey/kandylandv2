import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ARTIFACT = "agent/state/creator-landing-dashboard-mobile.generated.json";

type Finding = {
  id: string;
  status: "fixed" | "verified" | "deferred";
  severity: "p0" | "p1" | "p2";
  file: string;
  summary: string;
};

export type CreatorLandingDashboardMobileReport = {
  generatedAtUtc: string;
  reportKey: "creator-landing-dashboard-mobile";
  currentHead: string;
  summary: {
    landingRoute: "/dashboard/creator";
    createDropRouteState: "valid" | "manage_only" | "unavailable";
    createDropHref: string;
    rawModuleErrorLeaks: number;
    mobileLayoutFixes: number;
    bottomNavSafe: boolean;
    reportIssueSafe: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  routeFindings: Finding[];
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

export function buildCreatorLandingDashboardMobileReport(): CreatorLandingDashboardMobileReport {
  const landingPath = "src/components/Dashboard/CreatorWorkspacePanel.tsx";
  const routingPath = "src/lib/creator-profile-routing.ts";
  const landing = read(landingPath);
  const routing = read(routingPath);
  const dashboardPage = read("src/app/dashboard/creator/page.tsx");
  const dashboardDropsExists = has("src/app/dashboard/drops/page.tsx") || has("src/app/dashboard/drops");

  const failures: Finding[] = [];
  const routeFindings: Finding[] = [];
  const mobileFindings: Finding[] = [];
  const errorFindings: Finding[] = [];

  const add = (bucket: Finding[], finding: Finding, ok: boolean) => {
    if (ok) {
      bucket.push(finding);
      return;
    }
    failures.push({ ...finding, status: "deferred" });
  };

  const rawModuleErrorLeaks = [
    /body=\{moduleErrors\./u,
    /creator settings:\s*Internal server error/u,
    />\s*Internal server error\s*</u,
    /String\(error\)/u,
  ].filter((pattern) => pattern.test(landing)).length;

  add(routeFindings, {
    id: "creator-dashboard-landing-route",
    status: "verified",
    severity: "p1",
    file: "src/app/dashboard/creator/page.tsx",
    summary: "/dashboard/creator remains the Creator Dashboard landing surface.",
  }, dashboardPage.includes("CreatorDashboardLandingRoute") && !dashboardPage.includes("CreatorDashboardSettingsHub"));

  add(routeFindings, {
    id: "create-drop-known-404-removed",
    status: "fixed",
    severity: "p1",
    file: landingPath,
    summary: "The landing CTA no longer points at /dashboard/drops, which is not present in this repo.",
  }, !dashboardDropsExists && !landing.includes('href="/dashboard/drops"') && !landing.includes("href='/dashboard/drops'"));

  add(routeFindings, {
    id: "create-drop-truthful-manage-route",
    status: "fixed",
    severity: "p1",
    file: landingPath,
    summary: "Because no creator create-drop route exists, the CTA is labeled Manage drops and routes to the existing library surface.",
  }, includesAll(landing, ["Manage drops", "href={CREATOR_DROP_MANAGE_ROUTE}", 'data-create-drop-route-state={CREATOR_DROP_ROUTE_STATE}'])
    && includesAll(routing, ['CREATOR_DROP_MANAGE_ROUTE = "/dashboard/library"', 'CREATOR_DROP_ROUTE_STATE = "manage_only"'])
    && !/Create drop/u.test(landing));

  add(mobileFindings, {
    id: "compact-v2-route-markers",
    status: "fixed",
    severity: "p1",
    file: landingPath,
    summary: "Creator Dashboard landing exposes compact_v2 density, human error language, and route-state markers.",
  }, includesAll(landing, [
    'data-creator-landing-mobile-density="compact_v2"',
    'data-creator-landing-error-language="human"',
    "data-create-drop-route-state={CREATOR_DROP_ROUTE_STATE}",
    'data-creator-landing-quick-actions="compact_v2"',
  ]));

  add(mobileFindings, {
    id: "compact-v2-card-density",
    status: "fixed",
    severity: "p1",
    file: landingPath,
    summary: "Metric cards use compact mobile min-height, padding, icons, gaps, and unavailable value text.",
  }, includesAll(landing, [
    "min-h-[72px]",
    "p-2 transition-colors",
    "h-3.5 w-3.5",
    "text-lg font-black",
    'data-creator-landing-unavailable-density="compact"',
    'data-creator-landing-metric-card="compact_v2"',
    "grid grid-cols-2 gap-2",
  ]) && !landing.includes("min-h-[86px]"));

  add(mobileFindings, {
    id: "broadcast-mobile-deferred",
    status: "fixed",
    severity: "p2",
    file: landingPath,
    summary: "Quick Broadcast is lower priority on mobile while creator stats are unavailable.",
  }, includesAll(landing, [
    "broadcastSourceReady",
    "data-creator-broadcast-mobile-priority",
    "Broadcasts unlock when creator stats finish loading.",
  ]));

  add(mobileFindings, {
    id: "safe-area-spacing",
    status: "fixed",
    severity: "p1",
    file: landingPath,
    summary: "Landing route has top spacing plus bottom-nav/report-issue safe padding.",
  }, includesAll(landing, [
    "pt-3",
    "pb-[calc(env(safe-area-inset-bottom)+9rem)]",
    'data-bottom-nav-safe="true"',
    'data-report-issue-safe-offset="bottom-nav"',
  ]));

  add(errorFindings, {
    id: "raw-module-errors-blocked",
    status: "fixed",
    severity: "p1",
    file: landingPath,
    summary: "Module warnings render human fallback copy and settings load failures use HumanErrorNotice.",
  }, rawModuleErrorLeaks === 0 && includesAll(landing, [
    "HumanErrorNotice",
    "dashboard_source_unavailable",
    "Bookings are not loading right now. Try again in a bit.",
    "Fan Pass subscribers are not loading right now. Try again in a bit.",
  ]));

  const p0Count = failures.filter((finding) => finding.severity === "p0").length;
  const p1Count = failures.filter((finding) => finding.severity === "p1").length;
  const p2Count = failures.filter((finding) => finding.severity === "p2").length;

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "creator-landing-dashboard-mobile",
    currentHead: currentHead(),
    summary: {
      landingRoute: "/dashboard/creator",
      createDropRouteState: "manage_only",
      createDropHref: "/dashboard/library",
      rawModuleErrorLeaks,
      mobileLayoutFixes: mobileFindings.length,
      bottomNavSafe: landing.includes('data-bottom-nav-safe="true"'),
      reportIssueSafe: landing.includes('data-report-issue-safe-offset="bottom-nav"'),
      p0Count,
      p1Count,
      p2Count,
    },
    routeFindings,
    mobileFindings,
    errorFindings,
    fixesApplied: [
      "Replaced the missing /dashboard/drops create route with a manage-only /dashboard/library CTA.",
      "Added compact_v2 creator landing density markers and tightened mobile card sizing.",
      "Added top and bottom safe-area spacing markers for the creator landing route.",
      "Replaced raw module warning bodies with human fallback copy.",
    ],
    nextFixOrder: [
      "When a creator-owned create-drop flow exists, update CREATOR_DROP_ROUTE_STATE to valid and route the CTA there.",
      "Attach manual mobile screenshots for /dashboard/creator and /dashboard/creator/settings.",
    ],
  };
}

export function validateCreatorLandingDashboardMobileReport(report: CreatorLandingDashboardMobileReport) {
  const failures: string[] = [];
  if (report.reportKey !== "creator-landing-dashboard-mobile") failures.push("reportKey must be creator-landing-dashboard-mobile");
  if (report.currentHead !== currentHead()) failures.push("currentHead must match git HEAD");
  if (report.summary.landingRoute !== "/dashboard/creator") failures.push("landingRoute must be /dashboard/creator");
  if (report.summary.createDropRouteState !== "manage_only") failures.push("createDropRouteState must remain manage_only until a real create route exists");
  if (report.summary.createDropHref !== "/dashboard/library") failures.push("manage-only create-drop fallback must point to /dashboard/library");
  if (report.summary.rawModuleErrorLeaks !== 0) failures.push("raw module error leaks remain");
  if (report.summary.mobileLayoutFixes < 4) failures.push("mobile layout fixes must cover markers, cards, broadcast, and safe spacing");
  if (!report.summary.bottomNavSafe) failures.push("bottom nav safe marker missing");
  if (!report.summary.reportIssueSafe) failures.push("report issue safe marker missing");
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) failures.push("P0/P1 creator landing blockers remain");
  if (report.nextFixOrder.length === 0) failures.push("nextFixOrder must not be empty");
  return failures;
}

function main() {
  const report = buildCreatorLandingDashboardMobileReport();
  writeFileSync(join(ROOT, ARTIFACT), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const failures = validateCreatorLandingDashboardMobileReport(report);

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`[creator-landing-dashboard-mobile] ${failure}`);
    }
    process.exit(1);
  }

  console.log(`[creator-landing-dashboard-mobile] PASS route=${report.summary.landingRoute} createDrop=${report.summary.createDropRouteState} rawModuleErrorLeaks=${report.summary.rawModuleErrorLeaks}`);
}

main();
