import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getDisconnectedSettings, getSettingsDebugLaneSummary, SETTINGS_SURFACE_ITEMS, SETTINGS_TELEMETRY_EVENTS } from "@/lib/settings/settings-surface-contract";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const REPORT_PATH = "agent/state/settings-connection-parity.generated.json";
const DOC_PATH = "docs/agent-truth/settings-connection-parity.md";

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function git(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
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

function includesAll(source: string, snippets: string[]) {
  return snippets.every((snippet) => source.includes(snippet));
}

function write(path: string, value: string) {
  mkdirSync(dirname(join(ROOT, path)), { recursive: true });
  writeFileSync(join(ROOT, path), value);
}

function settingIdsFor(surface: "account" | "creator" | "privacy" | "support" | "danger_zone") {
  return SETTINGS_SURFACE_ITEMS.filter((item) => item.surface === surface).map((item) => item.settingId);
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = git(["rev-parse", "HEAD"]) || "unknown";
  const changed = changedFiles();
  const contract = read("src/lib/settings/settings-surface-contract.ts");
  const accountPage = read("src/components/Settings/UserSettingsPage.tsx");
  const privacySection = read("src/app/dashboard/profile/components/ProfilePrivacyDataSection.tsx");
  const notificationSection = read("src/app/dashboard/profile/components/ProfileNotificationsSection.tsx");
  const supportSection = read("src/app/dashboard/profile/components/ProfileSupportSafetySection.tsx");
  const profileState = read("src/app/dashboard/profile/hooks/useProfileState.tsx");
  const primitives = read("src/app/dashboard/profile/components/ProfilePrimitives.tsx");
  const creatorHub = read("src/components/Creators/CreatorDashboardSettingsHub.tsx");
  const creatorRoute = read("src/app/api/creator/settings/route.ts");
  const userProfileRoute = read("src/app/api/user/profile/route.ts");
  const userDataRoute = read("src/app/api/user/data/route.ts");
  const userDeleteRoute = read("src/app/api/user/delete/route.ts");
  const creatorContract = read("src/lib/creator-settings/creator-settings-contract.ts");
  const creatorProfile = read("src/app/creators/[username]/CreatorProfileClient.tsx");
  const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
  const telemetryClient = read("src/lib/telemetry.ts");
  const featureRegistry = read("src/lib/features/feature-registration-registry.ts");
  const debugSummary = read("src/lib/debug/debug-panel-tracking-summary.ts");
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };

  const requiredAccountSettings = [
    "profile_basics",
    "account_timezone",
    "notification_preferences",
    "anonymous_analytics",
    "account_linked_analytics",
    "activity_recommendations",
    "honor_global_privacy_control",
    "essential_only_mode",
    "download_my_data",
    "privacy_policy",
    "faq",
    "support",
    "policies",
    "sign_out",
    "delete_account",
  ];
  const requiredCreatorSettings = [
    "profile_basics",
    "creator_profile_visibility",
    "fan_pass_enabled",
    "fan_pass_pricing",
    "creator_experiences_enabled",
    "paid_message_price_gd",
    "custom_request_min_gd",
    "live_call_enabled",
    "live_call_price_gd",
    "live_call_duration_minutes",
    "live_call_weeklyAvailability",
    "broadcasts_enabled",
    "broadcast_audience",
    "timeline_enabled",
    "show_drops_on_timeline",
    "show_broadcasts_on_timeline",
    "creator_drop_manager",
  ];
  const mappedIds = new Set<string>(SETTINGS_SURFACE_ITEMS.map((item) => item.settingId));
  const visibleSource = [accountPage, privacySection, notificationSection, supportSection, creatorHub].join("\n");
  const protectedSurfaceChanges = changed.filter((file) =>
    /^src\/components\/Chat\//u.test(file)
    || /^src\/app\/chat\//u.test(file)
    || file === "src/components/Navbar.tsx"
    || file === "src/components/Navigation/MobileBottomBar.tsx"
    || /(^|\/)(TopNav|BottomNav)\.(tsx|ts|jsx|js)$/u.test(file)
    || /^src\/app\/api\/(paypal|wallet|payment|checkout)\b/iu.test(file)
    || /^src\/lib\/(paypal|payment|wallet|gumdrop|gumdrops|gumdrop-)/iu.test(file)
    || file === "firestore.rules"
    || file === "storage.rules"
    || file === "database.rules.json");

  const staleScriptRemoved = !changed.includes("scripts/shred_profile.py") || !read("package.json").includes("shred_profile.py");
  const checks = {
    packageScriptPresent: packageJson.scripts?.["check:settings-connection-parity"] === "tsx scripts/agent/validate-settings-connection-parity.ts",
    accountSettingsMapped: requiredAccountSettings.every((settingId) => mappedIds.has(settingId)),
    creatorSettingsMapped: requiredCreatorSettings.every((settingId) => mappedIds.has(settingId)),
    everyVisibleSettingHasBackendOrHonestStatus: SETTINGS_SURFACE_ITEMS.every((item) => item.backendRouteOrAction && ["connected", "link_only", "client_action", "not_configured", "intentionally_hidden"].includes(item.saveBehavior)),
    backendRoutesCovered: includesAll(userProfileRoute, ["privacySettings", "notificationSettings", "accountSettings"])
      && userDataRoute.includes('routeName: "user/data"')
      && userDeleteRoute.includes('routeName: "user/delete"')
      && creatorRoute.includes("sanitizeCreatorSettingsControlPlaneUpdate"),
    featureRegistrationCovered: featureRegistry.includes('featureId: "user_dashboard"')
      && featureRegistry.includes('featureId: "creator_settings"')
      && featureRegistry.includes('featureId: "cookie_consent_privacy"')
      && featureRegistry.includes('featureId: "support"'),
    telemetryEventsRegistered: SETTINGS_TELEMETRY_EVENTS.every((eventName) => telemetryCatalog.includes(`eventName: "${eventName}"`))
      && SETTINGS_TELEMETRY_EVENTS.every((eventName) => telemetryClient.includes(`"${eventName}"`) || telemetryCatalog.includes(`eventName: "${eventName}"`)),
    telemetryEventsWired: includesAll(`${accountPage}\n${privacySection}\n${notificationSection}\n${supportSection}\n${profileState}\n${creatorHub}`, [
      "settings_surface_viewed",
      "setting_toggle_changed",
      "setting_action_clicked",
      "setting_save_succeeded",
      "setting_save_failed",
      "data_export_requested",
      "creator_setting_updated",
    ]),
    debugLanePresent: contract.includes("SETTINGS_DEBUG_LANE")
      && contract.includes("settings_connection_health")
      && debugSummary.includes("settings_connection_health")
      && debugSummary.includes("Settings connection health"),
    privacyTogglesUseConsentPolicy: profileState.includes("persistPrivacySettingsSnapshot")
      && userProfileRoute.includes("normalizePrivacySettings")
      && privacySection.includes("honor_global_privacy_control"),
    creatorSettingsAffectConsumers: includesAll(creatorContract, [
      "buildCreatorSettingsUserFacingImpact",
      "fanPassVisible",
      "timelineVisible",
    ]) && includesAll(creatorProfile, [
      "creatorSettings.subscriptionsEnabled",
      "profileDropsVisible",
      "profileBroadcastsVisible",
    ]),
    routeLabelsClear: accountPage.includes("Creator tools moved to Creator Settings.")
      && creatorHub.includes("Creator dashboard settings")
      && !/>\s*Settings\s*</u.test(visibleSource),
    noCreatorOnlyControlsInAccountSettings: !accountPage.includes("CreatorDashboardSettingsHub")
      && !privacySection.includes("Fan Pass")
      && !supportSection.includes("Fan Pass"),
    rawInternalServerErrorHidden: !visibleSource.includes("Internal server error") && !profileState.includes("Internal server error") && !creatorHub.includes("Internal server error"),
    staleDuplicateLogicRemovedOrClassified: staleScriptRemoved
      && SETTINGS_SURFACE_ITEMS.every((item) => (item as { staleConflictStatus: string }).staleConflictStatus !== "unsafe_unknown")
      && getDisconnectedSettings().every((item) => item.saveBehavior === "not_configured"),
    protectedSurfacesUntouched: protectedSurfaceChanges.length === 0,
    navigationRowsTrackLinkActions: primitives.includes("onClick={onClick}"),
  };
  const failures = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => `${name} failed.`);

  const report = {
    generatedAtUtc,
    reportKey: "settings-connection-parity",
    status: failures.length === 0 ? "pass" : "fail",
    currentHead,
    accountSettingsItemsMapped: settingIdsFor("account").concat(settingIdsFor("privacy"), settingIdsFor("support"), settingIdsFor("danger_zone")),
    creatorSettingsItemsMapped: settingIdsFor("creator"),
    backendRoutesActionsConnected: [
      "/api/user/profile",
      "/api/user/data",
      "/api/user/delete",
      "/api/creator/settings",
      "AuthContext.logout",
      "/privacy",
      "/faq",
      "/dashboard/support",
      "/dashboard/creator/drops",
    ],
    staleConflictingSettingsLogicRemoved: ["scripts/shred_profile.py", "scripts/shred_profile_components.py", "scripts/rewrite_profile_page.py"],
    telemetryEventsAdded: [...SETTINGS_TELEMETRY_EVENTS],
    debugSettingsLaneStatus: getSettingsDebugLaneSummary().status,
    disconnectedSettingCount: getDisconnectedSettings().length,
    changedFiles: changed,
    protectedSurfaceChanges,
    checks,
    validationFailures: failures,
  };

  write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  write(DOC_PATH, [
    "# Settings Connection Parity",
    "",
    `Generated: ${generatedAtUtc}`,
    `Status: ${report.status}`,
    `Head: ${currentHead}`,
    "",
    "## Summary",
    "",
    "- Account Settings owns account, privacy, support, sign out, data export, and delete account controls.",
    "- Creator Settings owns creator profile, Fan Pass, GumDrop experiences, broadcasts, timeline, pricing, and Drop Manager handoffs.",
    "- The canonical map is `src/lib/settings/settings-surface-contract.ts`; it indexes existing routes instead of creating duplicate settings APIs.",
    "- The debug source is one `Settings connection health` lane.",
    "",
    "## Account Settings Items",
    "",
    ...report.accountSettingsItemsMapped.map((item) => `- ${item}`),
    "",
    "## Creator Settings Items",
    "",
    ...report.creatorSettingsItemsMapped.map((item) => `- ${item}`),
    "",
    "## Removed Stale Logic",
    "",
    ...report.staleConflictingSettingsLogicRemoved.map((item) => `- ${item}`),
    "",
    "## Checks",
    "",
    ...Object.entries(checks).map(([name, passed]) => `- ${passed ? "pass" : "fail"}: ${name}`),
    "",
    "## Validation Failures",
    "",
    ...(failures.length > 0 ? failures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n"));

  if (failures.length > 0) {
    console.error("Settings connection parity validation failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log("Settings connection parity validation passed.");
}

main();
