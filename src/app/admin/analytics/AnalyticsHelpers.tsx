import { Activity, DollarSign, Funnel, Loader2, Monitor, Smartphone, Users } from "lucide-react";
import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import { ADMIN_ANALYTICS_DEFAULT_RANGE, ADMIN_ANALYTICS_RANGE_OPTIONS } from "@/lib/admin-analytics-preferences";
import type { 
  CountBucketItem, 
  HistoricalAnalyticsResponse, 
  OnboardingStepStatItem, 
  RangeOption, 
  RawEventItem, 
  UserJourneyItem, 
  ValidationItem, 
  ViewTab, 
  WatchCaptureHealthItem 
} from "@/types/admin-analytics";

export const EMPTY_ONBOARDING_STATS = {
  starts: 0,
  completions: 0,
  avgDuration: 0,
  completionRate: 0,
  startSource: "none" as const,
};
export const EMPTY_ONBOARDING_STEP_STATS: OnboardingStepStatItem[] = [];
export const EMPTY_COUNT_BUCKETS: CountBucketItem[] = [];
export const EMPTY_WATCH_CAPTURE_HEALTH: WatchCaptureHealthItem = {
  sessionCount: 0,
  fullCaptureCount: 0,
  degradedSessionCount: 0,
  replayRecoveredCount: 0,
  gapDetectedCount: 0,
  flushDegradedCount: 0,
  closeMissingCount: 0,
  degradedRate: 0,
  averageGapMs: 0,
  averageHiddenSeconds: 0,
  averageWaitSeconds: 0,
  averageSeekCount: 0,
  averagePlaybackRate: 0,
  mutedSessionCount: 0,
  transportBreakdown: [],
  lastSeenAtMs: 0,
  warnings: [],
};

export interface TooltipValue {
  color?: string;
  name?: string;
  value?: string | number;
}

export const RANGE_OPTIONS: Array<{ value: RangeOption; label: string }> =
  ADMIN_ANALYTICS_RANGE_OPTIONS.map((value) => ({
    value,
    label: value === "all" ? "All" : value.toUpperCase(),
  }));

export const TAB_OPTIONS: Array<{
  id: ViewTab;
  label: string;
  icon: typeof Activity;
}> = [
  { id: "operations", label: "Operations", icon: Activity },
  { id: "audience", label: "Audience", icon: Users },
  { id: "commerce", label: "Commerce", icon: DollarSign },
];

export const PIE_COLORS = [
  "#b28cff",
  "#7c3aed",
  "#22d3ee",
  "#f472b6",
  "#34d399",
  "#f59e0b",
];
export const ANALYTICS_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Chicago",
});
export const ANALYTICS_FILTER_STORAGE_KEY = "kandydrops.admin.analytics.filters";

export function buildSectionHistoricalUrl(
  section: string,
  range: RangeOption,
  viewerUser?: string,
) {
  const searchParams = new URLSearchParams({
    period: range,
    section,
  });

  if (viewerUser) {
    searchParams.set("viewerUser", viewerUser);
  }

  return `/api/admin/analytics/historical?${searchParams.toString()}`;
}

export function SectionRangeControl({
  sectionKey,
  range,
  saving,
  onChange,
}: {
  sectionKey: string;
  range: RangeOption;
  saving?: boolean;
  onChange: (sectionKey: string, range: RangeOption) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-300">
      <Funnel className="h-3.5 w-3.5 text-gray-400" />
      <select
        value={range}
        onChange={(event) =>
          onChange(sectionKey, event.target.value as RangeOption)
        }
        disabled={saving}
        className="bg-transparent text-[11px] font-semibold uppercase tracking-[0.14em] text-white outline-none"
      >
        {RANGE_OPTIONS.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-black text-white"
          >
            {option.label}
          </option>
        ))}
      </select>
      {saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-purple" />
      ) : null}
    </label>
  );
}

export function useHistoricalSectionOverride(
  sectionKey: string,
  range: RangeOption,
  viewerUser?: string,
) {
  const shouldFetchOverride =
    range !== ADMIN_ANALYTICS_DEFAULT_RANGE || Boolean(viewerUser);
  return useAdminPollingSWR<HistoricalAnalyticsResponse>(
    shouldFetchOverride
      ? buildSectionHistoricalUrl(sectionKey, range, viewerUser)
      : null,
    60_000,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value < 1000 ? 0 : 1,
  }).format(value);
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  const percent = value * 100;
  if (percent > 0 && percent < 0.1) return "<0.1%";
  if (percent > 0 && percent < 10) return `${percent.toFixed(1)}%`;
  return `${Math.round(percent)}%`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 1) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

export function formatRelativeTime(timestamp: number, nowMs: number): string {
  if (!timestamp || !nowMs) return "Unknown";
  const diff = Math.max(0, nowMs - timestamp);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatAbsoluteDateTime(timestamp: string | number | null | undefined) {
  if (!timestamp) return "Unknown";

  const normalizedTimestamp =
    typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp;

  if (!Number.isFinite(normalizedTimestamp)) {
    return "Unknown";
  }

  return ANALYTICS_DATE_TIME_FORMATTER.format(new Date(normalizedTimestamp));
}

export function getValidationClasses(status: ValidationItem["status"]) {
  if (status === "pass") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "fail") {
    return "border-red-500/20 bg-red-500/10 text-red-200";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-200";
}

export function describeEvent(event: RawEventItem): string {
  if (event.detail) return event.detail;
  if (event.type === "scroll")
    return `Scrolled to ${event.scrollDepthPercent ?? 0}% depth`;
  if (event.type === "click")
    return `Clicked ${event.targetText || event.targetId || event.targetTag || "element"}`;
  if (event.type === "hover")
    return `Hovered ${event.targetText || event.targetId || event.targetTag || "element"}`;
  return "Interaction event";
}

export function getDeviceIcon(device: string) {
  return device.toLowerCase() === "mobile" ? Smartphone : Monitor;
}

export function isRecentViolation(timestamp: string | null, nowMs: number): boolean {
  if (!timestamp) return false;
  const diffMs = nowMs - new Date(timestamp).getTime();
  return diffMs < 24 * 60 * 60 * 1000;
}

export function getJourneyStateLabel(state: UserJourneyItem["journeyState"]) {
  switch (state) {
    case "engaged":
      return "Engaged";
    case "bounced":
      return "Bounced";
    case "mixed":
      return "Mixed";
    default:
      return "In progress";
  }
}

export function getJourneyStateClasses(state: UserJourneyItem["journeyState"]) {
  switch (state) {
    case "engaged":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
    case "bounced":
      return "border-amber-400/20 bg-amber-400/10 text-amber-200";
    case "mixed":
      return "border-cyan-400/20 bg-cyan-400/10 text-cyan-100";
    default:
      return "border-white/10 bg-white/5 text-gray-300";
  }
}
