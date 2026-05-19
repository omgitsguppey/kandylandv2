import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type VisualSeverity = "P0" | "P1" | "P2";
type VisualStatus = "fixed" | "current" | "deferred";

type VisualFinding = {
  key: string;
  severity: VisualSeverity;
  title: string;
  fileOrSurface: string;
  status: VisualStatus;
  ownerLane: string;
  evidence: string[];
  exactNextAction: string;
};

type VisualRoute = {
  route: string;
  surface: "user" | "creator" | "shared_shell" | "release_notes";
  confirmationMode: "source_only" | "screenshot";
  evidencePaths: string[];
  sourceFiles: string[];
  status: "source_confirmed_pending_screenshot" | "screenshot_confirmed";
};

type ForbiddenDriftCheck = {
  key: string;
  status: "clean" | "blocked";
  files: string[];
  exactNextAction: string;
};

export type UserCreatorVisualConfirmationReport = {
  generatedAtUtc: string;
  reportKey: "user-creator-visual-confirmation";
  currentHead: string;
  summary: {
    routesChecked: number;
    screenshotEvidenceAttached: boolean;
    sourceOnlyRoutes: number;
    visualIssuesFound: number;
    visualIssuesFixed: number;
    deferredManualChecks: number;
    forbiddenAdminBackendDrift: number;
    forbiddenPaymentRuntimeDrift: number;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  routes: VisualRoute[];
  fixesApplied: VisualFinding[];
  deferredManualChecks: VisualFinding[];
  forbiddenDriftCheck: ForbiddenDriftCheck[];
  nextFixOrder: string[];
};

export const REQUIRED_VISUAL_CONFIRMATION_ROUTES = [
  "/",
  "/drops",
  "/drops/[id]/preview",
  "/dashboard",
  "/dashboard/creator",
  "/dashboard/profile",
  "/dashboard/settings",
  "/dashboard/library",
  "/dashboard/chat",
  "/creators/[username]",
  "Beta release notes drawer",
  "Mobile nav/sidebar/profile dropdown",
] as const;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const reportRelativePath = "agent/state/user-creator-visual-confirmation.generated.json";
const reportPath = join(repoRoot, reportRelativePath);

const scannedRoots = [
  "src/components/Creators",
  "src/app/dashboard",
  "src/components/Navigation",
  "src/components/Drops",
  "src/app/drops",
  "src/app/creators",
  "src/components/ReleaseNotes",
] as const;

const scannedSingletons = [
  "src/components/Chat/ChatExperience.tsx",
  "src/app/page.tsx",
  "src/app/HomeClient.tsx",
] as const;

const forbiddenAdminBackendPrefixes = [
  "src/app/api/admin/",
  "src/app/admin/",
  "src/components/Admin/",
  "src/lib/server/admin-",
  "src/lib/admin-",
  "functions/",
  "firestore.rules",
  "storage.rules",
] as const;

const paymentRuntimePathPattern = /(?:^|\/)(?:paypal|payment|payments|wallet)(?:\/|-)|(?:^|\/)(?:PayPal|Wallet)(?:\/|-)|src\/app\/api\/(?:paypal|payment|payments|wallet)\//u;

function toPosix(filePath: string) {
  return filePath.replace(/\\/gu, "/");
}

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function changedFiles() {
  const output = execFileSync("git", ["status", "--porcelain=v1", "-z"], { cwd: repoRoot, encoding: "utf8" });
  return output
    .split("\0")
    .filter(Boolean)
    .map((entry) => entry.slice(3).trim().replace(/\\/gu, "/"))
    .filter(Boolean);
}

function walk(relativePath: string, files: string[] = []) {
  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) return files;
  for (const entry of readdirSync(fullPath, { withFileTypes: true })) {
    const child = `${relativePath}/${entry.name}`;
    if (entry.isDirectory()) {
      if ([".next", "node_modules", "coverage"].includes(entry.name)) continue;
      walk(child, files);
      continue;
    }
    if (/\.(ts|tsx|js|jsx)$/u.test(entry.name)) {
      files.push(toPosix(child));
    }
  }
  return files;
}

function sourceFiles() {
  const files = scannedRoots.flatMap((root) => walk(root));
  for (const filePath of scannedSingletons) {
    if (existsSync(join(repoRoot, filePath))) files.push(filePath);
  }
  return Array.from(new Set(files)).sort();
}

function finding(
  key: string,
  severity: VisualSeverity,
  title: string,
  fileOrSurface: string,
  status: VisualStatus,
  ownerLane: string,
  evidence: string[],
  exactNextAction: string,
): VisualFinding {
  return { key, severity, title, fileOrSurface, status, ownerLane, evidence, exactNextAction };
}

export function detectForbiddenAdminBackendDrift(files: string[]) {
  return files.filter((filePath) => forbiddenAdminBackendPrefixes.some((prefix) => filePath.startsWith(prefix)));
}

export function detectForbiddenPaymentRuntimeDrift(files: string[]) {
  return files.filter((filePath) => paymentRuntimePathPattern.test(filePath));
}

export function detectFakeActionTarget(source: string, filePath = "") {
  if (/href="#"/u.test(source)) return true;
  if (filePath.startsWith("src/components/Creators") && /href="\/dashboard\/creator"|href:\s*"\/dashboard\/creator"/u.test(source)) {
    return true;
  }
  return false;
}

export function detectEagerCreatorManagerMount(source: string) {
  const managers = [
    "CreatorRequestsManager",
    "CreatorBookingsManager",
    "CreatorFanPassManager",
    "CreatorBroadcastManager",
  ];
  const mountedManagers = managers.filter((manager) => source.includes(`<${manager}`)).length;
  if (mountedManagers < 4) return false;
  return !(source.includes("const activeManager") && source.includes("data-creator-active-manager") && source.includes("openSection ==="));
}

export function detectFanPassMutationControls(source: string) {
  return /method:\s*"(?:POST|PUT|DELETE)"|>\s*(?:Subscribe|Cancel)\s*</u.test(source);
}

export function detectMissingManagerMobileTargets(source: string) {
  const actionButtonMatches = source.match(/<button[\s\S]*?<\/button>/gu) ?? [];
  return actionButtonMatches.some((button) => {
    const isManagerAction = /\b(?:Refresh|Create broadcast|Accept|Decline|Fulfill|Complete|Cancel)\b/u.test(button);
    if (!isManagerAction) return false;
    return !/data-ui-hit-target="compact-approved"|min-h-11|h-11|py-2\.5/u.test(button);
  });
}

export function detectMissingReleaseDrawerOverflowGuard(source: string) {
  return !(
    source.includes("max-h-[min(34rem,calc(100dvh-7rem))]") &&
    source.includes("overflow-hidden") &&
    source.includes("overflow-y-auto") &&
    source.includes("data-beta-version-current={releaseNotes.currentVersion}") &&
    source.includes("Current version: v{releaseNotes.currentVersion}")
  );
}

export function detectChatShellBottomGuardRegression(source: string) {
  return !(
    source.includes('data-chat-bottom-nav-reserved="true"') &&
    source.includes('data-chat-composer-above-bottom-nav="true"') &&
    source.includes('data-chat-viewport-owner="internal"')
  );
}

export function detectScreenshotEvidenceMismatch(report: UserCreatorVisualConfirmationReport) {
  const failures: string[] = [];
  const routes = new Set(report.routes.map((route) => route.route));
  for (const route of REQUIRED_VISUAL_CONFIRMATION_ROUTES) {
    if (!routes.has(route)) failures.push(`missing_route:${route}`);
  }
  if (report.summary.screenshotEvidenceAttached) {
    const evidenceCount = report.routes.reduce((total, route) => total + route.evidencePaths.length, 0);
    if (evidenceCount === 0) failures.push("missing_screenshot_evidence_paths");
  } else {
    const sourceOnlyCount = report.routes.filter((route) => route.confirmationMode === "source_only").length;
    if (sourceOnlyCount < REQUIRED_VISUAL_CONFIRMATION_ROUTES.length) failures.push("missing_source_only_routes");
  }
  return failures;
}

export function detectFinalVisualQaClaimWithoutEvidence(report: UserCreatorVisualConfirmationReport) {
  if (report.summary.screenshotEvidenceAttached) return false;
  const serialized = JSON.stringify(report).toLowerCase();
  return /final visual qa passed|visual qa passed|visualqapassed["']?\s*:\s*true|visualqastatus["']?\s*:\s*["']passed/u.test(serialized);
}

function routeFor(route: typeof REQUIRED_VISUAL_CONFIRMATION_ROUTES[number], screenshotEvidenceAttached: boolean): VisualRoute {
  const sourceFileMap: Record<typeof REQUIRED_VISUAL_CONFIRMATION_ROUTES[number], string[]> = {
    "/": ["src/app/page.tsx", "src/app/HomeClient.tsx", "src/components/Navigation/ProfileDropdown.tsx"],
    "/drops": ["src/app/drops/DropsClient.tsx", "src/components/Drops/LockedDropPreviewView.tsx"],
    "/drops/[id]/preview": ["src/components/Drops/LockedDropPreviewView.tsx"],
    "/dashboard": ["src/app/dashboard/layout.tsx", "src/components/Navigation/ProfileSidebar.tsx"],
    "/dashboard/creator": ["src/components/Creators/CreatorDashboardSettingsHub.tsx", "src/components/Creators/CreatorBroadcastManager.tsx"],
    "/dashboard/profile": ["src/app/dashboard/profile/components/ProfileProfileSection.tsx", "src/app/dashboard/profile/components/ProfilePrimitives.tsx"],
    "/dashboard/settings": ["src/app/dashboard/settings/page.tsx", "src/components/Navigation/ProfileSidebar.tsx"],
    "/dashboard/library": ["src/app/dashboard/library/LibraryClient.tsx"],
    "/dashboard/chat": ["src/components/Chat/ChatExperience.tsx"],
    "/creators/[username]": ["src/app/creators/[username]/CreatorProfileClient.tsx", "src/components/Creators/CreatorExperiencesPanel.tsx"],
    "Beta release notes drawer": ["src/components/ReleaseNotes/BetaReleaseNotesDrawer.tsx"],
    "Mobile nav/sidebar/profile dropdown": ["src/components/Navigation/ProfileSidebar.tsx", "src/components/Navigation/ProfileDropdown.tsx"],
  };
  const creatorRoutes = new Set(["/dashboard/creator", "/creators/[username]"]);
  const releaseRoutes = new Set(["Beta release notes drawer"]);
  return {
    route,
    surface: releaseRoutes.has(route) ? "release_notes" : creatorRoutes.has(route) ? "creator" : route === "/dashboard/chat" || route === "Mobile nav/sidebar/profile dropdown" ? "shared_shell" : "user",
    confirmationMode: screenshotEvidenceAttached ? "screenshot" : "source_only",
    evidencePaths: [],
    sourceFiles: sourceFileMap[route],
    status: screenshotEvidenceAttached ? "screenshot_confirmed" : "source_confirmed_pending_screenshot",
  };
}

function scanVisualFindings(files = sourceFiles(), changed = changedFiles()) {
  const current: VisualFinding[] = [];

  for (const filePath of files) {
    const source = read(filePath);
    if (detectFakeActionTarget(source, filePath)) {
      current.push(finding("fake_action_target", "P1", "User or creator UI contains a fake href or creator self-loop action.", filePath, "current", "user-creator-ui", ['href="#"', "/dashboard/creator"], "Replace the fake target with a real action, route, or disabled/configuration-only state."));
    }
    if (filePath === "src/components/Creators/CreatorDashboardSettingsHub.tsx" && detectEagerCreatorManagerMount(source)) {
      current.push(finding("eager_creator_managers", "P1", "Creator dashboard managers mount together instead of only when opened.", filePath, "current", "creator-ui", ["CreatorRequestsManager", "CreatorBookingsManager", "CreatorFanPassManager", "CreatorBroadcastManager"], "Keep manager rendering gated by openSection/activeManager."));
    }
    if (/src\/components\/Creators\/Creator(?:Requests|Bookings|FanPass|Broadcast)Manager\.tsx/u.test(filePath) && detectMissingManagerMobileTargets(source)) {
      current.push(finding("manager_action_tap_target", "P1", "Creator manager action controls are missing mobile-safe tap targets.", filePath, "current", "creator-ui", ["Refresh", "Accept", "Decline", "Complete", "Create broadcast"], "Add min-h-11, h-11, py-2.5, or an approved compact hit-target marker."));
    }
    if (filePath === "src/components/Creators/CreatorFanPassManager.tsx" && detectFanPassMutationControls(source)) {
      current.push(finding("fan_pass_mutation_controls", "P1", "Fan Pass dashboard exposes fan-side subscription controls.", filePath, "current", "creator-ui", ["Subscribe", "Cancel", "POST/PUT/DELETE"], "Keep creator Fan Pass subscriber visibility read-only."));
    }
    if (filePath === "src/components/ReleaseNotes/BetaReleaseNotesDrawer.tsx" && detectMissingReleaseDrawerOverflowGuard(source)) {
      current.push(finding("release_drawer_mobile_overflow", "P1", "Beta release drawer lacks mobile overflow/current-version guards.", filePath, "current", "release-notes", ["100dvh", "overflow-y-auto", "data-beta-version-current"], "Keep the drawer bounded to mobile viewport height and tied to releaseNotes.currentVersion."));
    }
    if (filePath === "src/components/Chat/ChatExperience.tsx" && detectChatShellBottomGuardRegression(source)) {
      current.push(finding("chat_shell_bottom_guard", "P1", "Chat shell is missing bottom safe-area/composer guard markers.", filePath, "current", "chat-shell", ["data-chat-bottom-nav-reserved", "data-chat-composer-above-bottom-nav"], "Restore front-end shell markers without touching message persistence."));
    }
  }

  for (const filePath of detectForbiddenAdminBackendDrift(changed)) {
    current.push(finding("forbidden_admin_backend_drift", "P0", "Forbidden admin/backend file changed in a user/creator visual pass.", filePath, "current", "forbidden-admin-backend", [filePath], "Revert the forbidden file before staging."));
  }
  for (const filePath of detectForbiddenPaymentRuntimeDrift(changed)) {
    current.push(finding("forbidden_payment_runtime_drift", "P0", "Forbidden payment/wallet/PayPal runtime file changed in a visual pass.", filePath, "current", "forbidden-payment-runtime", [filePath], "Revert the forbidden runtime file before staging."));
  }

  return current;
}

export function buildUserCreatorVisualConfirmationReport(options: { screenshotEvidenceAttached?: boolean } = {}): UserCreatorVisualConfirmationReport {
  const screenshotEvidenceAttached = options.screenshotEvidenceAttached === true;
  const files = sourceFiles();
  const changed = changedFiles();
  const current = scanVisualFindings(files, changed);
  const adminDrift = detectForbiddenAdminBackendDrift(changed);
  const paymentDrift = detectForbiddenPaymentRuntimeDrift(changed);
  const p0Count = current.filter((item) => item.severity === "P0").length;
  const p1Count = current.filter((item) => item.severity === "P1").length;
  const p2Count = current.filter((item) => item.severity === "P2").length;
  const routes = REQUIRED_VISUAL_CONFIRMATION_ROUTES.map((route) => routeFor(route, screenshotEvidenceAttached));
  const sourceOnlyRoutes = routes.filter((route) => route.confirmationMode === "source_only").length;

  const fixesApplied: VisualFinding[] = [
    finding("creator_broadcast_manager_density", "P2", "Aligned the Broadcast manager shell/header density with other Creator Dashboard managers.", "src/components/Creators/CreatorBroadcastManager.tsx", "fixed", "creator-ui", ["bg-black/45", "Manage fan broadcasts"], "Keep active manager panels visually consistent when adding creator tools."),
    finding("creator_agreement_tap_targets", "P2", "Raised creator agreement PDF and table-of-contents controls to mobile-safe tap targets.", "src/components/Creators/CreatorAgreementFullText.tsx", "fixed", "creator-ui", ["min-h-11", "py-2.5"], "Keep legal agreement controls tappable while preserving the approved bounded scroll region."),
    finding("source_only_visual_confirmation_lock", "P2", "Added a source-only visual confirmation artifact because screenshots were not attached in this run.", reportRelativePath, "fixed", "user-creator-ui", ["screenshotEvidenceAttached=false", "sourceOnlyRoutes"], "Attach manual screenshots in the next visual QA pass before closing visual QA."),
  ];

  const deferredManualChecks = REQUIRED_VISUAL_CONFIRMATION_ROUTES.map((route) => finding(
    `manual_screenshot_${route.toString().replace(/[^a-z0-9]+/giu, "_").replace(/^_|_$/gu, "").toLowerCase() || "home"}`,
    "P2",
    `Manual screenshot confirmation remains for ${route}.`,
    route,
    "deferred",
    "visual-qa",
    ["source-confirmed", "no screenshot evidence attached"],
    "Capture mobile screenshot evidence for this route and update the visual confirmation artifact with evidence paths.",
  ));

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "user-creator-visual-confirmation",
    currentHead: currentHead(),
    summary: {
      routesChecked: routes.length,
      screenshotEvidenceAttached,
      sourceOnlyRoutes,
      visualIssuesFound: current.length,
      visualIssuesFixed: fixesApplied.length,
      deferredManualChecks: deferredManualChecks.length,
      forbiddenAdminBackendDrift: adminDrift.length,
      forbiddenPaymentRuntimeDrift: paymentDrift.length,
      p0Count,
      p1Count,
      p2Count,
    },
    routes,
    fixesApplied,
    deferredManualChecks,
    forbiddenDriftCheck: [
      {
        key: "admin_backend_drift",
        status: adminDrift.length > 0 ? "blocked" : "clean",
        files: adminDrift,
        exactNextAction: adminDrift.length > 0 ? "Revert forbidden admin/backend files before staging." : "No admin/backend drift detected.",
      },
      {
        key: "payment_runtime_drift",
        status: paymentDrift.length > 0 ? "blocked" : "clean",
        files: paymentDrift,
        exactNextAction: paymentDrift.length > 0 ? "Revert forbidden payment/wallet/PayPal runtime files before staging." : "No payment/runtime drift detected.",
      },
    ],
    nextFixOrder: [
      "Capture manual mobile screenshots for /, /drops, locked preview, dashboard, creator dashboard, profile, settings, library, chat shell, creator profile, release drawer, and mobile navigation.",
      "Convert any screenshot-confirmed issue into a route-specific microfix without touching admin backend or payment runtime.",
      "Keep screenshotEvidenceAttached=false until real screenshot evidence paths are attached.",
    ],
  };
}

function writeReport(report: UserCreatorVisualConfirmationReport) {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function validate() {
  const report = buildUserCreatorVisualConfirmationReport();
  writeReport(report);

  const evidenceFailures = detectScreenshotEvidenceMismatch(report);
  if (evidenceFailures.length > 0) {
    console.error(`User/creator visual confirmation failed: ${evidenceFailures.join(", ")}`);
    process.exit(1);
  }
  if (detectFinalVisualQaClaimWithoutEvidence(report)) {
    console.error("User/creator visual confirmation failed: report claims visual QA passed without screenshots.");
    process.exit(1);
  }
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) {
    console.error("User/creator visual confirmation failed with current P0/P1 findings:");
    for (const item of scanVisualFindings().filter((findingItem) => findingItem.severity !== "P2")) {
      console.error(`- ${item.severity} ${item.key}: ${item.fileOrSurface}`);
    }
    process.exit(1);
  }
  if (report.nextFixOrder.length === 0) {
    console.error("User/creator visual confirmation failed: nextFixOrder is empty.");
    process.exit(1);
  }

  console.log(`User/creator visual confirmation passed source checks: ${report.summary.routesChecked} routes source-confirmed, screenshots attached=${report.summary.screenshotEvidenceAttached}, P0=${report.summary.p0Count}, P1=${report.summary.p1Count}, P2=${report.summary.p2Count}.`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  validate();
}
