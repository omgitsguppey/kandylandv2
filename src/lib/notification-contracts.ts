import { Timestamp } from "firebase/firestore";

export const NOTIFICATION_TYPES = ["info", "success", "warning", "error"] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationTarget {
  global: boolean;
  userIds: string[];
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
  createdAt: Timestamp | null;
  readBy: string[];
  target: NotificationTarget;
  link?: string;
  dropContext?: DropNotificationContext;
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
  readBy?: unknown;
  target?: unknown;
  link?: unknown;
  dropContext?: unknown;
}

export function normalizeNotificationDoc(id: string, data: UnknownNotificationDoc): AppNotification | null {
  if (typeof data.title !== "string" || typeof data.message !== "string") {
    return null;
  }

  const type = NOTIFICATION_TYPES.includes(data.type as NotificationType)
    ? (data.type as NotificationType)
    : "info";

  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt : null;
  const readBy = Array.isArray(data.readBy) ? data.readBy.filter((entry): entry is string => typeof entry === "string") : [];

  const targetObj = (data.target && typeof data.target === "object") ? data.target as { global?: unknown; userIds?: unknown } : null;
  const userIds = Array.isArray(targetObj?.userIds)
    ? targetObj.userIds.filter((entry): entry is string => typeof entry === "string")
    : [];

  const target: NotificationTarget = {
    global: targetObj?.global === true,
    userIds,
  };

  const dropContext = normalizeDropContext(data.dropContext);

  return {
    id,
    title: data.title,
    message: data.message,
    type,
    createdAt,
    readBy,
    target,
    link: typeof data.link === "string" ? data.link : undefined,
    dropContext,
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

function normalizeTarget(value: unknown): NotificationTarget | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as { global?: unknown; userIds?: unknown };
  const userIds = Array.isArray(source.userIds)
    ? source.userIds.filter((entry): entry is string => typeof entry === "string")
    : [];

  return {
    global: source.global === true,
    userIds,
  };
}
