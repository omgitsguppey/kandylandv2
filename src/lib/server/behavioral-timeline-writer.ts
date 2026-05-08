import "server-only";

import { adminDb } from "@/lib/server/firebase-admin";
import {
  BEHAVIORAL_TIMELINE_COLLECTION,
  type BehavioralTimelineFact,
} from "@/lib/behavioral/behavioral-timeline-contract";

const MAX_TIMELINE_FACTS_PER_BATCH = 120;

export function getBehavioralTimelineBatchLimit() {
  return MAX_TIMELINE_FACTS_PER_BATCH;
}

export async function writeBehavioralTimelineFacts(
  facts: BehavioralTimelineFact[],
) {
  if (!adminDb) {
    return { written: 0, skipped: facts.length, reason: "admin_db_unavailable" as const };
  }

  const trimmedFacts = facts.slice(0, MAX_TIMELINE_FACTS_PER_BATCH);
  if (trimmedFacts.length === 0) {
    return { written: 0, skipped: 0, reason: "no_facts" as const };
  }

  const batch = adminDb.batch();
  for (const fact of trimmedFacts) {
    const ref = adminDb.collection(BEHAVIORAL_TIMELINE_COLLECTION).doc(fact.factId);
    batch.set(ref, fact, { merge: true });
  }
  await batch.commit();

  return {
    written: trimmedFacts.length,
    skipped: Math.max(0, facts.length - trimmedFacts.length),
    reason: trimmedFacts.length < facts.length ? ("batch_capped" as const) : ("ok" as const),
  };
}
