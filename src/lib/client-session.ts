"use client";

import type { AnalyticsConsentState, AnalyticsEventSourceLane } from "@/lib/analytics/analytics-event-contract";
import { buildGuestUserIdentityLinkId } from "@/lib/analytics/analytics-identity-link";

const CLIENT_SESSION_STORAGE_KEY = "kandy_session_id";
const LEGACY_CLIENT_SESSION_STORAGE_KEY = "kandydrops.clientSession";
const CLIENT_SESSION_OWNER_STORAGE_KEY = "kandydrops.clientSessionOwner";
const CLIENT_SUBJECT_STORAGE_KEY = "kandydrops.clientSubject";
const CLIENT_IDENTITY_LINK_STORAGE_KEY = "kandydrops.identityLink";

function buildSecureRandomFragment() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buffer = new Uint8Array(16);
    crypto.getRandomValues(buffer);
    return Array.from(buffer)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  throw new Error("Cryptographically secure random number generation is not available in this environment.");
}

function generateId(prefix: string) {
  const randomFragment = buildSecureRandomFragment();
  if (randomFragment.includes("-")) {
    return `${prefix}_${randomFragment}`;
  }

  return `${prefix}_${Date.now().toString(36)}_${randomFragment}`;
}

function readStorageValue(storageKey: string, persistent: boolean) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storage = persistent ? window.localStorage : window.sessionStorage;
    return storage.getItem(storageKey);
  } catch {
    return null;
  }
}

function writeStorageValue(storageKey: string, value: string, persistent: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const storage = persistent ? window.localStorage : window.sessionStorage;
    storage.setItem(storageKey, value);
  } catch {
    // Ignore storage failures in restricted contexts.
  }
}

function clearStorageValue(storageKey: string, persistent: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const storage = persistent ? window.localStorage : window.sessionStorage;
    storage.removeItem(storageKey);
  } catch {
    // Ignore storage failures in restricted contexts.
  }
}

export function getClientSessionId() {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = readStorageValue(CLIENT_SESSION_STORAGE_KEY, false)
    ?? readStorageValue(LEGACY_CLIENT_SESSION_STORAGE_KEY, false);
  if (existing) {
    if (!readStorageValue(CLIENT_SESSION_STORAGE_KEY, false)) {
      writeStorageValue(CLIENT_SESSION_STORAGE_KEY, existing, false);
    }
    if (readStorageValue(LEGACY_CLIENT_SESSION_STORAGE_KEY, false)) {
      clearStorageValue(LEGACY_CLIENT_SESSION_STORAGE_KEY, false);
    }
    return existing;
  }

  const nextValue = generateId("sess");
  writeStorageValue(CLIENT_SESSION_STORAGE_KEY, nextValue, false);
  return nextValue;
}

function readClientSessionOwner() {
  return readStorageValue(CLIENT_SESSION_OWNER_STORAGE_KEY, false);
}

function writeClientSessionOwner(ownerKey: string | null) {
  if (!ownerKey) {
    clearStorageValue(CLIENT_SESSION_OWNER_STORAGE_KEY, false);
    return;
  }

  writeStorageValue(CLIENT_SESSION_OWNER_STORAGE_KEY, ownerKey, false);
}

function isAuthenticatedActor(actorKey: string | null) {
  return Boolean(actorKey && actorKey.startsWith("user:"));
}

export function syncClientSessionOwnership(actorKey: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  const previousOwner = readClientSessionOwner();
  const previousSessionId = getClientSessionId();
  const shouldRotateSession = Boolean(
    previousOwner
    && previousOwner !== actorKey
    && isAuthenticatedActor(previousOwner)
    && isAuthenticatedActor(actorKey),
  );

  if (shouldRotateSession) {
    writeStorageValue(CLIENT_SESSION_STORAGE_KEY, generateId("sess"), false);
  } else if (!readStorageValue(CLIENT_SESSION_STORAGE_KEY, false)) {
    writeStorageValue(CLIENT_SESSION_STORAGE_KEY, previousSessionId, false);
  }

  writeClientSessionOwner(actorKey);
}

export function getClientSubjectId() {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = readStorageValue(CLIENT_SUBJECT_STORAGE_KEY, true)
    ?? readStorageValue(CLIENT_SUBJECT_STORAGE_KEY, false);
  if (existing) {
    if (!readStorageValue(CLIENT_SUBJECT_STORAGE_KEY, true)) {
      writeStorageValue(CLIENT_SUBJECT_STORAGE_KEY, existing, true);
    }
    return existing;
  }

  const nextValue = generateId("subject");
  writeStorageValue(CLIENT_SUBJECT_STORAGE_KEY, nextValue, true);
  writeStorageValue(CLIENT_SUBJECT_STORAGE_KEY, nextValue, false);
  return nextValue;
}

export function canPersistAnalyticsIdentity(consentState: AnalyticsConsentState | null | undefined) {
  return consentState !== "denied";
}

export function getAnonymousVisitorId(consentState: AnalyticsConsentState = "unknown") {
  if (!canPersistAnalyticsIdentity(consentState)) {
    return null;
  }

  return getClientSubjectId();
}

export interface ClientAnalyticsIdentitySnapshot {
  anonymousVisitorId: string | null;
  sessionId: string;
  consentState: AnalyticsConsentState;
  identityPersistenceAllowed: boolean;
}

export function getClientAnalyticsIdentitySnapshot(
  consentState: AnalyticsConsentState = "unknown",
): ClientAnalyticsIdentitySnapshot {
  const identityPersistenceAllowed = canPersistAnalyticsIdentity(consentState);

  return {
    anonymousVisitorId: identityPersistenceAllowed ? getAnonymousVisitorId(consentState) : null,
    sessionId: getClientSessionId(),
    consentState,
    identityPersistenceAllowed,
  };
}

export interface ClientIdentityLinkRecord {
  anonymousVisitorId: string | null;
  sessionId: string;
  userId: string;
  identityLinkId?: string;
  linkedAt: string;
  method: "login" | "signup" | "session_restore" | "admin_link" | "import" | "unknown";
  eligiblePastSessionIds: string[];
  source: AnalyticsEventSourceLane;
  consentState: AnalyticsConsentState;
  persisted: boolean;
}

export function buildClientIdentityLinkRecord(input: {
  userId: string;
  method: ClientIdentityLinkRecord["method"];
  consentState?: AnalyticsConsentState;
  linkedAt?: string;
  eligiblePastSessionIds?: string[];
  source?: AnalyticsEventSourceLane;
}): ClientIdentityLinkRecord {
  const consentState = input.consentState ?? "unknown";
  const identity = getClientAnalyticsIdentitySnapshot(consentState);
  const identityLinkId = identity.anonymousVisitorId
    ? buildGuestUserIdentityLinkId({
      guestId: identity.anonymousVisitorId,
      sessionId: identity.sessionId,
      userId: input.userId,
    })
    : undefined;

  return {
    anonymousVisitorId: identity.anonymousVisitorId,
    sessionId: identity.sessionId,
    userId: input.userId,
    identityLinkId,
    linkedAt: input.linkedAt ?? new Date().toISOString(),
    method: input.method,
    eligiblePastSessionIds: input.eligiblePastSessionIds ?? [identity.sessionId],
    source: input.source ?? "client",
    consentState,
    persisted: identity.identityPersistenceAllowed,
  };
}

export function rememberClientIdentityLink(record: ClientIdentityLinkRecord) {
  if (typeof window === "undefined" || !record.persisted) {
    return;
  }

  writeStorageValue(CLIENT_IDENTITY_LINK_STORAGE_KEY, JSON.stringify(record), false);
}

export function readClientIdentityLinkRecord(): ClientIdentityLinkRecord | null {
  const stored = readStorageValue(CLIENT_IDENTITY_LINK_STORAGE_KEY, false);
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as ClientIdentityLinkRecord;
    return parsed && typeof parsed.userId === "string" && typeof parsed.sessionId === "string" ? parsed : null;
  } catch {
    return null;
  }
}
