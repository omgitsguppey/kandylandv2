import type { CanonicalAnalyticsEvent, LegacyMappingConfidence } from "@/lib/analytics/analytics-event-contract";
import type { LegacyMappingResult, LegacyMappingSuccess } from "@/lib/analytics/legacy-event-mapping";
import type { SnapshotParityResult, SnapshotParityStatus } from "@/lib/analytics/admin-metric-snapshot";

export const LEGACY_RECOVERED_EVENTS_COLLECTION = "analytics_legacy_recovered_events";
export const LEGACY_RECOVERY_SOURCE_MODE = "legacy_mapped";

export const LEGACY_RECOVERY_CONFIDENCE_LABELS = ["high", "medium", "low", "directional", "unknown"] as const;
export type LegacyRecoveryConfidenceLabel = (typeof LEGACY_RECOVERY_CONFIDENCE_LABELS)[number];

export const ANALYTICS_PARITY_LANES = [
  "raw_ledger_vs_hot_cache_snapshots",
  "first_party_vs_ga4_bigquery",
  "purchases",
  "unlocks",
  "tasks",
  "notifications",
  "onboarding",
  "guest_auth",
  "admin_exclusion",
  "creator_separation",
  "snapshots",
  "legacy_mapping",
  "data_validation_debug",
] as const;
export type AnalyticsParityLane = (typeof ANALYTICS_PARITY_LANES)[number];

export type AnalyticsParitySeverity = "pass" | "info" | "warn" | "fail";

export interface LegacyRecoverySourceInventoryItem {
  sourceName: string;
  sourceType: "firestore" | "rtdb" | "ga4_bigquery" | "cache" | "config" | "unknown";
  pathOrTable: string;
  earliestTimestamp: string | null;
  latestTimestamp: string | null;
  recordCount: number | null;
  countMode: "queried" | "not_queried" | "estimated" | "unknown";
  sampleShape: string[];
  timestampFields: string[];
  actorFields: string[];
  objectFields: string[];
  eventNameFields: string[];
  recoverability: "backfillable" | "directional" | "debug_only" | "unavailable";
  confidence: LegacyRecoveryConfidenceLabel;
  risks: string[];
}

export interface LegacyRecoveredEventRecord {
  legacySource: string;
  legacyId: string | null;
  legacyTimestamp: string;
  mappedEventName: string;
  mappingConfidence: LegacyRecoveryConfidenceLabel;
  mappingWarnings: string[];
  recoveredAt: string;
  actorConfidence: "high" | "medium" | "low" | "unknown";
  objectConfidence: "high" | "medium" | "low" | "unknown";
  sourceMode: typeof LEGACY_RECOVERY_SOURCE_MODE;
  includedInSnapshot: boolean;
  excludedReason: string | null;
  canonicalEvent: CanonicalAnalyticsEvent;
  duplicateKey: string;
  serverConfirmed: false;
}

export interface LegacyMappingReportSourceSummary {
  sourceName: string;
  scanned: number;
  mapped: number;
  skipped: number;
  duplicate: number;
  failed: number;
  lowConfidence: number;
  warnings: string[];
}

export interface LegacyMappingReport {
  generatedAt: string;
  dryRun: boolean;
  writeModeRequested: boolean;
  writeModeEnabled: boolean;
  targetCollection: string;
  sourceFilter: string | null;
  range: string | null;
  scanned: number;
  mapped: number;
  skipped: number;
  duplicate: number;
  failed: number;
  lowConfidence: number;
  warningsBySource: Record<string, string[]>;
  sourceSummaries: LegacyMappingReportSourceSummary[];
  recoveredEvents: LegacyRecoveredEventRecord[];
  unmappedRecords: Array<{
    legacySource: string;
    legacyId: string | null;
    reason: string;
    warnings: string[];
  }>;
  writePolicy: {
    writeTargetImplemented: boolean;
    writeRequiresExplicitFlag: true;
    writeRequiresEnvironmentFlag: "ANALYTICS_LEGACY_WRITE_ENABLED";
    writeTarget: string;
    reason: string;
  };
}

export interface LegacySourceInventoryReport {
  generatedAt: string;
  dryRun: true;
  liveScanEnabled: false;
  sourceFilter: string | null;
  sources: LegacyRecoverySourceInventoryItem[];
  summary: {
    sourceCount: number;
    backfillableCount: number;
    directionalCount: number;
    debugOnlyCount: number;
    unavailableCount: number;
  };
}

export interface AnalyticsEcosystemParityResult {
  lane: AnalyticsParityLane;
  sourceA: string;
  sourceB: string;
  expectedRelationship: string;
  actualValues: {
    sourceA: number | null;
    sourceB: number | null;
  };
  delta: number | null;
  confidence: LegacyRecoveryConfidenceLabel;
  severity: AnalyticsParitySeverity;
  recommendedFix: string;
  canSelfHeal: boolean;
  requiresManualReview: boolean;
  snapshotParity: SnapshotParityResult;
}

export interface AnalyticsEcosystemParityReport {
  generatedAt: string;
  selectedRange: string;
  lanes: AnalyticsEcosystemParityResult[];
  highestSeverity: AnalyticsParitySeverity;
  highestSeverityMismatches: AnalyticsEcosystemParityResult[];
  manualReviewItems: AnalyticsEcosystemParityResult[];
  snapshotParityIntegration: {
    updatesSnapshotDebugMetadata: boolean;
    blocksUiRendering: false;
    parityResultCount: number;
  };
}

export interface LegacyRecoveryCliOptions {
  dryRun: boolean;
  write: boolean;
  source: string | null;
  range: string | null;
  liveScan: boolean;
}

export function parseLegacyRecoveryCliArgs(args: string[]): LegacyRecoveryCliOptions {
  const options: LegacyRecoveryCliOptions = {
    dryRun: true,
    write: false,
    source: null,
    range: null,
    liveScan: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--write") {
      options.write = true;
      options.dryRun = false;
      continue;
    }
    if (arg === "--live") {
      options.liveScan = true;
      continue;
    }
    if (arg === "--source") {
      options.source = args[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg.startsWith("--source=")) {
      options.source = arg.slice("--source=".length) || null;
      continue;
    }
    if (arg === "--range") {
      options.range = args[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg.startsWith("--range=")) {
      options.range = arg.slice("--range=".length) || null;
    }
  }

  return options;
}

export function normalizeLegacyRecoveryConfidence(value: unknown): LegacyRecoveryConfidenceLabel {
  return LEGACY_RECOVERY_CONFIDENCE_LABELS.includes(value as LegacyRecoveryConfidenceLabel)
    ? value as LegacyRecoveryConfidenceLabel
    : "unknown";
}

export function classifyRecoveredEventActorConfidence(event: CanonicalAnalyticsEvent): LegacyRecoveredEventRecord["actorConfidence"] {
  if (event.actorType === "admin" || event.actorType === "system" || event.userId || event.creatorId || event.adminId) {
    return "high";
  }
  if (event.anonymousVisitorId || event.sessionId) {
    return "medium";
  }
  return "unknown";
}

export function classifyRecoveredEventObjectConfidence(event: CanonicalAnalyticsEvent): LegacyRecoveredEventRecord["objectConfidence"] {
  if (event.objectType && event.objectId) {
    return "high";
  }
  if (event.objectType && event.objectType !== "unknown") {
    return "medium";
  }
  return "unknown";
}

export function buildLegacyDuplicateKey(event: CanonicalAnalyticsEvent) {
  return [
    event.legacySource ?? "unknown",
    event.legacyId ?? event.eventId,
    event.eventName,
    event.occurredAt,
    event.userId ?? event.anonymousVisitorId ?? event.sessionId ?? event.adminId ?? "unknown_actor",
  ].join(":");
}

export function shouldIncludeRecoveredEventInSnapshot(event: CanonicalAnalyticsEvent) {
  if (event.legacyConfidence === "high" || event.legacyConfidence === "medium") {
    return {
      includedInSnapshot: true,
      excludedReason: null,
    };
  }

  return {
    includedInSnapshot: false,
    excludedReason: `Legacy confidence ${event.legacyConfidence ?? "unknown"} is directional or unknown.`,
  };
}

export function buildLegacyRecoveredEventRecord(
  mapping: LegacyMappingSuccess,
  input: { recoveredAt?: string } = {},
): LegacyRecoveredEventRecord {
  const recoveredAt = input.recoveredAt ?? new Date().toISOString();
  const confidence = normalizeLegacyRecoveryConfidence(mapping.event.legacyConfidence ?? mapping.metadata.confidence);
  const inclusion = shouldIncludeRecoveredEventInSnapshot(mapping.event);

  return {
    legacySource: mapping.metadata.legacySource,
    legacyId: mapping.metadata.legacyId,
    legacyTimestamp: mapping.event.occurredAt,
    mappedEventName: mapping.event.eventName,
    mappingConfidence: confidence,
    mappingWarnings: mapping.event.mappingWarnings,
    recoveredAt,
    actorConfidence: classifyRecoveredEventActorConfidence(mapping.event),
    objectConfidence: classifyRecoveredEventObjectConfidence(mapping.event),
    sourceMode: LEGACY_RECOVERY_SOURCE_MODE,
    includedInSnapshot: inclusion.includedInSnapshot,
    excludedReason: inclusion.excludedReason,
    canonicalEvent: mapping.event,
    duplicateKey: buildLegacyDuplicateKey(mapping.event),
    serverConfirmed: false,
  };
}

export function buildRecoveredEventsFromMappings(
  mappings: LegacyMappingResult[],
  input: { recoveredAt?: string } = {},
) {
  const seen = new Set<string>();
  const recoveredEvents: LegacyRecoveredEventRecord[] = [];
  const duplicateKeys: string[] = [];
  const unmappedRecords: LegacyMappingReport["unmappedRecords"] = [];

  for (const mapping of mappings) {
    if (mapping.status === "unmapped") {
      unmappedRecords.push({
        legacySource: mapping.metadata.legacySource,
        legacyId: mapping.metadata.legacyId,
        reason: mapping.reason,
        warnings: mapping.metadata.warnings,
      });
      continue;
    }

    const recovered = buildLegacyRecoveredEventRecord(mapping, input);
    if (seen.has(recovered.duplicateKey)) {
      duplicateKeys.push(recovered.duplicateKey);
      continue;
    }
    seen.add(recovered.duplicateKey);
    recoveredEvents.push(recovered);
  }

  return {
    recoveredEvents,
    duplicateKeys,
    unmappedRecords,
  };
}

export function calculateParityDelta(sourceA: number | null, sourceB: number | null) {
  if (sourceA === null || sourceB === null) {
    return null;
  }

  return sourceA - sourceB;
}

export function classifyParitySeverity(input: {
  delta: number | null;
  confidence: LegacyRecoveryConfidenceLabel;
  failThreshold?: number;
  warnThreshold?: number;
  requiresManualReview?: boolean;
}): AnalyticsParitySeverity {
  if (input.requiresManualReview) {
    return "fail";
  }
  if (input.delta === null || input.confidence === "unknown") {
    return "warn";
  }

  const absoluteDelta = Math.abs(input.delta);
  if (absoluteDelta >= (input.failThreshold ?? 25)) {
    return "fail";
  }
  if (absoluteDelta >= (input.warnThreshold ?? 5) || input.confidence === "low" || input.confidence === "directional") {
    return "warn";
  }
  return "pass";
}

function severityToSnapshotStatus(severity: AnalyticsParitySeverity): SnapshotParityStatus {
  if (severity === "pass") return "pass";
  if (severity === "warn" || severity === "info") return "warn";
  return "fail";
}

export function buildAnalyticsEcosystemParityResult(input: {
  lane: AnalyticsParityLane;
  sourceA: string;
  sourceB: string;
  expectedRelationship: string;
  sourceAValue: number | null;
  sourceBValue: number | null;
  confidence: LegacyRecoveryConfidenceLabel;
  recommendedFix: string;
  canSelfHeal?: boolean;
  requiresManualReview?: boolean;
  failThreshold?: number;
  warnThreshold?: number;
  fakeZeroPrevented?: boolean;
}): AnalyticsEcosystemParityResult {
  const delta = calculateParityDelta(input.sourceAValue, input.sourceBValue);
  const severity = classifyParitySeverity({
    delta,
    confidence: input.confidence,
    failThreshold: input.failThreshold,
    warnThreshold: input.warnThreshold,
    requiresManualReview: input.requiresManualReview,
  });

  return {
    lane: input.lane,
    sourceA: input.sourceA,
    sourceB: input.sourceB,
    expectedRelationship: input.expectedRelationship,
    actualValues: {
      sourceA: input.sourceAValue,
      sourceB: input.sourceBValue,
    },
    delta,
    confidence: input.confidence,
    severity,
    recommendedFix: input.recommendedFix,
    canSelfHeal: input.canSelfHeal ?? false,
    requiresManualReview: input.requiresManualReview ?? severity === "fail",
    snapshotParity: {
      key: input.lane,
      label: input.expectedRelationship,
      status: severityToSnapshotStatus(severity),
      expectedSource: input.sourceA,
      comparedSource: input.sourceB,
      expectedValue: input.sourceAValue,
      comparedValue: input.sourceBValue,
      drift: delta,
      fakeZeroPrevented: input.fakeZeroPrevented ?? false,
      details: input.recommendedFix,
    },
  };
}

export function summarizeParityReport(input: {
  generatedAt?: string;
  selectedRange: string;
  lanes: AnalyticsEcosystemParityResult[];
}): AnalyticsEcosystemParityReport {
  const severityRank: Record<AnalyticsParitySeverity, number> = {
    pass: 0,
    info: 1,
    warn: 2,
    fail: 3,
  };
  const highestSeverity = input.lanes.reduce<AnalyticsParitySeverity>((current, lane) =>
    severityRank[lane.severity] > severityRank[current] ? lane.severity : current,
  "pass");

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    selectedRange: input.selectedRange,
    lanes: input.lanes,
    highestSeverity,
    highestSeverityMismatches: input.lanes.filter((lane) => lane.severity === highestSeverity && highestSeverity !== "pass"),
    manualReviewItems: input.lanes.filter((lane) => lane.requiresManualReview),
    snapshotParityIntegration: {
      updatesSnapshotDebugMetadata: true,
      blocksUiRendering: false,
      parityResultCount: input.lanes.length,
    },
  };
}
