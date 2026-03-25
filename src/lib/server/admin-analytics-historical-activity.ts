import { DropReference, resolveDropTitle } from "@/lib/server/drop-references";
import { summarizeSecurityReason } from "@/lib/server/analytics-semantics";
import { getTransactionDisplayLabel } from "@/lib/transaction-normalizers";
import {
  TaskLifecycleLog,
  TelemetryLogRecord,
  getTelemetryParamNumber,
  getTelemetryParamString,
  toNumber,
  toStringValue,
} from "@/lib/server/admin-analytics-shared";

type UserMapEntry = {
  username: string;
  photoURL: string;
};

type DropReferenceMap = Record<string, DropReference>;

type HistoricalTransaction = Record<string, unknown> & {
  type?: string;
  description?: string;
  userId?: string;
  timestamp?: number;
};

type HistoricalSecurityLog = {
  uid: string;
  username: string;
  photoURL?: string;
  ripAttempts: number;
  lastViolation: string | null;
  lastViolationReason: string;
  lastViolationDropId: string | null;
  lastViolationDropTitle: string | null;
};

type HistoricalActivityItem = {
  type: string;
  detail: string;
  path: string;
  uid: string;
  username: string;
  userPhoto: string;
  timestamp: number;
  targetText?: string;
  targetTag?: string;
  targetId?: string;
  scrollDepthPercent?: number;
};

export function buildHistoricalActivityFeeds({
  rawTransactions,
  telemetryLogs,
  guestBatchDocs,
  normalizedTaskEvents,
  securityEventDocs,
  userMap,
  dropReferences,
  startMs,
}: {
  rawTransactions: HistoricalTransaction[];
  telemetryLogs: TelemetryLogRecord[];
  guestBatchDocs: Array<{ data: () => FirebaseFirestore.DocumentData }>;
  normalizedTaskEvents: TaskLifecycleLog[];
  securityEventDocs: Array<{ data: () => FirebaseFirestore.DocumentData }>;
  userMap: Record<string, UserMapEntry>;
  dropReferences: DropReferenceMap;
  startMs: number;
}) {
  const mappedCommerceFeed = rawTransactions.map((transaction) => ({
    ...transaction,
    username: transaction.userId ? (userMap[transaction.userId]?.username || transaction.userId) : "Unknown User",
    userPhoto: transaction.userId ? (userMap[transaction.userId]?.photoURL || "") : "",
  }));

  const securityByUser = new Map<string, HistoricalSecurityLog>();

  securityEventDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const uid = toStringValue(data.userId);
    if (!uid) {
      return;
    }

    const current = securityByUser.get(uid) || {
      uid,
      username: userMap[uid]?.username || toStringValue(data.username) || uid,
      photoURL: userMap[uid]?.photoURL || undefined,
      ripAttempts: 0,
      lastViolation: null,
      lastViolationReason: "Unknown",
      lastViolationDropId: null,
      lastViolationDropTitle: null,
    };
    const timestamp = toNumber(data.timestamp);
    current.ripAttempts += 1;

    if (!current.lastViolation || timestamp > Date.parse(current.lastViolation)) {
      const dropId = toStringValue(data.dropId) || null;
      current.lastViolation = new Date(timestamp).toISOString();
      current.lastViolationReason =
        toStringValue(data.label) || summarizeSecurityReason(toStringValue(data.reason)) || "Unknown";
      current.lastViolationDropId = dropId;
      current.lastViolationDropTitle = dropId ? resolveDropTitle(dropReferences, dropId) : null;
    }

    securityByUser.set(uid, current);
  });

  const securityLogs = Array.from(securityByUser.values())
    .sort(
      (left, right) =>
        right.ripAttempts - left.ripAttempts ||
        Date.parse(right.lastViolation || "") - Date.parse(left.lastViolation || ""),
    )
    .slice(0, 50);

  const guestActivity: HistoricalActivityItem[] = guestBatchDocs.flatMap((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const events = Array.isArray(data.events) ? (data.events as Array<Record<string, unknown>>) : [];
    return events.map((event) => ({
      type: toStringValue(event.type) || "guest_event",
      detail: toStringValue(event.targetText) || toStringValue(event.targetKey) || "Guest interaction",
      targetText: toStringValue(event.targetText) || undefined,
      targetTag: toStringValue(event.targetTag) || undefined,
      targetId: toStringValue(event.targetId) || undefined,
      scrollDepthPercent: toNumber(event.scrollDepthPercent) || undefined,
      path: toStringValue(event.path) || toStringValue(data.pagePath) || "/",
      uid: "guest",
      username: "Guest",
      userPhoto: "",
      timestamp: toNumber(event.timestamp) || toNumber(data.receivedAtMs),
    }));
  });

  const authActivity: HistoricalActivityItem[] = telemetryLogs.map((event) => ({
    type: event.eventName,
    detail:
      getTelemetryParamString(event, "drop_title") ||
      getTelemetryParamString(event, "destination") ||
      getTelemetryParamString(event, "page_path") ||
      event.eventName,
    targetText: getTelemetryParamString(event, "target_text") || undefined,
    targetTag: getTelemetryParamString(event, "target_tag") || undefined,
    targetId: getTelemetryParamString(event, "target_id") || undefined,
    scrollDepthPercent: getTelemetryParamNumber(event, "scroll_depth_percent") || undefined,
    path: getTelemetryParamString(event, "page_path") || "/",
    uid: event.userId || "guest",
    username: event.userId ? (userMap[event.userId]?.username || event.username || event.userId) : "Guest",
    userPhoto: event.userId ? (userMap[event.userId]?.photoURL || "") : "",
    timestamp: event.timestamp,
  }));

  const transactionActivity: HistoricalActivityItem[] = rawTransactions.map((transaction) => ({
    type: transaction.type || "transaction",
    detail: getTransactionDisplayLabel({
      type: (toStringValue(transaction.type) || "admin_adjustment") as Parameters<typeof getTransactionDisplayLabel>[0]["type"],
      description: toStringValue(transaction.description),
      rewardSource: toStringValue(transaction.rewardSource) as Parameters<typeof getTransactionDisplayLabel>[0]["rewardSource"],
    }),
    path: "/dashboard",
    uid: transaction.userId || "unknown",
    username: transaction.userId ? (userMap[transaction.userId]?.username || transaction.userId) : "Unknown User",
    userPhoto: transaction.userId ? (userMap[transaction.userId]?.photoURL || "") : "",
    timestamp: toNumber(transaction.timestamp),
  }));

  const taskActivity: HistoricalActivityItem[] = normalizedTaskEvents.map((event) => ({
    type: `task_${event.type}`,
    detail: event.title || event.taskId || "Task update",
    path: "/experiences",
    uid: event.userId || "unknown",
    username: event.userId ? (userMap[event.userId]?.username || event.username || event.userId) : "Unknown User",
    userPhoto: event.userId ? (userMap[event.userId]?.photoURL || "") : "",
    timestamp: event.timestamp,
  }));

  const mappedEvents = [...authActivity, ...guestActivity, ...transactionActivity, ...taskActivity]
    .filter((event) => event.timestamp >= startMs)
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 200);

  return {
    mappedCommerceFeed,
    securityLogs,
    mappedEvents,
  };
}
