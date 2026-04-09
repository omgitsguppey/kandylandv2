"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  BellRing,
  Candy,
  CheckCircle2,
  Clock3,
  DollarSign,
  Eye,
  FileText,
  Funnel,
  Loader2,
  MapPin,
  Monitor,
  PlayCircle,
  Route,
  Share2,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import { useAdminUiChartHealthReporter } from "@/hooks/useAdminUiChartHealthReporter";
import { useNow } from "@/hooks/useNow";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { reportStorageIssue } from "@/lib/client-error-reporting";
import {
  buildAdminUiChartHealthItem,
  summarizeAdminUiChartHealth,
} from "@/lib/admin-ui-chart-health";
import {
  ADMIN_ANALYTICS_DEFAULT_RANGE,
  ADMIN_ANALYTICS_RANGE_OPTIONS,
  normalizeAdminAnalyticsModuleRangeMap,
  type AdminAnalyticsModuleRangeMap,
  type AdminAnalyticsRangeOption,
} from "@/lib/admin-analytics-preferences";
import { buildAuthOutcomeChartModel } from "@/lib/admin-auth-outcome-chart";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { TELEMETRY_EVENT_LABELS } from "@/lib/telemetry-catalog";

type ViewTab = "operations" | "audience" | "commerce";
type RangeOption = AdminAnalyticsRangeOption;

interface RealtimePoint {
  minute: number;
  users: number;
  views: number;
}

interface HistoricalPoint {
  date: string;
  rawDate: string;
  users: number;
  views: number;
  sessions: number;
  newUsers: number;
  avgSessionDuration: number;
  engagementRate: number;
}

interface EventBreakdownItem {
  eventName: string;
  count: number;
}

interface DeviceMixItem {
  device: string;
  users: number;
  sessions: number;
  engagementRate: number;
}

interface GeoItem {
  country: string;
  city: string;
  users: number;
}

interface PageItem {
  path: string;
  views: number;
  avgTime: number;
  engagementRate: number;
}

interface TopDropItem {
  dropId: string;
  views: number;
  unlocks: number;
}

interface CommerceFeedItem {
  id: string;
  type?: string;
  status?: string;
  amount?: number;
  cost?: number;
  description?: string;
  timestamp?: number;
  username?: string;
  userPhoto?: string;
}

interface SecurityItem {
  uid: string;
  username: string;
  photoURL?: string;
  ripAttempts: number;
  lastViolation: string | null;
  lastViolationReason: string;
  lastViolationDropId?: string | null;
}

interface RawEventItem {
  type: string;
  detail?: string;
  componentName?: string;
  dropId?: string;
  dropTitle?: string;
  watchSeconds?: number;
  targetText?: string;
  targetTag?: string;
  targetId?: string;
  scrollDepthPercent?: number;
  path: string;
  uid: string;
  username?: string;
  userPhoto?: string;
  timestamp: number;
}

interface AuthBreakdownItem {
  method: string;
  attempts: number;
  successes: number;
  failures: number;
  avgDurationMs: number;
  successRate: number;
}

interface CountBucketItem {
  label: string;
  count: number;
}

interface SurfaceMixItem {
  key: string;
  label: string;
  activeUsers: number;
  lastSeenAt: number;
}

interface RealtimeActiveUserItem {
  uid: string;
  username: string;
  lastSeenAt: number;
  lastEventName: string;
  lastPagePath: string;
  lastDropTitle: string;
  lastSemanticScopeLabel: string;
  lastComponentName: string;
  lastEventModules: string;
}

interface OnboardingStepStatItem {
  stepKey: string;
  stepTitle: string;
  stepIndex: number;
  starts: number;
  completions: number;
  avgDurationMs: number;
}

interface SemanticCategorySummaryItem {
  key: string;
  label: string;
  viewCount: number;
  viewDurationMs: number;
  engagedViewCount: number;
  passiveViewCount: number;
  bounceCount: number;
  exitCount: number;
  clickCount: number;
  hoverCount: number;
  pagesVisited: number;
  signInCount: number;
  returnCount: number;
  logoutCount: number;
  watchSecondsTotal: number;
  watchSessionCount: number;
  avgViewSeconds: number;
  engagedRate: number;
}

interface DestinationMixItem {
  destination: string;
  count: number;
}

interface TaskLeaderboardItem {
  taskId: string;
  title: string;
  assigned: number;
  started: number;
  completed: number;
  failed: number;
  rewardTotal: number;
  avgDurationMs: number;
  completionRate: number;
}

interface PackagePerformanceItem {
  label: string;
  starts: number;
  purchases: number;
  failures: number;
  revenueUsd: number;
  drops: number;
  conversionRate: number;
  abandonmentRate: number;
}

interface UnlockCategoryItem {
  label: string;
  previews: number;
  unlocks: number;
  unlockRate: number;
}

interface ContentTagDemandItem {
  tag: string;
  count: number;
}

interface ViewerOverviewItem {
  viewCount: number;
  sessionCount: number;
  uniqueViewerCount: number;
  repeatSessionCount: number;
  returnSessionCount: number;
  totalWatchSeconds: number;
  avgSessionSeconds: number;
  avgWatchSeconds: number;
  avgLoadMs: number;
  assetCompletionRate: number;
  meaningfulSessionCount: number;
  openedWithoutDepthCount: number;
  bounceSessionCount: number;
  abandonedSessionCount: number;
  stalledSessionCount: number;
  convertedSessionCount: number;
  completedSessionCount: number;
  assetSwitches: number;
  downloads: number;
  relatedClicks: number;
}

interface ViewerDropInsightItem {
  dropId: string;
  dropTitle: string;
  viewCount: number;
  sessionCount: number;
  uniqueViewerCount: number;
  repeatSessionCount: number;
  returnSessionCount: number;
  totalWatchSeconds: number;
  avgSessionSeconds: number;
  avgWatchSeconds: number;
  assetStarts: number;
  assetCompletions: number;
  meaningfulSessionCount: number;
  openedWithoutDepthCount: number;
  bounceSessionCount: number;
  abandonedSessionCount: number;
  stalledSessionCount: number;
  convertedSessionCount: number;
  completedSessionCount: number;
  assetSwitches: number;
  downloads: number;
  relatedClicks: number;
  avgLoadMs: number;
}

interface ViewerUserOptionItem {
  uid: string;
  username: string;
  viewCount: number;
  sessionCount: number;
  totalWatchSeconds: number;
}

interface ValidationItem {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

interface ComponentContextItem {
  key: string;
  label: string;
  count: number;
  uniqueUsers: number;
  experienceCount: number;
  lastSeenAt: number;
  exampleEvent: string;
}

interface UserJourneyItem {
  uid: string;
  username: string;
  actorType?: "guest" | "identified";
  eventCount: number;
  watchSeconds: number;
  lastSeenAt: number;
  primaryPath: string;
  journeyState?: "engaged" | "bounced" | "mixed" | "unknown";
}

interface ExperienceContextItem {
  key: string;
  label: string;
  eventCount: number;
  uniqueUsers: number;
  watchSeconds: number;
  conversionCount: number;
}

interface SecurityReasonItem {
  reason: string;
  label: string;
  severity: string;
  count: number;
  uniqueUsers: number;
  lastSeenAt: number;
}

interface HistoricalAnalyticsResponse {
  success: boolean;
  generatedAtMs?: number;
  requiresSetup?: boolean;
  error?: string;
  issues?: string[];
  data?: HistoricalPoint[];
  totals?: {
    users: number;
    views: number;
    sessions: number;
    newUsers: number;
    avgSessionDuration: number;
    engagementRate: number;
  };
  events?: Record<string, number>;
  eventBreakdown?: EventBreakdownItem[];
  devices?: DeviceMixItem[];
  funnel?: {
    authModalOpens: number;
    authSignIns: number;
    authSignUps: number;
    previewOpens: number;
    viewerOpens: number;
    assetSwitches: number;
    unlocks: number;
    shares: number;
    walletOpens: number;
    checkoutStarts: number;
    purchases: number;
    checkIns: number;
    experienceViews: number;
  };
  geo?: GeoItem[];
  pages?: PageItem[];
  topDrops?: TopDropItem[];
  commerce?: {
    revenueUsd: number;
    adjustedProfitUsd?: number;
    bonusValueUsd?: number;
    deliveredGumDrops?: number;
    bonusGumDrops?: number;
    effectiveUsdPer100Gd?: number;
    gdSpent: number;
    feed?: CommerceFeedItem[];
  };
  security?: SecurityItem[];
  securityReasons?: SecurityReasonItem[];
  onboardingStats?: {
    starts?: number;
    completions: number;
    avgDuration: number;
    completionRate?: number;
    startSource?: "tracked" | "completion_fallback" | "none";
  };
  onboardingStepStats?: OnboardingStepStatItem[];
  rawEvents?: RawEventItem[];
  componentContexts?: ComponentContextItem[];
  userJourneys?: UserJourneyItem[];
  experienceContexts?: ExperienceContextItem[];
  authBreakdown?: AuthBreakdownItem[];
  onboardingDurationBuckets?: CountBucketItem[];
  repeatVisitSegments?: CountBucketItem[];
  destinationMix?: DestinationMixItem[];
  notificationFunnel?: CountBucketItem[];
  notificationActions?: Array<{ label: string; value: number }>;
  taskPipeline?: CountBucketItem[];
  taskLeaderboard?: TaskLeaderboardItem[];
  taskDurationBuckets?: CountBucketItem[];
  reminderReasons?: CountBucketItem[];
  packagePerformance?: PackagePerformanceItem[];
  unlockCategoryMix?: UnlockCategoryItem[];
  watchDepthBuckets?: CountBucketItem[];
  contentJourney?: CountBucketItem[];
  contentTagDemand?: ContentTagDemandItem[];
  viewerOverview?: ViewerOverviewItem;
  viewerDropInsights?: ViewerDropInsightItem[];
  viewerUsers?: ViewerUserOptionItem[];
  viewerFilter?: string;
  semanticCategories?: SemanticCategorySummaryItem[];
  validations?: ValidationItem[];
}

interface RealtimeAnalyticsResponse {
  success: boolean;
  generatedAtMs?: number;
  requiresSetup?: boolean;
  error?: string;
  issues?: string[];
  totalActive?: number;
  deepTrackerActive?: number;
  data?: RealtimePoint[];
  activeUsers?: RealtimeActiveUserItem[];
  surfaceMix?: SurfaceMixItem[];
}

interface AnalyticsPreferencesResponse {
  success: boolean;
  preferences?: {
    moduleRanges?: AdminAnalyticsModuleRangeMap;
  };
}

interface TooltipValue {
  color?: string;
  name?: string;
  value?: string | number;
}

interface AnalyticsTooltipProps {
  active?: boolean;
  payload?: TooltipValue[];
  label?: string;
  valueFormatter?: (value: string | number, name?: string) => string;
}

interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon: typeof Activity;
  children: React.ReactNode;
  className?: string;
  rightSlot?: React.ReactNode;
  defaultExpanded?: boolean;
  collapsible?: boolean;
}

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Activity;
  className?: string;
  valueClassName?: string;
}

const RANGE_OPTIONS: Array<{ value: RangeOption; label: string }> =
  ADMIN_ANALYTICS_RANGE_OPTIONS.map((value) => ({
    value,
    label: value === "all" ? "All" : value.toUpperCase(),
  }));

const TAB_OPTIONS: Array<{
  id: ViewTab;
  label: string;
  icon: typeof Activity;
}> = [
  { id: "operations", label: "Operations", icon: Activity },
  { id: "audience", label: "Audience", icon: Users },
  { id: "commerce", label: "Commerce", icon: DollarSign },
];

const EVENT_LABELS: Record<string, string> = TELEMETRY_EVENT_LABELS;
const PIE_COLORS = [
  "#b28cff",
  "#7c3aed",
  "#22d3ee",
  "#f472b6",
  "#34d399",
  "#f59e0b",
];
const ANALYTICS_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Chicago",
});
const ANALYTICS_FILTER_STORAGE_KEY = "kandydrops.admin.analytics.filters";

function AnalyticsTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: AnalyticsTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/90 p-3 shadow-2xl backdrop-blur-md">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div
            key={`${entry.name}-${index}`}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <div className="flex items-center gap-2 text-gray-300">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}</span>
            </div>
            <span className="font-semibold text-white">
              {valueFormatter
                ? valueFormatter(entry.value ?? 0, entry.name)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  children,
  className,
  rightSlot,
  defaultExpanded = false,
  collapsible = true,
}: SectionCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section
      className={cn(
        "glass-panel rounded-[1.6rem] border border-white/10 p-3.5 md:p-5",
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-brand-purple">
              <Icon className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-white md:text-lg">
              {title}
            </h2>
          </div>
          {subtitle ? (
            <p className="text-xs leading-5 text-gray-400 md:text-sm">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {rightSlot}
          {collapsible ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300 transition-colors hover:border-brand-purple/40 hover:text-white"
              aria-expanded={expanded}
            >
              {expanded ? "Collapse" : "Expand"}
            </button>
          ) : null}
        </div>
      </div>
      {expanded || !collapsible ? children : null}
    </section>
  );
}

function buildSectionHistoricalUrl(
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

function SectionRangeControl({
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

function useHistoricalSectionOverride(
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
    15_000,
    {
      keepPreviousData: true,
    },
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
  valueClassName,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-[1.6rem] border border-white/10 bg-black/30 p-4",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
        <Icon className="h-3.5 w-3.5 text-brand-purple" />
        <span>{label}</span>
      </div>
      <div
        className={cn(
          "text-2xl font-black tracking-tight text-white",
          valueClassName,
        )}
      >
        {value}
      </div>
      {hint ? <p className="mt-2 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value < 1000 ? 0 : 1,
  }).format(value);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 1) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

function formatRelativeTime(timestamp: number, nowMs: number): string {
  if (!timestamp || !nowMs) return "Just now";
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

function formatAbsoluteDateTime(timestamp: string | number | null | undefined) {
  if (!timestamp) return "Unknown";

  const normalizedTimestamp =
    typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp;

  if (!Number.isFinite(normalizedTimestamp)) {
    return "Unknown";
  }

  return ANALYTICS_DATE_TIME_FORMATTER.format(new Date(normalizedTimestamp));
}

function getValidationClasses(status: ValidationItem["status"]) {
  if (status === "pass") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "fail") {
    return "border-red-500/20 bg-red-500/10 text-red-200";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-200";
}

function describeEvent(event: RawEventItem): string {
  if (event.detail) return event.detail;
  if (event.type === "scroll")
    return `Scrolled to ${event.scrollDepthPercent ?? 0}% depth`;
  if (event.type === "click")
    return `Clicked ${event.targetText || event.targetId || event.targetTag || "element"}`;
  if (event.type === "hover")
    return `Hovered ${event.targetText || event.targetId || event.targetTag || "element"}`;
  return "Interaction event";
}

function getDeviceIcon(device: string) {
  return device.toLowerCase() === "mobile" ? Smartphone : Monitor;
}

function isRecentViolation(timestamp: string | null, nowMs: number): boolean {
  if (!timestamp) return false;
  const diffMs = nowMs - new Date(timestamp).getTime();
  return diffMs < 24 * 60 * 60 * 1000;
}

function getJourneyStateLabel(state: UserJourneyItem["journeyState"]) {
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

function getJourneyStateClasses(state: UserJourneyItem["journeyState"]) {
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

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ViewTab>("operations");
  const range: RangeOption = ADMIN_ANALYTICS_DEFAULT_RANGE;
  const nowMs = useNow({ intervalMs: 60_000, initialNowMs: 0 });
  const [viewerUserDraft, setViewerUserDraft] = useState("");
  const [viewerUserFilter, setViewerUserFilter] = useState("");
  const [moduleRanges, setModuleRanges] =
    useState<AdminAnalyticsModuleRangeMap>({});
  const [savingSectionKey, setSavingSectionKey] = useState<string | null>(null);
  const analyticsFilterStorageKey = user
    ? `${ANALYTICS_FILTER_STORAGE_KEY}:${user.uid}`
    : ANALYTICS_FILTER_STORAGE_KEY;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const timerId = window.setTimeout(() => {
      try {
        const raw = window.sessionStorage.getItem(analyticsFilterStorageKey);
        if (!raw) {
          return;
        }

        const parsed = JSON.parse(raw) as Partial<{
          activeTab: ViewTab;
          viewerUserDraft: string;
          viewerUserFilter: string;
        }>;

        if (
          parsed.activeTab &&
          TAB_OPTIONS.some((item) => item.id === parsed.activeTab)
        ) {
          setActiveTab(parsed.activeTab);
        }
        if (typeof parsed.viewerUserDraft === "string") {
          setViewerUserDraft(parsed.viewerUserDraft);
        }
        if (typeof parsed.viewerUserFilter === "string") {
          setViewerUserFilter(parsed.viewerUserFilter);
        }
      } catch (error) {
        reportStorageIssue("admin analytics filters read", error, {
          storageKey: analyticsFilterStorageKey,
        });
      }
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [analyticsFilterStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.sessionStorage.setItem(
        analyticsFilterStorageKey,
        JSON.stringify({
          activeTab,
          viewerUserDraft,
          viewerUserFilter,
        }),
      );
    } catch (error) {
      reportStorageIssue("admin analytics filters write", error, {
        storageKey: analyticsFilterStorageKey,
      });
    }
  }, [activeTab, analyticsFilterStorageKey, viewerUserDraft, viewerUserFilter]);

  const {
    data: analyticsPreferencesResponse,
    mutate: mutateAnalyticsPreferences,
  } = useAdminPollingSWR<AnalyticsPreferencesResponse>(
    "/api/admin/analytics/preferences",
    15_000,
    {
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    setModuleRanges(
      normalizeAdminAnalyticsModuleRangeMap(
        analyticsPreferencesResponse?.preferences?.moduleRanges,
      ),
    );
  }, [analyticsPreferencesResponse?.preferences?.moduleRanges]);

  const getSectionRange = (sectionKey: string): RangeOption =>
    moduleRanges[sectionKey] ?? ADMIN_ANALYTICS_DEFAULT_RANGE;

  const handleSectionRangeChange = async (
    sectionKey: string,
    nextRange: RangeOption,
  ) => {
    const previousRanges = moduleRanges;
    setModuleRanges((current) => ({
      ...current,
      [sectionKey]: nextRange,
    }));
    setSavingSectionKey(sectionKey);

    try {
      const response = await authFetch("/api/admin/analytics/preferences", {
        method: "PUT",
        body: JSON.stringify({
          section: sectionKey,
          range: nextRange,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Analytics range update failed");
      }

      const nextRanges = normalizeAdminAnalyticsModuleRangeMap(
        result.preferences?.moduleRanges,
      );
      setModuleRanges(nextRanges);
      await mutateAnalyticsPreferences(
        {
          success: true,
          preferences: {
            moduleRanges: nextRanges,
          },
        },
        { revalidate: false },
      );
    } catch (error) {
      setModuleRanges(previousRanges);
      toast.error(
        error instanceof Error
          ? error.message
          : "Analytics range update failed",
      );
    } finally {
      setSavingSectionKey((current) =>
        current === sectionKey ? null : current,
      );
    }
  };

  const renderSectionRangeControl = (sectionKey: string) => (
    <SectionRangeControl
      sectionKey={sectionKey}
      range={getSectionRange(sectionKey)}
      saving={savingSectionKey === sectionKey}
      onChange={handleSectionRangeChange}
    />
  );

  const historicalUrl = `/api/admin/analytics/historical?period=${ADMIN_ANALYTICS_DEFAULT_RANGE}`;
  const {
    data: liveResponse,
    error: liveError,
    isLoading: liveLoading,
  } = useAdminPollingSWR<RealtimeAnalyticsResponse>(
    "/api/admin/analytics/realtime",
    5_000,
  );

  const {
    data: historicalResponse,
    error: historicalError,
    isLoading: historicalLoading,
  } = useAdminPollingSWR<HistoricalAnalyticsResponse>(historicalUrl, 15_000);

  const livePulseRange = getSectionRange("livePulse");
  const livePulseOverride = useHistoricalSectionOverride(
    "livePulse",
    livePulseRange,
  );
  const journeyFunnelRange = getSectionRange("journeyFunnel");
  const journeyFunnelOverride = useHistoricalSectionOverride(
    "journeyFunnel",
    journeyFunnelRange,
  );
  const authOutcomeSplitRange = getSectionRange("authOutcomeSplit");
  const authOutcomeSplitOverride = useHistoricalSectionOverride(
    "authOutcomeSplit",
    authOutcomeSplitRange,
  );
  const onboardingVelocityRange = getSectionRange("onboardingVelocity");
  const onboardingVelocityOverride = useHistoricalSectionOverride(
    "onboardingVelocity",
    onboardingVelocityRange,
  );
  const onboardingStepFlowRange = getSectionRange("onboardingStepFlow");
  const onboardingStepFlowOverride = useHistoricalSectionOverride(
    "onboardingStepFlow",
    onboardingStepFlowRange,
  );
  const guestBounceQualityRange = getSectionRange("categorySemantics");
  const guestBounceQualityOverride = useHistoricalSectionOverride(
    "categorySemantics",
    guestBounceQualityRange,
  );
  const eventMixRange = getSectionRange("eventMix");
  const eventMixOverride = useHistoricalSectionOverride(
    "eventMix",
    eventMixRange,
  );
  const liveInteractionStreamRange = getSectionRange("liveInteractionStream");
  const liveInteractionStreamOverride = useHistoricalSectionOverride(
    "liveInteractionStream",
    liveInteractionStreamRange,
  );
  const dataValidationRange = getSectionRange("dataValidation");
  const dataValidationOverride = useHistoricalSectionOverride(
    "dataValidation",
    dataValidationRange,
  );
  const audienceSnapshotRange = getSectionRange("audienceSnapshot");
  const audienceSnapshotOverride = useHistoricalSectionOverride(
    "audienceSnapshot",
    audienceSnapshotRange,
  );
  const returnCadenceRange = getSectionRange("returnCadence");
  const returnCadenceOverride = useHistoricalSectionOverride(
    "returnCadence",
    returnCadenceRange,
  );
  const navigationDestinationsRange = getSectionRange("navigationDestinations");
  const navigationDestinationsOverride = useHistoricalSectionOverride(
    "navigationDestinations",
    navigationDestinationsRange,
  );
  const deviceMixRange = getSectionRange("deviceMix");
  const deviceMixOverride = useHistoricalSectionOverride(
    "deviceMix",
    deviceMixRange,
  );
  const topPathsRange = getSectionRange("topPaths");
  const topPathsOverride = useHistoricalSectionOverride(
    "topPaths",
    topPathsRange,
  );
  const regionsRange = getSectionRange("regions");
  const regionsOverride = useHistoricalSectionOverride("regions", regionsRange);
  const commerceSnapshotRange = getSectionRange("commerceSnapshot");
  const commerceSnapshotOverride = useHistoricalSectionOverride(
    "commerceSnapshot",
    commerceSnapshotRange,
  );
  const packagePerformanceRange = getSectionRange("packagePerformance");
  const packagePerformanceOverride = useHistoricalSectionOverride(
    "packagePerformance",
    packagePerformanceRange,
  );
  const contentConversionRange = getSectionRange("contentConversion");
  const contentConversionOverride = useHistoricalSectionOverride(
    "contentConversion",
    contentConversionRange,
  );
  const topDropConversionRange = getSectionRange("topDropConversion");
  const topDropConversionOverride = useHistoricalSectionOverride(
    "topDropConversion",
    topDropConversionRange,
  );
  const recentCommerceFeedRange = getSectionRange("recentCommerceFeed");
  const recentCommerceFeedOverride = useHistoricalSectionOverride(
    "recentCommerceFeed",
    recentCommerceFeedRange,
  );
  const viewerDrilldownRange = getSectionRange("viewerDrilldown");
  const viewerDrilldownOverride = useHistoricalSectionOverride(
    "viewerDrilldown",
    viewerDrilldownRange,
    viewerUserFilter,
  );
  const viewerJourneyRange = getSectionRange("viewerJourney");
  const viewerJourneyOverride = useHistoricalSectionOverride(
    "viewerJourney",
    viewerJourneyRange,
  );
  const watchDepthTagsRange = getSectionRange("watchDepthTags");
  const watchDepthTagsOverride = useHistoricalSectionOverride(
    "watchDepthTags",
    watchDepthTagsRange,
  );
  const dailyTaskPipelineRange = getSectionRange("dailyTaskPipeline");
  const dailyTaskPipelineOverride = useHistoricalSectionOverride(
    "dailyTaskPipeline",
    dailyTaskPipelineRange,
  );
  const taskCompletionSpeedRange = getSectionRange("taskCompletionSpeed");
  const taskCompletionSpeedOverride = useHistoricalSectionOverride(
    "taskCompletionSpeed",
    taskCompletionSpeedRange,
  );
  const taskLeaderboardRange = getSectionRange("taskLeaderboard");
  const taskLeaderboardOverride = useHistoricalSectionOverride(
    "taskLeaderboard",
    taskLeaderboardRange,
  );
  const notificationFunnelRange = getSectionRange("notificationFunnel");
  const notificationFunnelOverride = useHistoricalSectionOverride(
    "notificationFunnel",
    notificationFunnelRange,
  );

  const liveSeries = useMemo(
    () =>
      (liveResponse?.data ?? []).map((point) => ({
        ...point,
        label: point.minute === 0 ? "Now" : `${point.minute}m`,
      })),
    [liveResponse],
  );

  const historySeries = historicalResponse?.data ?? [];
  const totals = historicalResponse?.totals ?? {
    users: 0,
    views: 0,
    sessions: 0,
    newUsers: 0,
    avgSessionDuration: 0,
    engagementRate: 0,
  };
  const eventBreakdown = historicalResponse?.eventBreakdown ?? [];
  const eventsData = historicalResponse?.events ?? {};
  const funnel = historicalResponse?.funnel ?? {
    authModalOpens: 0,
    authSignIns: 0,
    authSignUps: 0,
    previewOpens: 0,
    viewerOpens: 0,
    assetSwitches: 0,
    unlocks: 0,
    shares: 0,
    walletOpens: 0,
    checkoutStarts: 0,
    purchases: 0,
    checkIns: 0,
    experienceViews: 0,
  };
  const devices = historicalResponse?.devices ?? [];
  const pages = historicalResponse?.pages ?? [];
  const geo = historicalResponse?.geo ?? [];
  const topDrops = historicalResponse?.topDrops ?? [];
  const commerce = historicalResponse?.commerce ?? {
    revenueUsd: 0,
    adjustedProfitUsd: 0,
    bonusValueUsd: 0,
    deliveredGumDrops: 0,
    bonusGumDrops: 0,
    effectiveUsdPer100Gd: 0,
    gdSpent: 0,
    feed: [],
  };
  const security = historicalResponse?.security ?? [];
  const rawEvents = historicalResponse?.rawEvents ?? [];
  const onboardingStats = historicalResponse?.onboardingStats ?? {
    starts: 0,
    completions: 0,
    avgDuration: 0,
    completionRate: 0,
    startSource: "none" as const,
  };
  const onboardingStepStats = historicalResponse?.onboardingStepStats ?? [];
  const authBreakdown = historicalResponse?.authBreakdown ?? [];
  const onboardingDurationBuckets =
    historicalResponse?.onboardingDurationBuckets ?? [];
  const repeatVisitSegments = historicalResponse?.repeatVisitSegments ?? [];
  const destinationMix = historicalResponse?.destinationMix ?? [];
  const notificationFunnel = useMemo(
    () => historicalResponse?.notificationFunnel ?? [],
    [historicalResponse?.notificationFunnel],
  );
  const notificationActions = historicalResponse?.notificationActions ?? [];
  const taskPipeline = historicalResponse?.taskPipeline ?? [];
  const taskLeaderboard = historicalResponse?.taskLeaderboard ?? [];
  const taskDurationBuckets = historicalResponse?.taskDurationBuckets ?? [];
  const reminderReasons = historicalResponse?.reminderReasons ?? [];
  const packagePerformance = historicalResponse?.packagePerformance ?? [];
  const unlockCategoryMix = historicalResponse?.unlockCategoryMix ?? [];
  const watchDepthBuckets = historicalResponse?.watchDepthBuckets ?? [];
  const contentJourney = historicalResponse?.contentJourney ?? [];
  const contentTagDemand = historicalResponse?.contentTagDemand ?? [];
  const viewerOverview = historicalResponse?.viewerOverview ?? {
    viewCount: 0,
    sessionCount: 0,
    uniqueViewerCount: 0,
    repeatSessionCount: 0,
    returnSessionCount: 0,
    totalWatchSeconds: 0,
    avgSessionSeconds: 0,
    avgWatchSeconds: 0,
    avgLoadMs: 0,
    assetCompletionRate: 0,
    meaningfulSessionCount: 0,
    openedWithoutDepthCount: 0,
    bounceSessionCount: 0,
    abandonedSessionCount: 0,
    stalledSessionCount: 0,
    convertedSessionCount: 0,
    completedSessionCount: 0,
    assetSwitches: 0,
    downloads: 0,
    relatedClicks: 0,
  };
  const viewerDropInsights = historicalResponse?.viewerDropInsights ?? [];
  const viewerUsers = historicalResponse?.viewerUsers ?? [];
  const activeViewerFilter =
    historicalResponse?.viewerFilter ?? viewerUserFilter;
  const semanticCategories = historicalResponse?.semanticCategories ?? [];
  const validations = historicalResponse?.validations ?? [];
  const componentContexts = historicalResponse?.componentContexts ?? [];
  const userJourneys = historicalResponse?.userJourneys ?? [];
  const experienceContexts = historicalResponse?.experienceContexts ?? [];
  const securityReasons = historicalResponse?.securityReasons ?? [];
  const liveActiveUsers = liveResponse?.activeUsers ?? [];
  const liveSurfaceMix = liveResponse?.surfaceMix ?? [];

  const needsSetup =
    liveResponse?.requiresSetup ||
    historicalResponse?.requiresSetup ||
    (liveError as { info?: { requiresSetup?: boolean } } | undefined)?.info
      ?.requiresSetup ||
    (historicalError as { info?: { requiresSetup?: boolean } } | undefined)
      ?.info?.requiresSetup;
  const backgroundAnalyticsIssues = [
    liveResponse && liveError
      ? `Realtime analytics: ${liveError.message || "Background refresh failed."}`
      : null,
    historicalResponse && historicalError
      ? `Historical analytics: ${historicalError.message || "Background refresh failed."}`
      : null,
    ...(liveResponse?.issues || []).map(
      (issue) => `Realtime analytics: ${issue}`,
    ),
    ...(historicalResponse?.issues || []).map(
      (issue) => `Historical analytics: ${issue}`,
    ),
  ].filter(
    (issue, index, array): issue is string =>
      Boolean(issue) && array.indexOf(issue) === index,
  );
  const blockingAnalyticsError =
    (!liveResponse && (liveError as Error | undefined)) ||
    (!historicalResponse && (historicalError as Error | undefined)) ||
    null;
  const isPrimingAnalytics =
    !liveResponse && !historicalResponse && (liveLoading || historicalLoading);
  const isBackgroundSyncing =
    (liveLoading || historicalLoading) &&
    Boolean(liveResponse || historicalResponse);
  const analyticsWarmState = isPrimingAnalytics
    ? "Fetching live data"
    : isBackgroundSyncing
      ? "Refreshing"
      : "Polling enabled";

  const totalDeviceUsers = devices.reduce((sum, item) => sum + item.users, 0);
  const mobileUsers =
    devices.find((item) => item.device.toLowerCase() === "mobile")?.users ?? 0;
  const mobileShare = totalDeviceUsers > 0 ? mobileUsers / totalDeviceUsers : 0;
  const previewToUnlockRate =
    funnel.previewOpens > 0 ? funnel.unlocks / funnel.previewOpens : 0;
  const checkoutToPurchaseRate =
    funnel.checkoutStarts > 0 ? funnel.purchases / funnel.checkoutStarts : 0;
  const securityAlerts = security.filter((item) =>
    isRecentViolation(item.lastViolation, nowMs),
  ).length;
  const onboardingStartCount = onboardingStats.starts ?? 0;
  const onboardingCompletionRate =
    onboardingStats.completionRate ??
    (onboardingStartCount > 0
      ? onboardingStats.completions / Math.max(1, onboardingStartCount)
      : 0);
  const onboardingDropOffCount = Math.max(
    0,
    onboardingStartCount - onboardingStats.completions,
  );
  const onboardingStepFlow = onboardingStepStats.map((step) => ({
    ...step,
    completionRate:
      step.starts > 0 ? step.completions / Math.max(1, step.starts) : 0,
    dropOffCount: Math.max(0, step.starts - step.completions),
    shortLabel:
      step.stepTitle.length > 18
        ? `${step.stepTitle.slice(0, 18)}...`
        : step.stepTitle,
  }));
  const globalSemantics = semanticCategories.find(
    (item) => item.key === "global",
  );
  const userSemantics = semanticCategories.find((item) => item.key === "user");
  const adminSemantics = semanticCategories.find(
    (item) => item.key === "admin",
  );
  const dropSemantics = semanticCategories.find((item) => item.key === "drop");
  const guestBounceRate =
    globalSemantics && globalSemantics.viewCount > 0
      ? globalSemantics.bounceCount / Math.max(1, globalSemantics.viewCount)
      : 0;
  const guestEngagedRate = globalSemantics?.engagedRate ?? 0;
  const identifiedBounceRate =
    userSemantics && userSemantics.viewCount > 0
      ? userSemantics.bounceCount / Math.max(1, userSemantics.viewCount)
      : 0;
  const semanticQualityCards = [
    {
      key: "global",
      label: "Guest / Public",
      views: globalSemantics?.viewCount ?? 0,
      engaged: globalSemantics?.engagedViewCount ?? 0,
      bounced: globalSemantics?.bounceCount ?? 0,
      exits: globalSemantics?.exitCount ?? 0,
    },
    {
      key: "user",
      label: "Signed-in",
      views: userSemantics?.viewCount ?? 0,
      engaged: userSemantics?.engagedViewCount ?? 0,
      bounced: userSemantics?.bounceCount ?? 0,
      exits: userSemantics?.exitCount ?? 0,
    },
    {
      key: "admin",
      label: "Admin",
      views: adminSemantics?.viewCount ?? 0,
      engaged: adminSemantics?.engagedViewCount ?? 0,
      bounced: adminSemantics?.bounceCount ?? 0,
      exits: adminSemantics?.exitCount ?? 0,
    },
    {
      key: "drop",
      label: "Viewer",
      views: dropSemantics?.viewCount ?? 0,
      engaged: dropSemantics?.engagedViewCount ?? 0,
      bounced: dropSemantics?.bounceCount ?? 0,
      exits: dropSemantics?.exitCount ?? 0,
    },
  ];

  const topEvents = eventBreakdown.slice(0, 8).map((entry) => ({
    ...entry,
    label:
      EVENT_LABELS[entry.eventName] || entry.eventName.replaceAll("_", " "),
  }));
  const topComponentContexts = componentContexts.slice(0, 6);
  const topUserJourneys = userJourneys.slice(0, 6);
  const topExperienceContexts = experienceContexts.slice(0, 6);
  const topSecurityReasons = securityReasons.slice(0, 8);
  const liveSnapshotLabel = liveResponse?.generatedAtMs
    ? formatRelativeTime(liveResponse.generatedAtMs, nowMs)
    : liveLoading
      ? "Fetching..."
      : "Awaiting snapshot";
  const historicalSnapshotLabel = historicalResponse?.generatedAtMs
    ? formatRelativeTime(historicalResponse.generatedAtMs, nowMs)
    : historicalLoading
      ? "Fetching..."
      : "Awaiting snapshot";
  const hasAuthSuccessData = authBreakdown.some((item) => item.successes > 0);
  const hasOnboardingVelocityData = onboardingDurationBuckets.some(
    (bucket) => bucket.count > 0,
  );
  const livePulseData =
    livePulseRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : livePulseOverride.data;
  const livePulseFunnel = livePulseData?.funnel ?? funnel;
  const livePulseOnboardingStats =
    livePulseData?.onboardingStats ?? onboardingStats;
  const livePulseOnboardingStartCount = livePulseOnboardingStats.starts ?? 0;
  const livePulseOnboardingCompletionRate =
    livePulseOnboardingStats.completionRate ??
    (livePulseOnboardingStartCount > 0
      ? livePulseOnboardingStats.completions /
        Math.max(1, livePulseOnboardingStartCount)
      : 0);
  const journeyFunnelData =
    journeyFunnelRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : journeyFunnelOverride.data;
  const journeyFunnelMetrics = journeyFunnelData?.funnel ?? funnel;
  const authOutcomeData =
    authOutcomeSplitRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : authOutcomeSplitOverride.data;
  const authOutcomeBreakdown = authOutcomeData?.authBreakdown ?? authBreakdown;
  const authOutcomeChartModel = useMemo(
    () => buildAuthOutcomeChartModel(authOutcomeBreakdown),
    [authOutcomeBreakdown],
  );
  const authOutcomeChartItems = authOutcomeChartModel.items;
  const authOutcomeTotals = authOutcomeChartModel.totals;
  const authOutcomeHasData = authOutcomeChartModel.hasData;
  const onboardingVelocityData =
    onboardingVelocityRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : onboardingVelocityOverride.data;
  const onboardingVelocityStats =
    onboardingVelocityData?.onboardingStats ?? onboardingStats;
  const onboardingVelocityBuckets =
    onboardingVelocityData?.onboardingDurationBuckets ??
    onboardingDurationBuckets;
  const onboardingVelocityStartCount = onboardingVelocityStats.starts ?? 0;
  const onboardingVelocityCompletionRate =
    onboardingVelocityStats.completionRate ??
    (onboardingVelocityStartCount > 0
      ? onboardingVelocityStats.completions /
        Math.max(1, onboardingVelocityStartCount)
      : 0);
  const onboardingVelocityDropOffCount = Math.max(
    0,
    onboardingVelocityStartCount - onboardingVelocityStats.completions,
  );
  const onboardingVelocityHasData = onboardingVelocityBuckets.some(
    (bucket) => bucket.count > 0,
  );
  const onboardingStepFlowData =
    onboardingStepFlowRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : onboardingStepFlowOverride.data;
  const onboardingStepFlowStats =
    onboardingStepFlowData?.onboardingStepStats ?? onboardingStepStats;
  const onboardingStepFlowItems = onboardingStepFlowStats.map((step) => ({
    ...step,
    completionRate:
      step.starts > 0 ? step.completions / Math.max(1, step.starts) : 0,
    dropOffCount: Math.max(0, step.starts - step.completions),
  }));
  const finalOnboardingStep = onboardingStepFlowItems.reduce<
    (typeof onboardingStepFlowItems)[number] | null
  >((current, step) => {
    if (!current || step.stepIndex > current.stepIndex) {
      return step;
    }
    return current;
  }, null);
  const authOnboardingDiscrepancies = [
    journeyFunnelMetrics.authSignUps !== onboardingVelocityStartCount
      ? `Auth sign-ups ${journeyFunnelMetrics.authSignUps} do not match onboarding starts ${onboardingVelocityStartCount}.`
      : "",
    finalOnboardingStep &&
    finalOnboardingStep.completions !== onboardingVelocityStats.completions
      ? `Final onboarding step completions ${finalOnboardingStep.completions} do not match onboarding completions ${onboardingVelocityStats.completions}.`
      : "",
  ].filter(Boolean);
  const guestBounceQualityData =
    guestBounceQualityRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : guestBounceQualityOverride.data;
  const guestBounceSemantics =
    guestBounceQualityData?.semanticCategories ?? semanticCategories;
  const guestBounceGlobalSemantics = guestBounceSemantics.find(
    (item) => item.key === "global",
  );
  const guestBounceUserSemantics = guestBounceSemantics.find(
    (item) => item.key === "user",
  );
  const guestBounceAdminSemantics = guestBounceSemantics.find(
    (item) => item.key === "admin",
  );
  const guestBounceDropSemantics = guestBounceSemantics.find(
    (item) => item.key === "drop",
  );
  const guestBounceGuestRate =
    guestBounceGlobalSemantics && guestBounceGlobalSemantics.viewCount > 0
      ? guestBounceGlobalSemantics.bounceCount /
        Math.max(1, guestBounceGlobalSemantics.viewCount)
      : 0;
  const guestBounceIdentifiedRate =
    guestBounceUserSemantics && guestBounceUserSemantics.viewCount > 0
      ? guestBounceUserSemantics.bounceCount /
        Math.max(1, guestBounceUserSemantics.viewCount)
      : 0;
  const guestBounceEngagedRate =
    guestBounceGlobalSemantics && guestBounceGlobalSemantics.viewCount > 0
      ? guestBounceGlobalSemantics.engagedViewCount /
        Math.max(1, guestBounceGlobalSemantics.viewCount)
      : 0;
  const guestBounceQualityCards = [
    {
      key: "global",
      label: "Guest / Public",
      views: guestBounceGlobalSemantics?.viewCount ?? 0,
      engaged: guestBounceGlobalSemantics?.engagedViewCount ?? 0,
      bounced: guestBounceGlobalSemantics?.bounceCount ?? 0,
      exits: guestBounceGlobalSemantics?.exitCount ?? 0,
    },
    {
      key: "user",
      label: "Signed-in",
      views: guestBounceUserSemantics?.viewCount ?? 0,
      engaged: guestBounceUserSemantics?.engagedViewCount ?? 0,
      bounced: guestBounceUserSemantics?.bounceCount ?? 0,
      exits: guestBounceUserSemantics?.exitCount ?? 0,
    },
    {
      key: "admin",
      label: "Admin",
      views: guestBounceAdminSemantics?.viewCount ?? 0,
      engaged: guestBounceAdminSemantics?.engagedViewCount ?? 0,
      bounced: guestBounceAdminSemantics?.bounceCount ?? 0,
      exits: guestBounceAdminSemantics?.exitCount ?? 0,
    },
    {
      key: "drop",
      label: "Viewer",
      views: guestBounceDropSemantics?.viewCount ?? 0,
      engaged: guestBounceDropSemantics?.engagedViewCount ?? 0,
      bounced: guestBounceDropSemantics?.bounceCount ?? 0,
      exits: guestBounceDropSemantics?.exitCount ?? 0,
    },
  ];
  const eventMixData =
    eventMixRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : eventMixOverride.data;
  const eventMixBreakdown = eventMixData?.eventBreakdown ?? eventBreakdown;
  const eventMixComponentContexts =
    eventMixData?.componentContexts ?? componentContexts;
  const eventMixTopEvents = eventMixBreakdown.slice(0, 8).map((entry) => ({
    ...entry,
    label:
      EVENT_LABELS[entry.eventName] || entry.eventName.replaceAll("_", " "),
  }));
  const eventMixTopComponentContexts = eventMixComponentContexts.slice(0, 6);
  const liveInteractionData =
    liveInteractionStreamRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : liveInteractionStreamOverride.data;
  const liveInteractionEvents = liveInteractionData?.rawEvents ?? rawEvents;
  const validationData =
    dataValidationRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : dataValidationOverride.data;
  const validationItems = validationData?.validations ?? validations;
  const audienceSnapshotData =
    audienceSnapshotRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : audienceSnapshotOverride.data;
  const audienceHistorySeries = audienceSnapshotData?.data ?? historySeries;
  const audienceTotals = audienceSnapshotData?.totals ?? totals;
  const audienceDevices = audienceSnapshotData?.devices ?? devices;
  const returnCadenceData =
    returnCadenceRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : returnCadenceOverride.data;
  const returnCadenceSegments =
    returnCadenceData?.repeatVisitSegments ?? repeatVisitSegments;
  const navigationDestinationsData =
    navigationDestinationsRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : navigationDestinationsOverride.data;
  const navigationDestinationsMix =
    navigationDestinationsData?.destinationMix ?? destinationMix;
  const deviceMixData =
    deviceMixRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : deviceMixOverride.data;
  const deviceMixDevices = deviceMixData?.devices ?? devices;
  const topPathsData =
    topPathsRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : topPathsOverride.data;
  const topPathsPages = topPathsData?.pages ?? pages;
  const regionsData =
    regionsRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : regionsOverride.data;
  const regionsGeo = regionsData?.geo ?? geo;
  const commerceSnapshotData =
    commerceSnapshotRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : commerceSnapshotOverride.data;
  const commerceSnapshotCommerce = commerceSnapshotData?.commerce ?? commerce;
  const commerceSnapshotFunnel = commerceSnapshotData?.funnel ?? funnel;
  const packagePerformanceData =
    packagePerformanceRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : packagePerformanceOverride.data;
  const packagePerformanceItems =
    packagePerformanceData?.packagePerformance ?? packagePerformance;
  const contentConversionData =
    contentConversionRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : contentConversionOverride.data;
  const contentConversionItems =
    contentConversionData?.unlockCategoryMix ?? unlockCategoryMix;
  const topDropConversionData =
    topDropConversionRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : topDropConversionOverride.data;
  const topDropConversionItems = topDropConversionData?.topDrops ?? topDrops;
  const recentCommerceFeedData =
    recentCommerceFeedRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : recentCommerceFeedOverride.data;
  const recentCommerceFeedItems =
    recentCommerceFeedData?.commerce?.feed ?? commerce.feed ?? [];
  const viewerDrilldownData =
    viewerDrilldownRange === ADMIN_ANALYTICS_DEFAULT_RANGE && !viewerUserFilter
      ? historicalResponse
      : viewerDrilldownOverride.data;
  const viewerDrilldownOverview =
    viewerDrilldownData?.viewerOverview ?? viewerOverview;
  const viewerDrilldownInsights =
    viewerDrilldownData?.viewerDropInsights ?? viewerDropInsights;
  const viewerDrilldownUsers = viewerDrilldownData?.viewerUsers ?? viewerUsers;
  const viewerDrilldownFilter =
    viewerDrilldownData?.viewerFilter ?? activeViewerFilter;
  const viewerDrilldownJourneys = (
    viewerDrilldownData?.userJourneys ?? userJourneys
  ).slice(0, 6);
  const viewerDropChartData = viewerDrilldownInsights
    .slice(0, 8)
    .map((item) => ({
      ...item,
      shortLabel:
        item.dropTitle.length > 16
          ? `${item.dropTitle.slice(0, 16)}...`
          : item.dropTitle,
    }));
  const viewerJourneyData =
    viewerJourneyRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : viewerJourneyOverride.data;
  const viewerJourneyItems =
    viewerJourneyData?.contentJourney ?? contentJourney;
  const watchDepthTagsData =
    watchDepthTagsRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : watchDepthTagsOverride.data;
  const watchDepthTagBuckets =
    watchDepthTagsData?.watchDepthBuckets ?? watchDepthBuckets;
  const watchDepthTagDemand =
    watchDepthTagsData?.contentTagDemand ?? contentTagDemand;
  const dailyTaskPipelineData =
    dailyTaskPipelineRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : dailyTaskPipelineOverride.data;
  const dailyTaskPipelineItems =
    dailyTaskPipelineData?.taskPipeline ?? taskPipeline;
  const taskCompletionSpeedData =
    taskCompletionSpeedRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : taskCompletionSpeedOverride.data;
  const taskCompletionSpeedBuckets =
    taskCompletionSpeedData?.taskDurationBuckets ?? taskDurationBuckets;
  const taskLeaderboardData =
    taskLeaderboardRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : taskLeaderboardOverride.data;
  const taskLeaderboardItems =
    taskLeaderboardData?.taskLeaderboard ?? taskLeaderboard;
  const notificationFunnelData =
    notificationFunnelRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : notificationFunnelOverride.data;
  const notificationFunnelItems =
    notificationFunnelData?.notificationFunnel ?? notificationFunnel;
  const notificationActionItems =
    notificationFunnelData?.notificationActions ?? notificationActions;
  const notificationReminderReasons =
    notificationFunnelData?.reminderReasons ?? reminderReasons;
  const deviceMixTotalUsers = deviceMixDevices.reduce(
    (sum, item) => sum + item.users,
    0,
  );
  const activeNotificationFunnel = useMemo(
    () => notificationFunnelItems.filter((item) => item.count > 0),
    [notificationFunnelItems],
  );
  const activeNotificationFunnelPieData = useMemo(
    () =>
      activeNotificationFunnel.map((item) => ({
        name: item.label,
        value: item.count,
      })),
    [activeNotificationFunnel],
  );
  const historicalHasSignals =
    historySeries.some(
      (point) =>
        point.users > 0 ||
        point.views > 0 ||
        point.sessions > 0 ||
        point.newUsers > 0,
    ) ||
    eventBreakdown.length > 0 ||
    semanticCategories.some(
      (item) =>
        item.viewCount > 0 ||
        item.clickCount > 0 ||
        item.hoverCount > 0 ||
        item.watchSessionCount > 0 ||
        item.signInCount > 0 ||
        item.returnCount > 0 ||
        item.logoutCount > 0,
    ) ||
    devices.length > 0 ||
    pages.length > 0 ||
    geo.length > 0 ||
    topDrops.length > 0 ||
    (commerce.feed?.length ?? 0) > 0 ||
    onboardingStartCount > 0 ||
    onboardingStats.completions > 0 ||
    viewerDropInsights.length > 0 ||
    viewerUsers.length > 0 ||
    taskLeaderboard.length > 0 ||
    packagePerformance.length > 0;
  const showHistoricalEmptyState =
    Boolean(historicalResponse) &&
    !historicalLoading &&
    !blockingAnalyticsError &&
    !historicalHasSignals;
  const liveBlockingIssues =
    !liveResponse && liveError
      ? [liveError.message || "Realtime analytics request failed."]
      : [];
  const historicalBlockingIssues =
    !historicalResponse && historicalError
      ? [historicalError.message || "Historical analytics request failed."]
      : [];
  const liveBackgroundIssues = [
    liveResponse && liveError
      ? `Realtime analytics refresh failed: ${liveError.message || "Background refresh failed."}`
      : null,
    ...(liveResponse?.issues || []).map(
      (issue) => `Realtime analytics issue: ${issue}`,
    ),
  ].filter((issue): issue is string => Boolean(issue));
  const historicalBackgroundIssues = [
    historicalResponse && historicalError
      ? `Historical analytics refresh failed: ${historicalError.message || "Background refresh failed."}`
      : null,
    ...(historicalResponse?.issues || []).map(
      (issue) => `Historical analytics issue: ${issue}`,
    ),
  ].filter((issue): issue is string => Boolean(issue));
  const liveUpdatedAtMs = liveResponse?.generatedAtMs ?? 0;
  const historicalUpdatedAtMs = historicalResponse?.generatedAtMs ?? 0;
  const buildHistoricalSectionState = (
    sectionLabel: string,
    sectionRange: RangeOption,
    overrideRequest: {
      data?: HistoricalAnalyticsResponse;
      error?: Error;
      isLoading: boolean;
    },
  ) => {
    if (sectionRange === ADMIN_ANALYTICS_DEFAULT_RANGE) {
      return {
        updatedAtMs: historicalUpdatedAtMs,
        hasLoaded: Boolean(historicalResponse) || Boolean(historicalError),
        loading: historicalLoading,
        blockingIssues: historicalBlockingIssues,
        backgroundIssues: historicalBackgroundIssues,
      };
    }

    const overrideErrorMessage =
      overrideRequest.error?.message ||
      `${sectionLabel} analytics request failed.`;
    return {
      updatedAtMs: overrideRequest.data?.generatedAtMs ?? 0,
      hasLoaded:
        Boolean(overrideRequest.data) || Boolean(overrideRequest.error),
      loading: overrideRequest.isLoading,
      blockingIssues:
        !overrideRequest.data && overrideRequest.error
          ? [`${sectionLabel}: ${overrideErrorMessage}`]
          : [],
      backgroundIssues: [
        overrideRequest.data && overrideRequest.error
          ? `${sectionLabel}: ${overrideErrorMessage}`
          : null,
        ...(overrideRequest.data?.issues || []).map(
          (issue) => `${sectionLabel}: ${issue}`,
        ),
      ].filter((issue): issue is string => Boolean(issue)),
    };
  };
  const authOutcomeSplitState = buildHistoricalSectionState(
    "Auth outcome split",
    authOutcomeSplitRange,
    authOutcomeSplitOverride,
  );
  const onboardingVelocityState = buildHistoricalSectionState(
    "Onboarding velocity",
    onboardingVelocityRange,
    onboardingVelocityOverride,
  );
  const onboardingStepFlowState = buildHistoricalSectionState(
    "Onboarding step flow",
    onboardingStepFlowRange,
    onboardingStepFlowOverride,
  );
  const guestBounceQualityState = buildHistoricalSectionState(
    "Guest and bounce quality",
    guestBounceQualityRange,
    guestBounceQualityOverride,
  );
  const eventMixState = buildHistoricalSectionState(
    "Event mix",
    eventMixRange,
    eventMixOverride,
  );
  const liveInteractionStreamState = buildHistoricalSectionState(
    "Live interaction stream",
    liveInteractionStreamRange,
    liveInteractionStreamOverride,
  );
  const dataValidationState = buildHistoricalSectionState(
    "Data validation",
    dataValidationRange,
    dataValidationOverride,
  );
  const audienceSnapshotState = buildHistoricalSectionState(
    "Audience snapshot",
    audienceSnapshotRange,
    audienceSnapshotOverride,
  );
  const returnCadenceState = buildHistoricalSectionState(
    "Return cadence",
    returnCadenceRange,
    returnCadenceOverride,
  );
  const navigationDestinationsState = buildHistoricalSectionState(
    "Navigation destinations",
    navigationDestinationsRange,
    navigationDestinationsOverride,
  );
  const deviceMixState = buildHistoricalSectionState(
    "Device mix",
    deviceMixRange,
    deviceMixOverride,
  );
  const topPathsState = buildHistoricalSectionState(
    "Top paths",
    topPathsRange,
    topPathsOverride,
  );
  const regionsState = buildHistoricalSectionState(
    "Regions",
    regionsRange,
    regionsOverride,
  );
  const commerceSnapshotState = buildHistoricalSectionState(
    "Commerce snapshot",
    commerceSnapshotRange,
    commerceSnapshotOverride,
  );
  const packagePerformanceState = buildHistoricalSectionState(
    "Package performance",
    packagePerformanceRange,
    packagePerformanceOverride,
  );
  const contentConversionState = buildHistoricalSectionState(
    "Content conversion",
    contentConversionRange,
    contentConversionOverride,
  );
  const topDropConversionState = buildHistoricalSectionState(
    "Top drop conversion",
    topDropConversionRange,
    topDropConversionOverride,
  );
  const recentCommerceFeedState = buildHistoricalSectionState(
    "Recent commerce feed",
    recentCommerceFeedRange,
    recentCommerceFeedOverride,
  );
  const viewerDrilldownState = buildHistoricalSectionState(
    "Viewer drilldown",
    viewerDrilldownRange,
    viewerDrilldownOverride,
  );
  const viewerJourneyState = buildHistoricalSectionState(
    "Viewer journey",
    viewerJourneyRange,
    viewerJourneyOverride,
  );
  const watchDepthTagsState = buildHistoricalSectionState(
    "Watch depth and tags",
    watchDepthTagsRange,
    watchDepthTagsOverride,
  );
  const dailyTaskPipelineState = buildHistoricalSectionState(
    "Daily task pipeline",
    dailyTaskPipelineRange,
    dailyTaskPipelineOverride,
  );
  const taskCompletionSpeedState = buildHistoricalSectionState(
    "Task completion speed",
    taskCompletionSpeedRange,
    taskCompletionSpeedOverride,
  );
  const taskLeaderboardState = buildHistoricalSectionState(
    "Task leaderboard",
    taskLeaderboardRange,
    taskLeaderboardOverride,
  );
  const notificationFunnelState = buildHistoricalSectionState(
    "Notification funnel",
    notificationFunnelRange,
    notificationFunnelOverride,
  );
  const analyticsSectionHealth = [
    buildAdminUiChartHealthItem({
      key: "analytics.operations.live_pulse",
      title: "Live Pulse",
      page: "analytics",
      category: "operations",
      source: "mixed_client_live",
      updatedAtMs: Math.max(liveUpdatedAtMs, historicalUpdatedAtMs),
      hasLoaded:
        Boolean(liveResponse) ||
        Boolean(historicalResponse) ||
        Boolean(liveError) ||
        Boolean(historicalError),
      loading: liveLoading || historicalLoading,
      hasData:
        liveSeries.length > 0 ||
        (liveResponse?.totalActive ?? 0) > 0 ||
        (liveResponse?.deepTrackerActive ?? 0) > 0,
      blockingIssues: [...liveBlockingIssues, ...historicalBlockingIssues],
      backgroundIssues: [
        ...liveBackgroundIssues,
        ...historicalBackgroundIssues,
      ],
      healthySummary: "Realtime and historical pulse metrics are both loaded.",
      emptySummary:
        "Live pulse loaded without any realtime or recent historical signal.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.operations.auth_outcome_split",
      title: "Auth Outcome Split",
      page: "analytics",
      category: "operations",
      source: "historical_analytics",
      updatedAtMs: authOutcomeSplitState.updatedAtMs,
      hasLoaded: authOutcomeSplitState.hasLoaded,
      loading: authOutcomeSplitState.loading,
      hasData: authOutcomeHasData,
      blockingIssues: authOutcomeSplitState.blockingIssues,
      backgroundIssues: authOutcomeSplitState.backgroundIssues,
      healthySummary:
        "Authentication outcome split is loaded from the historical analytics window.",
      emptySummary:
        "Auth outcome split loaded without any tracked auth attempts or outcomes in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.operations.onboarding_velocity",
      title: "Onboarding Velocity",
      page: "analytics",
      category: "operations",
      source: "historical_analytics",
      updatedAtMs: onboardingVelocityState.updatedAtMs,
      hasLoaded: onboardingVelocityState.hasLoaded,
      loading: onboardingVelocityState.loading,
      hasData:
        onboardingVelocityHasData ||
        onboardingStepFlowItems.length > 0 ||
        onboardingVelocityStartCount > 0 ||
        onboardingVelocityStats.completions > 0,
      blockingIssues: onboardingVelocityState.blockingIssues,
      backgroundIssues: onboardingVelocityState.backgroundIssues,
      healthySummary:
        "Onboarding velocity is loaded from tracked onboarding history.",
      emptySummary:
        "Onboarding velocity loaded without any tracked starts, completions, or duration buckets in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.operations.onboarding_step_flow",
      title: "Onboarding Step Flow",
      page: "analytics",
      category: "operations",
      source: "historical_analytics",
      updatedAtMs: onboardingStepFlowState.updatedAtMs,
      hasLoaded: onboardingStepFlowState.hasLoaded,
      loading: onboardingStepFlowState.loading,
      hasData: onboardingStepFlowItems.length > 0,
      blockingIssues: onboardingStepFlowState.blockingIssues,
      backgroundIssues: onboardingStepFlowState.backgroundIssues,
      healthySummary: "Step-level onboarding flow is loaded.",
      emptySummary:
        "No onboarding step-flow records were returned for the selected window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.operations.guest_bounce_quality",
      title: "Guest + Bounce Quality",
      page: "analytics",
      category: "operations",
      source: "historical_analytics",
      updatedAtMs: guestBounceQualityState.updatedAtMs,
      hasLoaded: guestBounceQualityState.hasLoaded,
      loading: guestBounceQualityState.loading,
      hasData: Boolean(
        guestBounceGlobalSemantics?.viewCount ||
        guestBounceUserSemantics?.viewCount ||
        guestBounceAdminSemantics?.viewCount ||
        guestBounceDropSemantics?.viewCount,
      ),
      blockingIssues: guestBounceQualityState.blockingIssues,
      backgroundIssues: guestBounceQualityState.backgroundIssues,
      healthySummary:
        "Semantic quality metrics are loaded for guest and signed-in traffic.",
      emptySummary:
        "Semantic quality metrics loaded without any view-count signal.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.operations.event_mix",
      title: "Event Mix",
      page: "analytics",
      category: "operations",
      source: "historical_analytics",
      updatedAtMs: eventMixState.updatedAtMs,
      hasLoaded: eventMixState.hasLoaded,
      loading: eventMixState.loading,
      hasData: eventMixBreakdown.length > 0,
      blockingIssues: eventMixState.blockingIssues,
      backgroundIssues: eventMixState.backgroundIssues,
      healthySummary: "Event mix is loaded from the selected historical range.",
      emptySummary:
        "Event mix loaded without any tracked event counts in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.operations.live_interaction_stream",
      title: "Live Interaction Stream",
      page: "analytics",
      category: "operations",
      source: "mixed_client_live",
      updatedAtMs: Math.max(
        liveUpdatedAtMs,
        liveInteractionStreamState.updatedAtMs,
      ),
      hasLoaded:
        Boolean(liveResponse) ||
        liveInteractionStreamState.hasLoaded ||
        Boolean(liveError),
      loading: liveLoading || liveInteractionStreamState.loading,
      hasData:
        liveInteractionEvents.length > 0 ||
        liveActiveUsers.length > 0 ||
        liveSurfaceMix.length > 0,
      blockingIssues: [
        ...liveBlockingIssues,
        ...liveInteractionStreamState.blockingIssues,
      ],
      backgroundIssues: [
        ...liveBackgroundIssues,
        ...liveInteractionStreamState.backgroundIssues,
      ],
      healthySummary:
        "Interaction stream is loaded from realtime and recent historical inputs.",
      emptySummary:
        "Interaction stream loaded without any recent live or historical interaction records.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.operations.data_validation",
      title: "Data Validation",
      page: "analytics",
      category: "operations",
      source: "historical_analytics",
      updatedAtMs: dataValidationState.updatedAtMs,
      hasLoaded: dataValidationState.hasLoaded,
      loading: dataValidationState.loading,
      hasData: validationItems.length > 0,
      blockingIssues: dataValidationState.blockingIssues,
      backgroundIssues: dataValidationState.backgroundIssues,
      healthySummary:
        "Validation checks are loaded for the selected analytics window.",
      emptySummary: "Validation checks did not return any loaded rows.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.audience.audience_snapshot",
      title: "Audience Snapshot",
      page: "analytics",
      category: "audience",
      source: "historical_analytics",
      updatedAtMs: audienceSnapshotState.updatedAtMs,
      hasLoaded: audienceSnapshotState.hasLoaded,
      loading: audienceSnapshotState.loading,
      hasData:
        audienceHistorySeries.length > 0 ||
        audienceTotals.users > 0 ||
        audienceTotals.views > 0 ||
        audienceTotals.sessions > 0,
      blockingIssues: audienceSnapshotState.blockingIssues,
      backgroundIssues: audienceSnapshotState.backgroundIssues,
      healthySummary: "Audience snapshot is loaded for the selected range.",
      emptySummary:
        "Audience snapshot loaded without any audience metrics in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.audience.return_cadence",
      title: "Return Cadence",
      page: "analytics",
      category: "audience",
      source: "historical_analytics",
      updatedAtMs: returnCadenceState.updatedAtMs,
      hasLoaded: returnCadenceState.hasLoaded,
      loading: returnCadenceState.loading,
      hasData: returnCadenceSegments.length > 0,
      blockingIssues: returnCadenceState.blockingIssues,
      backgroundIssues: returnCadenceState.backgroundIssues,
      healthySummary: "Return cadence segments are loaded.",
      emptySummary: "No return-cadence segments were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.audience.navigation_destinations",
      title: "Navigation Destinations",
      page: "analytics",
      category: "audience",
      source: "historical_analytics",
      updatedAtMs: navigationDestinationsState.updatedAtMs,
      hasLoaded: navigationDestinationsState.hasLoaded,
      loading: navigationDestinationsState.loading,
      hasData: navigationDestinationsMix.length > 0,
      blockingIssues: navigationDestinationsState.blockingIssues,
      backgroundIssues: navigationDestinationsState.backgroundIssues,
      healthySummary: "Navigation destinations are loaded.",
      emptySummary:
        "No navigation-destination mix was returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.audience.device_mix",
      title: "Device Mix",
      page: "analytics",
      category: "audience",
      source: "historical_analytics",
      updatedAtMs: deviceMixState.updatedAtMs,
      hasLoaded: deviceMixState.hasLoaded,
      loading: deviceMixState.loading,
      hasData: deviceMixDevices.length > 0,
      blockingIssues: deviceMixState.blockingIssues,
      backgroundIssues: deviceMixState.backgroundIssues,
      healthySummary: "Device mix is loaded.",
      emptySummary: "No device-mix rows were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.audience.top_paths",
      title: "Top Paths",
      page: "analytics",
      category: "audience",
      source: "historical_analytics",
      updatedAtMs: topPathsState.updatedAtMs,
      hasLoaded: topPathsState.hasLoaded,
      loading: topPathsState.loading,
      hasData: topPathsPages.length > 0,
      blockingIssues: topPathsState.blockingIssues,
      backgroundIssues: topPathsState.backgroundIssues,
      healthySummary: "Top path performance is loaded.",
      emptySummary: "No top-path rows were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.audience.regions",
      title: "Regions",
      page: "analytics",
      category: "audience",
      source: "historical_analytics",
      updatedAtMs: regionsState.updatedAtMs,
      hasLoaded: regionsState.hasLoaded,
      loading: regionsState.loading,
      hasData: regionsGeo.length > 0,
      blockingIssues: regionsState.blockingIssues,
      backgroundIssues: regionsState.backgroundIssues,
      healthySummary: "Regional demand is loaded.",
      emptySummary: "No regional demand rows were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.commerce_snapshot",
      title: "Commerce Snapshot",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: commerceSnapshotState.updatedAtMs,
      hasLoaded: commerceSnapshotState.hasLoaded,
      loading: commerceSnapshotState.loading,
      hasData:
        commerceSnapshotCommerce.revenueUsd > 0 ||
        commerceSnapshotCommerce.gdSpent > 0 ||
        commerceSnapshotFunnel.purchases > 0,
      blockingIssues: commerceSnapshotState.blockingIssues,
      backgroundIssues: commerceSnapshotState.backgroundIssues,
      healthySummary: "Commerce snapshot is loaded.",
      emptySummary:
        "Commerce snapshot loaded without any revenue, spend, or purchase signal.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.package_performance",
      title: "Package Performance",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: packagePerformanceState.updatedAtMs,
      hasLoaded: packagePerformanceState.hasLoaded,
      loading: packagePerformanceState.loading,
      hasData: packagePerformanceItems.length > 0,
      blockingIssues: packagePerformanceState.blockingIssues,
      backgroundIssues: packagePerformanceState.backgroundIssues,
      healthySummary: "Package performance is loaded.",
      emptySummary: "No package-performance rows were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.content_conversion",
      title: "Content Conversion",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: contentConversionState.updatedAtMs,
      hasLoaded: contentConversionState.hasLoaded,
      loading: contentConversionState.loading,
      hasData: contentConversionItems.length > 0,
      blockingIssues: contentConversionState.blockingIssues,
      backgroundIssues: contentConversionState.backgroundIssues,
      healthySummary: "Content conversion mix is loaded.",
      emptySummary: "No content-conversion mix was returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.top_drop_conversion",
      title: "Top Drop Conversion",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: topDropConversionState.updatedAtMs,
      hasLoaded: topDropConversionState.hasLoaded,
      loading: topDropConversionState.loading,
      hasData: topDropConversionItems.length > 0,
      blockingIssues: topDropConversionState.blockingIssues,
      backgroundIssues: topDropConversionState.backgroundIssues,
      healthySummary: "Top drop conversion is loaded.",
      emptySummary: "No top-drop conversion rows were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.recent_commerce_feed",
      title: "Recent Commerce Feed",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: recentCommerceFeedState.updatedAtMs,
      hasLoaded: recentCommerceFeedState.hasLoaded,
      loading: recentCommerceFeedState.loading,
      hasData: recentCommerceFeedItems.length > 0,
      blockingIssues: recentCommerceFeedState.blockingIssues,
      backgroundIssues: recentCommerceFeedState.backgroundIssues,
      healthySummary: "Recent commerce feed is loaded.",
      emptySummary:
        "No recent commerce feed rows were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.viewer_drilldown",
      title: "Viewer Drilldown",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: viewerDrilldownState.updatedAtMs,
      hasLoaded: viewerDrilldownState.hasLoaded,
      loading: viewerDrilldownState.loading,
      hasData:
        viewerDrilldownOverview.viewCount > 0 ||
        viewerDrilldownInsights.length > 0 ||
        viewerDrilldownUsers.length > 0,
      blockingIssues: viewerDrilldownState.blockingIssues,
      backgroundIssues: viewerDrilldownState.backgroundIssues,
      healthySummary:
        "Viewer drilldown is loaded for the current viewer scope.",
      emptySummary:
        "Viewer drilldown loaded without any viewer-level watch or identity signal.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.viewer_journey",
      title: "Viewer Journey",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: viewerJourneyState.updatedAtMs,
      hasLoaded: viewerJourneyState.hasLoaded,
      loading: viewerJourneyState.loading,
      hasData: viewerJourneyItems.length > 0,
      blockingIssues: viewerJourneyState.blockingIssues,
      backgroundIssues: viewerJourneyState.backgroundIssues,
      healthySummary: "Viewer journey metrics are loaded.",
      emptySummary:
        "Viewer journey loaded without any tracked viewer activity.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.watch_depth_tags",
      title: "Watch Depth + Tags",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: watchDepthTagsState.updatedAtMs,
      hasLoaded: watchDepthTagsState.hasLoaded,
      loading: watchDepthTagsState.loading,
      hasData:
        watchDepthTagBuckets.length > 0 || watchDepthTagDemand.length > 0,
      blockingIssues: watchDepthTagsState.blockingIssues,
      backgroundIssues: watchDepthTagsState.backgroundIssues,
      healthySummary: "Watch-depth and tag demand are loaded.",
      emptySummary:
        "No watch-depth or tag-demand rows were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.daily_task_pipeline",
      title: "Daily Task Pipeline",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: dailyTaskPipelineState.updatedAtMs,
      hasLoaded: dailyTaskPipelineState.hasLoaded,
      loading: dailyTaskPipelineState.loading,
      hasData: dailyTaskPipelineItems.length > 0,
      blockingIssues: dailyTaskPipelineState.blockingIssues,
      backgroundIssues: dailyTaskPipelineState.backgroundIssues,
      healthySummary: "Daily task pipeline metrics are loaded.",
      emptySummary: "No daily task pipeline rows were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.task_completion_speed",
      title: "Task Completion Speed",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: taskCompletionSpeedState.updatedAtMs,
      hasLoaded: taskCompletionSpeedState.hasLoaded,
      loading: taskCompletionSpeedState.loading,
      hasData: taskCompletionSpeedBuckets.length > 0,
      blockingIssues: taskCompletionSpeedState.blockingIssues,
      backgroundIssues: taskCompletionSpeedState.backgroundIssues,
      healthySummary: "Task completion speed buckets are loaded.",
      emptySummary:
        "No task completion speed buckets were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.task_leaderboard",
      title: "Task Leaderboard",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: taskLeaderboardState.updatedAtMs,
      hasLoaded: taskLeaderboardState.hasLoaded,
      loading: taskLeaderboardState.loading,
      hasData: taskLeaderboardItems.length > 0,
      blockingIssues: taskLeaderboardState.blockingIssues,
      backgroundIssues: taskLeaderboardState.backgroundIssues,
      healthySummary: "Task leaderboard is loaded.",
      emptySummary: "No task leaderboard rows were returned in this window.",
    }),
    buildAdminUiChartHealthItem({
      key: "analytics.commerce.notification_funnel",
      title: "Notification Funnel",
      page: "analytics",
      category: "commerce",
      source: "historical_analytics",
      updatedAtMs: notificationFunnelState.updatedAtMs,
      hasLoaded: notificationFunnelState.hasLoaded,
      loading: notificationFunnelState.loading,
      hasData:
        notificationFunnelItems.length > 0 ||
        notificationActionItems.length > 0 ||
        notificationReminderReasons.length > 0,
      blockingIssues: notificationFunnelState.blockingIssues,
      backgroundIssues: notificationFunnelState.backgroundIssues,
      healthySummary: "Notification funnel metrics are loaded.",
      emptySummary:
        "No notification funnel metrics were returned in this window.",
    }),
  ];
  const analyticsSectionHealthSummary = summarizeAdminUiChartHealth(
    analyticsSectionHealth,
  );

  useAdminUiChartHealthReporter(analyticsSectionHealth);

  const applyViewerFilter = () => {
    setViewerUserFilter(viewerUserDraft.trim());
  };

  const clearViewerFilter = () => {
    setViewerUserDraft("");
    setViewerUserFilter("");
  };

  const clearAllFilters = () => {
    clearViewerFilter();
  };

  if (needsSetup) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <div className="glass-panel max-w-xl rounded-[2rem] border border-red-500/20 p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-red-500/10 text-red-400">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Analytics Needs GA Setup
          </h1>
          <p className="mt-3 text-sm text-gray-400">
            Add <code>GA_PROPERTY_ID</code> to the environment so the admin
            analytics console can query Google Analytics 4.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:space-y-5 md:pb-8">
      <PageViewEvent eventName="admin_analytics_viewed" />
      <AdminPageHeader
        eyebrow="Admin Analytics"
        title="Mobile Monitoring Station"
        subtitle="Live pulse, device mix, funnel health, and revenue signals tuned for small screens first."
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <MetricCard
          label="Live GA"
          value={formatCompactNumber(liveResponse?.totalActive ?? 0)}
          hint="Active in the last 30 mins"
          icon={Activity}
        />
        <MetricCard
          label="Mobile Share"
          value={formatPercent(mobileShare)}
          hint={`${mobileUsers.toLocaleString()} mobile users in range`}
          icon={Smartphone}
        />
        <MetricCard
          label="Revenue"
          value={formatMoney(commerce.revenueUsd)}
          hint={`${range.toUpperCase()} tracked revenue`}
          icon={DollarSign}
        />
        <MetricCard
          label="Purchases"
          value={formatCompactNumber(funnel.purchases)}
          hint={`${funnel.checkoutStarts.toLocaleString()} checkout starts`}
          icon={ShoppingBag}
        />
      </div>

      <div className="sticky top-[8.6rem] z-20 space-y-2.5 rounded-[1.4rem] border border-white/10 bg-black/65 p-2.5 backdrop-blur-xl md:top-24">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
            Sync
          </span>
          <span className="text-xs font-semibold text-white">
            {analyticsWarmState}
          </span>
          <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
            Live {liveSnapshotLabel}
          </span>
          <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
            History {historicalSnapshotLabel}
          </span>
          {isBackgroundSyncing ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-purple/20 bg-brand-purple/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-purple">
              <Loader2 className="h-3 w-3 animate-spin" />
              Syncing
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
            Chart health
          </span>
          <span className="rounded-full border border-emerald-400/15 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">
            {analyticsSectionHealthSummary.healthy} healthy
          </span>
          {analyticsSectionHealthSummary.warn > 0 ? (
            <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-100">
              {analyticsSectionHealthSummary.warn} warn
            </span>
          ) : null}
          {analyticsSectionHealthSummary.fail > 0 ? (
            <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-red-100">
              {analyticsSectionHealthSummary.fail} fail
            </span>
          ) : null}
          <span className="text-xs text-gray-400">
            {analyticsSectionHealthSummary.total} sections reporting from live
            admin analytics UI
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {TAB_OPTIONS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-2xl border px-3 py-3 text-left transition-colors",
                  active
                    ? "border-brand-purple/40 bg-brand-purple/15 text-white"
                    : "border-white/10 bg-white/5 text-gray-300",
                )}
              >
                <Icon
                  className={cn(
                    "mb-2 h-4 w-4",
                    active ? "text-brand-purple" : "text-gray-500",
                  )}
                />
                <div className="text-sm font-bold">{tab.label}</div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <Funnel className="h-4 w-4 shrink-0 text-gray-500" />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
              Module filters
            </span>
            <span className="text-xs text-gray-400">
              Each card owns its own time range. The viewer drilldown filter is
              the only page-level control left.
            </span>
          </div>
          <button
            type="button"
            onClick={clearAllFilters}
            className="ml-auto shrink-0 rounded-full border border-white/15 bg-black/40 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300 transition-colors hover:border-brand-purple/40 hover:text-white"
          >
            Clear viewer filter
          </button>
        </div>
      </div>

      {blockingAnalyticsError && (
        <div className="rounded-[1.8rem] border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-sm font-medium text-red-300">
            {blockingAnalyticsError.message || "Analytics request failed."}
          </p>
        </div>
      )}

      {backgroundAnalyticsIssues.length > 0 && !blockingAnalyticsError ? (
        <div className="rounded-[1.8rem] border border-amber-500/20 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-200">
            Analytics is showing the last good snapshot while a background
            refresh recovers.
          </p>
          <div className="mt-2 space-y-1 text-xs text-amber-100/90">
            {backgroundAnalyticsIssues.map((issue) => (
              <p key={issue}>{issue}</p>
            ))}
          </div>
        </div>
      ) : null}

      {showHistoricalEmptyState ? (
        <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-white">
                No analytics landed for this window yet.
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {activeViewerFilter
                  ? `No tracked events matched ${activeViewerFilter.startsWith("@") ? activeViewerFilter : `@${activeViewerFilter}`} in ${range.toUpperCase()}.`
                  : `No tracked events were found in ${range.toUpperCase()}.`}{" "}
                This usually means the selected window is too narrow for the
                current dataset, or this environment only has older seeded
                analytics.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {viewerUserFilter ? (
                <button
                  type="button"
                  onClick={clearViewerFilter}
                  className="rounded-full border border-white/15 bg-black/40 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300 transition-colors hover:border-white/30 hover:text-white"
                >
                  Clear viewer filter
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isPrimingAnalytics ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
            <p className="text-sm text-gray-500">Syncing analytics...</p>
          </div>
        </div>
      ) : null}

      <main className="space-y-4 md:space-y-5">
        {activeTab === "operations" ? (
          <>
            <SectionCard
              title="Live Pulse"
              subtitle="Current traffic against the selected historical window so mobile admins can sanity-check activity fast."
              icon={Activity}
              defaultExpanded
              rightSlot={renderSectionRangeControl("livePulse")}
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard
                  label="GA Active"
                  value={formatCompactNumber(liveResponse?.totalActive ?? 0)}
                  hint="Google Analytics realtime"
                  icon={Users}
                />
                <MetricCard
                  label="Tracked Users"
                  value={formatCompactNumber(
                    liveResponse?.deepTrackerActive ?? 0,
                  )}
                  hint="Authenticated users active in the last 30 minutes"
                  icon={Sparkles}
                />
                <MetricCard
                  label="Onboarding"
                  value={livePulseOnboardingStats.completions.toLocaleString()}
                  hint={`${livePulseOnboardingStartCount.toLocaleString()} starts · ${formatPercent(livePulseOnboardingCompletionRate)}`}
                  icon={PlayCircle}
                />
                <MetricCard
                  label="Purchases"
                  value={livePulseFunnel.purchases.toLocaleString()}
                  hint={`${formatPercent(livePulseFunnel.checkoutStarts > 0 ? livePulseFunnel.purchases / Math.max(1, livePulseFunnel.checkoutStarts) : 0)} of checkout starts`}
                  icon={ShoppingBag}
                />
              </div>

              <div className="mt-5 h-64 w-full md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={liveSeries}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="liveUsersFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#b28cff"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="#b28cff"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="liveViewsFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#22d3ee"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor="#22d3ee"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="rgba(255,255,255,0.06)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      stroke="#6b7280"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="users"
                      name="Active users"
                      stroke="#b28cff"
                      strokeWidth={2.5}
                      fill="url(#liveUsersFill)"
                    />
                    <Area
                      type="monotone"
                      dataKey="views"
                      name="Page views"
                      stroke="#22d3ee"
                      strokeWidth={2.5}
                      fill="url(#liveViewsFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                        Realtime surfaces
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        Where active admins and users are actually concentrated
                        right now.
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-300">
                      {liveSurfaceMix.length} lanes
                    </span>
                  </div>
                  <div className="space-y-3">
                    {liveSurfaceMix.length > 0 ? (
                      liveSurfaceMix.map((item) => (
                        <div
                          key={item.key}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-white">
                              {item.label}
                            </p>
                            <span className="text-sm font-bold text-brand-purple">
                              {item.activeUsers}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                              style={{
                                width: `${Math.max(8, (item.activeUsers / Math.max(1, liveSurfaceMix[0]?.activeUsers || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                          <p className="mt-2 text-[11px] text-gray-500">
                            Seen {formatRelativeTime(item.lastSeenAt, nowMs)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-500">
                        Realtime surface mix will populate as active-user
                        snapshots land.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                        Active identities
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        Latest actor, route, and experience context for the live
                        pulse window.
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-300">
                      {liveActiveUsers.length} tracked
                    </span>
                  </div>
                  <div className="space-y-3">
                    {liveActiveUsers.length > 0 ? (
                      liveActiveUsers.map((item) => (
                        <div
                          key={item.uid}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {item.username}
                              </p>
                              <p className="mt-1 text-[11px] text-gray-500">
                                {item.lastComponentName ||
                                  item.lastSemanticScopeLabel ||
                                  item.lastPagePath ||
                                  "Live session"}
                              </p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                              {formatRelativeTime(item.lastSeenAt, nowMs)}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-gray-300">
                              {EVENT_LABELS[item.lastEventName] ||
                                item.lastEventName ||
                                "Unknown event"}
                            </span>
                            {item.lastDropTitle ? (
                              <span className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-2 py-1 text-[10px] font-semibold text-brand-purple">
                                {item.lastDropTitle}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-500">
                        No active identity details are available in the current
                        realtime snapshot.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Journey Funnel"
              subtitle="The custom event chain now shows where mobile users are entering, previewing, unlocking, and paying."
              icon={Eye}
              rightSlot={renderSectionRangeControl("journeyFunnel")}
            >
              <div className="grid gap-3">
                {[
                  {
                    label: "Auth modal opens",
                    count: journeyFunnelMetrics.authModalOpens,
                    ratio: 1,
                    icon: Users,
                  },
                  {
                    label: "Drop previews",
                    count: journeyFunnelMetrics.previewOpens,
                    ratio:
                      journeyFunnelMetrics.authModalOpens > 0
                        ? journeyFunnelMetrics.previewOpens /
                          Math.max(1, journeyFunnelMetrics.authModalOpens)
                        : 0,
                    icon: Eye,
                  },
                  {
                    label: "Viewer opens",
                    count: journeyFunnelMetrics.viewerOpens,
                    ratio:
                      journeyFunnelMetrics.previewOpens > 0
                        ? journeyFunnelMetrics.viewerOpens /
                          Math.max(1, journeyFunnelMetrics.previewOpens)
                        : 0,
                    icon: PlayCircle,
                  },
                  {
                    label: "Unlocks",
                    count: journeyFunnelMetrics.unlocks,
                    ratio:
                      journeyFunnelMetrics.previewOpens > 0
                        ? journeyFunnelMetrics.unlocks /
                          Math.max(1, journeyFunnelMetrics.previewOpens)
                        : 0,
                    icon: Sparkles,
                  },
                  {
                    label: "Checkout starts",
                    count: journeyFunnelMetrics.checkoutStarts,
                    ratio:
                      journeyFunnelMetrics.unlocks > 0
                        ? journeyFunnelMetrics.checkoutStarts /
                          Math.max(1, journeyFunnelMetrics.unlocks)
                        : 0,
                    icon: Wallet,
                  },
                  {
                    label: "Purchases",
                    count: journeyFunnelMetrics.purchases,
                    ratio:
                      journeyFunnelMetrics.checkoutStarts > 0
                        ? journeyFunnelMetrics.purchases /
                          Math.max(1, journeyFunnelMetrics.checkoutStarts)
                        : 0,
                    icon: ShoppingBag,
                  },
                ].map((step) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.label}
                      className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/5 text-brand-purple">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {step.label}
                            </p>
                            <p className="text-xs text-gray-500">
                              {step.count.toLocaleString()} events
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-white">
                          {step.label === "Auth modal opens"
                            ? "Base"
                            : formatPercent(step.ratio)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                          style={{
                            width: `${Math.max(6, Math.min(100, step.ratio * 100 || 0))}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <MetricCard
                  label="Shares"
                  value={journeyFunnelMetrics.shares.toLocaleString()}
                  hint="Copied invite/share actions"
                  icon={Share2}
                />
                <MetricCard
                  label="Daily Check-ins"
                  value={journeyFunnelMetrics.checkIns.toLocaleString()}
                  hint="Reward claims in range"
                  icon={CheckCircle2}
                />
              </div>
            </SectionCard>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <SectionCard
                title="Auth Outcome Split"
                subtitle="Attempt volume, completion quality, and finish speed by auth method."
                icon={Users}
                rightSlot={renderSectionRangeControl("authOutcomeSplit")}
              >
                <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
                  <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-purple">
                        Successes
                      </span>
                      <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-200">
                        Failures
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                        Unfinished attempts
                      </span>
                    </div>

                    <div className="h-72 w-full">
                      {authOutcomeHasData ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={authOutcomeChartItems}
                            layout="vertical"
                            margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                            barCategoryGap={18}
                          >
                            <defs>
                              <linearGradient
                                id="authOutcomeSuccessFill"
                                x1="0"
                                y1="0"
                                x2="1"
                                y2="0"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#8b5cf6"
                                  stopOpacity={0.95}
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#c084fc"
                                  stopOpacity={1}
                                />
                              </linearGradient>
                              <linearGradient
                                id="authOutcomeFailureFill"
                                x1="0"
                                y1="0"
                                x2="1"
                                y2="0"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#fb7185"
                                  stopOpacity={0.9}
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#f97316"
                                  stopOpacity={0.95}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              stroke="rgba(255,255,255,0.06)"
                              horizontal={false}
                            />
                            <XAxis
                              type="number"
                              stroke="#6b7280"
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                              allowDecimals={false}
                            />
                            <YAxis
                              type="category"
                              dataKey="label"
                              width={84}
                              stroke="#9ca3af"
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              content={
                                <AnalyticsTooltip
                                  valueFormatter={(value) =>
                                    Number(value).toLocaleString()
                                  }
                                />
                              }
                            />
                            <Bar
                              dataKey="successes"
                              name="Successes"
                              stackId="authOutcome"
                              fill="url(#authOutcomeSuccessFill)"
                              radius={[0, 6, 6, 0]}
                            />
                            <Bar
                              dataKey="failures"
                              name="Failures"
                              stackId="authOutcome"
                              fill="url(#authOutcomeFailureFill)"
                              radius={[0, 6, 6, 0]}
                            />
                            <Bar
                              dataKey="unfinished"
                              name="Unfinished"
                              stackId="authOutcome"
                              fill="#475569"
                              radius={[0, 6, 6, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                          No auth attempts were tracked in this range yet.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <MetricCard
                        label="Attempts"
                        value={formatCompactNumber(authOutcomeTotals.attempts)}
                        hint={`${authOutcomeTotals.unfinished.toLocaleString()} unfinished in range`}
                        icon={Users}
                      />
                      <MetricCard
                        label="Success Rate"
                        value={formatPercent(authOutcomeTotals.successRate)}
                        hint={`${authOutcomeTotals.successes.toLocaleString()} successful completions`}
                        icon={Sparkles}
                      />
                      <MetricCard
                        label="Failures"
                        value={formatCompactNumber(authOutcomeTotals.failures)}
                        hint="Tracked failed auth outcomes"
                        icon={AlertTriangle}
                      />
                      <MetricCard
                        label="Avg Finish"
                        value={formatDuration(
                          authOutcomeTotals.weightedAvgDurationMs / 1000,
                        )}
                        hint="Weighted by successful completions"
                        icon={Clock3}
                      />
                    </div>

                    <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                            Method detail
                          </p>
                          <p className="mt-1 text-sm text-gray-400">
                            Every auth method stays visible even when the range
                            contains failures but no successful finishes.
                          </p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                          {authOutcomeChartItems.length} methods
                        </span>
                      </div>

                      <div className="space-y-3">
                        {authOutcomeHasData ? (
                          authOutcomeChartItems.map((item) => {
                            const unfinishedShare =
                              item.attempts > 0
                                ? item.unfinished / Math.max(1, item.attempts)
                                : 0;
                            const successShare =
                              item.attempts > 0
                                ? item.successes / Math.max(1, item.attempts)
                                : 0;
                            const failureShare =
                              item.attempts > 0
                                ? item.failures / Math.max(1, item.attempts)
                                : 0;

                            return (
                              <div
                                key={item.method}
                                className="rounded-[1.35rem] border border-white/10 bg-black/25 p-3.5"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-white">
                                      {item.label}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">
                                      {item.attempts.toLocaleString()} attempts
                                      tracked
                                    </p>
                                  </div>
                                  <span className="rounded-full border border-brand-purple/25 bg-brand-purple/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-purple">
                                    {formatPercent(item.successRate)}
                                  </span>
                                </div>

                                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className="h-full bg-brand-purple"
                                    style={{ width: `${successShare * 100}%` }}
                                  />
                                  <div
                                    className="h-full bg-rose-400"
                                    style={{ width: `${failureShare * 100}%` }}
                                  />
                                  <div
                                    className="h-full bg-slate-500"
                                    style={{
                                      width: `${unfinishedShare * 100}%`,
                                    }}
                                  />
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-400">
                                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                                    {item.successes.toLocaleString()} success
                                  </span>
                                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                                    {item.failures.toLocaleString()} failed
                                  </span>
                                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                                    {item.unfinished.toLocaleString()}{" "}
                                    unfinished
                                  </span>
                                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                                    {formatDuration(item.avgDurationMs / 1000)}{" "}
                                    avg finish
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                            Auth method detail will populate after attempts are
                            tracked for the selected range.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Onboarding Velocity"
                subtitle="How long new users take to finish the guided tour on mobile."
                icon={PlayCircle}
                rightSlot={renderSectionRangeControl("onboardingVelocity")}
              >
                {authOnboardingDiscrepancies.length > 0 ? (
                  <div className="mb-4 rounded-[1.35rem] border border-amber-400/20 bg-amber-500/10 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-100">
                        Discrepancy
                      </span>
                      <span className="text-xs font-semibold text-gray-300">
                        Cross-check against Onboarding Step Flow below.
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-amber-100">
                      {authOnboardingDiscrepancies.map((item) => (
                        <p key={item}>- {item}</p>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="h-64 w-full">
                    {onboardingVelocityHasData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={onboardingVelocityBuckets}
                          margin={{ top: 8, right: 0, left: -18, bottom: 0 }}
                        >
                          <CartesianGrid
                            stroke="rgba(255,255,255,0.06)"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="label"
                            stroke="#6b7280"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="#6b7280"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip content={<AnalyticsTooltip />} />
                          <Bar
                            dataKey="count"
                            name="Completions"
                            fill="#b28cff"
                            radius={[10, 10, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                        No onboarding data in this range.
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 self-start">
                    <MetricCard
                      label="Started"
                      value={formatCompactNumber(onboardingVelocityStartCount)}
                      hint={
                        onboardingVelocityStats.startSource === "tracked"
                          ? "Canonical starts"
                          : onboardingVelocityStats.startSource ===
                              "completion_fallback"
                            ? "Backfilled from completions"
                            : "No start signals"
                      }
                      icon={PlayCircle}
                    />
                    <MetricCard
                      label="Completed"
                      value={onboardingVelocityStats.completions.toLocaleString()}
                      hint="Finished tours"
                      icon={CheckCircle2}
                    />
                    <MetricCard
                      label="Avg Time"
                      value={formatDuration(
                        onboardingVelocityStats.avgDuration,
                      )}
                      hint="Mean completion time"
                      icon={Clock3}
                    />
                    <MetricCard
                      label="Completion Rate"
                      value={formatPercent(onboardingVelocityCompletionRate)}
                      hint={`${onboardingVelocityDropOffCount.toLocaleString()} users dropped before finish`}
                      icon={Sparkles}
                    />
                  </div>
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <SectionCard
                title="Onboarding Step Flow"
                subtitle="A step-by-step view of where people continue, stall, or finish in the guided tour."
                icon={Route}
                rightSlot={renderSectionRangeControl("onboardingStepFlow")}
              >
                <div className="space-y-3">
                  {onboardingStepFlowItems.length > 0 ? (
                    onboardingStepFlowItems.map((step) => (
                      <div
                        key={step.stepKey}
                        className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {step.stepTitle}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {step.starts.toLocaleString()} starts ·{" "}
                              {step.completions.toLocaleString()} completions ·{" "}
                              {formatDuration(step.avgDurationMs / 1000)} avg
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full border border-brand-purple/25 bg-brand-purple/12 px-3 py-1 text-[11px] font-semibold text-brand-purple">
                            {formatPercent(step.completionRate)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                            style={{
                              width: `${Math.max(6, Math.min(100, step.completionRate * 100))}%`,
                            }}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                          <span>Step {step.stepIndex + 1}</span>
                          <span>
                            {step.dropOffCount.toLocaleString()} drop-offs
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      Step-by-step onboarding data will appear once more guided
                      onboarding progress events land in this range.
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard
                title="Guest + Bounce Quality"
                subtitle="Public and signed-in traffic quality pulled from the semantic engine so bounce detection is visible instead of hidden in raw logs."
                icon={Monitor}
                rightSlot={renderSectionRangeControl("categorySemantics")}
              >
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <MetricCard
                    label="Guest Views"
                    value={formatCompactNumber(
                      guestBounceGlobalSemantics?.viewCount ?? 0,
                    )}
                    hint={`${(guestBounceGlobalSemantics?.clickCount ?? 0).toLocaleString()} tracked public clicks`}
                    icon={Users}
                  />
                  <MetricCard
                    label="Guest Bounce"
                    value={formatPercent(guestBounceGuestRate)}
                    hint={`${(guestBounceGlobalSemantics?.bounceCount ?? 0).toLocaleString()} bounced exits`}
                    icon={AlertTriangle}
                  />
                  <MetricCard
                    label="Guest Engaged"
                    value={formatPercent(guestBounceEngagedRate)}
                    hint={`${(guestBounceGlobalSemantics?.engagedViewCount ?? 0).toLocaleString()} engaged sessions`}
                    icon={Sparkles}
                  />
                  <MetricCard
                    label="Signed-in Bounce"
                    value={formatPercent(guestBounceIdentifiedRate)}
                    hint={`${(guestBounceUserSemantics?.bounceCount ?? 0).toLocaleString()} bounced signed-in visits`}
                    icon={Activity}
                  />
                </div>

                <div className="mt-5 h-72 w-full">
                  {guestBounceQualityCards.some(
                    (card) =>
                      card.views > 0 || card.engaged > 0 || card.bounced > 0,
                  ) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={guestBounceQualityCards}
                        margin={{ top: 8, right: 0, left: -18, bottom: 0 }}
                      >
                        <CartesianGrid
                          stroke="rgba(255,255,255,0.06)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          stroke="#6b7280"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#6b7280"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip content={<AnalyticsTooltip />} />
                        <Bar
                          dataKey="views"
                          name="Views"
                          fill="#b28cff"
                          radius={[10, 10, 0, 0]}
                        />
                        <Bar
                          dataKey="engaged"
                          name="Engaged"
                          fill="#22d3ee"
                          radius={[10, 10, 0, 0]}
                        />
                        <Bar
                          dataKey="bounced"
                          name="Bounced"
                          fill="#f59e0b"
                          radius={[10, 10, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      No quality analytics data in this range.
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <SectionCard
                title="Event Mix"
                subtitle="The strongest custom GA events for the selected window."
                icon={Sparkles}
                rightSlot={renderSectionRangeControl("eventMix")}
              >
                <div className="grid gap-4 lg:grid-cols-[1fr_0.92fr]">
                  <div className="h-64 w-full md:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={eventMixTopEvents}
                        margin={{ top: 8, right: 0, left: -18, bottom: 0 }}
                      >
                        <CartesianGrid
                          stroke="rgba(255,255,255,0.06)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          stroke="#6b7280"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          interval={0}
                          angle={-18}
                          textAnchor="end"
                          height={56}
                        />
                        <YAxis
                          stroke="#6b7280"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip content={<AnalyticsTooltip />} />
                        <Bar
                          dataKey="count"
                          name="Events"
                          fill="#b28cff"
                          radius={[10, 10, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                          Component context
                        </p>
                        <p className="mt-1 text-sm text-gray-400">
                          Which product surfaces are actually generating the
                          event load.
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-300">
                        {topComponentContexts.length} surfaces
                      </span>
                    </div>
                    <div className="space-y-3">
                      {eventMixTopComponentContexts.length > 0 ? (
                        eventMixTopComponentContexts.map((item) => (
                          <div
                            key={item.key}
                            className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                          >
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-white">
                                {item.label}
                              </p>
                              <span className="text-sm font-bold text-brand-purple">
                                {item.count.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
                              <span>
                                {item.uniqueUsers.toLocaleString()} users
                              </span>
                              <span>
                                {item.experienceCount.toLocaleString()}{" "}
                                experiences
                              </span>
                              <span>
                                {EVENT_LABELS[item.exampleEvent] ||
                                  item.exampleEvent}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-500">
                          Component context will populate once enough telemetry
                          lanes resolve against the selected range.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Live Interaction Stream"
                subtitle="Most recent telemetry events and guest interaction buckets collected from the live site."
                icon={Clock3}
                rightSlot={renderSectionRangeControl("liveInteractionStream")}
              >
                <div className="space-y-3">
                  {liveInteractionEvents.length > 0 ? (
                    liveInteractionEvents.slice(0, 8).map((event, index) => (
                      <div
                        key={`${event.timestamp}-${index}`}
                        className="rounded-[1.4rem] border border-white/10 bg-black/30 p-3.5"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-purple">
                            {event.type}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {formatRelativeTime(event.timestamp, nowMs)}
                          </span>
                        </div>
                        <p className="text-sm text-white">
                          {describeEvent(event)}
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          {(event.username || "Guest").trim()} on{" "}
                          <span className="text-gray-400">{event.path}</span>
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {event.componentName ? (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-gray-300">
                              {event.componentName}
                            </span>
                          ) : null}
                          {event.dropTitle || event.dropId ? (
                            <span className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-2 py-1 text-[10px] font-semibold text-brand-purple">
                              {event.dropTitle || event.dropId}
                            </span>
                          ) : null}
                          {event.watchSeconds ? (
                            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold text-cyan-200">
                              {formatDuration(event.watchSeconds)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      No recent interaction traces yet.
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

            <SectionCard
              title="Data Validation"
              subtitle="Every overview here is grounded in a real source, with parity checks surfaced instead of hidden."
              icon={CheckCircle2}
              rightSlot={renderSectionRangeControl("dataValidation")}
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {validationItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">
                        {item.label}
                      </p>
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                          getValidationClasses(item.status),
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs leading-6 text-gray-400">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </>
        ) : null}

        {activeTab === "audience" ? (
          <>
            <SectionCard
              title="Audience Snapshot"
              subtitle="The selected time range emphasizes mobile traffic, retention quality, and visit depth."
              icon={Users}
              defaultExpanded
              rightSlot={renderSectionRangeControl("audienceSnapshot")}
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard
                  label="Active Users"
                  value={formatCompactNumber(audienceTotals.users)}
                  hint={`${audienceTotals.newUsers.toLocaleString()} new users`}
                  icon={Users}
                />
                <MetricCard
                  label="Sessions"
                  value={formatCompactNumber(audienceTotals.sessions)}
                  hint={`${audienceTotals.views.toLocaleString()} views`}
                  icon={Activity}
                />
                <MetricCard
                  label="Avg Session"
                  value={formatDuration(audienceTotals.avgSessionDuration)}
                  hint="Average time per visit"
                  icon={Clock3}
                />
                <MetricCard
                  label="Engagement"
                  value={formatPercent(audienceTotals.engagementRate)}
                  hint="GA engagement rate"
                  icon={Sparkles}
                />
              </div>

              <div className="mt-5 h-64 w-full md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={audienceHistorySeries}
                    margin={{ top: 8, right: 0, left: -18, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="historyUsersFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#b28cff"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="#b28cff"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="rgba(255,255,255,0.06)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      stroke="#6b7280"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={20}
                    />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="users"
                      name="Users"
                      stroke="#b28cff"
                      strokeWidth={2.5}
                      fill="url(#historyUsersFill)"
                    />
                    <Area
                      type="monotone"
                      dataKey="views"
                      name="Views"
                      stroke="#22d3ee"
                      strokeWidth={2}
                      fillOpacity={0}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <SectionCard
                title="Return Cadence"
                subtitle="Authenticated users grouped by how many distinct days they came back during the selected range."
                icon={Route}
                rightSlot={renderSectionRangeControl("returnCadence")}
              >
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={returnCadenceSegments}
                      margin={{ top: 8, right: 0, left: -18, bottom: 0 }}
                    >
                      <CartesianGrid
                        stroke="rgba(255,255,255,0.06)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        stroke="#6b7280"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#6b7280"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<AnalyticsTooltip />} />
                      <Bar
                        dataKey="users"
                        name="Users"
                        fill="#b28cff"
                        radius={[10, 10, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              <SectionCard
                title="Navigation Destinations"
                subtitle="Top in-app destinations reached from tracked taps, useful for mobile drill-down on where intent actually goes."
                icon={Route}
                rightSlot={renderSectionRangeControl("navigationDestinations")}
              >
                <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={navigationDestinationsMix
                            .slice(0, 6)
                            .map((item) => ({
                              name: item.destination,
                              value: item.count,
                            }))}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={52}
                          outerRadius={84}
                          paddingAngle={3}
                        >
                          {navigationDestinationsMix
                            .slice(0, 6)
                            .map((item, index) => (
                              <Cell
                                key={item.destination}
                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            ))}
                        </Pie>
                        <Tooltip content={<AnalyticsTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3">
                    {navigationDestinationsMix.length > 0 ? (
                      navigationDestinationsMix
                        .slice(0, 6)
                        .map((item, index) => (
                          <div
                            key={item.destination}
                            className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4"
                          >
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{
                                    backgroundColor:
                                      PIE_COLORS[index % PIE_COLORS.length],
                                  }}
                                />
                                <p className="text-sm font-semibold text-white">
                                  {item.destination}
                                </p>
                              </div>
                              <span className="text-sm font-bold text-brand-purple">
                                {item.count.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                                style={{
                                  width: `${Math.max(8, (item.count / Math.max(1, navigationDestinationsMix[0]?.count || 1)) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                        Destination drill-down will fill in once more navigation
                        taps are tracked.
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <SectionCard
                title="Device Mix"
                subtitle="Mobile is the admin priority, so device share and engagement stay visible as first-class metrics."
                icon={Smartphone}
                rightSlot={renderSectionRangeControl("deviceMix")}
              >
                <div className="space-y-3">
                  {deviceMixDevices.length > 0 ? (
                    deviceMixDevices.map((item) => {
                      const Icon = getDeviceIcon(item.device);
                      const share =
                        deviceMixTotalUsers > 0
                          ? item.users / deviceMixTotalUsers
                          : 0;
                      return (
                        <div
                          key={item.device}
                          className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-brand-purple">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold capitalize text-white">
                                  {item.device}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {item.sessions.toLocaleString()} sessions
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-black text-white">
                                {formatPercent(share)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatPercent(item.engagementRate)} engaged
                              </p>
                            </div>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                              style={{ width: `${Math.max(8, share * 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      Device data will appear after GA has enough sessions for
                      this range.
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard
                title="Top Paths"
                subtitle="What mobile admins should watch first: where people are actually spending time."
                icon={FileText}
                rightSlot={renderSectionRangeControl("topPaths")}
              >
                <div className="space-y-3">
                  {topPathsPages.length > 0 ? (
                    topPathsPages.slice(0, 8).map((page) => (
                      <div
                        key={page.path}
                        className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {page.path || "/"}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {page.views.toLocaleString()} views ·{" "}
                              {formatDuration(page.avgTime)} avg time
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-brand-purple">
                            {formatPercent(page.engagementRate)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      No page-path data available yet.
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

            <SectionCard
              title="Regions"
              subtitle="Geographic demand surfaced in a mobile-friendly list instead of a cramped desktop-style table."
              icon={MapPin}
              rightSlot={renderSectionRangeControl("regions")}
            >
              <div className="space-y-3">
                {regionsGeo.length > 0 ? (
                  regionsGeo.slice(0, 10).map((item) => (
                    <div
                      key={`${item.country}-${item.city}`}
                      className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {item.city}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.country}
                          </p>
                        </div>
                        <p className="text-lg font-black text-white">
                          {item.users.toLocaleString()}
                        </p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-brand-purple"
                          style={{
                            width: `${Math.max(8, (item.users / Math.max(1, regionsGeo[0]?.users || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                    Not enough location data yet for this range.
                  </div>
                )}
              </div>
            </SectionCard>
          </>
        ) : null}

        {activeTab === "commerce" ? (
          <>
            <SectionCard
              title="Commerce Snapshot"
              subtitle="A tighter mobile revenue view with unlock and purchase efficiency kept above the fold."
              icon={DollarSign}
              defaultExpanded
              rightSlot={renderSectionRangeControl("commerceSnapshot")}
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard
                  label="Revenue"
                  value={formatMoney(commerceSnapshotCommerce.revenueUsd)}
                  hint="Completed currency purchases"
                  icon={DollarSign}
                />
                <MetricCard
                  label="Adj. Profit"
                  value={formatMoney(
                    commerceSnapshotCommerce.adjustedProfitUsd ?? 0,
                  )}
                  hint={`${formatMoney(commerceSnapshotCommerce.bonusValueUsd ?? 0)} promo value granted`}
                  icon={Wallet}
                />
                <MetricCard
                  label="Yield / 100 GD"
                  value={formatMoney(
                    commerceSnapshotCommerce.effectiveUsdPer100Gd ?? 0,
                  )}
                  hint={`${formatCompactNumber(commerceSnapshotCommerce.deliveredGumDrops ?? 0)} GD delivered`}
                  icon={Sparkles}
                />
                <MetricCard
                  label="GD Spent"
                  value={formatCompactNumber(commerceSnapshotCommerce.gdSpent)}
                  hint={`${formatCompactNumber(commerceSnapshotCommerce.bonusGumDrops ?? 0)} bonus GD granted`}
                  icon={ShoppingBag}
                />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Wallet Opens
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {commerceSnapshotFunnel.walletOpens.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Checkout Starts
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {commerceSnapshotFunnel.checkoutStarts.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Purchase Completions
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {commerceSnapshotFunnel.purchases.toLocaleString()}
                  </p>
                </div>
              </div>
            </SectionCard>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <SectionCard
                title="Package Performance"
                subtitle="Which Gum Drop packs are getting checkout intent, completions, and drop-off."
                icon={Wallet}
                rightSlot={renderSectionRangeControl("packagePerformance")}
              >
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={packagePerformanceItems.slice(0, 6)}
                      margin={{ top: 8, right: 0, left: -18, bottom: 0 }}
                    >
                      <CartesianGrid
                        stroke="rgba(255,255,255,0.06)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        stroke="#6b7280"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-18}
                        textAnchor="end"
                        height={56}
                      />
                      <YAxis
                        stroke="#6b7280"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<AnalyticsTooltip />} />
                      <Bar
                        dataKey="starts"
                        name="Checkouts"
                        fill="#374151"
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar
                        dataKey="purchases"
                        name="Purchases"
                        fill="#b28cff"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-5 space-y-3">
                  {packagePerformanceItems.slice(0, 5).map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {item.label}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.starts.toLocaleString()} checkouts ·{" "}
                            {item.purchases.toLocaleString()} purchases
                          </p>
                        </div>
                        <span className="text-sm font-bold text-brand-purple">
                          {formatPercent(item.conversionRate)}
                        </span>
                      </div>
                      <p className="text-xs leading-6 text-gray-400">
                        {formatMoney(item.revenueUsd)} revenue ·{" "}
                        {formatPercent(item.abandonmentRate)} abandonment
                      </p>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title="Content Conversion"
                subtitle="Which content types are previewed most and which actually get unwrapped."
                icon={Candy}
                rightSlot={renderSectionRangeControl("contentConversion")}
              >
                <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={contentConversionItems.slice(0, 6)}
                        margin={{ top: 8, right: 0, left: -18, bottom: 0 }}
                      >
                        <CartesianGrid
                          stroke="rgba(255,255,255,0.06)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          stroke="#6b7280"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#6b7280"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip content={<AnalyticsTooltip />} />
                        <Bar
                          dataKey="previews"
                          name="Previews"
                          fill="#374151"
                          radius={[8, 8, 0, 0]}
                        />
                        <Bar
                          dataKey="unlocks"
                          name="Unlocks"
                          fill="#b28cff"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3">
                    {contentConversionItems.slice(0, 5).map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold capitalize text-white">
                            {item.label}
                          </p>
                          <span className="text-sm font-bold text-brand-purple">
                            {formatPercent(item.unlockRate)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {item.previews.toLocaleString()} previews ·{" "}
                          {item.unlocks.toLocaleString()} unwraps
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <SectionCard
                title="Top Drop Conversion"
                subtitle="Unlocked drops with enough demand to matter, surfaced as a compact mobile chart and list."
                icon={ShoppingBag}
                rightSlot={renderSectionRangeControl("topDropConversion")}
              >
                <div className="h-64 w-full md:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topDropConversionItems.slice(0, 8)}
                      margin={{ top: 8, right: 0, left: -18, bottom: 0 }}
                    >
                      <CartesianGrid
                        stroke="rgba(255,255,255,0.06)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="dropId"
                        stroke="#6b7280"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-18}
                        textAnchor="end"
                        height={56}
                      />
                      <YAxis
                        stroke="#6b7280"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        content={
                          <AnalyticsTooltip
                            valueFormatter={(value, name) =>
                              name === "Unlocks" || name === "Views"
                                ? Number(value).toLocaleString()
                                : String(value)
                            }
                          />
                        }
                      />
                      <Bar
                        dataKey="views"
                        name="Views"
                        fill="#374151"
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar
                        dataKey="unlocks"
                        name="Unlocks"
                        fill="#b28cff"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-5 space-y-3">
                  {topDropConversionItems.slice(0, 6).map((drop) => {
                    const rate = drop.views > 0 ? drop.unlocks / drop.views : 0;
                    return (
                      <div
                        key={drop.dropId}
                        className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4"
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {drop.dropId}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {drop.views.toLocaleString()} views ·{" "}
                              {drop.unlocks.toLocaleString()} unlocks
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-bold text-brand-purple">
                            {formatPercent(rate)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                            style={{ width: `${Math.max(6, rate * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard
                title="Recent Commerce Feed"
                subtitle="Recent transactions condensed into mobile cards so admins can skim activity without horizontal scrolling."
                icon={Wallet}
                rightSlot={renderSectionRangeControl("recentCommerceFeed")}
              >
                <div className="space-y-3">
                  {recentCommerceFeedItems.length > 0 ? (
                    recentCommerceFeedItems.slice(0, 10).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                            {item.userPhoto ? (
                              <Image
                                src={item.userPhoto}
                                alt={item.username || "User"}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <Wallet className="h-4 w-4 text-brand-purple" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">
                              {item.description || item.type || "Transaction"}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {item.username
                                ? `@${item.username}`
                                : "Unknown user"}{" "}
                              ·{" "}
                              {item.timestamp
                                ? formatRelativeTime(item.timestamp, nowMs)
                                : "Just now"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-brand-purple">
                              {typeof item.cost === "number" && item.cost > 0
                                ? formatMoney(item.cost)
                                : typeof item.amount === "number"
                                  ? item.amount.toLocaleString()
                                  : "0"}
                            </p>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
                              {item.status || "logged"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      No recent commerce feed entries yet.
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <SectionCard
                title="Library Viewer Drilldown"
                subtitle={
                  viewerDrilldownFilter
                    ? `Viewer playback, watch time, and drop affinity filtered to ${viewerDrilldownFilter.startsWith("@") ? viewerDrilldownFilter : `@${viewerDrilldownFilter}`}.`
                    : "Overall library-viewer performance across watch time, repeat sessions, asset completion, and the drops people actually spend time with."
                }
                icon={Eye}
                className="xl:col-span-2"
                rightSlot={
                  <div className="flex flex-wrap items-center gap-2">
                    {renderSectionRangeControl("viewerDrilldown")}
                    {viewerDrilldownFilter ? (
                      <span className="rounded-full border border-brand-purple/25 bg-brand-purple/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-purple">
                        Filtered
                      </span>
                    ) : null}
                  </div>
                }
              >
                {(() => {
                  const viewerOverview = viewerDrilldownOverview;

                  return (
                    <div className="space-y-4">
                      <div className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row">
                          <label className="min-w-0 flex-1">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                              Filter by username or UID
                            </span>
                            <input
                              type="text"
                              value={viewerUserDraft}
                              onChange={(event) =>
                                setViewerUserDraft(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  applyViewerFilter();
                                }
                              }}
                              placeholder="codexkdqa or user uid"
                              className="h-12 w-full rounded-2xl border border-white/10 bg-black/40 px-4 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-brand-purple/40"
                            />
                          </label>
                          <div className="flex gap-2 lg:self-end">
                            <button
                              type="button"
                              onClick={applyViewerFilter}
                              className="min-h-12 rounded-2xl bg-brand-purple px-4 text-sm font-bold text-white transition-colors hover:bg-brand-purple/90"
                            >
                              Apply filter
                            </button>
                            <button
                              type="button"
                              onClick={clearViewerFilter}
                              className="min-h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-gray-200 transition-colors hover:border-brand-purple/30 hover:text-white"
                            >
                              Overall
                            </button>
                          </div>
                        </div>

                        {viewerDrilldownUsers.length > 0 ? (
                          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                            {viewerDrilldownUsers.map((item) => (
                              <button
                                key={item.uid}
                                type="button"
                                onClick={() => {
                                  setViewerUserDraft(item.username);
                                  setViewerUserFilter(item.username);
                                }}
                                className={cn(
                                  "shrink-0 rounded-full border px-3 py-2 text-left text-xs transition-colors",
                                  viewerDrilldownFilter &&
                                    item.username === viewerDrilldownFilter
                                    ? "border-brand-purple/40 bg-brand-purple/15 text-white"
                                    : "border-white/10 bg-white/5 text-gray-300 hover:border-brand-purple/30 hover:text-white",
                                )}
                              >
                                <span className="font-semibold">
                                  {item.username.startsWith("@")
                                    ? item.username
                                    : `@${item.username}`}
                                </span>
                                <span className="ml-2 text-gray-500">
                                  {item.sessionCount} sessions
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-2 gap-3 xl:grid-cols-8">
                        <MetricCard
                          label="Views"
                          value={formatCompactNumber(
                            viewerDrilldownOverview.viewCount,
                          )}
                          hint="Viewer opens"
                          icon={Eye}
                        />
                        <MetricCard
                          label="Sessions"
                          value={formatCompactNumber(
                            viewerDrilldownOverview.sessionCount,
                          )}
                          hint={`${viewerDrilldownOverview.repeatSessionCount.toLocaleString()} repeat / ${viewerDrilldownOverview.returnSessionCount.toLocaleString()} returns`}
                          icon={PlayCircle}
                        />
                        <MetricCard
                          label="Unique Viewers"
                          value={formatCompactNumber(
                            viewerDrilldownOverview.uniqueViewerCount,
                          )}
                          hint="Distinct collectors in filter"
                          icon={Users}
                        />
                        <MetricCard
                          label="Watch Time"
                          value={formatDuration(
                            viewerDrilldownOverview.totalWatchSeconds,
                          )}
                          hint={`${formatDuration(viewerDrilldownOverview.avgWatchSeconds)} avg watch`}
                          icon={Clock3}
                        />
                        <MetricCard
                          label="Meaningful"
                          value={formatCompactNumber(
                            viewerDrilldownOverview.meaningfulSessionCount,
                          )}
                          hint={`${viewerDrilldownOverview.convertedSessionCount.toLocaleString()} converted / ${viewerDrilldownOverview.completedSessionCount.toLocaleString()} completed`}
                          icon={CheckCircle2}
                        />
                        <MetricCard
                          label="Completion"
                          value={formatPercent(
                            viewerOverview.assetCompletionRate,
                          )}
                          hint={`${viewerOverview.downloads.toLocaleString()} downloads · ${viewerOverview.relatedClicks.toLocaleString()} next clicks`}
                          icon={CheckCircle2}
                        />
                        <MetricCard
                          label="Opened, No Depth"
                          value={formatCompactNumber(
                            viewerOverview.openedWithoutDepthCount,
                          )}
                          hint="Opened without meaningful consumption"
                          icon={Funnel}
                        />
                        <MetricCard
                          label="Early Exits"
                          value={formatCompactNumber(
                            viewerOverview.bounceSessionCount,
                          )}
                          hint={`${viewerOverview.abandonedSessionCount.toLocaleString()} abandoned / ${viewerOverview.stalledSessionCount.toLocaleString()} stalled`}
                          icon={AlertTriangle}
                        />
                      </div>

                      <div className="grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
                        <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                                Top user journeys
                              </p>
                              <p className="mt-1 text-sm text-gray-400">
                                Which identities are looping through the viewer,
                                and whether they actually stay long enough to
                                matter.
                              </p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-300">
                              {viewerDrilldownJourneys.length} tracked
                            </span>
                          </div>
                          <div className="space-y-3">
                            {viewerDrilldownJourneys.length > 0 ? (
                              viewerDrilldownJourneys.map((item) => (
                                <div
                                  key={item.uid}
                                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                                >
                                  <div className="mb-2 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-white">
                                        {item.username}
                                      </p>
                                      <p className="mt-1 text-[11px] text-gray-500">
                                        {item.primaryPath}
                                      </p>
                                    </div>
                                    <span className="text-sm font-bold text-brand-purple">
                                      {item.eventCount.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-300">
                                      {item.actorType === "guest"
                                        ? "Guest"
                                        : "Member"}
                                    </span>
                                    <span
                                      className={cn(
                                        "rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                                        getJourneyStateClasses(
                                          item.journeyState,
                                        ),
                                      )}
                                    >
                                      {getJourneyStateLabel(item.journeyState)}
                                    </span>
                                    <span>
                                      {formatDuration(item.watchSeconds)} watch
                                    </span>
                                    <span>
                                      {formatRelativeTime(
                                        item.lastSeenAt,
                                        nowMs,
                                      )}
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-500">
                                User-level viewer journeys will appear as soon
                                as canonical watch sessions and telemetry
                                overlap in this range.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                                Experience context
                              </p>
                              <p className="mt-1 text-sm text-gray-400">
                                Drops and experience surfaces ranked by combined
                                activity, watch depth, and conversion pressure.
                              </p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-300">
                              {topExperienceContexts.length} experiences
                            </span>
                          </div>
                          <div className="space-y-3">
                            {topExperienceContexts.length > 0 ? (
                              topExperienceContexts.map((item) => (
                                <div
                                  key={item.key}
                                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                                >
                                  <div className="mb-2 flex items-center justify-between gap-3">
                                    <p className="truncate text-sm font-semibold text-white">
                                      {item.label}
                                    </p>
                                    <span className="text-sm font-bold text-cyan-300">
                                      {formatDuration(item.watchSeconds)}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
                                    <span>
                                      {item.eventCount.toLocaleString()} signals
                                    </span>
                                    <span>
                                      {item.uniqueUsers.toLocaleString()} users
                                    </span>
                                    <span>
                                      {item.conversionCount.toLocaleString()}{" "}
                                      conversions
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-500">
                                Experience context will fill in once drop-level
                                watch sessions or interaction traces land for
                                the chosen period.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                        <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                            Top viewed drops by watch time
                          </p>
                          {viewerDropChartData.length > 0 ? (
                            <div className="h-72 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={viewerDropChartData}
                                  margin={{
                                    top: 8,
                                    right: 6,
                                    left: -18,
                                    bottom: 16,
                                  }}
                                >
                                  <CartesianGrid
                                    stroke="rgba(255,255,255,0.06)"
                                    vertical={false}
                                  />
                                  <XAxis
                                    dataKey="shortLabel"
                                    stroke="#6b7280"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={0}
                                    angle={-16}
                                    textAnchor="end"
                                    height={56}
                                  />
                                  <YAxis
                                    stroke="#6b7280"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                  />
                                  <Tooltip
                                    content={
                                      <AnalyticsTooltip
                                        valueFormatter={(value, name) => {
                                          if (name === "Watch") {
                                            return formatDuration(
                                              Number(value),
                                            );
                                          }
                                          return `${value}`;
                                        }}
                                      />
                                    }
                                  />
                                  <Bar
                                    dataKey="totalWatchSeconds"
                                    name="Watch"
                                    fill="#b28cff"
                                    radius={[10, 10, 0, 0]}
                                  />
                                  <Bar
                                    dataKey="sessionCount"
                                    name="Sessions"
                                    fill="#22d3ee"
                                    radius={[10, 10, 0, 0]}
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                              Viewer drilldown data will populate once
                              collectors start watching library content in the
                              selected range.
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          {viewerDrilldownInsights.slice(0, 5).map((item) => (
                            <div
                              key={item.dropId}
                              className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4"
                            >
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-white">
                                    {item.dropTitle}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-500">
                                    {item.sessionCount.toLocaleString()}{" "}
                                    sessions ·{" "}
                                    {item.uniqueViewerCount.toLocaleString()}{" "}
                                    viewers
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-full border border-brand-purple/25 bg-brand-purple/12 px-3 py-1 text-[11px] font-semibold text-brand-purple">
                                  {formatDuration(item.totalWatchSeconds)}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-gray-300">
                                  Meaningful
                                  <br />
                                  {item.meaningfulSessionCount}
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-gray-300">
                                  Opened no depth
                                  <br />
                                  {item.openedWithoutDepthCount}
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-gray-300">
                                  Returns
                                  <br />
                                  {item.returnSessionCount}
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-brand-purple">
                                  Avg load
                                  <br />
                                  {item.avgLoadMs > 0
                                    ? `${item.avgLoadMs}ms`
                                    : "n/a"}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </SectionCard>

              <SectionCard
                title="Viewer Journey"
                subtitle="How far users move from preview to opening, meaningful watch, completion, and return."
                icon={PlayCircle}
                rightSlot={renderSectionRangeControl("viewerJourney")}
              >
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={viewerJourneyItems}
                      margin={{ top: 8, right: 4, left: -18, bottom: 0 }}
                    >
                      <CartesianGrid
                        stroke="rgba(255,255,255,0.06)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        stroke="#6b7280"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-18}
                        textAnchor="end"
                        height={56}
                      />
                      <YAxis
                        stroke="#6b7280"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<AnalyticsTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Events"
                        stroke="#b28cff"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#b28cff" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              <SectionCard
                title="Watch Depth + Tags"
                subtitle="What people actually watch once they unwrap, plus the tags pulling the most demand."
                icon={Eye}
                rightSlot={renderSectionRangeControl("watchDepthTags")}
              >
                <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Watch depth
                    </p>
                    <div className="space-y-3">
                      {watchDepthTagBuckets.map((bucket) => (
                        <div key={bucket.label}>
                          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                            <span className="text-white">{bucket.label}</span>
                            <span className="font-semibold text-brand-purple">
                              {bucket.count.toLocaleString()}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                              style={{
                                width: `${Math.max(6, (bucket.count / Math.max(1, watchDepthTagBuckets[0]?.count || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Top tags
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {watchDepthTagDemand.length > 0 ? (
                        watchDepthTagDemand.map((item) => (
                          <span
                            key={item.tag}
                            className="rounded-full border border-brand-purple/25 bg-brand-purple/12 px-3 py-2 text-xs font-semibold text-white"
                          >
                            {item.tag} · {item.count}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">
                          Tag demand will populate after more unwraps land in
                          this range.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          </>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <SectionCard
            title="Daily Task Pipeline"
            subtitle="Assigned, started, completed, and failed tasks in one mobile-friendly progression view."
            icon={Funnel}
            rightSlot={renderSectionRangeControl("dailyTaskPipeline")}
          >
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dailyTaskPipelineItems}
                  margin={{ top: 8, right: 0, left: -18, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    stroke="#6b7280"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#6b7280"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<AnalyticsTooltip />} />
                  <Bar
                    dataKey="count"
                    name="Events"
                    fill="#b28cff"
                    radius={[10, 10, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard
            title="Task Completion Speed"
            subtitle="How fast the finished task set is closing, so you can tune missions that are too easy or too heavy."
            icon={Clock3}
            rightSlot={renderSectionRangeControl("taskCompletionSpeed")}
          >
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={taskCompletionSpeedBuckets}
                  margin={{ top: 8, right: 0, left: -18, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    stroke="#6b7280"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#6b7280"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<AnalyticsTooltip />} />
                  <Bar
                    dataKey="count"
                    name="Completions"
                    fill="#22d3ee"
                    radius={[10, 10, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <SectionCard
            title="Task Leaderboard"
            subtitle="The missions driving the most completions, reward payout, and momentum."
            icon={Sparkles}
            rightSlot={renderSectionRangeControl("taskLeaderboard")}
          >
            <div className="space-y-3">
              {taskLeaderboardItems.length > 0 ? (
                taskLeaderboardItems.map((task) => (
                  <div
                    key={task.taskId}
                    className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {task.title}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {task.completed.toLocaleString()} completed Â·{" "}
                          {formatDuration(task.avgDurationMs / 1000)} avg
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-brand-purple">
                        {formatPercent(task.completionRate)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-2 text-gray-300">
                        Assigned
                        <br />
                        {task.assigned}
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-2 text-gray-300">
                        Started
                        <br />
                        {task.started}
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-2 text-brand-purple">
                        Reward
                        <br />
                        {task.rewardTotal}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                  Task leaderboard data will appear once more lifecycle events
                  land in this range.
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Notification Funnel"
            subtitle="Prompt, enablement, open, and read behaviors, plus reminder reasons when people run short on time."
            icon={BellRing}
            rightSlot={renderSectionRangeControl("notificationFunnel")}
          >
            <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activeNotificationFunnelPieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={84}
                      paddingAngle={3}
                    >
                      {activeNotificationFunnel.map((item, index) => (
                        <Cell
                          key={item.label}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<AnalyticsTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {notificationActionItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.4rem] border border-white/10 bg-black/30 p-3.5"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">
                        {item.label}
                      </p>
                      <span className="text-sm font-bold text-brand-purple">
                        {item.value.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                        style={{
                          width: `${Math.max(6, (item.value / Math.max(1, notificationActionItems[0]?.value || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}

                <div className="rounded-[1.4rem] border border-white/10 bg-black/30 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Reminder reasons
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {notificationReminderReasons.length > 0 ? (
                      notificationReminderReasons.map((item) => (
                        <span
                          key={item.label}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          {item.label} Â· {item.count}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">
                        No reminder traffic in this range.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </main>
    </div>
  );
}
