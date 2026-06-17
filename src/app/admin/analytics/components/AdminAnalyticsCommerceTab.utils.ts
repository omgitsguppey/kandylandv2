import { formatAdminAnalyticsSourceTruthLabel } from "@/lib/analytics/admin-analytics-display-state";

export function formatCommerceScopeLabel(
  scope: string | null | undefined,
  selectedRangeLabel: string,
) {
  switch (scope) {
    case "rolling_30d":
      return "30D";
    case "lifetime":
      return "All time";
    case "selected_range":
      return selectedRangeLabel;
    case "":
    case null:
    case undefined:
      return "Selected range";
    default:
      return scope.replace(/[_/]+/gu, " ");
  }
}

export function formatCommerceMetricLabel(label: string) {
  return label
    .replace(/\bgd\b/giu, "GumDrops")
    .replace(/\bAdj\.\s*/u, "Adjusted ");
}

export function formatCommerceSourceHint(
  scope: string | null | undefined,
  sourceTruth: string | null | undefined,
  selectedRangeLabel: string,
) {
  return `${formatCommerceScopeLabel(scope, selectedRangeLabel)} | ${formatAdminAnalyticsSourceTruthLabel(sourceTruth)}`;
}

export function formatCommerceReadableSourceLabel(label: string | null | undefined) {
  return !label || label === "Unknown source" ? "Source missing" : label;
}

export function formatCommerceFundsLabel(sourceOfFunds: string | null | undefined) {
  return sourceOfFunds ? sourceOfFunds.replace(/[_/]+/gu, " ") : "Source missing";
}
