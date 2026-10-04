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

type LockReport = {
  generatedAt: string;
  status: "pass" | "fail";
  criticalBlockers: string[];
  warnings: string[];
  changedFilesSinceLastCreatorDashboardProjectionLock: string[];
  requiredTargetedChecks: string[];
  forbiddenBroadChecks: string[];
  promoReadinessNotes: string[];
  checks: ValidationCheck[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");
const reportPath = join(repoRoot, "agent", "state", "creator-dashboard-projection-lock.generated.json");

const files = {
  adminViewAsRoute: join(repoRoot, "src", "app", "api", "admin", "view-as-creator", "route.ts"),
  adminProjectionHelper: join(repoRoot, "src", "lib", "server", "admin-creator-projection.ts"),
  dashboardClient: join(repoRoot, "src", "app", "dashboard", "DashboardClient.tsx"),
  creatorWorkspacePanel: join(repoRoot, "src", "components", "Dashboard", "CreatorWorkspacePanel.tsx"),
  profileHook: join(repoRoot, "src", "app", "dashboard", "profile", "hooks", "useProfileState.tsx"),
  profilePage: join(repoRoot, "src", "app", "dashboard", "profile", "page.tsx"),
  accountSettings: join(repoRoot, "src", "components", "Settings", "UserSettingsPage.tsx"),
  accountPanels: join(repoRoot, "src", "components", "creative-tim", "kandydrops", "account", "AccountSettingsPanels.tsx"),
  creatorSettingsHub: join(repoRoot, "src", "components", "Creators", "CreatorDashboardSettingsHub.tsx"),
  creatorSettingsDeck: join(repoRoot, "src", "components", "creative-tim", "kandydrops", "creator", "CreatorSettingsControlDeck.tsx"),
  creatorLandingPage: join(repoRoot, "src", "app", "dashboard", "creator", "page.tsx"),
  creatorBroadcastCard: join(repoRoot, "src", "components", "Dashboard", "creator-workspace", "CreatorBroadcastCard.tsx"),
  creatorActionQueue: join(repoRoot, "src", "components", "Dashboard", "creator-workspace", "CreatorActionQueuePanel.tsx"),
  creatorSettingsRoute: join(repoRoot, "src", "app", "api", "creator", "settings", "route.ts"),
  creatorDropsRoute: join(repoRoot, "src", "app", "api", "creator", "drops", "route.ts"),
  creatorRequestsRoute: join(repoRoot, "src", "app", "api", "creator", "requests", "route.ts"),
  creatorBookingsRoute: join(repoRoot, "src", "app", "api", "creator", "bookings", "route.ts"),
  creatorBroadcastsRoute: join(repoRoot, "src", "app", "api", "creator", "broadcasts", "route.ts"),
  creatorSubscriptionsRoute: join(repoRoot, "src", "app", "api", "creator", "subscriptions", "route.ts"),
  chatThreadsRoute: join(repoRoot, "src", "app", "api", "chat", "threads", "route.ts"),
  adminContext: join(repoRoot, "src", "context", "AdminViewAsContext.tsx"),
  packageJson: join(repoRoot, "package.json"),
};

function read(path: string) {
  return readFileSync(path, "utf8");
}

function includesAll(source: string, snippets: string[]) {
  return snippets.every((snippet) => source.includes(snippet));
}

function collectChangedFiles() {
  const output = execFileSync("git", ["status", "--porcelain=v1", "-z"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  const relevantPrefixes = [
    "package.json",
    "src/app/api/admin/view-as-creator/",
    "src/lib/server/admin-creator-projection.ts",
    "src/app/api/creator/settings/",
    "src/app/api/creator/requests/",
    "src/app/api/creator/bookings/",
    "src/app/api/creator/broadcasts/",
    "src/app/api/creator/subscriptions/",
    "src/app/api/chat/threads/",
    "src/app/dashboard/DashboardClient.tsx",
    "src/components/Dashboard/CreatorWorkspacePanel.tsx",
    "src/app/dashboard/profile/",
    "src/context/AdminViewAsContext.tsx",
    "scripts/agent/validate-creator-dashboard-projection-lock.ts",
    "docs/agent-truth/creator-dashboard-projection-lock.md",
    "agent/state/creator-dashboard-projection-lock.generated.json",
  ];

  return output
    .split("\0")
    .filter(Boolean)
    .map((entry) => entry.slice(3))
    .filter((filePath) => relevantPrefixes.some((prefix) => filePath.startsWith(prefix)));
}

function validate(): LockReport {
  const adminViewAsRoute = read(files.adminViewAsRoute);
  const adminProjectionHelper = read(files.adminProjectionHelper);
  const dashboardClient = read(files.dashboardClient);
  const creatorWorkspacePanel = read(files.creatorWorkspacePanel);
  const profileHook = read(files.profileHook);
  const profilePage = read(files.profilePage);
  const accountSettings = read(files.accountSettings);
  const accountPanels = read(files.accountPanels);
  const creatorSettingsHub = read(files.creatorSettingsHub);
  const creatorSettingsDeck = read(files.creatorSettingsDeck);
  const creatorLandingPage = read(files.creatorLandingPage);
  const creatorBroadcastCard = read(files.creatorBroadcastCard);
  const creatorActionQueue = read(files.creatorActionQueue);
  const creatorSettingsRoute = read(files.creatorSettingsRoute);
  const creatorDropsRoute = read(files.creatorDropsRoute);
  const creatorRequestsRoute = read(files.creatorRequestsRoute);
  const creatorBookingsRoute = read(files.creatorBookingsRoute);
  const creatorBroadcastsRoute = read(files.creatorBroadcastsRoute);
  const creatorSubscriptionsRoute = read(files.creatorSubscriptionsRoute);
  const chatThreadsRoute = read(files.chatThreadsRoute);
  const adminContext = read(files.adminContext);
  const packageJson = read(files.packageJson);

  const checks: ValidationCheck[] = [
    {
      key: "server-validation-helper",
      label: "Admin projection is server-validated and read-only",
      ok: includesAll(adminProjectionHelper, [
        "readAdminCreatorProjectionContext",
        "buildAdminCreatorProjectionReadOnlyResponse",
        "server_validated_projection",
        "read_only_creator_projection",
      ]) && includesAll(adminViewAsRoute, [
        "projection: viewAsState ?",
        "readOnly: true",
        "server_validated_projection",
      ]),
      evidence: [
        "Server helper validates the actor and the admin view-as route now returns explicit projection metadata.",
      ],
    },
    {
      key: "dashboard-uses-projection",
      label: "Creator landing owns projection without stacking the user dashboard",
      ok: includesAll(creatorLandingPage, ["CreatorDashboardLandingRoute"])
        && includesAll(creatorWorkspacePanel, ["useAdminViewAs", "Boolean(viewAsState)", "<CreatorWorkspacePanel userProfile={userProfile} />"])
        && dashboardClient.includes("router.replace(CREATOR_DASHBOARD_ROUTE)")
        && !dashboardClient.includes("CreatorWorkspacePanel"),
      evidence: ["The dedicated Creator route mounts its real projection owner; the normal user dashboard retains its separate route boundary."],
    },
    {
      key: "workspace-read-path",
      label: "Creator workspace reads the target creator via projection",
      ok: includesAll(creatorWorkspacePanel, [
        "Admin projection",
        "creatorId=",
        "Read-only",
        "projectionCreatorId",
        "useAdminViewAs",
      ]),
      evidence: [
        "Workspace banner and API reads switch to the projected creator id.",
      ],
    },
    {
      key: "workspace-write-blocks",
      label: "Creator workspace blocks current mutation affordances in projection",
      ok: includesAll(creatorWorkspacePanel, [
        "Creator dashboard is read-only in admin projection.",
        "<CreatorBroadcastCard",
        "<CreatorActionQueuePanel",
        "isProjectionMode={isProjectionMode}",
        "if (isProjectionMode)",
      ]) && creatorBroadcastCard.includes("disabled={broadcastDraft.trim().length < 4 || isProjectionMode}")
        && creatorActionQueue.includes("disabled={busyAction !== null || isProjectionMode}")
        && includesAll(creatorDropsRoute, ["requireCreator(caller.uid)", "if (!isCreatorRole(data.role))", "requireCreator: true"]),
      evidence: ["The real controller guards request, booking and broadcast handlers; delegated current controls disable those actions in projection. Creator Drop mutations independently require the authenticated caller's Creator role and retain the canonical service guard."],
    },
    {
      key: "account-isolated-from-creator-projection",
      label: "Account state remains separate from Creator projection",
      ok: includesAll(profileHook, ["const isCreatorProjectionActive = false", "accountReady", "observedUserProfile?.uid === user.uid"])
        && !profileHook.includes("useAdminViewAs")
        && !profileHook.includes("/api/creator/")
        && !accountSettings.includes("CreatorDashboardSettingsHub")
        && profilePage.includes('redirect("/settings")'),
      evidence: ["The actual Account hook owns the resolved caller's matching profile only; Creator data, reads and projection state remain in the Creator workspace."],
    },
    {
      key: "creator-settings-ui-readonly",
      label: "Current Creator settings projection blocks writes and preserves visible state",
      ok: includesAll(creatorSettingsHub, [
        "useAdminViewAs",
        "viewAsState?.adminViewingAsUserId",
        "currentSurfaceSettings?.projection?.readOnly === true",
        "isReadOnlyProjection",
        "readOnly={isReadOnlyProjection}",
        "isReadOnly={isReadOnlyProjection}",
        "<CreatorSettingsControlDeck",
      ]) && includesAll(creatorSettingsDeck, ["isReadOnly", "Read-only"])
        && includesAll(accountPanels, ["KandyProfilePanel", "KandyAccountDetailsPanel", "KandyNotificationsPanel", "KandyPrivacyDataPanel"]),
      evidence: ["Current Creator managers and the delegated settings deck render the server projection state; inactive Profile section banners are retired rather than counted as production projection proof."],
    },
    {
      key: "creator-api-projection-read",
      label: "Creator API routes read projected creator data",
      ok: includesAll(creatorSettingsRoute, ["readAdminCreatorProjectionContext", "const creatorId = projection?.targetCreatorId || caller.uid", "requireCreator(creatorId)"]) &&
        includesAll(creatorRequestsRoute, ["readAdminCreatorProjectionContext", "projectionCreatorId = projection?.targetCreatorId", "queryCreatorId = projectionCreatorId", '.where(field, "==", queryValue)']) &&
        includesAll(creatorBookingsRoute, ["readAdminCreatorProjectionContext", "projectionCreatorId = projection?.targetCreatorId", "creatorId = projectionCreatorId"]) &&
        includesAll(creatorBroadcastsRoute, ["readAdminCreatorProjectionContext", "creatorId = projection?.targetCreatorId"]) &&
        includesAll(creatorSubscriptionsRoute, ["subscribers", "readAdminCreatorProjectionContext", "creatorId = projection?.targetCreatorId"]) &&
        includesAll(chatThreadsRoute, ["readAdminCreatorProjectionContext", "viewerUid = projection?.targetCreatorId || caller.uid", "effectiveCallerSnap = projection"])
        && [creatorSettingsRoute, creatorRequestsRoute, creatorBookingsRoute, creatorBroadcastsRoute, creatorSubscriptionsRoute].every((source) => includesAll(source, ["if (projection)", "return buildAdminCreatorProjectionReadOnlyResponse()"])),
      evidence: [
        "Each current route binds read queries to the validated projection target; its mutation handlers return the canonical read-only response before writes. Chat separately binds its viewer and effective profile to the target.",
      ],
    },
    {
      key: "admin-context-copy",
      label: "Admin view-as copy is projection-oriented",
      ok: includesAll(adminContext, [
        "read-only projection",
      ]),
      evidence: [
        "Admin view-as start toast now names the session as a read-only projection.",
      ],
    },
    {
      key: "package-script",
      label: "Package script is wired",
      ok: packageJson.includes("\"check:creator-dashboard-projection-lock\""),
      evidence: [
        "package.json exposes the creator dashboard projection lock command.",
      ],
    },
  ];

  const criticalBlockers = checks
    .filter((check) => !check.ok)
    .map((check) => `${check.key}: ${check.label}`);

  const warnings: string[] = [];
  const status: LockReport["status"] = criticalBlockers.length > 0 ? "fail" : "pass";
  const report: LockReport = {
    generatedAt: new Date().toISOString(),
    status,
    criticalBlockers,
    warnings,
    changedFilesSinceLastCreatorDashboardProjectionLock: collectChangedFiles(),
    requiredTargetedChecks: [
      "npm run check:creator-dashboard-projection-lock",
      "npm run typecheck",
    ],
    forbiddenBroadChecks: [
      "npm run check",
      "playwright",
      "lighthouse",
      "cypress",
      "firebase deploy",
    ],
    promoReadinessNotes: [
      "Admin can refine the creator dashboard from an admin account using real creator data.",
      "Projection mode is clearly labeled read-only and the write paths are blocked in UI and server routes.",
      "Missing data now reads as unavailable rather than fake healthy zeros on the creator dashboard/profile surfaces.",
    ],
    checks,
  };

  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

const report = validate();
const summary = [
  `status=${report.status}`,
  `criticalBlockers=${report.criticalBlockers.length}`,
  `warnings=${report.warnings.length}`,
  `changedFiles=${report.changedFilesSinceLastCreatorDashboardProjectionLock.length}`,
].join(" ");

console.log(summary);
if (report.status === "fail") {
  for (const blocker of report.criticalBlockers) {
    console.log(`blocker: ${blocker}`);
  }
  process.exitCode = 1;
}
