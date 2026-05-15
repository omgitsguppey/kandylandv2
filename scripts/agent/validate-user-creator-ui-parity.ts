import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type ParitySeverity = "P0" | "P1" | "P2";

export type UserCreatorParityFinding = {
  key: string;
  severity: ParitySeverity;
  title: string;
  fileOrSurface: string;
  status: "fixed" | "deferred" | "current";
  ownerLane: string;
  evidence: string[];
  exactNextAction: string;
};

export type UserCreatorUiParityReport = {
  generatedAtUtc: string;
  reportKey: "user-creator-ui-parity";
  currentHead: string;
  summary: {
    surfacesScanned: number;
    fakeActionsFound: number;
    fakeActionsFixed: number;
    mobileParityRisks: number;
    mobileParityFixed: number;
    routeParityRisks: number;
    routeParityFixed: number;
    eagerFetchRisks: number;
    eagerFetchFixed: number;
    deferredAdminBackend: number;
    deferredPaymentRuntime: number;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  surfaces: Array<{
    path: string;
    classification: "user_ui" | "creator_ui" | "shared_user_shell";
    checks: string[];
  }>;
  fixesApplied: UserCreatorParityFinding[];
  deferredFindings: UserCreatorParityFinding[];
  nextFixOrder: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const reportRelativePath = "agent/state/user-creator-ui-parity.generated.json";
const reportPath = join(repoRoot, reportRelativePath);

const allowedRoots = [
  "src/components/Creators",
  "src/app/dashboard",
  "src/components/Navigation",
  "src/components/Drops",
  "src/app/drops",
  "src/app/creators",
  "src/components/ReleaseNotes",
] as const;

const singletonAllowedFiles = [
  "src/components/Chat/ChatExperience.tsx",
  "src/app/page.tsx",
  "src/app/HomeClient.tsx",
] as const;

const forbiddenDiffPrefixes = [
  "src/app/api/admin/",
  "src/app/admin/",
  "src/components/Admin/",
  "src/lib/server/admin-",
  "src/lib/admin-",
  "functions/",
  "firestore.rules",
  "storage.rules",
] as const;

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

function userCreatorSourceFiles() {
  const files = allowedRoots.flatMap((root) => walk(root));
  for (const filePath of singletonAllowedFiles) {
    if (existsSync(join(repoRoot, filePath))) files.push(filePath);
  }
  return Array.from(new Set(files)).sort();
}

function classifySurface(filePath: string): UserCreatorUiParityReport["surfaces"][number]["classification"] {
  if (filePath.startsWith("src/components/Creators") || filePath.startsWith("src/app/creators")) return "creator_ui";
  if (filePath.startsWith("src/components/Navigation") || filePath === "src/components/Chat/ChatExperience.tsx") return "shared_user_shell";
  return "user_ui";
}

function finding(
  key: string,
  severity: ParitySeverity,
  title: string,
  fileOrSurface: string,
  status: UserCreatorParityFinding["status"],
  ownerLane: string,
  evidence: string[],
  exactNextAction: string,
): UserCreatorParityFinding {
  return { key, severity, title, fileOrSurface, status, ownerLane, evidence, exactNextAction };
}

export function detectHrefHashAction(source: string) {
  return /href="#"/u.test(source);
}

export function detectCreatorSelfLoopAction(source: string) {
  return /href="\/dashboard\/creator"|href:\s*"\/dashboard\/creator"/u.test(source);
}

export function detectGenericOpenSectionCopy(source: string) {
  return /\bOpen section\b/u.test(source);
}

export function detectUnconditionalCreatorManagerStack(source: string) {
  const managerCount = [
    "CreatorRequestsManager",
    "CreatorBookingsManager",
    "CreatorFanPassManager",
    "CreatorBroadcastManager",
  ].filter((name) => source.includes(`<${name}`)).length;
  if (managerCount < 4) return false;
  return !(source.includes("const activeManager") && source.includes("data-creator-active-manager") && source.includes("openSection ==="));
}

export function detectFanPassMutationControls(source: string) {
  return /method:\s*"(?:POST|PUT|DELETE)"|>\s*(?:Subscribe|Cancel)\s*</u.test(source);
}

export function detectTinyButtonTargets(source: string) {
  const buttonMatches = source.match(/<button[\s\S]*?<\/button>/gu) ?? [];
  return buttonMatches.some((button) => {
    if (/data-ui-hit-target="compact-approved"|min-h-11|h-11|py-2\.5/u.test(button)) return false;
    return /py-1\.5/u.test(button);
  });
}

export function detectPrimarySourceEvidenceCopy(source: string) {
  return /formatSourceEvidenceDetail\(statsEvidence\)|sourceTruth\/sourceFreshness|(?:^|["'`>])Source truth:|(?:^|["'`>])Freshness:|(?:^|["'`>])Samples:/u.test(source);
}

export function detectNestedCreatorOverflowWithoutApproval(source: string) {
  if (!/(overflow-y-auto|overflow-auto|max-h-)/u.test(source)) return false;
  return !/data-ui-nested-scroll="approved"/u.test(source);
}

export function detectRawShellHeightRisk(source: string) {
  return /(?:^|[\s"'`])h-screen(?:[\s"'`])|100vh/u.test(source);
}

export function detectChatBottomOverscrollRegression(source: string) {
  return !(
    source.includes('data-chat-bottom-nav-reserved="true"') &&
    source.includes('data-chat-composer-above-bottom-nav="true"') &&
    source.includes('data-chat-viewport-owner="internal"')
  );
}

export function detectBetaDrawerVersionContract(source: string) {
  return source.includes("data-beta-version-current={releaseNotes.currentVersion}") &&
    source.includes("Current version: v{releaseNotes.currentVersion}");
}

export function detectForbiddenDrift(files: string[]) {
  return files.filter((filePath) => forbiddenDiffPrefixes.some((prefix) => filePath.startsWith(prefix)));
}

export function scanUserCreatorUiParityFindings(files = userCreatorSourceFiles()) {
  const current: UserCreatorParityFinding[] = [];

  for (const filePath of files) {
    const source = read(filePath);
    if (detectHrefHashAction(source)) {
      current.push(finding("fake_href_hash", "P1", "User or creator UI contains href=\"#\".", filePath, "current", "user-creator-ui", ['href="#"'], "Replace the fake link with a real route, button action, or disabled/configuration-only copy."));
    }
    if (filePath.startsWith("src/components/Creators") && detectCreatorSelfLoopAction(source)) {
      current.push(finding("creator_self_loop", "P1", "Creator UI contains a /dashboard/creator self-loop action.", filePath, "current", "creator-ui", ["/dashboard/creator"], "Replace the self-loop with a real section toggle or remove the action."));
    }
    if (filePath === "src/components/Creators/CreatorDashboardSettingsHub.tsx") {
      if (detectGenericOpenSectionCopy(source)) {
        current.push(finding("generic_open_section_copy", "P2", "Creator dashboard uses generic route/action copy.", filePath, "current", "creator-ui", ["Open section"], "Use specific action copy such as Open profile or Open chat."));
      }
      if (detectUnconditionalCreatorManagerStack(source)) {
        current.push(finding("eager_creator_manager_stack", "P1", "Creator dashboard managers mount together instead of by active section.", filePath, "current", "creator-ui", ["CreatorRequestsManager", "CreatorBookingsManager", "CreatorFanPassManager", "CreatorBroadcastManager"], "Gate each manager behind the active section."));
      }
      if (detectPrimarySourceEvidenceCopy(source)) {
        current.push(finding("primary_source_copy_leak", "P2", "Creator primary cards expose source-detail copy.", filePath, "current", "creator-ui", ["formatSourceEvidenceDetail(statsEvidence)"], "Keep source truth in data attributes or debug/detail surfaces."));
      }
    }
    if (/src\/components\/Creators\/Creator(?:Requests|Bookings|FanPass|Broadcast)Manager\.tsx/u.test(filePath) && detectTinyButtonTargets(source)) {
      current.push(finding("tiny_creator_manager_action", "P2", "Creator manager action buttons are below the mobile hit target.", filePath, "current", "creator-ui", ["py-1.5"], "Use min-h-11 or py-2.5 for manager actions."));
    }
    if (filePath === "src/components/Creators/CreatorFanPassManager.tsx" && detectFanPassMutationControls(source)) {
      current.push(finding("fan_pass_mutation_controls", "P1", "Fan Pass manager exposes fan-side mutation controls.", filePath, "current", "creator-ui", ["Subscribe", "Cancel", "POST/PUT/DELETE"], "Keep Fan Pass dashboard read-only subscriber visibility."));
    }
    if (filePath.startsWith("src/components/Creators") && detectNestedCreatorOverflowWithoutApproval(source)) {
      current.push(finding("nested_creator_overflow", "P2", "Creator component has nested mobile scroll without an approval marker.", filePath, "current", "creator-ui", ["overflow-y-auto", "max-h-"], "Add an explicit approval marker or remove the nested scroll."));
    }
    if (detectRawShellHeightRisk(source)) {
      current.push(finding("raw_shell_height", "P2", "User or creator UI uses raw 100vh/h-screen shell height.", filePath, "current", "user-shell", ["100vh", "h-screen"], "Use shell-safe viewport tokens or 100dvh where appropriate."));
    }
    if (filePath === "src/components/Chat/ChatExperience.tsx" && detectChatBottomOverscrollRegression(source)) {
      current.push(finding("chat_bottom_shell_regression", "P1", "Chat UI shell is missing bottom nav/composer safety markers.", filePath, "current", "chat-ui-shell", ["data-chat-bottom-nav-reserved", "data-chat-composer-above-bottom-nav"], "Restore shell-safe chat layout data attributes without changing message persistence."));
    }
    if (filePath === "src/components/ReleaseNotes/BetaReleaseNotesDrawer.tsx" && !detectBetaDrawerVersionContract(source)) {
      current.push(finding("beta_drawer_version_contract", "P2", "Beta release drawer does not expose the current version contract.", filePath, "current", "release-notes", ["data-beta-version-current"], "Render releaseNotes.currentVersion in the drawer and data attribute."));
    }
  }

  const forbidden = detectForbiddenDrift(changedFiles());
  for (const filePath of forbidden) {
    current.push(finding("forbidden_admin_backend_drift", "P0", "Forbidden admin/backend file changed in a user/creator UI pass.", filePath, "current", "forbidden-surface", [filePath], "Revert the forbidden file before staging or committing."));
  }

  return current;
}

export function buildUserCreatorUiParityReport(): UserCreatorUiParityReport {
  const files = userCreatorSourceFiles();
  const current = scanUserCreatorUiParityFindings(files);
  const p0Count = current.filter((item) => item.severity === "P0").length;
  const p1Count = current.filter((item) => item.severity === "P1").length;
  const p2Count = current.filter((item) => item.severity === "P2").length;

  const fixesApplied: UserCreatorParityFinding[] = [
    finding("creator_dashboard_specific_actions", "P2", "Replaced generic creator card route copy with specific profile/chat affordances.", "src/components/Creators/CreatorDashboardSettingsHub.tsx", "fixed", "creator-ui", ["actionLabel", "Open profile", "Open chat"], "Keep route labels specific when adding dashboard card actions."),
    finding("creator_primary_source_copy_demoted", "P2", "Removed source-evidence helper copy from primary creator dashboard card details.", "src/components/Creators/CreatorDashboardSettingsHub.tsx", "fixed", "creator-ui", ["data-creator-stats-source-truth", "card detail copy"], "Keep source truth in data attributes or debug/detail surfaces."),
    finding("creator_manager_mobile_hit_targets", "P2", "Raised creator manager refresh and mutation controls to mobile-safe hit targets.", "src/components/Creators/*Manager.tsx", "fixed", "creator-ui", ["min-h-11", "py-2.5"], "Require min-h-11 or py-2.5 for future manager actions."),
    finding("creator_agreement_scroll_approved", "P2", "Marked the creator agreement text scroll region as an explicit approved nested scroll.", "src/components/Creators/CreatorAgreementFullText.tsx", "fixed", "creator-ui", ['data-ui-nested-scroll="approved"'], "Use approval data attrs only for intentionally bounded legal text regions."),
  ];

  const deferredFindings: UserCreatorParityFinding[] = [
    finding("admin_backend_backlog_forbidden_today", "P2", "Admin backend/debug/analytics backlog remains out of scope for this pass.", "admin-backend", "deferred", "admin-backend", ["Forbidden by selected issue scope"], "Handle in an admin-backend-specific issue with admin validators."),
    finding("payment_runtime_forbidden_today", "P2", "Payment, wallet, PayPal, and unlock runtime were not modified.", "payment-wallet-paypal", "deferred", "payment-runtime", ["Forbidden by selected issue scope"], "Handle only in a payment-runtime issue with payment guardrails."),
  ];

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "user-creator-ui-parity",
    currentHead: currentHead(),
    summary: {
      surfacesScanned: files.length,
      fakeActionsFound: current.filter((item) => ["fake_href_hash", "creator_self_loop"].includes(item.key)).length,
      fakeActionsFixed: fixesApplied.filter((item) => item.key === "creator_dashboard_specific_actions").length,
      mobileParityRisks: current.filter((item) => ["tiny_creator_manager_action", "nested_creator_overflow", "raw_shell_height", "chat_bottom_shell_regression"].includes(item.key)).length,
      mobileParityFixed: fixesApplied.filter((item) => ["creator_manager_mobile_hit_targets", "creator_agreement_scroll_approved"].includes(item.key)).length,
      routeParityRisks: current.filter((item) => ["fake_href_hash", "creator_self_loop", "generic_open_section_copy", "fan_pass_mutation_controls", "beta_drawer_version_contract"].includes(item.key)).length,
      routeParityFixed: fixesApplied.filter((item) => item.key === "creator_dashboard_specific_actions").length,
      eagerFetchRisks: current.filter((item) => item.key === "eager_creator_manager_stack").length,
      eagerFetchFixed: 0,
      deferredAdminBackend: 1,
      deferredPaymentRuntime: 1,
      p0Count,
      p1Count,
      p2Count,
    },
    surfaces: files.map((filePath) => ({
      path: filePath,
      classification: classifySurface(filePath),
      checks: ["route-action-truth", "mobile-hit-targets", "lazy-manager-mounting", "forbidden-admin-drift"],
    })),
    fixesApplied,
    deferredFindings,
    nextFixOrder: [
      "Run screenshot QA on user and creator mobile routes now that source parity is locked.",
      "Run focused chat shell visual confirmation without changing message persistence.",
      "Handle admin/debug/backend P2 backlog only in an admin-scoped issue.",
      "Handle payment/wallet/PayPal parity only in a payment-scoped issue.",
    ],
  };
}

function writeReport(report: UserCreatorUiParityReport) {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function validate() {
  const report = buildUserCreatorUiParityReport();
  writeReport(report);

  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) {
    console.error("User/creator UI parity failed with current P0/P1 findings:");
    for (const finding of scanUserCreatorUiParityFindings().filter((item) => item.severity !== "P2")) {
      console.error(`- ${finding.severity} ${finding.key}: ${finding.fileOrSurface}`);
    }
    process.exit(1);
  }

  if (report.nextFixOrder.length === 0) {
    console.error("User/creator UI parity failed: nextFixOrder is empty.");
    process.exit(1);
  }

  console.log(`User/creator UI parity passed: ${report.summary.surfacesScanned} surfaces scanned, P0=${report.summary.p0Count}, P1=${report.summary.p1Count}, P2=${report.summary.p2Count}.`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  validate();
}
