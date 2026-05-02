import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

const REQUIRED_CATEGORIES = [
  "payments broken",
  "wallet crediting broken",
  "unlock double-charge",
  "locked content leak",
  "notifications duplicate/spam",
  "notifications missing",
  "analytics refresh storm",
  "admin route/security issue",
  "service worker stale app shell",
  "drop queue malfunction",
  "chat outage",
  "creator profile 404 spike",
];

const REQUIRED_INCIDENT_FIELDS = [
  "category",
  "detectionSignal",
  "userImpact",
  "immediateMitigation",
  "switchFlagAvailable",
  "manualFallback",
  "rollbackCommandPath",
  "dataRecoverySteps",
  "userCommunicationNote",
  "postmortemDataToCollect",
  "fakeKillSwitchClaimed",
];

const DOC_CATEGORY_TITLES: Record<string, string> = {
  "payments broken": "Payments Broken",
  "wallet crediting broken": "Wallet Crediting Broken",
  "unlock double-charge": "Unlock Double-Charge",
  "locked content leak": "Locked Content Leak",
  "notifications duplicate/spam": "Notifications Duplicate Or Spam",
  "notifications missing": "Notifications Missing",
  "analytics refresh storm": "Analytics Refresh Storm",
  "admin route/security issue": "Admin Route Or Security Issue",
  "service worker stale app shell": "Service Worker Stale App Shell",
  "drop queue malfunction": "Drop Queue Malfunction",
  "chat outage": "Chat Outage",
  "creator profile 404 spike": "Creator Profile 404 Spike",
};

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }

  const buffer = readFileSync(fullPath);
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString("utf16le");
  }

  return buffer.toString("utf8").replace(/^\uFEFF/u, "");
}

function parseJson(relativePath: string) {
  const source = readRequired(relativePath);
  try {
    return JSON.parse(source) as Record<string, unknown>;
  } catch (error) {
    failures.push(`${relativePath} must be valid JSON: ${(error as Error).message}`);
    return {};
  }
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireArray(value: unknown, label: string, minLength = 1) {
  if (!Array.isArray(value)) {
    failures.push(`${label} must be an array.`);
    return [] as unknown[];
  }
  if (value.length < minLength) {
    failures.push(`${label} must include at least ${minLength} item(s).`);
  }
  return value;
}

function requireNonEmptyString(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    failures.push(`${label} must be a non-empty string.`);
  }
}

function requireIncidentFieldShape(incident: Record<string, unknown>) {
  const category = String(incident.category ?? "unknown");
  for (const field of REQUIRED_INCIDENT_FIELDS) {
    if (!(field in incident)) {
      failures.push(`${category} must include ${field}.`);
      continue;
    }
    const value = incident[field];
    if (["dataRecoverySteps", "postmortemDataToCollect"].includes(field)) {
      requireArray(value, `${category}.${field}`, 1);
      continue;
    }
    if (field === "switchFlagAvailable") {
      const switchRecord = asRecord(value);
      requireNonEmptyString(switchRecord.available, `${category}.switchFlagAvailable.available`);
      requireNonEmptyString(switchRecord.name, `${category}.switchFlagAvailable.name`);
      if (switchRecord.available !== "no") {
        requireArray(switchRecord.verifiedFiles, `${category}.switchFlagAvailable.verifiedFiles`, 1);
      }
      continue;
    }
    if (field === "fakeKillSwitchClaimed") {
      if (value !== false) {
        failures.push(`${category}.fakeKillSwitchClaimed must be false.`);
      }
      continue;
    }
    requireNonEmptyString(value, `${category}.${field}`);
  }
}

const audit = parseJson("agent/state/rollback-incident-response.generated.json");
const doc = readRequired("docs/agent-truth/rollback-incident-response.md");
const packageJson = readRequired("package.json");
const fullAudit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");
const purchaseModal = readRequired("src/components/PurchaseModal.tsx");
const paypalProvider = readRequired("src/components/PayPalProvider.tsx");
const paypalCapture = readRequired("src/app/api/paypal/capture/route.ts");
const unlockRoute = readRequired("src/app/api/drops/unlock/route.ts");
const contentRoute = readRequired("src/app/api/drops/content/route.ts");
const notificationsRoute = readRequired("src/app/api/notifications/route.ts");
const pushNotifications = readRequired("src/lib/server/push-notifications.ts");
const notificationIdentity = readRequired("src/lib/notification-identity.ts");
const serviceWorker = readRequired("public/firebase-messaging-sw.js");
const firebaseMessaging = readRequired("src/lib/firebase-messaging.ts");
const refreshRoute = readRequired("src/app/api/admin/analytics/refresh/route.ts");
const queueToggleRoute = readRequired("src/app/api/admin/queue/toggle/route.ts");
const chatServer = readRequired("src/lib/server/chat.ts");
const creatorProfileRoute = readRequired("src/app/api/creators/[username]/route.ts");
const storageRules = readRequired("storage.rules");
const apphosting = readRequired("apphosting.yaml");
const firebaseJson = readRequired("firebase.json");
const firebaseRc = readRequired(".firebaserc");
const deploymentDoc = readRequired("docs/agent-truth/environment-deployment-truth.md");

if (audit.runtimeBehaviorChanged !== false || audit.liveConfigChanged !== false || audit.productionDataWritten !== false) {
  failures.push("Audit must remain documentation-only with no runtime behavior, live config, or production data changes.");
}
if (audit.noFakeKillSwitches !== true) {
  failures.push("Audit must set noFakeKillSwitches true.");
}

const incidents = requireArray(audit.incidents, "audit.incidents", REQUIRED_CATEGORIES.length).map(asRecord);
const incidentByCategory = new Map(incidents.map((incident) => [String(incident.category), incident]));
for (const category of REQUIRED_CATEGORIES) {
  const incident = incidentByCategory.get(category);
  if (!incident) {
    failures.push(`Audit must include incident category "${category}".`);
    continue;
  }
  requireIncidentFieldShape(incident);
  requireIncludes(doc, DOC_CATEGORY_TITLES[category] ?? category, "Incident response doc");
}

for (const category of ["payments broken", "wallet crediting broken", "unlock double-charge", "notifications duplicate/spam", "notifications missing"]) {
  const incident = incidentByCategory.get(category);
  if (!incident) continue;
  if (incident.emergencyPlanRequired !== true) {
    failures.push(`${category} must mark emergencyPlanRequired true.`);
  }
  const combined = `${incident.immediateMitigation ?? ""} ${incident.manualFallback ?? ""} ${incident.rollbackCommandPath ?? ""}`;
  if (!/rollback|stop|pause|disable|withholding|removing/i.test(combined)) {
    failures.push(`${category} must include an emergency stop/rollback plan.`);
  }
}

for (const category of ["unlock double-charge", "locked content leak", "notifications duplicate/spam", "notifications missing", "analytics refresh storm", "admin route/security issue", "drop queue malfunction", "chat outage", "creator profile 404 spike"]) {
  const incident = incidentByCategory.get(category);
  if (!incident) continue;
  if (incident.manualDbInterventionRequired !== true) {
    failures.push(`${category} must explicitly mark manualDbInterventionRequired true.`);
  }
  if (!String(incident.manualFallback ?? "").includes("Manual DB intervention")) {
    failures.push(`${category} manual fallback must explicitly say Manual DB intervention.`);
  }
}

const switchInventory = requireArray(audit.switchInventory, "audit.switchInventory", 5).map(asRecord);
for (const entry of switchInventory) {
  requireNonEmptyString(entry.key, "switchInventory.key");
  requireNonEmptyString(entry.scope, `${entry.key ?? "switch"}.scope`);
  requireNonEmptyString(entry.howToUse, `${entry.key ?? "switch"}.howToUse`);
  requireNonEmptyString(entry.doesNotDo, `${entry.key ?? "switch"}.doesNotDo`);
  if (entry.implemented === true) {
    requireArray(entry.verifiedFiles, `${entry.key ?? "switch"}.verifiedFiles`, 1);
  }
}

requireIncludes(purchaseModal, "PAYPAL_READY", "Purchase modal payment availability");
requireIncludes(paypalProvider, "NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE", "PayPal provider");
requireIncludes(paypalCapture, "paymentLocks", "PayPal capture idempotency");
requireIncludes(paypalCapture, "custom_id", "PayPal capture user/package verification");
requireIncludes(paypalCapture, "requireTrustedOrigin: true", "PayPal capture trusted origin");
requireIncludes(unlockRoute, "runTransaction", "Unlock transaction");
requireIncludes(unlockRoute, "unlockedContent", "Unlock idempotency");
requireIncludes(unlockRoute, "requireTrustedOrigin: true", "Unlock trusted origin");
requireIncludes(contentRoute, "hasUnlockedDrop", "Content entitlement guard");
requireIncludes(contentRoute, "Cache-Control\", \"private, no-store", "Content private no-store");
requireIncludes(storageRules, "match /drops/{allPaths=**}", "Storage drops rule");
requireIncludes(storageRules, "allow get: if false", "Storage direct read deny");
requireIncludes(notificationsRoute, "notificationDispatchLocks", "Notification duplicate lock");
requireIncludes(notificationsRoute, "readAtMs", "Notification read persistence");
requireIncludes(pushNotifications, "reserveDropActivationNotification", "Drop notification activation reservation");
requireIncludes(pushNotifications, "duplicateCreatedPrevented", "Drop notification duplicate prevention");
requireIncludes(notificationIdentity, "buildNotificationIdempotencyKey", "Notification idempotency helper");
requireIncludes(notificationIdentity, "buildBrowserNotificationTag", "Notification browser tag helper");
requireIncludes(serviceWorker, "APP_SHELL_CACHE", "Service worker app shell cache version");
requireIncludes(serviceWorker, "APP_RUNTIME_CACHE", "Service worker runtime cache version");
requireIncludes(serviceWorker, "skipWaiting", "Service worker deploy activation");
requireIncludes(serviceWorker, "clients.claim", "Service worker client claim");
requireIncludes(serviceWorker, "notificationclick", "Service worker click handler");
requireIncludes(firebaseMessaging, "navigator.serviceWorker.register", "Service worker registration");
requireIncludes(refreshRoute, "duplicateRefreshPrevented", "Analytics refresh dedupe");
requireIncludes(refreshRoute, "markSnapshotRefreshFailed", "Analytics refresh failure preservation");
requireIncludes(refreshRoute, "requireTrustedOrigin: true", "Analytics refresh trusted origin");
requireIncludes(queueToggleRoute, "requireTrustedOrigin: true", "Queue toggle trusted origin");
requireIncludes(queueToggleRoute, "setDropQueueMembership", "Queue toggle membership");
requireIncludes(chatServer, "isCreatorMessagingAvailable", "Chat creator messaging availability");
requireIncludes(chatServer, "resolveViewerRoleForThread", "Chat participant boundary");
requireIncludes(creatorProfileRoute, "buildNotFoundResponse(\"creator\"", "Creator 404 handling");
requireIncludes(creatorProfileRoute, "sanitizeDropForClient", "Creator public payload sanitization");

for (const expected of [
  "Firebase/App Hosting console",
  "git revert <bad_commit>",
  "service worker stale app shell",
  "analytics refresh storm",
  "Manual DB intervention",
  "No global notification kill switch exists",
  "No global unlock kill switch exists",
]) {
  requireIncludes(doc, expected, "Rollback incident response doc");
}

for (const expected of [
  "https://kandydrops.com",
  "NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE",
  "NEXT_PUBLIC_FIREBASE_VAPID_KEY",
]) {
  requireIncludes(apphosting, expected, "App Hosting config");
}
requireIncludes(firebaseJson, "\"frameworksBackend\"", "Firebase App Hosting config");
requireIncludes(firebaseRc, "kandydrops-by-ikandy", "Firebase project config");
requireIncludes(deploymentDoc, "Firebase And App Hosting", "Deployment truth doc");

if (!packageJson.includes("\"check:rollback-incident-response\": \"tsx scripts/agent/validate-rollback-incident-response.ts\"")) {
  failures.push("package.json must expose check:rollback-incident-response.");
}
requireIncludes(fullAudit, "Rollback Incident Response Launch Plan", "FULL_SCALE_CODEBASE_AUDIT.md");
requireIncludes(repoLedger, "Rollback and incident response is launch-mapped", "REPO_MEMORY_LEDGER.md");
requireIncludes(checklist, "Rollback Incident Response Launch Plan Coverage", "EVERY_FILE_FUNCTION_CHECKLIST.md");

if (failures.length > 0) {
  console.error("Rollback incident response validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Rollback incident response validation passed.");
