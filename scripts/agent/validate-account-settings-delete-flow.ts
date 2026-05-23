import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const REPORT_PATH = "agent/state/account-settings-delete-flow.generated.json";
const DOC_PATH = "docs/agent-truth/account-settings-delete-flow.md";

type Status = "pass" | "fail";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function git(args: string[]) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of git([...args]).split(/\r?\n/u)) {
      const file = line.trim().replace(/\\/gu, "/");
      if (file) files.add(file);
    }
  }
  return [...files].sort();
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function status(value: boolean): Status {
  return value ? "pass" : "fail";
}

function renderDoc(report: {
  generatedAtUtc: string;
  status: Status;
  currentHead: string;
  deleteFlowStatusBefore: string;
  deleteFlowStatusAfter: string;
  immediateDeletionBehavior: string;
  checks: Record<string, boolean>;
  changedFiles: string[];
  validationFailures: string[];
}) {
  mkdirSync(dirname(DOC_PATH), { recursive: true });
  writeFileSync(DOC_PATH, [
    "# Account Settings Delete Flow",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Contract",
    "",
    "- Account Settings owns additional bottom scroll padding so the Delete Account row can move above the floating Report issue chip, bottom nav, and safe area.",
    "- The Report issue chip, top nav, bottom nav, chat, payment, wallet, PayPal, and GumDrop math remain untouched.",
    "- Delete Account uses an explicit confirmation modal before calling the existing authenticated server delete route.",
    "- The client never passes an arbitrary user id. `/api/user/delete` scopes deletion to the authenticated caller.",
    "- Failures use human-readable account-safety copy and create debug-visible client evidence.",
    "- Telemetry is identity-aware through the canonical client telemetry envelope and does not include PII or provider payloads.",
    "",
    "## Flow Inventory",
    "",
    `- Before: ${report.deleteFlowStatusBefore}`,
    `- After: ${report.deleteFlowStatusAfter}`,
    `- Immediate deletion behavior: ${report.immediateDeletionBehavior}`,
    "",
    "## Checks",
    "",
    ...Object.entries(report.checks).map(([key, passed]) => `- ${passed ? "pass" : "fail"}: ${key}`),
    "",
    "## Changed Files",
    "",
    ...(report.changedFiles.length > 0 ? report.changedFiles.map((file) => `- ${file}`) : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length > 0 ? report.validationFailures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n"));
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = git(["rev-parse", "HEAD"]) || "unknown";
  const files = changedFiles();
  const packageJson = read("package.json");
  const settingsPage = read("src/components/Settings/UserSettingsPage.tsx");
  const supportSection = read("src/app/dashboard/profile/components/ProfileSupportSafetySection.tsx");
  const profileState = read("src/app/dashboard/profile/hooks/useProfileState.tsx");
  const deleteRoute = read("src/app/api/user/delete/route.ts");
  const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
  const telemetryClient = read("src/lib/telemetry.ts");

  const protectedNavOrChipChanges = files.filter((file) =>
    file === "src/components/Feedback/GlobalBugReportTrigger.tsx"
    || file === "src/components/Feedback/ReportBugButton.tsx"
    || file === "src/components/Navigation/MobileBottomBar.tsx"
    || file === "src/components/Navbar.tsx"
    || file === "src/components/layout/BottomNav.tsx"
    || file === "src/components/layout/TopNav.tsx"
    || /(^|\/)(BottomNav|TopNav)\.(tsx|ts|jsx|js)$/u.test(file));
  const protectedChatPaymentGumdropChanges = files.filter((file) =>
    /^src\/components\/Chat\//u.test(file)
    || /^src\/app\/api\/(chat|paypal|wallet|payment|checkout)\b/iu.test(file)
    || /^src\/lib\/(chat|paypal|payment|wallet|gumdrop|gumdrops|gumdrop-)/iu.test(file)
    || /^src\/components\/PurchaseModal\.tsx$/u.test(file));

  const deleteEvents = [
    "account_delete_clicked",
    "account_delete_confirm_opened",
    "account_delete_confirmed",
    "account_delete_cancelled",
    "account_delete_request_submitted",
    "account_delete_failed",
    "account_delete_completed",
  ];
  const telemetrySources = `${telemetryCatalog}\n${telemetryClient}\n${profileState}`;
  const telemetryBuilderStart = profileState.indexOf("const buildAccountDeleteTelemetryParams");
  const telemetryBuilder = telemetryBuilderStart >= 0 ? profileState.slice(telemetryBuilderStart, profileState.indexOf("const handleRequestDeletion", telemetryBuilderStart)) : "";

  const checks = {
    accountSettingsBottomSafe: settingsPage.includes('data-account-settings-bottom-safe="true"')
      && settingsPage.includes('data-report-issue-chip-untouched="true"')
      && settingsPage.includes('data-delete-account-visible-above-floating-actions="true"')
      && settingsPage.includes("USER_MOBILE_FLOATING_CONTROL_BOTTOM_OFFSET")
      && settingsPage.includes("env(safe-area-inset-bottom)")
      && settingsPage.includes("scroll-padding-bottom"),
    reportIssueChipUntouched: !protectedNavOrChipChanges.some((file) => file.includes("Feedback/")),
    bottomNavUntouched: !protectedNavOrChipChanges.some((file) => /BottomNav|MobileBottomBar/u.test(file)),
    topNavUntouched: !protectedNavOrChipChanges.some((file) => /TopNav|Navbar/u.test(file)),
    chatPaymentGumdropMathUntouched: protectedChatPaymentGumdropChanges.length === 0,
    deleteUiHasConfirmationStep: supportSection.includes("Delete account?")
      && supportSection.includes("data-account-delete-confirmation-modal")
      && supportSection.includes("aria-modal=\"true\"")
      && supportSection.includes("This cannot be undone.")
      && !profileState.includes("window.confirm("),
    deleteUsesExistingSafeRoute: profileState.includes('authFetch("/api/user/delete", { method: "DELETE" })')
      && deleteRoute.includes('auth: "user"')
      && deleteRoute.includes("scopeToCaller: true")
      && deleteRoute.includes("const { uid } = caller")
      && deleteRoute.includes("adminAuth.deleteUser(uid)")
      && !deleteRoute.includes("await request.json()"),
    clientCannotPassArbitraryUserId: !/userId\s*[:=]\s*user|uid\s*[:=]\s*user|JSON\.stringify\(\s*\{[^}]*userId/iu.test(profileState)
      && !/userId|targetUserId|uid/u.test(telemetryBuilder),
    immediateDeletionTruthful: profileState.includes("deletion_mode: \"immediate_server_delete\"")
      && profileState.includes("account_delete_completed")
      && !supportSection.includes("Deletion request sent"),
    humanFailureCopy: profileState.includes("Account deletion could not start because your account session is missing. Sign in again and retry.")
      && profileState.includes("We could not submit the deletion request right now. Try again or contact support.")
      && !supportSection.includes("Internal server error")
      && !profileState.includes("Internal server error"),
    deleteTelemetryRegistered: deleteEvents.every((eventName) => telemetryCatalog.includes(`eventName: "${eventName}"`))
      && deleteEvents.every((eventName) => profileState.includes(`"${eventName}"`))
      && deleteEvents.every((eventName) => telemetryClient.includes(`"${eventName}"`)),
    deleteTelemetryNoPii: !/(email|displayName|providerData|idToken|refreshToken|providerId|phoneNumber|photoURL)/u.test(telemetryBuilder),
    debugVisibleFailure: profileState.includes("reportClientIssue")
      && profileState.includes('debugLane: "account_safety"')
      && profileState.includes("account-delete-flow-route-failed"),
    packageScriptPresent: JSON.parse(packageJson).scripts?.["check:account-settings-delete-flow"] === "tsx scripts/agent/validate-account-settings-delete-flow.ts",
  };

  const validationFailures = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => `${key} failed.`);

  const report = {
    generatedAtUtc,
    reportKey: "account-settings-delete-flow",
    currentHead,
    status: status(validationFailures.length === 0),
    accountSettingsFileChanged: "src/components/Settings/UserSettingsPage.tsx",
    supportSafetyFileChanged: "src/app/dashboard/profile/components/ProfileSupportSafetySection.tsx",
    stateHookChanged: "src/app/dashboard/profile/hooks/useProfileState.tsx",
    deleteRoute: "src/app/api/user/delete/route.ts",
    deleteFlowStatusBefore: "fully_wired_route_with_window_confirm_and_raw_failure_copy",
    deleteFlowStatusAfter: "fully_wired_modal_confirmed_immediate_server_delete",
    immediateDeletionBehavior: "Existing authenticated server route deletes account data and deletes the Firebase Auth user; client only submits intent and signs out after success.",
    reportIssueChipUntouched: checks.reportIssueChipUntouched,
    topNavUntouched: checks.topNavUntouched,
    bottomNavUntouched: checks.bottomNavUntouched,
    chatPaymentGumdropMathUntouched: checks.chatPaymentGumdropMathUntouched,
    telemetryEvents: deleteEvents,
    debugVisibilityStatus: checks.debugVisibleFailure ? "source_ready_failure_evidence" : "missing_failure_evidence",
    changedFiles: files,
    checks,
    validationFailures,
  };

  writeJson(REPORT_PATH, report);
  renderDoc(report);

  if (validationFailures.length > 0) {
    console.error("Account settings delete flow validation failed:");
    for (const failure of validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("Account settings delete flow validation passed.");
}

main();
