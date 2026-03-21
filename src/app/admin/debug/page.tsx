"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  BellRing,
  Bug,
  ChevronDown,
  ChevronUp,
  Database,
  Flag,
  Layers3,
  Loader2,
  Monitor,
  Radar,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Terminal,
  Wrench,
} from "lucide-react";

import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useCompactViewport } from "@/hooks/useCompactViewport";
import { useAuthSWR } from "@/hooks/useAuthSWR";
import type { AdminOpsHealth, AdminOpsHealthSeverity, AdminOpsHealthStatus } from "@/lib/admin-ops-health";
import { authFetch } from "@/lib/authFetch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type DebugTab = "overview" | "tasks" | "telemetry" | "reports" | "ops";
type TrackingSource = "canonical" | "telemetry" | "unsupported";

interface DebugStats {
  builtInTasks: number;
  canonicalTasks: number;
  telemetryOnlyTasks: number;
  unsupportedTasks: number;
  usersWithTaskIssues: number;
  receiptsLast7d: number;
  completedEventsLast7d: number;
  rewardTransactionsLast7d: number;
  rewardEventDeltaLast7d: number;
  trackedTelemetryEvents: number;
  orphanedTelemetryEvents: number;
  bugReportsLast7d: number;
}

interface CoverageItem { taskId: string; title: string; eventName: string; eventLabel: string; trackingSource: TrackingSource; reward: number; maxProgress: number; }
interface AssignmentIssue { uid: string; username: string; issueCount: number; issues: string[]; }
interface TaskParityItem { taskId: string; title: string; completedCount: number; rewardedCount: number; receiptCount: number; rewardTotal: number; }
interface ReceiptItem { id: string; eventName: string; receiptKey: string; uid: string; timestamp: number; }
interface EventStatItem { eventName: string; label: string; totalCount: number; lastSeenAt: number; mappedTaskCount: number; trackingSource: TrackingSource; }
interface TaskEventItem { id: string; type: string; title: string; triggerEvent: string; username: string; timestamp: number; }
interface DailyTaskSeriesItem { dayKey: string; eventCount: number; rewardTotal: number; completed: number; failed: number; }
interface TaskRollupItem { taskId: string; title: string; eventCount: number; rewardTotal: number; completed: number; failed: number; lastEventAt: number; }
interface BugReportItem {
  id: string;
  userId: string;
  email: string | null;
  summary: string;
  message: string;
  category: string;
  status: string;
  issueType: string;
  severity: string;
  contextId: string;
  currentPath: string;
  componentName: string;
  diagnosticsCount: number;
  breadcrumbsCount: number;
  rolloutCount: number;
  timestamp: number;
  autoContext: Record<string, unknown> | null;
  component: Record<string, unknown> | null;
}
interface RolloutDebugItem {
  id: string;
  label: string;
  description: string;
  kind: string;
  audience: string;
  enabled: boolean;
  rolloutPercent: number;
  defaultVariant: string;
  variants: Array<{ key: string; weight: number; label: string }>;
}

interface DebugResponse {
  success: boolean;
  stats: DebugStats;
  coverage: CoverageItem[];
  unsupportedTasks: CoverageItem[];
  telemetryOnlyTasks: CoverageItem[];
  assignmentIssues: AssignmentIssue[];
  taskParity: TaskParityItem[];
  recentTaskEvents: TaskEventItem[];
  recentReceipts: ReceiptItem[];
  receiptSummary: Array<{ eventName: string; count: number; lastSeenAt: number }>;
  eventStats: EventStatItem[];
  orphanedEventStats: EventStatItem[];
  taskRollups: TaskRollupItem[];
  dailyTaskSeries: DailyTaskSeriesItem[];
  bugReports: BugReportItem[];
  rollouts: RolloutDebugItem[];
  opsHealth: AdminOpsHealth;
}

const EMPTY_OPS_HEALTH: AdminOpsHealth = {
  score: 0,
  runtime: {
    gaPropertyConfigured: false,
    appCheckConfigured: false,
    appCheckRequired: false,
    recaptchaConfigured: false,
    vapidConfigured: false,
    databaseUrlConfigured: false,
    projectId: "",
    navigationSessionSigningReady: false,
    warnings: [],
  },
  diagnostics: { total: 0, errorCount: 0, warnCount: 0, infoCount: 0, lastDiagnosticAt: 0, channels: [], recent: [] },
  pipeline: { failureCount: 0, lastFailureAt: 0, lastRouteName: "", lastErrorMessage: "", routes: [] },
  materializers: [],
};

const TABS: Array<{ id: DebugTab; label: string; icon: typeof Activity }> = [
  { id: "overview", label: "Overview", icon: Monitor },
  { id: "tasks", label: "Tasks", icon: Layers3 },
  { id: "telemetry", label: "Telemetry", icon: Radar },
  { id: "reports", label: "Reports", icon: Bug },
  { id: "ops", label: "Ops", icon: Terminal },
];

function formatTimestamp(value: number) { return value ? new Date(value).toLocaleString() : "Never"; }
function formatRelativeTime(value: number) {
  if (!value) return "Never";
  const minutes = Math.floor(Math.max(0, Date.now() - value) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
function getOpsHealthClasses(status: AdminOpsHealthStatus) {
  if (status === "healthy") return "border-emerald-400/20 bg-emerald-500/10 text-emerald-300";
  if (status === "fail") return "border-red-400/20 bg-red-500/10 text-red-300";
  return "border-amber-400/20 bg-amber-500/10 text-amber-300";
}
function getSeverityClasses(severity: AdminOpsHealthSeverity) {
  if (severity === "error") return "border-red-400/20 bg-red-500/10 text-red-300";
  if (severity === "warn") return "border-amber-400/20 bg-amber-500/10 text-amber-300";
  return "border-cyan-400/20 bg-cyan-500/10 text-cyan-300";
}

function PreviewGrid({ items }: { items: Array<{ label: string; value: string; tone?: "accent" | "default" }> }) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="rounded-[1.1rem] border border-white/10 bg-black/20 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">{item.label}</p>
          <p className={cn("mt-1 text-sm font-semibold text-white", item.tone === "accent" ? "text-brand-purple" : undefined)}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function SectionCard({
  title, subtitle, icon: Icon, children, preview, defaultExpanded = false,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  preview?: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const expanded = manualExpanded ?? defaultExpanded;

  return (
    <section className="rounded-[1.75rem] border border-white/8 bg-white/[0.04] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-5">
      <button type="button" onClick={() => {
        setManualExpanded((current) => !(current ?? defaultExpanded));
      }} className="mb-4 flex w-full items-start justify-between gap-3 text-left" aria-expanded={expanded}>
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-2xl border border-brand-purple/20 bg-brand-purple/10 p-2.5"><Icon className="h-5 w-5 text-brand-purple" /></div>
            <h2 className="text-base font-black tracking-tight text-white md:text-lg">{title}</h2>
          </div>
          <p className="text-sm text-gray-400">{subtitle}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-300">
          {expanded ? "Hide" : "Open"} {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>
      {expanded ? children : preview ?? <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-black/20 px-4 py-4 text-sm text-gray-500">Tap to expand this debug module.</div>}
    </section>
  );
}

function MetricTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className="rounded-2xl border border-white/8 bg-black/25 p-4"><div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">{label}</div><div className="mt-2 text-2xl font-black tracking-tight text-white">{value}</div><div className="mt-1 text-xs text-gray-400">{hint}</div></div>;
}

function TrackingBadge({ source }: { source: TrackingSource }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold", source === "canonical" ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300" : source === "telemetry" ? "border-brand-purple/20 bg-brand-purple/10 text-brand-purple" : "border-red-400/20 bg-red-500/10 text-red-300")}>{source}</span>;
}

function FilterChips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (nextValue: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors",
            value === option.value
              ? "border-brand-purple/40 bg-brand-purple/15 text-white"
              : "border-white/10 bg-white/5 text-gray-400 hover:text-white",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function DebugConsole() {
  const isCompactViewport = useCompactViewport();
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<DebugTab>("overview");
  const [processing, setProcessing] = useState(false);
  const [simAmount, setSimAmount] = useState("500");
  const [coverageFilter, setCoverageFilter] = useState<"all" | TrackingSource>("all");
  const [telemetryFilter, setTelemetryFilter] = useState<"all" | TrackingSource>("all");
  const [diagnosticSeverityFilter, setDiagnosticSeverityFilter] = useState<"all" | AdminOpsHealthSeverity>("all");
  const [reportSeverityFilter, setReportSeverityFilter] = useState<"all" | string>("all");
  const [reportStatusFilter, setReportStatusFilter] = useState<"all" | string>("all");
  const { data, mutate, isLoading } = useAuthSWR<DebugResponse>("/api/admin/debug", { refreshInterval: 30_000, revalidateOnFocus: true });
  const stats = data?.stats;
  const opsHealth = data?.opsHealth ?? EMPTY_OPS_HEALTH;
  const highRiskParityItems = useMemo(() => (data?.taskParity ?? []).filter((item) => item.completedCount !== item.rewardedCount || item.completedCount !== item.receiptCount).slice(0, 8), [data?.taskParity]);
  const unhealthyMaterializers = opsHealth.materializers.filter((item) => item.status !== "healthy");
  const filteredCoverage = useMemo(
    () => (data?.coverage ?? []).filter((task) => coverageFilter === "all" || task.trackingSource === coverageFilter),
    [coverageFilter, data?.coverage],
  );
  const filteredEventStats = useMemo(
    () => (data?.eventStats ?? []).filter((event) => telemetryFilter === "all" || event.trackingSource === telemetryFilter),
    [data?.eventStats, telemetryFilter],
  );
  const filteredDiagnostics = useMemo(
    () => opsHealth.diagnostics.recent.filter((entry) => diagnosticSeverityFilter === "all" || entry.severity === diagnosticSeverityFilter),
    [diagnosticSeverityFilter, opsHealth.diagnostics.recent],
  );
  const filteredBugReports = useMemo(
    () => (data?.bugReports ?? []).filter((report) => (
      (reportSeverityFilter === "all" || report.severity === reportSeverityFilter)
      && (reportStatusFilter === "all" || report.status === reportStatusFilter)
    )),
    [data?.bugReports, reportSeverityFilter, reportStatusFilter],
  );

  async function handleSimulateBalance() {
    if (!user) return;
    setProcessing(true);
    try {
      const amount = parseInt(simAmount, 10);
      const response = await authFetch("/api/admin/balance", { method: "POST", body: JSON.stringify({ userId: user.uid, amount, reason: `Debug Console Adjustment: +${amount}` }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success("Debug balance adjustment applied.");
      void mutate();
    } catch (error: any) {
      toast.error(error.message || "Balance simulation failed");
    } finally {
      setProcessing(false);
    }
  }

  async function handleTestRecaptcha() {
    setProcessing(true);
    try {
      const { verifyManualRecaptchaToken } = await import("@/lib/manual-recaptcha");
      const result = await verifyManualRecaptchaToken("DEBUG_TEST");
      
      if (result.error) {
        toast.error(`reCAPTCHA API Error: ${result.error}`);
      } else {
        const isValid = result.tokenProperties?.valid;
        const score = result.riskAnalysis?.score ?? "N/A";
        
        if (isValid) {
          toast.success(`Success! Score: ${score} - Valid: ${isValid}`);
        } else {
          toast.error(`Invalid Token. Reason: ${result.tokenProperties?.invalidReason}`);
        }
        console.log("reCAPTCHA Manual Assessment Details:", result);
      }
    } catch (error: any) {
      toast.error(error.message || "Manual reCAPTCHA test failed");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Admin Debug" title="Telemetry & Task Console" subtitle="Shared task, telemetry, diagnostics, and function-pipeline health from one mobile-friendly debug surface." actions={<div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-gray-300"><Terminal className="h-4 w-4 text-brand-purple" /> Shared debug engine</div>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricTile label="Ops Health" value={`${opsHealth.score}%`} hint={`${unhealthyMaterializers.length} materializer warnings`} />
        <MetricTile label="Coverage" value={`${stats?.canonicalTasks ?? 0}/${stats?.builtInTasks ?? 0}`} hint="Built-in tasks with canonical validation" />
        <MetricTile label="Task Issues" value={(stats?.usersWithTaskIssues ?? 0).toLocaleString()} hint="Users with invalid task state" />
        <MetricTile label="Receipt Delta" value={(stats?.rewardEventDeltaLast7d ?? 0).toLocaleString()} hint="Completed events minus reward TX" />
        <MetricTile label="Bug Reports" value={(stats?.bugReportsLast7d ?? 0).toLocaleString()} hint="Bug reports received in the last 7 days" />
      </div>
      <label className="block md:hidden">
        <span className="sr-only">Debug view</span>
        <div className="relative">
          <select
            value={activeTab}
            onChange={(event) => setActiveTab(event.target.value as DebugTab)}
            className="min-h-11 w-full appearance-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 pr-11 text-sm font-semibold text-white outline-none transition-colors focus:border-brand-purple/40"
            aria-label="Debug view"
          >
            {TABS.map((tab) => (
              <option key={tab.id} value={tab.id} className="bg-zinc-950 text-white">
                {tab.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-purple" />
        </div>
      </label>
      <div className="hidden gap-2 overflow-x-auto pb-1 md:flex">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={cn("inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition", activeTab === tab.id ? "border-brand-purple/30 bg-brand-purple/15 text-white" : "border-white/10 bg-black/20 text-gray-400 hover:text-white")}><Icon className="h-4 w-4" />{tab.label}</button>;
        })}
      </div>
      {activeTab === "overview" ? (
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <SectionCard title="Debug Engine" subtitle="Runtime readiness, diagnostics, and function-fed materializers behind the admin tools." icon={Monitor} defaultExpanded={!isCompactViewport} preview={<PreviewGrid items={[{ label: "Health", value: `${opsHealth.score}%`, tone: "accent" }, { label: "Pipeline", value: opsHealth.pipeline.failureCount.toLocaleString() }, { label: "Errors", value: opsHealth.diagnostics.errorCount.toLocaleString() }, { label: "Warnings", value: unhealthyMaterializers.length.toLocaleString() }]} />}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricTile label="Diagnostics" value={opsHealth.diagnostics.total.toLocaleString()} hint={`${opsHealth.diagnostics.errorCount} errors - ${opsHealth.diagnostics.warnCount} warnings`} />
              <MetricTile label="Pipeline" value={opsHealth.pipeline.failureCount.toLocaleString()} hint={opsHealth.pipeline.lastFailureAt ? formatRelativeTime(opsHealth.pipeline.lastFailureAt) : "No recent failures"} />
              <MetricTile label="Materializers" value={opsHealth.materializers.length.toLocaleString()} hint={`${unhealthyMaterializers.length} need attention`} />
              <MetricTile label="Project" value={opsHealth.runtime.projectId || "Unknown"} hint="Firebase runtime target" />
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Runtime readiness</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { label: "GA property", ready: opsHealth.runtime.gaPropertyConfigured },
                    { label: "Navigation session", ready: opsHealth.runtime.navigationSessionSigningReady },
                    { label: "App Check", ready: opsHealth.runtime.appCheckConfigured || !opsHealth.runtime.appCheckRequired },
                    { label: "Realtime DB", ready: opsHealth.runtime.databaseUrlConfigured },
                    { label: "VAPID", ready: opsHealth.runtime.vapidConfigured },
                    { label: "reCAPTCHA", ready: opsHealth.runtime.recaptchaConfigured || !opsHealth.runtime.appCheckRequired },
                  ].map((item) => <div key={item.label} className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-white">{item.label}</p><span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]", item.ready ? getOpsHealthClasses("healthy") : getOpsHealthClasses("warn"))}>{item.ready ? "Ready" : "Check"}</span></div></div>)}
                </div>
                {opsHealth.runtime.warnings.length > 0 ? <div className="mt-4 space-y-2">{opsHealth.runtime.warnings.map((warning) => <div key={warning} className="rounded-[1rem] border border-amber-400/20 bg-amber-400/10 px-3 py-3 text-xs leading-6 text-amber-100">{warning}</div>)}</div> : <div className="mt-4 rounded-[1rem] border border-emerald-400/20 bg-emerald-400/10 px-3 py-3 text-xs leading-6 text-emerald-200">Runtime dependencies are aligned for admin telemetry and diagnostics.</div>}
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Recent diagnostics</p>
                <div className="space-y-2">
                  {opsHealth.diagnostics.recent.length > 0 ? opsHealth.diagnostics.recent.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]", getSeverityClasses(entry.severity))}>{entry.severity}</span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">{entry.channel}</span>
                          </div>
                          <p className="mt-2 text-sm font-semibold text-white">{entry.message}</p>
                          {entry.detailPreview ? <p className="mt-1 text-xs leading-6 text-gray-400">{entry.detailPreview}</p> : null}
                        </div>
                        <span className="text-[11px] text-gray-500">{formatRelativeTime(entry.timestamp)}</span>
                      </div>
                    </div>
                  )) : <div className="rounded-[1rem] border border-emerald-400/20 bg-emerald-400/10 px-3 py-3 text-xs leading-6 text-emerald-200">No recent diagnostics in the sampled window.</div>}
                </div>
              </div>
            </div>
          </SectionCard>
          <div className="space-y-6">
          <SectionCard title="Integrity Snapshot" subtitle="Top-level signals for task assignment, reward parity, receipts, and telemetry depth." icon={ShieldCheck} defaultExpanded={!isCompactViewport} preview={<PreviewGrid items={[{ label: "Receipts", value: (stats?.receiptsLast7d ?? 0).toLocaleString(), tone: "accent" }, { label: "Completed", value: (stats?.completedEventsLast7d ?? 0).toLocaleString() }, { label: "Reward TX", value: (stats?.rewardTransactionsLast7d ?? 0).toLocaleString() }, { label: "Tracked", value: (stats?.trackedTelemetryEvents ?? 0).toLocaleString() }]} />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricTile label="Receipts 7d" value={(stats?.receiptsLast7d ?? 0).toLocaleString()} hint="Canonical task receipts written" />
                <MetricTile label="Completed 7d" value={(stats?.completedEventsLast7d ?? 0).toLocaleString()} hint="Lifecycle completion events" />
                <MetricTile label="Reward TX 7d" value={(stats?.rewardTransactionsLast7d ?? 0).toLocaleString()} hint="Daily reward transactions" />
                <MetricTile label="Tracked Events" value={(stats?.trackedTelemetryEvents ?? 0).toLocaleString()} hint="Telemetry counters in analytics_event_stats" />
              </div>
            </SectionCard>
          <SectionCard title="Quick Actions" subtitle="Safe balance simulation and refresh controls without leaving the panel." icon={Wrench} defaultExpanded={!isCompactViewport} preview={<PreviewGrid items={[{ label: "Signed in", value: userProfile?.username || user?.email || "Unknown", tone: "accent" }, { label: "Adjustment", value: simAmount }]} />}>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input type="number" value={simAmount} onChange={(event) => setSimAmount(event.target.value)} className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" />
                  <Button variant="brand" onClick={handleSimulateBalance} disabled={processing}>{processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}</Button>
                  <Button variant="glass" onClick={handleTestRecaptcha} disabled={processing}>Test reCAPTCHA</Button>
                  <Button variant="glass" onClick={() => void mutate()}><RefreshCw className="h-4 w-4" /></Button>
                </div>
                <div className="text-xs text-gray-400">Signed in as <span className="font-semibold text-white">{userProfile?.username || user?.email || "Unknown"}</span></div>
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}
      {activeTab === "tasks" ? (
        <div className="space-y-6">
          <SectionCard title="Task Coverage Matrix" subtitle="Every built-in task and whether it is validated canonically, by telemetry, or unsupported." icon={Layers3} defaultExpanded={!isCompactViewport} preview={<PreviewGrid items={[{ label: "Canonical", value: (stats?.canonicalTasks ?? 0).toLocaleString(), tone: "accent" }, { label: "Telemetry", value: (stats?.telemetryOnlyTasks ?? 0).toLocaleString() }, { label: "Unsupported", value: (stats?.unsupportedTasks ?? 0).toLocaleString() }, { label: "Issues", value: (stats?.usersWithTaskIssues ?? 0).toLocaleString() }]} />}>
            <div className="mb-4">
              <FilterChips
                value={coverageFilter}
                onChange={setCoverageFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "canonical", label: "Canonical" },
                  { value: "telemetry", label: "Telemetry" },
                  { value: "unsupported", label: "Unsupported" },
                ]}
              />
            </div>
            <div className="space-y-3">{filteredCoverage.map((task) => <div key={task.taskId} className="rounded-2xl border border-white/8 bg-black/25 p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-black text-white">{task.title}</div><div className="mt-1 text-xs text-gray-400">{task.eventLabel}</div></div><TrackingBadge source={task.trackingSource} /></div><div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-400"><span className="rounded-full border border-white/10 px-2 py-1">Reward {task.reward}</span><span className="rounded-full border border-white/10 px-2 py-1">Progress {task.maxProgress}</span></div></div>)}</div>
          </SectionCard>
          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="Reward Parity" subtitle="Completed task events versus reward transactions and receipts." icon={ArrowRightLeft} preview={<PreviewGrid items={highRiskParityItems.slice(0, 4).map((item) => ({ label: item.title, value: `${item.completedCount}/${item.rewardedCount}/${item.receiptCount}`, tone: "accent" }))} />}>
              <div className="space-y-3">{highRiskParityItems.length > 0 ? highRiskParityItems.map((item) => <div key={item.taskId} className="rounded-2xl border border-white/8 bg-black/25 p-4"><div className="flex items-center justify-between gap-3"><div className="text-sm font-black text-white">{item.title}</div><span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", item.completedCount === item.rewardedCount && item.completedCount === item.receiptCount ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300")}>{item.completedCount === item.rewardedCount && item.completedCount === item.receiptCount ? "Aligned" : "Needs review"}</span></div><div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-300"><div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="text-gray-500">Completed</div><div className="mt-1 text-lg font-black text-white">{item.completedCount}</div></div><div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="text-gray-500">Reward TX</div><div className="mt-1 text-lg font-black text-white">{item.rewardedCount}</div></div><div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="text-gray-500">Receipts</div><div className="mt-1 text-lg font-black text-white">{item.receiptCount}</div></div></div></div>) : <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">Reward events, transactions, and receipts are aligned for the sampled 7-day window.</div>}</div>
            </SectionCard>
            <SectionCard title="Assignment Integrity" subtitle="Users whose task state needs repair or manual review." icon={Wrench} preview={<PreviewGrid items={(data?.assignmentIssues ?? []).slice(0, 4).map((item) => ({ label: `@${item.username}`, value: `${item.issueCount} issues`, tone: "accent" }))} />}>
              <div className="space-y-3">{(data?.assignmentIssues ?? []).length > 0 ? (data?.assignmentIssues ?? []).map((item) => <div key={item.uid} className="rounded-2xl border border-white/8 bg-black/25 p-4"><div className="flex items-center justify-between gap-3"><div className="text-sm font-black text-white">@{item.username}</div><span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-300">{item.issueCount} issues</span></div><div className="mt-2 space-y-1 text-xs text-gray-300">{item.issues.map((issue) => <div key={issue}>- {issue}</div>)}</div></div>) : <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">No invalid task assignments detected in current user states.</div>}</div>
            </SectionCard>
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="Task Rollups" subtitle="Function-fed rollups proving lifecycle materialization is landing." icon={ShieldCheck} preview={<PreviewGrid items={(data?.taskRollups ?? []).slice(0, 4).map((item) => ({ label: item.title, value: `${item.completed} done - ${item.rewardTotal} GD`, tone: "accent" }))} />}>
              <div className="space-y-3">{(data?.taskRollups ?? []).slice(0, 8).map((item) => <div key={item.taskId} className="rounded-2xl border border-white/8 bg-black/25 p-4"><div className="flex items-center justify-between gap-3"><div className="text-sm font-black text-white">{item.title}</div><div className="text-[11px] text-gray-500">{formatRelativeTime(item.lastEventAt)}</div></div><div className="mt-3 grid grid-cols-4 gap-2 text-xs text-gray-300"><div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="text-gray-500">Events</div><div className="mt-1 text-base font-black text-white">{item.eventCount}</div></div><div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="text-gray-500">Done</div><div className="mt-1 text-base font-black text-white">{item.completed}</div></div><div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="text-gray-500">Failed</div><div className="mt-1 text-base font-black text-white">{item.failed}</div></div><div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="text-gray-500">Reward</div><div className="mt-1 text-base font-black text-white">{item.rewardTotal}</div></div></div></div>)}</div>
            </SectionCard>
            <SectionCard title="Daily Cadence" subtitle="Recent task-day buckets to spot reset or reward drift." icon={Activity} preview={<PreviewGrid items={(data?.dailyTaskSeries ?? []).slice(-4).reverse().map((item) => ({ label: item.dayKey, value: `${item.completed} done - ${item.rewardTotal} GD` }))} />}>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{(data?.dailyTaskSeries ?? []).slice(-6).reverse().map((item) => <div key={item.dayKey} className="rounded-2xl border border-white/8 bg-black/25 p-4"><div className="text-sm font-black text-white">{item.dayKey}</div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-300"><div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="text-gray-500">Events</div><div className="mt-1 text-base font-black text-white">{item.eventCount}</div></div><div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="text-gray-500">Reward</div><div className="mt-1 text-base font-black text-white">{item.rewardTotal}</div></div><div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="text-gray-500">Done</div><div className="mt-1 text-base font-black text-white">{item.completed}</div></div><div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="text-gray-500">Failed</div><div className="mt-1 text-base font-black text-white">{item.failed}</div></div></div></div>)}</div>
            </SectionCard>
          </div>
        </div>
      ) : null}
      {activeTab === "telemetry" ? (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="Canonical Receipts" subtitle="Recent idempotency receipts proving canonical task events only count once." icon={Receipt} defaultExpanded={!isCompactViewport} preview={<PreviewGrid items={(data?.receiptSummary ?? []).slice(0, 4).map((entry) => ({ label: entry.eventName, value: entry.count.toLocaleString(), tone: "accent" }))} />}>
              <div className="space-y-3">{(data?.recentReceipts ?? []).slice(0, 12).map((receipt) => <div key={receipt.id} className="rounded-2xl border border-white/8 bg-black/25 p-4 text-sm"><div className="flex items-center justify-between gap-3"><div className="font-black text-white">{receipt.eventName}</div><div className="text-xs text-gray-400">{formatTimestamp(receipt.timestamp)}</div></div><div className="mt-2 text-xs text-gray-400">{receipt.receiptKey}</div><div className="mt-1 text-xs text-brand-purple">{receipt.uid}</div></div>)}</div>
            </SectionCard>
            <SectionCard title="Telemetry Event Stats" subtitle="Tracked events, how often they fire, and whether any task depends on them." icon={Radar} preview={<PreviewGrid items={(data?.eventStats ?? []).slice(0, 4).map((entry) => ({ label: entry.label, value: entry.totalCount.toLocaleString(), tone: "accent" }))} />}>
              <div className="mb-4">
                <FilterChips
                  value={telemetryFilter}
                  onChange={setTelemetryFilter}
                  options={[
                    { value: "all", label: "All" },
                    { value: "canonical", label: "Canonical" },
                    { value: "telemetry", label: "Telemetry" },
                    { value: "unsupported", label: "Unsupported" },
                  ]}
                />
              </div>
              <div className="space-y-3">{filteredEventStats.slice(0, 12).map((entry) => <div key={entry.eventName} className="rounded-2xl border border-white/8 bg-black/25 p-4"><div className="flex items-center justify-between gap-3"><div><div className="text-sm font-black text-white">{entry.label}</div><div className="text-xs text-gray-400">{entry.eventName}</div></div><TrackingBadge source={entry.trackingSource} /></div><div className="mt-3 flex items-center justify-between text-xs text-gray-300"><span>{entry.totalCount.toLocaleString()} total</span><span>{entry.mappedTaskCount} mapped</span><span>{formatTimestamp(entry.lastSeenAt)}</span></div></div>)}</div>
            </SectionCard>
          </div>
          <SectionCard title="Orphaned Telemetry & Recent Lifecycle" subtitle="Events without task mappings plus the latest task lifecycle stream for parity debugging." icon={Database} preview={<PreviewGrid items={(data?.orphanedEventStats ?? []).slice(0, 4).map((entry) => ({ label: entry.label, value: `${entry.totalCount} events` }))} />}>
            <div className="grid gap-4 xl:grid-cols-2"><div className="space-y-3">{(data?.orphanedEventStats ?? []).slice(0, 8).map((entry) => <div key={entry.eventName} className="rounded-2xl border border-white/8 bg-black/25 p-4"><div className="text-sm font-black text-white">{entry.label}</div><div className="mt-1 text-xs text-gray-400">{entry.eventName}</div><div className="mt-2 text-xs text-brand-purple">{entry.totalCount.toLocaleString()} events</div></div>)}</div><div className="space-y-3">{(data?.recentTaskEvents ?? []).slice(0, 8).map((event) => <div key={event.id} className="rounded-2xl border border-white/8 bg-black/25 p-4"><div className="flex items-center justify-between gap-3"><div className="text-sm font-black text-white">{event.title}</div><span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-gray-300">{event.type}</span></div><div className="mt-1 text-xs text-gray-400">{event.triggerEvent}</div><div className="mt-2 text-xs text-brand-purple">@{event.username}</div><div className="mt-1 text-xs text-gray-400">{formatTimestamp(event.timestamp)}</div></div>)}</div></div>
          </SectionCard>
        </div>
      ) : null}
      {activeTab === "reports" ? (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionCard title="Bug Report Intake" subtitle="Mobile-first bug reports with attached diagnostics, errors, rollout assignments, and component metadata." icon={Bug} defaultExpanded={!isCompactViewport} preview={<PreviewGrid items={(filteredBugReports.slice(0, 4)).map((report) => ({ label: report.issueType, value: report.currentPath || report.componentName || "Unknown", tone: "accent" }))} />}>
              <div className="mb-4 space-y-3">
                <FilterChips
                  value={reportSeverityFilter}
                  onChange={setReportSeverityFilter}
                  options={[
                    { value: "all", label: "All severities" },
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                  ]}
                />
                <FilterChips
                  value={reportStatusFilter}
                  onChange={setReportStatusFilter}
                  options={[
                    { value: "all", label: "All statuses" },
                    { value: "new", label: "New" },
                    { value: "triaged", label: "Triaged" },
                    { value: "closed", label: "Closed" },
                  ]}
                />
              </div>
              <div className="space-y-3">
                {filteredBugReports.length > 0 ? filteredBugReports.slice(0, 12).map((report) => (
                  <div key={report.id} className="rounded-2xl border border-white/8 bg-black/25 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">{report.issueType}</span>
                          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]", report.severity === "high" ? "border-red-400/20 bg-red-500/10 text-red-300" : report.severity === "medium" ? "border-amber-400/20 bg-amber-500/10 text-amber-300" : "border-cyan-400/20 bg-cyan-500/10 text-cyan-300")}>{report.severity}</span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">{report.status}</span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-white">{report.summary}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-400">
                          <span className="rounded-full border border-white/10 px-2 py-1">{report.currentPath || "Unknown route"}</span>
                          <span className="rounded-full border border-white/10 px-2 py-1">{report.componentName || "Unknown component"}</span>
                          <span className="rounded-full border border-white/10 px-2 py-1">{report.diagnosticsCount} diagnostics</span>
                          <span className="rounded-full border border-white/10 px-2 py-1">{report.breadcrumbsCount} actions</span>
                        </div>
                        {report.message && report.message !== report.summary ? <p className="mt-3 text-xs leading-6 text-gray-400">{report.message}</p> : null}
                      </div>
                      <span className="shrink-0 text-[11px] text-gray-500">{formatRelativeTime(report.timestamp)}</span>
                    </div>
                  </div>
                )) : <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">No bug reports match the current filters.</div>}
              </div>
            </SectionCard>
            <div className="space-y-6">
          <SectionCard title="Rollout Registry" subtitle="Deterministic experiments and phased features currently available to the client runtime." icon={Flag} defaultExpanded={!isCompactViewport} preview={<PreviewGrid items={(data?.rollouts ?? []).slice(0, 4).map((rollout) => ({ label: rollout.label, value: `${rollout.rolloutPercent}%`, tone: "accent" }))} />}>
                <div className="space-y-3">
                  {(data?.rollouts ?? []).map((rollout) => (
                    <div key={rollout.id} className="rounded-2xl border border-white/8 bg-black/25 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-white">{rollout.label}</div>
                          <div className="mt-1 text-xs leading-6 text-gray-400">{rollout.description}</div>
                        </div>
                        <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]", rollout.enabled ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/5 text-gray-400")}>{rollout.enabled ? "Live" : "Off"}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-400">
                        <span className="rounded-full border border-white/10 px-2 py-1">{rollout.kind}</span>
                        <span className="rounded-full border border-white/10 px-2 py-1">{rollout.audience}</span>
                        <span className="rounded-full border border-white/10 px-2 py-1">{rollout.rolloutPercent}% rollout</span>
                        <span className="rounded-full border border-white/10 px-2 py-1">Default {rollout.defaultVariant}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                        {rollout.variants.map((variant) => (
                          <span key={variant.key} className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-gray-300">
                            {variant.label}: {variant.weight}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
              <SectionCard title="Report Quality" subtitle="How much automatic context each recent bug report carried into the debug pipeline." icon={AlertTriangle} preview={<PreviewGrid items={filteredBugReports.slice(0, 4).map((report) => ({ label: report.componentName || "Unknown", value: `${report.diagnosticsCount}/${report.breadcrumbsCount}/${report.rolloutCount}` }))} />}>
                <div className="space-y-3">
                  {filteredBugReports.slice(0, 8).map((report) => (
                    <div key={`quality-${report.id}`} className="rounded-2xl border border-white/8 bg-black/25 p-4">
                      <div className="text-sm font-black text-white">{report.componentName || report.contextId || "Unknown surface"}</div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-300">
                        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="text-gray-500">Diagnostics</div><div className="mt-1 text-base font-black text-white">{report.diagnosticsCount}</div></div>
                        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="text-gray-500">Actions</div><div className="mt-1 text-base font-black text-white">{report.breadcrumbsCount}</div></div>
                        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="text-gray-500">Rollouts</div><div className="mt-1 text-base font-black text-white">{report.rolloutCount}</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      ) : null}
      {activeTab === "ops" ? (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionCard title="Pipeline & Materializers" subtitle="Function-fed rollups, route failures, and source freshness behind admin reporting." icon={Database} defaultExpanded={!isCompactViewport} preview={<PreviewGrid items={opsHealth.materializers.slice(0, 4).map((item) => ({ label: item.label, value: item.status, tone: item.status === "healthy" ? "accent" : "default" }))} />}>
            <div className="space-y-3">{opsHealth.materializers.map((item) => <div key={item.key} className="rounded-2xl border border-white/8 bg-black/25 p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-black text-white">{item.label}</div><div className="mt-1 text-xs leading-6 text-gray-400">{item.detail}</div></div><span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]", getOpsHealthClasses(item.status))}>{item.status}</span></div><div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-400"><span className="rounded-full border border-white/10 px-2 py-1">{item.engine}</span><span className="rounded-full border border-white/10 px-2 py-1">{item.count.toLocaleString()} records</span><span className="rounded-full border border-white/10 px-2 py-1">{item.lastSeenAt ? formatRelativeTime(item.lastSeenAt) : "No recent activity"}</span></div></div>)}</div>
          </SectionCard>
          <div className="space-y-6">
          <SectionCard title="Diagnostics Channels" subtitle="Grouped by severity and channel so failures stay visible." icon={ShieldCheck} defaultExpanded={!isCompactViewport} preview={<PreviewGrid items={opsHealth.diagnostics.channels.slice(0, 4).map((channel) => ({ label: channel.label, value: `${channel.errorCount}/${channel.warnCount}/${channel.infoCount}` }))} />}>
              <div className="space-y-3">{opsHealth.diagnostics.channels.length > 0 ? opsHealth.diagnostics.channels.map((channel) => <div key={channel.key} className="rounded-2xl border border-white/8 bg-black/25 p-4"><div className="flex items-center justify-between gap-3"><div className="text-sm font-black text-white">{channel.label}</div><div className="text-xs text-gray-400">{formatRelativeTime(channel.lastSeenAt)}</div></div><div className="mt-3 grid grid-cols-4 gap-2 text-xs text-gray-300"><div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="text-gray-500">Total</div><div className="mt-1 text-base font-black text-white">{channel.count}</div></div><div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="text-gray-500">Errors</div><div className="mt-1 text-base font-black text-white">{channel.errorCount}</div></div><div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="text-gray-500">Warn</div><div className="mt-1 text-base font-black text-white">{channel.warnCount}</div></div><div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="text-gray-500">Info</div><div className="mt-1 text-base font-black text-white">{channel.infoCount}</div></div></div></div>) : <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">No recent diagnostics by channel.</div>}</div>
            </SectionCard>
            <SectionCard title="Recent Diagnostics" subtitle="Latest server-side traces flowing into the debug engine." icon={BellRing} preview={<PreviewGrid items={opsHealth.diagnostics.recent.slice(0, 4).map((entry) => ({ label: entry.channel, value: entry.severity, tone: entry.severity === "info" ? "accent" : "default" }))} />}>
              <div className="mb-4">
                <FilterChips
                  value={diagnosticSeverityFilter}
                  onChange={setDiagnosticSeverityFilter}
                  options={[
                    { value: "all", label: "All severities" },
                    { value: "error", label: "Errors" },
                    { value: "warn", label: "Warnings" },
                    { value: "info", label: "Info" },
                  ]}
                />
              </div>
              <div className="space-y-3">{filteredDiagnostics.length > 0 ? filteredDiagnostics.map((entry) => <div key={entry.id} className="rounded-2xl border border-white/8 bg-black/25 p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]", getSeverityClasses(entry.severity))}>{entry.severity}</span><span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">{entry.channel}</span></div><p className="mt-2 text-sm font-semibold text-white">{entry.message}</p>{entry.detailPreview ? <p className="mt-1 text-xs leading-6 text-gray-400">{entry.detailPreview}</p> : null}</div><span className="text-[11px] text-gray-500">{formatTimestamp(entry.timestamp)}</span></div></div>) : <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">No recent diagnostics found.</div>}</div>
            </SectionCard>
          </div>
        </div>
      ) : null}
      {isLoading && !data ? <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 className="mr-3 h-5 w-5 animate-spin" />Loading debug insights...</div> : null}
    </div>
  );
}
