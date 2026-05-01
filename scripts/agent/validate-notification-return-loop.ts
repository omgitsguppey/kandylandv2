import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
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

const audit = parseJson("agent/state/notification-return-loop-audit.generated.json");
const doc = readRequired("docs/agent-truth/notification-pipeline.md");
const packageJson = readRequired("package.json");
const fcmUtils = readRequired("src/lib/server/fcm-utils.ts");
const pushNotifications = readRequired("src/lib/server/push-notifications.ts");
const serviceWorker = readRequired("public/firebase-messaging-sw.js");
const runtimeBridge = readRequired("src/components/Notifications/NotificationRuntimeBridge.tsx");
const hook = readRequired("src/hooks/useNotifications.ts");
const localState = readRequired("src/lib/notification-local-state.ts");
const route = readRequired("src/app/api/notifications/route.ts");
const funnel = readRequired("src/lib/admin-notification-funnel.ts");
const debugRoute = readRequired("src/app/api/admin/debug/route.ts");
const pushTest = readRequired("tests/unit/push-notifications.spec.ts");
const fcmTest = readRequired("tests/unit/fcm-utils.spec.ts");
const localStateTest = readRequired("tests/unit/notification-local-state.spec.ts");
const swTest = readRequired("tests/unit/firebase-messaging-sw.spec.ts");
const auditLedger = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");

for (const expected of [
  "buildNotificationIdempotencyKey",
  "buildNotificationDocumentId",
  "drop_requeued_live",
  "reserveDropActivationNotification",
  "duplicateCreatedPrevented",
  "duplicatePushPrevented: true",
  "duplicateBrowserDisplayPrevented: true",
  "broadcastFCMWithReport",
  "skippedPermissionDeniedCount",
  "skippedMissingTokenCount",
  "skippedPreferencesDisabledCount",
]) {
  requireIncludes(pushNotifications, expected, "drop push notification dispatch");
}

for (const expected of [
  "NotificationBroadcastReport",
  "permissionSkippedCount",
  "preferenceSkippedCount",
  "missingTokenSkippedCount",
  "duplicatePushPreventedCount",
  "tokensQueuedCount",
  "pwaDisplayMode: \"manual-service-worker\"",
  "autoDisplayedByFcm: false",
]) {
  requireIncludes(fcmUtils, expected, "FCM broadcast diagnostics");
}
requireIncludes(fcmUtils, "data: baseData", "FCM data-only payload");
if (fcmUtils.includes("notification: { title, body }")) {
  failures.push("FCM broadcast must not send a notification auto-display payload.");
}

for (const expected of [
  "autoDisplayedByFcm",
  "manual display suppressed",
  "resolveNotificationTag(data)",
  "renotify: false",
  "KANDYDROPS_NOTIFICATION_CLICK",
  "postMessage(clickPayload)",
]) {
  requireIncludes(serviceWorker, expected, "service worker notification handling");
}

for (const expected of [
  "dispatchClientRuntimeEvent(CLIENT_RUNTIME_EVENTS.notificationsSync, true)",
  "markNotificationsAsRead",
  "alreadyDisplayedByFcm",
  "idempotencyKey: data.idempotencyKey",
]) {
  requireIncludes(runtimeBridge, expected, "notification runtime bridge");
}

for (const expected of [
  "listenForClientRuntimeEvent",
  "markNotificationsReadLocally",
  "removeNotificationsLocally",
  "reconcileClearAllNotifications",
  "notification_cleared",
]) {
  requireIncludes(hook, expected, "notification hook read/clear state");
}

for (const expected of [
  "removeNotificationsLocally",
  "reconcileClearAllNotifications",
]) {
  requireIncludes(localState, expected, "notification local state helpers");
}

for (const expected of [
  "readAtMs",
  "lastReadBy",
  "touchUserRuntime",
  "requireTrustedOrigin: true",
  "broadcastFCMWithReport",
]) {
  requireIncludes(route, expected, "notifications API route");
}

for (const expected of [
  "duplicateBrowserDisplayPreventedCount",
  "queuedDropReturnLiveNotificationCount",
  "skippedMissingTokenCount",
  "\"notification cleared\"",
  "\"notifications marked read\"",
]) {
  requireIncludes(funnel, expected, "admin notification funnel truth");
}

for (const expected of [
  "adminAnalyticsNotificationFunnel",
  "dedupeRule",
  "readPersistenceRule",
  "queuedDropReturnLiveRule",
  "skippedMissingTokenCount",
]) {
  requireIncludes(debugRoute, expected, "Admin Debug notification metadata");
}

for (const expected of [
  "records return-live dispatch diagnostics",
  "does not send a return-live FCM push",
  "duplicateBrowserDisplayPrevented",
]) {
  requireIncludes(pushTest, expected, "push notification tests");
}

for (const expected of [
  "reports skipped recipients",
  "dataOnlyPayload: true",
  "autoDisplayedByFcm",
]) {
  requireIncludes(fcmTest, expected, "FCM diagnostics tests");
}

requireIncludes(localStateTest, "reconciles partial clear-all persistence", "local notification state tests");
requireIncludes(swTest, "deterministic browser tags", "service worker tests");

for (const expected of [
  "Deterministic idempotency key rule",
  "Skip diagnostics rule",
  "Clear-all rule",
  "Multi-tab unread count reconciliation rule",
  "Fake zero prevention",
]) {
  requireIncludes(doc, expected, "notification pipeline doctrine");
}

for (const expected of [
  "check:notification-return-loop",
  "scripts/agent/validate-notification-return-loop.ts",
]) {
  requireIncludes(packageJson, expected, "package.json");
}

for (const expected of [
  "Notification Return Loop Hardening",
  "notification-return-loop-audit.generated.json",
]) {
  requireIncludes(auditLedger, expected, "FULL_SCALE_CODEBASE_AUDIT.md");
}
requireIncludes(repoLedger, "Notification return loop", "REPO_MEMORY_LEDGER.md");
requireIncludes(checklist, "Notification Return Loop", "EVERY_FILE_FUNCTION_CHECKLIST.md");

const surfaces = requireArray(audit.surfaces, "audit.surfaces", 8);
for (const key of [
  "server-drop-notification-dispatch",
  "fcm-web-push-dispatch",
  "pwa-service-worker-display",
  "foreground-notification-runtime",
  "notification-inbox-hook",
  "notifications-api-read-persistence",
  "queued-drop-return-live",
  "admin-notification-funnel-debug",
]) {
  if (!surfaces.some((surface) => surface && typeof surface === "object" && (surface as Record<string, unknown>).key === key)) {
    failures.push(`audit.surfaces must include ${key}.`);
  }
}

if (failures.length > 0) {
  console.error("Notification return-loop validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Notification return-loop validation passed.");
