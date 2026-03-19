import "server-only";

import {
  AnalyticsReportRow,
  OnboardingStepFactRecord,
  safeParams,
  toNumber,
  toStringValue,
} from "./admin-analytics-shared";

export interface HistoricalOnboardingOverview {
  onboardingDurationMsSamples: number[];
  onboardingStepFacts: OnboardingStepFactRecord[];
  onboardingStepStats: Array<{
    stepKey: string;
    stepTitle: string;
    stepIndex: number;
    starts: number;
    completions: number;
    avgDurationMs: number;
  }>;
  guidedOnboardingCompletionCount: number;
  legacyOnboardingCompletionCount: number;
  normalizedOnboardingCompletions: number;
  onboardingStartCount: number;
  onboardingStartSource: "tracked" | "completion_fallback" | "none";
  avgOnboardingDuration: number;
  onboardingCompletionRate: number;
}

type ParsedOnboardingStartRecord = {
  timestamp: number;
  userId: string;
  flowStartedAtMs: number;
};

type ParsedOnboardingCompletionRecord = {
  timestamp: number;
  userId: string;
  flowStartedAtMs: number;
  durationMs: number;
  source: string;
};

type ParsedOnboardingStepRecord = OnboardingStepFactRecord & {
  userId: string;
  flowStartedAtMs: number;
  startedAtMs: number;
  source: string;
};

function toPositiveMs(value: unknown) {
  const numeric = toNumber(value);
  return numeric > 0 ? numeric : 0;
}

function buildFallbackBucketKey(prefix: string, userId: string, timestamp: number, bucketMs = 10 * 60 * 1000) {
  return `${prefix}:${userId || "unknown"}:${Math.floor(timestamp / bucketMs)}`;
}

function dedupeOnboardingStarts(records: ParsedOnboardingStartRecord[]) {
  const seen = new Set<string>();

  return [...records]
    .sort((left, right) => {
      const leftHasFlowStart = left.flowStartedAtMs > 0 ? 1 : 0;
      const rightHasFlowStart = right.flowStartedAtMs > 0 ? 1 : 0;
      if (leftHasFlowStart !== rightHasFlowStart) {
        return rightHasFlowStart - leftHasFlowStart;
      }
      return left.timestamp - right.timestamp;
    })
    .filter((record) => {
      const exactKey = record.flowStartedAtMs > 0
        ? `onboarding-start:${record.userId || "unknown"}:${record.flowStartedAtMs}`
        : null;
      const bucketKey = buildFallbackBucketKey("onboarding-start", record.userId, record.timestamp);
      if ((exactKey && seen.has(exactKey)) || seen.has(bucketKey)) {
        return false;
      }

      if (exactKey) {
        seen.add(exactKey);
      }
      seen.add(bucketKey);
      return true;
    });
}

function dedupeOnboardingCompletions(records: ParsedOnboardingCompletionRecord[]) {
  const seen = new Set<string>();

  return [...records]
    .sort((left, right) => {
      const leftCanonical = left.source === "complete_onboarding_route" ? 1 : 0;
      const rightCanonical = right.source === "complete_onboarding_route" ? 1 : 0;
      if (leftCanonical !== rightCanonical) {
        return rightCanonical - leftCanonical;
      }
      return left.timestamp - right.timestamp;
    })
    .filter((record) => {
      const exactKey = record.flowStartedAtMs > 0
        ? `onboarding-complete:${record.userId || "unknown"}:${record.flowStartedAtMs}`
        : null;
      const bucketKey = buildFallbackBucketKey("onboarding-complete", record.userId, record.timestamp);
      if ((exactKey && seen.has(exactKey)) || seen.has(bucketKey)) {
        return false;
      }

      if (exactKey) {
        seen.add(exactKey);
      }
      seen.add(bucketKey);
      return true;
    });
}

function dedupeOnboardingStepFacts(records: ParsedOnboardingStepRecord[]) {
  const seen = new Set<string>();

  return [...records]
    .sort((left, right) => {
      const leftCanonical = left.source === "complete_onboarding_route" ? 1 : 0;
      const rightCanonical = right.source === "complete_onboarding_route" ? 1 : 0;
      if (leftCanonical !== rightCanonical) {
        return rightCanonical - leftCanonical;
      }
      return left.timestamp - right.timestamp;
    })
    .filter((record) => {
      const exactSeed = record.flowStartedAtMs || record.startedAtMs;
      const exactKey = exactSeed > 0
        ? `${record.eventName}:${record.userId || "unknown"}:${record.stepKey}:${exactSeed}`
        : null;
      const bucketKey = buildFallbackBucketKey(
        `${record.eventName}:${record.stepKey}`,
        record.userId,
        record.timestamp,
      );
      if ((exactKey && seen.has(exactKey)) || seen.has(bucketKey)) {
        return false;
      }

      if (exactKey) {
        seen.add(exactKey);
      }
      seen.add(bucketKey);
      return true;
    });
}

export function buildHistoricalOnboardingOverview(input: {
  onboardingRows: AnalyticsReportRow[];
  analyticsEventFacts: FirebaseFirestore.QueryDocumentSnapshot[];
  startMs: number;
  eventsData: Record<string, number>;
}): HistoricalOnboardingOverview {
  let totalOnboardingCompletions = 0;
  let totalOnboardingSeconds = 0;
  const onboardingStartFacts = dedupeOnboardingStarts(input.analyticsEventFacts
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const params = safeParams(data.params);
      const eventName = toStringValue(data.eventName);
      const timestamp = toNumber(data.timestamp);
      return {
        eventName,
        timestamp,
        userId: toStringValue(data.userId),
        flowStartedAtMs: Math.max(
          toPositiveMs(params.overall_started_at_ms),
          toPositiveMs(params.started_at_ms),
        ),
      };
    })
    .filter((fact) =>
      fact.timestamp >= input.startMs
      && fact.eventName === "guided_onboarding_started",
    ));

  const normalizedOnboardingFacts = dedupeOnboardingCompletions(input.analyticsEventFacts
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const params = safeParams(data.params);
      const timestamp = toNumber(data.timestamp);
      const durationMs = Math.max(toNumber(data.durationMs), toNumber(params.duration_ms));
      const flowStartedAtMs = Math.max(
        toPositiveMs(params.started_at_ms),
        toPositiveMs(params.overall_started_at_ms),
        durationMs > 0 ? Math.max(0, timestamp - durationMs) : 0,
      );

      return {
        eventName: toStringValue(data.eventName),
        timestamp,
        userId: toStringValue(data.userId),
        flowStartedAtMs,
        durationMs,
        source: toStringValue(params.source),
      };
    })
    .filter((fact) => fact.eventName === "guided_onboarding_completed" && fact.timestamp >= input.startMs));

  const onboardingStepFacts: OnboardingStepFactRecord[] = dedupeOnboardingStepFacts(input.analyticsEventFacts
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const params = safeParams(data.params);
      const timestamp = toNumber(data.timestamp);
      return {
        eventName: toStringValue(data.eventName),
        timestamp,
        userId: toStringValue(data.userId),
        stepKey: toStringValue(params.step_key),
        stepTitle: toStringValue(params.step_title),
        stepIndex: toNumber(params.step_index),
        durationMs: Math.max(toNumber(data.durationMs), toNumber(params.duration_ms)),
        flowStartedAtMs: Math.max(
          toPositiveMs(params.overall_started_at_ms),
          toPositiveMs(params.started_at_ms),
        ),
        startedAtMs: toPositiveMs(params.started_at_ms),
        source: toStringValue(params.source),
      };
    })
    .filter((fact) =>
      fact.timestamp >= input.startMs
      && (fact.eventName === "guided_onboarding_step_started" || fact.eventName === "guided_onboarding_step_completed")
      && fact.stepKey.length > 0,
    ))
    .map(({ userId: _userId, flowStartedAtMs: _flowStartedAtMs, startedAtMs: _startedAtMs, source: _source, ...fact }) => fact);

  input.onboardingRows.forEach((row) => {
    const durationRaw = row.dimensionValues?.[0]?.value || "(not set)";
    const count = parseInt(row.metricValues?.[0]?.value || "0", 10);
    if (durationRaw === "(not set)") {
      return;
    }

    const seconds = parseInt(durationRaw, 10);
    if (!Number.isNaN(seconds)) {
      totalOnboardingSeconds += seconds * count;
      totalOnboardingCompletions += count;
    }
  });

  if (normalizedOnboardingFacts.length > 0) {
    totalOnboardingCompletions = normalizedOnboardingFacts.length;
    totalOnboardingSeconds = normalizedOnboardingFacts.reduce((sum, fact) => sum + Math.round(fact.durationMs / 1000), 0);
  }

  const onboardingStepStatsMap = new Map<string, {
    stepKey: string;
    stepTitle: string;
    stepIndex: number;
    starts: number;
    completions: number;
    durationTotalMs: number;
  }>();

  onboardingStepFacts.forEach((fact) => {
    const existing = onboardingStepStatsMap.get(fact.stepKey) || {
      stepKey: fact.stepKey,
      stepTitle: fact.stepTitle || fact.stepKey.replaceAll("_", " "),
      stepIndex: fact.stepIndex,
      starts: 0,
      completions: 0,
      durationTotalMs: 0,
    };

    if (fact.eventName === "guided_onboarding_step_started") {
      existing.starts += 1;
    }
    if (fact.eventName === "guided_onboarding_step_completed") {
      existing.completions += 1;
      existing.durationTotalMs += fact.durationMs;
    }

    onboardingStepStatsMap.set(fact.stepKey, existing);
  });

  const onboardingStepStats = Array.from(onboardingStepStatsMap.values())
    .sort((left, right) => left.stepIndex - right.stepIndex)
    .map((entry) => ({
      stepKey: entry.stepKey,
      stepTitle: entry.stepTitle,
      stepIndex: entry.stepIndex,
      starts: Math.max(entry.starts, entry.completions),
      completions: entry.completions,
      avgDurationMs: entry.completions > 0
        ? Math.round(entry.durationTotalMs / entry.completions)
        : 0,
    }));

  const guidedOnboardingStartCount = onboardingStartFacts.length > 0
    ? onboardingStartFacts.length
    : (input.eventsData.guided_onboarding_started || 0);
  const legacyOnboardingStartCount = input.eventsData.onboarding_started || 0;
  const guidedOnboardingCompletionCount = normalizedOnboardingFacts.length > 0
    ? normalizedOnboardingFacts.length
    : Math.max(totalOnboardingCompletions, input.eventsData.guided_onboarding_completed || 0);
  const legacyOnboardingCompletionCount = input.eventsData.onboarding_complete || 0;
  const normalizedOnboardingCompletions = guidedOnboardingCompletionCount + legacyOnboardingCompletionCount;
  const avgOnboardingDuration = normalizedOnboardingCompletions > 0
    ? Math.round(totalOnboardingSeconds / Math.max(1, guidedOnboardingCompletionCount))
    : 0;
  const onboardingStartCount = Math.max(
    guidedOnboardingStartCount + legacyOnboardingStartCount,
    normalizedOnboardingCompletions,
  );
  const onboardingStartSource = (guidedOnboardingStartCount + legacyOnboardingStartCount) > 0
    ? "tracked"
    : normalizedOnboardingCompletions > 0
      ? "completion_fallback"
      : "none";
  const onboardingCompletionRate = onboardingStartCount > 0
    ? normalizedOnboardingCompletions / onboardingStartCount
    : 0;

  return {
    onboardingDurationMsSamples: normalizedOnboardingFacts.map((fact) => fact.durationMs).filter((value) => value > 0),
    onboardingStepFacts,
    onboardingStepStats,
    guidedOnboardingCompletionCount,
    legacyOnboardingCompletionCount,
    normalizedOnboardingCompletions,
    onboardingStartCount,
    onboardingStartSource,
    avgOnboardingDuration,
    onboardingCompletionRate,
  };
}
