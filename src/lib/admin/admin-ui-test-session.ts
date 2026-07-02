import type { User, UserInfo } from "firebase/auth";

import { CONSENT_TRACKING_VERSION } from "@/lib/privacy/consent-tracking-contract";
import type { UserProfile } from "@/types/db";

export const ADMIN_UI_TEST_SESSION_STORAGE_KEY = "kandydrops.admin_ui_test_session.v1";
export const ADMIN_UI_TEST_SESSION_COOKIE_KEY = "kandydrops_admin_ui_test_session_v1";
export const ADMIN_UI_TEST_SESSION_ENV_FLAG = "NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION";
export const ADMIN_UI_TEST_SESSION_LOCAL_EXE_FLAG = "KANDYDROPS_LOCAL_EXE";
export const ADMIN_UI_TEST_SESSION_QUERY_PARAM = "adminUiTestSession";
export const ADMIN_UI_TEST_SESSION_BOOTSTRAP_PATH = "/api/admin-ui-test-session";
const DEFAULT_QUERY_SESSION_TTL_MS = 30 * 60 * 1000;

export type AdminUiTestSessionStatus =
  | "disabled"
  | "missing"
  | "invalid"
  | "expired"
  | "ready";

export type AdminUiTestSessionResolution = {
  status: AdminUiTestSessionStatus;
  reason: string;
  user: User | null;
  userProfile: UserProfile | null;
};

type RawAdminUiTestSession = {
  enabled?: unknown;
  uid?: unknown;
  email?: unknown;
  displayName?: unknown;
  expiresAt?: unknown;
  role?: unknown;
};

type NormalizedAdminUiTestSession = {
  uid: string;
  email: string;
  displayName: string;
  expiresAt: number;
};

export function buildAdminUiTestSessionStorageValue(input: {
  nowMs?: number;
  ttlMs?: number;
  uid?: string;
  email?: string;
  displayName?: string;
} = {}) {
  const nowMs = input.nowMs ?? Date.now();
  return JSON.stringify({
    enabled: true,
    role: "admin",
    uid: cleanString(input.uid, "admin-ui-smoke"),
    email: cleanString(input.email, "admin-ui-smoke@example.invalid"),
    displayName: cleanString(input.displayName, "Admin UI Smoke"),
    expiresAt: nowMs + (input.ttlMs ?? DEFAULT_QUERY_SESSION_TTL_MS),
  });
}

function cleanString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function readStoredAdminUiTestSessionValue() {
  try {
    return window.localStorage?.getItem(ADMIN_UI_TEST_SESSION_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeStoredAdminUiTestSessionValue(value: string) {
  try {
    window.localStorage?.setItem(ADMIN_UI_TEST_SESSION_STORAGE_KEY, value);
  } catch {
    // Storage can be unavailable in hardened local browser contexts; the query bootstrap still works for this page.
  }
}

export function normalizeAdminUiTestSessionCookieValue(rawValue: string | null | undefined) {
  if (!rawValue) {
    return null;
  }

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

export function isAdminUiTestSessionRuntimeEnabled(input: {
  nodeEnv?: string;
  envFlag?: string;
  localExeMode?: string;
} = {}) {
  const nodeEnv = input.nodeEnv ?? process.env.NODE_ENV;
  const envFlag = input.envFlag ?? process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION;
  const localExeMode = input.localExeMode ?? process.env.KANDYDROPS_LOCAL_EXE;
  return envFlag === "1" && (nodeEnv !== "production" || localExeMode === "test");
}

export function isAdminUiTestSessionUser(user: { providerData?: Array<{ providerId?: string | null }> } | null | undefined) {
  return user?.providerData?.some((provider) => provider.providerId === "admin-ui-test-session") === true;
}

function buildAdminUiTestUser(session: NormalizedAdminUiTestSession): User {
  const providerData: UserInfo = {
    providerId: "admin-ui-test-session",
    uid: session.uid,
    displayName: session.displayName,
    email: session.email,
    phoneNumber: null,
    photoURL: null,
  };
  const tokenError = new Error("Admin UI test session cannot issue Firebase ID tokens.");

  return {
    uid: session.uid,
    email: session.email,
    displayName: session.displayName,
    photoURL: null,
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: new Date(session.expiresAt - 60 * 60 * 1000).toISOString(),
      lastSignInTime: new Date().toISOString(),
    },
    phoneNumber: null,
    providerData: [providerData],
    providerId: "firebase",
    refreshToken: "",
    tenantId: null,
    delete: async () => {
      throw tokenError;
    },
    getIdToken: async () => {
      throw tokenError;
    },
    getIdTokenResult: async () => {
      throw tokenError;
    },
    reload: async () => undefined,
    toJSON: () => ({
      uid: session.uid,
      providerId: "admin-ui-test-session",
      source: "local_admin_ui_test_session",
    }),
  } as User;
}

function buildAdminUiTestProfile(session: NormalizedAdminUiTestSession): UserProfile {
  return {
    uid: session.uid,
    email: session.email,
    displayName: session.displayName,
    username: "admin-ui-smoke",
    photoURL: null,
    role: "admin",
    gumDropsBalance: 0,
    gumDropsPurchasedBalance: 0,
    gumDropsRewardBalance: 0,
    unlockedContent: [],
    createdAt: session.expiresAt - 60 * 60 * 1000,
    status: "active",
    onboardingCompleted: true,
    privacySettings: {
      consentMode: "minimal_analytics",
      consentDecision: "minimal",
      consentSource: "account_settings",
      consentPolicyVersion: CONSENT_TRACKING_VERSION,
      anonymousAnalyticsEnabled: true,
      identifiedAnalyticsEnabled: false,
      allowRecommendations: false,
      showInAnonymousStats: false,
      honorGlobalPrivacyControl: true,
      consentUpdatedAt: session.expiresAt - 60 * 60 * 1000,
    },
    accountSettings: {
      timezone: "UTC",
    },
  };
}

export function resolveAdminUiTestSession(input: {
  rawValue?: string | null;
  nowMs?: number;
  nodeEnv?: string;
  envFlag?: string;
  localExeMode?: string;
}): AdminUiTestSessionResolution {
  if (!isAdminUiTestSessionRuntimeEnabled({
    nodeEnv: input.nodeEnv,
    envFlag: input.envFlag,
    localExeMode: input.localExeMode,
  })) {
    return {
      status: "disabled",
      reason: `${ADMIN_UI_TEST_SESSION_ENV_FLAG} is not enabled outside production.`,
      user: null,
      userProfile: null,
    };
  }

  if (!input.rawValue?.trim()) {
    return {
      status: "missing",
      reason: `${ADMIN_UI_TEST_SESSION_STORAGE_KEY} is not present.`,
      user: null,
      userProfile: null,
    };
  }

  let parsed: RawAdminUiTestSession;
  try {
    parsed = JSON.parse(input.rawValue) as RawAdminUiTestSession;
  } catch {
    return {
      status: "invalid",
      reason: "Admin UI test session storage is not valid JSON.",
      user: null,
      userProfile: null,
    };
  }

  if (parsed.enabled !== true || parsed.role !== "admin") {
    return {
      status: "invalid",
      reason: "Admin UI test session must be explicitly enabled for role admin.",
      user: null,
      userProfile: null,
    };
  }

  const nowMs = input.nowMs ?? Date.now();
  const expiresAt = typeof parsed.expiresAt === "number" ? parsed.expiresAt : Number(parsed.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) {
    return {
      status: "expired",
      reason: "Admin UI test session is expired.",
      user: null,
      userProfile: null,
    };
  }

  const session: NormalizedAdminUiTestSession = {
    uid: cleanString(parsed.uid, "admin-ui-smoke"),
    email: cleanString(parsed.email, "admin-ui-smoke@example.invalid"),
    displayName: cleanString(parsed.displayName, "Admin UI Smoke"),
    expiresAt,
  };

  return {
    status: "ready",
    reason: "Local admin UI test session is ready.",
    user: buildAdminUiTestUser(session),
    userProfile: buildAdminUiTestProfile(session),
  };
}

export function readAdminUiTestSession(): AdminUiTestSessionResolution {
  if (typeof window === "undefined") {
    return {
      status: "missing",
      reason: "Admin UI test session is only available in the browser.",
      user: null,
      userProfile: null,
    };
  }

  const querySessionRequested = new URLSearchParams(window.location.search).get(ADMIN_UI_TEST_SESSION_QUERY_PARAM) === "1";
  const storedValue = readStoredAdminUiTestSessionValue();
  const runtimeEnabled = isAdminUiTestSessionRuntimeEnabled();
  const storedResolution = storedValue && runtimeEnabled
    ? resolveAdminUiTestSession({ rawValue: storedValue })
    : null;
  const querySessionValue = querySessionRequested && runtimeEnabled && storedResolution?.status !== "ready"
    ? buildAdminUiTestSessionStorageValue()
    : null;

  if (querySessionValue) {
    writeStoredAdminUiTestSessionValue(querySessionValue);
  }

  return resolveAdminUiTestSession({
    rawValue: querySessionValue ?? storedValue,
  });
}

export function clearAdminUiTestSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.removeItem(ADMIN_UI_TEST_SESSION_STORAGE_KEY);
  } catch {
    // Best-effort cleanup only; unavailable storage cannot retain the fixture session.
  }
  try {
    window.document.cookie = `${ADMIN_UI_TEST_SESSION_COOKIE_KEY}=; Max-Age=0; path=/; SameSite=Lax`;
  } catch {
    // Best-effort cleanup only; unavailable cookies cannot retain the fixture session.
  }
}
