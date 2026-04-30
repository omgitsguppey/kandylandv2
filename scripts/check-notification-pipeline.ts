import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message: string) {
  console.error(`[notification-pipeline] ${message}`);
  process.exitCode = 1;
}

function assertIncludes(file: string, source: string, expected: string) {
  if (!source.includes(expected)) {
    fail(`${file} is missing ${expected}`);
  }
}

function assertNotIncludes(file: string, source: string, unexpected: string) {
  if (source.includes(unexpected)) {
    fail(`${file} still contains ${unexpected}`);
  }
}

const fcmUtils = read("src/lib/server/fcm-utils.ts");
const pushNotifications = read("src/lib/server/push-notifications.ts");
const serviceWorker = read("public/firebase-messaging-sw.js");
const firebaseMessaging = read("src/lib/firebase-messaging.ts");
const runtimeBridge = read("src/components/Notifications/NotificationRuntimeBridge.tsx");
const notificationsHook = read("src/hooks/useNotifications.ts");
const notificationsRoute = read("src/app/api/notifications/route.ts");
const funnelComponent = read("src/components/Admin/Analytics/AdminTaskAndNotificationModules.tsx");
const funnelHelper = read("src/lib/admin-notification-funnel.ts");
const debugRoute = read("src/app/api/admin/debug/route.ts");
const doc = read("docs/agent-truth/notification-pipeline.md");

assertIncludes("fcm-utils", fcmUtils, "idempotencyKey");
assertIncludes("fcm-utils", fcmUtils, "browserTag");
assertIncludes("fcm-utils", fcmUtils, "pwaDisplayMode: \"manual-service-worker\"");
assertIncludes("fcm-utils", fcmUtils, "duplicatePushPreventedCount");
assertIncludes("fcm-utils", fcmUtils, "queuedTokens");
assertNotIncludes("fcm-utils", fcmUtils, "notification: { title, body }");

assertIncludes("push-notifications", pushNotifications, "buildNotificationIdempotencyKey");
assertIncludes("push-notifications", pushNotifications, "buildNotificationDocumentId");
assertIncludes("push-notifications", pushNotifications, "drop_requeued_live");
assertIncludes("push-notifications", pushNotifications, "duplicateCreatedPrevented");
assertIncludes("push-notifications", pushNotifications, "duplicateBrowserDisplayPrevented");

assertIncludes("service worker", serviceWorker, "autoDisplayedByFcm");
assertIncludes("service worker", serviceWorker, "manual display suppressed");
assertIncludes("service worker", serviceWorker, "tag");
assertIncludes("service worker", serviceWorker, "renotify: false");
assertIncludes("service worker", serviceWorker, "KANDYDROPS_NOTIFICATION_CLICK");
assertIncludes("service worker", serviceWorker, "postMessage(clickPayload)");

assertIncludes("firebase messaging", firebaseMessaging, "resolveBrowserNotificationTag");
assertIncludes("firebase messaging", firebaseMessaging, "renotify: false");
assertIncludes("firebase messaging", firebaseMessaging, "browserDisplayMode: \"foreground-client\"");
assertIncludes("runtime bridge", runtimeBridge, "KANDYDROPS_NOTIFICATION_CLICK");
assertIncludes("runtime bridge", runtimeBridge, "markNotificationsAsRead");
assertIncludes("runtime bridge", runtimeBridge, "idempotencyKey: data.idempotencyKey");

assertIncludes("notifications hook", notificationsHook, "previousNotifications");
assertIncludes("notifications hook", notificationsHook, "optimistic: true");
assertIncludes("notifications route", notificationsRoute, "readAtMs");
assertIncludes("notifications route", notificationsRoute, "lastReadBy");

assertIncludes("Notification Funnel component", funnelComponent, "compact-notification-funnel");
assertNotIncludes("Notification Funnel component", funnelComponent, "PieChart");
assertNotIncludes("Notification Funnel component", funnelComponent, "h-64");
assertNotIncludes("Notification Funnel component", funnelComponent, "rounded-[1.4rem]");
assertIncludes("Notification Funnel helper", funnelHelper, "fakeZeroPrevented");
assertIncludes("Notification Funnel helper", funnelHelper, "Notification data is partial");
assertIncludes("Notification Funnel helper", funnelHelper, "duplicateBrowserDisplayPreventedCount");
assertIncludes("Notification Funnel helper", funnelHelper, "queuedDropReturnLiveNotificationCount");
assertIncludes("Notification Funnel helper", funnelHelper, "browserSupportFlags");

assertIncludes("Admin Debug", debugRoute, "adminAnalyticsNotificationFunnel");
assertIncludes("Admin Debug", debugRoute, "dedupeRule");
assertIncludes("Admin Debug", debugRoute, "readPersistenceRule");
assertIncludes("Admin Debug", debugRoute, "queuedDropReturnLiveRule");

assertIncludes("notification pipeline doc", doc, "Deterministic idempotency key rule");
assertIncludes("notification pipeline doc", doc, "Browser notification tag rule");
assertIncludes("notification pipeline doc", doc, "Auto-queued drop return-live notification rule");
assertIncludes("notification pipeline doc", doc, "Read/persistence rule");
