import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  DEFAULT_PRIVACY_SETTINGS,
  buildAccountPrivacySettingsFromConsentSnapshot,
  shouldSyncGuestConsentToAccount,
} from "../../src/lib/privacy-consent";
import {
  canUseBehavioralSignals,
  getConsentUpgradeEffect,
} from "../../src/lib/privacy/consent-tracking-policy";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/cookie-banner-settings-sync.generated.json";
const DOC_PATH = "docs/agent-truth/cookie-banner-settings-sync.md";

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function git(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function changedFiles() {
  const changed = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"]] as const) {
    const output = git([...args]);
    for (const line of output.split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      changed.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...changed].sort();
}

function includesAll(source: string, needles: string[]) {
  return needles.every((needle) => source.includes(needle));
}

function isCookieConsentOwnedPath(path: string) {
  return path === "src/components/CookieBanner.tsx"
    || path === "src/lib/privacy-consent.ts"
    || path.startsWith("src/lib/privacy/")
    || path === "src/lib/analytics/client-tracking-policy.ts"
    || path === "src/components/Analytics/DeepTracker.tsx"
    || path === "src/lib/server/privacy-consent.ts"
    || path === "src/app/api/privacy/consent/route.ts"
    || path === "src/components/CoreLayoutWrapper.tsx"
    || path === "src/app/dashboard/profile/hooks/useProfileState.tsx"
    || path === "scripts/agent/validate-cookie-banner-settings-sync.ts"
    || path === "tests/unit/cookie-banner-settings-sync.spec.ts"
    || path === REPORT_PATH
    || path === DOC_PATH;
}

const bannerSource = read("src/components/CookieBanner.tsx");
const privacyConsentSource = read("src/lib/privacy-consent.ts");
const coreLayoutSource = read("src/components/CoreLayoutWrapper.tsx");
const profileSettingsSource = read("src/app/dashboard/profile/hooks/useProfileState.tsx");
const changed = changedFiles();
const failures: string[] = [];

if (/truncate/u.test(bannerSource)) {
  failures.push("cookie banner text can truncate on mobile.");
}

if (!includesAll(bannerSource, [
  'data-cookie-banner-mobile={isCompactViewport ? "compact" : "standard"}',
  'data-cookie-banner-mobile-size={isCompactViewport ? "320-safe" : "standard"}',
  'data-consent-tracking-connected="true"',
  "overflow-y-auto",
  "env(safe-area-inset-bottom)",
  "grid grid-cols-1 gap-1.5 min-[360px]:grid-cols-2",
  "whitespace-normal break-words",
  "min-h-11",
  "Manage settings",
  "Accept all",
  "Minimal analytics",
  "Decline optional",
])) {
  failures.push("mobile cookie banner lacks compact readable 320px-safe layout, data attrs, or all consent choices.");
}

const acceptEffect = getConsentUpgradeEffect("accept_all");
const minimalEffect = getConsentUpgradeEffect("minimal");
const declineEffect = getConsentUpgradeEffect("decline_optional");
if (acceptEffect.consentMode !== "full_behavioral" || !acceptEffect.enablesBehavioralTracking) {
  failures.push("accept button only hides banner or does not enable full tracking mode.");
}
if (minimalEffect.consentMode !== "minimal_analytics"
  || minimalEffect.enablesBehavioralTracking
  || canUseBehavioralSignals("minimal_analytics")) {
  failures.push("minimal analytics enables behavioral tracking.");
}
if (declineEffect.consentMode !== "necessary_only"
  || declineEffect.enablesBehavioralTracking
  || canUseBehavioralSignals("necessary_only")) {
  failures.push("decline optional enables behavioral tracking.");
}

if (!privacyConsentSource.includes("buildAccountPrivacySettingsFromConsentSnapshot")
  || !privacyConsentSource.includes("shouldSyncGuestConsentToAccount")) {
  failures.push("no guest-to-account consent sync helpers exist.");
}

const guestFull = {
  ...DEFAULT_PRIVACY_SETTINGS,
  consentMode: "full_behavioral" as const,
  consentDecision: "accept_all" as const,
  consentSource: "banner" as const,
  anonymousAnalyticsEnabled: true,
  identifiedAnalyticsEnabled: true,
  allowRecommendations: true,
  showInAnonymousStats: true,
  consentUpdatedAt: 1700000000000,
};
if (!shouldSyncGuestConsentToAccount(guestFull, { consentUpdatedAt: 0 })) {
  failures.push("guest consent does not sync at signup/login when the account has no explicit preference.");
}
if (shouldSyncGuestConsentToAccount(guestFull, { consentUpdatedAt: 1690000000000 })) {
  failures.push("account privacy setting does not override banner.");
}
const accountSettings = buildAccountPrivacySettingsFromConsentSnapshot(guestFull);
if (!accountSettings.identifiedAnalyticsEnabled
  || !accountSettings.allowRecommendations
  || accountSettings.consentUpdatedAt !== guestFull.consentUpdatedAt) {
  failures.push("accept all does not map to account privacy settings.");
}

if (!includesAll(coreLayoutSource, [
  "shouldSyncGuestConsentToAccount",
  "buildAccountPrivacySettingsFromConsentSnapshot",
  "authFetch(\"/api/user/profile\"",
  "consentSource: \"account_settings\"",
  "reportRealtimeIssue(\"privacy consent account sync failed\"",
])) {
  failures.push("app shell does not sync guest consent into account privacy settings after login.");
}

if (!includesAll(profileSettingsSource, [
  "persistPrivacySettingsSnapshot",
  "/api/user/profile",
  "privacySettings",
])) {
  failures.push("logged-in privacy settings do not update banner/tracker state.");
}

const consentLaneChanges = changed.filter(isCookieConsentOwnedPath);
const separateLaneChanges = changed.filter((path) => !isCookieConsentOwnedPath(path));

const report = {
  generatedAtUtc: new Date().toISOString(),
  reportKey: "cookie-banner-settings-sync",
  currentHead: git(["rev-parse", "HEAD"]),
  status: failures.length === 0 ? "pass" : "fail",
  mobileBanner: {
    compact320Safe: bannerSource.includes('data-cookie-banner-mobile-size={isCompactViewport ? "320-safe" : "standard"}'),
    noTruncation: !/truncate/u.test(bannerSource),
    safeAreaBottom: bannerSource.includes("env(safe-area-inset-bottom)"),
    bottomNavReserved: bannerSource.includes("--user-mobile-bottom-nav-reserved-height"),
    readableType: bannerSource.includes("text-xs") && bannerSource.includes("text-sm"),
    allChoicesVisible: includesAll(bannerSource, ["Accept all", "Minimal analytics", "Decline optional", "Manage settings"]),
  },
  consentChoices: {
    acceptAllMode: acceptEffect.consentMode,
    minimalMode: minimalEffect.consentMode,
    declineMode: declineEffect.consentMode,
    minimalAllowsBehavioral: canUseBehavioralSignals("minimal_analytics"),
    declineAllowsBehavioral: canUseBehavioralSignals("necessary_only"),
  },
  settingsSync: {
    guestSyncsWhenAccountDefault: shouldSyncGuestConsentToAccount(guestFull, { consentUpdatedAt: 0 }),
    accountExplicitPreferenceWins: !shouldSyncGuestConsentToAccount(guestFull, { consentUpdatedAt: 1690000000000 }),
    accountSyncWired: coreLayoutSource.includes("authFetch(\"/api/user/profile\""),
    loggedInSettingsPublishLocalSnapshot: profileSettingsSource.includes("persistPrivacySettingsSnapshot"),
  },
  changedFiles: consentLaneChanges,
  separateLaneChanges,
  validationFailures: failures,
};

write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
write(DOC_PATH, [
  "# Cookie Banner Settings Sync",
  "",
  `Status: ${report.status}`,
  "",
  "The cookie banner now uses the consent policy as the source of truth instead of only hiding the banner. Accept all maps to full behavioral tracking, minimal maps to product/performance analytics only, and decline keeps optional tracking off while required app integrity events remain separate in the consent policy.",
  "",
  "## Mobile Banner",
  "",
  `- Compact 320px-safe marker: ${report.mobileBanner.compact320Safe}`,
  `- No truncation token: ${report.mobileBanner.noTruncation}`,
  `- Safe-area bottom aware: ${report.mobileBanner.safeAreaBottom}`,
  `- Bottom nav reserved spacing: ${report.mobileBanner.bottomNavReserved}`,
  `- Choices visible: ${report.mobileBanner.allChoicesVisible}`,
  "",
  "## Settings Sync",
  "",
  `- Guest consent syncs into a default account: ${report.settingsSync.guestSyncsWhenAccountDefault}`,
  `- Existing account privacy preference wins: ${report.settingsSync.accountExplicitPreferenceWins}`,
  `- Account sync route wired: ${report.settingsSync.accountSyncWired}`,
  `- Logged-in settings publish local tracking state: ${report.settingsSync.loggedInSettingsPublishLocalSnapshot}`,
  "",
  "## Validation",
  "",
  ...(failures.length ? failures.map((failure) => `- FAIL: ${failure}`) : ["- Pass."]),
  "",
].join("\n"));

if (failures.length > 0) {
  console.error("Cookie banner settings sync validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Cookie banner settings sync passed: mobile banner readable, choices track consent mode, account settings sync wired.");
