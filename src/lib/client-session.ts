"use client";

const CLIENT_SESSION_STORAGE_KEY = "kandydrops.clientSession";
const CLIENT_SUBJECT_STORAGE_KEY = "kandydrops.clientSubject";

function generateId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
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

export function getClientSessionId() {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = readStorageValue(CLIENT_SESSION_STORAGE_KEY, false);
  if (existing) {
    return existing;
  }

  const nextValue = generateId("sess");
  writeStorageValue(CLIENT_SESSION_STORAGE_KEY, nextValue, false);
  return nextValue;
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
