const MAX_CLIENT_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000;
const MAX_CLIENT_TIMESTAMP_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ANALYTICS_STORAGE_KEY_LENGTH = 180;

export const ANALYTICS_EVENT_ID_PATTERN = /^evt_[A-Za-z0-9:_-]{16,160}$/u;
export const ANALYTICS_BATCH_ID_PATTERN = /^batch_[A-Za-z0-9:_-]{16,160}$/u;
export const ANALYTICS_WATCH_SESSION_ID_PATTERN = /^watch_[A-Za-z0-9:_-]{16,160}$/u;

function normalizeSessionFragment(sessionId: string) {
  return sessionId.replace(/[^A-Za-z0-9:_-]+/gu, "").slice(-32) || "session";
}

function buildRandomFragment() {
  const randomValue = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().replace(/-/g, "")
    : Math.random().toString(36).slice(2, 18);

  return randomValue.slice(0, 32);
}

function buildIdentifier(prefix: "evt" | "batch" | "watch", sessionId: string) {
  const sessionFragment = normalizeSessionFragment(sessionId);
  const timeFragment = Date.now().toString(36);
  const randomFragment = buildRandomFragment();
  return `${prefix}_${sessionFragment}_${timeFragment}_${randomFragment}`;
}

function normalizeStorageFragment(value: string) {
  return value.replace(/[^A-Za-z0-9_-]+/gu, "_").slice(-80) || "key";
}

export function createAnalyticsEventId(sessionId: string) {
  return buildIdentifier("evt", sessionId);
}

export function createAnalyticsBatchId(sessionId: string) {
  return buildIdentifier("batch", sessionId);
}

export function createAnalyticsWatchSessionId(sessionId: string) {
  return buildIdentifier("watch", sessionId);
}

export function createAnalyticsStorageKey(prefix: string, ...parts: string[]) {
  return [normalizeStorageFragment(prefix), ...parts.map(normalizeStorageFragment)]
    .join("_")
    .slice(0, MAX_ANALYTICS_STORAGE_KEY_LENGTH) || normalizeStorageFragment(prefix);
}

export function isValidAnalyticsEventId(value: unknown): value is string {
  return typeof value === "string" && ANALYTICS_EVENT_ID_PATTERN.test(value);
}

export function isValidAnalyticsBatchId(value: unknown): value is string {
  return typeof value === "string" && ANALYTICS_BATCH_ID_PATTERN.test(value);
}

export function isValidAnalyticsWatchSessionId(value: unknown): value is string {
  return typeof value === "string" && ANALYTICS_WATCH_SESSION_ID_PATTERN.test(value);
}

export function normalizeAnalyticsClientTimestamp(value: unknown, fallbackMs = Date.now()) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallbackMs;
  }

  const normalized = Math.trunc(value);
  const nowMs = Date.now();
  if (normalized < nowMs - MAX_CLIENT_TIMESTAMP_AGE_MS) {
    return fallbackMs;
  }

  if (normalized > nowMs + MAX_CLIENT_TIMESTAMP_DRIFT_MS) {
    return fallbackMs;
  }

  return normalized;
}
