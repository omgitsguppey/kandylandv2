"use client";

import { useMemo, useState } from "react";
import {
    AlertTriangle,
    ArrowRightLeft,
    BadgeInfo,
    BellRing,
    Bug,
    Candy,
    CheckCircle2,
    Database,
    Layers3,
    Loader2,
    Radar,
    Receipt,
    RefreshCw,
    ShieldCheck,
    Terminal,
    Wrench,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useAuthSWR } from "@/hooks/useAuthSWR";
import { Button } from "@/components/ui/Button";
import { authFetch } from "@/lib/authFetch";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";

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
}

interface CoverageItem {
    taskId: string;
    title: string;
    eventName: string;
    eventLabel: string;
    trackingSource: "canonical" | "telemetry" | "unsupported";
    oneTime: boolean;
    hasUniqueKey: boolean;
    reward: number;
    maxProgress: number;
}

interface AssignmentIssue {
    uid: string;
    username: string;
    issueCount: number;
    issues: string[];
    taskIds: string[];
}

interface TaskParityItem {
    taskId: string;
    title: string;
    completedCount: number;
    rewardedCount: number;
    rewardTotal: number;
    receiptCount: number;
}

interface ReceiptItem {
    id: string;
    eventName: string;
    receiptKey: string;
    uid: string;
    timestamp: number;
    source: string;
}

interface EventStatItem {
    eventName: string;
    label: string;
    totalCount: number;
    lastSeenAt: number;
    mappedTaskCount: number;
    mappedTaskTitles: string[];
    trackingSource: "canonical" | "telemetry" | "unsupported";
}

interface TaskEventItem {
    id: string;
    type: string;
    taskId: string;
    title: string;
    triggerEvent: string;
    userId: string;
    username: string;
    reward: number;
    progress: number;
    maxProgress: number;
    timestamp: number;
    durationMs: number;
    reason: string;
}

interface DailyTaskSeriesItem {
    dayKey: string;
    eventCount: number;
    rewardTotal: number;
    completed: number;
    failed: number;
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
    taskRollups: Array<{
        taskId: string;
        title: string;
        eventCount: number;
        rewardTotal: number;
        completed: number;
        started: number;
        failed: number;
        reminders: number;
        lastEventAt: number;
    }>;
    dailyTaskSeries: DailyTaskSeriesItem[];
}

function formatTimestamp(value: number) {
    if (!value) {
        return "Never";
    }

    return new Date(value).toLocaleString();
}

function formatTrackingSource(value: CoverageItem["trackingSource"] | EventStatItem["trackingSource"]) {
    if (value === "canonical") return "Canonical";
    if (value === "telemetry") return "Telemetry";
    return "Unsupported";
}

function TrackingBadge({ source }: { source: CoverageItem["trackingSource"] | EventStatItem["trackingSource"] }) {
    const className = source === "canonical"
        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
        : source === "telemetry"
            ? "border-brand-purple/20 bg-brand-purple/10 text-brand-purple"
            : "border-red-400/20 bg-red-500/10 text-red-300";

    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${className}`}>
            {formatTrackingSource(source)}
        </span>
    );
}

function SectionCard({
    title,
    subtitle,
    icon: Icon,
    children,
}: {
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-[1.75rem] border border-white/8 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <div className="mb-4 flex items-start gap-3">
                <div className="rounded-2xl border border-brand-purple/20 bg-brand-purple/10 p-2.5">
                    <Icon className="h-5 w-5 text-brand-purple" />
                </div>
                <div>
                    <h2 className="text-lg font-black tracking-tight text-white">{title}</h2>
                    <p className="text-sm text-gray-400">{subtitle}</p>
                </div>
            </div>
            {children}
        </section>
    );
}

function MetricTile({
    label,
    value,
    hint,
}: {
    label: string;
    value: string;
    hint: string;
}) {
    return (
        <div className="rounded-2xl border border-white/8 bg-black/25 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">{label}</div>
            <div className="mt-2 text-2xl font-black tracking-tight text-white">{value}</div>
            <div className="mt-1 text-xs text-gray-400">{hint}</div>
        </div>
    );
}

export default function DebugConsole() {
    const { user, userProfile } = useAuth();
    const [processing, setProcessing] = useState(false);
    const [simAmount, setSimAmount] = useState("500");
    const { data, mutate, isLoading } = useAuthSWR<DebugResponse>("/api/admin/debug", {
        refreshInterval: 30_000,
        revalidateOnFocus: true,
    });

    const stats = data?.stats;
    const highRiskParityItems = useMemo(
        () => (data?.taskParity ?? []).filter((item) => item.completedCount !== item.rewardedCount || item.completedCount !== item.receiptCount).slice(0, 8),
        [data?.taskParity],
    );

    const handleSimulateBalance = async () => {
        if (!user) return;
        setProcessing(true);
        try {
            const amount = parseInt(simAmount, 10);
            const response = await authFetch("/api/admin/balance", {
                method: "POST",
                body: JSON.stringify({
                    userId: user.uid,
                    amount,
                    reason: `Debug Console Adjustment: +${amount}`,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            toast.success("Debug balance adjustment applied.");
            void mutate();
        } catch (error: any) {
            toast.error(error.message || "Balance simulation failed");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            <AdminPageHeader
                eyebrow="Admin Debug"
                title="Telemetry & Task Console"
                subtitle="Audit task coverage, reward parity, receipts, assignment integrity, and telemetry depth from one console."
                actions={(
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-gray-300">
                        <Terminal className="h-4 w-4 text-brand-purple" />
                        First-party parity tools
                    </div>
                )}
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <MetricTile label="Coverage" value={`${stats?.canonicalTasks ?? 0}/${stats?.builtInTasks ?? 0}`} hint="Built-in tasks with canonical backend validation" />
                <MetricTile label="Telemetry Only" value={(stats?.telemetryOnlyTasks ?? 0).toLocaleString()} hint="Tasks still relying on client telemetry" />
                <MetricTile label="Assignment Issues" value={(stats?.usersWithTaskIssues ?? 0).toLocaleString()} hint="Users with invalid task state right now" />
                <MetricTile label="Receipt Delta" value={(stats?.rewardEventDeltaLast7d ?? 0).toLocaleString()} hint="Completed events minus reward transactions in last 7 days" />
                <MetricTile label="Orphaned Events" value={(stats?.orphanedTelemetryEvents ?? 0).toLocaleString()} hint="Tracked telemetry events not mapped to any task" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <SectionCard title="1. Task Coverage Matrix" subtitle="Every built-in task, the event behind it, and whether that validation is canonical, telemetry-backed, or unsupported." icon={Layers3}>
                    <div className="space-y-3">
                        {(data?.coverage ?? []).map((task) => (
                            <div key={task.taskId} className="rounded-2xl border border-white/8 bg-black/25 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-black text-white">{task.title}</div>
                                        <div className="mt-1 text-xs text-gray-400">{task.eventLabel}</div>
                                    </div>
                                    <TrackingBadge source={task.trackingSource} />
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-400">
                                    <span className="rounded-full border border-white/10 px-2 py-1">Reward {task.reward}</span>
                                    <span className="rounded-full border border-white/10 px-2 py-1">Progress {task.maxProgress}</span>
                                    {task.oneTime && <span className="rounded-full border border-white/10 px-2 py-1">One time</span>}
                                    {task.hasUniqueKey && <span className="rounded-full border border-white/10 px-2 py-1">Unique key</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>

                <div className="space-y-6">
                    <SectionCard title="2. Integrity Snapshot" subtitle="Top-level health signals for task assignment, receipts, rewards, and event coverage." icon={ShieldCheck}>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <MetricTile label="Receipts 7d" value={(stats?.receiptsLast7d ?? 0).toLocaleString()} hint="Canonical task receipts written" />
                            <MetricTile label="Completed 7d" value={(stats?.completedEventsLast7d ?? 0).toLocaleString()} hint="Lifecycle completion events" />
                            <MetricTile label="Reward TX 7d" value={(stats?.rewardTransactionsLast7d ?? 0).toLocaleString()} hint="Daily reward transactions" />
                            <MetricTile label="Tracked Events" value={(stats?.trackedTelemetryEvents ?? 0).toLocaleString()} hint="Telemetry counters in analytics_event_stats" />
                        </div>
                    </SectionCard>

                    <SectionCard title="3. Quick Actions" subtitle="Run safe balance simulations and refresh the console without leaving the page." icon={Wrench}>
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={simAmount}
                                    onChange={(event) => setSimAmount(event.target.value)}
                                    className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                                />
                                <Button variant="brand" onClick={handleSimulateBalance} disabled={processing}>
                                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                                </Button>
                                <Button variant="glass" onClick={() => void mutate()}>
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="text-xs text-gray-400">
                                Signed in as <span className="font-semibold text-white">{userProfile?.username || user?.email || "Unknown"}</span>
                            </div>
                        </div>
                    </SectionCard>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <SectionCard title="4. Reward Parity" subtitle="Compare task completions, reward transactions, and canonical receipts for the last 7 days." icon={ArrowRightLeft}>
                    <div className="space-y-3">
                        {highRiskParityItems.length > 0 ? highRiskParityItems.map((item) => (
                            <div key={item.taskId} className="rounded-2xl border border-white/8 bg-black/25 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-black text-white">{item.title}</div>
                                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.completedCount === item.rewardedCount && item.completedCount === item.receiptCount ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>
                                        {item.completedCount === item.rewardedCount && item.completedCount === item.receiptCount ? "Aligned" : "Needs review"}
                                    </span>
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-300">
                                    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                                        <div className="text-gray-500">Completed</div>
                                        <div className="mt-1 text-lg font-black text-white">{item.completedCount}</div>
                                    </div>
                                    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                                        <div className="text-gray-500">Reward TX</div>
                                        <div className="mt-1 text-lg font-black text-white">{item.rewardedCount}</div>
                                    </div>
                                    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                                        <div className="text-gray-500">Receipts</div>
                                        <div className="mt-1 text-lg font-black text-white">{item.receiptCount}</div>
                                    </div>
                                </div>
                            </div>
                        )) : <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">Reward events, transactions, and receipts are aligned for the sampled 7-day window.</div>}
                    </div>
                </SectionCard>

                <SectionCard title="5. Assignment Integrity" subtitle="Users whose task state needs repair, including duplicate IDs, wrong counts, or stale refresh timers." icon={Bug}>
                    <div className="space-y-3">
                        {(data?.assignmentIssues ?? []).length > 0 ? (data?.assignmentIssues ?? []).map((item) => (
                            <div key={item.uid} className="rounded-2xl border border-white/8 bg-black/25 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-black text-white">@{item.username}</div>
                                    <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-300">{item.issueCount} issues</span>
                                </div>
                                <div className="mt-2 space-y-1 text-xs text-gray-300">
                                    {item.issues.map((issue) => <div key={issue}>- {issue}</div>)}
                                </div>
                            </div>
                        )) : <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">No invalid task assignments detected in current user states.</div>}
                    </div>
                </SectionCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <SectionCard title="6. Canonical Receipts" subtitle="Recent idempotency receipts proving canonical task events only count once." icon={Receipt}>
                    <div className="space-y-3">
                        {(data?.recentReceipts ?? []).slice(0, 12).map((receipt) => (
                            <div key={receipt.id} className="rounded-2xl border border-white/8 bg-black/25 p-4 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="font-black text-white">{receipt.eventName}</div>
                                    <div className="text-xs text-gray-400">{formatTimestamp(receipt.timestamp)}</div>
                                </div>
                                <div className="mt-2 text-xs text-gray-400">{receipt.receiptKey}</div>
                                <div className="mt-1 text-xs text-brand-purple">{receipt.uid}</div>
                            </div>
                        ))}
                    </div>
                </SectionCard>

                <SectionCard title="7. Telemetry Event Stats" subtitle="Top tracked events, how often they fire, and whether any task currently depends on them." icon={Radar}>
                    <div className="space-y-3">
                        {(data?.eventStats ?? []).slice(0, 12).map((entry) => (
                            <div key={entry.eventName} className="rounded-2xl border border-white/8 bg-black/25 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-black text-white">{entry.label}</div>
                                        <div className="text-xs text-gray-400">{entry.eventName}</div>
                                    </div>
                                    <TrackingBadge source={entry.trackingSource} />
                                </div>
                                <div className="mt-3 flex items-center justify-between text-xs text-gray-300">
                                    <span>{entry.totalCount.toLocaleString()} total</span>
                                    <span>{entry.mappedTaskCount} mapped tasks</span>
                                    <span>{formatTimestamp(entry.lastSeenAt)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <SectionCard title="8. Unsupported Task Definitions" subtitle="Any built-in task here needs instrumentation or it will never complete reliably." icon={AlertTriangle}>
                    <div className="space-y-3">
                        {(data?.unsupportedTasks ?? []).length > 0 ? (data?.unsupportedTasks ?? []).map((task) => (
                            <div key={task.taskId} className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
                                <div className="font-black">{task.title}</div>
                                <div className="mt-1 text-xs text-red-200">{task.eventName}</div>
                            </div>
                        )) : <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">All built-in tasks are mapped to a supported tracking source.</div>}
                    </div>
                </SectionCard>

                <SectionCard title="9. Telemetry-Only Tasks" subtitle="These tasks still depend on client telemetry rather than a backend-confirmed success state." icon={BellRing}>
                    <div className="space-y-3">
                        {(data?.telemetryOnlyTasks ?? []).map((task) => (
                            <div key={task.taskId} className="rounded-2xl border border-white/8 bg-black/25 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-black text-white">{task.title}</div>
                                    <span className="rounded-full bg-brand-purple/10 px-2.5 py-1 text-[11px] font-semibold text-brand-purple">Telemetry</span>
                                </div>
                                <div className="mt-1 text-xs text-gray-400">{task.eventName}</div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <SectionCard title="10. Orphaned Telemetry & Recent Lifecycle" subtitle="Events without task mappings plus the latest lifecycle stream for deeper parity debugging." icon={Database}>
                    <div className="grid gap-4 xl:grid-cols-2">
                        <div className="space-y-3">
                            {(data?.orphanedEventStats ?? []).slice(0, 8).map((entry) => (
                                <div key={entry.eventName} className="rounded-2xl border border-white/8 bg-black/25 p-4">
                                    <div className="text-sm font-black text-white">{entry.label}</div>
                                    <div className="mt-1 text-xs text-gray-400">{entry.eventName}</div>
                                    <div className="mt-2 text-xs text-brand-purple">{entry.totalCount.toLocaleString()} events</div>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-3">
                            {(data?.recentTaskEvents ?? []).slice(0, 8).map((event) => (
                                <div key={event.id} className="rounded-2xl border border-white/8 bg-black/25 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-black text-white">{event.title}</div>
                                        <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-gray-300">{event.type}</span>
                                    </div>
                                    <div className="mt-1 text-xs text-gray-400">{event.triggerEvent}</div>
                                    <div className="mt-2 text-xs text-brand-purple">@{event.username}</div>
                                    <div className="mt-1 text-xs text-gray-400">{formatTimestamp(event.timestamp)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </SectionCard>
            </div>

            {isLoading && !data && (
                <div className="flex items-center justify-center py-20 text-gray-400">
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Loading debug insights...
                </div>
            )}
        </div>
    );
}
