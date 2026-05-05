export const NOTIFICATION_QUALITY_SCORE_VERSION = "notification-quality-v1";
export const NOTIFICATION_READ_CANONICAL_ACTION = "notification_read";
export const NOTIFICATION_DIAGNOSTIC_ACTIONS = [
  "notification_opened",
  "notification_action_clicked",
  "notification_clicked",
] as const;

export type NotificationQualityType =
  | "new_drop"
  | "drop_requeued_live"
  | "expiring_soon"
  | "creator_broadcast"
  | "system_alert"
  | "general"
  | "info"
  | "success"
  | "warning"
  | "error";

export interface NotificationQualitySignals {
  notificationType?: string | null;
  userLastActiveAtMs?: number | null;
  nowMs?: number;
  creatorAffinity?: number | null;
  unreadNotificationCount?: number | null;
  pastNotificationReadRate?: number | null;
  pastNotificationClickRate?: number | null;
  recentNotificationVolume24h?: number | null;
  sameTypeRecentCount24h?: number | null;
  dropUrgency?: number | null;
  purchaseCount?: number | null;
  unwrapCount?: number | null;
  hasPurchasedFromCreator?: boolean | null;
  hasUnwrappedCreatorDrops?: boolean | null;
}

export interface NotificationQualityComponents {
  predictedOpen: number;
  predictedReturn: number;
  creatorAffinity: number;
  urgency: number;
  novelty: number;
  monetizationRelevance: number;
  fatiguePenalty: number;
}

export interface NotificationQualityResult {
  version: typeof NOTIFICATION_QUALITY_SCORE_VERSION;
  notificationScore: number;
  label: "send" | "rank_only" | "suppress";
  components: NotificationQualityComponents;
  reasons: string[];
  canonicalBehaviorAction: typeof NOTIFICATION_READ_CANONICAL_ACTION;
  diagnosticActions: typeof NOTIFICATION_DIAGNOSTIC_ACTIONS;
}

export type RankableNotification = {
  id: string;
  type?: string;
  lifecycleEvent?: string | null;
  createdAtMs?: number | null;
  readBy?: string[];
  dropContext?: {
    dropId?: string;
    dropTitle?: string;
    previewImageUrl?: string;
  };
  notificationQuality?: NotificationQualityResult;
  qualityScore?: number;
};

export type RankedNotification<T extends RankableNotification> = T & {
  notificationQuality: NotificationQualityResult;
  qualityScore: number;
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

function readRate(value: number | null | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp01(value)
    : fallback;
}

function readCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}

export function normalizeNotificationQualityType(value: string | null | undefined): NotificationQualityType {
  const normalized = String(value || "general").trim().toLowerCase();
  if (normalized === "drop_live" || normalized === "new_drop_live") {
    return "new_drop";
  }
  if (normalized === "drop_returned" || normalized === "drop_requeued") {
    return "drop_requeued_live";
  }
  if (
    normalized === "new_drop"
    || normalized === "drop_requeued_live"
    || normalized === "expiring_soon"
    || normalized === "creator_broadcast"
    || normalized === "system_alert"
    || normalized === "general"
    || normalized === "info"
    || normalized === "success"
    || normalized === "warning"
    || normalized === "error"
  ) {
    return normalized;
  }

  return "general";
}

function resolveTypeOpenPrior(type: NotificationQualityType) {
  if (type === "system_alert" || type === "error") {
    return 0.9;
  }
  if (type === "warning" || type === "expiring_soon") {
    return 0.8;
  }
  if (type === "drop_requeued_live") {
    return 0.74;
  }
  if (type === "new_drop" || type === "success") {
    return 0.66;
  }
  if (type === "creator_broadcast" || type === "info") {
    return 0.56;
  }

  return 0.5;
}

function resolveReturnLikelihood(input: NotificationQualitySignals) {
  const nowMs = input.nowMs ?? Date.now();
  const lastActiveAtMs = typeof input.userLastActiveAtMs === "number" && Number.isFinite(input.userLastActiveAtMs)
    ? input.userLastActiveAtMs
    : null;
  if (!lastActiveAtMs) {
    return 0.35;
  }

  const ageMs = Math.max(0, nowMs - lastActiveAtMs);
  if (ageMs <= 24 * 60 * 60 * 1000) {
    return 0.95;
  }
  if (ageMs <= 7 * 24 * 60 * 60 * 1000) {
    return 0.72;
  }
  if (ageMs <= 30 * 24 * 60 * 60 * 1000) {
    return 0.45;
  }

  return 0.2;
}

function resolveUrgency(type: NotificationQualityType, input: NotificationQualitySignals) {
  const explicitUrgency = readRate(input.dropUrgency, -1);
  const typeUrgency = type === "system_alert" || type === "error"
    ? 1
    : type === "expiring_soon" || type === "warning"
      ? 0.86
      : type === "drop_requeued_live"
        ? 0.72
        : type === "new_drop"
          ? 0.64
          : 0.35;

  return explicitUrgency >= 0 ? Math.max(explicitUrgency, typeUrgency) : typeUrgency;
}

function resolveNovelty(input: NotificationQualitySignals) {
  const recentVolumePenalty = clamp01(readCount(input.recentNotificationVolume24h) / 8);
  const sameTypePenalty = clamp01(readCount(input.sameTypeRecentCount24h) / 3);
  return clamp01(1 - ((0.65 * recentVolumePenalty) + (0.35 * sameTypePenalty)));
}

function resolveMonetizationRelevance(type: NotificationQualityType, input: NotificationQualitySignals) {
  const purchaseSignal = clamp01(readCount(input.purchaseCount) / 3);
  const unwrapSignal = clamp01(readCount(input.unwrapCount) / 6);
  const creatorPurchaseSignal = input.hasPurchasedFromCreator === true ? 1 : 0;
  const creatorUnwrapSignal = input.hasUnwrappedCreatorDrops === true ? 0.75 : 0;
  const monetizedTypeSignal = type === "new_drop" || type === "drop_requeued_live" || type === "expiring_soon"
    ? 0.65
    : type === "creator_broadcast"
      ? 0.45
      : 0.2;

  return clamp01(
    (0.30 * purchaseSignal)
    + (0.25 * unwrapSignal)
    + (0.20 * creatorPurchaseSignal)
    + (0.15 * creatorUnwrapSignal)
    + (0.10 * monetizedTypeSignal),
  );
}

function resolveFatiguePenalty(input: NotificationQualitySignals) {
  const unreadPenalty = clamp01(readCount(input.unreadNotificationCount) / 12) * 8;
  const recentVolumePenalty = clamp01(readCount(input.recentNotificationVolume24h) / 8) * 12;
  const repeatedTypePenalty = clamp01(readCount(input.sameTypeRecentCount24h) / 3) * 10;
  return Math.round((unreadPenalty + recentVolumePenalty + repeatedTypePenalty) * 100) / 100;
}

export function computeNotificationQualityScore(input: NotificationQualitySignals): NotificationQualityResult {
  const notificationType = normalizeNotificationQualityType(input.notificationType);
  const typeOpenPrior = resolveTypeOpenPrior(notificationType);
  const pastNotificationReadRate = readRate(input.pastNotificationReadRate, 0.45);
  const pastNotificationClickRate = readRate(input.pastNotificationClickRate, 0.18);
  const predictedOpen = clamp01(
    (0.55 * pastNotificationReadRate)
    + (0.25 * pastNotificationClickRate)
    + (0.20 * typeOpenPrior),
  );
  const predictedReturn = resolveReturnLikelihood(input);
  const creatorAffinity = readRate(input.creatorAffinity, notificationType === "creator_broadcast" ? 0.55 : 0.35);
  const urgency = resolveUrgency(notificationType, input);
  const novelty = resolveNovelty(input);
  const monetizationRelevance = resolveMonetizationRelevance(notificationType, input);
  const fatiguePenalty = resolveFatiguePenalty(input);
  const notificationScore = clampScore(
    100 * (
      (0.30 * predictedOpen)
      + (0.20 * predictedReturn)
      + (0.20 * creatorAffinity)
      + (0.15 * urgency)
      + (0.10 * novelty)
      + (0.05 * monetizationRelevance)
    )
    - fatiguePenalty,
  );
  const reasons: string[] = [];

  if (creatorAffinity >= 0.7) {
    reasons.push("Ranked higher because this creator has strong affinity.");
  }
  if (urgency >= 0.75) {
    reasons.push("Ranked higher because the notification is urgent.");
  }
  if (novelty <= 0.45) {
    reasons.push("Lowered because recent notifications were repetitive.");
  }
  if (fatiguePenalty >= 12) {
    reasons.push("Lowered because recent notification volume may cause fatigue.");
  }
  if (monetizationRelevance >= 0.55) {
    reasons.push("Ranked higher because purchase or unwrap history makes it relevant.");
  }
  reasons.push("Notification read remains the canonical behavioral action; opens and clicks stay diagnostic unless this score explicitly uses them.");

  return {
    version: NOTIFICATION_QUALITY_SCORE_VERSION,
    notificationScore,
    label: notificationScore >= 55 ? "send" : notificationScore >= 35 ? "rank_only" : "suppress",
    components: {
      predictedOpen,
      predictedReturn,
      creatorAffinity,
      urgency,
      novelty,
      monetizationRelevance,
      fatiguePenalty,
    },
    reasons,
    canonicalBehaviorAction: NOTIFICATION_READ_CANONICAL_ACTION,
    diagnosticActions: NOTIFICATION_DIAGNOSTIC_ACTIONS,
  };
}

export function buildNotificationQualityMetadata(input: NotificationQualitySignals) {
  const result = computeNotificationQualityScore(input);
  return {
    qualityScore: result.notificationScore,
    notificationQuality: result,
    qualityPolicyVersion: result.version,
  };
}

function inferNotificationType(notification: RankableNotification) {
  if (notification.lifecycleEvent) {
    return notification.lifecycleEvent;
  }

  if (notification.dropContext?.dropId) {
    return "new_drop";
  }

  return notification.type ?? "general";
}

export function rankNotificationsByQuality<T extends RankableNotification>(
  notifications: T[],
  signals: NotificationQualitySignals = {},
): Array<RankedNotification<T>> {
  const nowMs = signals.nowMs ?? Date.now();
  const unreadNotificationCount = signals.unreadNotificationCount ?? notifications.length;
  const recentNotificationVolume24h = signals.recentNotificationVolume24h
    ?? notifications.filter((notification) => {
      const createdAtMs = typeof notification.createdAtMs === "number" ? notification.createdAtMs : 0;
      return createdAtMs > 0 && nowMs - createdAtMs <= 24 * 60 * 60 * 1000;
    }).length;
  const typeCounts = new Map<string, number>();

  notifications.forEach((notification) => {
    const type = normalizeNotificationQualityType(inferNotificationType(notification));
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
  });

  return notifications
    .map((notification, index) => {
      const type = normalizeNotificationQualityType(inferNotificationType(notification));
      const quality = computeNotificationQualityScore({
        ...signals,
        notificationType: type,
        nowMs,
        unreadNotificationCount,
        recentNotificationVolume24h,
        sameTypeRecentCount24h: Math.max(0, (typeCounts.get(type) || 0) - 1),
        creatorAffinity: signals.creatorAffinity ?? notification.notificationQuality?.components.creatorAffinity,
        dropUrgency: notification.dropContext?.dropId ? Math.max(signals.dropUrgency ?? 0, 0.62) : signals.dropUrgency,
      });
      const ranked: RankedNotification<T> = {
        ...notification,
        notificationQuality: quality,
        qualityScore: quality.notificationScore,
      };

      return {
        ranked,
        index,
      };
    })
    .sort((left, right) => {
      const qualityDelta = right.ranked.qualityScore - left.ranked.qualityScore;
      if (qualityDelta !== 0) {
        return qualityDelta;
      }

      const createdDelta = (right.ranked.createdAtMs ?? 0) - (left.ranked.createdAtMs ?? 0);
      if (createdDelta !== 0) {
        return createdDelta;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.ranked);
}
