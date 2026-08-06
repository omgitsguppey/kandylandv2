export const NAV_SESSION_COOKIE = "kandydrops_nav_session";
export const NAV_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const MAINTENANCE_ADMIN_SESSION_COOKIE = "kandydrops_maintenance_admin";
export const MAINTENANCE_ADMIN_SESSION_MAX_AGE_SECONDS = 15 * 60;
export type NavigationSessionRole = "admin" | "creator" | "user";
export type NavigationSessionState = "default" | "creator_waitlist";

const VALID_NAV_ROLES = new Set<NavigationSessionRole>(["admin", "creator", "user"]);
const VALID_NAV_STATES = new Set<NavigationSessionState>(["default", "creator_waitlist"]);
const UID_COOKIE_PATTERN = /^[A-Za-z0-9:_-]{8,128}$/u;
const MAINTENANCE_ADMIN_SESSION_PURPOSE = "maintenance_admin";

function getNavigationSessionSecret() {
  const secret = process.env.NAVIGATION_COOKIE_SECRET;

  return secret?.trim() || "";
}

function bytesToBase64Url(bytes: Uint8Array) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64url");
  }

  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function base64UrlToBytes(value: string) {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64url"));
  }

  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeBase64Url(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function decodeBase64Url(value: string) {
  try {
    return new TextDecoder().decode(base64UrlToBytes(value));
  } catch {
    return "";
  }
}

async function getNavigationSessionKey() {
  const secret = getNavigationSessionSecret();
  if (!secret) {
    return null;
  }

  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signNavigationSessionPayload(payload: string) {
  const key = await getNavigationSessionKey();
  if (!key) {
    return "";
  }

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function verifyNavigationSessionPayload(payload: string, signature: string) {
  const key = await getNavigationSessionKey();
  if (!key) {
    return false;
  }

  try {
    const signatureBytes = base64UrlToBytes(signature);
    if (bytesToBase64Url(signatureBytes) !== signature) {
      return false;
    }

    return await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      new TextEncoder().encode(payload),
    );
  } catch {
    return false;
  }
}

export async function createNavigationSessionCookieValue(
  uid: string,
  role: NavigationSessionRole,
  state: NavigationSessionState = "default",
) {
  if (!UID_COOKIE_PATTERN.test(uid) || !VALID_NAV_ROLES.has(role) || !VALID_NAV_STATES.has(state)) {
    return null;
  }

  const expiresAtMs = Date.now() + (NAV_SESSION_MAX_AGE_SECONDS * 1000);
  const payload = `${uid}.${role}.${state}.${expiresAtMs}`;
  const signature = await signNavigationSessionPayload(payload);
  if (!signature) {
    return null;
  }

  return `${encodeBase64Url(payload)}.${signature}`;
}

export async function verifyNavigationSessionCookieValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const payload = decodeBase64Url(encodedPayload);
  if (!payload) {
    return null;
  }

  if (encodeBase64Url(payload) !== encodedPayload) {
    return null;
  }

  const [uid, role, state, expiresAtRaw] = payload.split(".");
  if (!uid || !role || !state || !expiresAtRaw) {
    return null;
  }

  if (
    !UID_COOKIE_PATTERN.test(uid)
    || !VALID_NAV_ROLES.has(role as NavigationSessionRole)
    || !VALID_NAV_STATES.has(state as NavigationSessionState)
  ) {
    return null;
  }

  const expiresAtMs = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    return null;
  }

  if (!(await verifyNavigationSessionPayload(payload, signature))) {
    return null;
  }

  return {
    uid,
    role: role as NavigationSessionRole,
    state: state as NavigationSessionState,
    expiresAtMs,
  };
}

export async function createMaintenanceAdminSessionCookieValue(uid: string): Promise<string | null> {
  if (!UID_COOKIE_PATTERN.test(uid)) {
    return null;
  }

  const expiresAt = Date.now() + (MAINTENANCE_ADMIN_SESSION_MAX_AGE_SECONDS * 1000);
  const payload = `${MAINTENANCE_ADMIN_SESSION_PURPOSE}.${uid}.${expiresAt}`;
  const signature = await signNavigationSessionPayload(payload);
  if (!signature) {
    return null;
  }

  return `${encodeBase64Url(payload)}.${signature}`;
}

export async function verifyMaintenanceAdminSessionCookieValue(
  value: string | undefined,
): Promise<{ uid: string; expiresAt: number } | null> {
  if (!value) {
    return null;
  }

  const parts = value.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) {
    return null;
  }

  const payload = decodeBase64Url(encodedPayload);
  if (!payload) {
    return null;
  }

  const [purpose, uid, expiresAtRaw] = payload.split(".");
  if (purpose !== MAINTENANCE_ADMIN_SESSION_PURPOSE || !uid || !expiresAtRaw) {
    return null;
  }

  if (!UID_COOKIE_PATTERN.test(uid)) {
    return null;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) {
    return null;
  }

  if (!(await verifyNavigationSessionPayload(payload, signature))) {
    return null;
  }

  return { uid, expiresAt };
}
