import fs from "node:fs";
import path from "node:path";

import {
  computeNotificationQualityScore,
  rankNotificationsByQuality,
} from "../../src/lib/notifications/notification-quality-score";
import {
  NOTIFICATION_MAX_PER_USER_PER_DAY,
  NOTIFICATION_MAX_SAME_TYPE_PER_DAY,
  evaluateNotificationThrottle,
  selectNotificationsForDisplay,
} from "../../src/lib/notifications/notification-throttle-policy";

const repoRoot = process.cwd();

type Check = {
  label: string;
  pass: boolean;
  detail: string;
};

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(repoRoot, relativePath), "utf8");
}

function exists(relativePath: string) {
  return fs.existsSync(path.resolve(repoRoot, relativePath));
}

function check(label: string, pass: boolean, detail: string): Check {
  return { label, pass, detail };
}

function countSameTypeTop(entries: Array<{ type?: string; lifecycleEvent?: string | null }>, limit: number) {
  const counts = new Map<string, number>();
  entries.slice(0, limit).forEach((entry) => {
    const type = entry.lifecycleEvent || entry.type || "general";
    counts.set(type, (counts.get(type) || 0) + 1);
  });
  return Math.max(0, ...counts.values());
}

function main() {
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  const qualitySource = read("src/lib/notifications/notification-quality-score.ts");
  const throttleSource = read("src/lib/notifications/notification-throttle-policy.ts");
  const notificationInbox = read("src/lib/server/notification-inbox.ts");
  const fcmUtils = read("src/lib/server/fcm-utils.ts");
  const pushNotifications = read("src/lib/server/push-notifications.ts");
  const notificationsRoute = read("src/app/api/notifications/route.ts");
  const creatorBroadcastsRoute = read("src/app/api/creator/broadcasts/route.ts");
  const notificationsHook = read("src/hooks/useNotifications.ts");
  const eventFactNormalizer = read("src/lib/behavioral/event-fact-normalizer.ts");
  const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
  const pipelineDocs = read("docs/agent-truth/notification-pipeline.md");
  const behaviorDocs = read("docs/agent-truth/behavioral-math-calibration.md");
  const nowMs = Date.now();
  const highQuality = computeNotificationQualityScore({
    notificationType: "expiring_soon",
    nowMs,
    userLastActiveAtMs: nowMs - 30 * 60 * 1000,
    creatorAffinity: 0.92,
    unreadNotificationCount: 1,
    pastNotificationReadRate: 0.86,
    pastNotificationClickRate: 0.42,
    recentNotificationVolume24h: 1,
    sameTypeRecentCount24h: 0,
    dropUrgency: 0.92,
    purchaseCount: 3,
    unwrapCount: 5,
    hasPurchasedFromCreator: true,
  });
  const fatigued = computeNotificationQualityScore({
    notificationType: "new_drop",
    nowMs,
    userLastActiveAtMs: nowMs - 10 * 24 * 60 * 60 * 1000,
    creatorAffinity: 0.2,
    unreadNotificationCount: 12,
    pastNotificationReadRate: 0.2,
    pastNotificationClickRate: 0.03,
    recentNotificationVolume24h: 9,
    sameTypeRecentCount24h: 4,
    dropUrgency: 0.35,
  });
  const dailyCapDecision = evaluateNotificationThrottle({
    notificationType: "new_drop",
    notificationsSentToday: NOTIFICATION_MAX_PER_USER_PER_DAY,
    qualityScore: 99,
  });
  const sameTypeDecision = evaluateNotificationThrottle({
    notificationType: "new_drop",
    notificationsSentToday: 1,
    sameTypeSentToday: NOTIFICATION_MAX_SAME_TYPE_PER_DAY,
    qualityScore: 60,
  });
  const allowedHighQualityRepeat = evaluateNotificationThrottle({
    notificationType: "new_drop",
    notificationsSentToday: 1,
    sameTypeSentToday: NOTIFICATION_MAX_SAME_TYPE_PER_DAY,
    qualityScore: 92,
    lastSameTypeSentAtMs: 0,
  });
  const ranked = rankNotificationsByQuality([
    { id: "old_info", type: "info", createdAtMs: nowMs - 1000 },
    { id: "urgent", type: "warning", lifecycleEvent: "expiring_soon", createdAtMs: nowMs - 10_000 },
    { id: "new_drop", type: "success", lifecycleEvent: "new_drop", dropContext: { dropId: "d1" }, createdAtMs: nowMs - 20_000 },
  ], {
    nowMs,
    pastNotificationReadRate: 0.65,
    pastNotificationClickRate: 0.25,
    creatorAffinity: 0.5,
  });
  const displayRanked = selectNotificationsForDisplay([
    { id: "a", type: "success", lifecycleEvent: "new_drop", createdAtMs: nowMs - 1000 },
    { id: "b", type: "success", lifecycleEvent: "new_drop", createdAtMs: nowMs - 2000 },
    { id: "c", type: "success", lifecycleEvent: "new_drop", createdAtMs: nowMs - 3000 },
    { id: "d", type: "warning", lifecycleEvent: "expiring_soon", createdAtMs: nowMs - 4000 },
    { id: "e", type: "info", lifecycleEvent: "creator_broadcast", createdAtMs: nowMs - 5000 },
  ], {
    nowMs,
    maxVisibleNotifications: 5,
  });

  const checks: Check[] = [
    check(
      "package script exists",
      packageJson.scripts?.["check:notification-quality"] === "tsx scripts/agent/validate-notification-quality.ts",
      "Package must expose the targeted notification quality validator.",
    ),
    check(
      "created files exist",
      exists("src/lib/notifications/notification-quality-score.ts")
        && exists("src/lib/notifications/notification-throttle-policy.ts")
        && exists("scripts/agent/validate-notification-quality.ts"),
      "Notification quality score, throttle policy, and validator files must exist.",
    ),
    check(
      "quality formula matches requested weights",
      qualitySource.includes("0.30 * predictedOpen")
        && qualitySource.includes("0.20 * predictedReturn")
        && qualitySource.includes("0.20 * creatorAffinity")
        && qualitySource.includes("0.15 * urgency")
        && qualitySource.includes("0.10 * novelty")
        && qualitySource.includes("0.05 * monetizationRelevance")
        && qualitySource.includes("- fatiguePenalty"),
      "Notification score must use predicted open, return, affinity, urgency, novelty, monetization, and fatigue.",
    ),
    check(
      "fatigue lowers score",
      highQuality.notificationScore > fatigued.notificationScore
        && fatigued.components.fatiguePenalty > highQuality.components.fatiguePenalty
        && fatigued.label === "suppress",
      "High fatigue and weak return likelihood must reduce notification quality.",
    ),
    check(
      "daily cap and repeated type throttles work",
      dailyCapDecision.allowed === false
        && dailyCapDecision.reasonCode === "daily_cap"
        && sameTypeDecision.allowed === false
        && sameTypeDecision.reasonCode === "same_type_cap"
        && allowedHighQualityRepeat.allowed === true,
      "Throttle policy must cap daily volume and repeated notification types while preserving very high quality repeats.",
    ),
    check(
      "ranking is quality-first",
      ranked[0]?.id === "urgent"
        && (ranked[0]?.qualityScore ?? 0) >= (ranked[1]?.qualityScore ?? 0),
      "Unread inbox ranking should prefer quality and urgency before recency fallback.",
    ),
    check(
      "display diversity avoids repeated type monopolies",
      countSameTypeTop(displayRanked, 4) <= 2
        && throttleSource.includes("NOTIFICATION_MAX_SAME_TYPE_VISIBLE_TOP"),
      "Visible notification ranking should avoid one notification type monopolizing the top window.",
    ),
    check(
      "inbox uses display policy",
      notificationInbox.includes("selectNotificationsForDisplay")
        && notificationInbox.includes("recentNotificationVolume24h")
        && notificationInbox.includes("unreadNotificationCount"),
      "Unread inbox fetch must route through quality ranking and fatigue-aware display selection.",
    ),
    check(
      "server-created notifications store quality metadata",
      notificationsRoute.includes("buildNotificationQualityMetadata")
        && notificationsRoute.includes("qualityMetadata")
        && pushNotifications.includes("buildNotificationQualityMetadata")
        && pushNotifications.includes("...qualityMetadata")
        && creatorBroadcastsRoute.includes("buildNotificationQualityMetadata")
        && creatorBroadcastsRoute.includes("creator_broadcast"),
      "Admin, drop, and creator broadcast notifications must persist quality score metadata.",
    ),
    check(
      "push fanout applies throttle diagnostics",
      fcmUtils.includes("evaluateNotificationThrottle")
        && fcmUtils.includes("readNotificationQualityProfile")
        && fcmUtils.includes("throttleSkippedCount")
        && pushNotifications.includes("skippedQualityThrottleCount"),
      "FCM fan-out must apply the throttle policy and report quality throttle skips.",
    ),
    check(
      "canonical read remains behavioral action",
      qualitySource.includes('NOTIFICATION_READ_CANONICAL_ACTION = "notification_read"')
        && notificationsHook.includes('trackEvent("notification_read"')
        && eventFactNormalizer.includes('input.metricFamily === "notification" && input.eventName !== "notification_read"')
        && telemetryCatalog.includes('{ eventName: "notification_read"')
        && telemetryCatalog.includes('{ eventName: "notification_opened"'),
      "Notification read must stay canonical; opened/clicked events remain diagnostics unless explicitly scored.",
    ),
    check(
      "docs updated",
      pipelineDocs.includes("Quality ranking and fatigue policy")
        && pipelineDocs.includes("5` notifications per day")
        && behaviorDocs.includes("Notification Quality Ranking")
        && behaviorDocs.includes("notification_read"),
      "Notification pipeline and behavioral math docs must document quality ranking and canonical read behavior.",
    ),
  ];

  checks.forEach((entry) => {
    console.log(`${entry.pass ? "PASS" : "FAIL"} ${entry.label}: ${entry.detail}`);
  });

  const failures = checks.filter((entry) => !entry.pass);
  if (failures.length > 0) {
    console.error(`Notification quality validation failed with ${failures.length} issue(s).`);
    process.exitCode = 1;
  } else {
    console.log("Notification quality validation passed.");
  }
}

main();
