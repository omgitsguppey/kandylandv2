import "server-only";

import {
  AnalyticsReportRow,
  OnboardingFactRecord,
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

export function buildHistoricalOnboardingOverview(input: {
  onboardingRows: AnalyticsReportRow[];
  analyticsEventFacts: FirebaseFirestore.QueryDocumentSnapshot[];
  startMs: number;
  eventsData: Record<string, number>;
}): HistoricalOnboardingOverview {
  let totalOnboardingCompletions = 0;
  let totalOnboardingSeconds = 0;

  const normalizedOnboardingFacts: OnboardingFactRecord[] = input.analyticsEventFacts
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const params = safeParams(data.params);
      return {
        eventName: toStringValue(data.eventName),
        timestamp: toNumber(data.timestamp),
        durationMs: Math.max(toNumber(data.durationMs), toNumber(params.duration_ms)),
      };
    })
    .filter((fact) => fact.eventName === "guided_onboarding_completed" && fact.timestamp >= input.startMs);

  const onboardingStepFacts: OnboardingStepFactRecord[] = input.analyticsEventFacts
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const params = safeParams(data.params);
      return {
        eventName: toStringValue(data.eventName),
        timestamp: toNumber(data.timestamp),
        stepKey: toStringValue(params.step_key),
        stepTitle: toStringValue(params.step_title),
        stepIndex: toNumber(params.step_index),
        durationMs: Math.max(toNumber(data.durationMs), toNumber(params.duration_ms)),
      };
    })
    .filter((fact) =>
      fact.timestamp >= input.startMs
      && (fact.eventName === "guided_onboarding_step_started" || fact.eventName === "guided_onboarding_step_completed")
      && fact.stepKey.length > 0,
    );

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

  const guidedOnboardingStartCount = input.eventsData.guided_onboarding_started || 0;
  const legacyOnboardingStartCount = input.eventsData.onboarding_started || 0;
  const guidedOnboardingCompletionCount = Math.max(totalOnboardingCompletions, input.eventsData.guided_onboarding_completed || 0);
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
