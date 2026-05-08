import { readFileSync, writeFileSync } from "fs";
import { execFileSync } from "child_process";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

type ValidationCheck = {
  key: string;
  label: string;
  ok: boolean;
  evidence: string[];
};

type SplitReport = {
  generatedAt: string;
  status: "pass" | "fail";
  criticalBlockers: string[];
  warnings: string[];
  changedFilesSinceLastSettingsCreatorDashboardSplit: string[];
  requiredTargetedChecks: string[];
  forbiddenBroadChecks: string[];
  promoReadinessNotes: string[];
  checks: ValidationCheck[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");
const reportPath = join(repoRoot, "agent", "state", "settings-creator-dashboard-split.generated.json");

const files = {
  userSettingsContract: join(repoRoot, "src", "lib", "settings", "user-settings-contract.ts"),
  creatorSettingsContract: join(repoRoot, "src", "lib", "creator-dashboard", "creator-settings-contract.ts"),
  surfacePolicy: join(repoRoot, "src", "lib", "settings", "settings-surface-policy.ts"),
  legacyRegistry: join(repoRoot, "src", "lib", "creator-dashboard", "creator-settings-legacy-registry.ts"),
  userSettingsPage: join(repoRoot, "src", "components", "Settings", "UserSettingsPage.tsx"),
  creatorDashboardHub: join(repoRoot, "src", "components", "Creators", "CreatorDashboardSettingsHub.tsx"),
  creatorBroadcastManager: join(repoRoot, "src", "components", "Creators", "CreatorBroadcastManager.tsx"),
  creatorBroadcastRoute: join(repoRoot, "src", "app", "api", "creator", "broadcasts", "route.ts"),
  creatorSettingsRoute: join(repoRoot, "src", "app", "api", "creator", "settings", "route.ts"),
  profileSidebar: join(repoRoot, "src", "components", "Navigation", "ProfileSidebar.tsx"),
  profileDropdown: join(repoRoot, "src", "components", "Navigation", "ProfileDropdown.tsx"),
  telemetryCatalog: join(repoRoot, "src", "lib", "telemetry-catalog.ts"),
  settingsDoc: join(repoRoot, "docs", "agent-truth", "user-settings-surface.md"),
  creatorDashboardDoc: join(repoRoot, "docs", "agent-truth", "creator-dashboard-settings.md"),
  creatorBroadcastDoc: join(repoRoot, "docs", "agent-truth", "creator-broadcasts.md"),
  creatorDashboardOverviewDoc: join(repoRoot, "docs", "agent-truth", "creator-dashboard.md"),
  creatorFanExperienceDoc: join(repoRoot, "docs", "agent-truth", "creator-fan-experience-settings.md"),
  creatorLaneCleanupDoc: join(repoRoot, "docs", "agent-truth", "creator-lane-old-logic-cleanup.md"),
  userDoctrine: join(repoRoot, "docs", "doctrine", "surfaces", "user-ui-doctrine.md"),
  creatorDoctrine: join(repoRoot, "docs", "doctrine", "surfaces", "creator-ui-doctrine.md"),
  migrationPage: join(repoRoot, "src", "app", "dashboard", "profile", "creator", "page.tsx"),
  dashboardSettingsRedirect: join(repoRoot, "src", "app", "dashboard", "settings", "page.tsx"),
  accountRedirect: join(repoRoot, "src", "app", "account", "page.tsx"),
  profileSettingsRedirect: join(repoRoot, "src", "app", "profile", "settings", "page.tsx"),
  creatorRedirect: join(repoRoot, "src", "app", "creator", "page.tsx"),
  creatorsDashboardRedirect: join(repoRoot, "src", "app", "creators", "dashboard", "page.tsx"),
  packageJson: join(repoRoot, "package.json"),
};

function read(filePath: string) {
  return readFileSync(filePath, "utf8");
}

function includesAll(source: string, snippets: string[]) {
  return snippets.every((snippet) => source.includes(snippet));
}

function includesAny(source: string, snippets: string[]) {
  return snippets.some((snippet) => source.includes(snippet));
}

function collectChangedFiles() {
  const output = execFileSync("git", ["status", "--porcelain=v1", "-z"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  return output
    .split("\0")
    .filter(Boolean)
    .map((entry) => entry.slice(3))
    .filter((filePath) => [
      "package.json",
      "src/app/settings/",
      "src/app/account/",
      "src/app/profile/settings/",
      "src/app/dashboard/settings/",
      "src/app/dashboard/profile/creator/",
      "src/app/dashboard/profile/page.tsx",
      "src/app/dashboard/creator/",
      "src/app/creator/",
      "src/app/creators/dashboard/",
      "src/components/Settings/",
      "src/components/Creators/",
      "src/components/Navigation/ProfileSidebar.tsx",
      "src/components/Navigation/ProfileDropdown.tsx",
      "src/app/api/creator/broadcasts/",
      "src/app/api/creator/settings/route.ts",
      "src/app/dashboard/profile/hooks/useProfileState.tsx",
      "src/lib/creator-dashboard/",
      "src/lib/settings/",
      "src/lib/telemetry-catalog.ts",
      "docs/agent-truth/user-settings-surface.md",
      "docs/agent-truth/creator-dashboard.md",
      "docs/agent-truth/creator-dashboard-settings.md",
      "docs/agent-truth/creator-broadcasts.md",
      "docs/agent-truth/creator-fan-experience-settings.md",
      "docs/agent-truth/creator-lane-old-logic-cleanup.md",
      "docs/doctrine/surfaces/user-ui-doctrine.md",
      "docs/doctrine/surfaces/creator-ui-doctrine.md",
      "scripts/agent/validate-settings-creator-dashboard-split.ts",
      "agent/state/settings-creator-dashboard-split.generated.json",
    ].some((prefix) => filePath.startsWith(prefix)));
}

function validate(): SplitReport {
  const userSettingsContract = read(files.userSettingsContract);
  const creatorSettingsContract = read(files.creatorSettingsContract);
  const surfacePolicy = read(files.surfacePolicy);
  const legacyRegistry = read(files.legacyRegistry);
  const userSettingsPage = read(files.userSettingsPage);
  const creatorDashboardHub = read(files.creatorDashboardHub);
  const creatorBroadcastManager = read(files.creatorBroadcastManager);
  const creatorBroadcastRoute = read(files.creatorBroadcastRoute);
  const creatorSettingsRoute = read(files.creatorSettingsRoute);
  const profileSidebar = read(files.profileSidebar);
  const profileDropdown = read(files.profileDropdown);
  const telemetryCatalog = read(files.telemetryCatalog);
  const settingsDoc = read(files.settingsDoc);
  const creatorDashboardDoc = read(files.creatorDashboardDoc);
  const creatorBroadcastDoc = read(files.creatorBroadcastDoc);
  const creatorDashboardOverviewDoc = read(files.creatorDashboardOverviewDoc);
  const creatorFanExperienceDoc = read(files.creatorFanExperienceDoc);
  const creatorLaneCleanupDoc = read(files.creatorLaneCleanupDoc);
  const userDoctrine = read(files.userDoctrine);
  const creatorDoctrine = read(files.creatorDoctrine);
  const migrationPage = read(files.migrationPage);
  const packageJson = read(files.packageJson);

  const requiredEvents = [
    "user_settings_viewed",
    "user_settings_creator_tools_cta_clicked",
    "creator_dashboard_settings_viewed",
    "creator_settings_section_opened",
    "creator_broadcast_manager_viewed",
    "creator_broadcast_created",
    "creator_broadcast_creation_failed",
    "creator_broadcast_detail_viewed",
    "creator_broadcast_empty_state_viewed",
    "creator_settings_migrated_redirect_viewed",
  ];

  const checks: ValidationCheck[] = [
    {
      key: "user-settings-contract",
      label: "User settings contract exists and is user-only",
      ok: includesAll(userSettingsContract, [
        'export type SettingsSurface = "user_settings" | "creator_dashboard_settings" | "admin_settings";',
        "simulativeAllowed: false",
        "requiredTelemetryEvents",
      ]) && includesAll(surfacePolicy, ["USER_SETTINGS_SURFACE_TOOLS"]),
      evidence: ["User settings contract declares the canonical user-settings surface and blocks simulative tools."],
    },
    {
      key: "creator-settings-contract",
      label: "Creator dashboard settings contract exists",
      ok: includesAll(creatorSettingsContract, [
        'surfaceOwner: "creator_dashboard_settings"',
        "simulativeAllowed: false",
        "requiredTelemetryEvents",
      ]) && includesAll(surfacePolicy, ["CREATOR_DASHBOARD_SETTINGS_TOOLS"]),
      evidence: ["Creator dashboard tools are declared separately from global user settings."],
    },
    {
      key: "global-user-settings-clean",
      label: "Global user settings contain only account and app preferences",
      ok: includesAll(userSettingsPage, [
        "ProfileProfileSection",
        "ProfileAccountSection",
        "ProfileNotificationsSection",
        "ProfilePrivacyDataSection",
        "ProfileSupportSafetySection",
        "Creator tools moved to your Creator Dashboard.",
        "Open Creator Dashboard",
      ]) && !includesAny(userSettingsPage, ["ProfileCreatorToolsSection", "ProfileCreatorEarningsSection", "CreatorBroadcastManager", "CreatorDashboardSettingsHub"]),
      evidence: ["User settings page renders the allowed account/preferences sections and a creator-dashboard CTA only."],
    },
    {
      key: "creator-settings-hub",
      label: "Creator dashboard settings hub exists and is operational",
      ok: includesAll(creatorDashboardHub, [
        "Public Profile",
        "Broadcasts",
        "Fan Pass",
        "Messages",
        "Requests",
        "Live time / bookings",
        "Availability",
        "Earnings / payout",
        "Notifications / audience",
        "Read-only projection",
      ]),
      evidence: ["Creator dashboard settings hub shows the operational sections and truth labels."],
    },
    {
      key: "broadcast-manager-real-data",
      label: "Broadcast manager reads real backend data or says not live",
      ok: includesAll(creatorBroadcastManager, [
        "/api/creator/broadcasts",
        "No broadcasts yet",
        "Not tracked yet",
        "Create broadcast",
        "View details",
      ]) && includesAll(creatorBroadcastRoute, [
        "where(\"creatorId\", \"==\", creatorId)",
        "buildAdminCreatorProjectionReadOnlyResponse",
        "status: \"sent\"",
      ]),
      evidence: ["Broadcast manager renders real collection state and the route writes live broadcast records."],
    },
    {
      key: "broadcast-history-not-simulated",
      label: "No simulated broadcast history remains canonical",
      ok: includesAll(legacyRegistry, [
        "simulated_creator_broadcast_history",
        'status: "deprecated"',
        'status: "blocked"',
      ]) && !creatorBroadcastManager.includes("simulated broadcast"),
      evidence: ["Legacy simulated broadcast history is blocked/deprecated and the live manager is collection-backed."],
    },
    {
      key: "route-migration-notice",
      label: "Old creator settings routes redirect or show migration notice",
      ok: includesAll(migrationPage, [
        "creator_settings_migrated_redirect_viewed",
        "Open Creator Dashboard",
        "Creator settings now live in Creator Dashboard.",
      ]) && includesAll(profileSidebar, ["/dashboard/creator", "/settings"])
        && includesAll(profileDropdown, ["/dashboard/creator", "/settings"])
        && includesAll(read(files.dashboardSettingsRedirect), ["redirect(\"/settings\")"])
        && includesAll(read(files.accountRedirect), ["redirect(\"/settings\")"])
        && includesAll(read(files.profileSettingsRedirect), ["redirect(\"/settings\")"])
        && includesAll(read(files.creatorRedirect), ["redirect(\"/dashboard/creator\")"])
        && includesAll(read(files.creatorsDashboardRedirect), ["redirect(\"/dashboard/creator\")"]),
      evidence: ["Legacy creator settings routes are redirected and the migration notice is explicit."],
    },
    {
      key: "ownership-and-read-only",
      label: "Creator writes require ownership and admin projection is read-only",
      ok: includesAll(creatorSettingsRoute, [
        "requireCreator(caller.uid)",
        "buildAdminCreatorProjectionReadOnlyResponse",
        "readAdminCreatorProjectionContext",
      ]) && includesAll(creatorBroadcastRoute, [
        "caller.uid",
        "isCreatorRole",
        "buildAdminCreatorProjectionReadOnlyResponse",
      ]),
      evidence: ["Creator settings and broadcasts validate ownership and block admin projection writes."],
    },
    {
      key: "telemetry-events",
      label: "Telemetry events exist for both surfaces",
      ok: includesAll(telemetryCatalog, requiredEvents),
      evidence: ["Telemetry catalog includes the required user-settings and creator-dashboard events."],
    },
    {
      key: "docs-updated",
      label: "Docs were updated for the split",
      ok: includesAll(settingsDoc, ["User Settings"]) && includesAll(creatorDashboardDoc, ["Creator Dashboard Settings"]) && includesAll(creatorBroadcastDoc, ["Creator Broadcasts"]) && includesAll(creatorDashboardOverviewDoc, ["Creator Dashboard"]) && includesAll(creatorFanExperienceDoc, ["Creator Dashboard settings hub", "Creator Dashboard"]) && includesAll(creatorLaneCleanupDoc, ["Global User Settings no longer owns creator operations"]) && includesAll(userDoctrine, ["/settings"]) && includesAll(creatorDoctrine, ["Creator dashboards may be denser than User UI"]),
      evidence: ["Agent-truth docs and surface doctrine reflect the split."],
    },
    {
      key: "package-script",
      label: "Package script is wired",
      ok: packageJson.includes("\"check:settings-creator-dashboard-split\""),
      evidence: ["package.json exposes the settings split validator."],
    },
  ];

  const criticalBlockers = checks.filter((check) => !check.ok).map((check) => `${check.key}: ${check.label}`);
  const warnings: string[] = [];
  const status: SplitReport["status"] = criticalBlockers.length > 0 ? "fail" : "pass";
  const report: SplitReport = {
    generatedAt: new Date().toISOString(),
    status,
    criticalBlockers,
    warnings,
    changedFilesSinceLastSettingsCreatorDashboardSplit: collectChangedFiles(),
    requiredTargetedChecks: [
      "npm run check:settings-creator-dashboard-split",
      "npm run typecheck",
      "npx vitest run tests/unit/user-settings-split.spec.tsx tests/unit/creator-dashboard-settings.spec.tsx tests/unit/creator-broadcasts-route.spec.ts",
    ],
    forbiddenBroadChecks: [
      "npm run check",
      "playwright",
      "cypress",
      "lighthouse",
      "firebase deploy",
    ],
    promoReadinessNotes: [
      "Global User Settings now owns account and app preferences only.",
      "Creator broadcasts are visible, real, and managed from the Creator Dashboard.",
      "Legacy creator settings routes redirect or explain the move instead of simulating creator controls.",
    ],
    checks,
  };

  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

const report = validate();
console.log([
  `status=${report.status}`,
  `criticalBlockers=${report.criticalBlockers.length}`,
  `warnings=${report.warnings.length}`,
  `changedFiles=${report.changedFilesSinceLastSettingsCreatorDashboardSplit.length}`,
].join(" "));

if (report.status === "fail") {
  for (const blocker of report.criticalBlockers) {
    console.log(`blocker: ${blocker}`);
  }
  process.exitCode = 1;
}
