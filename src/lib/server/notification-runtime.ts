import "server-only";

import { FieldValue, type Transaction, type WriteBatch } from "firebase-admin/firestore";

import { NOTIFICATION_RUNTIME_COLLECTION, NOTIFICATION_RUNTIME_DOC_ID } from "@/lib/notification-runtime";
import { adminDb } from "@/lib/server/firebase-admin";

type RuntimeWriter = Transaction | WriteBatch;

function buildRuntimePayload(nowMs: number) {
  return {
    lastChangedAt: nowMs,
    lastChangedAtServer: FieldValue.serverTimestamp(),
    version: FieldValue.increment(1),
  };
}

export function markNotificationsRuntimeChanged(writer: RuntimeWriter, nowMs = Date.now()) {
  const documentRef = adminDb.collection(NOTIFICATION_RUNTIME_COLLECTION).doc(NOTIFICATION_RUNTIME_DOC_ID);
  const setDoc = writer.set.bind(writer) as (
    ref: FirebaseFirestore.DocumentReference,
    data: FirebaseFirestore.DocumentData,
    options: FirebaseFirestore.SetOptions,
  ) => unknown;

  setDoc(documentRef, buildRuntimePayload(nowMs), { merge: true });
}

export async function touchNotificationsRuntime(nowMs = Date.now()) {
  if (!adminDb) {
    return;
  }

  await adminDb
    .collection(NOTIFICATION_RUNTIME_COLLECTION)
    .doc(NOTIFICATION_RUNTIME_DOC_ID)
    .set(buildRuntimePayload(nowMs), { merge: true });
}
