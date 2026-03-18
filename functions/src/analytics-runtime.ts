import {FieldValue, type Transaction, type WriteBatch} from "firebase-admin/firestore"

import {db} from "./firebase-admin.js"

export const ANALYTICS_RUNTIME_COLLECTION = "systemRuntime"
export const ANALYTICS_RUNTIME_DOC_ID = "analytics"

type RuntimeWriter = Transaction | WriteBatch

function buildRuntimePayload(nowMs: number) {
  return {
    lastChangedAt: nowMs,
    lastChangedAtServer: FieldValue.serverTimestamp(),
    version: FieldValue.increment(1),
  }
}

export function markAnalyticsRuntimeChanged(writer: RuntimeWriter, nowMs = Date.now()) {
  const documentRef = db.collection(ANALYTICS_RUNTIME_COLLECTION).doc(ANALYTICS_RUNTIME_DOC_ID)
  const setDoc = writer.set.bind(writer) as (
    ref: FirebaseFirestore.DocumentReference,
    data: FirebaseFirestore.DocumentData,
    options: FirebaseFirestore.SetOptions,
  ) => unknown

  setDoc(documentRef, buildRuntimePayload(nowMs), {merge: true})
}

export async function touchAnalyticsRuntime(nowMs = Date.now()) {
  await db
    .collection(ANALYTICS_RUNTIME_COLLECTION)
    .doc(ANALYTICS_RUNTIME_DOC_ID)
    .set(buildRuntimePayload(nowMs), {merge: true})
}
