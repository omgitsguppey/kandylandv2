import "server-only";

import { adminDb } from "@/lib/server/firebase-admin";
import {
  BEHAVIORAL_TIMELINE_COLLECTION,
  type BehavioralTimelineFact,
} from "@/lib/behavioral/behavioral-timeline-contract";

export async function readBehavioralTimelineFactsByUser(userId: string, limit = 500) {
  if (!adminDb || !userId) {
    return [] as BehavioralTimelineFact[];
  }

  const snap = await adminDb
    .collection(BEHAVIORAL_TIMELINE_COLLECTION)
    .where("actorUserId", "==", userId)
    .limit(Math.max(1, Math.min(limit, 2000)))
    .get();

  return snap.docs.map((doc) => doc.data() as BehavioralTimelineFact);
}

export async function readBehavioralTimelineFactsByAnonymousVisitor(anonymousVisitorId: string, limit = 500) {
  if (!adminDb || !anonymousVisitorId) {
    return [] as BehavioralTimelineFact[];
  }

  const snap = await adminDb
    .collection(BEHAVIORAL_TIMELINE_COLLECTION)
    .where("anonymousVisitorId", "==", anonymousVisitorId)
    .limit(Math.max(1, Math.min(limit, 2000)))
    .get();

  return snap.docs.map((doc) => doc.data() as BehavioralTimelineFact);
}
