import type { AnalyticsConsentState } from "@/lib/analytics/analytics-event-contract";

export const GUEST_USER_IDENTITY_TRANSFER_ROUTE = "/api/analytics/identity-link";
export const GUEST_USER_IDENTITY_LINK_STORAGE_PREFIX = "kandydrops.identityLink.sent";
export const IDENTITY_LINK_PENDING_TTL_MS = 10 * 60 * 1000;
export const IDENTITY_LINK_FAILURE_RETRY_TTL_MS = 60 * 60 * 1000;

export const ANALYTICS_IDENTITY_STATES = [
  "guest_only",
  "user_only",
  "guest_linked_to_user",
  "creator_user",
  "admin_projection",
  "unknown_legacy",
] as const;
export type AnalyticsIdentityState = (typeof ANALYTICS_IDENTITY_STATES)[number];

export const ANALYTICS_IDENTITY_ACTOR_TYPES = [
  "guest",
  "authenticated_user",
  "creator",
  "admin",
  "system",
] as const;
export type AnalyticsIdentityActorType = (typeof ANALYTICS_IDENTITY_ACTOR_TYPES)[number];

export type GuestUserIdentityLinkReason = "login" | "signup" | "session_restore";

export type GuestUserIdentityLink = {
  guestId: string;
  userId: string;
  sessionId: string;
  linkedAt: string;
  reason: GuestUserIdentityLinkReason;
  identityLinkId: string;
  authTransitionId: string;
  actorType: "authenticated_user";
  identityState: "guest_linked_to_user";
  sourceTruth: "guest_user_identity_transfer";
};

export type IdentityLinkSubmitResult = {
  success: boolean;
  identityLinkId?: string;
  created?: boolean;
  identityState?: AnalyticsIdentityState;
  loginBlocking: false;
  retryable: false;
  reason?: string;
};

type Fetcher = (input: string, init: RequestInit) => Promise<Response>;
type IdentityLinkStorageState = "sent" | `pending:${number}` | `retry_after:${number}`;

function cleanIdentityPart(value: string) {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned.slice(0, 96) || "unknown";
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isOneOf<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

function normalizeReason(value: string | null | undefined): GuestUserIdentityLinkReason {
  return value === "signup" || value === "session_restore" ? value : "login";
}

export function normalizeIdentityTransferState(value: unknown): AnalyticsIdentityState | null {
  return isOneOf(value, ANALYTICS_IDENTITY_STATES) ? value : null;
}

export function buildGuestUserIdentityLinkId(input: {
  guestId: string;
  userId: string;
  sessionId: string;
}) {
  const guestId = input.guestId.trim();
  const sessionId = input.sessionId.trim();
  const userId = input.userId.trim();
  return `identity_link_${stableHash(`${guestId}|${sessionId}|${userId}`)}`;
}

export function resolveIdentityTransferTelemetryState(input: {
  actorType?: string | null;
  anonymousVisitorId?: string | null;
  guestId?: string | null;
  sessionId?: string | null;
  identityLinkId?: string | null;
  identityState?: string | null;
  userId?: string | null;
  actorUserId?: string | null;
  creatorId?: string | null;
  actorCreatorId?: string | null;
  adminId?: string | null;
  actorAdminId?: string | null;
  performedAs?: string | null;
  projectionMode?: string | null;
  sourceTruth?: string | null;
}) {
  const explicit = normalizeIdentityTransferState(input.identityState);
  if (explicit) {
    return explicit;
  }

  const actorType = stringOrNull(input.actorType)?.toLowerCase() ?? "";
  const performedAs = stringOrNull(input.performedAs)?.toLowerCase() ?? "";
  const projectionMode = stringOrNull(input.projectionMode)?.toLowerCase() ?? "";
  const sourceTruth = stringOrNull(input.sourceTruth)?.toLowerCase() ?? "";
  const hasUser = Boolean(stringOrNull(input.userId) ?? stringOrNull(input.actorUserId));
  const hasCreator = actorType === "creator" || Boolean(stringOrNull(input.creatorId) ?? stringOrNull(input.actorCreatorId));
  const hasAdminProjection = actorType === "admin"
    || actorType === "owner_admin"
    || Boolean(stringOrNull(input.adminId) ?? stringOrNull(input.actorAdminId))
    || performedAs === "admin_view_as_creator"
    || performedAs === "admin_on_behalf"
    || performedAs === "owner_override"
    || projectionMode.includes("projection")
    || sourceTruth === "local_projection";
  const hasLinkedGuest = Boolean(
    stringOrNull(input.identityLinkId)
      ?? stringOrNull(input.anonymousVisitorId)
      ?? stringOrNull(input.guestId),
  );
  const hasGuestSession = Boolean(stringOrNull(input.sessionId));

  if (hasAdminProjection) {
    return "admin_projection";
  }
  if (hasCreator) {
    return "creator_user";
  }
  if (hasUser && hasLinkedGuest) {
    return "guest_linked_to_user";
  }
  if (hasUser) {
    return "user_only";
  }
  if (hasLinkedGuest || hasGuestSession) {
    return "guest_only";
  }
  return "unknown_legacy";
}

export function buildIdentityTransferCountingKeys(input: Parameters<typeof resolveIdentityTransferTelemetryState>[0]) {
  const identityState = resolveIdentityTransferTelemetryState(input);
  const knownUserCountKey = identityState === "user_only" || identityState === "guest_linked_to_user"
    ? stringOrNull(input.userId) ?? stringOrNull(input.actorUserId)
    : null;
  const linkedGuestCountKey = identityState === "guest_linked_to_user"
    ? stringOrNull(input.anonymousVisitorId) ?? stringOrNull(input.guestId)
    : null;

  return {
    identityState,
    knownUserCountKey,
    linkedGuestCountKey,
    identityLinkId: stringOrNull(input.identityLinkId),
    countAsKnownUser: Boolean(knownUserCountKey),
    countAsGuest: identityState === "guest_only",
    countAsAdditionalKnownUser: false,
    countAsUnknownLegacy: identityState === "unknown_legacy",
  };
}

export function buildIdentityLink(input: {
  guestId: string;
  userId: string;
  sessionId: string;
  linkedAt?: string | null;
  reason?: string | null;
}): GuestUserIdentityLink {
  const guestId = input.guestId.trim();
  const userId = input.userId.trim();
  const sessionId = input.sessionId.trim();
  const reason = normalizeReason(input.reason);
  const linkedAt = input.linkedAt?.trim() || new Date().toISOString();

  return {
    guestId,
    userId,
    sessionId,
    linkedAt,
    reason,
    identityLinkId: buildGuestUserIdentityLinkId({ guestId, sessionId, userId }),
    authTransitionId: `auth_transition_${reason}_${cleanIdentityPart(guestId)}_${cleanIdentityPart(sessionId)}_${cleanIdentityPart(userId)}`,
    actorType: "authenticated_user",
    identityState: "guest_linked_to_user",
    sourceTruth: "guest_user_identity_transfer",
  };
}

export function createIdentityLinkStorageKey(link: Pick<GuestUserIdentityLink, "identityLinkId">) {
  return `${GUEST_USER_IDENTITY_LINK_STORAGE_PREFIX}:${link.identityLinkId}`;
}

export function shouldSubmitIdentityLink(
  link: Pick<GuestUserIdentityLink, "identityLinkId">,
  submittedKeys: Pick<Set<string>, "has">,
) {
  return !submittedKeys.has(createIdentityLinkStorageKey(link));
}

function readStorage(storage: Storage | null | undefined, key: string) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage | null | undefined, key: string, value: string) {
  try {
    storage?.setItem(key, value);
  } catch {
    // Restricted browsers can deny storage; transfer remains non-blocking.
  }
}

function getStorage() {
  return typeof window !== "undefined" ? window.localStorage : null;
}

function readIdentityLinkStorageState(
  link: Pick<GuestUserIdentityLink, "identityLinkId">,
  storage?: Storage | null,
) {
  return readStorage(storage ?? getStorage(), createIdentityLinkStorageKey(link));
}

function writeIdentityLinkStorageState(
  link: Pick<GuestUserIdentityLink, "identityLinkId">,
  value: IdentityLinkStorageState,
  storage?: Storage | null,
) {
  writeStorage(storage ?? getStorage(), createIdentityLinkStorageKey(link), value);
}

function isIdentityLinkStorageStateBlocking(value: string | null, nowMs = Date.now()) {
  if (value === "sent") {
    return true;
  }

  if (value?.startsWith("pending:")) {
    const expiresAt = Number(value.slice("pending:".length));
    return Number.isFinite(expiresAt) && expiresAt > nowMs;
  }

  if (value?.startsWith("retry_after:")) {
    const retryAfter = Number(value.slice("retry_after:".length));
    return Number.isFinite(retryAfter) && retryAfter > nowMs;
  }

  return false;
}

export function hasSubmittedIdentityLink(link: Pick<GuestUserIdentityLink, "identityLinkId">, storage?: Storage | null) {
  return isIdentityLinkStorageStateBlocking(readIdentityLinkStorageState(link, storage));
}

export function markIdentityLinkSubmitted(link: Pick<GuestUserIdentityLink, "identityLinkId">, storage?: Storage | null) {
  writeIdentityLinkStorageState(link, `pending:${Date.now() + IDENTITY_LINK_PENDING_TTL_MS}`, storage);
}

export function markIdentityLinkSucceeded(link: Pick<GuestUserIdentityLink, "identityLinkId">, storage?: Storage | null) {
  writeIdentityLinkStorageState(link, "sent", storage);
}

export function markIdentityLinkRetryAfter(link: Pick<GuestUserIdentityLink, "identityLinkId">, storage?: Storage | null) {
  writeIdentityLinkStorageState(link, `retry_after:${Date.now() + IDENTITY_LINK_FAILURE_RETRY_TTL_MS}`, storage);
}

export function buildIdentityLinkPayload(input: {
  guestId: string;
  userId: string;
  sessionId: string;
  linkedAt?: string | null;
  reason?: string | null;
  consentState?: AnalyticsConsentState;
  eligiblePastSessionIds?: string[];
}) {
  const link = buildIdentityLink(input);
  const payload = {
    ...link,
    consentState: input.consentState ?? "unknown",
    eligiblePastSessionIds: Array.from(new Set([link.sessionId, ...(input.eligiblePastSessionIds ?? [])])).filter(Boolean),
  };

  return {
    ...payload,
    async submit(fetcher: Fetcher, storage?: Storage | null): Promise<IdentityLinkSubmitResult> {
      markIdentityLinkSubmitted(link, storage);
      try {
        const response = await fetcher(GUEST_USER_IDENTITY_TRANSFER_ROUTE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || body?.success !== true) {
          markIdentityLinkRetryAfter(link, storage);
          return {
            success: false,
            loginBlocking: false,
            retryable: false,
            reason: typeof body?.reason === "string" ? body.reason : `identity_link_http_${response.status}`,
          };
        }

        markIdentityLinkSucceeded(link, storage);
        return {
          success: true,
          identityLinkId: typeof body.identityLinkId === "string" ? body.identityLinkId : link.identityLinkId,
          created: body.created === true,
          identityState: "guest_linked_to_user",
          loginBlocking: false,
          retryable: false,
        };
      } catch {
        markIdentityLinkRetryAfter(link, storage);
        return {
          success: false,
          loginBlocking: false,
          retryable: false,
          reason: "identity_link_submit_failed",
        };
      }
    },
  };
}
