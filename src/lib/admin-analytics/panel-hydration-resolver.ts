import { ADMIN_ANALYTICS_PANEL_HYDRATION_REGISTRY } from "./panel-hydration-registry";
import type { EventLivenessStatus } from "@/lib/analytics/event-liveness-contract";
import { listEventTranslationBridgeCanonicalEvents } from "@/lib/analytics/event-translation-bridge";
import { PERSON_METRIC_IDS } from "@/lib/analytics/person-metrics-contract";
import type {
  PersonMetricHydrationStatus,
  PersonMetricsEvidenceMode,
  PersonMetricUserParityStatus,
} from "@/lib/analytics/person-metrics-hydration";
import type {
  AdminAnalyticsPanelHydrationRecord,
  AdminAnalyticsPanelHydrationStatus,
  AdminAnalyticsPanelRuntimeSignal,
  AnalyticsPanelHydrationDebugLane,
  AnalyticsPanelHydrationReport,
} from "./panel-hydration-contract";

type JsonRecord = Record<string, unknown>;

export type ResolveAnalyticsPanelHydrationInput = {
  generatedAtUtc?: string;
  currentHead?: string;
  scoreDimensions?: Record<string, number>;
  eventLivenessAudit?: JsonRecord | null;
  personMetricsHydration?: JsonRecord | null;
  userJourneyBehavioralIntelligence?: JsonRecord | null;
  debugRuntimeEvidence?: JsonRecord | null;
  finalReleasePacket?: JsonRecord | null;
  runtimeSignals?: readonly AdminAnalyticsPanelRuntimeSignal[];
  dirtyFiles?: readonly { path: string; classification: string }[];
};

const ACTIONABLE_STATUSES = new Set<AdminAnalyticsPanelHydrationStatus>([
  "source_missing",
  "materializer_missing",
  "producer_missing",
  "bridge_missing",
  "permission_blocked",
  "not_configured",
  "broken",
]);

const CANONICAL_BRIDGE_EVENT_NAMES = new Set(
  listEventTranslationBridgeCanonicalEvents().map((event) => event.eventName),
);

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

const FULL_COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/u;
const MAX_PERSISTED_EVIDENCE_AGE_MS = 24 * 60 * 60 * 1000;
const PERSON_METRIC_ID_SET = new Set<string>(PERSON_METRIC_IDS);
const PERSON_METRIC_BOUNDED_RUNTIME_SOURCES = new Set(["redacted_admin_runtime_sample"]);
const PERSON_METRIC_EVIDENCE_MODES = new Set<PersonMetricsEvidenceMode>([
  "source_validation_fixture",
  "bounded_runtime_sample",
  "runtime_evidence_required",
]);
const PERSON_METRIC_STATES = new Set(["hydrated", "collecting", "unavailable"]);
const PERSON_PARITY_STATES = new Set([
  "hydrated",
  "collecting",
  "source_missing",
  "bridge_missing",
  "materializer_missing",
  "permission_blocked",
  "proven_zero",
]);
const BLOCKING_PERSON_STATES = new Set([
  "permission_blocked",
  "materializer_missing",
  "bridge_missing",
  "source_missing",
]);
const EVENT_LIVENESS_STATES = new Set<EventLivenessStatus>([
  "observed_recently",
  "observed_stale",
  "not_observed_but_expected",
  "not_observed_and_not_expected",
  "source_ready_waiting_for_activity",
  "source_missing",
  "materializer_missing",
  "translation_missing",
  "hydration_missing",
  "disabled_intentionally",
  "future_only_quiet",
  "provider_required",
  "protected_payment_required",
]);
const RUNTIME_WINDOW_MS = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  none: Number.POSITIVE_INFINITY,
} as const;

type PersonMetricsEvidenceState = "absent" | "rejected" | PersonMetricsEvidenceMode;
type PersonMetricsEvidenceAssessment = {
  state: PersonMetricsEvidenceState;
  compact: boolean;
};
type EventEvidenceState = "absent" | "trusted" | "rejected";

function parseTimestamp(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function referenceTimeMs(_generatedAtUtc?: string) {
  return Date.now();
}

function isFreshNonfutureTimestamp(value: unknown, evaluatedAtMs: number, maxAgeMs = MAX_PERSISTED_EVIDENCE_AGE_MS) {
  const timestamp = parseTimestamp(value);
  return timestamp !== null
    && timestamp <= evaluatedAtMs
    && evaluatedAtMs - timestamp <= maxAgeMs;
}

function isCompactList(value: unknown) {
  const record = asRecord(value);
  const sample = asArray(record.sample);
  return Number.isInteger(record.total)
    && Number(record.total) >= 0
    && Number.isInteger(record.emitted)
    && Number(record.emitted) >= 0
    && Number.isInteger(record.omitted)
    && Number(record.omitted) >= 0
    && sample.length === Number(record.emitted)
    && Number(record.emitted) + Number(record.omitted) === Number(record.total);
}

function isKnownMetricId(value: unknown): value is string {
  return typeof value === "string" && PERSON_METRIC_ID_SET.has(value);
}

function isUniqueKnownMetricIdList(value: unknown) {
  const values = asArray(value);
  return values.every(isKnownMetricId) && new Set(values).size === values.length;
}

function compactRowsHaveUniqueMetricIds(value: unknown) {
  const metricIds = asArray(value).map((row) => stringValue(asRecord(row).metricId));
  return metricIds.every(Boolean) && new Set(metricIds).size === metricIds.length;
}

function compactMetricRowIsValid(value: unknown) {
  const row = asRecord(value);
  const resolved = Number(row.count) > 0 || row.provenZero === true;
  return isKnownMetricId(row.metricId)
    && PERSON_METRIC_STATES.has(String(row.state ?? ""))
    && Number.isInteger(row.count)
    && Number(row.count) >= 0
    && typeof row.provenZero === "boolean"
    && (row.state === "hydrated") === resolved;
}

function compactParityRowIsValid(value: unknown, requireBlocking = false) {
  const row = asRecord(value);
  if (!isKnownMetricId(row.metricId)
    || !PERSON_PARITY_STATES.has(String(row.state ?? ""))
    || typeof row.blocksUserParity !== "boolean") return false;
  if (requireBlocking && (row.blocksUserParity !== true || !BLOCKING_PERSON_STATES.has(String(row.state ?? "")))) return false;
  return ["globalCount", "guestCount", "signedInCount", "linkedPersonCount", "creatorRoleCount"]
    .every((field) => Number.isInteger(row[field]) && Number(row[field]) >= 0);
}

function sameIndexedMetricRow(leftValue: unknown, rightValue: unknown) {
  const left = asRecord(leftValue);
  const right = asRecord(rightValue);
  return left.metricId === right.metricId
    && left.state === right.state
    && left.count === right.count
    && left.provenZero === right.provenZero
    && left.blocksUserParity === right.blocksUserParity;
}

function compactScopeRowsAreValid(report: JsonRecord) {
  const scopes = asArray(report.scopes).map(asRecord);
  const requiredScopes = new Set(["global", "guest", "signedIn", "linkedPerson", "creatorRole"]);
  if (scopes.length !== requiredScopes.size || new Set(scopes.map((scope) => scope.scope)).size !== requiredScopes.size) return false;
  if (scopes.some((scope) =>
    !requiredScopes.has(String(scope.scope ?? ""))
    || !Number.isInteger(scope.totalCount)
    || Number(scope.totalCount) < 0
    || !Number.isInteger(scope.lowConfidenceCount)
    || Number(scope.lowConfidenceCount) < 0
    || Number(scope.lowConfidenceCount) > Number(scope.totalCount)
    || scope.metricCount !== PERSON_METRIC_IDS.length
    || !isUniqueKnownMetricIdList(scope.hydratedMetricIds)
    || !isUniqueKnownMetricIdList(scope.provenZeroMetricIds)
    || asArray(scope.hydratedMetricIds).some((metricId) => asArray(scope.provenZeroMetricIds).includes(metricId)))) return false;

  const scopeByName = new Map(scopes.map((scope) => [String(scope.scope), scope]));
  const globalHydrated = new Set(asArray(scopeByName.get("global")?.hydratedMetricIds));
  const globalProvenZero = new Set(asArray(scopeByName.get("global")?.provenZeroMetricIds));
  const signedInHydrated = new Set(asArray(scopeByName.get("signedIn")?.hydratedMetricIds));
  const linkedHydrated = new Set(asArray(scopeByName.get("linkedPerson")?.hydratedMetricIds));
  if ([...signedInHydrated, ...linkedHydrated].some((metricId) => !globalHydrated.has(metricId))) return false;

  const consumer = asRecord(report.consumerMetricStatus);
  const consumerRows = Object.entries(asRecord(consumer.byId));
  const parityGapsById = asRecord(asRecord(report.userParityGaps).byId);
  return consumerRows.every(([metricId, value]) => {
    const row = asRecord(value);
    const globallyResolved = globalHydrated.has(metricId) || globalProvenZero.has(metricId);
    if (row.metricId !== metricId) return false;
    if ((row.state === "hydrated") !== globallyResolved) return false;
    if (!globalHydrated.has(metricId) || signedInHydrated.has(metricId) || linkedHydrated.has(metricId)) return true;
    return compactParityRowIsValid(parityGapsById[metricId], true);
  });
}

function compactPersonMetricsArtifactIsValid(report: JsonRecord, input: ResolveAnalyticsPanelHydrationInput) {
  if (report.reportKey !== "person-metrics-hydration"
    || (report.status !== "pass" && report.status !== "review")
    || !PERSON_METRIC_EVIDENCE_MODES.has(report.evidenceMode as PersonMetricsEvidenceMode)
    || !Array.isArray(report.validationFailures)
    || report.validationFailures.length > 0
    || typeof report.passed !== "boolean"
    || report.passed !== (report.status === "pass")
    || typeof report.canClearSourceGate !== "boolean"
    || typeof report.canClearRuntimeGate !== "boolean"
    || typeof report.canClearProviderGate !== "boolean"
    || typeof report.canClearAdminTruthGate !== "boolean"
    || report.canClearProviderGate !== false
    || report.canClearAdminTruthGate !== false
    || !FULL_COMMIT_SHA_PATTERN.test(String(report.currentHead ?? ""))
    || report.sourceCommit !== report.currentHead
    || (FULL_COMMIT_SHA_PATTERN.test(input.currentHead ?? "") && report.currentHead !== input.currentHead)
    || !isFreshNonfutureTimestamp(report.generatedAtUtc, referenceTimeMs(input.generatedAtUtc))
    || report.fakeMetricsUsed !== (report.evidenceMode === "source_validation_fixture")
    || asRecord(report.compaction).fullReportValidatedInMemory !== true
    || !isCompactList(report.metricStatus)
    || !isCompactList(report.consumerMetricStatus)
    || !isCompactList(report.userParityStatus)
    || !isCompactList(report.userParityGaps)) return false;

  if (report.evidenceMode === "source_validation_fixture"
    && (report.canClearRuntimeGate !== false || report.canClearSourceGate !== report.passed)) return false;
  if (report.evidenceMode === "bounded_runtime_sample"
    && (report.evidenceClass !== "runtime_redacted" || report.canClearRuntimeGate !== true)) return false;
  if (report.evidenceMode === "runtime_evidence_required" && report.canClearRuntimeGate !== false) return false;

  const metricStatus = asRecord(report.metricStatus);
  const consumerStatus = asRecord(report.consumerMetricStatus);
  const parityStatus = asRecord(report.userParityStatus);
  const parityGaps = asRecord(report.userParityGaps);
  if (metricStatus.total !== PERSON_METRIC_IDS.length
    || consumerStatus.total !== PERSON_METRIC_IDS.length
    || parityStatus.total !== PERSON_METRIC_IDS.length
    || !compactRowsHaveUniqueMetricIds(metricStatus.sample)
    || !compactRowsHaveUniqueMetricIds(consumerStatus.sample)
    || !compactRowsHaveUniqueMetricIds(parityStatus.sample)
    || !compactRowsHaveUniqueMetricIds(parityGaps.sample)
    || !asArray(metricStatus.sample).every(compactMetricRowIsValid)
    || !asArray(consumerStatus.sample).every(compactMetricRowIsValid)
    || !asArray(parityStatus.sample).every((row) => compactParityRowIsValid(row))
    || !asArray(parityGaps.sample).every((row) => compactParityRowIsValid(row, true))) return false;

  const consumerById = Object.entries(asRecord(consumerStatus.byId));
  if (consumerById.length !== Number(consumerStatus.emitted)
    || consumerById.some(([metricId, value]) =>
      !isKnownMetricId(metricId)
      || asRecord(value).metricId !== metricId
      || !compactMetricRowIsValid(value))
    || asArray(consumerStatus.sample).some((row) => {
      const metricId = stringValue(asRecord(row).metricId);
      return !metricId || !sameIndexedMetricRow(row, asRecord(consumerStatus.byId)[metricId]);
    })) return false;

  if (asArray(metricStatus.sample).some((row) => {
    const metricId = stringValue(asRecord(row).metricId);
    const consumerRow = metricId ? asRecord(consumerStatus.byId)[metricId] : null;
    return consumerRow ? !sameIndexedMetricRow(row, consumerRow) : false;
  })) return false;

  const gapsById = Object.entries(asRecord(parityGaps.byId));
  if (gapsById.length !== Number(parityGaps.total)
    || gapsById.some(([metricId, value]) =>
      asRecord(value).metricId !== metricId || !compactParityRowIsValid(value, true))
    || asArray(parityGaps.sample).some((row) => {
      const metricId = stringValue(asRecord(row).metricId);
      return !metricId || !sameIndexedMetricRow(row, asRecord(parityGaps.byId)[metricId]);
    })) return false;


  if (asArray(parityStatus.sample).some((row) => {
    const metricId = stringValue(asRecord(row).metricId);
    const gap = metricId ? asRecord(parityGaps.byId)[metricId] : null;
    return gap ? !sameIndexedMetricRow(row, gap) : false;
  })) return false;

  return compactScopeRowsAreValid(report);
}

function boundedRuntimeWindowIsValid(report: JsonRecord, evaluatedAtMs: number) {
  const window = asRecord(report.boundedRuntimeWindow);
  const startedAt = parseTimestamp(window.startedAtUtc);
  const endedAt = parseTimestamp(window.endedAtUtc);
  return startedAt !== null
    && endedAt !== null
    && startedAt <= endedAt
    && endedAt <= evaluatedAtMs
    && evaluatedAtMs - endedAt <= MAX_PERSISTED_EVIDENCE_AGE_MS
    && PERSON_METRIC_BOUNDED_RUNTIME_SOURCES.has(String(window.source ?? ""));
}

function personMetricsEvidenceState(
  personMetricsHydration: JsonRecord | null | undefined,
  input: ResolveAnalyticsPanelHydrationInput,
): PersonMetricsEvidenceAssessment {
  if (personMetricsHydration == null) return { state: "absent", compact: false };
  const report = asRecord(personMetricsHydration);
  if (Object.keys(report).length === 0) return { state: "rejected", compact: false };

  const compactArtifact = asRecord(report.compaction).fullReportValidatedInMemory === true
    || "currentHead" in report
    || "sourceCommit" in report
    || isCompactList(report.metricStatus)
    || isCompactList(report.userParityStatus)
    || isCompactList(report.userParityGaps);
  if (compactArtifact) {
    if (!compactPersonMetricsArtifactIsValid(report, input)) return { state: "rejected", compact: true };
    if (report.evidenceMode === "bounded_runtime_sample"
      && !boundedRuntimeWindowIsValid(report, referenceTimeMs(input.generatedAtUtc))) return { state: "rejected", compact: true };
    return { state: report.evidenceMode as PersonMetricsEvidenceMode, compact: true };
  }

  const evidenceMode = report.evidenceMode as PersonMetricsEvidenceMode;
  const fullInMemoryReport = report.reportKey === "person-metrics-hydration"
    && (report.status === "pass" || report.status === "review")
    && PERSON_METRIC_EVIDENCE_MODES.has(evidenceMode)
    && report.fakeMetricsUsed === (evidenceMode === "source_validation_fixture")
    && Array.isArray(report.userParityGaps)
    && Object.keys(asRecord(report.metricStatus)).length > 0
    && Object.keys(asRecord(report.userParityStatus)).length > 0
    && Object.keys(asRecord(report.scopes)).length > 0;
  if (!fullInMemoryReport) return { state: "rejected", compact: false };
  if (evidenceMode === "bounded_runtime_sample"
    && (report.evidenceClass !== "runtime_redacted"
      || report.canClearRuntimeGate !== true
      || !boundedRuntimeWindowIsValid(report, referenceTimeMs(input.generatedAtUtc)))) return { state: "rejected", compact: false };
  return { state: evidenceMode, compact: false };
}

function compactRecordRows(value: unknown) {
  const direct = Array.isArray(value) ? value.map(asRecord) : [];
  const record = asRecord(value);
  const sampled = asArray(record.sample).map(asRecord);
  const indexed = Object.values(asRecord(record.byId)).map(asRecord);
  const legacyKeyed = Object.values(record)
    .map(asRecord)
    .filter((row) => typeof row.metricId === "string" || typeof row.scope === "string");
  const rows = [...direct, ...sampled, ...indexed, ...legacyKeyed];
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = stringValue(row.metricId) ?? stringValue(row.scope);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rowsByMetricId(...values: unknown[]) {
  return new Map(
    values
      .flatMap(compactRecordRows)
      .map((row) => [stringValue(row.metricId), row] as const)
      .filter((entry): entry is [string, JsonRecord] => Boolean(entry[0])),
  );
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function runtimeSignalMap(signals: readonly AdminAnalyticsPanelRuntimeSignal[] = []) {
  return new Map(signals.map((signal) => [signal.panelId, signal]));
}

function eventClassifications(eventLivenessAudit?: JsonRecord | null) {
  return asArray(eventLivenessAudit?.classifications).map(asRecord);
}

function eventEvidenceState(
  eventLivenessAudit: JsonRecord | null | undefined,
  input: ResolveAnalyticsPanelHydrationInput,
): EventEvidenceState {
  if (eventLivenessAudit == null) return "absent";
  const report = asRecord(eventLivenessAudit);
  const classifications = eventClassifications(report);
  if (classifications.some((entry) =>
    !stringValue(entry.eventName)
    || !EVENT_LIVENESS_STATES.has(entry.livenessStatus as EventLivenessStatus))) return "rejected";

  const hasVerdictOrProvenance = "status" in report
    || "currentHead" in report
    || "sourceCommit" in report;
  if (!hasVerdictOrProvenance) return "trusted";
  if (report.reportKey !== "event-liveness-audit"
    || report.status !== "pass"
    || !Array.isArray(report.classifications)
    || !Array.isArray(report.validationFailures)
    || report.validationFailures.length > 0
    || !FULL_COMMIT_SHA_PATTERN.test(String(report.currentHead ?? ""))
    || !FULL_COMMIT_SHA_PATTERN.test(String(report.sourceCommit ?? ""))
    || report.sourceCommit !== report.currentHead
    || (FULL_COMMIT_SHA_PATTERN.test(input.currentHead ?? "") && report.currentHead !== input.currentHead)
    || !isFreshNonfutureTimestamp(report.generatedAtUtc, referenceTimeMs(input.generatedAtUtc))) return "rejected";
  return "trusted";
}

function eventStatusFor(
  panel: { expectedEvents: string[]; expectedRecentWindow: "1h" | "24h" | "7d" | "none" },
  eventLivenessAudit: JsonRecord | null | undefined,
  evidenceState: EventEvidenceState,
  evaluatedAtMs: number,
): EventLivenessStatus | null {
  if (evidenceState !== "trusted") return null;
  const events = eventClassifications(eventLivenessAudit).filter((entry) =>
    panel.expectedEvents.includes(String(entry.eventName ?? "")),
  );
  if (events.length === 0) return null;
  for (const status of [
    "protected_payment_required",
    "provider_required",
    "source_missing",
    "translation_missing",
    "hydration_missing",
    "materializer_missing",
    "observed_stale",
  ] as const) {
    if (events.some((entry) => entry.livenessStatus === status)) return status;
  }
  const recentlyObserved = events.filter((entry) => entry.livenessStatus === "observed_recently");
  if (recentlyObserved.length > 0) {
    const observedTimestamps = recentlyObserved
      .map((entry) => parseTimestamp(entry.lastSeenAtUtc))
      .filter((timestamp): timestamp is number => timestamp !== null);
    if (observedTimestamps.length === 0) return "hydration_missing";
    const expectedWindowMs = RUNTIME_WINDOW_MS[panel.expectedRecentWindow];
    if (observedTimestamps.some((timestamp) =>
      timestamp <= evaluatedAtMs && evaluatedAtMs - timestamp <= expectedWindowMs)) return "observed_recently";
    return "observed_stale";
  }
  if (events.some((entry) => entry.livenessStatus === "not_observed_but_expected")) return "not_observed_but_expected";
  if (events.some((entry) => entry.livenessStatus === "source_ready_waiting_for_activity")) return "source_ready_waiting_for_activity";
  if (events.every((entry) => entry.livenessStatus === "not_observed_and_not_expected")) return "not_observed_and_not_expected";
  return events[0]?.livenessStatus as EventLivenessStatus | null;
}

function lastSeenFor(panel: { expectedEvents: string[] }, eventLivenessAudit?: JsonRecord | null) {
  const seen = eventClassifications(eventLivenessAudit)
    .filter((entry) => panel.expectedEvents.includes(String(entry.eventName ?? "")))
    .map((entry) => stringValue(entry.lastSeenAtUtc))
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => Date.parse(right) - Date.parse(left));
  return seen[0] ?? null;
}

function parityStateFor(panel: { personMetricIds: string[] }, personMetricsHydration?: JsonRecord | null): PersonMetricUserParityStatus["state"] | null {
  const userParityStatus = rowsByMetricId(personMetricsHydration?.userParityStatus);
  const parityGaps = rowsByMetricId(personMetricsHydration?.userParityGaps);
  const metrics = panel.personMetricIds
    .map((metricId) => parityGaps.get(metricId) ?? userParityStatus.get(metricId))
    .filter((metric): metric is JsonRecord => Boolean(metric)) as Array<Partial<PersonMetricUserParityStatus>>;
  if (metrics.some((metric) => metric.state === "permission_blocked")) return "permission_blocked";
  if (metrics.some((metric) => metric.state === "materializer_missing")) return "materializer_missing";
  if (metrics.some((metric) => metric.state === "bridge_missing")) return "bridge_missing";
  if (metrics.some((metric) => metric.state === "source_missing")) return "source_missing";
  if (metrics.some((metric) => metric.state === "hydrated")) return "hydrated";
  if (metrics.some((metric) => metric.state === "proven_zero")) return "proven_zero";
  if (metrics.some((metric) => metric.state === "collecting")) return "collecting";
  return null;
}

function metricStatusFor(
  panel: { personMetricIds: string[] },
  personMetricsHydration: JsonRecord | null | undefined,
  evidence: PersonMetricsEvidenceAssessment,
): PersonMetricHydrationStatus["state"] | PersonMetricUserParityStatus["state"] | "bridge_missing" | "source_missing" | null {
  if (evidence.state === "absent" || evidence.state === "rejected" || evidence.state === "runtime_evidence_required") return null;
  const parityState = parityStateFor(panel, personMetricsHydration);
  if (parityState && BLOCKING_PERSON_STATES.has(parityState)) return parityState;
  if (parityState === "hydrated" || parityState === "proven_zero") {
    return evidence.state === "bounded_runtime_sample" ? parityState : "collecting";
  }
  if (parityState === "collecting") return "collecting";

  const metricStatus = rowsByMetricId(
    personMetricsHydration?.metricStatus,
    personMetricsHydration?.consumerMetricStatus,
  );
  const metrics = panel.personMetricIds
    .map((metricId) => metricStatus.get(metricId))
    .filter((metric): metric is JsonRecord => Boolean(metric)) as Array<Partial<PersonMetricHydrationStatus>>;
  if (metrics.some((metric) => stringValue(metric.missingBridge))) return "bridge_missing";
  if (metrics.some((metric) => stringValue(metric.missingProducer))) return "source_missing";
  if (metrics.some((metric) => metric.provenZero === true)) {
    return evidence.state === "bounded_runtime_sample" ? "proven_zero" : "collecting";
  }
  if (metrics.some((metric) => metric.state === "hydrated")) {
    return evidence.state === "bounded_runtime_sample" ? "hydrated" : "collecting";
  }
  if (metrics.some((metric) => metric.state === "collecting")) return "collecting";
  return null;
}

function hasCanonicalBridgeSource(panel: { expectedEvents: string[] }) {
  return panel.expectedEvents.some((eventName) => CANONICAL_BRIDGE_EVENT_NAMES.has(eventName));
}

function statusFromDelegatedSources(input: {
  statusFromRuntime: AdminAnalyticsPanelHydrationStatus | null;
  statusFromEvent: EventLivenessStatus | null;
  statusFromMetric: ReturnType<typeof metricStatusFor>;
  sourceType: string;
  expectedDaily: boolean;
  panelGroup: string;
  hasCanonicalBridgeSource: boolean;
  hasPersonMetrics: boolean;
  personEvidenceState: PersonMetricsEvidenceState;
  eventEvidenceState: EventEvidenceState;
}): AdminAnalyticsPanelHydrationStatus {
  if (input.sourceType === "external_required") {
    if (input.panelGroup === "gumdrops") return "protected_payment_required";
    return input.panelGroup === "payments" ? "provider_gated" : "external_required";
  }
  if (input.statusFromMetric === "permission_blocked") return "permission_blocked";
  if (input.statusFromMetric === "materializer_missing") return "materializer_missing";
  if (input.statusFromMetric === "bridge_missing") return "bridge_missing";
  if (input.statusFromMetric === "source_missing") return "source_missing";
  if (input.statusFromEvent === "source_missing") return "source_missing";
  if (input.statusFromEvent === "translation_missing" || input.statusFromEvent === "hydration_missing") return "bridge_missing";
  if (input.statusFromEvent === "materializer_missing") return "materializer_missing";
  if (input.statusFromEvent === "observed_stale") return "stale";
  if (input.statusFromEvent === "provider_required") return "provider_gated";
  if (input.statusFromEvent === "protected_payment_required") return "protected_payment_required";
  if (input.statusFromRuntime === "permission_blocked" || input.statusFromRuntime === "broken" || input.statusFromRuntime === "source_missing" || input.statusFromRuntime === "stale") {
    return input.statusFromRuntime;
  }
  if ((input.hasPersonMetrics && input.personEvidenceState === "rejected") || input.eventEvidenceState === "rejected") {
    return "runtime_evidence_required";
  }
  if (input.statusFromRuntime) return input.statusFromRuntime;
  if (input.statusFromEvent === "observed_recently") {
    return input.hasPersonMetrics && input.personEvidenceState !== "bounded_runtime_sample"
      ? "runtime_evidence_required"
      : "hydrated";
  }
  if (input.statusFromEvent === "not_observed_but_expected") return "not_observed_but_expected";
  if (input.statusFromEvent === "source_ready_waiting_for_activity") return "source_ready_waiting_for_activity";
  if (input.statusFromMetric === "hydrated") return "hydrated";
  if (input.statusFromMetric === "proven_zero") return "hydrated";
  if (input.statusFromMetric === "collecting") return "collecting";
  if (input.hasPersonMetrics && input.personEvidenceState === "runtime_evidence_required") return "runtime_evidence_required";
  if (input.hasPersonMetrics && input.personEvidenceState === "bounded_runtime_sample" && input.statusFromMetric === null) {
    return "runtime_evidence_required";
  }
  if (input.sourceType === "route_runtime_sample" || input.sourceType === "debug_runtime_evidence") return "runtime_evidence_required";
  if (input.sourceType === "admin_summary") return "admin_truth_source_required";
  if (input.hasCanonicalBridgeSource) return input.expectedDaily ? "not_observed_but_expected" : "source_ready_waiting_for_activity";
  return "source_missing";
}

function runtimeStatus(
  signal: AdminAnalyticsPanelRuntimeSignal | undefined,
  panel: { expectedRecentWindow: "1h" | "24h" | "7d" | "none" },
  evaluatedAtMs: number,
): AdminAnalyticsPanelHydrationStatus | null {
  if (!signal) return null;
  if (signal.permissionBlocked) return "permission_blocked";
  if (signal.error) return "broken";
  const lastSeenAtMs = parseTimestamp(signal.lastSeenAt);
  if (signal.hasData || signal.provenZero) {
    if (signal.sourceLoaded === false) return "broken";
    if (signal.sourceLoaded !== true) return "runtime_evidence_required";
    if (lastSeenAtMs === null || lastSeenAtMs > evaluatedAtMs) return "runtime_evidence_required";
    const maxAgeMs = RUNTIME_WINDOW_MS[panel.expectedRecentWindow];
    if (evaluatedAtMs - lastSeenAtMs > maxAgeMs) return "stale";
    return "hydrated";
  }
  if (signal.sourceLoaded === false) return "source_missing";
  if (signal.sourceLoaded === true) {
    const maxAgeMs = RUNTIME_WINDOW_MS[panel.expectedRecentWindow];
    if (lastSeenAtMs !== null && (lastSeenAtMs > evaluatedAtMs || evaluatedAtMs - lastSeenAtMs > maxAgeMs)) return "stale";
    return "collecting";
  }
  return null;
}

function displayStateFor(status: AdminAnalyticsPanelHydrationStatus): AdminAnalyticsPanelHydrationRecord["userSafeDisplayState"] {
  if (status === "hydrated") return "show_value";
  if (status === "collecting") return "show_collecting";
  if (status === "source_ready_waiting_for_activity") return "show_collecting";
  if (status === "not_observed_but_expected") return "show_no_recent_activity";
  if (status === "stale") return "show_stale";
  if (status === "external_required" || status === "provider_gated" || status === "protected_payment_required") return "show_external_required";
  if (status === "runtime_evidence_required" || status === "admin_truth_source_required") return "show_not_connected";
  if (status === "hidden_by_role") return "show_hidden";
  if (status === "permission_blocked") return "show_permission_blocked";
  if (status === "broken") return "show_broken";
  return "show_not_connected";
}

function confidenceFor(status: AdminAnalyticsPanelHydrationStatus): AdminAnalyticsPanelHydrationRecord["confidence"] {
  if (status === "hydrated") return "exact";
  if (status === "stale") return "linked";
  if (status === "collecting") return "inferred";
  if (status === "source_ready_waiting_for_activity") return "inferred";
  if (status === "not_observed_but_expected") return "inferred";
  if (status === "external_required" || status === "runtime_evidence_required" || status === "admin_truth_source_required" || status === "provider_gated" || status === "protected_payment_required") return "unknown";
  if (ACTIONABLE_STATUSES.has(status)) return "unknown";
  return "weak";
}

function contributionFor(status: AdminAnalyticsPanelHydrationStatus): AdminAnalyticsPanelHydrationRecord["liveEvidenceContribution"] {
  if (status === "hydrated") return "clears_live_evidence";
  if (status === "collecting" || status === "source_ready_waiting_for_activity" || status === "not_observed_but_expected") return "source_exists_collecting";
  if (status === "stale") return "stale_not_live";
  if (status === "external_required" || status === "runtime_evidence_required" || status === "admin_truth_source_required" || status === "provider_gated" || status === "protected_payment_required") return "formal_evidence_required";
  return "actionable_gap";
}

export function classifyPanelEmptyReason(input: {
  status: AdminAnalyticsPanelHydrationStatus;
  panelLabel: string;
  expectedSource: string;
}) {
  switch (input.status) {
    case "hydrated":
      return `${input.panelLabel} has hydrated source data.`;
    case "stale":
      return `${input.panelLabel} has source data, but freshness is outside the expected window.`;
    case "collecting":
      return `${input.panelLabel} has a connected source and is collecting; do not display zero until a bounded source proves zero.`;
    case "source_ready_waiting_for_activity":
      return `${input.panelLabel} has a canonical event/person metric source and is waiting for bounded real activity; runtime evidence remains separate.`;
    case "not_observed_but_expected":
      return `${input.panelLabel} has canonical source mapping but no bounded recent activity for an expected panel.`;
    case "source_missing":
      return `${input.panelLabel} has no safe recent source connected for ${input.expectedSource}.`;
    case "materializer_missing":
      return `${input.panelLabel} has producer evidence but no materializer connected.`;
    case "bridge_missing":
      return `${input.panelLabel} has an event or metric bridge gap before it can hydrate the panel.`;
    case "external_required":
      return `${input.panelLabel} needs a connected source activity record or redacted external record before it can hydrate.`;
    case "runtime_evidence_required":
      return `${input.panelLabel} requires bounded route or debug runtime evidence before it can be treated as hydrated.`;
    case "admin_truth_source_required":
      return `${input.panelLabel} requires a redacted admin truth source sample before it can be treated as hydrated.`;
    case "provider_gated":
      return `${input.panelLabel} needs provider-backed site activity before it can hydrate.`;
    case "protected_payment_required":
      return `${input.panelLabel} requires protected payment/provider ledger evidence and cannot be proven by generic activity.`;
    case "permission_blocked":
      return `${input.panelLabel} is blocked by role or permission state.`;
    case "broken":
      return `${input.panelLabel} has an explicit error and must not be hidden as collecting.`;
    case "producer_missing":
    case "not_configured":
      return `${input.panelLabel} is not connected to a usable producer/configuration.`;
    case "hidden_by_role":
      return `${input.panelLabel} is intentionally hidden for this role; use an authorized role to inspect it.`;
  }
}

export function classifyPanelStaleness(input: { status: AdminAnalyticsPanelHydrationStatus; lastSeenAt: string | null }) {
  if (input.status === "stale") return "stale";
  if (input.status === "hydrated" && parseTimestamp(input.lastSeenAt) !== null) return "fresh";
  return "unknown";
}

export function findPanelSourceBreak(record: Pick<AdminAnalyticsPanelHydrationRecord, "hydrationStatus" | "sourcePath" | "materializerPath" | "expectedSource">) {
  if (record.hydrationStatus === "source_missing" || record.hydrationStatus === "producer_missing") return record.sourcePath;
  if (record.hydrationStatus === "not_observed_but_expected" || record.hydrationStatus === "source_ready_waiting_for_activity") return record.sourcePath;
  if (record.hydrationStatus === "materializer_missing" || record.hydrationStatus === "bridge_missing") return record.materializerPath ?? record.expectedSource;
  if (record.hydrationStatus === "external_required" || record.hydrationStatus === "runtime_evidence_required" || record.hydrationStatus === "admin_truth_source_required" || record.hydrationStatus === "provider_gated" || record.hydrationStatus === "protected_payment_required") return record.expectedSource;
  return null;
}

export function resolvePanelHydration(input: ResolveAnalyticsPanelHydrationInput & { panelId: string }): AdminAnalyticsPanelHydrationRecord {
  const panel = ADMIN_ANALYTICS_PANEL_HYDRATION_REGISTRY.find((entry) => entry.panelId === input.panelId);
  if (!panel) throw new Error(`Unknown admin analytics panel: ${input.panelId}`);
  const signal = runtimeSignalMap(input.runtimeSignals).get(panel.panelId);
  const evaluatedAtMs = referenceTimeMs(input.generatedAtUtc);
  const personEvidence = personMetricsEvidenceState(input.personMetricsHydration, input);
  const eventEvidence = eventEvidenceState(input.eventLivenessAudit, input);
  const statusFromRuntime = runtimeStatus(signal, panel, evaluatedAtMs);
  const statusFromEvent = eventStatusFor(panel, input.eventLivenessAudit, eventEvidence, evaluatedAtMs);
  const statusFromMetric = metricStatusFor(panel, input.personMetricsHydration, personEvidence);
  const canonicalBridgeSource = hasCanonicalBridgeSource(panel);
  const hydrationStatus = statusFromDelegatedSources({
    statusFromRuntime,
    statusFromEvent,
    statusFromMetric,
    sourceType: panel.sourceType,
    expectedDaily: panel.expectedDaily,
    panelGroup: panel.panelGroup,
    hasCanonicalBridgeSource: canonicalBridgeSource,
    hasPersonMetrics: panel.personMetricIds.length > 0,
    personEvidenceState: personEvidence.state,
    eventEvidenceState: eventEvidence,
  });

  const lastSeenAt = signal?.lastSeenAt
    ?? (eventEvidence === "trusted" ? lastSeenFor(panel, input.eventLivenessAudit) : null);
  const freshness = classifyPanelStaleness({ status: hydrationStatus, lastSeenAt });
  const canDisplayZero = hydrationStatus === "hydrated"
    && (signal?.provenZero === true || statusFromMetric === "proven_zero");
  const reason = classifyPanelEmptyReason({
    status: hydrationStatus,
    panelLabel: panel.panelLabel,
    expectedSource: panel.expectedSource,
  });
  const sourceBreak = findPanelSourceBreak({ ...panel, hydrationStatus });
  const nextExactAction = hydrationStatus === "hydrated"
      ? "Keep this panel source fresh and redacted."
    : hydrationStatus === "collecting"
      ? `Keep ${panel.expectedSource} connected; display collecting until the source has recent activity or proven zero.`
      : hydrationStatus === "source_ready_waiting_for_activity"
        ? `Keep ${panel.expectedSource} wired through canonical event/person metric sources; wait for bounded real activity or proven zero.`
        : hydrationStatus === "not_observed_but_expected"
          ? `Keep ${panel.expectedSource} connected; show no recent activity until bounded activity or proven zero exists.`
      : hydrationStatus === "stale"
        ? `Refresh ${panel.expectedSource} and verify the latest materialized timestamp.`
        : hydrationStatus === "runtime_evidence_required"
        ? `Produce bounded route/debug runtime evidence for ${panel.expectedSource}.`
      : hydrationStatus === "admin_truth_source_required"
        ? `Produce a redacted admin source activity sample for ${panel.expectedSource}.`
      : hydrationStatus === "external_required" || hydrationStatus === "provider_gated" || hydrationStatus === "protected_payment_required"
        ? `Produce redacted source activity or external evidence for ${panel.expectedSource}.`
      : hydrationStatus === "hidden_by_role"
        ? `Use an authorized role to inspect ${panel.panelLabel}; do not repair or reconnect its source.`
          : `Repair ${sourceBreak ?? panel.expectedSource} so ${panel.panelLabel} can hydrate.`;

  return {
    ...panel,
    hydrationStatus,
    confidence: confidenceFor(hydrationStatus),
    freshness,
    lastSeenAt,
    nextExactAction,
    userSafeDisplayState: displayStateFor(hydrationStatus),
    reason,
    canDisplayZero,
    liveEvidenceContribution: contributionFor(hydrationStatus),
  };
}

export function resolveAllPanelHydration(input: ResolveAnalyticsPanelHydrationInput = {}) {
  return ADMIN_ANALYTICS_PANEL_HYDRATION_REGISTRY.map((panel) =>
    resolvePanelHydration({ ...input, panelId: panel.panelId }),
  );
}

export function explainPanelHydration(input: AdminAnalyticsPanelHydrationRecord) {
  return `${input.panelLabel}: ${input.hydrationStatus}; ${input.reason} Next: ${input.nextExactAction}`;
}

export function buildPanelHydrationDebugFinding(input: AdminAnalyticsPanelHydrationRecord) {
  return {
    findingId: `analytics_panel_hydration:${input.panelId}`,
    domain: "admin_analytics",
    sourcePath: input.sourcePath,
    owner: input.debugLane,
    severity: input.hydrationStatus === "broken" || input.hydrationStatus === "source_missing" ? "p2" : "p3",
    actionability: input.hydrationStatus === "hydrated" ? "none" : "actionable",
    rootCause: input.reason,
    exactNextAction: input.nextExactAction,
    scoreImpact: input.scoreImpact,
    costImpact: input.costClass,
    accuracyImpact: "prevents empty, stale, or missing analytics from displaying as exact zero",
  };
}

export function buildAnalyticsPanelHydrationDebugLane(panels: readonly AdminAnalyticsPanelHydrationRecord[]): AnalyticsPanelHydrationDebugLane {
  const count = (status: AdminAnalyticsPanelHydrationStatus) => panels.filter((panel) => panel.hydrationStatus === status).length;
  const topNextActions = panels
    .filter((panel) =>
      panel.hydrationStatus !== "hydrated"
      && panel.hydrationStatus !== "collecting"
      && panel.hydrationStatus !== "source_ready_waiting_for_activity"
      && panel.hydrationStatus !== "not_observed_but_expected")
    .slice(0, 10)
    .map((panel) => `${panel.panelLabel}: ${panel.nextExactAction}`);

  return {
    label: "Analytics panel hydration",
    totalPanels: panels.length,
    hydrated: count("hydrated"),
    stale: count("stale"),
    collecting: count("collecting"),
    sourceReadyWaitingForActivity: count("source_ready_waiting_for_activity"),
    notObservedButExpected: count("not_observed_but_expected"),
    sourceMissing: count("source_missing") + count("producer_missing") + count("not_configured"),
    materializerMissing: count("materializer_missing"),
    bridgeMissing: count("bridge_missing"),
    runtimeEvidenceRequired: count("runtime_evidence_required"),
    adminTruthSourceRequired: count("admin_truth_source_required"),
    providerGated: count("provider_gated"),
    protectedPaymentRequired: count("protected_payment_required"),
    externalRequired: count("external_required"),
    permissionBlocked: count("permission_blocked"),
    hiddenByRole: count("hidden_by_role"),
    broken: count("broken"),
    topNextActions,
  };
}

export function buildAnalyticsPanelHydrationReport(input: ResolveAnalyticsPanelHydrationInput = {}): AnalyticsPanelHydrationReport {
  const panels = resolveAllPanelHydration(input);
  const panelStatus = Object.fromEntries(panels.map((panel) => [panel.panelId, panel]));
  const count = (status: AdminAnalyticsPanelHydrationStatus) => panels.filter((panel) => panel.hydrationStatus === status).length;
  const groups = panels.reduce<AnalyticsPanelHydrationReport["panelsByGroup"]>((output, panel) => {
    const existing = output[panel.panelGroup] ?? { total: 0, hydrated: 0, collecting: 0, gaps: 0 };
    existing.total += 1;
    if (panel.hydrationStatus === "hydrated") existing.hydrated += 1;
    if (
      panel.hydrationStatus === "collecting"
      || panel.hydrationStatus === "source_ready_waiting_for_activity"
      || panel.hydrationStatus === "not_observed_but_expected"
    ) existing.collecting += 1;
    if (panel.liveEvidenceContribution === "actionable_gap") existing.gaps += 1;
    output[panel.panelGroup] = existing;
    return output;
  }, {} as AnalyticsPanelHydrationReport["panelsByGroup"]);
  const debugLane = buildAnalyticsPanelHydrationDebugLane(panels);
  const topPanelHydrationFailures = panels
    .filter((panel) =>
      panel.hydrationStatus !== "hydrated"
      && panel.hydrationStatus !== "collecting"
      && panel.hydrationStatus !== "source_ready_waiting_for_activity"
      && panel.hydrationStatus !== "not_observed_but_expected")
    .slice(0, 10);
  const liveEvidenceContribution = {
    contributes: panels.filter((panel) => panel.liveEvidenceContribution === "clears_live_evidence").map((panel) => panel.panelId),
    collecting: panels.filter((panel) => panel.liveEvidenceContribution === "source_exists_collecting").map((panel) => panel.panelId),
    blocked: panels.filter((panel) => panel.liveEvidenceContribution === "actionable_gap" || panel.liveEvidenceContribution === "stale_not_live").map((panel) => panel.panelId),
    runtimeEvidenceRequired: panels.filter((panel) => panel.hydrationStatus === "runtime_evidence_required").map((panel) => panel.panelId),
    adminTruthSourceRequired: panels.filter((panel) => panel.hydrationStatus === "admin_truth_source_required").map((panel) => panel.panelId),
    externalRequired: panels
      .filter((panel) =>
        panel.hydrationStatus === "external_required" ||
        panel.hydrationStatus === "provider_gated" ||
        panel.hydrationStatus === "protected_payment_required")
      .map((panel) => panel.panelId),
    formalEvidenceRequired: panels.filter((panel) => panel.liveEvidenceContribution === "formal_evidence_required").map((panel) => panel.panelId),
  };
  const betaExitReadyBefore = asRecord(input.finalReleasePacket).betaExitReady === true;
  const remainingBlockers = [
    ...liveEvidenceContribution.blocked.map((panelId) => `${panelId}: panel hydration gap`),
    ...liveEvidenceContribution.runtimeEvidenceRequired.map((panelId) => `${panelId}: deployed route evidence required`),
    ...liveEvidenceContribution.adminTruthSourceRequired.map((panelId) => `${panelId}: admin source activity sample required`),
    ...liveEvidenceContribution.externalRequired.map((panelId) => `${panelId}: external source required`),
  ];
  const report: AnalyticsPanelHydrationReport = {
    reportKey: "analytics-panel-hydration",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead ?? "unknown",
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    rawSensitiveDataAllowed: false,
    scoreDimensions: input.scoreDimensions ?? {},
    totalPanels: panels.length,
    hydratedPanels: count("hydrated"),
    stalePanels: count("stale"),
    collectingPanels: count("collecting"),
    sourceReadyWaitingForActivityPanels: count("source_ready_waiting_for_activity"),
    notObservedButExpectedPanels: count("not_observed_but_expected"),
    sourceMissingPanels: count("source_missing") + count("producer_missing") + count("not_configured"),
    materializerMissingPanels: count("materializer_missing"),
    bridgeMissingPanels: count("bridge_missing"),
    runtimeEvidenceRequiredPanels: count("runtime_evidence_required"),
    adminTruthSourceRequiredPanels: count("admin_truth_source_required"),
    providerGatedPanels: count("provider_gated"),
    protectedPaymentRequiredPanels: count("protected_payment_required"),
    externalRequiredPanels: count("external_required"),
    permissionBlockedPanels: count("permission_blocked"),
    hiddenByRolePanels: count("hidden_by_role"),
    brokenPanels: count("broken"),
    panelsByGroup: groups,
    panelStatus,
    topPanelHydrationFailures,
    liveEvidenceContribution,
    betaGateImpact: {
      betaExitReadyBefore,
      betaExitReadyAfter: false,
      remainingBlockers,
    },
    debugLane,
    dirtyFiles: [...(input.dirtyFiles ?? [])],
    nextExactSteps: [
      "Connect safe lastSeen/materialized summaries for source-missing panels.",
      "Keep collecting panels labeled collecting until recent activity or proven zero exists.",
      "Keep payment/provider and billing proof external with redacted evidence.",
      "Expose this hydration lane in Admin Debug tracking summary.",
    ],
    validationFailures: [],
  };
  report.validationFailures = validateAnalyticsPanelHydrationReport(report);
  return report;
}

export function validateAnalyticsPanelHydrationReport(report: AnalyticsPanelHydrationReport) {
  const failures: string[] = [];
  const registryIds = new Set(ADMIN_ANALYTICS_PANEL_HYDRATION_REGISTRY.map((panel) => panel.panelId));
  const panels = Object.values(report.panelStatus ?? {});
  if (report.totalPanels !== registryIds.size) failures.push("admin analytics panel lacks hydration registry entry.");
  if (panels.length !== report.totalPanels) failures.push("compact panel status lookup is incomplete.");
  if (panels.some((panel) => !panel.provenZeroRequiredForZero || (panel.canDisplayZero && panel.hydrationStatus !== "hydrated"))) {
    failures.push("panel can display zero without provenZero.");
  }
  if (panels.some((panel) => !panel.reason || !panel.nextExactAction)) failures.push("empty panel lacks explanation.");
  if (panels.some((panel) => panel.hydrationStatus === "stale" && panel.freshness !== "stale")) failures.push("stale panel lacks freshness reason.");
  if (panels.some((panel) => panel.hydrationStatus === "collecting" && panel.reason.includes("no safe recent source"))) {
    failures.push("source-missing panel is labeled collecting.");
  }
  if (report.materializerMissingPanels > 0 && report.debugLane.materializerMissing === 0) failures.push("materializer-missing panel is hidden.");
  if (report.providerGatedPanels !== report.debugLane.providerGated
    || report.protectedPaymentRequiredPanels !== report.debugLane.protectedPaymentRequired
    || report.externalRequiredPanels !== report.debugLane.externalRequired
    || report.permissionBlockedPanels !== report.debugLane.permissionBlocked
    || report.hiddenByRolePanels !== report.debugLane.hiddenByRole) {
    failures.push("panel recovery states are not mutually exclusive between report and debug lane.");
  }
  if (report.debugLane.label !== "Analytics panel hydration" || report.debugLane.totalPanels !== report.totalPanels) failures.push("panel hydration does not feed debug lane.");
  if (!report.liveEvidenceContribution || !Array.isArray(report.liveEvidenceContribution.blocked)) failures.push("panel hydration does not feed live evidence resolver.");
  const sensitivePattern = /@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|provider(Order|Payment|Capture)Id|chatMessage|privateMediaUrl|storagePath|pushToken|accessToken/iu;
  if (sensitivePattern.test(JSON.stringify(panels))) failures.push("raw sensitive data can appear in hydration debug.");
  if (report.productionReadsPerformed || report.providerCallsPerformed) failures.push("broad production reads are introduced.");
  for (const dimension of ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "freshness", "costRisk", "regressionRisk"]) {
    if (typeof report.scoreDimensions[dimension] !== "number") failures.push("score dimensions missing.");
  }
  if (report.dirtyFiles.some((file) => file.classification === "unsafe_unknown")) failures.push("dirty files/open PRs unclassified.");
  return Array.from(new Set(failures));
}
