import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";

export interface DropQueueConfig {
  queue: string[];
  dropsPerDay: number;
  cooldownDays: number;
  timesPerDay: string[];
}

export const DEFAULT_DROP_QUEUE_CONFIG: DropQueueConfig = {
  queue: [],
  dropsPerDay: 1,
  cooldownDays: 7,
  timesPerDay: ["12:00"],
};

function normalizeTimesPerDay(timesPerDay: unknown, dropsPerDay: number): string[] {
  const rawTimes = Array.isArray(timesPerDay)
    ? timesPerDay.filter((value): value is string => typeof value === "string" && /^\d{2}:\d{2}$/.test(value))
    : [];
  const sortedTimes = [...rawTimes].sort((left, right) => left.localeCompare(right));

  if (sortedTimes.length === 0) {
    return Array.from({ length: dropsPerDay }, (_, index) => (index === 0 ? "12:00" : "18:00"));
  }

  if (sortedTimes.length >= dropsPerDay) {
    return sortedTimes.slice(0, dropsPerDay);
  }

  return [
    ...sortedTimes,
    ...Array(dropsPerDay - sortedTimes.length).fill(sortedTimes[sortedTimes.length - 1] || "12:00"),
  ];
}

function normalizeQueueConfig(raw: Partial<DropQueueConfig> | null | undefined): DropQueueConfig {
  const dropsPerDay = Math.max(1, Math.floor(Number(raw?.dropsPerDay) || DEFAULT_DROP_QUEUE_CONFIG.dropsPerDay));
  const cooldownDays = Math.max(1, Math.floor(Number(raw?.cooldownDays) || DEFAULT_DROP_QUEUE_CONFIG.cooldownDays));
  const queue = Array.isArray(raw?.queue)
    ? Array.from(new Set(raw.queue.filter((value): value is string => typeof value === "string" && value.length > 0)))
    : [];

  return {
    queue,
    dropsPerDay,
    cooldownDays,
    timesPerDay: normalizeTimesPerDay(raw?.timesPerDay, dropsPerDay),
  };
}

export async function getLegacyQueuedDropIds(): Promise<string[]> {
  if (!adminDb) {
    return [];
  }

  const snapshot = await adminDb.collection("drops").where("rotationConfig.enabled", "==", true).get();
  return snapshot.docs.map((doc) => doc.id);
}

export async function getResolvedQueueConfig(): Promise<DropQueueConfig> {
  if (!adminDb) {
    return DEFAULT_DROP_QUEUE_CONFIG;
  }

  const [queueSnap, legacyIds] = await Promise.all([
    adminDb.collection("adminSettings").doc("dropQueue").get(),
    getLegacyQueuedDropIds(),
  ]);

  const stored = normalizeQueueConfig(queueSnap.exists ? (queueSnap.data() as Partial<DropQueueConfig>) : DEFAULT_DROP_QUEUE_CONFIG);
  return {
    ...stored,
    queue: Array.from(new Set([...stored.queue, ...legacyIds])),
  };
}

export async function saveResolvedQueueConfig(raw: Partial<DropQueueConfig>): Promise<DropQueueConfig> {
  if (!adminDb) {
    return normalizeQueueConfig(raw);
  }

  const normalized = normalizeQueueConfig(raw);
  await adminDb.collection("adminSettings").doc("dropQueue").set(normalized, { merge: true });
  return normalized;
}

export async function setDropQueueMembership(dropId: string, shouldQueue: boolean): Promise<void> {
  if (!adminDb) {
    return;
  }

  const queueRef = adminDb.collection("adminSettings").doc("dropQueue");
  const dropRef = adminDb.collection("drops").doc(dropId);

  await Promise.all([
    queueRef.set({
      queue: shouldQueue ? FieldValue.arrayUnion(dropId) : FieldValue.arrayRemove(dropId),
    }, { merge: true }),
    dropRef.set({
      rotationConfig: FieldValue.delete(),
    }, { merge: true }),
  ]);
}
