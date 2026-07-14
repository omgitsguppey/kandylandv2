import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  CONSENT_MODE_VALUES,
  CONSENT_TRACKING_STORAGE_KEYS,
  CONSENT_TRACKING_VERSION,
  TRACKING_CAPABILITY_VALUES,
} from "../../src/lib/privacy/consent-tracking-contract";
import {
  canPersistIdentityLink,
  canTrackEvent,
  canUseBehavioralSignals,
  canUseExternalAnalytics,
  getConsentUpgradeEffect,
} from "../../src/lib/privacy/consent-tracking-policy";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/consent-tracking-contract.generated.json";
const DOC_PATH = "docs/agent-truth/consent-tracking-contract.md";

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

const contractSource = read("src/lib/privacy/consent-tracking-contract.ts");
const policySource = read("src/lib/privacy/consent-tracking-policy.ts");
const privacyConsentSource = read("src/lib/privacy-consent.ts");
const trackingPolicySource = read("src/lib/analytics/client-tracking-policy.ts");
const bannerSource = read("src/components/CookieBanner.tsx");
const deepTrackerSource = read("src/components/Analytics/DeepTracker.tsx");
const serverConsentSource = read("src/lib/server/privacy-consent.ts");
const apiConsentSource = read("src/app/api/privacy/consent/route.ts");
const changed = changedFiles();

const failures: string[] = [];

if (!existsSync(join(ROOT, "src/lib/privacy/consent-tracking-contract.ts"))
  || !existsSync(join(ROOT, "src/lib/privacy/consent-tracking-policy.ts"))) {
  failures.push("no consent mode source of truth exists.");
}

if (!includesAll(contractSource, [
  "ConsentMode",
  "TrackingCapability",
  "ConsentDecision",
  "ConsentSource",
  "CONSENT_TRACKING_VERSION",
  "kandydrops.privacy.settings",
  "kandydrops_analytics_consent",
])) {
  failures.push("consent tracking contract lacks required mode/capability/source/storage definitions.");
}

if (!includesAll(policySource, [
  "resolveConsentMode",
  "canTrackEvent",
  "canPersistIdentityLink",
  "canUseBehavioralSignals",
  "canUseExternalAnalytics",
  "getConsentTelemetryReason",
  "getConsentUpgradeEffect",
])) {
  failures.push("consent tracking policy lacks required exports.");
}

if (!privacyConsentSource.includes("buildConsentSettingsFromDecision")
  || !privacyConsentSource.includes("saveGuestConsentDecision")
  || !privacyConsentSource.includes("consentMode")) {
  failures.push("cookie choices are not persisted through the consent tracking policy.");
}

if (!trackingPolicySource.includes("resolveConsentMode")
  || !trackingPolicySource.includes("canTrackCapability")
  || !trackingPolicySource.includes("canUseExternalAnalytics")) {
  failures.push("client tracking policy is not connected to consent mode source of truth.");
}

if (!deepTrackerSource.includes("canUseBehavioralAnalytics")
  || !deepTrackerSource.includes("subscribeToPrivacySettings")
  || !deepTrackerSource.includes("persistGuestQueue([])")) {
  failures.push("DeepTracker does not read consent policy or drop queued behavior when disabled.");
}

if (!serverConsentSource.includes("canTrackEvent")
  || !serverConsentSource.includes("resolveRequestConsentMode")
  || !apiConsentSource.includes("consentMode")) {
  failures.push("server/API consent path is not connected to consent modes.");
}

if (!includesAll(bannerSource, [
  "Accept all",
  "Minimal analytics",
  "Decline optional",
  "data-cookie-banner-mobile",
  "data-consent-mode",
  "data-consent-tracking-connected=\"true\"",
  "saveGuestConsentDecision",
])) {
  failures.push("cookie banner lacks required choices, data attrs, or tracking connection.");
}

if (/truncate/u.test(bannerSource)) {
  failures.push("banner is mobile-truncated.");
}

if (!/max-h-\[calc\(100dvh-7rem-env\(safe-area-inset-top\)-env\(safe-area-inset-bottom\)\)\]/u.test(bannerSource)
  || !bannerSource.includes("overflow-y-auto")) {
  failures.push("banner lacks mobile safe-area readable overflow handling.");
}

if (getConsentUpgradeEffect("accept_all").consentMode !== "full_behavioral"
  || !canUseBehavioralSignals("full_behavioral")) {
  failures.push("accept cookies only hides banner but does not enable full behavioral tracking mode.");
}

if (canUseBehavioralSignals("minimal_analytics")
  || canTrackEvent("semantic_target_clicked", "minimal_analytics")
  || canTrackEvent("watch_session_completed", "necessary_only")) {
  failures.push("full behavioral events can fire under minimal/decline.");
}

if (!canTrackEvent("auth_sign_in_failed", "necessary_only")
  || !canTrackEvent("security_rate_limit_triggered", "necessary_only")
  || !canTrackEvent("paypal_capture_completed", "necessary_only")) {
  failures.push("required/security/payment/account events are blocked by decline.");
}

if (canUseExternalAnalytics("minimal_analytics") || canUseExternalAnalytics("necessary_only")) {
  failures.push("external analytics can load under minimal/decline.");
}

if (canPersistIdentityLink("minimal_analytics")) {
  failures.push("identity links can persist under minimal analytics.");
}

const protectedChanges = changed.filter((path) =>
  /^src\/components\/Navigation\//u.test(path)
  || /^src\/components\/Navbar/u.test(path)
  || /\/chat\//u.test(path)
  || /paypal|payment|wallet|gumdrop/i.test(path));
if (protectedChanges.length > 0) {
  failures.push(`chat/nav/payment protected files changed: ${protectedChanges.join(", ")}`);
}

const report = {
  generatedAtUtc: new Date().toISOString(),
  reportKey: "consent-tracking-contract",
  currentHead: git(["rev-parse", "HEAD"]),
  status: failures.length === 0 ? "pass" : "fail",
  consentPolicyVersion: CONSENT_TRACKING_VERSION,
  consentModes: CONSENT_MODE_VALUES,
  trackingCapabilities: TRACKING_CAPABILITY_VALUES,
  storageKeys: CONSENT_TRACKING_STORAGE_KEYS,
  banner: {
    mobileCompact: bannerSource.includes('data-cookie-banner-mobile={isCompactViewport ? "compact" : "standard"}'),
    noTruncation: !/truncate/u.test(bannerSource),
    fullMessageVisible: bannerSource.includes("overflow-y-auto"),
    choices: ["accept_all", "minimal", "decline_optional"],
    trackingConnected: bannerSource.includes("data-consent-tracking-connected=\"true\""),
  },
  policyChecks: {
    acceptAllEnablesFullBehavioral: getConsentUpgradeEffect("accept_all").consentMode === "full_behavioral",
    minimalAllowsBehavioral: canUseBehavioralSignals("minimal_analytics"),
    declineAllowsRequiredAuth: canTrackEvent("auth_sign_in_failed", "necessary_only"),
    declineAllowsPaymentIntegrity: canTrackEvent("paypal_capture_completed", "necessary_only"),
    minimalAllowsExternalAnalytics: canUseExternalAnalytics("minimal_analytics"),
    minimalPersistsIdentityLink: canPersistIdentityLink("minimal_analytics"),
  },
  changedFiles: changed,
  validationFailures: failures,
};

write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
write(DOC_PATH, [
  "# Consent Tracking Contract",
  "",
  "Status: cookie consent and privacy tracking are connected to a first-class consent mode policy. Minimal or declined choices do not allow full behavioral tracking or external analytics.",
  "",
  `- Policy version: ${CONSENT_TRACKING_VERSION}`,
  `- Modes: ${CONSENT_MODE_VALUES.join(", ")}`,
  `- Capabilities: ${TRACKING_CAPABILITY_VALUES.join(", ")}`,
  `- Banner mobile compact: ${report.banner.mobileCompact}`,
  `- Banner no truncation: ${report.banner.noTruncation}`,
  `- Banner tracking connected: ${report.banner.trackingConnected}`,
  "",
  "## Decision Effects",
  "",
  "- Accept all: full_behavioral, behavioral tracking enabled, external analytics enabled.",
  "- Minimal analytics: product usage and performance analytics only; behavioral and external analytics blocked.",
  "- Decline optional: required security/session/account/payment integrity only.",
  "",
  "## Validation",
  "",
  ...(failures.length ? failures.map((failure) => `- FAIL: ${failure}`) : ["- Pass."]),
  "",
].join("\n"));

if (failures.length > 0) {
  console.error("Consent tracking contract validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Consent tracking contract passed: banner connected, mobile readable, behavioral consent gated.");
