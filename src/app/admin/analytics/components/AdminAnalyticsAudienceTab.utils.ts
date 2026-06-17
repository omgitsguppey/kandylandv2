import type { AdminAnalyticsState } from "../hooks/useAdminAnalyticsState";

type TopPathRow = AdminAnalyticsState["topPathsModel"]["rows"][number];
type RegionRow = AdminAnalyticsState["regionsModel"]["rows"][number];

export type AudienceTopPathFilter =
  | "all"
  | "high_volume_low_engagement"
  | "zero_time"
  | "creator"
  | "legal_static"
  | "dashboard_authenticated";

export function formatAudienceSeriesLabel(label: string) {
  return label.replaceAll("GA4", "Site").replaceAll("GA ", "Site ");
}

export function filterAudienceTopPathRows(
  rows: TopPathRow[],
  searchInput: string,
  filter: AudienceTopPathFilter,
) {
  const search = searchInput.trim().toLowerCase();

  return rows.filter((row) => {
    const matchesSearch =
      search.length === 0 ||
      row.path.toLowerCase().includes(search) ||
      row.label.toLowerCase().includes(search);
    if (!matchesSearch) {
      return false;
    }

    switch (filter) {
      case "high_volume_low_engagement":
        return row.issueState === "warning";
      case "zero_time":
        return (row.avgTimeSeconds ?? 0) <= 1;
      case "creator":
        return row.routeGroup === "creator";
      case "legal_static":
        return row.routeGroup === "legal" || row.routeGroup === "support";
      case "dashboard_authenticated":
        return row.routeGroup === "dashboard" || row.routeGroup === "auth";
      default:
        return true;
    }
  });
}

export function formatAudienceRegionLabel(item: RegionRow, unknownLabel = "Unknown location") {
  if (!item.city && !item.country) {
    return unknownLabel;
  }
  if (!item.city && item.country) {
    return `Unknown city, ${item.country}`;
  }
  if (item.city && !item.country) {
    return `${item.city}, Unknown country`;
  }
  return `${item.city}, ${item.country}`;
}

export function formatAudienceRegionCount(count: number, countUnit: string) {
  const unitLabel = count === 1 ? countUnit.replace(/s$/u, "") : countUnit;
  return `${count.toLocaleString()} ${unitLabel}`;
}

export function buildAudienceRegionChartRows(rows: RegionRow[]) {
  return rows.map((item) => {
    const displayLabel = formatAudienceRegionLabel(item);
    return {
      ...item,
      displayLabel,
      chartLabel: displayLabel.length > 18 ? `${displayLabel.slice(0, 18)}...` : displayLabel,
    };
  });
}
