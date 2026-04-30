import { createHash } from "node:crypto";

export type NotificationIdentityInput = {
  type?: string | null;
  notificationId?: string | null;
  dropId?: string | null;
  taskId?: string | null;
  recipientId?: string | null;
  audience?: string | null;
  lifecycleEvent?: string | null;
};

function cleanPart(value: string | null | undefined, fallback: string) {
  const cleaned = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return cleaned || fallback;
}

export function buildNotificationIdempotencyKey(input: NotificationIdentityInput) {
  if (input.notificationId) {
    return `notification:${cleanPart(input.notificationId, "unknown")}`;
  }

  const type = cleanPart(input.type, "general");
  const lifecycleEvent = cleanPart(input.lifecycleEvent, "sent");
  const recipient = cleanPart(input.recipientId ?? input.audience, "global");

  if (input.dropId) {
    return `${type}:${lifecycleEvent}:${cleanPart(input.dropId, "drop")}:${recipient}`;
  }

  if (input.taskId) {
    return `${type}:${lifecycleEvent}:${cleanPart(input.taskId, "task")}:${recipient}`;
  }

  return `${type}:${lifecycleEvent}:${recipient}`;
}

export function buildBrowserNotificationTag(idempotencyKey: string) {
  return `kandydrops:${cleanPart(idempotencyKey, "notification")}`;
}

export function buildNotificationDocumentId(idempotencyKey: string) {
  return createHash("sha1").update(idempotencyKey).digest("hex");
}
