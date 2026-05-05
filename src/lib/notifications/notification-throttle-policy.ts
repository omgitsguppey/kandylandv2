import {
  computeNotificationQualityScore,
  normalizeNotificationQualityType,
  rankNotificationsByQuality,
  type NotificationQualityResult,
  type NotificationQualitySignals,
  type RankableNotification,
  type RankedNotification,
} from "@/lib/notifications/notification-quality-score";

export const NOTIFICATION_THROTTLE_POLICY_VERSION = "notification-throttle-v1";
export const NOTIFICATION_MAX_PER_USER_PER_DAY = 5;
export const NOTIFICATION_MAX_SAME_TYPE_PER_DAY = 2;
export const NOTIFICATION_SAME_TYPE_COOLDOWN_MS = 4 * 60 * 60 * 1000;
export const NOTIFICATION_MIN_SCORE_TO_SEND = 35;
export const NOTIFICATION_HIGH_FATIGUE_UNREAD_COUNT = 10;
export const NOTIFICATION_HIGH_FATIGUE_RECENT_VOLUME = 8;
export const NOTIFICATION_MAX_SAME_TYPE_VISIBLE_TOP = 2;

export interface NotificationThrottleInput extends NotificationQualitySignals {
  userId?: string | null;
  notificationType: string;
  qualityScore?: number | null;
  notificationsSentToday?: number | null;
  sameTypeSentToday?: number | null;
  lastSameTypeSentAtMs?: number | null;
  maxPerUserPerDay?: number;
  maxSameTypePerDay?: number;
  minScoreToSend?: number;
}

export interface NotificationThrottleDecision {
  version: typeof NOTIFICATION_THROTTLE_POLICY_VERSION;
  allowed: boolean;
  reasonCode: "allowed" | "daily_cap" | "same_type_cap" | "same_type_cooldown" | "fatigue" | "low_quality";
  qualityScore: number;
  quality: NotificationQualityResult;
  maxPerUserPerDay: number;
  maxSameTypePerDay: number;
  reasons: string[];
}

function readCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}

function readTime(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

export function evaluateNotificationThrottle(input: NotificationThrottleInput): NotificationThrottleDecision {
  const quality = computeNotificationQualityScore(input);
  const qualityScore = typeof input.qualityScore === "number" && Number.isFinite(input.qualityScore)
    ? Math.max(0, Math.min(100, input.qualityScore))
    : quality.notificationScore;
  const maxPerUserPerDay = input.maxPerUserPerDay ?? NOTIFICATION_MAX_PER_USER_PER_DAY;
  const maxSameTypePerDay = input.maxSameTypePerDay ?? NOTIFICATION_MAX_SAME_TYPE_PER_DAY;
  const minScoreToSend = input.minScoreToSend ?? NOTIFICATION_MIN_SCORE_TO_SEND;
  const notificationsSentToday = readCount(input.notificationsSentToday);
  const sameTypeSentToday = readCount(input.sameTypeSentToday ?? input.sameTypeRecentCount24h);
  const recentNotificationVolume24h = readCount(input.recentNotificationVolume24h);
  const unreadNotificationCount = readCount(input.unreadNotificationCount);
  const nowMs = input.nowMs ?? Date.now();
  const lastSameTypeSentAtMs = readTime(input.lastSameTypeSentAtMs);
  const hoursSinceSameType = lastSameTypeSentAtMs > 0
    ? (nowMs - lastSameTypeSentAtMs) / (60 * 60 * 1000)
    : Number.POSITIVE_INFINITY;
  const reasons: string[] = [];

  if (notificationsSentToday >= maxPerUserPerDay) {
    return {
      version: NOTIFICATION_THROTTLE_POLICY_VERSION,
      allowed: false,
      reasonCode: "daily_cap",
      qualityScore,
      quality,
      maxPerUserPerDay,
      maxSameTypePerDay,
      reasons: [`Suppressed because the user reached the ${maxPerUserPerDay}/day notification cap.`],
    };
  }

  if (sameTypeSentToday >= maxSameTypePerDay && qualityScore < 85) {
    return {
      version: NOTIFICATION_THROTTLE_POLICY_VERSION,
      allowed: false,
      reasonCode: "same_type_cap",
      qualityScore,
      quality,
      maxPerUserPerDay,
      maxSameTypePerDay,
      reasons: ["Suppressed because this notification type has already been sent repeatedly today."],
    };
  }

  if (
    lastSameTypeSentAtMs > 0
    && nowMs - lastSameTypeSentAtMs < NOTIFICATION_SAME_TYPE_COOLDOWN_MS
    && qualityScore < 75
  ) {
    return {
      version: NOTIFICATION_THROTTLE_POLICY_VERSION,
      allowed: false,
      reasonCode: "same_type_cooldown",
      qualityScore,
      quality,
      maxPerUserPerDay,
      maxSameTypePerDay,
      reasons: [`Suppressed because the same notification type was sent ${hoursSinceSameType.toFixed(1)}h ago.`],
    };
  }

  if (
    (unreadNotificationCount >= NOTIFICATION_HIGH_FATIGUE_UNREAD_COUNT
      || recentNotificationVolume24h >= NOTIFICATION_HIGH_FATIGUE_RECENT_VOLUME)
    && qualityScore < 70
  ) {
    return {
      version: NOTIFICATION_THROTTLE_POLICY_VERSION,
      allowed: false,
      reasonCode: "fatigue",
      qualityScore,
      quality,
      maxPerUserPerDay,
      maxSameTypePerDay,
      reasons: ["Suppressed because recent notification volume indicates user fatigue."],
    };
  }

  if (qualityScore < minScoreToSend) {
    return {
      version: NOTIFICATION_THROTTLE_POLICY_VERSION,
      allowed: false,
      reasonCode: "low_quality",
      qualityScore,
      quality,
      maxPerUserPerDay,
      maxSameTypePerDay,
      reasons: ["Suppressed because predicted open and return value are too low."],
    };
  }

  reasons.push("Allowed by notification quality and fatigue policy.");
  return {
    version: NOTIFICATION_THROTTLE_POLICY_VERSION,
    allowed: true,
    reasonCode: "allowed",
    qualityScore,
    quality,
    maxPerUserPerDay,
    maxSameTypePerDay,
    reasons,
  };
}

export function readNotificationQualityProfile(source: Record<string, unknown> | undefined, notificationType: string) {
  const profile = source?.notificationQuality && typeof source.notificationQuality === "object"
    ? source.notificationQuality as Record<string, unknown>
    : {};
  const typeKey = normalizeNotificationQualityType(notificationType);
  const sameTypeCounts = profile.sameTypeSentToday && typeof profile.sameTypeSentToday === "object"
    ? profile.sameTypeSentToday as Record<string, unknown>
    : {};
  const sameTypeSentAt = profile.lastSameTypeSentAtMs && typeof profile.lastSameTypeSentAtMs === "object"
    ? profile.lastSameTypeSentAtMs as Record<string, unknown>
    : {};

  const readNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined;
  return {
    userLastActiveAtMs: readNumber(source?.lastActiveAtMs) ?? readNumber(profile.userLastActiveAtMs),
    creatorAffinity: readNumber(profile.creatorAffinity),
    unreadNotificationCount: readNumber(profile.unreadNotificationCount),
    pastNotificationReadRate: readNumber(profile.pastNotificationReadRate),
    pastNotificationClickRate: readNumber(profile.pastNotificationClickRate),
    recentNotificationVolume24h: readNumber(profile.recentNotificationVolume24h),
    sameTypeRecentCount24h: readNumber(profile.sameTypeRecentCount24h) ?? readNumber(sameTypeCounts[typeKey]),
    purchaseCount: readNumber(profile.purchaseCount),
    unwrapCount: readNumber(profile.unwrapCount),
    notificationsSentToday: readNumber(profile.notificationsSentToday),
    sameTypeSentToday: readNumber(sameTypeCounts[typeKey]) ?? readNumber(profile.sameTypeSentToday),
    lastSameTypeSentAtMs: readNumber(sameTypeSentAt[typeKey]) ?? readNumber(profile.lastSameTypeSentAtMs),
  } satisfies Partial<NotificationThrottleInput>;
}

export function selectNotificationsForDisplay<T extends RankableNotification>(
  notifications: T[],
  options: NotificationQualitySignals & {
    maxVisibleNotifications?: number;
    maxSameTypeInTopWindow?: number;
  } = {},
): Array<RankedNotification<T>> {
  const maxVisibleNotifications = Math.max(1, Math.min(options.maxVisibleNotifications ?? notifications.length, 100));
  const maxSameTypeInTopWindow = options.maxSameTypeInTopWindow ?? NOTIFICATION_MAX_SAME_TYPE_VISIBLE_TOP;
  const ranked = rankNotificationsByQuality(notifications, options);
  const selected: Array<RankedNotification<T>> = [];
  const deferred: Array<RankedNotification<T>> = [];
  const typeCounts = new Map<string, number>();

  ranked.forEach((notification) => {
    const type = normalizeNotificationQualityType(notification.lifecycleEvent || notification.type || (notification.dropContext?.dropId ? "new_drop" : "general"));
    const count = typeCounts.get(type) || 0;
    if (selected.length < 8 && count >= maxSameTypeInTopWindow && notification.qualityScore < 85) {
      deferred.push(notification);
      return;
    }

    typeCounts.set(type, count + 1);
    selected.push(notification);
  });

  return [...selected, ...deferred].slice(0, maxVisibleNotifications);
}
