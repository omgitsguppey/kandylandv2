import type { NotificationQualityResult } from "@/lib/notifications/notification-quality-score";

export const NOTIFICATION_TYPES = ["info", "success", "warning", "error"] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationTarget {
  global: boolean;
  userIds: string[];
  excludedUserIds?: string[];
}

export interface DropNotificationContext {
  dropId: string;
  dropTitle: string;
  previewImageUrl: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: NotificationTimestampLike | null;
  createdAtMs: number | null;
  readBy: string[];
  target: NotificationTarget;
  link?: string;
  dropContext?: DropNotificationContext;
  lifecycleEvent?: string;
  qualityScore?: number;
  qualityPolicyVersion?: string;
  notificationQuality?: NotificationQualityResult;
  targetUserId?: string | null;
  recipientUserId?: string | null;
  recipientUserIds?: string[];
  actorUserId?: string | null;
  actorAdminId?: string | null;
  actorCreatorId?: string | null;
  actorType?: NotificationActorType;
  sourceComponent?: string | null;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  route?: string | null;
  surface?: string | null;
  sessionId?: string | null;
  createdAtUtc?: string | null;
  canonicalContext?: NotificationCanonicalContext;
}

export interface NotificationTimestampLike {
  toDate: () => Date;
  toMillis: () => number;
}

interface UnknownDropContext {
  dropId?: unknown;
  dropTitle?: unknown;
  previewImageUrl?: unknown;
}

interface UnknownNotificationDoc {
  title?: unknown;
  message?: unknown;
  type?: unknown;
  createdAt?: unknown;
  createdAtMs?: unknown;
  readBy?: unknown;
  target?: unknown;
  link?: unknown;
  dropContext?: unknown;
  lifecycleEvent?: unknown;
  qualityScore?: unknown;
  qualityPolicyVersion?: unknown;
  notificationQuality?: unknown;
  targetUserId?: unknown;
  recipientUserId?: unknown;
  recipientUserIds?: unknown;
  actorUserId?: unknown;
  actorAdminId?: unknown;
  actorCreatorId?: unknown;
  actorType?: unknown;
  sourceComponent?: unknown;
  sourceEntityType?: unknown;
  sourceEntityId?: unknown;
  route?: unknown;
  surface?: unknown;
  sessionId?: unknown;
  createdAtUtc?: unknown;
  userId?: unknown;
}

export const NOTIFICATION_ACTOR_TYPES = ["system", "user", "admin", "creator", "unknown"] as const;
export type NotificationActorType = (typeof NOTIFICATION_ACTOR_TYPES)[number];

export type NotificationCanonicalContextState =
  | "complete"
  | "complete_derived_from_user_id"
  | "missing_target_user"
  | "missing_actor_for_foreground"
  | "missing_route_for_foreground"
  | "background_route_not_required"
  | "unknown";

export interface NotificationCanonicalContext {
  notificationId: string;
  targetUserId: string | null;
  actorUserId: string | null;
  actorAdminId: string | null;
  actorCreatorId: string | null;
  actorType: NotificationActorType;
  notificationType: string;
  sourceComponent: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
  recipientUserIds: string[];
  route?: string | null;
  surface?: string | null;
  sessionId?: string | null;
  createdAtUtc: string;
  contextState: NotificationCanonicalContextState;
  metricEligible: boolean;
  metricExclusionReason?: string;
  provenance?: "stored_target_user" | "stored_recipient_user" | "derived_from_user_id" | "derived_from_target_list" | "global_audience";
}

export interface NotificationRecordInput {
  title: string;
  message: string;
  type: NotificationType;
  target: NotificationTarget;
  link?: string | null;
  dropContext?: DropNotificationContext | null;
  lifecycleEvent?: string | null;
  createdAtMs: number;
  readBy?: string[];
  targetUserId?: string | null;
  recipientUserId?: string | null;
  actorUserId?: string | null;
  actorAdminId?: string | null;
  actorCreatorId?: string | null;
  actorType?: NotificationActorType;
  sourceComponent: string;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  route?: string | null;
  surface?: string | null;
  sessionId?: string | null;
  includeLegacyUserId?: boolean;
  metadata?: Record<string, unknown>;
}

function toNumberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toTrimmedStringOrNull(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeActorType(value: unknown): NotificationActorType {
  return typeof value === "string" && NOTIFICATION_ACTOR_TYPES.includes(value as NotificationActorType)
    ? value as NotificationActorType
    : "unknown";
}

function normalizeTimestampLike(value: unknown): NotificationTimestampLike | null {
  if (
    value
    && typeof value === "object"
    && "toDate" in value
    && typeof (value as { toDate?: unknown }).toDate === "function"
    && "toMillis" in value
    && typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    return value as NotificationTimestampLike;
  }

  const timestampMs = toNumberOrNull(value);
  if (timestampMs === null) {
    return null;
  }

  return {
    toDate: () => new Date(timestampMs),
    toMillis: () => timestampMs,
  };
}

export function normalizeNotificationDoc(id: string, data: UnknownNotificationDoc): AppNotification | null {
  if (typeof data.title !== "string" || typeof data.message !== "string") {
    return null;
  }

  const type = NOTIFICATION_TYPES.includes(data.type as NotificationType)
    ? (data.type as NotificationType)
    : "info";

  const createdAtMs = toNumberOrNull(data.createdAtMs);
  const createdAt = normalizeTimestampLike(data.createdAt) ?? normalizeTimestampLike(createdAtMs);
  const normalizedCreatedAtMs = createdAtMs ?? createdAt?.toMillis() ?? null;
  const readBy = Array.isArray(data.readBy) ? data.readBy.filter((entry): entry is string => typeof entry === "string") : [];

  const targetObj = (data.target && typeof data.target === "object") ? data.target as { global?: unknown; userIds?: unknown; excludedUserIds?: unknown } : null;
  const userIds = Array.isArray(targetObj?.userIds)
    ? targetObj.userIds.filter((entry): entry is string => typeof entry === "string")
    : [];
  const excludedUserIds = Array.isArray(targetObj?.excludedUserIds)
    ? targetObj.excludedUserIds.filter((entry): entry is string => typeof entry === "string")
    : [];

  const target: NotificationTarget = {
    global: targetObj?.global === true,
    userIds,
    excludedUserIds,
  };

  const dropContext = normalizeDropContext(data.dropContext);
  const targetUserId = deriveNotificationTargetUserId(data, target);
  const recipientUserId = toTrimmedStringOrNull(data.recipientUserId) ?? targetUserId;
  const recipientUserIds = Array.isArray(data.recipientUserIds)
    ? data.recipientUserIds.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : target.userIds;
  const actorType = normalizeActorType(data.actorType);
  const createdAtUtc = toTrimmedStringOrNull(data.createdAtUtc)
    ?? (normalizedCreatedAtMs ? new Date(normalizedCreatedAtMs).toISOString() : new Date(0).toISOString());
  const canonicalContext = deriveNotificationCanonicalContext(id, data, {
    target,
    targetUserId,
    recipientUserId,
    recipientUserIds,
    actorType,
    createdAtUtc,
  });

  return {
    id,
    title: data.title,
    message: data.message,
    type,
    createdAt,
    createdAtMs: normalizedCreatedAtMs,
    readBy,
    target,
    link: typeof data.link === "string" ? data.link : undefined,
    dropContext,
    lifecycleEvent: typeof data.lifecycleEvent === "string" ? data.lifecycleEvent : undefined,
    qualityScore: toNumberOrNull(data.qualityScore) ?? undefined,
    qualityPolicyVersion: typeof data.qualityPolicyVersion === "string" ? data.qualityPolicyVersion : undefined,
    notificationQuality: data.notificationQuality && typeof data.notificationQuality === "object"
      ? data.notificationQuality as NotificationQualityResult
      : undefined,
    targetUserId,
    recipientUserId,
    recipientUserIds,
    actorUserId: toTrimmedStringOrNull(data.actorUserId),
    actorAdminId: toTrimmedStringOrNull(data.actorAdminId),
    actorCreatorId: toTrimmedStringOrNull(data.actorCreatorId),
    actorType,
    sourceComponent: toTrimmedStringOrNull(data.sourceComponent),
    sourceEntityType: toTrimmedStringOrNull(data.sourceEntityType),
    sourceEntityId: toTrimmedStringOrNull(data.sourceEntityId),
    route: toTrimmedStringOrNull(data.route),
    surface: toTrimmedStringOrNull(data.surface),
    sessionId: toTrimmedStringOrNull(data.sessionId),
    createdAtUtc,
    canonicalContext,
  };
}

function deriveNotificationTargetUserId(data: UnknownNotificationDoc, target: NotificationTarget) {
  const explicitTargetUserId = toTrimmedStringOrNull(data.targetUserId);
  if (explicitTargetUserId) {
    return explicitTargetUserId;
  }

  const explicitRecipientUserId = toTrimmedStringOrNull(data.recipientUserId);
  if (explicitRecipientUserId) {
    return explicitRecipientUserId;
  }

  const legacyUserId = toTrimmedStringOrNull(data.userId);
  if (legacyUserId) {
    return legacyUserId;
  }

  if (!target.global && target.userIds.length === 1) {
    return target.userIds[0] ?? null;
  }

  return null;
}

function deriveNotificationCanonicalContext(
  notificationId: string,
  data: UnknownNotificationDoc,
  options: {
    target: NotificationTarget;
    targetUserId: string | null;
    recipientUserId: string | null;
    recipientUserIds: string[];
    actorType: NotificationActorType;
    createdAtUtc: string;
  },
): NotificationCanonicalContext {
  const sourceComponent = toTrimmedStringOrNull(data.sourceComponent) ?? "unknown";
  const actorUserId = toTrimmedStringOrNull(data.actorUserId);
  const actorAdminId = toTrimmedStringOrNull(data.actorAdminId);
  const actorCreatorId = toTrimmedStringOrNull(data.actorCreatorId);
  const route = toTrimmedStringOrNull(data.route);
  const surface = toTrimmedStringOrNull(data.surface);
  const sessionId = toTrimmedStringOrNull(data.sessionId);
  const isForegroundInteraction = Boolean(
    route
    || surface === "notifications_dropdown"
    || sourceComponent === "use_notifications"
    || sourceComponent === "notification_bell"
    || sourceComponent === "notification_runtime_bridge",
  );

  let contextState: NotificationCanonicalContextState = "unknown";
  let metricEligible = false;
  let metricExclusionReason: string | undefined = "notification_delivery_background_only";
  let provenance: NotificationCanonicalContext["provenance"];

  if (options.targetUserId) {
    contextState = toTrimmedStringOrNull(data.userId) && !toTrimmedStringOrNull(data.targetUserId)
      ? "complete_derived_from_user_id"
      : "complete";
    provenance = toTrimmedStringOrNull(data.targetUserId)
      ? "stored_target_user"
      : toTrimmedStringOrNull(data.recipientUserId)
        ? "stored_recipient_user"
        : toTrimmedStringOrNull(data.userId)
          ? "derived_from_user_id"
          : "derived_from_target_list";
  } else if (options.target.global) {
    contextState = "complete";
    provenance = "global_audience";
  } else if (options.recipientUserIds.length > 1) {
    contextState = "complete";
  } else {
    contextState = "missing_target_user";
    metricExclusionReason = "notification_missing_target_user";
  }

  if (!isForegroundInteraction) {
    if (contextState === "complete") {
      contextState = "background_route_not_required";
    }
    return {
      notificationId,
      targetUserId: options.targetUserId,
      actorUserId,
      actorAdminId,
      actorCreatorId,
      actorType: options.actorType,
      notificationType: typeof data.type === "string" ? data.type : "info",
      sourceComponent,
      sourceEntityType: toTrimmedStringOrNull(data.sourceEntityType) ?? undefined,
      sourceEntityId: toTrimmedStringOrNull(data.sourceEntityId) ?? undefined,
      recipientUserIds: options.recipientUserIds,
      route,
      surface,
      sessionId,
      createdAtUtc: options.createdAtUtc,
      contextState,
      metricEligible: false,
      metricExclusionReason,
      provenance,
    };
  }

  if (!actorUserId && !actorAdminId && !actorCreatorId) {
    contextState = "missing_actor_for_foreground";
    metricExclusionReason = "notification_foreground_missing_actor";
  } else if (!route && !surface) {
    contextState = "missing_route_for_foreground";
    metricExclusionReason = "notification_foreground_missing_route";
  } else if (contextState !== "missing_target_user") {
    contextState = "complete";
    metricEligible = true;
    metricExclusionReason = undefined;
  }

  return {
    notificationId,
    targetUserId: options.targetUserId,
    actorUserId,
    actorAdminId,
    actorCreatorId,
    actorType: options.actorType,
    notificationType: typeof data.type === "string" ? data.type : "info",
    sourceComponent,
    sourceEntityType: toTrimmedStringOrNull(data.sourceEntityType) ?? undefined,
    sourceEntityId: toTrimmedStringOrNull(data.sourceEntityId) ?? undefined,
    recipientUserIds: options.recipientUserIds,
    route,
    surface,
    sessionId,
    createdAtUtc: options.createdAtUtc,
    contextState,
    metricEligible,
    metricExclusionReason,
    provenance,
  };
}

function normalizeDropContext(value: unknown): DropNotificationContext | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const context = value as UnknownDropContext;
  if (typeof context.dropId !== "string" || typeof context.dropTitle !== "string" || typeof context.previewImageUrl !== "string") {
    return undefined;
  }

  return {
    dropId: context.dropId,
    dropTitle: context.dropTitle,
    previewImageUrl: context.previewImageUrl,
  };
}

export interface NotificationCreatePayload {
  title: string;
  message: string;
  type: NotificationType;
  target: NotificationTarget;
  link?: string;
  dropContext?: DropNotificationContext;
}

export function normalizeNotificationCreatePayload(payload: unknown): NotificationCreatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const source = payload as {
    title?: unknown;
    message?: unknown;
    type?: unknown;
    target?: unknown;
    link?: unknown;
    dropContext?: unknown;
  };

  if (typeof source.title !== "string" || typeof source.message !== "string") {
    return null;
  }

  if (!NOTIFICATION_TYPES.includes(source.type as NotificationType)) {
    return null;
  }

  const normalizedTarget = normalizeTarget(source.target);
  if (!normalizedTarget) {
    return null;
  }

  const normalizedDropContext = normalizeDropContext(source.dropContext);
  if (source.dropContext && !normalizedDropContext) {
    return null;
  }

  const message = source.message.trim();
  if (normalizedDropContext && message.length > 150) {
    return null;
  }

  return {
    title: source.title.trim(),
    message,
    type: source.type as NotificationType,
    target: normalizedTarget,
    link: typeof source.link === "string" ? source.link : undefined,
    dropContext: normalizedDropContext,
  };
}

export function buildNotificationRecord(input: NotificationRecordInput) {
  const targetUserId = input.targetUserId
    ?? input.recipientUserId
    ?? (!input.target.global && input.target.userIds.length === 1 ? input.target.userIds[0] ?? null : null);

  const baseRecord: Record<string, unknown> = {
    title: input.title,
    message: input.message,
    type: input.type,
    notificationType: input.type,
    target: input.target,
    targetUserId,
    recipientUserId: input.recipientUserId ?? targetUserId,
    recipientUserIds: [...input.target.userIds],
    actorUserId: input.actorUserId ?? null,
    actorAdminId: input.actorAdminId ?? null,
    actorCreatorId: input.actorCreatorId ?? null,
    actorType: input.actorType ?? "unknown",
    sourceComponent: input.sourceComponent,
    sourceEntityType: input.sourceEntityType ?? null,
    sourceEntityId: input.sourceEntityId ?? null,
    route: input.route ?? null,
    surface: input.surface ?? (input.route ? "foreground" : "background"),
    sessionId: input.sessionId ?? null,
    link: input.link || null,
    dropContext: input.dropContext || null,
    createdAtMs: input.createdAtMs,
    createdAtUtc: new Date(input.createdAtMs).toISOString(),
    readBy: input.readBy ?? [],
  };

  if (input.lifecycleEvent) {
    baseRecord.lifecycleEvent = input.lifecycleEvent;
  }
  if (input.includeLegacyUserId && targetUserId) {
    baseRecord.userId = targetUserId;
  }

  return {
    ...baseRecord,
    ...(input.metadata ?? {}),
  };
}

function normalizeTarget(value: unknown): NotificationTarget | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as { global?: unknown; userIds?: unknown; excludedUserIds?: unknown };
  const userIds = Array.isArray(source.userIds)
    ? source.userIds.filter((entry): entry is string => typeof entry === "string")
    : [];
  const excludedUserIds = Array.isArray(source.excludedUserIds)
    ? source.excludedUserIds.filter((entry): entry is string => typeof entry === "string")
    : [];

  return {
    global: source.global === true,
    userIds,
    excludedUserIds,
  };
}
