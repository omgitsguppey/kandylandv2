import type {
  ActorKind,
  IdentityConfidence,
  IdentityState,
} from "@/lib/analytics/identity-handoff-contract";

export const GLOBAL_USER_COUNTING_MATH_VERSION = "2026.05.global-user-counting-math.1";

export type GlobalUserCountingScope = "global" | "guest" | "signedIn" | "linkedPerson" | "creatorRole";

export type GlobalUserCountingReason =
  | "count_unique_action_once"
  | "guest_pre_login_scope"
  | "signed_in_authenticated_scope"
  | "linked_person_scope"
  | "linked_duplicate_suppressed"
  | "creator_role_signed_in_scope"
  | "admin_projection_excluded"
  | "system_excluded"
  | "unknown_legacy_global_only"
  | "missing_identity_context"
  | "identity_confidence_too_low"
  | "payment_provider_fingerprint_required"
  | "task_reset_window_required";

export type GlobalUserCountingInput = {
  eventName: string;
  eventId?: string | null;
  eventVersion?: number | null;
  actorKind?: ActorKind | string | null;
  identityState?: IdentityState | string | null;
  identityConfidence?: IdentityConfidence | string | null;
  userId?: string | null;
  guestId?: string | null;
  linkId?: string | null;
  linkedPersonId?: string | null;
  sessionId?: string | null;
  surface?: string | null;
  featureId?: string | null;
  objectId?: string | null;
  timestamp?: string | number | Date | null;
  timestampMs?: number | null;
  authAttemptId?: string | null;
  authMethod?: string | null;
  idempotencyKey?: string | null;
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  orderId?: string | null;
  dropId?: string | null;
  unlockId?: string | null;
  watchSessionId?: string | null;
  messageId?: string | null;
  taskId?: string | null;
  resetWindowId?: string | null;
  intentId?: string | null;
  recipientId?: string | null;
  roles?: readonly string[] | null;
  legacyUnknown?: boolean | null;
  replayOfEventId?: string | null;
  retryAttempt?: number | null;
};

export type GlobalUserScopeCountDecision = {
  scope: GlobalUserCountingScope;
  count: boolean;
  dedupeKey: string;
  reason: GlobalUserCountingReason;
  explanation: string;
  suppressedDuplicateKey: string | null;
};

export type CreatorRoleCountDecision = GlobalUserScopeCountDecision & {
  createsSeparatePerson: false;
};

export type DuplicateLinkedActionDecision = {
  input: GlobalUserCountingInput;
  suppressed: boolean;
  suppressedDuplicateKey: string | null;
  reason: GlobalUserCountingReason;
  explanation: string;
};

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

function confidenceAtLeast(actual: IdentityConfidence, expected: IdentityConfidence) {
  return CONFIDENCE_RANK[actual] >= CONFIDENCE_RANK[expected];
}

function timestampMs(input: GlobalUserCountingInput) {
  if (typeof input.timestampMs === "number" && Number.isFinite(input.timestampMs)) return Math.max(0, Math.trunc(input.timestampMs));
  if (input.timestamp instanceof Date) return input.timestamp.getTime();
  if (typeof input.timestamp === "number" && Number.isFinite(input.timestamp)) return Math.max(0, Math.trunc(input.timestamp));
  if (typeof input.timestamp === "string") {
    const parsed = Date.parse(input.timestamp);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function bucket(input: GlobalUserCountingInput, bucketMs: number) {
  return Math.floor(timestampMs(input) / bucketMs);
}

function actorOrSessionKey(input: GlobalUserCountingInput) {
  if (cleanString(input.linkedPersonId)) return `person:${sanitizeKey(input.linkedPersonId)}`;
  if (cleanString(input.linkId)) return `link:${sanitizeKey(input.linkId)}`;
  if (cleanString(input.userId)) return `user:${sanitizeKey(input.userId)}`;
  if (cleanString(input.guestId)) return `guest:${sanitizeKey(input.guestId)}`;
  return `session:${sanitizeKey(input.sessionId)}`;
}

function objectKey(input: GlobalUserCountingInput) {
  return sanitizeKey(input.objectId || input.dropId || input.taskId || input.intentId || input.messageId || input.surface || input.featureId);
}

function isAdminProjection(input: GlobalUserCountingInput) {
  return cleanString(input.actorKind) === "admin_projection";
}

function isSystem(input: GlobalUserCountingInput) {
  return cleanString(input.actorKind) === "system";
}

function isLegacyUnknown(input: GlobalUserCountingInput) {
  return input.legacyUnknown === true
    || cleanString(input.identityState) === "legacy_unknown"
    || cleanString(input.actorKind) === "legacy_unknown";
}

function isGuestState(input: GlobalUserCountingInput) {
  return cleanString(input.identityState).startsWith("guest_") || cleanString(input.actorKind) === "guest";
}

function isSignedInState(input: GlobalUserCountingInput) {
  return Boolean(cleanString(input.userId))
    && !isAdminProjection(input)
    && !isSystem(input)
    && !isLegacyUnknown(input)
    && !isGuestState(input);
}

function isLinkedPersonState(input: GlobalUserCountingInput) {
  return Boolean(cleanString(input.linkId) || cleanString(input.linkedPersonId))
    && (Boolean(cleanString(input.userId)) || cleanString(input.identityState) === "logged_in_linked_guest");
}

function isCreatorRole(input: GlobalUserCountingInput) {
  return cleanString(input.actorKind) === "creator_user" || (input.roles ?? []).some((role) => role.toLowerCase() === "creator");
}

function isReplay(input: GlobalUserCountingInput) {
  return Boolean(cleanString(input.replayOfEventId)) || (typeof input.retryAttempt === "number" && input.retryAttempt > 0);
}

function paymentFingerprint(input: GlobalUserCountingInput) {
  return cleanString(input.providerOrderId) || cleanString(input.providerPaymentId) || cleanString(input.orderId);
}

function eventFamily(input: GlobalUserCountingInput) {
  const eventName = cleanString(input.eventName).toLowerCase();
  if (/server_purchase_verified|purchase_verified|paypal_capture_completed|purchase_completed|gumdrops_purchase_completed|gumdrops_purchased/u.test(eventName)) return "payment_approval";
  if (/checkout|begin_checkout/u.test(eventName)) return "wallet_checkout";
  if (/unlock|unlocked|unwrap|entitlement/u.test(eventName)) return "drop_unlock";
  if (/watch/u.test(eventName)) return "watch_session";
  if (/message|chat/u.test(eventName)) return "chat_message";
  if (/daily_task_reward_granted|daily_task_claimed|task_reward/u.test(eventName)) return "task_reward";
  if (/notification|push/u.test(eventName)) return "notification";
  if (/signup|login|auth|sign_in/u.test(eventName)) return "signup_login";
  if (/viewed|opened|impression|surface_viewed/u.test(eventName)) return "surface_viewed";
  return "click_action";
}

export function buildGlobalUserCountingDedupeKey(input: GlobalUserCountingInput) {
  const eventName = sanitizeKey(input.eventName);
  const family = eventFamily(input);
  if (family === "payment_approval") {
    const fingerprint = paymentFingerprint(input);
    return fingerprint ? `payment_approval:${sanitizeKey(fingerprint)}` : "payment_approval:missing_provider_fingerprint";
  }
  if (family === "wallet_checkout") return `wallet_checkout:${sanitizeKey(input.idempotencyKey)}`;
  if (family === "drop_unlock") {
    return [
      "drop_unlock",
      sanitizeKey(input.dropId || input.objectId),
      actorOrSessionKey(input),
      sanitizeKey(input.unlockId || input.idempotencyKey || input.eventId),
    ].join(":");
  }
  if (family === "watch_session") return `watch_session:${sanitizeKey(input.watchSessionId || input.eventId)}`;
  if (family === "chat_message") return `chat_message:${sanitizeKey(input.messageId || input.idempotencyKey)}`;
  if (family === "task_reward") {
    return [
      "task_reward",
      sanitizeKey(input.taskId || input.objectId),
      sanitizeKey(input.resetWindowId),
      actorOrSessionKey(input),
    ].join(":");
  }
  if (family === "notification") {
    return [
      "notification",
      sanitizeKey(input.intentId || input.objectId),
      sanitizeKey(input.recipientId || input.userId || input.guestId),
      bucket(input, 60 * 60 * 1000),
    ].join(":");
  }
  if (family === "signup_login") {
    return [
      "signup_login",
      sanitizeKey(input.authAttemptId || input.userId || input.eventId),
      sanitizeKey(input.authMethod || input.objectId),
      bucket(input, 10 * 60 * 1000),
    ].join(":");
  }
  if (family === "surface_viewed") {
    return ["surface_viewed", eventName, sanitizeKey(input.surface), actorOrSessionKey(input), bucket(input, 60_000)].join(":");
  }
  return ["click_action", eventName, objectKey(input), actorOrSessionKey(input), bucket(input, 5_000)].join(":");
}

function blockedDecision(input: GlobalUserCountingInput, scope: GlobalUserCountingScope, reason: GlobalUserCountingReason): GlobalUserScopeCountDecision {
  return {
    scope,
    count: false,
    dedupeKey: buildGlobalUserCountingDedupeKey(input),
    reason,
    explanation: explanationFor(input, reason, scope),
    suppressedDuplicateKey: null,
  };
}

function baseEligible(input: GlobalUserCountingInput, scope: GlobalUserCountingScope): GlobalUserScopeCountDecision | null {
  if (isAdminProjection(input)) return blockedDecision(input, scope, "admin_projection_excluded");
  if (isSystem(input)) return blockedDecision(input, scope, "system_excluded");
  if (eventFamily(input) === "payment_approval" && !paymentFingerprint(input)) return blockedDecision(input, scope, "payment_provider_fingerprint_required");
  if (eventFamily(input) === "task_reward" && (!cleanString(input.taskId || input.objectId) || !cleanString(input.resetWindowId))) {
    return blockedDecision(input, scope, "task_reset_window_required");
  }
  return null;
}

function explanationFor(input: GlobalUserCountingInput, reason: GlobalUserCountingReason, scope: GlobalUserCountingScope) {
  if (reason === "linked_duplicate_suppressed" || reason === "linked_person_scope") {
    return `${input.eventName} counts once globally and once for the linked person; guest/signed-in duplicates are suppressed.`;
  }
  if (reason === "admin_projection_excluded") return "Admin projection events never count as user behavior.";
  if (reason === "system_excluded") return "System events never count as user behavior.";
  if (reason === "unknown_legacy_global_only") return "Unknown legacy can count only as safe global evidence and never as exact user truth.";
  if (reason === "payment_provider_fingerprint_required") return "Payment approval counts require a provider/order fingerprint.";
  if (reason === "task_reset_window_required") return "Task reward counts require taskId plus resetWindowId.";
  if (reason === "identity_confidence_too_low") return `${input.eventName} lacks enough identity confidence for ${scope} counting.`;
  return `${input.eventName} ${scope} count decision uses canonical key ${buildGlobalUserCountingDedupeKey(input)}.`;
}

export function calculateGlobalCountDecision(input: GlobalUserCountingInput): GlobalUserScopeCountDecision {
  const blocked = baseEligible(input, "global");
  if (blocked) return blocked;
  if (isReplay(input)) return blockedDecision(input, "global", "linked_duplicate_suppressed");
  if (isLegacyUnknown(input)) {
    const safeLegacy = Boolean(cleanString(input.eventId) || cleanString(input.sessionId) || cleanString(input.idempotencyKey));
    return {
      scope: "global",
      count: safeLegacy,
      dedupeKey: buildGlobalUserCountingDedupeKey(input),
      reason: "unknown_legacy_global_only",
      explanation: explanationFor(input, "unknown_legacy_global_only", "global"),
      suppressedDuplicateKey: null,
    };
  }
  if (!cleanString(input.userId) && !cleanString(input.guestId) && !cleanString(input.sessionId)) {
    return blockedDecision(input, "global", "missing_identity_context");
  }
  return {
    scope: "global",
    count: true,
    dedupeKey: buildGlobalUserCountingDedupeKey(input),
    reason: "count_unique_action_once",
    explanation: explanationFor(input, "count_unique_action_once", "global"),
    suppressedDuplicateKey: null,
  };
}

export function calculateGuestCountDecision(input: GlobalUserCountingInput): GlobalUserScopeCountDecision {
  const blocked = baseEligible(input, "guest");
  if (blocked) return blocked;
  const linked = isLinkedPersonState(input);
  const count = isGuestState(input) && Boolean(cleanString(input.guestId)) && !linked && !isReplay(input) && !isLegacyUnknown(input);
  return {
    scope: "guest",
    count,
    dedupeKey: buildGlobalUserCountingDedupeKey(input),
    reason: linked ? "linked_duplicate_suppressed" : count ? "guest_pre_login_scope" : "missing_identity_context",
    explanation: explanationFor(input, linked ? "linked_duplicate_suppressed" : count ? "guest_pre_login_scope" : "missing_identity_context", "guest"),
    suppressedDuplicateKey: linked && cleanString(input.guestId) ? `guest:${sanitizeKey(input.guestId)}` : null,
  };
}

export function calculateSignedInCountDecision(input: GlobalUserCountingInput): GlobalUserScopeCountDecision {
  const blocked = baseEligible(input, "signedIn");
  if (blocked) return blocked;
  const confidence = normalizeConfidence(input.identityConfidence);
  const count = isSignedInState(input) && confidenceAtLeast(confidence, "linked") && !isReplay(input);
  return {
    scope: "signedIn",
    count,
    dedupeKey: buildGlobalUserCountingDedupeKey(input),
    reason: count ? "signed_in_authenticated_scope" : "identity_confidence_too_low",
    explanation: explanationFor(input, count ? "signed_in_authenticated_scope" : "identity_confidence_too_low", "signedIn"),
    suppressedDuplicateKey: null,
  };
}

export function calculateLinkedPersonCountDecision(input: GlobalUserCountingInput): GlobalUserScopeCountDecision {
  const blocked = baseEligible(input, "linkedPerson");
  if (blocked) return blocked;
  const confidence = normalizeConfidence(input.identityConfidence);
  const count = isLinkedPersonState(input) && confidenceAtLeast(confidence, "linked") && !isReplay(input) && !isLegacyUnknown(input);
  return {
    scope: "linkedPerson",
    count,
    dedupeKey: buildGlobalUserCountingDedupeKey(input),
    reason: count ? "linked_person_scope" : "identity_confidence_too_low",
    explanation: explanationFor(input, count ? "linked_person_scope" : "identity_confidence_too_low", "linkedPerson"),
    suppressedDuplicateKey: cleanString(input.guestId) ? `guest:${sanitizeKey(input.guestId)}` : null,
  };
}

export function calculateCreatorRoleCountDecision(input: GlobalUserCountingInput): CreatorRoleCountDecision {
  const blocked = baseEligible(input, "creatorRole");
  if (blocked) return { ...blocked, createsSeparatePerson: false };
  const signedIn = calculateSignedInCountDecision(input);
  const count = isCreatorRole(input) && signedIn.count;
  return {
    scope: "creatorRole",
    count,
    dedupeKey: buildGlobalUserCountingDedupeKey(input),
    reason: count ? "creator_role_signed_in_scope" : signedIn.reason,
    explanation: count
      ? "Creator role metrics are signed-in user metrics with a creator role and do not create a separate person."
      : signedIn.explanation,
    suppressedDuplicateKey: signedIn.suppressedDuplicateKey,
    createsSeparatePerson: false,
  };
}

export function suppressDuplicateLinkedAction(input: GlobalUserCountingInput): DuplicateLinkedActionDecision {
  const suppressed = isLinkedPersonState(input) && Boolean(cleanString(input.guestId));
  return {
    input,
    suppressed,
    suppressedDuplicateKey: suppressed ? `guest:${sanitizeKey(input.guestId)}` : null,
    reason: suppressed ? "linked_duplicate_suppressed" : "count_unique_action_once",
    explanation: suppressed
      ? explanationFor(input, "linked_duplicate_suppressed", "linkedPerson")
      : explanationFor(input, "count_unique_action_once", "global"),
  };
}

export function explainCountDecision(input: GlobalUserCountingInput) {
  const global = calculateGlobalCountDecision(input);
  const guest = calculateGuestCountDecision(input);
  const signedIn = calculateSignedInCountDecision(input);
  const linked = calculateLinkedPersonCountDecision(input);
  const creator = calculateCreatorRoleCountDecision(input);
  return [
    `global=${global.count ? "count" : "skip"}:${global.reason}`,
    `guest=${guest.count ? "count" : "skip"}:${guest.reason}`,
    `signedIn=${signedIn.count ? "count" : "skip"}:${signedIn.reason}`,
    `linked person=${linked.count ? "count" : "skip"}:${linked.reason}`,
    `creatorRole=${creator.count ? "count" : "skip"}:${creator.reason}`,
    `dedupeKey=${global.dedupeKey}`,
    global.explanation,
  ].join("; ");
}
