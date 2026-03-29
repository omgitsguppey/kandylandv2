export type ParityStatus = "pass" | "warn" | "fail";
export type ModuleCoverageStatus = "healthy" | "partial" | "empty";

export interface AnalyticsSourceCount {
  key: string;
  label: string;
  count: number;
}

export interface ParityInsight {
  status: ParityStatus;
  score: number;
  referenceCount: number;
  spread: number;
  populatedSources: number;
}

export interface ModuleCoverageReport {
  key: string;
  label: string;
  status: ModuleCoverageStatus;
  score: number;
  total: number;
  populatedSources: number;
  detail: string;
  sources: AnalyticsSourceCount[];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function buildParityInsight(
  sources: AnalyticsSourceCount[],
  options?: {
    tolerance?: number;
    relativeTolerance?: number;
  },
): ParityInsight {
  const normalizedCounts = sources
    .map((source) => Math.max(0, Math.round(source.count)))
    .filter((count) => Number.isFinite(count));

  if (normalizedCounts.length === 0) {
    return {
      status: "fail",
      score: 0,
      referenceCount: 0,
      spread: 0,
      populatedSources: 0,
    };
  }

  const sortedCounts = [...normalizedCounts].sort((left, right) => left - right);
  const midpoint = Math.floor(sortedCounts.length / 2);
  const referenceCount = sortedCounts.length % 2 === 0
    ? Math.round((sortedCounts[midpoint - 1] + sortedCounts[midpoint]) / 2)
    : sortedCounts[midpoint];
  const spread = sortedCounts[sortedCounts.length - 1] - sortedCounts[0];
  const populatedSources = normalizedCounts.filter((count) => count > 0).length;
  const tolerance = options?.tolerance ?? 1;
  const relativeTolerance = options?.relativeTolerance ?? 0.18;
  const relativeSpread = referenceCount > 0 ? spread / referenceCount : spread > 0 ? 1 : 0;

  let status: ParityStatus = "pass";
  if (spread > tolerance && relativeSpread > relativeTolerance) {
    status = "warn";
  }
  if (spread > tolerance * 2 && relativeSpread > relativeTolerance * 1.75) {
    status = "fail";
  }

  const effectiveSpread = status === "pass" ? 0 : relativeSpread;
  const stabilityScore = 1 - clamp(effectiveSpread, 0, 1);
  const coverageScore = normalizedCounts.length > 0 ? populatedSources / normalizedCounts.length : 0;
  const score = Math.round((stabilityScore * 0.6 + coverageScore * 0.4) * 100);

  return {
    status,
    score,
    referenceCount,
    spread,
    populatedSources,
  };
}

export function buildModuleCoverageReport(input: {
  key: string;
  label: string;
  sources: AnalyticsSourceCount[];
  emptyDetail: string;
}): ModuleCoverageReport {
  const normalizedSources = input.sources.map((source) => ({
    ...source,
    count: Math.max(0, Math.round(source.count)),
  }));
  const total = normalizedSources.reduce((maxCount, source) => Math.max(maxCount, source.count), 0);
  const populatedSources = normalizedSources.filter((source) => source.count > 0).length;
  const parity = buildParityInsight(normalizedSources);

  let status: ModuleCoverageStatus = "healthy";
  if (total === 0) {
    status = "empty";
  } else if (populatedSources < 2) {
    status = "partial";
  }

  const detail = status === "empty"
    ? input.emptyDetail
    : `${populatedSources}/${normalizedSources.length} indexed sources populated with a parity score of ${parity.score}%.`;

  return {
    key: input.key,
    label: input.label,
    status,
    score: total === 0 ? 0 : parity.score,
    total,
    populatedSources,
    detail,
    sources: normalizedSources,
  };
}

export function sumCountBuckets(items: Array<{ count?: number; value?: number }>) {
  return items.reduce((total, item) => total + Math.max(0, Math.round(item.count ?? item.value ?? 0)), 0);
}
