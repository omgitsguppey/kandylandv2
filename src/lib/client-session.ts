"use client";

const CLIENT_SESSION_STORAGE_KEY = "kandy_session_id";
const LEGACY_CLIENT_SESSION_STORAGE_KEY = "kandydrops.clientSession";
const CLIENT_SESSION_OWNER_STORAGE_KEY = "kandydrops.clientSessionOwner";
const CLIENT_SUBJECT_STORAGE_KEY = "kandydrops.clientSubject";

function generateId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buffer = new Uint8Array(12);
    crypto.getRandomValues(buffer);
    const token = Array.from(buffer)
      .map((b) => b.toString(36).padStart(2, "0"))
      .join("")
      .slice(0, 16);
    return `${prefix}_${Date.now().toString(36)}_${token}`;
  }

  throw new Error("Secure random number generation is not supported in this environment.");
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
    && isAuthenticatedActor(previousOwner),
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
