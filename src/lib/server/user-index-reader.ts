import "server-only";

import { adminDb } from "@/lib/server/firebase-admin";
import { USER_INDEX_COLLECTIONS } from "@/lib/user-indexes/user-tracking-index-contract";

export async function readUserTrackingIndex(userId: string) {
  const snap = await adminDb.collection(USER_INDEX_COLLECTIONS.userTrackingIndexes).doc(userId).get();
  return snap.exists ? snap.data() : null;
}

export async function readUserValueIndex(userId: string) {
  const snap = await adminDb.collection(USER_INDEX_COLLECTIONS.userValueIndexes).doc(userId).get();
  return snap.exists ? snap.data() : null;
}

export async function readUserEntityAffinityIndex(userId: string) {
  const snap = await adminDb.collection(USER_INDEX_COLLECTIONS.userEntityAffinityIndexes).doc(userId).get();
  return snap.exists ? snap.data() : null;
}

export async function readUserJourneyIndex(userIdOrAnonymousVisitorId: string) {
  const snap = await adminDb.collection(USER_INDEX_COLLECTIONS.userJourneyIndexes).doc(userIdOrAnonymousVisitorId).get();
  return snap.exists ? snap.data() : null;
}

export async function readGuestTrackingIndex(anonymousVisitorId: string) {
  const snap = await adminDb.collection(USER_INDEX_COLLECTIONS.guestTrackingIndexes).doc(anonymousVisitorId).get();
  return snap.exists ? snap.data() : null;
}
