import type { IdentityConfidence } from "@/lib/analytics/identity-handoff-contract";
import type { MathFormulaId } from "@/lib/math/canonical-math-authority-contract";

export const COUNT_DEDUPLICATION_CONTRACT_VERSION = "2026.05.count-deduplication.1";
export const DEFAULT_COUNT_TIMESTAMP_BUCKET_MS = 60_000;

export const REQUIRED_COUNT_DOMAINS = [
  "page_session_events",
  "signup_login_events",
  "drops_opened",
  "unwraps",
  "watch_sessions",
  "wallet_opens",
  "checkout_starts",
  "payments_approved",
  "daily_task_events",
  "chat_events",
  "creator_profile_views",
  "creator_relationships",
  "fan_pass_events",
  "notification_events",
  "media_events",
  "support_account_actions",
] as const;

export type CountDomain = (typeof REQUIRED_COUNT_DOMAINS)[number];
export type CountScope = "global" | "user" | "creator" | "guest" | "legacy";
export type CountDecisionReason =
  | "count_unique_action_once"
  | "linked_guest_attributed_to_best_user_identity"
  | "legacy_bucket_only"
  | "retry_replay_suppressed"
  | "missing_identity_for_user_count"
  | "missing_creator_for_creator_count";

export interface CountDeduplicationInput {
  domain: CountDomain;
  eventName: string;
  eventId?: string | null;
  dedupeKey?: string | null;
  sessionId?: string | null;
  objectId?: string | null;
  userId?: string | null;
  guestId?: string | null;
  linkedPersonId?: string | null;
  linkId?: string | null;
  creatorId?: string | null;
  timestampMs?: number | null;
  timestampBucketMs?: number | null;
  identityConfidence?: IdentityConfidence | string | null;
  legacy?: boolean | null;
  retryAttempt?: number | null;
  replayOfEventId?: string | null;
  metricIsReplay?: boolean | null;
  sourceTruth?: string | null;
}

export interface CountScopeDecision {
  scope: CountScope;
  increment: boolean;
  key: string | null;
  formulaId: MathFormulaId;
  reason: CountDecisionReason;
}

export interface NormalizedCountInput extends CountDeduplicationInput {
  eventName: string;
  formulaId: MathFormulaId;
  canonicalKey: string;
  globalKey: string;
  userKey: string | null;
  creatorKey: string | null;
  guestKey: string | null;
  legacyKey: string | null;
  bestUserIdentity: string | null;
  identityConfidence: IdentityConfidence;
  legacyBucket: boolean;
  replaySuppressed: boolean;
  duplicateRisk: "none" | "linked_guest_user_duplicate_risk_suppressed" | "legacy_bucket_only" | "retry_replay_suppressed";
  zeroUnknownBehavior: string;
  divergenceExplanation: string;
  decisions: Record<CountScope, CountScopeDecision>;
}

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
  return (cleanString(value) || "unknown").replace(/[^A-Za-z0-9:_-]+/gu, "_").slice(0, 160);
}

function normalizeConfidence(value: unknown): IdentityConfidence {
  const candidate = cleanString(value) as IdentityConfidence;
  return candidate in CONFIDENCE_RANK ? candidate : "unknown";
}

function confidenceAtLeast(actual: IdentityConfidence, minimum: IdentityConfidence) {
  return CONFIDENCE_RANK[actual] >= CONFIDENCE_RANK[minimum];
}

function timestampBucket(input: CountDeduplicationInput) {
  const timestampMs = typeof input.timestampMs === "number" && Number.isFinite(input.timestampMs)
    ? Math.max(0, Math.trunc(input.timestampMs))
    : 0;
  const bucketMs = typeof input.timestampBucketMs === "number" && Number.isFinite(input.timestampBucketMs) && input.timestampBucketMs > 0
    ? Math.trunc(input.timestampBucketMs)
    : DEFAULT_COUNT_TIMESTAMP_BUCKET_MS;
  return Math.floor(timestampMs / bucketMs);
}

function isRetryOrReplay(input: CountDeduplicationInput) {
  return Boolean(cleanString(input.replayOfEventId))
    || (typeof input.retryAttempt === "number" && input.retryAttempt > 0);
}

function bestUserIdentity(input: CountDeduplicationInput) {
  return cleanString(input.linkedPersonId)
    || cleanString(input.userId)
    || cleanString(input.linkId)
    || null;
}

function linkedGuestUser(input: CountDeduplicationInput) {
  return Boolean(cleanString(input.guestId) && (cleanString(input.userId) || cleanString(input.linkedPersonId) || cleanString(input.linkId)));
}

function isLegacyBucket(input: CountDeduplicationInput, confidence: IdentityConfidence) {
  return input.legacy === true || confidence === "weak" || confidence === "unknown";
}

export function buildCanonicalCountKey(input: CountDeduplicationInput): string {
  const eventId = cleanString(input.eventId);
  if (eventId) return `event:${sanitizeKey(eventId)}`;
  const dedupeKey = cleanString(input.dedupeKey);
  if (dedupeKey) return `dedupe:${sanitizeKey(dedupeKey)}`;
  return [
    "bucket",
    sanitizeKey(input.sessionId),
    sanitizeKey(input.eventName),
    sanitizeKey(input.objectId),
    timestampBucket(input),
  ].join(":");
}

export function buildGlobalCountKey(input: CountDeduplicationInput | NormalizedCountInput): string {
  const canonicalKey = "canonicalKey" in input ? input.canonicalKey : buildCanonicalCountKey(input);
  return ["global", sanitizeKey(input.domain), canonicalKey].join(":");
}

export function buildUserCountKey(input: CountDeduplicationInput | NormalizedCountInput): string | null {
  const userIdentity = "bestUserIdentity" in input ? input.bestUserIdentity : bestUserIdentity(input);
  if (!userIdentity) return null;
  const canonicalKey = "canonicalKey" in input ? input.canonicalKey : buildCanonicalCountKey(input);
  return ["user", sanitizeKey(userIdentity), sanitizeKey(input.domain), canonicalKey].join(":");
}

export function buildCreatorCountKey(input: CountDeduplicationInput | NormalizedCountInput): string | null {
  const creatorId = cleanString(input.creatorId);
  if (!creatorId) return null;
  const canonicalKey = "canonicalKey" in input ? input.canonicalKey : buildCanonicalCountKey(input);
  return ["creator", sanitizeKey(creatorId), sanitizeKey(input.domain), canonicalKey].join(":");
}

export function buildLegacyCountKey(input: CountDeduplicationInput | NormalizedCountInput): string {
  const canonicalKey = "canonicalKey" in input ? input.canonicalKey : buildCanonicalCountKey(input);
  return ["legacy", sanitizeKey(input.domain), canonicalKey].join(":");
}

function buildGuestCountKey(input: CountDeduplicationInput | NormalizedCountInput): string | null {
  const guestId = cleanString(input.guestId);
  if (!guestId) return null;
  const canonicalKey = "canonicalKey" in input ? input.canonicalKey : buildCanonicalCountKey(input);
  return ["guest", sanitizeKey(guestId), sanitizeKey(input.domain), canonicalKey].join(":");
}

function scopeDecision(input: {
  scope: CountScope;
  increment: boolean;
  key: string | null;
  formulaId: MathFormulaId;
  reason: CountDecisionReason;
}): CountScopeDecision {
  return input;
}

function formulaForDomain(domain: CountDomain): MathFormulaId {
  if (domain === "page_session_events") return "count_dedupe.page_session_count";
  if (domain === "signup_login_events") return "count_dedupe.signup_login_count";
  if (domain === "drops_opened") return "count_dedupe.drop_open_count";
  if (domain === "unwraps") return "count_dedupe.unwrap_count";
  if (domain === "watch_sessions") return "count_dedupe.watch_session_count";
  if (domain === "wallet_opens") return "count_dedupe.wallet_open_count";
  if (domain === "checkout_starts") return "count_dedupe.checkout_start_count";
  if (domain === "payments_approved") return "count_dedupe.payment_approved_count";
  if (domain === "daily_task_events") return "count_dedupe.daily_task_count";
  if (domain === "chat_events") return "count_dedupe.chat_event_count";
  if (domain === "creator_profile_views") return "count_dedupe.creator_profile_count";
  if (domain === "creator_relationships") return "count_dedupe.creator_relationship_count";
  if (domain === "fan_pass_events") return "count_dedupe.fan_pass_count";
  if (domain === "notification_events") return "count_dedupe.notification_count";
  if (domain === "media_events") return "count_dedupe.media_count";
  return "count_dedupe.support_account_count";
}

export function inferCountDomain(input: { eventName?: string | null; featureId?: string | null; surface?: string | null }): CountDomain {
  const text = `${input.eventName ?? ""} ${input.featureId ?? ""} ${input.surface ?? ""}`.toLowerCase();
  if (/signup|login|auth|sign_in/u.test(text)) return "signup_login_events";
  if (/unwrap|unlock|entitlement/u.test(text)) return "unwraps";
  if (/watch|asset|file_view/u.test(text)) return "watch_sessions";
  if (/wallet/u.test(text)) return "wallet_opens";
  if (/checkout|begin_checkout/u.test(text)) return "checkout_starts";
  if (/purchase|payment|paypal|gumdrops_purchased/u.test(text)) return "payments_approved";
  if (/daily|task|checkin|check_in|reward/u.test(text)) return "daily_task_events";
  if (/chat|message|thread/u.test(text)) return "chat_events";
  if (/follow|unfollow|relationship/u.test(text)) return "creator_relationships";
  if (/creator|profile/u.test(text)) return "creator_profile_views";
  if (/fan_pass|subscription|subscriber/u.test(text)) return "fan_pass_events";
  if (/notification|push|token/u.test(text)) return "notification_events";
  if (/media|upload|attachment|asset_access/u.test(text)) return "media_events";
  if (/support|bug|account/u.test(text)) return "support_account_actions";
  if (/drop/u.test(text)) return "drops_opened";
  return "page_session_events";
}

export function normalizeCountInput(input: CountDeduplicationInput): NormalizedCountInput {
  const identityConfidence = normalizeConfidence(input.identityConfidence);
  const canonicalKey = buildCanonicalCountKey(input);
  const legacyBucket = isLegacyBucket(input, identityConfidence);
  const replaySuppressed = isRetryOrReplay(input) && input.metricIsReplay !== true;
  const userIdentity = bestUserIdentity(input);
  const hasUserIdentity = Boolean(userIdentity) && confidenceAtLeast(identityConfidence, linkedGuestUser(input) ? "linked" : "exact");
  const formulaId = formulaForDomain(input.domain);
  const globalKey = buildGlobalCountKey({ ...input, canonicalKey } as NormalizedCountInput);
  const userKey = buildUserCountKey({ ...input, canonicalKey, bestUserIdentity: userIdentity } as NormalizedCountInput);
  const creatorKey = buildCreatorCountKey({ ...input, canonicalKey } as NormalizedCountInput);
  const guestKey = linkedGuestUser(input) ? null : buildGuestCountKey({ ...input, canonicalKey } as NormalizedCountInput);
  const legacyKey = buildLegacyCountKey({ ...input, canonicalKey } as NormalizedCountInput);
  const reason: CountDecisionReason = replaySuppressed
    ? "retry_replay_suppressed"
    : legacyBucket
      ? "legacy_bucket_only"
      : linkedGuestUser(input)
        ? "linked_guest_attributed_to_best_user_identity"
        : "count_unique_action_once";
  const incrementStandard = !legacyBucket && !replaySuppressed;
  const decisions = {
    global: scopeDecision({
      scope: "global",
      increment: incrementStandard,
      key: globalKey,
      formulaId,
      reason,
    }),
    user: scopeDecision({
      scope: "user",
      increment: incrementStandard && hasUserIdentity && Boolean(userKey),
      key: userKey,
      formulaId,
      reason: !hasUserIdentity && incrementStandard ? "missing_identity_for_user_count" : reason,
    }),
    creator: scopeDecision({
      scope: "creator",
      increment: incrementStandard && Boolean(creatorKey),
      key: creatorKey,
      formulaId,
      reason: !creatorKey && incrementStandard ? "missing_creator_for_creator_count" : reason,
    }),
    guest: scopeDecision({
      scope: "guest",
      increment: incrementStandard && Boolean(guestKey) && !hasUserIdentity,
      key: guestKey,
      formulaId,
      reason,
    }),
    legacy: scopeDecision({
      scope: "legacy",
      increment: legacyBucket,
      key: legacyKey,
      formulaId: "count_dedupe.legacy_bucket_count",
      reason: legacyBucket ? "legacy_bucket_only" : reason,
    }),
  } satisfies Record<CountScope, CountScopeDecision>;
  const duplicateRisk = replaySuppressed
    ? "retry_replay_suppressed"
    : legacyBucket
      ? "legacy_bucket_only"
      : linkedGuestUser(input)
        ? "linked_guest_user_duplicate_risk_suppressed"
        : "none";

  return {
    ...input,
    eventName: cleanString(input.eventName) || "unknown_event",
    formulaId,
    canonicalKey,
    globalKey,
    userKey,
    creatorKey,
    guestKey,
    legacyKey,
    bestUserIdentity: userIdentity,
    identityConfidence,
    legacyBucket,
    replaySuppressed,
    duplicateRisk,
    zeroUnknownBehavior: "Zero means no increment in the evaluated source window; unknown or missing identity stays uncounted until source truth links it.",
    divergenceExplanation: linkedGuestUser(input)
      ? "Global count increments once and user count is attributed to the best user identity; guest scope is suppressed to avoid double counting."
      : legacyBucket
        ? "Legacy weak or unknown confidence is counted in the legacy bucket only, not exact global or user buckets."
        : replaySuppressed
          ? "Retry or replay evidence is preserved outside standard user-facing counts unless replay is the metric itself."
          : "Global, user, creator, and guest counts use the same canonical action key and diverge only when identity or creator scope is unavailable.",
    decisions,
  };
}

export function shouldIncrementCount(input: (CountDeduplicationInput | NormalizedCountInput) & { scope?: CountScope }): boolean {
  const scope = input.scope ?? "global";
  const normalized = "decisions" in input ? input : normalizeCountInput(input);
  return normalized.decisions[scope].increment;
}

export function explainCountDecision(input: CountDeduplicationInput | NormalizedCountInput): string {
  const normalized = "decisions" in input ? input : normalizeCountInput(input);
  const parts = [
    `domain=${normalized.domain}`,
    `formulaId=${normalized.formulaId}`,
    `canonicalKey=${normalized.canonicalKey}`,
    `global=${normalized.decisions.global.increment ? "increment" : "no increment"}`,
    `user=${normalized.decisions.user.increment ? "increment" : "no increment"}`,
    `creator=${normalized.decisions.creator.increment ? "increment" : "no increment"}`,
    `legacy=${normalized.decisions.legacy.increment ? "legacy bucket" : "not legacy bucket"}`,
    `zeroUnknownBehavior=${normalized.zeroUnknownBehavior}`,
    `divergence=${normalized.divergenceExplanation}`,
  ];
  return parts.join("; ");
}
