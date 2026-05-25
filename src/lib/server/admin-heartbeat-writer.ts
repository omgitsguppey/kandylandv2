import type { Firestore } from "firebase-admin/firestore";

import { ADMIN_HEARTBEAT_COLLECTION } from "@/lib/admin/admin-hot-cache-contract";
import { buildAdminHeartbeatRecord, type AdminHeartbeatRecord } from "@/lib/admin/admin-heartbeat-contract";

type WriteAdminHeartbeatInput = Parameters<typeof buildAdminHeartbeatRecord>[0] & {
  db: Firestore;
};

export async function writeAdminHeartbeatRecord(input: WriteAdminHeartbeatInput): Promise<AdminHeartbeatRecord> {
  const { db, ...recordInput } = input;
  const record = buildAdminHeartbeatRecord(recordInput);
  await db.collection(ADMIN_HEARTBEAT_COLLECTION).doc(record.snapshotId).set(record, { merge: true });
  return record;
}
