import "server-only";

import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

import { normalizeNotificationDoc } from "@/lib/notification-contracts";
import { adminDb } from "@/lib/server/firebase-admin";

const NOTIFICATION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export interface NotificationInboxEntry {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  readBy: string[];
  target: {
    global: boolean;
    userIds: string[];
    excludedUserIds?: string[];
  };
  link?: string;
  dropContext?: {
    dropId: string;
    dropTitle: string;
    previewImageUrl: string;
  };
  createdAtMs: number;
}

export function isNotificationVisibleToUser(
  notification: Pick<NotificationInboxEntry, "target" | "createdAtMs"> & { readBy: string[] },
  uid: string,
  nowMs = Date.now(),
) {
  if (notification.target.excludedUserIds?.includes(uid)) {
    return false;
  }

  if (notification.createdAtMs && notification.createdAtMs < nowMs - NOTIFICATION_RETENTION_MS) {
    return false;
  }

  if (!(notification.target.global === true || notification.target.userIds.includes(uid))) {
    return false;
  }

  return true;
}

export function isUnreadNotificationForUser(
  notification: Pick<NotificationInboxEntry, "readBy" | "target" | "createdAtMs">,
  uid: string,
  nowMs = Date.now(),
) {
  if (!isNotificationVisibleToUser(notification, uid, nowMs)) {
    return false;
  }

  return !notification.readBy.includes(uid);
}

function normalizeInboxEntry(doc: QueryDocumentSnapshot, nowMs: number) {
  const normalized = normalizeNotificationDoc(doc.id, doc.data() as Record<string, unknown>);
  if (!normalized) {
    return null;
  }

  const createdAtMs = typeof normalized.createdAtMs === "number" && Number.isFinite(normalized.createdAtMs)
    ? normalized.createdAtMs
    : 0;
  if (createdAtMs && createdAtMs < nowMs - NOTIFICATION_RETENTION_MS) {
    return null;
  }

  return {
    ...normalized,
    createdAtMs,
  } satisfies NotificationInboxEntry;
}

export async function fetchUnreadNotificationsForUser(
  uid: string,
  options?: {
    targetLimit?: number;
    pageSize?: number;
    maxPages?: number;
    nowMs?: number;
  },
) {
  if (!adminDb) {
    return [];
  }

  const targetLimit = Math.max(1, Math.min(options?.targetLimit ?? 50, 100));
  const pageSize = Math.max(targetLimit, Math.min(options?.pageSize ?? 100, 200));
  const maxPages = Math.max(1, Math.min(options?.maxPages ?? 4, 10));
  const nowMs = options?.nowMs ?? Date.now();
  const results: NotificationInboxEntry[] = [];
  let cursor: QueryDocumentSnapshot | null = null;

  for (let pageIndex = 0; pageIndex < maxPages && results.length < targetLimit; pageIndex += 1) {
    let query = adminDb.collection("notifications").orderBy("createdAt", "desc").limit(pageSize);
    if (cursor) {
      query = query.startAfter(cursor);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      break;
    }

    snapshot.docs.forEach((doc) => {
      const normalized = normalizeInboxEntry(doc, nowMs);
      if (!normalized || !isUnreadNotificationForUser(normalized, uid, nowMs)) {
        return;
      }

      results.push(normalized);
    });

    cursor = snapshot.docs[snapshot.docs.length - 1] ?? null;
  }

  return results
    .sort((left, right) => right.createdAtMs - left.createdAtMs)
    .slice(0, targetLimit);
}

export async function hasUnreadNotificationsForUser(uid: string, nowMs = Date.now()) {
  const unread = await fetchUnreadNotificationsForUser(uid, {
    targetLimit: 1,
    pageSize: 50,
    maxPages: 3,
    nowMs,
  });

  return unread.length > 0;
}
