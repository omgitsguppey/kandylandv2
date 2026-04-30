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
    duplicateRefreshPrevented: false,
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
