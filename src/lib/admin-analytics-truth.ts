export type AnalyticsTruthStatus = "healthy" | "warn" | "fail";

export interface AnalyticsTruthSourceInput {
  key: string;
  label: string;
  count: number;
  lastSeenAt: number;
  required?: boolean;
  legacyHistoricalSupport?: boolean;
  detail?: string;
}

export interface AnalyticsTruthSourceSummary {
  key: string;
  label: string;
  count: number;
  lastSeenAt: number;
  required: boolean;
  legacyHistoricalSupport: boolean;
  status: AnalyticsTruthStatus;
  ageMs: number | null;
  detail: string;
}

export interface AnalyticsTruthSummary {
  score: number;
  healthy: number;
  warn: number;
  fail: number;
  staleRequiredCount: number;
  legacyCoverageWarnings: number;
  sources: AnalyticsTruthSourceSummary[];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getSourceStatus(input: {
  count: number;
  lastSeenAt: number;
  nowMs: number;
  staleWarnMs: number;
  staleFailMs: number;
  required: boolean;
}): AnalyticsTruthStatus {
  if (input.count <= 0 && input.lastSeenAt <= 0) {
    return input.required ? "fail" : "warn";
  }

  if (input.lastSeenAt > 0) {
    const ageMs = Math.max(0, input.nowMs - input.lastSeenAt);
    if (ageMs >= input.staleFailMs) {
      return "fail";
    }
    if (ageMs >= input.staleWarnMs) {
      return "warn";
    }
  }

  if (input.count <= 0) {
    return input.required ? "fail" : "warn";
  }

  return "healthy";
}

export function summarizeAnalyticsTruth(input: {
  sources: AnalyticsTruthSourceInput[];
  nowMs?: number;
  staleWarnMs?: number;
  staleFailMs?: number;
}): AnalyticsTruthSummary {
  const nowMs = input.nowMs ?? Date.now();
  const staleWarnMs = input.staleWarnMs ?? 1000 * 60 * 60 * 24 * 3;
  const staleFailMs = input.staleFailMs ?? 1000 * 60 * 60 * 24 * 14;

  const sources = input.sources.map((source) => {
    const required = source.required !== false;
    const legacyHistoricalSupport = source.legacyHistoricalSupport === true;
    const ageMs =
      source.lastSeenAt > 0 ? Math.max(0, nowMs - source.lastSeenAt) : null;
    const status = getSourceStatus({
      count: source.count,
      lastSeenAt: source.lastSeenAt,
      nowMs,
      staleWarnMs,
      staleFailMs,
      required,
    });

    return {
      key: source.key,
      label: source.label,
      count: Math.max(0, Math.round(source.count)),
      lastSeenAt: source.lastSeenAt,
      required,
      legacyHistoricalSupport,
      status,
      ageMs,
      detail: source.detail || "",
    } satisfies AnalyticsTruthSourceSummary;
  });

  const healthy = sources.filter((source) => source.status === "healthy").length;
  const warn = sources.filter((source) => source.status === "warn").length;
  const fail = sources.filter((source) => source.status === "fail").length;
  const staleRequiredCount = sources.filter(
    (source) => source.required && source.status !== "healthy",
  ).length;
  const legacyCoverageWarnings = sources.filter(
    (source) => source.legacyHistoricalSupport && source.status !== "healthy",
  ).length;

  const score = Math.round(
    clamp(
      sources.reduce((sum, source) => {
        if (source.status === "healthy") {
          return sum + 100;
        }
        if (source.status === "warn") {
          return sum + 65;
        }
        return sum + 20;
      }, 0) / Math.max(1, sources.length),
      0,
      100,
    ),
  );

  return {
    score,
    healthy,
    warn,
    fail,
    staleRequiredCount,
    legacyCoverageWarnings,
    sources,
  };
}
