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

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include "${needle}".`);
  }
}

function requireExcludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    failures.push(`${label} must not include "${needle}".`);
  }
}

const packageJson = JSON.parse(readRequired("package.json") || "{}") as {
  scripts?: Record<string, string>;
};
const notificationBell = readRequired("src/components/Navigation/NotificationBell.tsx");
const notificationRuntimeBridge = readRequired("src/components/Notifications/NotificationRuntimeBridge.tsx");
const notificationsHook = readRequired("src/hooks/useNotifications.ts");
const notificationContracts = readRequired("src/lib/notification-contracts.ts");
const telemetryCatalog = readRequired("src/lib/telemetry-catalog.ts");
const identifiedIngestRoute = readRequired("src/app/api/analytics/ingest-identified/route.ts");
const eventFactNormalizer = readRequired("src/lib/behavioral/event-fact-normalizer.ts");
const adminHistoricalEngagement = readRequired("src/lib/server/admin-analytics-historical-engagement.ts");
const taskCatalog = readRequired("src/lib/tasks/task-catalog.ts");
const notificationFunnelHelper = readRequired("src/lib/admin-notification-funnel.ts");
const notificationFunnelComponent = readRequired("src/components/Admin/Analytics/AdminTaskAndNotificationModules.tsx");
const notificationReadTests = readRequired("tests/unit/notification-read-state.spec.tsx");
const ingestTests = readRequired("tests/unit/analytics-ingest-identified-route.spec.ts");

if (packageJson.scripts?.["check:notification-read-truth"] !== "tsx scripts/agent/validate-notification-read-truth.ts") {
  failures.push("package.json must expose check:notification-read-truth.");
}

requireIncludes(notificationsHook, 'trackEvent("notification_read"', "useNotifications hook");
requireExcludes(notificationsHook, 'trackEvent("notification_marked_read"', "useNotifications hook");
requireIncludes(notificationsHook, "actor_user_id: userId", "useNotifications hook");
requireIncludes(notificationsHook, "target_user_id: userId", "useNotifications hook");
requireIncludes(notificationsHook, 'surface: "notifications_inbox"', "useNotifications hook");

requireIncludes(notificationBell, 'trackEvent("notification_opened"', "Notification bell diagnostics");
requireIncludes(notificationBell, 'trackEvent("notification_action_clicked"', "Notification bell diagnostics");
requireExcludes(notificationBell, 'trackEvent("notification_marked_read"', "Notification bell");
requireIncludes(notificationBell, 'actor_user_id: currentUserId ?? ""', "Notification bell diagnostics");
requireIncludes(notificationBell, 'target_user_id: currentUserId ?? ""', "Notification bell diagnostics");
requireIncludes(notificationBell, 'surface: "notifications_dropdown"', "Notification bell diagnostics");

requireIncludes(notificationRuntimeBridge, 'trackEvent("notification_opened"', "Notification runtime bridge diagnostics");
requireIncludes(notificationRuntimeBridge, 'trackEvent("notification_read"', "Notification runtime bridge canonical read");
requireIncludes(notificationRuntimeBridge, "actor_user_id: user.uid", "Notification runtime bridge diagnostics");
requireIncludes(notificationRuntimeBridge, "target_user_id: user.uid", "Notification runtime bridge diagnostics");
requireIncludes(notificationRuntimeBridge, 'surface: "notification_runtime"', "Notification runtime bridge diagnostics");

for (const expected of [
  "NotificationCanonicalContext",
  "targetUserId",
  "recipientUserId",
  "actorUserId",
  "actorType",
  "\"background_route_not_required\"",
  "\"missing_target_user\"",
  "\"missing_actor_for_foreground\"",
  "\"missing_route_for_foreground\"",
  "buildNotificationRecord",
  "deriveNotificationCanonicalContext",
]) {
  requireIncludes(notificationContracts, expected, "Notification contracts canonical ownership context");
}

requireIncludes(telemetryCatalog, '{ eventName: "notification_read"', "Telemetry catalog canonical notification read");
requireIncludes(telemetryCatalog, 'aliases: ["notification_marked_read"]', "Telemetry catalog notification read compatibility alias");
requireIncludes(taskCatalog, 'eventName: "notification_read"', "Task catalog canonical notification read");

requireIncludes(eventFactNormalizer, 'input.metricFamily === "notification" && input.eventName !== "notification_read"', "Notification metric eligibility gate");
requireIncludes(identifiedIngestRoute, "normalizeIdentifiedMetricEventFact", "Identified ingest route");
requireIncludes(adminHistoricalEngagement, 'input.eventsData.notification_read || 0', "Admin historical engagement notification read count");
for (const expected of [
  "denominatorMode",
  "No permission sample",
  "Duplicate-prevention telemetry not instrumented.",
  "Delivery counts unavailable from Debug source.",
  "Prompt, enabled, opened, read, and cleared are event counts.",
]) {
  requireIncludes(notificationFunnelHelper, expected, "Notification funnel truth helper");
}
for (const expected of [
  "data-notification-funnel-state",
  "data-notification-denominator-mode",
  "data-notification-step",
  "data-notification-step-source",
  "data-notification-step-status",
  "data-notification-step-freshness",
  "data-notification-reminder-reason-count",
  "data-notification-missing-source-count",
  "No permission sample",
  "Debug notification records",
  "task reminder telemetry",
]) {
  requireIncludes(notificationFunnelComponent, expected, "Notification funnel analytics component");
}
requireExcludes(notificationFunnelComponent, "Waiting", "Notification funnel analytics component must not render WAIT for unavailable sources after load");

requireIncludes(notificationReadTests, '"notification_read"', "Notification read state tests");
requireIncludes(notificationReadTests, 'expect(readCalls).toHaveLength(1);', "Notification read dedupe test");
requireIncludes(ingestTests, 'metricExclusionReason: "notification_diagnostic_only"', "Identified ingest notification diagnostic test");
requireIncludes(ingestTests, 'eventName: "notification_read"', "Identified ingest canonical notification read test");

if (failures.length > 0) {
  console.error("Notification read telemetry truth validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Notification read telemetry truth validator passed.");
