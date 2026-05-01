import {
  buildRefreshCacheKey,
  getDisplaySnapshot,
  resolveRefreshCacheDisplayState,
  type RefreshCacheDisplayState,
} from "@/lib/cache/refresh-cache-contract";

export const ADMIN_METRIC_SNAPSHOT_SCHEMA_VERSION = "admin_metric_snapshot_v1";
export const ADMIN_METRIC_SNAPSHOT_MAX_AGE_MS = 5 * 60 * 1000;
export const ADMIN_METRIC_SNAPSHOT_STALE_AGE_MS = 30 * 60 * 1000;

export const ADMIN_METRIC_SNAPSHOT_RANGES = ["24h", "7d", "14d", "30d", "all"] as const;
export type AdminMetricSnapshotRange = (typeof ADMIN_METRIC_SNAPSHOT_RANGES)[number];

export const ADMIN_METRIC_SNAPSHOT_SOURCE_MODES = [
  "live",
  "verified_cache",
  "stale_cache",
  "intraday",
  "estimated",
  "fallback",
  "unavailable",
  "mixed",
] as const;
export type AdminMetricSnapshotSourceMode = (typeof ADMIN_METRIC_SNAPSHOT_SOURCE_MODES)[number];

export const ADMIN_METRIC_SNAPSHOT_TRUTH_STATES = [
  "verified",
  "stale",
  "partial",
  "unavailable",
  "failed",
  "refreshing",
] as const;
export type AdminMetricSnapshotTruthState = (typeof ADMIN_METRIC_SNAPSHOT_TRUTH_STATES)[number];

export const ADMIN_METRIC_SNAPSHOT_REFRESH_STATUSES = [
  "idle",
  "queued",
  "refreshing",
  "completed",
  "failed",
  "duplicate_prevented",
  "unavailable",
] as const;
export type SnapshotRefreshStatus = (typeof ADMIN_METRIC_SNAPSHOT_REFRESH_STATUSES)[number];

export type SnapshotWarningSeverity = "info" | "warn" | "fail";
export type SnapshotParityStatus = "pass" | "warn" | "fail" | "unavailable" | "unknown";

export interface SnapshotWarning {
  code: string;
  message: string;
  severity: SnapshotWarningSeverity;
  source?: string | null;
}

export interface SnapshotParityResult {
  key: string;
  label: string;
  status: SnapshotParityStatus;
  expectedSource: string;
  comparedSource: string;
  expectedValue?: number | string | null;
  comparedValue?: number | string | null;
  drift?: number | null;
  formula?: string | null;
  fakeZeroPrevented?: boolean;
  details?: string | null;
}

export interface SnapshotRefreshState {
  refreshStatus: SnapshotRefreshStatus;
  refreshStartedAt: string | null;
  refreshCompletedAt: string | null;
  refreshFailedAt?: string | null;
  refreshError?: string | null;
  duplicateRefreshPrevented: boolean;
}

export interface AdminMetricSnapshotValue<T = unknown> {
  value: T | null;
  available: boolean;
  source: string;
  sourceMode: AdminMetricSnapshotSourceMode;
  serverConfirmed: boolean;
  stale: boolean;
  estimated: boolean;
  fallback: boolean;
  fakeZeroPrevented: boolean;
  unavailableReason?: string | null;
}

export type AdminMetricSnapshotValues = Record<string, AdminMetricSnapshotValue>;

export interface AdminMetricSnapshot<TValues extends AdminMetricSnapshotValues = AdminMetricSnapshotValues> extends SnapshotRefreshState {
  schemaVersion: typeof ADMIN_METRIC_SNAPSHOT_SCHEMA_VERSION;
  cacheKey: string;
  surfaceKey: string;
  moduleKey: string;
  rangeKey: AdminMetricSnapshotRange;
  values: TValues;
  sourceBreakdown: Record<string, unknown>;
  formulas: Record<string, string>;
  confidence: number;
  truthState: AdminMetricSnapshotTruthState;
  sourceMode: AdminMetricSnapshotSourceMode;
  generatedAt: string;
  lastVerifiedAt: string | null;
  expiresAt: string | null;
  maxAgeMs: number;
  warnings: SnapshotWarning[];
  parity: SnapshotParityResult[];
  legacyIncluded: boolean;
  legacyConfidence: "high" | "medium" | "low" | "directional" | "unknown" | null;
  debugPath: string;
  staleReason?: string | null;
  unavailableReason?: string | null;
  lastRefreshRequestedAt: string | null;
  lastRefreshStartedAt: string | null;
  lastRefreshCompletedAt: string | null;
  lastRefreshFailedAt?: string | null;
  refreshVersion: number;
  sourceVersion: string;
  invalidationReason?: string | null;
  estimatedFlags: Record<string, unknown>;
  legacyFlags: Record<string, unknown>;
}

export function isAdminMetricSnapshotRange(value: string): value is AdminMetricSnapshotRange {
  return ADMIN_METRIC_SNAPSHOT_RANGES.includes(value as AdminMetricSnapshotRange);
}

export function normalizeAdminMetricSnapshotRange(value: string | null | undefined): AdminMetricSnapshotRange {
  return value && isAdminMetricSnapshotRange(value) ? value : "24h";
}

export function buildAdminMetricSnapshotDocId(moduleKey: string, rangeKey: AdminMetricSnapshotRange) {
  return `${moduleKey}:${rangeKey}`.replace(/[^a-zA-Z0-9:_-]+/g, "_");
}

export function buildAdminMetricSnapshotCacheKey(moduleKey: string, rangeKey: AdminMetricSnapshotRange) {
  return buildRefreshCacheKey({
    surfaceKey: "admin_analytics",
    moduleKey,
    rangeKey,
  });
}

export function buildAdminMetricSnapshotDebugPath(moduleKey: string, rangeKey: AdminMetricSnapshotRange) {
  return `/admin/debug?tab=advanced#analytics-snapshots/${moduleKey}/${rangeKey}`;
}

export function createSnapshotValue<T>(input: Partial<AdminMetricSnapshotValue<T>> & {
  value: T | null;
  source: string;
  sourceMode: AdminMetricSnapshotSourceMode;
}): AdminMetricSnapshotValue<T> {
  const available = input.available ?? input.value !== null;
  const serverConfirmed = input.serverConfirmed ?? (input.sourceMode === "verified_cache" || input.sourceMode === "live");
  const fakeZeroPrevented = input.fakeZeroPrevented ?? (input.value === null && !available);

  return {
    value: input.value,
    available,
    source: input.source,
    sourceMode: input.sourceMode,
    serverConfirmed,
    stale: input.stale ?? input.sourceMode === "stale_cache",
    estimated: input.estimated ?? input.sourceMode === "estimated",
    fallback: input.fallback ?? input.sourceMode === "fallback",
    fakeZeroPrevented,
    unavailableReason: input.unavailableReason ?? null,
  };
}

export function createUnavailableAdminMetricSnapshot(input: {
  moduleKey: string;
  rangeKey: AdminMetricSnapshotRange;
  reason: string;
  generatedAt?: string;
  sourceBreakdown?: Record<string, unknown>;
  warnings?: SnapshotWarning[];
  parity?: SnapshotParityResult[];
}): AdminMetricSnapshot {
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  return {
    schemaVersion: ADMIN_METRIC_SNAPSHOT_SCHEMA_VERSION,
    cacheKey: buildAdminMetricSnapshotCacheKey(input.moduleKey, input.rangeKey),
    surfaceKey: "admin_analytics",
    moduleKey: input.moduleKey,
    rangeKey: input.rangeKey,
    values: {
      module: createSnapshotValue({
        value: null,
        available: false,
        source: "materializer_registry",
        sourceMode: "unavailable",
        serverConfirmed: false,
        fakeZeroPrevented: true,
        unavailableReason: input.reason,
      }),
    },
    sourceBreakdown: input.sourceBreakdown ?? {
      materializer: "unavailable",
      reason: input.reason,
    },
    formulas: {},
    confidence: 0,
    truthState: "unavailable",
    sourceMode: "unavailable",
    generatedAt,
    lastVerifiedAt: null,
    expiresAt: null,
    maxAgeMs: ADMIN_METRIC_SNAPSHOT_MAX_AGE_MS,
    refreshStatus: "unavailable",
    refreshStartedAt: null,
    refreshCompletedAt: null,
    refreshFailedAt: null,
    duplicateRefreshPrevented: false,
    lastRefreshRequestedAt: null,
    lastRefreshStartedAt: null,
    lastRefreshCompletedAt: null,
    lastRefreshFailedAt: null,
    refreshVersion: 0,
    sourceVersion: generatedAt,
    invalidationReason: null,
    estimatedFlags: {},
    legacyFlags: {
      legacyIncluded: false,
    },
    warnings: input.warnings ?? [
      {
        code: "snapshot_unavailable",
        message: input.reason,
        severity: "warn",
        source: "materializer_registry",
      },
    ],
    parity: input.parity ?? [
      {
        key: "source_availability",
        label: "Source availability",
        status: "unavailable",
        expectedSource: "verified module materializer",
        comparedSource: "none",
        fakeZeroPrevented: true,
        details: input.reason,
      },
    ],
    legacyIncluded: false,
    legacyConfidence: null,
    debugPath: buildAdminMetricSnapshotDebugPath(input.moduleKey, input.rangeKey),
    unavailableReason: input.reason,
  };
}

export function normalizeAdminMetricSnapshotRefreshFields(snapshot: AdminMetricSnapshot): AdminMetricSnapshot {
  const lastRefreshStartedAt = snapshot.lastRefreshStartedAt ?? snapshot.refreshStartedAt ?? null;
  const lastRefreshCompletedAt = snapshot.lastRefreshCompletedAt ?? snapshot.refreshCompletedAt ?? null;
  const lastRefreshFailedAt = snapshot.lastRefreshFailedAt ?? snapshot.refreshFailedAt ?? null;
  const estimatedFlags = Object.fromEntries(
    Object.entries(snapshot.values ?? {})
      .filter(([, metric]) => metric.estimated === true)
      .map(([key]) => [key, true]),
  );

  return {
    ...snapshot,
    cacheKey: snapshot.cacheKey ?? buildAdminMetricSnapshotCacheKey(snapshot.moduleKey, snapshot.rangeKey),
    surfaceKey: snapshot.surfaceKey ?? "admin_analytics",
    lastRefreshRequestedAt: snapshot.lastRefreshRequestedAt ?? lastRefreshStartedAt,
    lastRefreshStartedAt,
    lastRefreshCompletedAt,
    lastRefreshFailedAt,
    refreshVersion: Number.isFinite(snapshot.refreshVersion) ? snapshot.refreshVersion : 0,
    sourceVersion: snapshot.sourceVersion ?? snapshot.lastVerifiedAt ?? snapshot.generatedAt ?? "unverified",
    invalidationReason: snapshot.invalidationReason ?? null,
    estimatedFlags: snapshot.estimatedFlags ?? estimatedFlags,
    legacyFlags: snapshot.legacyFlags ?? {
      legacyIncluded: snapshot.legacyIncluded,
      legacyConfidence: snapshot.legacyConfidence,
    },
  };
}

export function getAdminMetricDisplaySnapshot(snapshot: AdminMetricSnapshot | null | undefined) {
  return getDisplaySnapshot(snapshot ? normalizeAdminMetricSnapshotRefreshFields(snapshot) : null);
}

export function resolveAdminMetricRefreshCacheDisplayState(
  snapshot: AdminMetricSnapshot | null | undefined,
): RefreshCacheDisplayState {
  return resolveRefreshCacheDisplayState(snapshot ? normalizeAdminMetricSnapshotRefreshFields(snapshot) : null);
}

export function isAdminMetricSnapshotFresh(snapshot: Pick<AdminMetricSnapshot, "expiresAt" | "lastVerifiedAt">, nowMs = Date.now()) {
  const expiresAtMs = snapshot.expiresAt ? Date.parse(snapshot.expiresAt) : 0;
  return Boolean(snapshot.lastVerifiedAt && Number.isFinite(expiresAtMs) && expiresAtMs > nowMs);
}

export function resolveAdminMetricSnapshotSourceMode(snapshot: AdminMetricSnapshot, nowMs = Date.now()): AdminMetricSnapshotSourceMode {
  if (snapshot.sourceMode === "live" || snapshot.sourceMode === "intraday") {
    return snapshot.sourceMode;
  }

  if (snapshot.truthState === "unavailable") {
    return "unavailable";
  }

  if (snapshot.truthState === "failed") {
    return "fallback";
  }

  return isAdminMetricSnapshotFresh(snapshot, nowMs) ? "verified_cache" : "stale_cache";
}

export function shouldPreventSnapshotRefreshStorm(input: {
  refreshStatus?: string | null;
  refreshStartedAt?: string | null;
  nowMs?: number;
  lockTtlMs?: number;
}) {
  if (input.refreshStatus !== "refreshing") {
    return false;
  }

  const startedAtMs = input.refreshStartedAt ? Date.parse(input.refreshStartedAt) : 0;
  const nowMs = input.nowMs ?? Date.now();
  const lockTtlMs = input.lockTtlMs ?? 2 * 60 * 1000;

  return Number.isFinite(startedAtMs) && startedAtMs > 0 && nowMs - startedAtMs < lockTtlMs;
}

export function validateAdminMetricSnapshot(snapshot: AdminMetricSnapshot) {
  const issues: string[] = [];
  if (snapshot.schemaVersion !== ADMIN_METRIC_SNAPSHOT_SCHEMA_VERSION) {
    issues.push("Snapshot schemaVersion is invalid.");
  }
  if (!snapshot.moduleKey) {
    issues.push("Snapshot moduleKey is missing.");
  }
  if (!snapshot.cacheKey) {
    issues.push("Snapshot cacheKey is missing.");
  }
  if (!snapshot.surfaceKey) {
    issues.push("Snapshot surfaceKey is missing.");
  }
  if (!isAdminMetricSnapshotRange(snapshot.rangeKey)) {
    issues.push("Snapshot rangeKey is invalid.");
  }
  if (!ADMIN_METRIC_SNAPSHOT_SOURCE_MODES.includes(snapshot.sourceMode)) {
    issues.push("Snapshot sourceMode is invalid.");
  }
  if (!ADMIN_METRIC_SNAPSHOT_TRUTH_STATES.includes(snapshot.truthState)) {
    issues.push("Snapshot truthState is invalid.");
  }
  if (snapshot.truthState === "verified" && !snapshot.lastVerifiedAt) {
    issues.push("Verified snapshots must include lastVerifiedAt.");
  }
  if (!Number.isFinite(snapshot.refreshVersion) || snapshot.refreshVersion < 0) {
    issues.push("Snapshot refreshVersion is invalid.");
  }
  if (!snapshot.sourceVersion) {
    issues.push("Snapshot sourceVersion is missing.");
  }

  Object.entries(snapshot.values).forEach(([key, metric]) => {
    if (metric.value === 0 && metric.available === false) {
      issues.push(`Metric ${key} renders a zero while unavailable.`);
    }
    if (metric.value === null && metric.fakeZeroPrevented !== true) {
      issues.push(`Metric ${key} is unavailable without fakeZeroPrevented=true.`);
    }
  });

  return issues;
}
