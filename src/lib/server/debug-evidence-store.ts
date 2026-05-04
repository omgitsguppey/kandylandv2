import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import {
  DEBUG_EVIDENCE_BUCKETS,
  buildDebugEvidenceRecord,
  redactDebugEvidenceForAudit,
  type DebugEvidenceAuditSummary,
  type DebugEvidenceCategory,
  type DebugEvidenceInput,
  type DebugEvidenceRecord,
} from "@/lib/debug-evidence-contract";
import { adminDb } from "@/lib/server/firebase-admin";

function normalizeRecordFromDoc(id: string, data: Record<string, unknown>): DebugEvidenceRecord {
  return {
    id,
    createdAt: Number(data.createdAt) || Number(data.lastSeenAt) || Date.now(),
    source: data.source as DebugEvidenceRecord["source"],
    severity: data.severity as DebugEvidenceRecord["severity"],
    category: data.category as DebugEvidenceRecord["category"],
    route: typeof data.route === "string" ? data.route : undefined,
    component: typeof data.component === "string" ? data.component : undefined,
    userId: typeof data.userId === "string" ? data.userId : null,
    sessionId: typeof data.sessionId === "string" ? data.sessionId : null,
    anonymousVisitorId: typeof data.anonymousVisitorId === "string" ? data.anonymousVisitorId : null,
    entityType: typeof data.entityType === "string" ? data.entityType : undefined,
    entityId: typeof data.entityId === "string" ? data.entityId : undefined,
    message: typeof data.message === "string" ? data.message : "Debug evidence recorded",
    humanMessage: typeof data.humanMessage === "string" ? data.humanMessage : "Runtime diagnostic evidence was recorded.",
    technicalDetail: data.technicalDetail && typeof data.technicalDetail === "object"
      ? data.technicalDetail as Record<string, unknown>
      : {},
    fingerprint: typeof data.fingerprint === "string" ? data.fingerprint : id,
    status: data.status as DebugEvidenceRecord["status"] || "new",
    linkedReportId: typeof data.linkedReportId === "string" ? data.linkedReportId : null,
    linkedSupportThreadId: typeof data.linkedSupportThreadId === "string" ? data.linkedSupportThreadId : null,
    firstSeenAt: Number(data.firstSeenAt) || Number(data.createdAt) || Date.now(),
    lastSeenAt: Number(data.lastSeenAt) || Number(data.createdAt) || Date.now(),
    occurrenceCount: Math.max(1, Number(data.occurrenceCount) || 1),
  };
}

export async function recordDebugEvidence(input: DebugEvidenceInput) {
  if (!adminDb) {
    return null;
  }

  try {
    const fingerprint = input.fingerprint || undefined;
    const initialRecord = buildDebugEvidenceRecord({ ...input, fingerprint });
    const rollupRef = adminDb
      .collection(DEBUG_EVIDENCE_BUCKETS.rollups)
      .doc(initialRecord.fingerprint);
    const eventRef = adminDb
      .collection(DEBUG_EVIDENCE_BUCKETS.evidence)
      .doc(initialRecord.id);

    await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(rollupRef);
      const existing = snapshot.exists
        ? normalizeRecordFromDoc(snapshot.id, snapshot.data() as Record<string, unknown>)
        : null;
      const record = buildDebugEvidenceRecord(input, existing);

      transaction.set(eventRef, {
        ...record,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(rollupRef, {
        ...record,
        id: record.fingerprint,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return initialRecord.fingerprint;
  } catch (error) {
    console.warn("Debug evidence write failed:", error);
    return null;
  }
}

export async function listRecentDebugEvidence(options?: {
  limit?: number;
  categories?: DebugEvidenceCategory[];
  sinceMs?: number;
}): Promise<DebugEvidenceAuditSummary[]> {
  if (!adminDb) {
    return [];
  }

  const limitCount = Math.min(Math.max(options?.limit ?? 100, 1), 250);
  try {
    const snapshot = await adminDb
      .collection(DEBUG_EVIDENCE_BUCKETS.rollups)
      .orderBy("lastSeenAt", "desc")
      .limit(limitCount)
      .get();

    return snapshot.docs
      .map((doc) => normalizeRecordFromDoc(doc.id, doc.data() as Record<string, unknown>))
      .filter((record) => !options?.sinceMs || record.lastSeenAt >= options.sinceMs)
      .filter((record) => !options?.categories?.length || options.categories.includes(record.category))
      .map(redactDebugEvidenceForAudit);
  } catch (error) {
    console.warn("Debug evidence read failed:", error);
    return [];
  }
}
