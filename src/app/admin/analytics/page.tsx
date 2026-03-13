"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  DollarSign,
  Eye,
  FileText,
  Loader2,
  MapPin,
  Monitor,
  PlayCircle,
  RefreshCw,
  Share2,
  ShieldAlert,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuthSWR } from "@/hooks/useAuthSWR";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";

type ViewTab = "operations" | "audience" | "commerce" | "security";
type RangeOption = "24h" | "7d" | "30d" | "all";

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

interface HistoricalAnalyticsResponse {
  success: boolean;
  requiresSetup?: boolean;
  error?: string;
  data?: HistoricalPoint[];
  totals?: {
    users: number;
    views: number;
    sessions: number;
    newUsers: number;
    avgSessionDuration: number;
    engagementRate: number;
  };
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
    gdSpent: number;
    feed?: CommerceFeedItem[];
  };
  security?: SecurityItem[];
  onboardingStats?: {
    completions: number;
    avgDuration: number;
  };
  rawEvents?: RawEventItem[];
}

interface RealtimeAnalyticsResponse {
  success: boolean;
  requiresSetup?: boolean;
  error?: string;
  totalActive?: number;
  deepTrackerActive?: number;
  data?: RealtimePoint[];
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
}

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Activity;
  className?: string;
  valueClassName?: string;
}

const RANGE_OPTIONS: Array<{ value: RangeOption; label: string }> = [
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "all", label: "All" },
];

const TAB_OPTIONS: Array<{ id: ViewTab; label: string; icon: typeof Activity }> = [
  { id: "operations", label: "Operations", icon: Activity },
  { id: "audience", label: "Audience", icon: Users },
  { id: "commerce", label: "Commerce", icon: DollarSign },
  { id: "security", label: "Security", icon: ShieldAlert },
];

const EVENT_LABELS: Record<string, string> = {
  auth_google_sign_in_success: "Google sign-ins",
  auth_modal_opened: "Auth modal opens",
  auth_sign_in_success: "Email sign-ins",
  auth_sign_up_success: "Email sign-ups",
  begin_checkout: "Checkout starts",
  daily_check_in_claim: "Daily check-ins",
  drop_card_impression: "Drop card impressions",
  drop_preview_opened: "Drop preview opens",
  drop_share_copied: "Shares copied",
  experience_hub_viewed: "Experience visits",
  guided_onboarding_completed: "Onboarding completions",
  gumdrops_purchase_completed: "Currency purchases",
  purchase: "Purchases",
  unlock_drop_success: "Unlock successes",
  view_drop_details: "Drop detail opens",
  viewer_asset_changed: "Asset switches",
  viewer_opened: "Viewer opens",
  wallet_opened: "Wallet opens",
};

const INITIAL_ANALYTICS_NOW = Date.now();

function AnalyticsTooltip({ active, payload, label, valueFormatter }: AnalyticsTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/90 p-3 shadow-2xl backdrop-blur-md">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div key={`${entry.name}-${index}`} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span>{entry.name}</span>
            </div>
            <span className="font-semibold text-white">
              {valueFormatter ? valueFormatter(entry.value ?? 0, entry.name) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, icon: Icon, children, className, rightSlot }: SectionCardProps) {
  return (
    <section className={cn("glass-panel rounded-[2rem] border border-white/10 p-4 md:p-6", className)}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-brand-purple">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-white md:text-xl">{title}</h2>
          </div>
          {subtitle ? <p className="text-sm text-gray-400">{subtitle}</p> : null}
        </div>
        {rightSlot}
      </div>
      {children}
    </section>
  );
}

function MetricCard({ label, value, hint, icon: Icon, className, valueClassName }: MetricCardProps) {
  return (
    <div className={cn("rounded-[1.6rem] border border-white/10 bg-black/30 p-4", className)}>
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
        <Icon className="h-3.5 w-3.5 text-brand-purple" />
        <span>{label}</span>
      </div>
      <div className={cn("text-2xl font-black tracking-tight text-white", valueClassName)}>{value}</div>
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

function describeEvent(event: RawEventItem): string {
  if (event.detail) return event.detail;
  if (event.type === "scroll") return `Scrolled to ${event.scrollDepthPercent ?? 0}% depth`;
  if (event.type === "click") return `Clicked ${event.targetText || event.targetId || event.targetTag || "element"}`;
  if (event.type === "hover") return `Hovered ${event.targetText || event.targetId || event.targetTag || "element"}`;
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

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>("operations");
  const [range, setRange] = useState<RangeOption>("30d");
  const [nowMs, setNowMs] = useState(INITIAL_ANALYTICS_NOW);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const {
    data: liveResponse,
    error: liveError,
    isLoading: liveLoading,
    mutate: refreshLive,
  } = useAuthSWR<RealtimeAnalyticsResponse>("/api/admin/analytics?type=realtime", {
    refreshInterval: 30_000,
    keepPreviousData: true,
  });

  const {
    data: historicalResponse,
    error: historicalError,
    isLoading: historicalLoading,
    mutate: refreshHistorical,
  } = useAuthSWR<HistoricalAnalyticsResponse>(`/api/admin/analytics?type=historical&period=${range}`, {
    refreshInterval: 60_000,
    keepPreviousData: true,
  });

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
  const commerce = historicalResponse?.commerce ?? { revenueUsd: 0, gdSpent: 0, feed: [] };
  const security = historicalResponse?.security ?? [];
  const rawEvents = historicalResponse?.rawEvents ?? [];
  const onboardingStats = historicalResponse?.onboardingStats ?? { completions: 0, avgDuration: 0 };

  const needsSetup =
    liveResponse?.requiresSetup ||
    historicalResponse?.requiresSetup ||
    (liveError as { info?: { requiresSetup?: boolean } } | undefined)?.info?.requiresSetup ||
    (historicalError as { info?: { requiresSetup?: boolean } } | undefined)?.info?.requiresSetup;

  const totalDeviceUsers = devices.reduce((sum, item) => sum + item.users, 0);
  const mobileUsers = devices.find((item) => item.device.toLowerCase() === "mobile")?.users ?? 0;
  const mobileShare = totalDeviceUsers > 0 ? mobileUsers / totalDeviceUsers : 0;
  const previewToUnlockRate = funnel.previewOpens > 0 ? funnel.unlocks / funnel.previewOpens : 0;
  const checkoutToPurchaseRate = funnel.checkoutStarts > 0 ? funnel.purchases / funnel.checkoutStarts : 0;
  const securityAlerts = security.filter((item) => isRecentViolation(item.lastViolation, nowMs)).length;

  const topEvents = eventBreakdown.slice(0, 8).map((entry) => ({
    ...entry,
    label: EVENT_LABELS[entry.eventName] || entry.eventName.replaceAll("_", " "),
  }));

  const refreshAll = () => {
    void refreshLive();
    void refreshHistorical();
  };

  if (needsSetup) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <div className="glass-panel max-w-xl rounded-[2rem] border border-red-500/20 p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-red-500/10 text-red-400">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-white">Analytics Needs GA Setup</h1>
          <p className="mt-3 text-sm text-gray-400">
            Add <code>GA_PROPERTY_ID</code> to the environment so the admin analytics console can query Google Analytics 4.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 md:space-y-6 md:pb-8">
      <AdminPageHeader
        eyebrow="Admin Analytics"
        title="Mobile Monitoring Station"
        subtitle="Live pulse, device mix, funnel health, revenue signals, and risk monitoring tuned for small screens first."
        actions={
          <button
            type="button"
            onClick={refreshAll}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold text-gray-200 transition-colors hover:border-brand-purple/40 hover:text-white"
            aria-label="Refresh analytics"
          >
            <RefreshCw className={cn("h-4 w-4", liveLoading || historicalLoading ? "animate-spin" : "")} />
            Refresh analytics
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Live GA" value={formatCompactNumber(liveResponse?.totalActive ?? 0)} hint="Active in the last 30 mins" icon={Activity} />
        <MetricCard label="Mobile Share" value={formatPercent(mobileShare)} hint={`${mobileUsers.toLocaleString()} mobile users in range`} icon={Smartphone} />
        <MetricCard label="Revenue" value={formatMoney(commerce.revenueUsd)} hint={`${range.toUpperCase()} tracked revenue`} icon={DollarSign} />
        <MetricCard
          label="Security Alerts"
          value={securityAlerts.toLocaleString()}
          hint={securityAlerts > 0 ? "Violations in the last 24h" : "No fresh violations"}
          icon={ShieldAlert}
          valueClassName={securityAlerts > 0 ? "text-2xl font-black tracking-tight text-red-400" : undefined}
        />
      </div>

      <div className="sticky top-[8.6rem] z-20 space-y-3 rounded-[1.8rem] border border-white/10 bg-black/65 p-3 backdrop-blur-xl md:top-24">
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
                  active ? "border-brand-purple/40 bg-brand-purple/15 text-white" : "border-white/10 bg-white/5 text-gray-300",
                )}
              >
                <Icon className={cn("mb-2 h-4 w-4", active ? "text-brand-purple" : "text-gray-500")} />
                <div className="text-sm font-bold">{tab.label}</div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRange(option.value)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition-colors",
                range === option.value ? "border-white bg-white text-black" : "border-white/10 bg-white/5 text-gray-400",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {(liveError || historicalError) && (
        <div className="rounded-[1.8rem] border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-sm font-medium text-red-300">
            {(liveError as Error | undefined)?.message || (historicalError as Error | undefined)?.message || "Analytics request failed."}
          </p>
        </div>
      )}

      {!liveResponse && !historicalResponse && (liveLoading || historicalLoading) ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
            <p className="text-sm text-gray-500">Syncing analytics...</p>
          </div>
        </div>
      ) : null}

      <main className="space-y-5 md:space-y-6">
        {activeTab === "operations" ? (
          <>
            <SectionCard
              title="Live Pulse"
              subtitle="Current traffic against the selected historical window so mobile admins can sanity-check activity fast."
              icon={Activity}
              rightSlot={<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-400">{range.toUpperCase()}</span>}
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard label="GA Active" value={formatCompactNumber(liveResponse?.totalActive ?? 0)} hint="Google Analytics realtime" icon={Users} />
                <MetricCard label="Deep Tracker" value={formatCompactNumber(liveResponse?.deepTrackerActive ?? 0)} hint="Internal live sessions" icon={Sparkles} />
                <MetricCard label="Onboarding" value={onboardingStats.completions.toLocaleString()} hint={`Avg ${formatDuration(onboardingStats.avgDuration)}`} icon={PlayCircle} />
                <MetricCard label="Purchases" value={funnel.purchases.toLocaleString()} hint={`${formatPercent(checkoutToPurchaseRate)} of checkout starts`} icon={ShoppingBag} />
              </div>

              <div className="mt-5 h-64 w-full md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={liveSeries} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="liveUsersFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#b28cff" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#b28cff" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="liveViewsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="label" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Area type="monotone" dataKey="users" name="Active users" stroke="#b28cff" strokeWidth={2.5} fill="url(#liveUsersFill)" />
                    <Area type="monotone" dataKey="views" name="Page views" stroke="#22d3ee" strokeWidth={2.5} fill="url(#liveViewsFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard
              title="Journey Funnel"
              subtitle="The custom event chain now shows where mobile users are entering, previewing, unlocking, and paying."
              icon={Eye}
            >
              <div className="grid gap-3">
                {[
                  { label: "Auth modal opens", count: funnel.authModalOpens, ratio: 1, icon: Users },
                  { label: "Drop previews", count: funnel.previewOpens, ratio: funnel.authModalOpens > 0 ? funnel.previewOpens / funnel.authModalOpens : 0, icon: Eye },
                  { label: "Viewer opens", count: funnel.viewerOpens, ratio: funnel.previewOpens > 0 ? funnel.viewerOpens / funnel.previewOpens : 0, icon: PlayCircle },
                  { label: "Unlocks", count: funnel.unlocks, ratio: previewToUnlockRate, icon: Sparkles },
                  { label: "Checkout starts", count: funnel.checkoutStarts, ratio: funnel.unlocks > 0 ? funnel.checkoutStarts / funnel.unlocks : 0, icon: Wallet },
                  { label: "Purchases", count: funnel.purchases, ratio: checkoutToPurchaseRate, icon: ShoppingBag },
                ].map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/5 text-brand-purple">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{step.label}</p>
                            <p className="text-xs text-gray-500">{step.count.toLocaleString()} events</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-white">{step.label === "Auth modal opens" ? "Base" : formatPercent(step.ratio)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400" style={{ width: `${Math.max(6, Math.min(100, step.ratio * 100 || 0))}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <MetricCard label="Shares" value={funnel.shares.toLocaleString()} hint="Copied invite/share actions" icon={Share2} />
                <MetricCard label="Daily Check-ins" value={funnel.checkIns.toLocaleString()} hint="Reward claims in range" icon={CheckCircle2} />
              </div>
            </SectionCard>

            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <SectionCard title="Event Mix" subtitle="The strongest custom GA events for the selected window." icon={Sparkles}>
                <div className="h-64 w-full md:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topEvents} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="label" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={56} />
                      <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip content={<AnalyticsTooltip />} />
                      <Bar dataKey="count" name="Events" fill="#b28cff" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              <SectionCard title="Live Interaction Stream" subtitle="Most recent Deep Tracker events merged from the latest session buckets." icon={Clock3}>
                <div className="space-y-3">
                  {rawEvents.length > 0 ? (
                    rawEvents.slice(0, 8).map((event, index) => (
                      <div key={`${event.timestamp}-${index}`} className="rounded-[1.4rem] border border-white/10 bg-black/30 p-3.5">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-purple">
                            {event.type}
                          </span>
                          <span className="text-[11px] text-gray-500">{formatRelativeTime(event.timestamp, nowMs)}</span>
                        </div>
                        <p className="text-sm text-white">{describeEvent(event)}</p>
                        <p className="mt-2 text-xs text-gray-500">
                          {(event.username || "Guest").trim()} on <span className="text-gray-400">{event.path}</span>
                        </p>
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
          </>
        ) : null}

        {activeTab === "audience" ? (
          <>
            <SectionCard title="Audience Snapshot" subtitle="The selected time range emphasizes mobile traffic, retention quality, and visit depth." icon={Users}>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard label="Active Users" value={formatCompactNumber(totals.users)} hint={`${totals.newUsers.toLocaleString()} new users`} icon={Users} />
                <MetricCard label="Sessions" value={formatCompactNumber(totals.sessions)} hint={`${totals.views.toLocaleString()} views`} icon={Activity} />
                <MetricCard label="Avg Session" value={formatDuration(totals.avgSessionDuration)} hint="Average time per visit" icon={Clock3} />
                <MetricCard label="Engagement" value={formatPercent(totals.engagementRate)} hint="GA engagement rate" icon={Sparkles} />
              </div>

              <div className="mt-5 h-64 w-full md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historySeries} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="historyUsersFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#b28cff" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#b28cff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} minTickGap={20} />
                    <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Area type="monotone" dataKey="users" name="Users" stroke="#b28cff" strokeWidth={2.5} fill="url(#historyUsersFill)" />
                    <Area type="monotone" dataKey="views" name="Views" stroke="#22d3ee" strokeWidth={2} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <SectionCard title="Device Mix" subtitle="Mobile is the admin priority, so device share and engagement stay visible as first-class metrics." icon={Smartphone}>
                <div className="space-y-3">
                  {devices.length > 0 ? (
                    devices.map((item) => {
                      const Icon = getDeviceIcon(item.device);
                      const share = totalDeviceUsers > 0 ? item.users / totalDeviceUsers : 0;
                      return (
                        <div key={item.device} className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-brand-purple">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold capitalize text-white">{item.device}</p>
                                <p className="text-xs text-gray-500">{item.sessions.toLocaleString()} sessions</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-black text-white">{formatPercent(share)}</p>
                              <p className="text-xs text-gray-500">{formatPercent(item.engagementRate)} engaged</p>
                            </div>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400" style={{ width: `${Math.max(8, share * 100)}%` }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      Device data will appear after GA has enough sessions for this range.
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Top Paths" subtitle="What mobile admins should watch first: where people are actually spending time." icon={FileText}>
                <div className="space-y-3">
                  {pages.length > 0 ? (
                    pages.slice(0, 8).map((page) => (
                      <div key={page.path} className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{page.path || "/"}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {page.views.toLocaleString()} views · {formatDuration(page.avgTime)} avg time
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

            <SectionCard title="Regions" subtitle="Geographic demand surfaced in a mobile-friendly list instead of a cramped desktop-style table." icon={MapPin}>
              <div className="space-y-3">
                {geo.length > 0 ? (
                  geo.slice(0, 10).map((item) => (
                    <div key={`${item.country}-${item.city}`} className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{item.city}</p>
                          <p className="text-xs text-gray-500">{item.country}</p>
                        </div>
                        <p className="text-lg font-black text-white">{item.users.toLocaleString()}</p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-brand-purple" style={{ width: `${Math.max(8, (item.users / Math.max(1, geo[0]?.users || 1)) * 100)}%` }} />
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
            <SectionCard title="Commerce Snapshot" subtitle="A tighter mobile revenue view with unlock and purchase efficiency kept above the fold." icon={DollarSign}>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard label="Revenue" value={formatMoney(commerce.revenueUsd)} hint="Completed currency purchases" icon={DollarSign} />
                <MetricCard label="GD Spent" value={formatCompactNumber(commerce.gdSpent)} hint="Spent on unlocks" icon={Sparkles} />
                <MetricCard label="Unlock Rate" value={formatPercent(previewToUnlockRate)} hint={`${funnel.unlocks.toLocaleString()} of ${funnel.previewOpens.toLocaleString()} previews`} icon={Eye} />
                <MetricCard label="Checkout Rate" value={formatPercent(checkoutToPurchaseRate)} hint={`${funnel.purchases.toLocaleString()} purchases`} icon={ShoppingBag} />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Wallet Opens</p>
                  <p className="mt-2 text-3xl font-black text-white">{funnel.walletOpens.toLocaleString()}</p>
                </div>
                <div className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Checkout Starts</p>
                  <p className="mt-2 text-3xl font-black text-white">{funnel.checkoutStarts.toLocaleString()}</p>
                </div>
                <div className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Purchase Completions</p>
                  <p className="mt-2 text-3xl font-black text-white">{funnel.purchases.toLocaleString()}</p>
                </div>
              </div>
            </SectionCard>

            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <SectionCard title="Top Drop Conversion" subtitle="Unlocked drops with enough demand to matter, surfaced as a compact mobile chart and list." icon={ShoppingBag}>
                <div className="h-64 w-full md:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topDrops.slice(0, 8)} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="dropId" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={56} />
                      <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        content={
                          <AnalyticsTooltip
                            valueFormatter={(value, name) =>
                              name === "Unlocks" || name === "Views" ? Number(value).toLocaleString() : String(value)
                            }
                          />
                        }
                      />
                      <Bar dataKey="views" name="Views" fill="#374151" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="unlocks" name="Unlocks" fill="#b28cff" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-5 space-y-3">
                  {topDrops.slice(0, 6).map((drop) => {
                    const rate = drop.views > 0 ? drop.unlocks / drop.views : 0;
                    return (
                      <div key={drop.dropId} className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{drop.dropId}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {drop.views.toLocaleString()} views · {drop.unlocks.toLocaleString()} unlocks
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-bold text-brand-purple">{formatPercent(rate)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400" style={{ width: `${Math.max(6, rate * 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard title="Recent Commerce Feed" subtitle="Recent transactions condensed into mobile cards so admins can skim activity without horizontal scrolling." icon={Wallet}>
                <div className="space-y-3">
                  {(commerce.feed ?? []).length > 0 ? (
                    (commerce.feed ?? []).slice(0, 10).map((item) => (
                      <div key={item.id} className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                            {item.userPhoto ? (
                              <Image src={item.userPhoto} alt={item.username || "User"} fill className="object-cover" />
                            ) : (
                              <Wallet className="h-4 w-4 text-brand-purple" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">{item.description || item.type || "Transaction"}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {item.username ? `@${item.username}` : "Unknown user"} · {item.timestamp ? formatRelativeTime(item.timestamp, nowMs) : "Just now"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-brand-purple">
                              {typeof item.cost === "number" && item.cost > 0
                                ? formatMoney(item.cost / 100)
                                : typeof item.amount === "number"
                                  ? item.amount.toLocaleString()
                                  : "0"}
                            </p>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">{item.status || "logged"}</p>
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
          </>
        ) : null}

        {activeTab === "security" ? (
          <>
            <SectionCard title="Security Posture" subtitle="Flagged accounts are grouped into mobile cards with the newest risk surfaced first." icon={ShieldAlert}>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard label="Flagged Users" value={security.length.toLocaleString()} hint="Users with recorded rip attempts" icon={ShieldAlert} />
                <MetricCard label="Fresh Alerts" value={securityAlerts.toLocaleString()} hint="Last 24 hours" icon={AlertTriangle} valueClassName={securityAlerts > 0 ? "text-2xl font-black tracking-tight text-red-400" : undefined} />
                <MetricCard label="Experience Views" value={funnel.experienceViews.toLocaleString()} hint="Signals around discovery" icon={Sparkles} />
                <MetricCard label="Viewer Switches" value={funnel.assetSwitches.toLocaleString()} hint="Asset interactions in viewer" icon={PlayCircle} />
              </div>
            </SectionCard>

            <SectionCard title="Flagged Accounts" subtitle="A phone-sized audit list with user, vector, timing, and target drop at a glance." icon={AlertTriangle}>
              <div className="space-y-3">
                {security.length > 0 ? (
                  security.map((item) => {
                    const recent = isRecentViolation(item.lastViolation, nowMs);
                    return (
                      <div
                        key={item.uid}
                        className={cn(
                          "rounded-[1.6rem] border p-4",
                          recent ? "border-red-500/30 bg-red-500/5" : "border-white/10 bg-black/30",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                            {item.photoURL ? (
                              <Image src={item.photoURL} alt={item.username} fill className="object-cover" />
                            ) : (
                              <span className="text-base font-bold text-gray-400">{item.username.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-white">{item.username}</p>
                              {recent ? <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">New</span> : null}
                            </div>
                            <p className="mt-1 break-all text-[11px] text-gray-500">{item.uid}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-red-400">{item.ripAttempts}</p>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">violations</p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Last seen</p>
                            <p className="mt-2 text-sm text-white">{item.lastViolation ? new Date(item.lastViolation).toLocaleString() : "Unknown"}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Vector</p>
                            <p className="mt-2 text-sm text-white">{item.lastViolationReason}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Drop</p>
                            <p className="mt-2 text-sm text-white">{item.lastViolationDropId || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-6 text-center">
                    <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-green-500/60" />
                    <p className="text-sm font-semibold text-white">Clear skies</p>
                    <p className="mt-1 text-sm text-gray-500">No flagged users were returned for this period.</p>
                  </div>
                )}
              </div>
            </SectionCard>
          </>
        ) : null}
      </main>
    </div>
  );
}
