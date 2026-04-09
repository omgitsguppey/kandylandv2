export interface AuthOutcomeBreakdownInput {
  method: string;
  attempts: number;
  successes: number;
  failures: number;
  avgDurationMs: number;
  successRate: number;
}

export interface AuthOutcomeChartItem extends AuthOutcomeBreakdownInput {
  label: string;
  unfinished: number;
}

export interface AuthOutcomeChartTotals {
  attempts: number;
  successes: number;
  failures: number;
  unfinished: number;
  successRate: number;
  weightedAvgDurationMs: number;
}

export interface AuthOutcomeChartModel {
  items: AuthOutcomeChartItem[];
  totals: AuthOutcomeChartTotals;
  hasData: boolean;
}

export function formatAuthOutcomeMethodLabel(method: string): string {
  const normalized = method.trim().replaceAll("_", " ").replaceAll("-", " ");
  const lowered = normalized.toLowerCase();

  if (lowered === "google" || lowered === "google.com") return "Google";
  if (
    lowered === "password" ||
    lowered === "email" ||
    lowered === "email password" ||
    lowered === "manual"
  )
    return "Email";
  if (!normalized) return "Unknown";

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((segment) => {
      if (segment.length <= 3) {
        return segment.toUpperCase();
      }
      return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
    })
    .join(" ");
}

export function buildAuthOutcomeChartModel(
  breakdown: AuthOutcomeBreakdownInput[],
): AuthOutcomeChartModel {
  const items = breakdown
    .map<AuthOutcomeChartItem>((item) => ({
      ...item,
      label: formatAuthOutcomeMethodLabel(item.method),
      unfinished: Math.max(0, item.attempts - item.successes - item.failures),
    }))
    .sort((left, right) => {
      if (right.attempts !== left.attempts)
        return right.attempts - left.attempts;
      if (right.successes !== left.successes)
        return right.successes - left.successes;
      return left.label.localeCompare(right.label);
    });

  const aggregate = items.reduce(
    (accumulator, item) => ({
      attempts: accumulator.attempts + item.attempts,
      successes: accumulator.successes + item.successes,
      failures: accumulator.failures + item.failures,
      unfinished: accumulator.unfinished + item.unfinished,
      durationWeight:
        accumulator.durationWeight + item.avgDurationMs * item.successes,
      durationSampleCount: accumulator.durationSampleCount + item.successes,
    }),
    {
      attempts: 0,
      successes: 0,
      failures: 0,
      unfinished: 0,
      durationWeight: 0,
      durationSampleCount: 0,
    },
  );

  const hasData = items.some(
    (item) =>
      item.attempts > 0 ||
      item.successes > 0 ||
      item.failures > 0 ||
      item.unfinished > 0 ||
      item.avgDurationMs > 0,
  );

  return {
    items,
    totals: {
      attempts: aggregate.attempts,
      successes: aggregate.successes,
      failures: aggregate.failures,
      unfinished: aggregate.unfinished,
      successRate:
        aggregate.attempts > 0
          ? aggregate.successes / Math.max(1, aggregate.attempts)
          : 0,
      weightedAvgDurationMs:
        aggregate.durationSampleCount > 0
          ? aggregate.durationWeight /
            Math.max(1, aggregate.durationSampleCount)
          : 0,
    },
    hasData,
  };
}
