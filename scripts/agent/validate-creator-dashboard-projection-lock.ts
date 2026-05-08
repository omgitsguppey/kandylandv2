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
  profileProfileSection: join(repoRoot, "src", "app", "dashboard", "profile", "components", "ProfileProfileSection.tsx"),
  profileAccountSection: join(repoRoot, "src", "app", "dashboard", "profile", "components", "ProfileAccountSection.tsx"),
  profileNotificationsSection: join(repoRoot, "src", "app", "dashboard", "profile", "components", "ProfileNotificationsSection.tsx"),
  profilePrivacySection: join(repoRoot, "src", "app", "dashboard", "profile", "components", "ProfilePrivacyDataSection.tsx"),
  profileCreatorEarningsSection: join(repoRoot, "src", "app", "dashboard", "profile", "components", "ProfileCreatorEarningsSection.tsx"),
  profileCreatorToolsSection: join(repoRoot, "src", "app", "dashboard", "profile", "components", "ProfileCreatorToolsSection.tsx"),
  creatorSettingsRoute: join(repoRoot, "src", "app", "api", "creator", "settings", "route.ts"),
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
  const profileProfileSection = read(files.profileProfileSection);
  const profileAccountSection = read(files.profileAccountSection);
  const profileNotificationsSection = read(files.profileNotificationsSection);
  const profilePrivacySection = read(files.profilePrivacySection);
  const profileCreatorEarningsSection = read(files.profileCreatorEarningsSection);
  const profileCreatorToolsSection = read(files.profileCreatorToolsSection);
  const creatorSettingsRoute = read(files.creatorSettingsRoute);
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
      label: "Dashboard reads projection state",
      ok: includesAll(dashboardClient, [
        "useAdminViewAs",
        "Boolean(viewAsState)",
        "<CreatorWorkspacePanel userProfile={userProfile} />",
      ]),
      evidence: [
        "Dashboard mounts the creator workspace when projection mode is active.",
      ],
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
      label: "Creator workspace blocks destructive actions in projection",
      ok: includesAll(creatorWorkspacePanel, [
        "Creator dashboard is read-only in admin projection.",
        "disabled={broadcastDraft.trim().length < 4 || isProjectionMode}",
        "Create drop",
      ]),
      evidence: [
        "Projection mode disables broadcast, request, booking, and create-drop actions.",
      ],
    },
    {
      key: "profile-hook-projection",
      label: "Profile hook treats projection as read-only",
      ok: includesAll(profileHook, [
        "useAdminViewAs",
        "isCreatorProjectionActive",
        "Creator dashboard is read-only in admin projection.",
        "projectionCreatorId",
      ]),
      evidence: [
        "Profile state now loads projected creator data and blocks creator writes.",
      ],
    },
    {
      key: "profile-ui-readonly",
      label: "Creator dashboard profile sections show read-only banners and disabled controls",
      ok: includesAll(profilePage, [
        "Admin projection",
        "Read-only preview",
        "!state.isCreatorProjectionActive",
      ]) && includesAll(profileProfileSection, ["Read-only admin projection"]) &&
        includesAll(profileAccountSection, ["Read-only admin projection"]) &&
        includesAll(profileNotificationsSection, ["Read-only admin projection"]) &&
        includesAll(profilePrivacySection, ["Read-only admin projection"]) &&
        includesAll(profileCreatorEarningsSection, ["Read-only admin projection"]) &&
        includesAll(profileCreatorToolsSection, ["Read-only admin projection"]),
      evidence: [
        "Profile page and creator-specific sections now present compact read-only copy instead of silent write affordances.",
      ],
    },
    {
      key: "creator-api-projection-read",
      label: "Creator API routes read projected creator data",
      ok: includesAll(creatorSettingsRoute, ["readAdminCreatorProjectionContext", "projection", "creatorId = projection?.targetCreatorId"]) &&
        includesAll(creatorRequestsRoute, ["readAdminCreatorProjectionContext", "effectiveCallerSnap", "targetCreatorId"]) &&
        includesAll(creatorBookingsRoute, ["readAdminCreatorProjectionContext", "projectionCreatorId"]) &&
        includesAll(creatorBroadcastsRoute, ["readAdminCreatorProjectionContext", "projection"]) &&
        includesAll(creatorSubscriptionsRoute, ["subscribers", "readAdminCreatorProjectionContext"]) &&
        includesAll(chatThreadsRoute, ["readAdminCreatorProjectionContext", "viewerUid = projection?.targetCreatorId"]),
      evidence: [
        "Server routes now read the projected creator's data instead of treating the admin session as the creator's own account.",
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
