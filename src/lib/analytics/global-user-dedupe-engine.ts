import type { IdentityConfidence, IdentityState } from "@/lib/analytics/identity-handoff-contract";
import {
  inferCountDomain,
  normalizeCountInput,
} from "@/lib/math/count-deduplication-normalizer";

import type {
  AggregationCountDecision,
  DuplicateRisk,
  GlobalUserDedupeDebugLane,
  GlobalUserDedupeDecision,
  GlobalUserDedupeInput,
  GlobalUserDedupeScope,
  ReplaySafetyPolicy,
} from "./global-user-dedupe-contract";

const CONFIDENCE_RANK: Record<IdentityConfidence, number> = {
  unknown: 0,
  weak: 1,
  inferred: 2,
  linked: 3,
  exact: 4,
};

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function sanitizeKey(value: unknown) {
  return (cleanString(value) || "unknown").replace(/[^A-Za-z0-9:_-]+/gu, "_").slice(0, 120);
}

function normalizeConfidence(value: unknown): IdentityConfidence {
  const candidate = cleanString(value) as IdentityConfidence;
  return candidate in CONFIDENCE_RANK ? candidate : "unknown";
}

function normalizeIdentityState(value: unknown): IdentityState | "unknown" {
  const candidate = cleanString(value) as IdentityState;
  return candidate || "unknown";
}

function baseActionKey(input: GlobalUserDedupeInput) {
  return sanitizeKey(input.idempotencyKey || input.eventId);
}

function isReplay(input: GlobalUserDedupeInput) {
  return Boolean(cleanString(input.replayOfEventId))
    || (typeof input.retryAttempt === "number" && input.retryAttempt > 0);
}

function isUnknownLegacy(input: GlobalUserDedupeInput) {
  return input.legacyUnknown === true
    || normalizeIdentityState(input.identityState) === "legacy_unknown"
    || normalizeConfidence(input.identityConfidence) === "unknown" && cleanString(input.userId).startsWith("legacy_");
}

function hasUsableIdentity(input: GlobalUserDedupeInput) {
  return Boolean(cleanString(input.userId) || cleanString(input.guestId) || cleanString(input.sessionId));
}

function linkedUserWins(input: GlobalUserDedupeInput) {
  return Boolean(cleanString(input.userId) && cleanString(input.guestId) && (cleanString(input.linkId) || cleanString(input.linkedPersonId)))
    || normalizeIdentityState(input.identityState) === "logged_in_linked_guest";
}

function replaySafety(input: GlobalUserDedupeInput): ReplaySafetyPolicy {
  if (cleanString(input.idempotencyKey)) return "idempotency_key_required";
  if (cleanString(input.eventId)) return "event_id_or_idempotency_key";
  return "unsafe_missing_key";
}

function confidenceAtLeast(actual: IdentityConfidence, expected: IdentityConfidence) {
  return CONFIDENCE_RANK[actual] >= CONFIDENCE_RANK[expected];
}

export function buildGlobalDedupeKey(input: GlobalUserDedupeInput) {
  return [
    "global",
    sanitizeKey(input.eventName),
    sanitizeKey(input.featureId || input.surface || "unknown_surface"),
    baseActionKey(input),
  ].join(":");
}

export function buildUserDedupeKey(input: GlobalUserDedupeInput) {
  const userKey = cleanString(input.userId)
    ? `user:${sanitizeKey(input.userId)}`
    : cleanString(input.guestId)
      ? `guest:${sanitizeKey(input.guestId)}`
      : `session:${sanitizeKey(input.sessionId)}`;
  return [userKey, sanitizeKey(input.eventName), baseActionKey(input)].join(":");
}

export function buildLinkedPersonDedupeKey(input: GlobalUserDedupeInput) {
  const personKey = cleanString(input.linkedPersonId)
    ? `person:${sanitizeKey(input.linkedPersonId)}`
    : cleanString(input.linkId)
      ? `link:${sanitizeKey(input.linkId)}`
      : cleanString(input.userId)
        ? `user:${sanitizeKey(input.userId)}`
        : `guest:${sanitizeKey(input.guestId)}`;
  return [personKey, sanitizeKey(input.eventName), baseActionKey(input)].join(":");
}

export function shouldCountGlobal(input: GlobalUserDedupeInput) {
  return !isReplay(input) && !isUnknownLegacy(input) && hasUsableIdentity(input);
}

export function shouldCountUser(input: GlobalUserDedupeInput) {
  const confidence = normalizeConfidence(input.identityConfidence);
  return !isReplay(input)
    && !isUnknownLegacy(input)
    && Boolean(cleanString(input.userId))
    && confidenceAtLeast(confidence, linkedUserWins(input) ? "linked" : "exact");
}

export function shouldCountSql(input: GlobalUserDedupeInput) {
  return Boolean(cleanString(input.eventId) || cleanString(input.idempotencyKey));
}

export function classifyDuplicateRisk(input: GlobalUserDedupeInput | GlobalUserDedupeDecision): DuplicateRisk {
  const candidate = "input" in input ? input.input : input;
  if (isReplay(candidate)) return "retry_replay_suppressed";
  if (isUnknownLegacy(candidate)) return "unknown_legacy_archived";
  if (!hasUsableIdentity(candidate)) return "missing_identity_context";
  if (linkedUserWins(candidate)) return "linked_guest_user_duplicate_risk_suppressed";
  if (cleanString(candidate.userId) && !confidenceAtLeast(normalizeConfidence(candidate.identityConfidence), "linked")) {
    return "identity_confidence_too_low";
  }
  return "none";
}

function decision(input: {
  count: boolean;
  policy: string;
  dedupeKey: string;
  reason: AggregationCountDecision["reason"];
}): AggregationCountDecision {
  return input;
}

function resolveScope(input: GlobalUserDedupeInput): GlobalUserDedupeScope {
  return input.dedupeScope ?? "event";
}

export function normalizeGlobalUserMetric(input: GlobalUserDedupeInput): GlobalUserDedupeDecision {
  const identityConfidence = normalizeConfidence(input.identityConfidence);
  const duplicateRisk = classifyDuplicateRisk(input);
  const replay = duplicateRisk === "retry_replay_suppressed";
  const legacy = duplicateRisk === "unknown_legacy_archived";
  const missingIdentity = duplicateRisk === "missing_identity_context";
  const linked = duplicateRisk === "linked_guest_user_duplicate_risk_suppressed";
  const userKey = buildUserDedupeKey(input);
  const linkedKey = buildLinkedPersonDedupeKey(input);
  const sqlKey = ["export", sanitizeKey(input.eventName), baseActionKey(input)].join(":");
  const countDedupeMath = normalizeCountInput({
    domain: inferCountDomain({
      eventName: input.eventName,
      featureId: input.featureId,
      surface: input.surface,
    }),
    eventName: input.eventName,
    eventId: input.eventId,
    dedupeKey: input.idempotencyKey,
    sessionId: input.sessionId,
    objectId: input.objectId || input.featureId || input.surface,
    timestampMs: input.timestampMs,
    timestampBucketMs: input.timestampBucketMs,
    userId: input.userId,
    guestId: input.guestId,
    linkedPersonId: input.linkedPersonId,
    linkId: input.linkId,
    identityConfidence,
    legacy: legacy,
    retryAttempt: input.retryAttempt,
    replayOfEventId: input.replayOfEventId,
    metricIsReplay: false,
    sourceTruth: "global_user_dedupe_engine",
  });
  const canonicalGlobalKey = countDedupeMath.globalKey;
  const canonicalUserKey = countDedupeMath.userKey ?? userKey;
  const canonicalLinkedKey = linked ? canonicalUserKey : linkedKey;

  const reason: AggregationCountDecision["reason"] = replay
    ? "retry_replay_not_counted"
    : legacy
      ? "unknown_legacy_archived"
      : missingIdentity
        ? "missing_identity_context"
        : linked
          ? "linked_guest_attributed_to_user"
          : confidenceAtLeast(identityConfidence, "linked")
            ? "count_unique_action_once"
            : "identity_confidence_too_low";
  const globalCount = shouldCountGlobal(input);
  const userCount = shouldCountUser(input);
  const guestCount = !globalCount
    ? false
    : Boolean(cleanString(input.guestId)) && !linked && !cleanString(input.userId);
  const linkedPersonCount = !replay && !legacy && linked && userCount;

  const output: GlobalUserDedupeDecision = {
    input,
    dedupeScope: resolveScope(input),
    dedupeKey: canonicalGlobalKey,
    global: decision({
      count: globalCount,
      policy: legacy ? "archive_only" : "count_once",
      dedupeKey: canonicalGlobalKey,
      reason,
    }),
    guest: decision({
      count: guestCount,
      policy: "linked_user_wins",
      dedupeKey: cleanString(input.guestId) ? `guest:${sanitizeKey(input.guestId)}:${baseActionKey(input)}` : userKey,
      reason,
    }),
    user: decision({
      count: userCount,
      policy: "best_identity_wins",
      dedupeKey: canonicalUserKey,
      reason,
    }),
    linkedPerson: decision({
      count: linkedPersonCount,
      policy: "linked_user_wins",
      dedupeKey: canonicalLinkedKey,
      reason,
    }),
    sql: decision({
      count: shouldCountSql(input),
      policy: "preserve_raw_fact_normalized_summary",
      dedupeKey: sqlKey,
      reason,
    }),
    globalUserParity: {
      globalAggregationPolicy: legacy ? "archive_only" : "count_once",
      userAggregationPolicy: legacy ? "exclude_unknown_legacy" : "best_identity_wins",
      sqlAggregationPolicy: "preserve_raw_fact_normalized_summary",
      replaySafety: replaySafety(input),
      duplicateRisk,
      identityConfidence,
    },
    duplicateRisk,
    suppressedDuplicateKeys: linked && cleanString(input.guestId) ? [`guest:${input.guestId}`] : [],
    countDedupeMath: {
      formulaId: countDedupeMath.formulaId,
      domain: countDedupeMath.domain,
      canonicalKey: countDedupeMath.canonicalKey,
      globalKey: countDedupeMath.globalKey,
      userKey: countDedupeMath.userKey,
      creatorKey: countDedupeMath.creatorKey,
      legacyKey: countDedupeMath.legacyKey,
      zeroUnknownBehavior: countDedupeMath.zeroUnknownBehavior,
      divergenceExplanation: countDedupeMath.divergenceExplanation,
      replaySuppressed: countDedupeMath.replaySuppressed,
      legacyBucket: countDedupeMath.legacyBucket,
    },
    debug: {
      lane: "Global vs user dedupe",
      defaultVisible: duplicateRisk !== "none",
      explanation: "",
      nextAction: duplicateRisk === "none"
        ? "No dedupe action needed; global, user, materializer, and export policies agree."
        : duplicateRisk === "linked_guest_user_duplicate_risk_suppressed"
          ? "Keep the raw guest fact for export, but attribute normalized user metrics to the linked user once."
          : duplicateRisk === "retry_replay_suppressed"
            ? "Preserve the raw replay fact for SQL/export audit and suppress aggregate counters."
            : duplicateRisk === "unknown_legacy_archived"
              ? "Archive legacy identity evidence without promoting it to exact user metrics."
              : "Provide stronger identity context before counting this event in user metrics.",
    },
  };

  output.debug.explanation = explainDedupeDecision(output);
  return output;
}

export function explainDedupeDecision(input: GlobalUserDedupeDecision) {
  if (input.countDedupeMath?.divergenceExplanation) {
    return input.countDedupeMath.divergenceExplanation;
  }
  if (input.duplicateRisk === "linked_guest_user_duplicate_risk_suppressed") {
    return `A linked guest action for ${input.input.eventName} is counted once globally and attributed to the linked guest user identity.`;
  }
  if (input.duplicateRisk === "retry_replay_suppressed") {
    return `replay or retry event ${input.input.eventName} is preserved for export but suppressed from global and user aggregates.`;
  }
  if (input.duplicateRisk === "unknown_legacy_archived") {
    return `Unknown legacy event ${input.input.eventName} is kept as raw export evidence and not promoted to exact user truth.`;
  }
  if (input.duplicateRisk === "missing_identity_context") {
    return `Event ${input.input.eventName} lacks enough identity context to count in normalized global or user metrics.`;
  }
  if (input.duplicateRisk === "identity_confidence_too_low") {
    return `Event ${input.input.eventName} has insufficient identity confidence for user-level aggregation.`;
  }
  return `Event ${input.input.eventName} has matching global, user, materializer, and export dedupe policy.`;
}

export function buildGlobalUserDedupeDebugLane(decisions: readonly GlobalUserDedupeDecision[] = []): GlobalUserDedupeDebugLane {
  const duplicateRiskCount = decisions.filter((entry) => entry.duplicateRisk !== "none").length;
  const unknownLegacyCount = decisions.filter((entry) => entry.duplicateRisk === "unknown_legacy_archived").length;
  const mismatchCount = decisions.filter((entry) =>
    entry.global.count && entry.user.count && entry.guest.count,
  ).length;

  return {
    label: "Global vs user dedupe",
    duplicateRiskCount,
    linkedGuestUserDedupeHealth: decisions.some((entry) => entry.duplicateRisk === "linked_guest_user_duplicate_risk_suppressed" && entry.guest.count)
      ? "degraded"
      : "healthy",
    globalUserMismatchCount: mismatchCount,
    sqlExportParityStatus: decisions.every((entry) => entry.sql.policy === "preserve_raw_fact_normalized_summary") ? "mapped" : "missing",
    unknownLegacyCount,
    rawDetailsDefaultOpen: false,
  };
}
