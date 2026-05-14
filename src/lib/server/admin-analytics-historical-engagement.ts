import "server-only";

import {
  buildDurationBuckets,
  getTelemetryParamNumber,
  getTelemetryParamString,
  TelemetryLogRecord,
  timestampToDayKey,
} from "./admin-analytics-shared";
import type {
  AuthBreakdownItem,
  AuthLifecycleOutcome,
  AuthMethodOutcome,
  AuthOutcomeSummary,
  NavigationDestinationsState,
  NavigationDestinationRow,
  ReturnCadenceSegment,
  ReturnCadenceState,
} from "@/types/admin-analytics";
import { toNumber, toStringValue } from "./admin-analytics-shared";

export interface HistoricalEngagementAnalytics {
  authBreakdown: AuthBreakdownItem[];
  authOutcomeSummary: AuthOutcomeSummary;
  onboardingDurationBuckets: Array<{ label: string; count: number }>;
  repeatVisitSegments: ReturnCadenceSegment[];
  returnCadenceState: ReturnCadenceState;
  navigationDestinationsState: NavigationDestinationsState;
  destinationMix: Array<{ destination: string; count: number }>;
  notificationFunnel: Array<{ label: string; count: number }>;
  notificationActions: Array<{ label: string; value: number }>;
}

type AuthMethodKey = "email_sign_in" | "email_sign_up" | "google_sign_in";
type AttemptOutcome = "success" | "failure" | "unfinished" | "started";
type AttemptAggregate = {
  authAttemptId: string;
  method: AuthMethodKey;
  startedAtUtc: string | null;
  finishedAtUtc: string | null;
  durationMs: number | null;
  outcome: AttemptOutcome;
  failureCode: string | null;
  lastTimestampMs: number;
};

const AUTH_METHOD_LABELS: Record<AuthMethodKey, string> = {
  email_sign_in: "Email sign-in",
  email_sign_up: "Email sign-up",
  google_sign_in: "Google sign-in",
};

const RETURN_CADENCE_DENOMINATOR_EXPLANATION =
  "Tracked authenticated users are users with at least one qualifying authenticated activity day in the selected range. Unique returners are users active on 2+ distinct days. Conversion = unique returners / tracked authenticated users.";

type NavigationSourceTruth = NavigationDestinationRow["sourceTruth"];
type DestinationAccumulator = {
  destinationPath: string;
  destinationLabel: string;
  count: number;
  uniqueActors: Set<string>;
  topSourceEvents: Map<string, number>;
  sourceTruthCounts: Record<NavigationSourceTruth, number>;
  lastSeenAtMs: number;
};

const EXPLICIT_NAV_EVENT_SOURCES: Array<{
  eventName: string;
  sourceTruth: NavigationSourceTruth;
}> = [
  { eventName: "navigation_click", sourceTruth: "explicit_tap" },
  { eventName: "semantic_target_clicked", sourceTruth: "semantic_target" },
  { eventName: "notification_action_clicked", sourceTruth: "notification_action" },
  { eventName: "notification_opened", sourceTruth: "notification_action" },
  { eventName: "viewer_related_drop_clicked", sourceTruth: "viewer_related" },
];

const FALLBACK_DESTINATION_EVENT_MAP: Record<string, { path: string; label: string }> = {
  dashboard_viewed: { path: "/dashboard", label: "Dashboard" },
  drops_page_viewed: { path: "/drops", label: "Drops" },
  experience_hub_viewed: { path: "/experiences", label: "Experiences" },
  library_viewed: { path: "/dashboard/library", label: "Library" },
  wallet_opened: { path: "/experiences#gumdrops-wallet", label: "Wallet" },
};

function normalizeDestinationPath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^(javascript|data|blob|file):/iu.test(trimmed)) {
    return "";
  }

  if (/^https?:\/\//iu.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return parsed.pathname + parsed.search + parsed.hash;
    } catch {
      return "";
    }
  }

  if (trimmed.startsWith("#")) {
    return trimmed;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function readDestinationValue(record: TelemetryLogRecord) {
  const candidates = [
    "destinationPath",
    "destination_path",
    "destination",
    "path",
    "href",
    "targetPath",
    "target_path",
    "targetHref",
    "target_href",
    "route",
    "page_path",
    "pagePath",
  ];
  for (const key of candidates) {
    const value = getTelemetryParamString(record, key);
    const normalized = normalizeDestinationPath(value);
    if (normalized) {
      return normalized;
    }
  }
  return "";
}

function readDestinationLabel(record: TelemetryLogRecord, fallbackPath: string) {
  const candidates = [
    "destinationLabel",
    "destination_label",
    "label",
    "title",
    "targetText",
    "target_text",
  ];
  for (const key of candidates) {
    const value = getTelemetryParamString(record, key).trim();
    if (value) {
      return value;
    }
  }

  if (fallbackPath === "/dashboard") return "Dashboard";
  if (fallbackPath === "/drops") return "Drops";
  if (fallbackPath === "/experiences") return "Experiences";
  if (fallbackPath === "/dashboard/library") return "Library";
  if (fallbackPath === "/experiences#gumdrops-wallet") return "Wallet";
  if (fallbackPath.includes("/viewer")) return "Viewer";
  if (fallbackPath.includes("/drops/")) return "Drop details";
  if (fallbackPath.includes("/preview")) return "Drop preview";
  return fallbackPath || "Unknown destination";
}

function readActorKey(record: TelemetryLogRecord) {
  return record.userId
    || getTelemetryParamString(record, "user_id")
    || getTelemetryParamString(record, "userId")
    || getTelemetryParamString(record, "session_id")
    || getTelemetryParamString(record, "sessionId");
}

function addDestinationObservation(
  destinationMap: Map<string, DestinationAccumulator>,
  input: {
    destinationPath: string;
    destinationLabel: string;
    sourceTruth: NavigationSourceTruth;
    eventName: string;
    actorKey?: string;
    timestampMs: number;
  },
) {
  if (!input.destinationPath) {
    return;
  }

  const existing = destinationMap.get(input.destinationPath) ?? {
    destinationPath: input.destinationPath,
    destinationLabel: input.destinationLabel || input.destinationPath,
    count: 0,
    uniqueActors: new Set<string>(),
    topSourceEvents: new Map<string, number>(),
    sourceTruthCounts: {
      explicit_tap: 0,
      semantic_target: 0,
      notification_action: 0,
      viewer_related: 0,
      page_view_fallback: 0,
    },
    lastSeenAtMs: 0,
  };

  existing.count += 1;
  if (input.actorKey) {
    existing.uniqueActors.add(input.actorKey);
  }
  existing.topSourceEvents.set(
    input.eventName,
    (existing.topSourceEvents.get(input.eventName) ?? 0) + 1,
  );
  existing.sourceTruthCounts[input.sourceTruth] += 1;
  existing.lastSeenAtMs = Math.max(existing.lastSeenAtMs, input.timestampMs);
  if (!existing.destinationLabel || existing.destinationLabel === existing.destinationPath) {
    existing.destinationLabel = input.destinationLabel || input.destinationPath;
  }

  destinationMap.set(input.destinationPath, existing);
}

function resolveFallbackDestinationFromRecord(record: TelemetryLogRecord) {
  const mapped = FALLBACK_DESTINATION_EVENT_MAP[record.eventName];
  if (mapped) {
    return mapped;
  }

  if (record.eventName === "view_drop_details") {
    const dropId = getTelemetryParamString(record, "drop_id") || getTelemetryParamString(record, "dropId");
    return {
      path: dropId ? `/drops/${dropId}` : "/drops/[dropId]",
      label: "Drop details",
    };
  }

  if (record.eventName === "drop_preview_opened") {
    const dropId = getTelemetryParamString(record, "drop_id") || getTelemetryParamString(record, "dropId");
    return {
      path: dropId ? `/drops/${dropId}/preview` : "/drops/preview",
      label: "Drop preview",
    };
  }

  if (record.eventName === "viewer_opened") {
    const route =
      normalizeDestinationPath(getTelemetryParamString(record, "route"))
      || normalizeDestinationPath(getTelemetryParamString(record, "page_path"))
      || normalizeDestinationPath(getTelemetryParamString(record, "pagePath"));
    return {
      path: route || "/dashboard/viewer",
      label: "Viewer",
    };
  }

  return null;
}

function resolveFallbackDestinationFromFact(fact: Record<string, unknown>) {
  const eventName = toStringValue(fact.eventName).trim();
  const mapped = FALLBACK_DESTINATION_EVENT_MAP[eventName];
  if (mapped) {
    return mapped;
  }

  const route =
    normalizeDestinationPath(toStringValue(fact.route))
    || normalizeDestinationPath(toStringValue(fact.pagePath))
    || normalizeDestinationPath(toStringValue(fact.page_path));

  if (eventName === "view_drop_details") {
    const dropId = toStringValue(fact.dropId) || toStringValue(fact.drop_id);
    return {
      path: dropId ? `/drops/${dropId}` : route || "/drops/[dropId]",
      label: "Drop details",
    };
  }

  if (eventName === "drop_preview_opened") {
    const dropId = toStringValue(fact.dropId) || toStringValue(fact.drop_id);
    return {
      path: dropId ? `/drops/${dropId}/preview` : route || "/drops/preview",
      label: "Drop preview",
    };
  }

  if (eventName === "viewer_opened") {
    return {
      path: route || "/dashboard/viewer",
      label: "Viewer",
    };
  }

  return null;
}

function mapNavigationFreshnessState(lastSeenAtMs: number, generatedAtUtc: string): NavigationDestinationRow["freshnessState"] {
  const generatedAtMs = Date.parse(generatedAtUtc);
  if (!lastSeenAtMs || !Number.isFinite(generatedAtMs)) {
    return "unknown";
  }

  const ageMs = Math.max(0, generatedAtMs - lastSeenAtMs);
  if (ageMs <= 5 * 60 * 1000) {
    return "live";
  }
  if (ageMs <= 15 * 60 * 1000) {
    return "recent";
  }
  return "stale";
}

function buildNavigationExplanation(input: {
  sourceTruth: NavigationSourceTruth;
  usedFallback: boolean;
  destinationPath: string;
  topSourceEvents: string[];
}) {
  if (input.sourceTruth === "page_view_fallback") {
    return `Showing destination visits for ${input.destinationPath} from page and surface view telemetry because explicit navigation taps were not observed in this range.`;
  }

  if (input.usedFallback) {
    return `Explicit navigation events lead for ${input.destinationPath}, with additional destination-view fallback activity also observed from ${input.topSourceEvents.join(", ")}.`;
  }

  if (input.sourceTruth === "semantic_target") {
    return `Destination is proven by semantic_target_clicked payload context for ${input.destinationPath}.`;
  }
  if (input.sourceTruth === "notification_action") {
    return `Destination is proven by notification action telemetry for ${input.destinationPath}.`;
  }
  if (input.sourceTruth === "viewer_related") {
    return `Destination is proven by viewer-related navigation telemetry for ${input.destinationPath}.`;
  }

  return `Destination is proven by explicit navigation tap telemetry for ${input.destinationPath}.`;
}

function buildNavigationDestinationsState(input: {
  telemetryLogsByEvent: Record<string, TelemetryLogRecord[]>;
  analyticsEventFacts?: Array<Record<string, unknown>>;
  generatedAtUtc: string;
  range: string;
}) {
  const destinationMap = new Map<string, DestinationAccumulator>();
  let explicitTapCount = 0;
  let fallbackViewCount = 0;

  EXPLICIT_NAV_EVENT_SOURCES.forEach(({ eventName, sourceTruth }) => {
    (input.telemetryLogsByEvent[eventName] ?? []).forEach((record) => {
      const directDestination = readDestinationValue(record);
      const fallbackMapping = sourceTruth === "viewer_related"
        ? (() => {
          const dropId = getTelemetryParamString(record, "drop_id") || getTelemetryParamString(record, "dropId");
          return {
            path: dropId ? `/drops/${dropId}` : "/drops/[dropId]",
            label: "Related drop",
          };
        })()
        : null;
      const destinationPath = directDestination || fallbackMapping?.path || "";
      if (!destinationPath) {
        return;
      }

      addDestinationObservation(destinationMap, {
        destinationPath,
        destinationLabel: readDestinationLabel(record, destinationPath) || fallbackMapping?.label || destinationPath,
        sourceTruth,
        eventName,
        actorKey: readActorKey(record),
        timestampMs: record.timestamp,
      });
      explicitTapCount += 1;
    });
  });

  Object.keys(FALLBACK_DESTINATION_EVENT_MAP)
    .concat(["view_drop_details", "drop_preview_opened", "viewer_opened"])
    .forEach((eventName) => {
      (input.telemetryLogsByEvent[eventName] ?? []).forEach((record) => {
        const mapped = resolveFallbackDestinationFromRecord(record);
        if (!mapped) {
          return;
        }
        addDestinationObservation(destinationMap, {
          destinationPath: mapped.path,
          destinationLabel: mapped.label,
          sourceTruth: "page_view_fallback",
          eventName,
          actorKey: readActorKey(record),
          timestampMs: record.timestamp,
        });
        fallbackViewCount += 1;
      });
    });

  if (fallbackViewCount === 0) {
    (input.analyticsEventFacts ?? []).forEach((fact) => {
      const eventName = toStringValue(fact.eventName).trim();
      if (
        !eventName
        || !(eventName in FALLBACK_DESTINATION_EVENT_MAP)
        && eventName !== "view_drop_details"
        && eventName !== "drop_preview_opened"
        && eventName !== "viewer_opened"
      ) {
        return;
      }

      const mapped = resolveFallbackDestinationFromFact(fact);
      const timestampMs = toNumber(fact.timestamp);
      if (!mapped || timestampMs <= 0) {
        return;
      }

      addDestinationObservation(destinationMap, {
        destinationPath: mapped.path,
        destinationLabel: mapped.label,
        sourceTruth: "page_view_fallback",
        eventName,
        actorKey: toStringValue(fact.userId).trim() || toStringValue(fact.actorUserId).trim(),
        timestampMs,
      });
      fallbackViewCount += 1;
    });
  }

  const sourceMode: NavigationDestinationsState["sourceMode"] =
    explicitTapCount > 0 && fallbackViewCount > 0
      ? "mixed_fallback"
      : explicitTapCount > 0
        ? "tap_events"
        : fallbackViewCount > 0
          ? "destination_views_only"
          : "unavailable";

  const warnings: string[] = [];
  let missingReason: string | undefined;
  if (sourceMode === "mixed_fallback") {
    warnings.push("Explicit navigation taps are present, but some destinations are hydrated from fallback destination-view telemetry.");
  }
  if (sourceMode === "destination_views_only") {
    warnings.push("No explicit nav taps found. Showing destination visits from page-view fallback.");
  }
  if (sourceMode === "unavailable") {
    missingReason = "Navigation tap tracking is not instrumented for this range. Expected events: navigation_click, semantic_target_clicked with destination, notification_action_clicked.";
  }

  const destinations = Array.from(destinationMap.values())
    .map<NavigationDestinationRow>((entry) => {
      const sourceTruth = (Object.entries(entry.sourceTruthCounts)
        .sort((left, right) => right[1] - left[1])[0]?.[0] ?? "page_view_fallback") as NavigationSourceTruth;
      const topSourceEvents = Array.from(entry.topSourceEvents.entries())
        .sort((left, right) => right[1] - left[1])
        .map(([eventName]) => eventName)
        .slice(0, 3);
      const usedFallback =
        entry.sourceTruthCounts.page_view_fallback > 0
        && sourceTruth !== "page_view_fallback";
      return {
        destinationPath: entry.destinationPath,
        destinationLabel: entry.destinationLabel,
        count: entry.count,
        uniqueActors: entry.uniqueActors.size > 0 ? entry.uniqueActors.size : null,
        sourceTruth,
        lastSeenAtUtc: entry.lastSeenAtMs > 0 ? new Date(entry.lastSeenAtMs).toISOString() : null,
        freshnessState: mapNavigationFreshnessState(entry.lastSeenAtMs, input.generatedAtUtc),
        topSourceEvents,
        explanation: buildNavigationExplanation({
          sourceTruth,
          usedFallback,
          destinationPath: entry.destinationPath,
          topSourceEvents,
        }),
      };
    })
    .sort((left, right) => right.count - left.count)
    .slice(0, 10);

  return {
    generatedAtUtc: input.generatedAtUtc,
    range: input.range,
    sourceMode,
    totalNavigationEvents: explicitTapCount + fallbackViewCount,
    explicitTapCount,
    fallbackViewCount,
    destinations,
    missingReason,
    warnings,
  } satisfies NavigationDestinationsState;
}

function resolveReturnCadenceSourceTruth(input: {
  eventFactUsers: number;
  sessionFactUsers: number;
  taskUsers: number;
  transactionUsers: number;
  observedSourceCount: number;
}): ReturnCadenceState["sourceTruth"] {
  const { eventFactUsers, sessionFactUsers, taskUsers, transactionUsers, observedSourceCount } = input;
  if (observedSourceCount === 0) {
    return "missing";
  }
  const nonEventFactSourceCount = [sessionFactUsers, taskUsers, transactionUsers].filter((count) => count > 0).length;
  if (eventFactUsers > 0 && nonEventFactSourceCount === 0) {
    return "identified_event_facts";
  }
  if (eventFactUsers === 0 && sessionFactUsers > 0 && taskUsers === 0 && transactionUsers === 0) {
    return "auth_sessions";
  }
  if (eventFactUsers > 0 || sessionFactUsers > 0 || taskUsers > 0 || transactionUsers > 0) {
    return "mixed_fallback";
  }
  return observedSourceCount > 0 ? "mixed_fallback" : "missing";
}

function isAuthenticatedCadenceEventFact(data: Record<string, unknown>) {
  const eventName = toStringValue(data.eventName).trim();
  const userId = toStringValue(data.userId).trim() || toStringValue(data.actorUserId).trim();
  const actorType = toStringValue(data.actorType).trim().toLowerCase();
  const sourceTruth = toStringValue(data.sourceTruth).trim().toLowerCase();

  if (!eventName || !userId) {
    return false;
  }
  if (actorType && actorType !== "user") {
    return false;
  }
  if (sourceTruth === "local_projection") {
    return false;
  }
  return !/^(admin_|creator_|owner_)/u.test(eventName);
}

function buildReturnCadenceState(input: {
  analyticsEventFacts?: Array<Record<string, unknown>>;
  sessionFacts?: Array<Record<string, unknown>>;
  taskLifecycleLogs?: Array<Record<string, unknown>>;
  transactionFacts?: Array<Record<string, unknown>>;
  generatedAtUtc: string;
  range: string;
}): { repeatVisitSegments: ReturnCadenceSegment[]; returnCadenceState: ReturnCadenceState } {
  const activeDaysByUser = new Map<string, Set<string>>();
  let latestSeenAtMs = 0;

  const eventFactUsers = new Set<string>();
  const sessionFactUsers = new Set<string>();
  const taskUsers = new Set<string>();
  const transactionUsers = new Set<string>();

  const addActivityDay = (userId: string, timestampMs: number) => {
    const normalizedUserId = userId.trim();
    if (!normalizedUserId || timestampMs <= 0) {
      return;
    }
    if (!activeDaysByUser.has(normalizedUserId)) {
      activeDaysByUser.set(normalizedUserId, new Set());
    }
    activeDaysByUser.get(normalizedUserId)?.add(timestampToDayKey(timestampMs));
    latestSeenAtMs = Math.max(latestSeenAtMs, timestampMs);
  };

  (input.analyticsEventFacts ?? []).forEach((fact) => {
    if (!isAuthenticatedCadenceEventFact(fact)) {
      return;
    }
    const userId = toStringValue(fact.userId).trim() || toStringValue(fact.actorUserId).trim();
    const timestampMs = toNumber(fact.timestamp);
    if (!userId || timestampMs <= 0) {
      return;
    }
    eventFactUsers.add(userId);
    addActivityDay(userId, timestampMs);
  });

  (input.sessionFacts ?? []).forEach((fact) => {
    const userId = toStringValue(fact.userId).trim();
    const timestampMs = toNumber(fact.lastEventAtMs) || toNumber(fact.firstEventAtMs) || toNumber(fact.lastEventAt) || toNumber(fact.firstEventAt);
    if (!userId || timestampMs <= 0) {
      return;
    }
    sessionFactUsers.add(userId);
    addActivityDay(userId, timestampMs);
  });

  (input.taskLifecycleLogs ?? []).forEach((fact) => {
    const userId = toStringValue(fact.userId).trim();
    const timestampMs = toNumber(fact.timestamp);
    if (!userId || timestampMs <= 0) {
      return;
    }
    taskUsers.add(userId);
    addActivityDay(userId, timestampMs);
  });

  (input.transactionFacts ?? []).forEach((fact) => {
    const userId = toStringValue(fact.userId).trim();
    const type = toStringValue(fact.type).trim();
    const status = toStringValue(fact.status).trim();
    const timestampMs = toNumber(fact.timestamp);
    if (!userId || timestampMs <= 0) {
      return;
    }
    if (type !== "purchase_currency" && type !== "unlock_content") {
      return;
    }
    if (type === "purchase_currency" && status && status !== "completed") {
      return;
    }
    transactionUsers.add(userId);
    addActivityDay(userId, timestampMs);
  });

  const activeDayCounts = Array.from(activeDaysByUser.values()).map((days) => days.size);
  const buckets = {
    oneDay: activeDayCounts.filter((count) => count === 1).length,
    twoDays: activeDayCounts.filter((count) => count === 2).length,
    threeToFourDays: activeDayCounts.filter((count) => count >= 3 && count <= 4).length,
    fivePlusDays: activeDayCounts.filter((count) => count >= 5).length,
  };
  const trackedAuthenticatedUsers =
    buckets.oneDay + buckets.twoDays + buckets.threeToFourDays + buckets.fivePlusDays;
  const uniqueReturners =
    buckets.twoDays + buckets.threeToFourDays + buckets.fivePlusDays;
  const observedSourceCount = [
    (input.analyticsEventFacts ?? []).length > 0,
    (input.sessionFacts ?? []).length > 0,
    (input.taskLifecycleLogs ?? []).length > 0,
    (input.transactionFacts ?? []).length > 0,
  ].filter(Boolean).length;
  const sourceTruth = resolveReturnCadenceSourceTruth({
    eventFactUsers: eventFactUsers.size,
    sessionFactUsers: sessionFactUsers.size,
    taskUsers: taskUsers.size,
    transactionUsers: transactionUsers.size,
    observedSourceCount,
  });
  const generatedAtMs = Date.parse(input.generatedAtUtc);
  const ageMs = latestSeenAtMs > 0 && Number.isFinite(generatedAtMs)
    ? Math.max(0, generatedAtMs - latestSeenAtMs)
    : Number.POSITIVE_INFINITY;
  const freshnessState: ReturnCadenceState["freshnessState"] =
    sourceTruth === "missing"
      ? "missing"
      : sourceTruth === "mixed_fallback"
        ? "partial"
        : ageMs > 72 * 60 * 60 * 1000
          ? "stale"
          : latestSeenAtMs > 0
            ? "live"
            : "unknown";

  const warnings: string[] = [];
  if (sourceTruth === "mixed_fallback") {
    warnings.push(
      "Return cadence is using identified activity fallback because the cadence snapshot has not hydrated.",
    );
  }
  if (trackedAuthenticatedUsers === 0 && sourceTruth !== "missing") {
    warnings.push(
      "Authenticated activity sources were queried, but no qualifying authenticated activity days were observed in this range.",
    );
  }

  const repeatVisitSegments: ReturnCadenceSegment[] = [
    { label: "1 day", users: buckets.oneDay, count: buckets.oneDay },
    { label: "2 days", users: buckets.twoDays, count: buckets.twoDays },
    { label: "3-4 days", users: buckets.threeToFourDays, count: buckets.threeToFourDays },
    { label: "5+ days", users: buckets.fivePlusDays, count: buckets.fivePlusDays },
  ];

  return {
    repeatVisitSegments,
    returnCadenceState: {
      generatedAtUtc: input.generatedAtUtc,
      range: input.range,
      sourceTruth,
      freshnessState,
      trackedAuthenticatedUsers,
      uniqueReturners,
      conversionPct: trackedAuthenticatedUsers > 0 ? uniqueReturners / trackedAuthenticatedUsers : 0,
      buckets,
      denominatorExplanation: RETURN_CADENCE_DENOMINATOR_EXPLANATION,
      missingReason: sourceTruth === "missing"
        ? "Return cadence source missing. No verified zero should be displayed."
        : trackedAuthenticatedUsers === 0
          ? "No qualifying authenticated activity days were observed from the queried source set."
          : undefined,
      warnings,
    },
  };
}

function averageDuration(records: TelemetryLogRecord[]) {
  const durations = records
    .map((record) => getTelemetryParamNumber(record, "duration_ms") || getTelemetryParamNumber(record, "durationMs"))
    .filter((value) => value > 0);

  if (durations.length === 0) {
    return 0;
  }

  return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
}

function normalizeAttemptMethod(record: TelemetryLogRecord): AuthMethodKey | null {
  const explicitMethod = getTelemetryParamString(record, "method");
  switch (explicitMethod) {
    case "email_sign_in":
    case "email_sign_up":
    case "google_sign_in":
      return explicitMethod;
    default:
      break;
  }

  const provider = (
    getTelemetryParamString(record, "provider") ||
    getTelemetryParamString(record, "authProvider") ||
    getTelemetryParamString(record, "auth_provider")
  ).toLowerCase();
  const methodHint = `${explicitMethod} ${getTelemetryParamString(record, "authMethod")} ${getTelemetryParamString(record, "auth_method")}`.toLowerCase();

  if (provider.includes("google") || methodHint.includes("google")) {
    return "google_sign_in";
  }

  if (
    provider.includes("password") ||
    provider.includes("email") ||
    methodHint.includes("password") ||
    methodHint.includes("email")
  ) {
    return methodHint.includes("sign_up") || methodHint.includes("signup") || methodHint.includes("register")
      ? "email_sign_up"
      : "email_sign_in";
  }

  return null;
}

function readAuthFailureCode(record: TelemetryLogRecord) {
  return (
    getTelemetryParamString(record, "failureCode") ||
    getTelemetryParamString(record, "failure_code") ||
    getTelemetryParamString(record, "errorCode") ||
    getTelemetryParamString(record, "error_code") ||
    getTelemetryParamString(record, "reasonCode") ||
    getTelemetryParamString(record, "reason_code")
  );
}

function buildAuthOutcomeSummary(input: {
  telemetryLogs: TelemetryLogRecord[];
  telemetryLogsByEvent: Record<string, TelemetryLogRecord[]>;
  eventsData: Record<string, number>;
  generatedAtUtc: string;
  range: string;
  emailRegistrationCount: number;
  canonicalRegistrationCount: number;
}) : { authBreakdown: AuthBreakdownItem[]; authOutcomeSummary: AuthOutcomeSummary } {
  const started = input.telemetryLogsByEvent.auth_attempt_started || [];
  const succeeded = input.telemetryLogsByEvent.auth_attempt_succeeded || [];
  const failed = input.telemetryLogsByEvent.auth_attempt_failed || [];
  const unfinished = input.telemetryLogsByEvent.auth_attempt_unfinished || [];
  const canonicalAttemptRecords = [...started, ...succeeded, ...failed, ...unfinished];
  const hasCanonicalAttempts = canonicalAttemptRecords.length > 0;

  if (!hasCanonicalAttempts) {
    const normalizedEmailSignUpCount = input.emailRegistrationCount > 0
      ? input.emailRegistrationCount
      : input.eventsData.auth_sign_up_success || 0;
    const normalizedSignupCount = input.canonicalRegistrationCount > 0
      ? input.canonicalRegistrationCount
      : input.eventsData.auth_sign_up_success || 0;

    const authBreakdown: AuthBreakdownItem[] = [
      {
        method: "Email sign in",
        attempts: input.eventsData.auth_sign_in_attempted || 0,
        successes: input.eventsData.auth_sign_in_success || 0,
        failures: input.eventsData.auth_sign_in_failed || 0,
        avgDurationMs: averageDuration(input.telemetryLogsByEvent.auth_sign_in_success || []),
        successRate: 0,
      },
      {
        method: "Email sign up",
        attempts: input.eventsData.auth_sign_up_attempted || 0,
        successes: normalizedEmailSignUpCount,
        failures: input.eventsData.auth_sign_up_failed || 0,
        avgDurationMs: averageDuration(input.telemetryLogsByEvent.auth_sign_up_success || []),
        successRate: 0,
      },
      {
        method: "Google sign in",
        attempts: input.eventsData.auth_google_sign_in_attempted || 0,
        successes: input.eventsData.auth_google_sign_in_success || 0,
        failures: input.eventsData.auth_google_sign_in_failed || 0,
        avgDurationMs: averageDuration(input.telemetryLogsByEvent.auth_google_sign_in_success || []),
        successRate: 0,
      },
    ].map((entry) => ({
      ...entry,
      successRate: entry.attempts > 0 ? entry.successes / entry.attempts : 0,
    }));

    const methods: AuthMethodOutcome[] = authBreakdown.map((entry) => {
      const method = entry.method.toLowerCase().includes("google")
        ? "google_sign_in"
        : entry.method.toLowerCase().includes("sign up")
          ? "email_sign_up"
          : "email_sign_in";
      const unfinishedCount = Math.max(0, entry.attempts - entry.successes - entry.failures);
      return {
        method,
        attempts: entry.attempts,
        successes: entry.successes,
        failures: entry.failures,
        unfinished: unfinishedCount,
        successRatePct: entry.attempts > 0 ? Math.round((entry.successes / entry.attempts) * 100) : 0,
        avgFinishMs: entry.avgDurationMs > 0 ? entry.avgDurationMs : null,
        weakestReason: entry.successes === 0 && entry.failures > 0 ? "legacy_failure_breakdown_unavailable" : undefined,
        failureBreakdown: entry.failures > 0
          ? [{
            failureCode: "failure_code_unavailable",
            count: entry.failures,
            explanation: "Legacy auth telemetry did not capture a normalized failure code for this method.",
          }]
          : [],
        state: unfinishedCount > 0 || entry.avgDurationMs <= 0 ? "review" : "stale",
      };
    });

    const successes = methods.reduce((sum, method) => sum + method.successes, 0);
    const failures = methods.reduce((sum, method) => sum + method.failures, 0);
    const attempts = methods.reduce((sum, method) => sum + method.attempts, 0);
    const unfinishedCount = methods.reduce((sum, method) => sum + method.unfinished, 0);
    const hasLegacyAuthSample = methods.some((method) => method.attempts > 0 || method.successes > 0 || method.failures > 0);
    const lifecycleOutcomes: AuthLifecycleOutcome[] = [
      {
        name: "registration_completed",
        count: normalizedSignupCount,
        state: normalizedSignupCount > 0 ? "live" : "review",
        explanation: "Registration completed is tracked as an auth lifecycle outcome, not an auth method.",
      },
      {
        name: "navigation_session_established",
        count: 0,
        state: "review",
        explanation: "Navigation session establishment was not captured in the legacy auth telemetry window.",
      },
    ];
    const lastAuthTimestamp = input.telemetryLogs
      .filter((record) => record.eventName.startsWith("auth_") || record.eventName === "user_registered")
      .reduce((latest, record) => Math.max(latest, record.timestamp), 0);

    return {
      authBreakdown,
      authOutcomeSummary: {
        generatedAtUtc: input.generatedAtUtc,
        range: input.range,
        sourceMode: hasLegacyAuthSample ? "legacy_event_counts" : "unavailable",
        attempts,
        successes,
        failures,
        unfinished: unfinishedCount,
        successRatePct: attempts > 0 ? Math.round((successes / attempts) * 100) : 0,
        avgFinishMs: null,
        timingState: "missing_starts",
        lastAuthEventAtUtc: lastAuthTimestamp > 0 ? new Date(lastAuthTimestamp).toISOString() : null,
        methods,
        lifecycleOutcomes,
      },
    };
  }

  const attemptsById = new Map<string, AttemptAggregate>();

  const applyAttemptRecord = (record: TelemetryLogRecord, outcome: AttemptOutcome) => {
    const authAttemptId = getTelemetryParamString(record, "authAttemptId");
    const method = normalizeAttemptMethod(record);
    if (!authAttemptId || !method) {
      return;
    }

    const existing = attemptsById.get(authAttemptId);
    const startedAtUtc = getTelemetryParamString(record, "startedAtUtc");
    const finishedAtUtc = getTelemetryParamString(record, "finishedAtUtc");
    const durationMs = getTelemetryParamNumber(record, "durationMs") || getTelemetryParamNumber(record, "duration_ms");
    const failureCode = readAuthFailureCode(record);
    const next: AttemptAggregate = existing ?? {
      authAttemptId,
      method,
      startedAtUtc: null,
      finishedAtUtc: null,
      durationMs: null,
      outcome: "started",
      failureCode: null,
      lastTimestampMs: record.timestamp,
    };

    if (startedAtUtc) {
      next.startedAtUtc = startedAtUtc;
    }
    if (finishedAtUtc) {
      next.finishedAtUtc = finishedAtUtc;
    }
    if (durationMs > 0) {
      next.durationMs = durationMs;
    }
    if (failureCode) {
      next.failureCode = failureCode;
    }
    if (outcome !== "started") {
      next.outcome = outcome;
    }
    next.lastTimestampMs = Math.max(next.lastTimestampMs, record.timestamp);
    attemptsById.set(authAttemptId, next);
  };

  started.forEach((record) => applyAttemptRecord(record, "started"));
  succeeded.forEach((record) => applyAttemptRecord(record, "success"));
  failed.forEach((record) => applyAttemptRecord(record, "failure"));
  unfinished.forEach((record) => applyAttemptRecord(record, "unfinished"));

  const aggregates = Array.from(attemptsById.values()).map((attempt) => ({
    ...attempt,
    outcome: attempt.outcome === "started" ? "unfinished" : attempt.outcome,
  }));

  const methods: AuthMethodOutcome[] = (["email_sign_in", "email_sign_up", "google_sign_in"] as const).map((method) => {
    const methodAttempts = aggregates.filter((attempt) => attempt.method === method);
    const successes = methodAttempts.filter((attempt) => attempt.outcome === "success");
    const failures = methodAttempts.filter((attempt) => attempt.outcome === "failure");
    const unfinishedAttempts = methodAttempts.filter((attempt) => attempt.outcome === "unfinished");
    const timedSuccessDurations = successes
      .map((attempt) => attempt.durationMs ?? 0)
      .filter((value) => value > 0);
    const failureBreakdown = Array.from(
      failures.reduce((map, attempt) => {
        const code = attempt.failureCode || "failure_code_unavailable";
        map.set(code, (map.get(code) || 0) + 1);
        return map;
      }, new Map<string, number>()),
    ).map(([failureCode, count]) => ({
      failureCode,
      count,
      explanation: failureCode === "failure_code_unavailable"
        ? "Failure telemetry was recorded without a normalized safe code."
        : `Normalized safe auth failure code ${failureCode}.`,
    }));
    const attempts = methodAttempts.length;
    const successesCount = successes.length;
    const failuresCount = failures.length;
    const unfinishedCount = unfinishedAttempts.length;

    return {
      method,
      attempts,
      successes: successesCount,
      failures: failuresCount,
      unfinished: unfinishedCount,
      successRatePct: attempts > 0 ? Math.round((successesCount / attempts) * 100) : 0,
      avgFinishMs: timedSuccessDurations.length > 0
        ? Math.round(timedSuccessDurations.reduce((sum, value) => sum + value, 0) / timedSuccessDurations.length)
        : null,
      weakestReason: attempts > 0 && successesCount === 0
        ? (failureBreakdown[0]?.failureCode || "failure_code_unavailable")
        : undefined,
      failureBreakdown,
      state: failuresCount > 0 && successesCount === 0
        ? "error"
        : unfinishedCount > 0 || timedSuccessDurations.length !== successesCount
          ? "review"
          : "live",
    };
  });

  const authBreakdown: AuthBreakdownItem[] = methods.map((method) => ({
    method: AUTH_METHOD_LABELS[method.method],
    attempts: method.attempts,
    successes: method.successes,
    failures: method.failures,
    avgDurationMs: method.avgFinishMs ?? 0,
    successRate: method.attempts > 0 ? method.successes / method.attempts : 0,
  }));

  const navigationSessionCompleted = input.telemetryLogsByEvent.auth_navigation_session_completed || [];
  const lifecycleOutcomes: AuthLifecycleOutcome[] = [
    {
      name: "registration_completed",
      count: (input.telemetryLogsByEvent.auth_registration_completed || []).length || input.canonicalRegistrationCount || input.emailRegistrationCount || 0,
      state: "live",
      explanation: "Registration completed is tracked as a lifecycle outcome after the registration API confirms the account bootstrap.",
    },
    {
      name: "navigation_session_established",
      count: navigationSessionCompleted.length,
      state: navigationSessionCompleted.length > 0 ? "live" : "review",
      explanation: navigationSessionCompleted.length > 0
        ? "Navigation session establishment is tracked separately from Firebase auth success."
        : "No navigation-session completion sample was observed in this window.",
    },
  ];

  const attempts = aggregates.length;
  const successes = aggregates.filter((attempt) => attempt.outcome === "success").length;
  const failures = aggregates.filter((attempt) => attempt.outcome === "failure").length;
  const unfinishedCount = aggregates.filter((attempt) => attempt.outcome === "unfinished").length;
  const timedAttempts = aggregates.filter((attempt) => attempt.outcome !== "unfinished" && attempt.durationMs !== null && attempt.durationMs > 0);
  const missingStarts = aggregates.filter((attempt) => attempt.outcome !== "unfinished" && !attempt.startedAtUtc).length;
  const missingFinishes = aggregates.filter((attempt) => attempt.outcome !== "unfinished" && !attempt.finishedAtUtc && !(attempt.durationMs && attempt.durationMs > 0)).length;
  const lastAuthTimestamp = canonicalAttemptRecords.reduce((latest, record) => Math.max(latest, record.timestamp), 0);

  return {
    authBreakdown,
      authOutcomeSummary: {
        generatedAtUtc: input.generatedAtUtc,
        range: input.range,
        sourceMode: "canonical_attempt_chain",
        attempts,
      successes,
      failures,
      unfinished: unfinishedCount,
      successRatePct: attempts > 0 ? Math.round((successes / attempts) * 100) : 0,
      avgFinishMs: timedAttempts.length > 0
        ? Math.round(timedAttempts.reduce((sum, attempt) => sum + (attempt.durationMs || 0), 0) / timedAttempts.length)
        : null,
      timingState: missingStarts > 0
        ? "missing_starts"
        : missingFinishes > 0
          ? "missing_finishes"
          : timedAttempts.length > 0
            ? "available"
            : "unavailable",
      lastAuthEventAtUtc: lastAuthTimestamp > 0 ? new Date(lastAuthTimestamp).toISOString() : null,
      methods,
      lifecycleOutcomes,
    },
  };
}

export function buildHistoricalEngagementAnalytics(input: {
  telemetryLogs: TelemetryLogRecord[];
  telemetryLogsByEvent: Record<string, TelemetryLogRecord[]>;
  eventsData: Record<string, number>;
  onboardingDurationMsSamples: number[];
  emailRegistrationCount: number;
  canonicalRegistrationCount: number;
  analyticsEventFacts?: Array<Record<string, unknown>>;
  sessionFacts?: Array<Record<string, unknown>>;
  taskLifecycleLogs?: Array<Record<string, unknown>>;
  transactionFacts?: Array<Record<string, unknown>>;
  generatedAtUtc?: string;
  range?: string;
}) : HistoricalEngagementAnalytics {
  const { authBreakdown, authOutcomeSummary } = buildAuthOutcomeSummary({
    telemetryLogs: input.telemetryLogs,
    telemetryLogsByEvent: input.telemetryLogsByEvent,
    eventsData: input.eventsData,
    generatedAtUtc: input.generatedAtUtc || new Date().toISOString(),
    range: input.range || "30d",
    emailRegistrationCount: input.emailRegistrationCount,
    canonicalRegistrationCount: input.canonicalRegistrationCount,
  });

  const onboardingDurationsMs = [
    ...(input.onboardingDurationMsSamples.length > 0
      ? input.onboardingDurationMsSamples
      : (input.telemetryLogsByEvent.guided_onboarding_completed || []).map((record) => {
        const directMs = getTelemetryParamNumber(record, "duration_ms");
        if (directMs > 0) {
          return directMs;
        }

        return getTelemetryParamNumber(record, "durationSeconds") * 1000;
      })),
  ].filter((value) => value > 0);

  const onboardingDurationBuckets = buildDurationBuckets(onboardingDurationsMs, [
    { label: "<30s", max: 30_000 },
    { label: "30-60s", max: 60_000 },
    { label: "1-2m", max: 120_000 },
    { label: "2-5m", max: 300_000 },
    { label: "5m+", max: Number.POSITIVE_INFINITY },
  ]);

  const generatedAtUtc = input.generatedAtUtc || new Date().toISOString();
  const { repeatVisitSegments, returnCadenceState } = buildReturnCadenceState({
    analyticsEventFacts: input.analyticsEventFacts,
    sessionFacts: input.sessionFacts,
    taskLifecycleLogs: input.taskLifecycleLogs,
    transactionFacts: input.transactionFacts,
    generatedAtUtc,
    range: input.range || "30d",
  });
  const navigationDestinationsState = buildNavigationDestinationsState({
    telemetryLogsByEvent: input.telemetryLogsByEvent,
    analyticsEventFacts: input.analyticsEventFacts,
    generatedAtUtc,
    range: input.range || "30d",
  });

  return {
    authBreakdown,
    authOutcomeSummary,
    onboardingDurationBuckets,
    repeatVisitSegments,
    returnCadenceState,
    navigationDestinationsState,
    destinationMix: navigationDestinationsState.destinations.map((item) => ({
      destination: item.destinationLabel,
      count: item.count,
    })),
    notificationFunnel: [
      { label: "Prompt views", count: input.eventsData.notification_prompt_banner_viewed || 0 },
      { label: "Prompt dismissals", count: input.eventsData.notification_prompt_banner_dismissed || 0 },
      { label: "Notifications enabled", count: input.eventsData.task_notifications_enabled || 0 },
      { label: "Dropdown opens", count: input.eventsData.notifications_dropdown_opened || 0 },
      { label: "Notifications opened", count: input.eventsData.notification_opened || 0 },
      { label: "Marked read", count: input.eventsData.notification_read || 0 },
    ],
    notificationActions: [
      { label: "Dropdown", value: input.eventsData.notifications_dropdown_opened || 0 },
      { label: "Open", value: input.eventsData.notification_opened || 0 },
      { label: "Read", value: input.eventsData.notification_read || 0 },
      { label: "Clear all", value: input.eventsData.notification_mark_all_read || 0 },
      { label: "Enable", value: input.eventsData.task_notifications_enabled || 0 },
    ],
  };
}
