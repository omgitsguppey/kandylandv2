import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  getSettingsClientPreferenceDebugSummary,
  getStaleClientPreferenceBypasses,
  getUnsafeClientPreferenceItems,
  SETTINGS_CLIENT_PREFERENCE_CONTRACT_VERSION,
  SETTINGS_CLIENT_PREFERENCE_ITEMS,
} from "@/lib/settings/client-preferences-contract";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const REPORT_PATH = "agent/state/stale-client-preferences-cleanup.generated.json";
const DOC_PATH = "docs/agent-truth/stale-client-preferences-cleanup.md";

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readOptional(path: string) {
  try {
    return read(path);
  } catch {
    return "";
  }
}

function write(path: string, value: string) {
  mkdirSync(dirname(join(ROOT, path)), { recursive: true });
  writeFileSync(join(ROOT, path), value);
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

function rg(pattern: string, paths: string[]) {
  try {
    return execFileSync("rg", ["-n", pattern, ...paths], { cwd: ROOT, encoding: "utf8" })
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function localStorageSettingBypasses() {
  const matches = rg("localStorage\\.(setItem|getItem)|sessionStorage\\.(setItem|getItem)", ["src"]);
  const allowedFiles = [
    "src/lib/privacy-consent.ts",
    "src/components/CoreLayoutWrapper.tsx",
    "src/components/Dashboard/NotificationPromptBanner.tsx",
    "src/components/Dashboard/TaskGuidanceBanner.tsx",
    "src/components/Feedback/ContentSatisfactionPrompt.tsx",
    "src/lib/analytics/analytics-identity-link.ts",
    "src/lib/telemetry.ts",
    "src/components/Analytics/DeepTracker.tsx",
    "src/hooks/useViewerWatchSession.ts",
    "src/context/RolloutContext.tsx",
    "src/context/AuthContext.tsx",
    "src/hooks/client-runtime.ts",
    "src/lib/admin/synthetic-creators-view-as.ts",
    "src/lib/client-diagnostics.ts",
    "src/lib/client-session.ts",
    "src/lib/navigation-persistence.ts",
    "src/components/PwaRuntimeBridge.tsx",
    "src/components/Auth/GuidedOnboarding.tsx",
    "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx",
  ];
  return matches.filter((line) => {
    const file = line.split(":")[0]?.replace(/\\/gu, "/") ?? "";
    if (allowedFiles.includes(file)) return false;
    return /settings|preference|privacy|creator/i.test(line);
  });
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = git(["rev-parse", "HEAD"]) || "unknown";
  const changed = changedFiles();
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  const profileState = read("src/app/dashboard/profile/hooks/useProfileState.tsx");
  const profileRoute = read("src/app/api/user/profile/route.ts");
  const privacyConsent = read("src/lib/privacy-consent.ts");
  const coreLayout = read("src/components/CoreLayoutWrapper.tsx");
  const creatorHub = read("src/components/Creators/CreatorDashboardSettingsHub.tsx");
  const creatorRoute = read("src/app/api/creator/settings/route.ts");
  const creatorContract = read("src/lib/creator-settings/creator-settings-contract.ts");
  const debugSummary = read("src/lib/debug/debug-panel-tracking-summary.ts");
  const featureRegistry = read("src/lib/features/feature-registration-registry.ts");
  const settingsContract = read("src/lib/settings/settings-surface-contract.ts");
  const adminAnalyticsState = read("src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx");

  const protectedSurfaceChanges = changed.filter((file) => {
    const protectedPath = /^src\/components\/Chat\//u.test(file)
      || /^src\/app\/chat\//u.test(file)
      || /^src\/app\/dashboard\/chat\//u.test(file)
      || file === "src/components/Navbar.tsx"
      || file === "src/components/Navigation/MobileBottomBar.tsx"
      || /(^|\/)(TopNav|BottomNav)\.(tsx|ts|jsx|js)$/u.test(file)
      || /^src\/app\/api\/(paypal|wallet|payment|checkout)\b/iu.test(file)
      || /^src\/lib\/(paypal|payment|wallet|gumdrop|gumdrops|gumdrop-)/iu.test(file);

    if (!protectedPath) {
      return false;
    }

    return /\b(localStorage|sessionStorage|settings|preference|privacy)\b/iu.test(readOptional(file));
  });

  const directStorageBypasses = localStorageSettingBypasses();
  const staleBypasses = getStaleClientPreferenceBypasses();
  const unsafeUnknown = getUnsafeClientPreferenceItems();
  const debugPreferenceSummary = getSettingsClientPreferenceDebugSummary();
  const staleSettingHelperImports = rg("settingsCache|cachedSettings|tempSettings|mockSettings|legacySettings", ["src"]);

  const checks = {
    packageScriptPresent: packageJson.scripts?.["check:stale-client-preferences-cleanup"] === "tsx scripts/agent/validate-stale-client-preferences-cleanup.ts",
    clientPreferenceContractPresent: SETTINGS_CLIENT_PREFERENCE_CONTRACT_VERSION === "2026.06.deploy-storage-drift.1"
      && SETTINGS_CLIENT_PREFERENCE_ITEMS.length >= 5,
    derivedSnapshotCachesDeployVersionGuarded: SETTINGS_CLIENT_PREFERENCE_ITEMS
      .filter((item) => item.storageRole === "derived_snapshot_cache")
      .every((item) =>
        item.classification === "deploy_version_guarded_snapshot"
        && item.canPersistAcrossSessions === false
        && item.mayHydrateSettingsTruth === false,
      )
      && includesAll(adminAnalyticsState, [
        "appVersion: ADMIN_ANALYTICS_STORAGE_VERSION",
        "parsed.appVersion !== ADMIN_ANALYTICS_STORAGE_VERSION",
        "buildOverviewSnapshotStorageKey(url)",
      ]),
    noContractedStaleBypasses: staleBypasses.length === 0 && unsafeUnknown.length === 0,
    noPersistedLocalStorageSettingsBypass: directStorageBypasses.length === 0,
    noBackendTruthStoredInBrowser: SETTINGS_CLIENT_PREFERENCE_ITEMS.every((item) => item.storageRole !== "backend_truth" && item.mayHydrateSettingsTruth === false),
    privacyTogglesUseConsentPolicy: includesAll(profileState, ['authFetch("/api/user/profile"', "persistPrivacySettingsSnapshot"])
      && includesAll(profileRoute, ["normalizePrivacySettings", "privacySettings"])
      && includesAll(privacyConsent, ["buildConsentSettingsFromDecision", "resolveConsentMode", "CONSENT_TRACKING_STORAGE_KEYS"])
      && includesAll(coreLayout, ["shouldSyncGuestConsentToAccount", "buildAccountPrivacySettingsFromConsentSnapshot", "authFetch(\"/api/user/profile\""]),
    creatorSettingsUseControlPlane: includesAll(creatorHub, ['authFetch(`/api/creator/settings${query}`', "saveSettingsSection", "setDraftSettings(body.settings ?? null)"])
      && includesAll(creatorRoute, ["sanitizeCreatorSettingsControlPlaneUpdate", "sourceTruth: \"creator_settings_doc\""])
      && includesAll(creatorContract, ["buildCreatorSettingsControlPlane", "sanitizeCreatorSettingsControlPlaneUpdate"]),
    clientDefaultCannotSilentlyOverrideServer: includesAll(profileState, ["normalizedInitialState", "userProfile?.privacySettings", "lastSavedSignatureRef.current"])
      && includesAll(coreLayout, ["persistPrivacySettingsSnapshot({", "userProfile.privacySettings", "preserveTimestamp: true"])
      && includesAll(creatorHub, ["setDraftSettings(body.settings ?? null)", "settingsState === \"configured\""]),
    noStaleSettingsHelperImports: staleSettingHelperImports.length === 0,
    debugPanelFlagsStaleBypasses: includesAll(debugSummary, ["staleClientPreferences", "stale client preference bypass", "SETTINGS_HEALTH_COMPONENTS"])
      && settingsContract.includes("settings_health")
      && debugPreferenceSummary.laneId === "settings_health",
    featureRegistrationCovered: featureRegistry.includes('featureId: "user_dashboard"')
      && featureRegistry.includes('featureId: "creator_settings"')
      && featureRegistry.includes('featureId: "cookie_consent_privacy"'),
    protectedSurfacesUntouched: protectedSurfaceChanges.length === 0,
  };

  const failures = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => `${name} failed.`);

  const report = {
    generatedAtUtc,
    reportKey: "stale-client-preferences-cleanup",
    status: failures.length === 0 ? "pass" : "fail",
    currentHead,
    classification: {
      canonicalBackendBacked: SETTINGS_CLIENT_PREFERENCE_ITEMS.filter((item) => item.classification === "canonical_backend_backed").map((item) => item.id),
      localUiOnlyDisplayState: SETTINGS_CLIENT_PREFERENCE_ITEMS.filter((item) => item.classification === "local_ui_only_display_state").map((item) => item.id),
      staleBypass: staleBypasses.map((item) => item.id),
      legacyFallback: SETTINGS_CLIENT_PREFERENCE_ITEMS.filter((item) => item.classification === "legacy_fallback").map((item) => item.id),
      unsafeUnknown: unsafeUnknown.map((item) => item.id),
    },
    directStorageBypasses,
    staleSettingHelperImports,
    debugPreferenceSummary,
    changedFiles: changed,
    protectedSurfaceChanges,
    checks,
    validationFailures: failures,
  };

  write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  write(DOC_PATH, [
    "# Stale Client Preferences Cleanup",
    "",
    `Generated: ${generatedAtUtc}`,
    `Status: ${report.status}`,
    `Head: ${currentHead}`,
    "",
    "## Result",
    "",
    "- Account and privacy settings remain backend-backed through `/api/user/profile`.",
    "- Creator settings remain backend-backed through `/api/creator/settings` and `src/lib/creator-settings/creator-settings-contract.ts`.",
    "- Local storage is limited to consent mirroring, telemetry duplicate prevention, and UI-only dismissal/draft state.",
    "- Derived admin/browser snapshot caches must be session-only and deploy-version guarded before hydration.",
    "- No persisted localStorage setting bypasses backend truth.",
    "- Debug visibility stays in the `Settings health` lane and can surface stale client preference bypass counts.",
    "",
    "## Inventory",
    "",
    ...SETTINGS_CLIENT_PREFERENCE_ITEMS.map((item) => `- ${item.id}: ${item.classification}, ${item.storageKind}, ${item.storageRole}; truth=${item.canonicalTruth}`),
    "",
    "## Checks",
    "",
    ...Object.entries(checks).map(([name, passed]) => `- ${passed ? "pass" : "fail"}: ${name}`),
    "",
    "## Validator Failure Rules",
    "",
    "- persisted localStorage setting bypasses backend truth",
    "- privacy/tracking setting bypasses consent policy",
    "- creator setting bypasses creator settings contract",
    "- client default can override server value silently",
    "- derived snapshot cache lacks deploy-version guard",
    "- stale settings helper remains imported",
    "- debug panel cannot flag stale bypasses",
    "",
    "## Validation Failures",
    "",
    ...(failures.length > 0 ? failures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n"));

  if (failures.length > 0) {
    console.error("Stale client preferences cleanup validation failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log("Stale client preferences cleanup validation passed.");
}

main();
