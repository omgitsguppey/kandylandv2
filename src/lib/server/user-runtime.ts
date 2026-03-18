import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { USER_RUNTIME_COLLECTION } from "@/lib/user-runtime";
import { adminDb } from "@/lib/server/firebase-admin";

type UserRuntimeSignalKey = "activity" | "notifications" | "tasks" | "profile";

interface TouchUserRuntimeOptions {
  activity?: boolean;
  notifications?: boolean;
  tasks?: boolean;
  profile?: boolean;
}

function buildRuntimePatch(nowMs: number, options: TouchUserRuntimeOptions) {
  const patch: Record<string, unknown> = {
    lastChangedAt: nowMs,
    lastChangedAtServer: FieldValue.serverTimestamp(),
    version: FieldValue.increment(1),
  };

  const keys = Object.entries(options)
    .filter(([, enabled]) => enabled === true)
    .map(([key]) => key as UserRuntimeSignalKey);

  keys.forEach((key) => {
    patch[`last${key.charAt(0).toUpperCase()}${key.slice(1)}At`] = nowMs;
    patch[`${key}Version`] = FieldValue.increment(1);
  });

  return patch;
}

export async function touchUserRuntime(
  uid: string,
  options: TouchUserRuntimeOptions,
  nowMs = Date.now(),
) {
  if (!adminDb || !uid) {
    return;
  }

  await adminDb.collection(USER_RUNTIME_COLLECTION).doc(uid).set(
    buildRuntimePatch(nowMs, options),
    { merge: true },
  );
}
