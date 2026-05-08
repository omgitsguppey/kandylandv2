import "server-only";

import { adminDb } from "@/lib/server/firebase-admin";
import { BEHAVIORAL_TIMELINE_COLLECTION, type BehavioralTimelineFact } from "@/lib/behavioral/behavioral-timeline-contract";
import {
  buildGuestTrackingIndex,
  buildUserContentConsumptionIndex,
  buildUserEntityAffinityIndex,
  buildUserJourneyIndex,
  buildUserNotificationIndex,
  buildUserTrackingIndex,
  buildUserValueIndex,
} from "@/lib/user-indexes/user-index-normalizer";
import {
  writeGuestTrackingIndex,
  writeUserContentConsumptionIndex,
  writeUserEntityAffinityIndex,
  writeUserJourneyIndex,
  writeUserNotificationIndex,
  writeUserTrackingIndex,
  writeUserValueIndex,
} from "@/lib/server/user-index-writer";

export type UserIndexMaterializerOptions = {
  userIds?: string[];
  anonymousVisitorIds?: string[];
  maxUsers?: number;
  maxFacts?: number;
  runtimeCapMs?: number;
  dryRun?: boolean;
  sourceWindowStartMs?: number;
};

export async function materializeUserTrackingIndexes(options: UserIndexMaterializerOptions = {}) {
  const maxUsers = Math.max(1, Math.min(options.maxUsers ?? 50, 200));
  const maxFacts = Math.max(1, Math.min(options.maxFacts ?? 5000, 20000));
  const runtimeCapMs = Math.max(1000, options.runtimeCapMs ?? 15_000);
  const startedAt = Date.now();
  const sourceWindowStartMs = options.sourceWindowStartMs ?? (Date.now() - (1000 * 60 * 60 * 24 * 14));

  const factsQuery = await adminDb.collection(BEHAVIORAL_TIMELINE_COLLECTION)
    .where("timestampMs", ">=", sourceWindowStartMs)
    .orderBy("timestampMs", "desc")
    .limit(maxFacts)
    .get();

  const facts = factsQuery.docs.map((doc) => doc.data() as BehavioralTimelineFact);
  const userIds = Array.from(new Set(
    (options.userIds && options.userIds.length > 0 ? options.userIds : facts.map((fact) => fact.actorUserId || ""))
      .filter((value): value is string => Boolean(value)),
  )).slice(0, maxUsers);
  const guestIds = Array.from(new Set(
    (options.anonymousVisitorIds && options.anonymousVisitorIds.length > 0
      ? options.anonymousVisitorIds
      : facts.map((fact) => fact.anonymousVisitorId || ""))
      .filter((value): value is string => Boolean(value)),
  )).slice(0, maxUsers);

  const writes: Array<Promise<void>> = [];
  for (const userId of userIds) {
    if (Date.now() - startedAt > runtimeCapMs) break;
    const userFacts = facts.filter((fact) => fact.actorUserId === userId);
    const trackingIndex = buildUserTrackingIndex({
      userId,
      facts: userFacts,
      sourceWindowStartMs,
      sourceWindowEndMs: Date.now(),
    });
    const affinityIndex = buildUserEntityAffinityIndex(userId, userFacts);
    const valueIndex = buildUserValueIndex(userId, userFacts);
    const journeyIndex = buildUserJourneyIndex({ userId, facts: userFacts });
    const notificationIndex = buildUserNotificationIndex(userId, userFacts);
    const consumptionIndex = buildUserContentConsumptionIndex(userId, userFacts);

    if (!options.dryRun) {
      writes.push(writeUserTrackingIndex(trackingIndex));
      writes.push(writeUserEntityAffinityIndex(affinityIndex));
      writes.push(writeUserValueIndex(valueIndex));
      writes.push(writeUserJourneyIndex(journeyIndex));
      writes.push(writeUserNotificationIndex(notificationIndex));
      writes.push(writeUserContentConsumptionIndex(consumptionIndex));
    }
  }

  for (const anonymousVisitorId of guestIds) {
    if (Date.now() - startedAt > runtimeCapMs) break;
    const guestFacts = facts.filter((fact) => fact.anonymousVisitorId === anonymousVisitorId);
    const guestIndex = buildGuestTrackingIndex({
      anonymousVisitorId,
      facts: guestFacts,
      sourceWindowStartMs,
      sourceWindowEndMs: Date.now(),
    });
    const guestJourney = buildUserJourneyIndex({
      anonymousVisitorId,
      facts: guestFacts,
      identityLinkId: guestFacts.find((fact) => fact.identityLinkId)?.identityLinkId,
    });
    if (!options.dryRun) {
      writes.push(writeGuestTrackingIndex(guestIndex));
      writes.push(writeUserJourneyIndex(guestJourney));
    }
  }

  if (!options.dryRun) {
    await Promise.all(writes);
  }

  return {
    dryRun: Boolean(options.dryRun),
    runtimeMs: Date.now() - startedAt,
    sourceWindowStartMs,
    sourceWindowEndMs: Date.now(),
    usersProcessed: userIds.length,
    guestsProcessed: guestIds.length,
    factsProcessed: facts.length,
    issueCodes: [
      facts.length === 0 ? "insufficient_sample" : "",
      Date.now() - startedAt > runtimeCapMs ? "runtime_cap_reached" : "",
    ].filter(Boolean),
  };
}
