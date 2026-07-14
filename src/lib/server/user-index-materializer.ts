import "server-only";

import { createHash, randomUUID } from "node:crypto";

import {
  BEHAVIORAL_TIMELINE_COLLECTION,
} from "@/lib/behavioral/behavioral-timeline-contract";
import {
  classifyAnalyticsIdentityLineageOwnerVersion,
  type AnalyticsIdentityLineageOwnerState,
} from "@/lib/analytics/identity-link-contract";
import { adminDb } from "@/lib/server/firebase-admin";
import {
  claimUserIndexMaterializerRequest,
  deriveUserIndexMaterializerWindowReceipt,
  enqueueUserIndexMaterializerRequests,
  failUserIndexMaterializerRequest,
  publishUserIndexMaterializerBundle,
  writeUserIndexMaterializerWindowReceipt,
} from "@/lib/server/user-index-writer";
import {
  buildGuestTrackingIndex,
  buildUserContentConsumptionIndex,
  buildUserEntityAffinityIndex,
  buildUserJourneyIndex,
  buildUserNotificationIndex,
  buildUserTrackingIndex,
  buildUserValueIndex,
  normalizeFactsForUserIndexMaterialization,
  type UserIndexMaterializerFact,
} from "@/lib/user-indexes/user-index-normalizer";
import {
  isUserIndexMaterializerActivationReady,
  parseUserIndexMaterializerMode,
  USER_INDEX_COLLECTIONS,
  USER_INDEX_MATERIALIZER_ACTIVATION_DOCUMENT_ID,
  USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
  USER_INDEX_MATERIALIZER_MAX_FACTS_PER_SUBJECT,
  USER_INDEX_MATERIALIZER_MAX_LINEAGES_PER_QUERY,
  USER_INDEX_MATERIALIZER_MAX_LINKED_GUEST_SUBJECTS,
  USER_INDEX_MATERIALIZER_MAX_REQUESTS_PER_RUN,
  USER_INDEX_MATERIALIZER_REQUEST_RETENTION_MS,
  USER_INDEX_MATERIALIZER_SUBJECT_TRUNCATED_ISSUE_CODE,
  USER_INDEX_MATERIALIZER_WINDOW_RETENTION_MS,
  type IdentityLineageIndex,
  type UserIndexMaterializerActivationState,
  type UserIndexMaterializerExclusionCounts,
  type UserIndexMaterializerMode,
  type UserIndexMaterializerOutboxRequest,
  type UserIndexMaterializerSubjectKind,
  type UserIndexMaterializerWindowReceipt,
  type UserIndexPublicationBundle,
} from "@/lib/user-indexes/user-tracking-index-contract";

const DEFAULT_SOURCE_WINDOW_MS = 1000 * 60 * 60 * 24 * 14;

export type UserIndexMaterializerOptions = {
  userIds?: string[];
  anonymousVisitorIds?: string[];
  maxUsers?: number;
  maxFacts?: number;
  runtimeCapMs?: number;
  dryRun?: boolean;
  sourceWindowStartMs?: number;
  sourceWindowEndMs?: number;
  requestedAtMs?: number;
  mode?: UserIndexMaterializerMode;
  sourceFingerprint?: string | null;
};

export type BuildUserIndexMaterializerRequestsInput = {
  userIds?: readonly string[];
  anonymousVisitorIds?: readonly string[];
  sourceFingerprint: string;
  sourceWindowStartMs: number;
  sourceWindowEndMs: number;
  requestedAtMs: number;
  maxFacts?: number;
  maxSubjects?: number;
};

export type ConsumeUserIndexMaterializerOptions = {
  mode?: UserIndexMaterializerMode;
  sourceFingerprint?: string | null;
  maxRequests?: number;
  maxFactsPerSubject?: number;
  runtimeCapMs?: number;
  leaseMs?: number;
  workerId?: string;
};

export function resolveUserIndexMaterializerConsumerLimits(
  options: Pick<ConsumeUserIndexMaterializerOptions, "maxRequests" | "maxFactsPerSubject" | "runtimeCapMs" | "leaseMs"> = {},
) {
  const maxRequests = normalizeBoundedInteger(
    options.maxRequests,
    USER_INDEX_MATERIALIZER_MAX_REQUESTS_PER_RUN,
    1,
    USER_INDEX_MATERIALIZER_MAX_REQUESTS_PER_RUN,
  );
  const maxFactsPerSubject = normalizeBoundedInteger(
    options.maxFactsPerSubject,
    USER_INDEX_MATERIALIZER_MAX_FACTS_PER_SUBJECT,
    1,
    USER_INDEX_MATERIALIZER_MAX_FACTS_PER_SUBJECT,
  );
  const runtimeCapMs = normalizeBoundedInteger(options.runtimeCapMs, 15_000, 1_000, 30_000);
  const leaseMs = normalizeBoundedInteger(options.leaseMs, Math.max(30_000, runtimeCapMs * 2), 1_000, 120_000);
  return { maxRequests, maxFactsPerSubject, runtimeCapMs, leaseMs };
}

export class UserIndexMaterializerConfigurationError extends Error {
  readonly retryable = false;

  constructor(readonly code: "source_fingerprint_missing" | "activation_gate_missing" | "request_batch_too_large") {
    super(code);
    this.name = "UserIndexMaterializerConfigurationError";
  }
}

function cleanIdentifier(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function normalizeBoundedInteger(value: unknown, fallback: number, minimum: number, maximum: number) {
  const numeric = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : fallback;
  return Math.max(minimum, Math.min(numeric, maximum));
}

export function resolveUserIndexMaterializerSourceFingerprint(
  env: Record<string, string | undefined> = process.env,
) {
  const raw = [
    env.USER_INDEX_SOURCE_FINGERPRINT,
    env.KANDYDROPS_SOURCE_FINGERPRINT,
    env.VERCEL_GIT_COMMIT_SHA,
    env.GITHUB_SHA,
    env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    env.NEXT_PUBLIC_COMMIT_SHA,
  ].map(cleanIdentifier).find(Boolean);
  if (!raw) return null;
  return raw.replace(/[^A-Za-z0-9._:@/-]+/gu, "_").slice(0, 160) || null;
}

export function resolveUserIndexMaterializerMode(
  env: Record<string, string | undefined> = process.env,
) {
  return parseUserIndexMaterializerMode(env.USER_INDEX_MATERIALIZER_MODE);
}

function buildRequestId(input: {
  subjectKind: UserIndexMaterializerSubjectKind;
  subjectId: string;
  sourceFingerprint: string;
}) {
  const digest = createHash("sha256")
    .update([
      USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
      input.sourceFingerprint,
      input.subjectKind,
      input.subjectId,
    ].join("\0"), "utf8")
    .digest("hex");
  return `user_index_${digest}`;
}

export function buildUserIndexMaterializerRequests(
  input: BuildUserIndexMaterializerRequestsInput,
): UserIndexMaterializerOutboxRequest[] {
  const maxSubjects = normalizeBoundedInteger(
    input.maxSubjects,
    USER_INDEX_MATERIALIZER_MAX_REQUESTS_PER_RUN,
    1,
    USER_INDEX_MATERIALIZER_MAX_REQUESTS_PER_RUN,
  );
  const maxFacts = normalizeBoundedInteger(
    input.maxFacts,
    USER_INDEX_MATERIALIZER_MAX_FACTS_PER_SUBJECT,
    1,
    USER_INDEX_MATERIALIZER_MAX_FACTS_PER_SUBJECT,
  );
  const sourceFingerprint = cleanIdentifier(input.sourceFingerprint);
  if (!sourceFingerprint) throw new UserIndexMaterializerConfigurationError("source_fingerprint_missing");
  const sourceWindowStartMs = Math.min(input.sourceWindowStartMs, input.sourceWindowEndMs);
  const sourceWindowEndMs = Math.max(input.sourceWindowStartMs, input.sourceWindowEndMs);
  const subjects = [
    ...Array.from(new Set((input.userIds ?? []).map(cleanIdentifier).filter(Boolean)))
      .map((subjectId) => ({ subjectKind: "user" as const, subjectId })),
    ...Array.from(new Set((input.anonymousVisitorIds ?? []).map(cleanIdentifier).filter(Boolean)))
      .map((subjectId) => ({ subjectKind: "guest" as const, subjectId })),
  ].sort((left, right) =>
    left.subjectKind.localeCompare(right.subjectKind) || left.subjectId.localeCompare(right.subjectId),
  ).slice(0, maxSubjects);

  return subjects.map((subject) => ({
    requestId: buildRequestId({ ...subject, sourceFingerprint }),
    ...subject,
    sourceFingerprint,
    materializerVersion: USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
    sourceWindowStartMs,
    sourceWindowEndMs,
    maxFacts,
    state: "queued",
    attemptCount: 0,
    nextAttemptAtMs: input.requestedAtMs,
    leaseOwner: null,
    leaseExpiresAtMs: null,
    pendingSourceWindowStartMs: null,
    pendingSourceWindowEndMs: null,
    processedThroughMs: null,
    lastSafeErrorCode: null,
    createdAtMs: input.requestedAtMs,
    updatedAtMs: input.requestedAtMs,
    completedAtMs: null,
    expiresAtMs: input.requestedAtMs + USER_INDEX_MATERIALIZER_REQUEST_RETENTION_MS,
  }));
}

export async function materializeUserTrackingIndexes(options: UserIndexMaterializerOptions = {}) {
  const mode = options.mode ?? resolveUserIndexMaterializerMode();
  const requestedAtMs = options.requestedAtMs ?? Date.now();
  const sourceWindowEndMs = options.sourceWindowEndMs ?? requestedAtMs;
  const sourceWindowStartMs = options.sourceWindowStartMs ?? (sourceWindowEndMs - DEFAULT_SOURCE_WINDOW_MS);
  if (mode === "off") {
    return {
      mode,
      status: "off" as const,
      dryRun: Boolean(options.dryRun),
      requestsBuilt: 0,
      requestsEnqueued: 0,
      usersQueued: 0,
      guestsQueued: 0,
      usersProcessed: 0,
      guestsProcessed: 0,
      factsProcessed: 0,
      issueCodes: ["materializer_off"],
    };
  }
  const sourceFingerprint = options.sourceFingerprint ?? resolveUserIndexMaterializerSourceFingerprint();
  if (!sourceFingerprint) throw new UserIndexMaterializerConfigurationError("source_fingerprint_missing");
  const requests = buildUserIndexMaterializerRequests({
    userIds: options.userIds,
    anonymousVisitorIds: options.anonymousVisitorIds,
    sourceFingerprint,
    sourceWindowStartMs,
    sourceWindowEndMs,
    requestedAtMs,
    maxFacts: options.maxFacts,
    maxSubjects: options.maxUsers,
  });
  const usersQueued = requests.filter((request) => request.subjectKind === "user").length;
  const guestsQueued = requests.filter((request) => request.subjectKind === "guest").length;
  if (options.dryRun) {
    return {
      mode,
      status: "dry_run" as const,
      dryRun: true,
      requestsBuilt: requests.length,
      requestsEnqueued: 0,
      usersQueued,
      guestsQueued,
      usersProcessed: 0,
      guestsProcessed: 0,
      factsProcessed: 0,
      issueCodes: requests.length === 0 ? ["materializer_subject_missing"] : [],
    };
  }
  const enqueue = await enqueueUserIndexMaterializerRequests(requests);
  return {
    mode,
    status: requests.length > 0 ? "queued" as const : "subject_missing" as const,
    dryRun: false,
    requestsBuilt: requests.length,
    requestsEnqueued: enqueue.created + enqueue.requeued,
    requestsCoalesced: enqueue.coalesced,
    usersQueued,
    guestsQueued,
    usersProcessed: 0,
    guestsProcessed: 0,
    factsProcessed: 0,
    issueCodes: requests.length === 0 ? ["materializer_subject_missing"] : [],
  };
}

function requireMaterializerDatabase() {
  if (!adminDb) throw new Error("user_index_materializer_database_unavailable");
  return adminDb;
}

async function querySubjectFacts(input: {
  field: "actorUserId" | "anonymousVisitorId";
  subjectId: string;
  sourceWindowStartMs: number;
  sourceWindowEndMs: number;
  limit: number;
}) {
  if (input.limit <= 0) return [];
  const db = requireMaterializerDatabase();
  const snapshot = await db.collection(BEHAVIORAL_TIMELINE_COLLECTION)
    .where(input.field, "==", input.subjectId)
    .where("timestampMs", ">=", input.sourceWindowStartMs)
    .where("timestampMs", "<=", input.sourceWindowEndMs)
    .orderBy("timestampMs", "desc")
    .limit(input.limit)
    .get();
  return snapshot.docs.map((document) => document.data() as UserIndexMaterializerFact);
}

async function queryLineagesByGuestIds(anonymousVisitorIds: readonly string[]) {
  const db = requireMaterializerDatabase();
  const ids = Array.from(new Set(anonymousVisitorIds.map(cleanIdentifier).filter(Boolean))).sort();
  const lineages: IdentityLineageIndex[] = [];
  for (let start = 0; start < ids.length && lineages.length < USER_INDEX_MATERIALIZER_MAX_LINEAGES_PER_QUERY; start += 30) {
    const chunk = ids.slice(start, start + 30);
    const remaining = USER_INDEX_MATERIALIZER_MAX_LINEAGES_PER_QUERY - lineages.length;
    const snapshot = await db.collection(USER_INDEX_COLLECTIONS.identityLineageIndexes)
      .where("anonymousVisitorId", "in", chunk)
      .limit(remaining)
      .get();
    lineages.push(...snapshot.docs.map((document) => document.data() as IdentityLineageIndex));
  }
  return partitionIdentityLineagesByOwnerVersion(lineages).accepted;
}

async function queryLineagesForUser(userId: string) {
  const db = requireMaterializerDatabase();
  const snapshot = await db.collection(USER_INDEX_COLLECTIONS.identityLineageIndexes)
    .where("userId", "==", userId)
    .limit(USER_INDEX_MATERIALIZER_MAX_LINKED_GUEST_SUBJECTS)
    .get();
  return partitionIdentityLineagesByOwnerVersion(
    snapshot.docs.map((document) => document.data() as IdentityLineageIndex),
  ).accepted;
}

export function partitionIdentityLineagesByOwnerVersion(
  lineages: readonly IdentityLineageIndex[],
) {
  const accepted: IdentityLineageIndex[] = [];
  const rejected: Array<{
    lineage: IdentityLineageIndex;
    state: Exclude<AnalyticsIdentityLineageOwnerState, "current">;
  }> = [];
  for (const lineage of lineages) {
    const state = classifyAnalyticsIdentityLineageOwnerVersion(lineage.ownerKeyVersion);
    if (state === "current") accepted.push(lineage);
    else rejected.push({ lineage, state });
  }
  return { accepted, rejected };
}

function mergeLineages(...groups: IdentityLineageIndex[][]) {
  const merged = new Map<string, IdentityLineageIndex>();
  const { accepted } = partitionIdentityLineagesByOwnerVersion(groups.flat());
  for (const lineage of accepted) {
    const key = cleanIdentifier(lineage.identityLinkId)
      || `${cleanIdentifier(lineage.anonymousVisitorId)}:${cleanIdentifier(lineage.userId)}`;
    if (key) merged.set(key, lineage);
  }
  return Array.from(merged.values());
}

function resolveEligibleLinkedGuestIds(lineages: readonly IdentityLineageIndex[], userId: string) {
  const ownersByGuest = new Map<string, Set<string>>();
  const allowedByGuest = new Map<string, boolean>();
  const { accepted } = partitionIdentityLineagesByOwnerVersion(lineages);
  for (const lineage of accepted) {
    const guestId = cleanIdentifier(lineage.anonymousVisitorId);
    const ownerId = cleanIdentifier(lineage.userId);
    if (!guestId || !ownerId) continue;
    const owners = ownersByGuest.get(guestId) ?? new Set<string>();
    owners.add(ownerId);
    ownersByGuest.set(guestId, owners);
    const recordAllowed = lineage.mergeAllowed === true
      && lineage.personLevelBehaviorAllowed === true
      && lineage.consentState === "granted"
      && lineage.consentMode === "full_behavioral"
      && lineage.linkageConfidenceSource === "full_behavioral_consent"
      && lineage.sessionIds.some((sessionId) => Boolean(cleanIdentifier(sessionId)));
    allowedByGuest.set(guestId, (allowedByGuest.get(guestId) ?? true) && recordAllowed);
  }
  return Array.from(ownersByGuest.entries())
    .filter(([guestId, owners]) => owners.size === 1 && owners.has(userId) && allowedByGuest.get(guestId) === true)
    .map(([guestId]) => guestId)
    .sort()
    .slice(0, USER_INDEX_MATERIALIZER_MAX_LINKED_GUEST_SUBJECTS);
}

async function loadFactsForRequest(
  request: UserIndexMaterializerOutboxRequest,
  maxFactsPerSubject: number,
) {
  const maxFacts = Math.min(request.maxFacts, maxFactsPerSubject, USER_INDEX_MATERIALIZER_MAX_FACTS_PER_SUBJECT);
  if (request.subjectKind === "guest") {
    const facts = await querySubjectFacts({
      field: "anonymousVisitorId",
      subjectId: request.subjectId,
      sourceWindowStartMs: request.sourceWindowStartMs,
      sourceWindowEndMs: request.sourceWindowEndMs,
      limit: maxFacts,
    });
    const lineages = await queryLineagesByGuestIds([request.subjectId]);
    return { facts, lineages, truncated: facts.length >= maxFacts };
  }

  const directFacts = await querySubjectFacts({
    field: "actorUserId",
    subjectId: request.subjectId,
    sourceWindowStartMs: request.sourceWindowStartMs,
    sourceWindowEndMs: request.sourceWindowEndMs,
    limit: maxFacts,
  });
  const directGuestIds = directFacts.map((fact) => cleanIdentifier(fact.anonymousVisitorId)).filter(Boolean);
  const [userLineages, directFactLineages] = await Promise.all([
    queryLineagesForUser(request.subjectId),
    queryLineagesByGuestIds(directGuestIds),
  ]);
  const userGuestIds = userLineages.map((lineage) => cleanIdentifier(lineage.anonymousVisitorId)).filter(Boolean);
  const allGuestLineages = userGuestIds.length > 0
    ? await queryLineagesByGuestIds(userGuestIds)
    : [];
  const lineages = mergeLineages(userLineages, directFactLineages, allGuestLineages);
  const linkedGuestIds = resolveEligibleLinkedGuestIds(lineages, request.subjectId);
  const facts = [...directFacts];
  for (const guestId of linkedGuestIds) {
    const remaining = maxFacts - facts.length;
    if (remaining <= 0) break;
    facts.push(...await querySubjectFacts({
      field: "anonymousVisitorId",
      subjectId: guestId,
      sourceWindowStartMs: request.sourceWindowStartMs,
      sourceWindowEndMs: request.sourceWindowEndMs,
      limit: remaining,
    }));
  }
  facts.sort((left, right) => right.timestampMs - left.timestampMs || left.factId.localeCompare(right.factId));
  return { facts: facts.slice(0, maxFacts), lineages, truncated: facts.length >= maxFacts };
}

function buildPublicationBundle(input: {
  request: UserIndexMaterializerOutboxRequest;
  facts: UserIndexMaterializerFact[];
  lineages: IdentityLineageIndex[];
}) {
  const normalized = normalizeFactsForUserIndexMaterialization({
    facts: input.facts,
    lineages: input.lineages,
  });
  if (input.request.subjectKind === "guest") {
    const guestFacts = normalized.globalFacts.filter((fact) =>
      cleanIdentifier(fact.anonymousVisitorId) === input.request.subjectId
      && !cleanIdentifier(fact.actorUserId));
    const identityLinkId = input.lineages.length === 1 ? input.lineages[0].identityLinkId : undefined;
    const bundle: UserIndexPublicationBundle = {
      subjectKind: "guest",
      subjectId: input.request.subjectId,
      guestTrackingIndex: buildGuestTrackingIndex({
        anonymousVisitorId: input.request.subjectId,
        facts: guestFacts,
        sourceWindowStartMs: input.request.sourceWindowStartMs,
        sourceWindowEndMs: input.request.sourceWindowEndMs,
      }),
      journeyIndex: buildUserJourneyIndex({
        anonymousVisitorId: input.request.subjectId,
        identityLinkId,
        facts: guestFacts,
      }),
    };
    return { bundle, normalized, factsPublished: guestFacts.length };
  }

  const personFacts = normalized.personFacts.filter((fact) => fact.actorUserId === input.request.subjectId);
  const identityLinkId = input.lineages.find((lineage) => lineage.userId === input.request.subjectId)?.identityLinkId;
  const trackingIndex = buildUserTrackingIndex({
    userId: input.request.subjectId,
    facts: personFacts,
    sourceWindowStartMs: input.request.sourceWindowStartMs,
    sourceWindowEndMs: input.request.sourceWindowEndMs,
  });
  if (normalized.exclusions.identityConflictExcludedCount > 0) {
    trackingIndex.issues = Array.from(new Set([...trackingIndex.issues, "identity_link_conflict"])).slice(0, 20);
  }
  const bundle: UserIndexPublicationBundle = {
    subjectKind: "user",
    subjectId: input.request.subjectId,
    trackingIndex,
    entityAffinityIndex: buildUserEntityAffinityIndex(input.request.subjectId, personFacts),
    valueIndex: buildUserValueIndex(input.request.subjectId, personFacts),
    journeyIndex: buildUserJourneyIndex({
      userId: input.request.subjectId,
      identityLinkId,
      facts: personFacts,
    }),
    notificationIndex: buildUserNotificationIndex(input.request.subjectId, personFacts),
    contentConsumptionIndex: buildUserContentConsumptionIndex(input.request.subjectId, personFacts),
  };
  return { bundle, normalized, factsPublished: personFacts.length };
}

function addExclusions(
  target: UserIndexMaterializerExclusionCounts,
  source: UserIndexMaterializerExclusionCounts,
) {
  target.exactReplayExcludedCount += source.exactReplayExcludedCount;
  target.linkedCopyExcludedCount += source.linkedCopyExcludedCount;
  target.identityConflictExcludedCount += source.identityConflictExcludedCount;
  target.lineageBlockedCount += source.lineageBlockedCount;
  target.adminExcludedCount += source.adminExcludedCount;
  target.systemExcludedCount += source.systemExcludedCount;
}

function safeMaterializerErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes(USER_INDEX_MATERIALIZER_SUBJECT_TRUNCATED_ISSUE_CODE)) {
    return USER_INDEX_MATERIALIZER_SUBJECT_TRUNCATED_ISSUE_CODE;
  }
  if (message.includes("activation_gate")) return "activation_gate_missing";
  if (message.includes("permission") || message.includes("unauthorized")) return "permission_blocked";
  if (message.includes("deadline") || message.includes("timeout")) return "dependency_timeout";
  if (message.includes("database_unavailable")) return "database_unavailable";
  return "materializer_failed";
}

async function readActivationState() {
  const db = requireMaterializerDatabase();
  const snapshot = await db.collection(USER_INDEX_COLLECTIONS.userIndexMaterializerState)
    .doc(USER_INDEX_MATERIALIZER_ACTIVATION_DOCUMENT_ID)
    .get();
  return snapshot.exists ? snapshot.data() as UserIndexMaterializerActivationState : null;
}

function buildWindowId(input: {
  sourceFingerprint: string;
  mode: "shadow" | "active";
  workerId: string;
  startedAtMs: number;
  completedAtMs: number;
}) {
  const digest = createHash("sha256")
    .update([
      input.sourceFingerprint,
      input.mode,
      input.workerId,
      input.startedAtMs,
      input.completedAtMs,
    ].join("\0"), "utf8")
    .digest("hex")
    .slice(0, 32);
  return `user_index_window_${digest}`;
}

export async function consumeUserIndexMaterializerOutbox(
  options: ConsumeUserIndexMaterializerOptions = {},
) {
  const mode = options.mode ?? resolveUserIndexMaterializerMode();
  if (mode === "off") {
    return {
      status: "off" as const,
      mode,
      receipt: null,
      issueCodes: ["materializer_off"],
    };
  }
  const sourceFingerprint = options.sourceFingerprint ?? resolveUserIndexMaterializerSourceFingerprint();
  if (!sourceFingerprint) throw new UserIndexMaterializerConfigurationError("source_fingerprint_missing");
  if (mode === "active") {
    const activationState = await readActivationState();
    if (!isUserIndexMaterializerActivationReady({ state: activationState, sourceFingerprint })) {
      throw new UserIndexMaterializerConfigurationError("activation_gate_missing");
    }
  }

  const db = requireMaterializerDatabase();
  const { maxRequests, maxFactsPerSubject, runtimeCapMs, leaseMs } = resolveUserIndexMaterializerConsumerLimits(options);
  const workerId = cleanIdentifier(options.workerId) || randomUUID();
  const startedAtMs = Date.now();
  const candidateSnapshot = await db.collection(USER_INDEX_COLLECTIONS.userIndexMaterializerRequests)
    .orderBy("nextAttemptAtMs", "asc")
    .limit(maxRequests)
    .get();
  const requestIds = candidateSnapshot.docs.map((document) => document.id);
  const exclusions: UserIndexMaterializerExclusionCounts = {
    exactReplayExcludedCount: 0,
    linkedCopyExcludedCount: 0,
    identityConflictExcludedCount: 0,
    lineageBlockedCount: 0,
    adminExcludedCount: 0,
    systemExcludedCount: 0,
  };
  let requestsClaimed = 0;
  let requestsCompleted = 0;
  let requestsFailed = 0;
  let leaseLostCount = 0;
  let factsRead = 0;
  let factsPublished = 0;
  let truncatedSubjectCount = 0;
  let runtimeCapReached = false;

  for (const requestId of requestIds) {
    if (requestsClaimed >= maxRequests) break;
    if (Date.now() - startedAtMs >= runtimeCapMs) {
      runtimeCapReached = true;
      break;
    }
    const nowMs = Date.now();
    const request = await claimUserIndexMaterializerRequest({
      requestId,
      workerId,
      sourceFingerprint,
      nowMs,
      leaseMs,
    });
    if (!request) continue;
    requestsClaimed += 1;
    try {
      const loaded = await loadFactsForRequest(request, maxFactsPerSubject);
      factsRead += loaded.facts.length;
      if (loaded.truncated) truncatedSubjectCount += 1;
      const publication = buildPublicationBundle({
        request,
        facts: loaded.facts,
        lineages: loaded.lineages,
      });
      const published = await publishUserIndexMaterializerBundle({
        request,
        workerId,
        mode,
        factsRead: loaded.facts.length,
        factsPublished: publication.factsPublished,
        isPotentiallyTruncated: loaded.truncated,
        exclusions: publication.normalized.exclusions,
        bundle: publication.bundle,
      });
      if (!published) {
        leaseLostCount += 1;
        continue;
      }
      requestsCompleted += 1;
      factsPublished += publication.factsPublished;
      addExclusions(exclusions, publication.normalized.exclusions);
    } catch (error) {
      requestsFailed += 1;
      await failUserIndexMaterializerRequest({
        requestId,
        workerId,
        nowMs: Date.now(),
        safeErrorCode: safeMaterializerErrorCode(error),
      }).catch(() => undefined);
    }
  }

  const completedAtMs = Date.now();
  if (completedAtMs - startedAtMs >= runtimeCapMs && requestsCompleted < requestIds.length) {
    runtimeCapReached = true;
  }
  if (requestsClaimed === 0) {
    return {
      status: "no_work" as const,
      mode,
      receipt: null,
      issueCodes: [],
    };
  }
  const receipt = deriveUserIndexMaterializerWindowReceipt({
    windowId: buildWindowId({ sourceFingerprint, mode, workerId, startedAtMs, completedAtMs }),
    mode,
    sourceFingerprint,
    materializerVersion: USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
    startedAtMs,
    completedAtMs,
    requestsClaimed,
    requestsCompleted,
    requestsFailed,
    leaseLostCount,
    factsRead,
    factsPublished,
    exclusions,
    truncatedSubjectCount,
    runtimeCapReached,
    clean: false,
    expiresAtMs: completedAtMs + USER_INDEX_MATERIALIZER_WINDOW_RETENTION_MS,
  } satisfies UserIndexMaterializerWindowReceipt);
  await writeUserIndexMaterializerWindowReceipt(receipt);
  return {
    status: receipt.clean ? "completed" as const : "completed_with_issues" as const,
    mode,
    receipt,
    issueCodes: [
      requestsFailed > 0 ? "materializer_request_failed" : "",
      leaseLostCount > 0 ? "materializer_lease_lost" : "",
      runtimeCapReached ? "runtime_cap_reached" : "",
      truncatedSubjectCount > 0 ? USER_INDEX_MATERIALIZER_SUBJECT_TRUNCATED_ISSUE_CODE : "",
    ].filter(Boolean),
  };
}
