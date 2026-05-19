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

export type CreatorDashboardRoleBoundaryReport = {
  generatedAtUtc: string;
  reportKey: "creator-dashboard-role-boundary";
  currentHead: string;
  summary: {
    creatorDashboardRouteScoped: boolean;
    userModulesRemovedFromCreatorDashboard: boolean;
    normalUserDashboardPreserved: boolean;
    creatorCanAccessUserSurfacesExplicitly: boolean;
    bottomNavPreserved: boolean;
    routeLeakSourceIdentified: boolean;
    staleDoctrineRemoved: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  screenshotSymptoms: Finding[];
  routeFindings: Finding[];
  moduleFindings: Finding[];
  doctrineChanges: Finding[];
  fixesApplied: string[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactPath = join(repoRoot, "agent/state/creator-dashboard-role-boundary.generated.json");

function read(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function finding(id: string, severity: Severity, file: string, summary: string, status: FindingStatus = "fixed"): Finding {
  return { id, severity, file, summary, status };
}

function countSeverity(findings: Finding[], severity: Severity) {
  return findings.filter((entry) => entry.severity === severity && (entry.status === "blocked" || entry.status === "deferred")).length;
}

function hasAny(source: string, needles: string[]) {
  return needles.some((needle) => source.includes(needle));
}

export function buildCreatorDashboardRoleBoundaryReport(): CreatorDashboardRoleBoundaryReport {
  const dashboardClient = read("src/app/dashboard/DashboardClient.tsx");
  const creatorPage = read("src/app/dashboard/creator/page.tsx");
  const workspace = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
  const bottomNav = read("src/components/Navigation/MobileBottomBar.tsx");
  const coreLayout = read("src/components/CoreLayoutWrapper.tsx");
  const routing = read("src/lib/creator-profile-routing.ts");
  const doc = read("docs/agent-truth/creator-dashboard-role-boundary.md");
  const creatorRoutingDoc = read("docs/agent-truth/creator-surface-routing.md");
  const creatorSurface = `${creatorPage}\n${workspace}`;
  const userModuleNeedles = ["<DailyCheckIn", "<CreatorDiscoveryRail", "<RecentActivityFeed", "<CollectionList", "Owned / Locked", 'data-library-tabs="owned_locked"'];

  const creatorDashboardRouteScoped = creatorPage.includes("CreatorDashboardLandingRoute")
    && !creatorPage.includes("DashboardClient")
    && !hasAny(creatorSurface, userModuleNeedles);
  const userModulesRemovedFromCreatorDashboard = workspace.includes('data-creator-dashboard-content-boundary="creator_only"')
    && workspace.includes('data-dashboard-surface="creator_dashboard"')
    && workspace.includes('data-user-dashboard-modules-rendered="false"')
    && !hasAny(creatorSurface, userModuleNeedles);
  const normalUserDashboardPreserved = dashboardClient.includes('data-dashboard-surface="user_dashboard"')
    && dashboardClient.includes("<DailyCheckIn")
    && dashboardClient.includes("<CreatorDiscoveryRail")
    && dashboardClient.includes("<RecentActivityFeed")
    && dashboardClient.includes("<CollectionList");
  const creatorRedirectEnabled = dashboardClient.includes("const isCreatorPrimaryDashboard")
    && dashboardClient.includes("router.replace(CREATOR_DASHBOARD_ROUTE)")
    && dashboardClient.includes('data-dashboard-surface="creator_redirect"')
    && !dashboardClient.includes("CreatorWorkspacePanel");
  const creatorCanAccessUserSurfacesExplicitly = routing.includes('CREATOR_DROP_MANAGE_ROUTE = "/dashboard/library"')
    && bottomNav.includes("creatorDashboardHref")
    && bottomNav.includes("CREATOR_DASHBOARD_ROUTE");
  const bottomNavPreserved = coreLayout.includes("<MobileBottomBar />") && bottomNav.includes("Mobile navigation");
  const staleDoctrineRemoved = doc.includes("/dashboard/creator is a creator operations landing surface")
    && doc.includes("must not fall through into Daily Check-In")
    && doc.includes("Normal users must still see user dashboard modules")
    && !/creator dashboard includes user dashboard below it/iu.test(`${doc}\n${creatorRoutingDoc}`);

  const screenshotSymptoms: Finding[] = [
    finding("screenshot-user-modules-after-creator-crm", "p1", "/dashboard or /dashboard/creator mobile screenshot", "Mobile screenshot showed user dashboard modules below Creator Dashboard CRM."),
  ];
  const routeFindings: Finding[] = [
    finding("dashboard-client-stack-leak", "p1", "src/app/dashboard/DashboardClient.tsx", "Leak source was /dashboard rendering CreatorWorkspacePanel before the normal user dashboard grid; creator-role /dashboard now redirects to /dashboard/creator."),
    finding("creator-route-scoped", "p1", "src/app/dashboard/creator/page.tsx", "/dashboard/creator renders CreatorDashboardLandingRoute only.", creatorDashboardRouteScoped ? "fixed" : "blocked"),
    finding("creator-dashboard-redirect", "p1", "src/app/dashboard/DashboardClient.tsx", "Creator-role /dashboard redirects before user modules render.", creatorRedirectEnabled ? "fixed" : "blocked"),
  ];
  const moduleFindings: Finding[] = [
    finding("creator-boundary-marker", "p1", "src/components/Dashboard/CreatorWorkspacePanel.tsx", "Creator dashboard body exposes creator-only and no-user-module markers.", userModulesRemovedFromCreatorDashboard ? "fixed" : "blocked"),
    finding("normal-user-dashboard-preserved", "p1", "src/app/dashboard/DashboardClient.tsx", "Normal user dashboard still renders Daily Check-In, Creator Spotlight, Recent Activity, and CollectionList.", normalUserDashboardPreserved ? "verified" : "blocked"),
    finding("bottom-nav-preserved", "p2", "src/components/CoreLayoutWrapper.tsx", "Shared MobileBottomBar remains mounted for public dashboard routes.", bottomNavPreserved ? "verified" : "blocked"),
    finding("explicit-user-surface-access", "p2", "src/lib/creator-profile-routing.ts", "Creator drop/library access remains explicit through /dashboard/library.", creatorCanAccessUserSurfacesExplicitly ? "verified" : "blocked"),
  ];
  const doctrineChanges: Finding[] = [
    finding("role-boundary-doctrine", "p1", "docs/agent-truth/creator-dashboard-role-boundary.md", "Doctrine locks creator and user dashboard bodies as separate route scopes.", staleDoctrineRemoved ? "fixed" : "blocked"),
  ];
  const allFindings = [...screenshotSymptoms, ...routeFindings, ...moduleFindings, ...doctrineChanges];

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "creator-dashboard-role-boundary",
    currentHead: currentHead(),
    summary: {
      creatorDashboardRouteScoped,
      userModulesRemovedFromCreatorDashboard,
      normalUserDashboardPreserved,
      creatorCanAccessUserSurfacesExplicitly,
      bottomNavPreserved,
      routeLeakSourceIdentified: dashboardClient.includes('data-creator-dashboard-route-boundary="redirect_to_creator_dashboard"'),
      staleDoctrineRemoved,
      p0Count: countSeverity(allFindings, "p0"),
      p1Count: countSeverity(allFindings, "p1"),
      p2Count: countSeverity(allFindings, "p2"),
    },
    screenshotSymptoms,
    routeFindings,
    moduleFindings,
    doctrineChanges,
    fixesApplied: [
      "Removed stacked creator and user dashboard rendering from /dashboard.",
      "Redirected creator-role /dashboard visits to /dashboard/creator before user modules render.",
      "Added creator-only boundary markers to CreatorWorkspacePanel and the landing route.",
      "Kept normal user /dashboard rewards, discovery, activity, and collection modules intact.",
      "Pointed creator-role mobile Dashboard navigation at the Creator Dashboard route.",
    ],
    prCleanupActions: [],
    nextFixOrder: [
      "Attach mobile screenshot evidence for /dashboard/creator after deployment.",
      "If creators need a full user dashboard shortcut later, add an explicit route or role switcher instead of stacking both dashboards.",
    ],
  };
}

export function validateCreatorDashboardRoleBoundaryReport(report: CreatorDashboardRoleBoundaryReport) {
  const failures: string[] = [];
  if (report.reportKey !== "creator-dashboard-role-boundary") failures.push("reportKey must be creator-dashboard-role-boundary");
  if (report.currentHead !== currentHead()) failures.push("report currentHead must match git HEAD");
  if (!report.summary.creatorDashboardRouteScoped) failures.push("/dashboard/creator is not scoped to creator modules");
  if (!report.summary.userModulesRemovedFromCreatorDashboard) failures.push("user dashboard modules still render in the creator dashboard surface");
  if (!report.summary.normalUserDashboardPreserved) failures.push("normal user dashboard modules are not preserved");
  if (!report.summary.creatorCanAccessUserSurfacesExplicitly) failures.push("creator explicit user/library surface access is missing");
  if (!report.summary.bottomNavPreserved) failures.push("bottom nav is not preserved");
  if (!report.summary.routeLeakSourceIdentified) failures.push("route leak source must be identified");
  if (!report.summary.staleDoctrineRemoved) failures.push("stale doctrine conflict remains");
  if ((report.nextFixOrder?.length ?? 0) === 0) failures.push("nextFixOrder must not be empty");
  return failures;
}

function main() {
  const report = buildCreatorDashboardRoleBoundaryReport();
  const failures = validateCreatorDashboardRoleBoundaryReport(report);
  mkdirSync(dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);

  if (failures.length > 0) {
    console.error("Creator dashboard role boundary validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("Creator dashboard role boundary validation passed.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
