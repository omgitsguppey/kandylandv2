import { ADMIN_ANALYTICS_PANEL_HYDRATION_REGISTRY } from "./panel-hydration-registry";
import type { EventLivenessStatus } from "@/lib/analytics/event-liveness-contract";
import { listEventTranslationBridgeCanonicalEvents } from "@/lib/analytics/event-translation-bridge";
import type { PersonMetricHydrationStatus } from "@/lib/analytics/person-metrics-hydration";
import type {
  AdminAnalyticsPanelFreshness,
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
  "not_observed_but_expected",
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

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function runtimeSignalMap(signals: readonly AdminAnalyticsPanelRuntimeSignal[] = []) {
  return new Map(signals.map((signal) => [signal.panelId, signal]));
}

function eventClassifications(eventLivenessAudit?: JsonRecord | null) {
  return asArray(eventLivenessAudit?.classifications).map(asRecord);
}

function eventStatusFor(panel: { expectedEvents: string[] }, eventLivenessAudit?: JsonRecord | null): EventLivenessStatus | null {
  const events = eventClassifications(eventLivenessAudit).filter((entry) =>
    panel.expectedEvents.includes(String(entry.eventName ?? "")),
  );
  if (events.length === 0) return null;
  for (const status of ["observed_recently", "observed_stale", "materializer_missing", "translation_missing", "hydration_missing", "source_missing"] as const) {
    if (events.some((entry) => entry.livenessStatus === status)) return status;
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

function metricStatusFor(panel: { personMetricIds: string[] }, personMetricsHydration?: JsonRecord | null): PersonMetricHydrationStatus["state"] | "bridge_missing" | "source_missing" | null {
  const metricStatus = asRecord(personMetricsHydration?.metricStatus);
  const metrics = panel.personMetricIds
    .map((metricId) => asRecord(metricStatus[metricId]) as Partial<PersonMetricHydrationStatus>)
    .filter((metric) => Object.keys(metric).length > 0);
  if (metrics.length === 0) return null;
  if (metrics.some((metric) => metric.state === "hydrated")) return "hydrated";
  if (metrics.some((metric) => stringValue(metric.missingBridge))) return "bridge_missing";
  if (metrics.some((metric) => stringValue(metric.missingProducer))) return "source_missing";
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
}): AdminAnalyticsPanelHydrationStatus {
  if (input.sourceType === "external_required") return input.panelGroup === "payments" ? "provider_gated" : "manual_or_runtime_required";
  if (input.statusFromRuntime) return input.statusFromRuntime;
  if (input.statusFromEvent === "observed_recently") return "hydrated";
  if (input.statusFromEvent === "observed_stale") return "stale";
  if (input.statusFromEvent === "materializer_missing") return "materializer_missing";
  if (input.statusFromEvent === "translation_missing" || input.statusFromEvent === "hydration_missing") return "bridge_missing";
  if (input.statusFromEvent === "source_missing") return "source_missing";
  if (input.statusFromEvent === "not_observed_but_expected") return "not_observed_but_expected";
  if (input.statusFromEvent === "source_ready_waiting_for_activity") return "source_ready_waiting_for_activity";
  if (input.statusFromMetric === "hydrated") return "hydrated";
  if (input.statusFromMetric === "bridge_missing") return "bridge_missing";
  if (input.statusFromMetric === "source_missing") {
    if (input.hasCanonicalBridgeSource) return input.expectedDaily ? "not_observed_but_expected" : "source_ready_waiting_for_activity";
    return input.expectedDaily ? "source_missing" : "collecting";
  }
  if (input.statusFromMetric === "collecting") return "collecting";
  if (input.sourceType === "route_runtime_sample" || input.sourceType === "debug_runtime_evidence" || input.sourceType === "admin_summary") return "manual_or_runtime_required";
  if (input.hasCanonicalBridgeSource) return input.expectedDaily ? "not_observed_but_expected" : "source_ready_waiting_for_activity";
  return "source_missing";
}

function runtimeStatus(signal?: AdminAnalyticsPanelRuntimeSignal): AdminAnalyticsPanelHydrationStatus | null {
  if (!signal) return null;
  if (signal.permissionBlocked) return "permission_blocked";
  if (signal.error) return "broken";
  if (signal.hasData || signal.provenZero) return "hydrated";
  if (signal.sourceLoaded === false) return "source_missing";
  if (signal.sourceLoaded === true) return "collecting";
  return null;
}

function freshnessFor(status: AdminAnalyticsPanelHydrationStatus): AdminAnalyticsPanelFreshness {
  if (status === "hydrated" || status === "collecting" || status === "external_required") return "fresh";
  if (status === "source_ready_waiting_for_activity" || status === "provider_gated" || status === "manual_or_runtime_required") return "fresh";
  if (status === "stale") return "stale";
  return "unknown";
}

function displayStateFor(status: AdminAnalyticsPanelHydrationStatus): AdminAnalyticsPanelHydrationRecord["userSafeDisplayState"] {
  if (status === "hydrated") return "show_value";
  if (status === "collecting") return "show_collecting";
  if (status === "source_ready_waiting_for_activity") return "show_collecting";
  if (status === "not_observed_but_expected") return "show_not_connected";
  if (status === "stale") return "show_stale";
  if (status === "external_required" || status === "manual_or_runtime_required" || status === "provider_gated") return "show_external_required";
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
  if (status === "external_required" || status === "manual_or_runtime_required" || status === "provider_gated") return "unknown";
  if (ACTIONABLE_STATUSES.has(status)) return "unknown";
  return "weak";
}

function contributionFor(status: AdminAnalyticsPanelHydrationStatus): AdminAnalyticsPanelHydrationRecord["liveEvidenceContribution"] {
  if (status === "hydrated") return "clears_live_evidence";
  if (status === "collecting" || status === "source_ready_waiting_for_activity") return "source_exists_collecting";
  if (status === "stale") return "stale_not_live";
  if (status === "external_required" || status === "manual_or_runtime_required" || status === "provider_gated") return "external_or_manual";
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
      return `${input.panelLabel} has a canonical event/person metric source and is waiting for bounded real activity; this is not runtime proof.`;
    case "not_observed_but_expected":
      return `${input.panelLabel} has canonical source mapping but no bounded recent activity for an expected panel.`;
    case "source_missing":
      return `${input.panelLabel} has no safe recent source connected for ${input.expectedSource}.`;
    case "materializer_missing":
      return `${input.panelLabel} has producer evidence but no materializer connected.`;
    case "bridge_missing":
      return `${input.panelLabel} has an event or metric bridge gap before it can hydrate the panel.`;
    case "external_required":
      return `${input.panelLabel} requires external/provider or billing evidence and cannot be proven by screenshots.`;
    case "manual_or_runtime_required":
      return `${input.panelLabel} requires deployed runtime, admin, or operator evidence before it can be treated as hydrated.`;
    case "provider_gated":
      return `${input.panelLabel} requires formal provider evidence and cannot be proven by source-only telemetry.`;
    case "permission_blocked":
      return `${input.panelLabel} is blocked by role or permission state.`;
    case "broken":
      return `${input.panelLabel} has an explicit error and must not be hidden as collecting.`;
    case "producer_missing":
    case "not_configured":
    case "hidden_by_role":
      return `${input.panelLabel} is not connected to a usable producer/configuration.`;
  }
}

export function classifyPanelStaleness(input: { status: AdminAnalyticsPanelHydrationStatus; lastSeenAt: string | null }) {
  if (input.status === "stale") return "stale";
  if (input.lastSeenAt) return "fresh";
  return "unknown";
}

export function findPanelSourceBreak(record: Pick<AdminAnalyticsPanelHydrationRecord, "hydrationStatus" | "sourcePath" | "materializerPath" | "expectedSource">) {
  if (record.hydrationStatus === "source_missing" || record.hydrationStatus === "producer_missing") return record.sourcePath;
  if (record.hydrationStatus === "not_observed_but_expected" || record.hydrationStatus === "source_ready_waiting_for_activity") return record.sourcePath;
  if (record.hydrationStatus === "materializer_missing" || record.hydrationStatus === "bridge_missing") return record.materializerPath ?? record.expectedSource;
  if (record.hydrationStatus === "external_required" || record.hydrationStatus === "manual_or_runtime_required" || record.hydrationStatus === "provider_gated") return record.expectedSource;
  return null;
}

export function resolvePanelHydration(input: ResolveAnalyticsPanelHydrationInput & { panelId: string }): AdminAnalyticsPanelHydrationRecord {
  const panel = ADMIN_ANALYTICS_PANEL_HYDRATION_REGISTRY.find((entry) => entry.panelId === input.panelId);
  if (!panel) throw new Error(`Unknown admin analytics panel: ${input.panelId}`);
  const signal = runtimeSignalMap(input.runtimeSignals).get(panel.panelId);
  const statusFromRuntime = runtimeStatus(signal);
  const statusFromEvent = eventStatusFor(panel, input.eventLivenessAudit);
  const statusFromMetric = metricStatusFor(panel, input.personMetricsHydration);
  const canonicalBridgeSource = hasCanonicalBridgeSource(panel);
  const hydrationStatus = statusFromDelegatedSources({
    statusFromRuntime,
    statusFromEvent,
    statusFromMetric,
    sourceType: panel.sourceType,
    expectedDaily: panel.expectedDaily,
    panelGroup: panel.panelGroup,
    hasCanonicalBridgeSource: canonicalBridgeSource,
  });

  const lastSeenAt = signal?.lastSeenAt ?? lastSeenFor(panel, input.eventLivenessAudit);
  const freshness = classifyPanelStaleness({ status: hydrationStatus, lastSeenAt });
  const canDisplayZero = signal?.provenZero === true || hydrationStatus === "hydrated" && panel.sourceType === "admin_summary";
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
          ? `Verify ${panel.expectedSource} with bounded recent summaries before treating ${panel.panelLabel} as hydrated or zero.`
      : hydrationStatus === "stale"
        ? `Refresh ${panel.expectedSource} and verify the latest materialized timestamp.`
        : hydrationStatus === "external_required" || hydrationStatus === "manual_or_runtime_required" || hydrationStatus === "provider_gated"
          ? `Attach redacted external evidence for ${panel.expectedSource}; do not use screenshots as backend proof.`
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
      && panel.hydrationStatus !== "source_ready_waiting_for_activity")
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
    manualOrRuntimeRequired: count("manual_or_runtime_required"),
    providerGated: count("provider_gated"),
    externalRequired: count("external_required") + count("manual_or_runtime_required") + count("provider_gated"),
    hiddenByRole: count("hidden_by_role") + count("permission_blocked"),
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
    if (panel.hydrationStatus === "collecting") existing.collecting += 1;
    if (panel.liveEvidenceContribution === "actionable_gap") existing.gaps += 1;
    output[panel.panelGroup] = existing;
    return output;
  }, {} as AnalyticsPanelHydrationReport["panelsByGroup"]);
  const debugLane = buildAnalyticsPanelHydrationDebugLane(panels);
  const topPanelHydrationFailures = panels
    .filter((panel) =>
      panel.hydrationStatus !== "hydrated"
      && panel.hydrationStatus !== "collecting"
      && panel.hydrationStatus !== "source_ready_waiting_for_activity")
    .slice(0, 10);
  const liveEvidenceContribution = {
    contributes: panels.filter((panel) => panel.liveEvidenceContribution === "clears_live_evidence").map((panel) => panel.panelId),
    collecting: panels.filter((panel) => panel.liveEvidenceContribution === "source_exists_collecting").map((panel) => panel.panelId),
    blocked: panels.filter((panel) => panel.liveEvidenceContribution === "actionable_gap" || panel.liveEvidenceContribution === "stale_not_live").map((panel) => panel.panelId),
    externalRequired: panels.filter((panel) => panel.liveEvidenceContribution === "external_or_manual").map((panel) => panel.panelId),
  };
  const betaExitReadyBefore = asRecord(input.finalReleasePacket).betaExitReady === true;
  const remainingBlockers = [
    ...liveEvidenceContribution.blocked.map((panelId) => `${panelId}: panel hydration gap`),
    ...liveEvidenceContribution.externalRequired.map((panelId) => `${panelId}: external evidence required`),
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
    manualOrRuntimeRequiredPanels: count("manual_or_runtime_required"),
    providerGatedPanels: count("provider_gated"),
    externalRequiredPanels: count("external_required") + count("manual_or_runtime_required") + count("provider_gated"),
    permissionBlockedPanels: count("permission_blocked") + count("hidden_by_role"),
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
