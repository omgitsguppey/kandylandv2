import "server-only";

import { adminDb } from "@/lib/server/firebase-admin";
import {
  BEHAVIORAL_TIMELINE_COLLECTION,
  type BehavioralTimelineFact,
} from "@/lib/behavioral/behavioral-timeline-contract";
import {
  buildUserIndexMaterializerRequests,
  resolveUserIndexMaterializerMode,
  resolveUserIndexMaterializerSourceFingerprint,
  UserIndexMaterializerConfigurationError,
} from "@/lib/server/user-index-materializer";
import {
  coalesceUserIndexMaterializerOutboxRequest,
  withUserIndexMaterializerExpiration,
} from "@/lib/server/user-index-writer";
import {
  USER_INDEX_COLLECTIONS,
  USER_INDEX_MATERIALIZER_MAX_FACTS_PER_SUBJECT,
  USER_INDEX_MATERIALIZER_MAX_REQUESTS_PER_RUN,
  type UserIndexMaterializerOutboxRequest,
} from "@/lib/user-indexes/user-tracking-index-contract";

const MAX_TIMELINE_FACTS_PER_BATCH = 120;

export type BehavioralTimelineProjectionInput = {
  facts: BehavioralTimelineFact[];
  userIds?: readonly string[];
  anonymousVisitorIds?: readonly string[];
  requestedAtMs: number;
  sourceWindowStartMs?: number;
  sourceWindowEndMs?: number;
  maxFacts?: number;
};

export type BehavioralTimelineProjectionResult = {
  written: number;
  skipped: number;
  reason: "ok" | "batch_capped" | "no_facts";
  materializer: {
    mode: ReturnType<typeof resolveUserIndexMaterializerMode>;
    status: "off" | "queued" | "subject_missing";
    requestsBuilt: number;
    requestsEnqueued: number;
    requestsCoalesced: number;
    usersQueued: number;
    guestsQueued: number;
    issueCodes: string[];
  };
};

function buildProjectionRequests(input: BehavioralTimelineProjectionInput) {
  const mode = resolveUserIndexMaterializerMode();
  if (mode === "off") {
    return { mode, requests: [] as UserIndexMaterializerOutboxRequest[] };
  }

  const sourceFingerprint = resolveUserIndexMaterializerSourceFingerprint();
  if (!sourceFingerprint) {
    throw new UserIndexMaterializerConfigurationError("source_fingerprint_missing");
  }

  const sourceWindowEndMs = input.sourceWindowEndMs ?? input.requestedAtMs;
  const sourceWindowStartMs = input.sourceWindowStartMs
    ?? sourceWindowEndMs - (1000 * 60 * 60 * 24 * 14);
  const requests = buildUserIndexMaterializerRequests({
    userIds: input.userIds ? [...input.userIds] : undefined,
    anonymousVisitorIds: input.anonymousVisitorIds ? [...input.anonymousVisitorIds] : undefined,
    sourceFingerprint,
    sourceWindowStartMs,
    sourceWindowEndMs,
    requestedAtMs: input.requestedAtMs,
    maxFacts: Math.min(
      input.maxFacts ?? USER_INDEX_MATERIALIZER_MAX_FACTS_PER_SUBJECT,
      USER_INDEX_MATERIALIZER_MAX_FACTS_PER_SUBJECT,
    ),
    maxSubjects: USER_INDEX_MATERIALIZER_MAX_REQUESTS_PER_RUN,
  });
  return { mode, requests };
}

/**
 * Persists the canonical timeline projection and its deterministic materializer
 * request in one Firestore transaction. Ingest routes can safely retry this
 * owner after their durable source marker is committed: timeline writes are
 * idempotent by factId and outbox requests coalesce by requestId.
 */
export async function writeBehavioralTimelineProjection(
  input: BehavioralTimelineProjectionInput,
): Promise<BehavioralTimelineProjectionResult> {
  if (!adminDb) {
    throw new Error("behavioral_timeline_database_unavailable");
  }

  const trimmedFacts = input.facts.slice(0, MAX_TIMELINE_FACTS_PER_BATCH);
  const { mode, requests } = buildProjectionRequests(input);
  if (requests.length > USER_INDEX_MATERIALIZER_MAX_REQUESTS_PER_RUN) {
    throw new UserIndexMaterializerConfigurationError("request_batch_too_large");
  }
  const usersQueued = requests.filter((request) => request.subjectKind === "user").length;
  const guestsQueued = requests.filter((request) => request.subjectKind === "guest").length;

  if (trimmedFacts.length === 0) {
    return {
      written: 0,
      skipped: 0,
      reason: "no_facts",
      materializer: {
        mode,
        status: mode === "off" ? "off" : "subject_missing",
        requestsBuilt: 0,
        requestsEnqueued: 0,
        requestsCoalesced: 0,
        usersQueued: 0,
        guestsQueued: 0,
        issueCodes: mode === "off" ? ["materializer_off"] : ["materializer_subject_missing"],
      },
    };
  }

  const result = await adminDb.runTransaction(async (transaction) => {
    const requestRefs = requests.map((request) =>
      adminDb.collection(USER_INDEX_COLLECTIONS.userIndexMaterializerRequests).doc(request.requestId));
    // Firestore requires every transaction read to occur before its writes.
    const requestSnapshots = [];
    for (const requestRef of requestRefs.slice(0, USER_INDEX_MATERIALIZER_MAX_REQUESTS_PER_RUN)) {
      requestSnapshots.push(await transaction.get(requestRef));
    }
    let created = 0;
    let requeued = 0;
    let coalesced = 0;

    for (const fact of trimmedFacts) {
      const factRef = adminDb.collection(BEHAVIORAL_TIMELINE_COLLECTION).doc(fact.factId);
      transaction.set(factRef, fact, { merge: true });
    }

    requestSnapshots.forEach((snapshot, index) => {
      const request = requests[index];
      const ref = requestRefs[index];
      if (!snapshot.exists) {
        transaction.create(ref, withUserIndexMaterializerExpiration(request));
        created += 1;
        return;
      }
      const next = coalesceUserIndexMaterializerOutboxRequest(
        snapshot.data() as UserIndexMaterializerOutboxRequest,
        request,
      );
      transaction.set(ref, withUserIndexMaterializerExpiration(next.request), { merge: true });
      if (next.requeued) requeued += 1;
      else coalesced += 1;
    });

    return { created, requeued, coalesced };
  });

  return {
    written: trimmedFacts.length,
    skipped: Math.max(0, input.facts.length - trimmedFacts.length),
    reason: trimmedFacts.length < input.facts.length ? "batch_capped" : "ok",
    materializer: {
      mode,
      status: mode === "off" ? "off" : requests.length > 0 ? "queued" : "subject_missing",
      requestsBuilt: requests.length,
      requestsEnqueued: result.created + result.requeued,
      requestsCoalesced: result.coalesced,
      usersQueued,
      guestsQueued,
      issueCodes: mode === "off"
        ? ["materializer_off"]
        : requests.length === 0
          ? ["materializer_subject_missing"]
          : [],
    },
  };
}
