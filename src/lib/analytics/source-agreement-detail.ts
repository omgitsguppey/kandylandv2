export type SourceAgreementCoverageInput = {
  source: string;
  days: string[];
};

export type SourceAgreementFailureDetail = {
  comparedSources: string[];
  disagreementCount: number;
  maxDeltaPct: number;
  perSourceCoverage: Array<{ source: string; dayCount: number; days: string[] }>;
  missingDaysBySource: Record<string, string[]>;
  extraDaysBySource: Record<string, string[]>;
  comparedMetrics: string[];
  toleranceThresholds: {
    reviewDeltaPct: number;
    failDeltaPct: number;
  };
  blockedConsumers: string[];
  nextAction: string;
};

export function buildSourceAgreementFailureDetail(input: {
  comparedSources: SourceAgreementCoverageInput[] | string[];
  coverageBySource?: Record<string, string[]>;
  expectedDays?: string[];
  comparedMetrics?: string[];
  tolerance?: { reviewDeltaPct?: number; failDeltaPct?: number };
  reviewDeltaPct?: number;
  failDeltaPct?: number;
  blockedConsumers?: string[];
}): SourceAgreementFailureDetail {
  const comparedSources: SourceAgreementCoverageInput[] = input.comparedSources.map((entry) => {
    if (typeof entry !== "string") return entry;
    return {
      source: entry,
      days: input.coverageBySource?.[entry] ?? [],
    };
  });
  const expectedDays = [...new Set((input.expectedDays ?? [
    ...Object.values(input.coverageBySource ?? {}).flat(),
    ...comparedSources.flatMap((entry) => entry.days),
  ]).filter(Boolean))].sort();
  const expectedDaySet = new Set(expectedDays);
  const perSourceCoverage = comparedSources.map((entry) => {
    const days = [...new Set(entry.days.filter(Boolean))].sort();
    return {
      source: entry.source,
      dayCount: days.filter((day) => expectedDaySet.has(day)).length,
      days,
    };
  });
  const sourceDaySets = new Map(perSourceCoverage.map((entry) => [entry.source, new Set(entry.days)]));
  const allDays = [...new Set([...expectedDays, ...perSourceCoverage.flatMap((entry) => entry.days)])].sort();
  const disagreementCount = allDays.filter((day) => {
    const coverage = comparedSources.map((entry) => sourceDaySets.get(entry.source)?.has(day) ?? false);
    return coverage.some(Boolean) && !coverage.every(Boolean);
  }).length;
  const activeCounts = perSourceCoverage.filter((entry) => entry.dayCount > 0).map((entry) => entry.dayCount);
  const maxCoverage = activeCounts.length > 0 ? Math.max(...activeCounts) : 0;
  const minCoverage = activeCounts.length > 0 ? Math.min(...activeCounts) : 0;
  const maxDeltaPct = activeCounts.length > 1 && maxCoverage > 0
    ? Math.round(((maxCoverage - minCoverage) / maxCoverage) * 100)
    : 0;
  const missingDaysBySource = Object.fromEntries(
    perSourceCoverage.map((entry) => [
      entry.source,
      expectedDays.filter((day) => !sourceDaySets.get(entry.source)?.has(day)),
    ]),
  );
  const extraDaysBySource = Object.fromEntries(
    perSourceCoverage.map((entry) => [
      entry.source,
      entry.days.filter((day) => !expectedDaySet.has(day)),
    ]),
  );

  return {
    comparedSources: comparedSources.map((entry) => entry.source),
    disagreementCount,
    maxDeltaPct,
    perSourceCoverage,
    missingDaysBySource,
    extraDaysBySource,
    comparedMetrics: input.comparedMetrics ?? ["day_bucket_presence", "coverage_delta_pct"],
    toleranceThresholds: {
      reviewDeltaPct: input.tolerance?.reviewDeltaPct ?? input.reviewDeltaPct ?? 10,
      failDeltaPct: input.tolerance?.failDeltaPct ?? input.failDeltaPct ?? 25,
    },
    blockedConsumers: input.blockedConsumers ?? [
      "admin_analytics_overview",
      "admin_analytics_charts",
      "admin_analytics_insight_cards",
      "public_beta_score_evidence",
    ],
    nextAction: "Refresh or repair the mismatched source lane, inspect first-party day buckets first, keep GA4 as external comparison evidence, classify fallback historical/legacy evidence as archive-only until it agrees, and verify the GA4 property before promoting analytics parity.",
  };
}
