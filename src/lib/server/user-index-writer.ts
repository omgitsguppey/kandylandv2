import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import {
  USER_INDEX_COLLECTIONS,
  type GuestTrackingIndex,
  type UserContentConsumptionIndex,
  type UserEntityAffinityIndex,
  type UserJourneyIndex,
  type UserNotificationIndex,
  type UserTrackingIndex,
  type UserValueIndex,
} from "@/lib/user-indexes/user-tracking-index-contract";

export async function writeUserTrackingIndex(index: UserTrackingIndex) {
  await adminDb.collection(USER_INDEX_COLLECTIONS.userTrackingIndexes).doc(index.userId).set({
    ...index,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function writeGuestTrackingIndex(index: GuestTrackingIndex) {
  await adminDb.collection(USER_INDEX_COLLECTIONS.guestTrackingIndexes).doc(index.anonymousVisitorId).set({
    ...index,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function writeUserEntityAffinityIndex(index: UserEntityAffinityIndex) {
  await adminDb.collection(USER_INDEX_COLLECTIONS.userEntityAffinityIndexes).doc(index.userId).set({
    ...index,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function writeUserValueIndex(index: UserValueIndex) {
  await adminDb.collection(USER_INDEX_COLLECTIONS.userValueIndexes).doc(index.userId).set({
    ...index,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function writeUserJourneyIndex(index: UserJourneyIndex) {
  const docId = index.userId || index.anonymousVisitorId;
  if (!docId) return;
  await adminDb.collection(USER_INDEX_COLLECTIONS.userJourneyIndexes).doc(docId).set({
    ...index,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function writeUserNotificationIndex(index: UserNotificationIndex) {
  await adminDb.collection(USER_INDEX_COLLECTIONS.userNotificationIndexes).doc(index.userId).set({
    ...index,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function writeUserContentConsumptionIndex(index: UserContentConsumptionIndex) {
  await adminDb.collection(USER_INDEX_COLLECTIONS.userContentConsumptionIndexes).doc(index.userId).set({
    ...index,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}
