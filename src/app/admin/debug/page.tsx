"use client";

import { useMemo, useState } from "react";
import {
    Activity,
    Bug,
    ChevronDown,
    ChevronUp,
    Loader2,
    PlayCircle,
    Plus,
    Radio,
    RefreshCw,
    ShieldAlert,
    Terminal,
    Workflow,
} from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useAdminOverview } from "@/hooks/useAdminOverview";
import { useAuthSWR } from "@/hooks/useAuthSWR";
import { useCompactViewport } from "@/hooks/useCompactViewport";
import { authFetch } from "@/lib/authFetch";
import { cn } from "@/lib/utils";

type DebugTabId = "overview" | "tasks" | "telemetry" | "reports" | "ops";

const DEBUG_TABS: Array<{ id: DebugTabId; label: string; icon: typeof Activity }> = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "tasks", label: "Tasks", icon: Workflow },
    { id: "telemetry", label: "Telemetry", icon: Radio },
    { id: "reports", label: "Reports", icon: Bug },
    { id: "ops", label: "Ops", icon: ShieldAlert },
];

function formatTimestamp(timestamp?: number) {
    if (!timestamp) return "Not recorded";
    return new Date(timestamp).toLocaleString();
}

function formatRelative(timestamp?: number) {
    if (!timestamp) return "No recent activity";
    const deltaMs = Math.max(0, Date.now() - timestamp);
    const minutes = Math.floor(deltaMs / 60_000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function compactNumber(value?: number) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function Pill({ label, value, tone = "neutral" }: { label: string; value: string | number; tone?: "neutral" | "good" | "warn" | "bad" }) {
    const toneClassName = tone === "good"
        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
        : tone === "warn"
            ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
            : tone === "bad"
                ? "border-red-400/20 bg-red-500/10 text-red-100"
                : "border-white/10 bg-white/5 text-gray-200";

    return (
        <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", toneClassName)}>
            <span className="text-gray-400">{label}</span>
            <span className="font-semibold text-white">{value}</span>
        </div>
    );
}

function StatCard({ label, value, meta }: { label: string; value: string | number; meta?: string }) {
    return (
        <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">{label}</p>
            <div className="mt-2 text-2xl font-black text-white">{value}</div>
            {meta ? <p className="mt-1 text-xs text-gray-400">{meta}</p> : null}
        </div>
    );
}

function Section({
    title,
    subtitle,
    summary,
    defaultOpen,
    children,
}: {
    title: string;
    subtitle?: string;
    summary?: React.ReactNode;
    defaultOpen: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <section className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-black/25">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left md:px-5"
                aria-expanded={open}
            >
                <div className="min-w-0">
                    <h2 className="text-base font-bold text-white md:text-lg">{title}</h2>
                    {subtitle ? <p className="mt-1 text-sm text-gray-400">{subtitle}</p> : null}
                    {summary ? <div className="mt-3 flex flex-wrap gap-2">{summary}</div> : null}
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300">
                    {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
            </button>
            {open ? <div className="border-t border-white/10 px-4 py-4 md:px-5">{children}</div> : null}
        </section>
    );
}

function ScrollWrap({ children }: { children: React.ReactNode }) {
    return <div className="max-h-[24rem] overflow-auto rounded-[1rem] border border-white/10 bg-black/25">{children}</div>;
}

export default function DebugConsole() {
    const { user, userProfile } = useAuth();
    const isCompactViewport = useCompactViewport();
    const [processing, setProcessing] = useState(false);
    const [repairingId, setRepairingId] = useState<string | null>(null);
    const [simAmount, setSimAmount] = useState("500");
    const [activeTab, setActiveTab] = useState<DebugTabId>("overview");

    const { data, error, isLoading, mutate } = useAuthSWR<any>("/api/admin/debug", {
        refreshInterval: 5000,
        revalidateOnFocus: true,
    });
    const { data: overviewData, isLoading: overviewLoading, mutate: mutateOverview } = useAdminOverview();

    const recentTransactions = useMemo(() => (
        (overviewData?.recentTransactions || []).map((entry: any) => ({
            ...entry,
            timestampLabel: typeof entry.timestamp === "number" && entry.timestamp > 0
                ? new Date(entry.timestamp).toLocaleString()
                : "Pending",
        }))
    ), [overviewData?.recentTransactions]);

    const refreshAll = async () => {
        await Promise.all([mutate(), mutateOverview()]);
        toast.success("Debug console refreshed");
    };

    const handleSimulatePurchase = async () => {
        if (!user) return;
        setProcessing(true);
        try {
            const amount = Number.parseInt(simAmount, 10);
            const response = await authFetch("/api/admin/balance", {
                method: "POST",
                body: JSON.stringify({
                    userId: user.uid,
                    amount,
                    reason: `Debug Console Adjustment: +${amount}`,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Simulation failed");
            toast.success("Simulation successful");
            await mutateOverview();
        } catch (issue) {
            console.error(issue);
            toast.error(issue instanceof Error ? issue.message : "Simulation failed");
        } finally {
            setProcessing(false);
        }
    };

    const handleRepairProposal = async (proposalId: string, action: "apply" | "dismiss") => {
        setRepairingId(proposalId);
        try {
            const response = await authFetch("/api/admin/orchestration/repairs", {
                method: "POST",
                body: JSON.stringify({ proposalId, action }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Repair action failed");
            }

            toast.success(action === "apply" ? "Repair action queued" : "Proposal dismissed");
            await mutate();
        } catch (issue) {
            console.error(issue);
            toast.error(issue instanceof Error ? issue.message : "Repair action failed");
        } finally {
            setRepairingId(null);
        }
    };

    const renderTabControls = () => {
        if (isCompactViewport) {
            return (
                <div className="rounded-[1.2rem] border border-white/10 bg-black/25 p-3">
                    <label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">Debug lane</label>
                    <select
                        value={activeTab}
                        onChange={(event) => setActiveTab(event.target.value as DebugTabId)}
                        className="min-h-11 w-full rounded-[1rem] border border-white/10 bg-black/40 px-3 text-sm font-semibold text-white"
                    >
                        {DEBUG_TABS.map((tab) => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
                    </select>
                </div>
            );
        }

        return (
            <div className="flex flex-wrap gap-2">
                {DEBUG_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
                                active ? "border-brand-purple/40 bg-brand-purple/20 text-white" : "border-white/10 bg-white/5 text-gray-300"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="space-y-4 md:space-y-6">
            <PageViewEvent eventName="admin_debug_viewed" />
            <AdminPageHeader
                eyebrow="Admin Debug"
                title="Compact Debug Console"
                subtitle="Inspect task coverage, telemetry health, bug intake, and runtime ops in a tighter mobile-first flow without removing any debug surfaces."
                actions={
                    <>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-gray-300">
                            <Terminal className="h-4 w-4 text-brand-purple" />
                            Production Firebase tools
                        </div>
                        <Button variant="glass" onClick={refreshAll}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                    </>
                }
            />

            {renderTabControls()}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <StatCard label="Ops score" value={data?.opsHealth ? `${data.opsHealth.score}%` : "--"} meta={`${data?.opsHealth?.pipeline?.failureCount || 0} pipeline failures`} />
                <StatCard label="Built-in tasks" value={data?.stats?.builtInTasks ?? "--"} meta={`${data?.stats?.validatedTasks ?? 0} validated`} />
                <StatCard label="Telemetry events" value={data?.stats?.trackedTelemetryEvents ?? "--"} meta={`${data?.stats?.orphanedTelemetryEvents ?? 0} orphaned`} />
                <StatCard label="Receipts 7d" value={data?.stats?.receiptsLast7d ?? "--"} meta={`${data?.stats?.completedEventsLast7d ?? 0} completions`} />
                <StatCard label="Bug reports 7d" value={data?.stats?.bugReportsLast7d ?? "--"} meta={`${data?.bugReports?.length ?? 0} loaded`} />
                <StatCard label="Users with issues" value={data?.stats?.usersWithTaskIssues ?? "--"} meta="Task assignment integrity" />
                <StatCard label="Orchestration" value={data?.orchestration ? `${data.orchestration.summary.score}%` : "--"} meta={`${data?.stats?.orchestrationOpenFindings ?? 0} open findings`} />
            </div>

            {error ? <div className="rounded-[1.35rem] border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">Debug data could not be loaded right now.</div> : null}
            {(isLoading || overviewLoading) && !data ? <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-6 text-sm text-gray-300"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading debug surfaces...</div> : null}

            {activeTab === "overview" ? (
                <div className="space-y-4">
                    <Section
                        title="Behavior orchestration"
                        subtitle="The new async coordination layer watches canonical signals, resolves identity ownership, and translates mismatches into plain-English repair suggestions."
                        defaultOpen
                        summary={
                            <>
                                <Pill label="Health" value={`${data?.orchestration?.summary?.score ?? 0}%`} tone={(data?.orchestration?.summary?.score ?? 0) >= 90 ? "good" : (data?.orchestration?.summary?.score ?? 0) >= 70 ? "warn" : "bad"} />
                                <Pill label="Open findings" value={data?.orchestration?.summary?.openFindings ?? 0} tone={(data?.orchestration?.summary?.openFindings ?? 0) ? "warn" : "good"} />
                                <Pill label="Actionable repairs" value={data?.orchestration?.summary?.actionableProposals ?? 0} tone={(data?.orchestration?.summary?.actionableProposals ?? 0) ? "warn" : "good"} />
                                <Pill label="Recommendation-ready" value={data?.orchestration?.summary?.recommendationReady ?? 0} />
                            </>
                        }
                    >
                        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <StatCard label="Normalized events" value={data?.orchestration?.summary?.eventCount ?? 0} meta="Recent orchestration sample" />
                                    <StatCard label="Training-ready" value={data?.orchestration?.summary?.trainingEligible ?? 0} meta={`${data?.orchestration?.summary?.lowConfidenceEvents ?? 0} low confidence`} />
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Dependency readiness</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Pill label="Missing actor" value={data?.orchestration?.dependencyReadiness?.actorMissingCount ?? 0} tone={(data?.orchestration?.dependencyReadiness?.actorMissingCount ?? 0) ? "warn" : "good"} />
                                        <Pill label="Missing session" value={data?.orchestration?.dependencyReadiness?.sessionMissingCount ?? 0} tone={(data?.orchestration?.dependencyReadiness?.sessionMissingCount ?? 0) ? "warn" : "good"} />
                                        <Pill label="Missing route" value={data?.orchestration?.dependencyReadiness?.routeMissingCount ?? 0} tone={(data?.orchestration?.dependencyReadiness?.routeMissingCount ?? 0) ? "warn" : "good"} />
                                        <Pill label="Missing creator" value={data?.orchestration?.dependencyReadiness?.creatorContextMissingCount ?? 0} tone={(data?.orchestration?.dependencyReadiness?.creatorContextMissingCount ?? 0) ? "warn" : "good"} />
                                    </div>
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Domain coverage</p>
                                    <div className="mt-3 space-y-2">
                                        {(data?.orchestration?.domainSummary || []).slice(0, 6).map((entry: any) => (
                                            <div key={entry.key} className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-300">
                                                <span className="font-semibold text-white">{entry.key}</span>
                                                <div className="flex flex-wrap gap-2">
                                                    <Pill label="Events" value={entry.eventCount} />
                                                    <Pill label="Open" value={entry.openFindingCount} tone={entry.openFindingCount ? "warn" : "good"} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {(data?.orchestration?.findings || []).slice(0, 4).map((finding: any) => (
                                    <div key={finding.id} className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-white">{finding.title}</p>
                                                <p className="mt-1 text-xs text-gray-400">{finding.domain} | {finding.systemKey}</p>
                                            </div>
                                            <Pill label="Severity" value={finding.severity} tone={finding.severity === "error" ? "bad" : finding.severity === "warn" ? "warn" : "neutral"} />
                                        </div>
                                        <p className="mt-3 text-sm text-gray-200">{finding.humanSummary}</p>
                                        <p className="mt-2 text-xs text-gray-400">{finding.fixSummary}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Section>

                    <Section
                        title="Simulation tools"
                        subtitle="Keep quick admin-side checks available without turning them into the whole page."
                        defaultOpen
                        summary={<><Pill label="Self top-up" value={`${simAmount} drops`} /><Pill label="Webhook" value="Placeholder" tone="warn" /></>}
                    >
                        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Add Gum Drops (to self)</p>
                                <div className="mt-3 flex gap-2">
                                    <input
                                        type="number"
                                        className="min-h-11 flex-1 rounded-[1rem] border border-white/10 bg-black/40 px-3 text-white"
                                        value={simAmount}
                                        onChange={(event) => setSimAmount(event.target.value)}
                                    />
                                    <Button variant="brand" onClick={handleSimulatePurchase} disabled={processing}>
                                        {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Webhook test</p>
                                <Button variant="glass" className="mt-3 w-full" onClick={() => toast.info("Webhook simulation is still backend-gated and not implemented here yet.")}>
                                    <PlayCircle className="mr-2 h-4 w-4" />
                                    Test Payment Webhook
                                </Button>
                            </div>
                        </div>
                    </Section>

                    <Section
                        title="Session and runtime"
                        subtitle="Shows who is using the console plus the runtime switches most likely to affect debugging."
                        defaultOpen={!isCompactViewport}
                        summary={
                            <>
                                <Pill label="Role" value={userProfile?.role || "user"} tone="good" />
                                <Pill label="GA" value={data?.opsHealth?.runtime?.gaPropertyConfigured ? "Ready" : "Missing"} tone={data?.opsHealth?.runtime?.gaPropertyConfigured ? "good" : "warn"} />
                                <Pill label="App Check" value={data?.opsHealth?.runtime?.appCheckConfigured ? "Configured" : "Not configured"} tone={data?.opsHealth?.runtime?.appCheckConfigured ? "good" : "warn"} />
                            </>
                        }
                    >
                        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300">
                                <div className="flex justify-between gap-3 border-b border-white/10 py-2"><span className="text-gray-400">User ID</span><span className="truncate font-mono text-xs text-white">{user?.uid || "--"}</span></div>
                                <div className="flex justify-between gap-3 border-b border-white/10 py-2"><span className="text-gray-400">Email</span><span className="truncate text-white">{user?.email || "--"}</span></div>
                                <div className="flex justify-between gap-3 border-b border-white/10 py-2"><span className="text-gray-400">Project</span><span className="truncate text-white">{data?.opsHealth?.runtime?.projectId || "--"}</span></div>
                                <div className="flex justify-between gap-3 py-2"><span className="text-gray-400">Warnings</span><span className="text-white">{data?.opsHealth?.runtime?.warnings?.length || 0}</span></div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Pill label="reCAPTCHA" value={data?.opsHealth?.runtime?.recaptchaConfigured ? "Yes" : "No"} tone={data?.opsHealth?.runtime?.recaptchaConfigured ? "good" : "warn"} />
                                <Pill label="VAPID" value={data?.opsHealth?.runtime?.vapidConfigured ? "Yes" : "No"} tone={data?.opsHealth?.runtime?.vapidConfigured ? "good" : "warn"} />
                                <Pill label="Database URL" value={data?.opsHealth?.runtime?.databaseUrlConfigured ? "Ready" : "Missing"} tone={data?.opsHealth?.runtime?.databaseUrlConfigured ? "good" : "warn"} />
                                <Pill label="Navigation signing" value={data?.opsHealth?.runtime?.navigationSessionSigningReady ? "Ready" : "Missing"} tone={data?.opsHealth?.runtime?.navigationSessionSigningReady ? "good" : "warn"} />
                                {(data?.opsHealth?.runtime?.warnings || []).map((warning: string) => <Pill key={warning} label="Warning" value={warning} tone="warn" />)}
                            </div>
                        </div>
                    </Section>

                    <Section
                        title="Recent transactions"
                        subtitle="Keeps the legacy live transaction view, but inside a bounded inline panel instead of a full-page table."
                        defaultOpen={!isCompactViewport}
                        summary={<><Pill label="Loaded" value={recentTransactions.length} /><Pill label="Feed" value="Last 20 entries" /></>}
                    >
                        <ScrollWrap>
                            <table className="w-full text-left text-sm">
                                <thead className="sticky top-0 bg-black/80 text-[11px] uppercase tracking-[0.16em] text-gray-400">
                                    <tr><th className="px-3 py-3">Time</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">User</th><th className="px-3 py-3">Description</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {recentTransactions.map((entry: any) => (
                                        <tr key={entry.id}>
                                            <td className="px-3 py-3 text-gray-400">{entry.timestampLabel}</td>
                                            <td className="px-3 py-3 text-brand-purple">{entry.type}</td>
                                            <td className="px-3 py-3 text-white">{entry.amount}</td>
                                            <td className="px-3 py-3 text-gray-300">{entry.username ? `@${entry.username}` : entry.userId}</td>
                                            <td className="px-3 py-3 text-gray-400">{entry.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </ScrollWrap>
                    </Section>
                </div>
            ) : null}

            {activeTab === "tasks" ? (
                <div className="space-y-4">
                    <Section
                        title="Coverage matrix"
                        subtitle="Every built-in task, its trigger source, and whether it relies on canonical or telemetry-backed validation."
                        defaultOpen
                        summary={<><Pill label="Built-in" value={data?.stats?.builtInTasks ?? 0} /><Pill label="Canonical" value={data?.stats?.canonicalTasks ?? 0} tone="good" /><Pill label="Telemetry" value={data?.stats?.telemetryValidatedTasks ?? 0} tone="good" /><Pill label="Unsupported" value={data?.stats?.unsupportedTasks ?? 0} tone={data?.stats?.unsupportedTasks ? "warn" : "good"} /></>}
                    >
                        <ScrollWrap>
                            <div className="divide-y divide-white/10">
                                {(data?.coverage || []).map((task: any) => (
                                    <div key={task.taskId} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{task.title}</p>
                                                <p className="text-xs text-gray-400">{task.taskId} | {task.eventLabel}</p>
                                            </div>
                                            <Pill label="Source" value={task.trackingSource} tone={task.trackingSource === "unsupported" ? "bad" : "good"} />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Reward" value={task.reward} />
                                            <Pill label="Max" value={task.maxProgress} />
                                            {task.oneTime ? <Pill label="Mode" value="one-time" /> : null}
                                            {task.hasUniqueKey ? <Pill label="Keying" value="unique" /> : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollWrap>
                    </Section>

                    <Section
                        title="Integrity and parity"
                        subtitle="Combines user assignment issues with reward parity so the highest-signal task problems stay together."
                        defaultOpen={!isCompactViewport}
                        summary={<><Pill label="Affected users" value={data?.stats?.usersWithTaskIssues ?? 0} tone={data?.stats?.usersWithTaskIssues ? "warn" : "good"} /><Pill label="Reward delta 7d" value={data?.stats?.rewardEventDeltaLast7d ?? 0} tone={(data?.stats?.rewardEventDeltaLast7d ?? 0) === 0 ? "good" : "warn"} /><Pill label="Creator spend violations" value={data?.stats?.creatorSpendViolationsLast7d ?? 0} tone={(data?.stats?.creatorSpendViolationsLast7d ?? 0) === 0 ? "good" : "warn"} /></>}
                    >
                        <div className="mb-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex flex-wrap gap-2">
                                    <Pill label="Reward version" value={data?.taskRewardConfig?.rewardVersion ?? "--"} />
                                    <Pill label="Multiplier" value={`${data?.taskRewardConfig?.multiplierPercent ?? 0}%`} />
                                    <Pill label="Built-in avg" value={data?.taskRewardConfig?.builtInAverageReward ?? 0} />
                                    <Pill label="Legacy custom" value={data?.taskRewardConfig?.legacyRewardVersionCount ?? 0} tone={(data?.taskRewardConfig?.legacyRewardVersionCount ?? 0) === 0 ? "good" : "warn"} />
                                </div>
                                <p className="mt-3 text-xs leading-6 text-gray-400">
                                    Current task rewards are normalized under one active version so built-ins, legacy custom tasks, receipts, and admin task tools can stay in sync after economy tuning.
                                </p>
                            </div>
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex flex-wrap gap-2">
                                    <Pill label="Tracked creator spends" value={data?.creatorSpendParity?.trackedTransactions ?? 0} />
                                    <Pill label="Purchased spent" value={data?.creatorSpendParity?.totalPurchasedSpent ?? 0} />
                                    <Pill label="Reward spent" value={data?.creatorSpendParity?.totalRewardSpent ?? 0} tone={(data?.creatorSpendParity?.totalRewardSpent ?? 0) === 0 ? "good" : "warn"} />
                                    <Pill label="Amount mismatches" value={data?.creatorSpendParity?.amountMismatchCount ?? 0} tone={(data?.creatorSpendParity?.amountMismatchCount ?? 0) === 0 ? "good" : "warn"} />
                                </div>
                                <p className="mt-3 text-xs leading-6 text-gray-400">
                                    Creator chat, subscriptions, requests, and bookings are expected to consume purchased Gum Drops only. Any reward-spend or amount mismatch is surfaced here as a parity warning.
                                </p>
                            </div>
                        </div>
                        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {(data?.assignmentIssues || []).length ? (data?.assignmentIssues || []).map((issue: any) => (
                                        <div key={issue.uid} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{issue.username}</p>
                                                    <p className="text-xs text-gray-400">{issue.uid}</p>
                                                </div>
                                                <Pill label="Issues" value={issue.issueCount} tone="warn" />
                                            </div>
                                            <div className="flex flex-wrap gap-2">{(issue.taskIds || []).map((taskId: string) => <Pill key={taskId} label="Task" value={taskId} />)}</div>
                                            <div className="space-y-1 text-sm text-amber-100">{(issue.issues || []).map((entry: string) => <div key={entry}>- {entry}</div>)}</div>
                                        </div>
                                    )) : <div className="px-4 py-4 text-sm text-emerald-100">No assignment integrity issues were detected in the sampled users.</div>}
                                </div>
                            </ScrollWrap>
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {(data?.taskParity || []).map((entry: any) => (
                                        <div key={entry.taskId} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{entry.title}</p>
                                                    <p className="text-xs text-gray-400">{entry.taskId}</p>
                                                </div>
                                                <Pill label="Completed" value={entry.completedCount} />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Rewarded" value={entry.rewardedCount} tone={entry.completedCount !== entry.rewardedCount ? "warn" : "good"} />
                                                <Pill label="Receipts" value={entry.receiptCount} />
                                                <Pill label="Reward total" value={entry.rewardTotal} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollWrap>
                        </div>
                        {(data?.creatorSpendParity?.byType || []).length ? (
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                {(data?.creatorSpendParity?.byType || []).map((entry: any) => (
                                    <div key={entry.type} className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-white">{entry.label}</p>
                                                <p className="text-xs text-gray-400">{entry.type}</p>
                                            </div>
                                            <Pill label="Count" value={entry.count} />
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Pill label="Purchased" value={entry.purchasedSpent} />
                                            <Pill label="Reward" value={entry.rewardSpent} tone={entry.rewardSpent ? "warn" : "good"} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </Section>

                    <Section
                        title="Recent task flow and rollups"
                        subtitle="Recent event flow on one side, long-tail rollups and daily series on the other."
                        defaultOpen={!isCompactViewport}
                        summary={<><Pill label="Recent events" value={(data?.recentTaskEvents || []).length} /><Pill label="Rollups" value={(data?.taskRollups || []).length} /><Pill label="Daily points" value={(data?.dailyTaskSeries || []).length} /></>}
                    >
                        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {(data?.recentTaskEvents || []).map((event: any) => (
                                        <div key={event.id} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{event.title}</p>
                                                    <p className="text-xs text-gray-400">{event.triggerEvent}</p>
                                                </div>
                                                <Pill label={event.type} value={formatRelative(event.timestamp)} />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="User" value={event.username} />
                                                <Pill label="Reward" value={event.reward} />
                                                <Pill label="Progress" value={`${event.progress}/${event.maxProgress}`} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollWrap>
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {(data?.taskRollups || []).map((rollup: any) => (
                                        <div key={rollup.taskId} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{rollup.title}</p>
                                                    <p className="text-xs text-gray-400">Last event {formatRelative(rollup.lastEventAt)}</p>
                                                </div>
                                                <Pill label="Completed" value={rollup.completed} />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Started" value={rollup.started} />
                                                <Pill label="Failed" value={rollup.failed} tone={rollup.failed ? "warn" : "good"} />
                                                <Pill label="Reminders" value={rollup.reminders} />
                                                <Pill label="Reward total" value={rollup.rewardTotal} />
                                            </div>
                                        </div>
                                    ))}
                                    {(data?.dailyTaskSeries || []).map((day: any) => (
                                        <div key={day.dayKey} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm text-gray-300">
                                            <span className="font-semibold text-white">{day.dayKey}</span>
                                            <Pill label="Events" value={day.eventCount} />
                                            <Pill label="Completed" value={day.completed} />
                                            <Pill label="Failed" value={day.failed} tone={day.failed ? "warn" : "good"} />
                                            <Pill label="Rewards" value={day.rewardTotal} />
                                        </div>
                                    ))}
                                </div>
                            </ScrollWrap>
                        </div>
                    </Section>
                </div>
            ) : null}

            {activeTab === "telemetry" ? (
                <div className="space-y-4">
                    <Section
                        title="Event coverage"
                        subtitle="Tracked events, mapped tasks, and last-seen visibility in one bounded panel."
                        defaultOpen
                        summary={<><Pill label="Tracked events" value={data?.stats?.trackedTelemetryEvents ?? 0} /><Pill label="Orphaned" value={data?.stats?.orphanedTelemetryEvents ?? 0} tone={data?.stats?.orphanedTelemetryEvents ? "warn" : "good"} /></>}
                    >
                        <ScrollWrap>
                            <div className="divide-y divide-white/10">
                                {(data?.eventStats || []).map((event: any) => (
                                    <div key={event.eventName} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{event.label}</p>
                                                <p className="text-xs text-gray-400">{event.eventName}</p>
                                            </div>
                                            <Pill label="Total" value={compactNumber(event.totalCount)} />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Tasks" value={event.mappedTaskCount} tone={event.mappedTaskCount ? "good" : "warn"} />
                                            <Pill label="Last seen" value={formatRelative(event.lastSeenAt)} />
                                            <Pill label="Source" value={event.trackingSource} />
                                        </div>
                                        {event.mappedTaskTitles?.length ? <p className="text-xs text-gray-400">{event.mappedTaskTitles.join(", ")}</p> : null}
                                    </div>
                                ))}
                            </div>
                        </ScrollWrap>
                    </Section>

                    <Section
                        title="Normalized orchestration stream"
                        subtitle="Recent normalized events translated out of raw telemetry, watch-time, creator, ledger, and notification signals."
                        defaultOpen={!isCompactViewport}
                        summary={<><Pill label="Events" value={data?.stats?.orchestrationEvents ?? 0} /><Pill label="Low confidence" value={data?.stats?.orchestrationLowConfidence ?? 0} tone={(data?.stats?.orchestrationLowConfidence ?? 0) ? "warn" : "good"} /></>}
                    >
                        <ScrollWrap>
                            <div className="divide-y divide-white/10">
                                {(data?.orchestration?.events || []).map((event: any) => (
                                    <div key={event.id} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{event.normalizedLabel}</p>
                                                <p className="text-xs text-gray-400">{event.domain} | {event.systemKey}</p>
                                            </div>
                                            <Pill label="Status" value={event.status} tone={event.status === "critical" ? "bad" : event.status === "attention" ? "warn" : "good"} />
                                        </div>
                                        <p className="text-sm text-gray-200">{event.humanSummary}</p>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Actor" value={event.actor.actorLabel || event.actor.actorType} />
                                            <Pill label="Surface" value={event.session.sourceSurface || "background"} />
                                            <Pill label="Findings" value={event.findingCount} tone={event.findingCount ? "warn" : "good"} />
                                            <Pill label="Training" value={event.readiness.trainingEligible ? "ready" : "blocked"} tone={event.readiness.trainingEligible ? "good" : "warn"} />
                                            <Pill label="Recommend" value={event.readiness.recommendationReady ? "ready" : "blocked"} tone={event.readiness.recommendationReady ? "good" : "warn"} />
                                        </div>
                                        {event.dependencyReadiness.missing?.length ? (
                                            <p className="text-xs text-gray-400">Missing: {event.dependencyReadiness.missing.join(", ")}</p>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </ScrollWrap>
                    </Section>

                    <Section
                        title="Receipt visibility"
                        subtitle="Keeps the dedupe layer visible without forcing two full tables on screen at once."
                        defaultOpen={!isCompactViewport}
                        summary={<><Pill label="Receipts 7d" value={data?.stats?.receiptsLast7d ?? 0} /><Pill label="Recent" value={(data?.recentReceipts || []).length} /></>}
                    >
                        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {(data?.receiptSummary || []).map((receipt: any) => (
                                        <div key={receipt.eventName} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                                            <div>
                                                <p className="font-semibold text-white">{receipt.eventName}</p>
                                                <p className="text-xs text-gray-400">{formatTimestamp(receipt.lastSeenAt)}</p>
                                            </div>
                                            <Pill label="Count" value={receipt.count} />
                                        </div>
                                    ))}
                                </div>
                            </ScrollWrap>
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {(data?.recentReceipts || []).map((receipt: any) => (
                                        <div key={receipt.id} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{receipt.eventName}</p>
                                                    <p className="text-xs text-gray-400">{receipt.uid || "guest"} | {receipt.receiptKey}</p>
                                                </div>
                                                <Pill label="Source" value={receipt.source} />
                                            </div>
                                            <p className="text-xs text-gray-400">{formatTimestamp(receipt.timestamp)}</p>
                                        </div>
                                    ))}
                                </div>
                            </ScrollWrap>
                        </div>
                    </Section>

                    <Section
                        title="Orphaned telemetry"
                        subtitle="Compact warning list for tracked events that do not map to a task."
                        defaultOpen={!isCompactViewport}
                        summary={<><Pill label="Orphaned" value={(data?.orphanedEventStats || []).length} tone={(data?.orphanedEventStats || []).length ? "warn" : "good"} /></>}
                    >
                        {(data?.orphanedEventStats || []).length ? (
                            <div className="grid gap-3 md:grid-cols-2">
                                {(data?.orphanedEventStats || []).map((event: any) => (
                                    <div key={event.eventName} className="rounded-[1rem] border border-amber-400/20 bg-amber-500/10 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-white">{event.label}</p>
                                                <p className="text-xs text-gray-400">{event.eventName}</p>
                                            </div>
                                            <Pill label="Count" value={compactNumber(event.totalCount)} tone="warn" />
                                        </div>
                                        <p className="mt-3 text-sm text-amber-100">Last seen {formatRelative(event.lastSeenAt)}. This event is tracked, but does not currently power any task mapping.</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-[1rem] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">Every tracked telemetry event in this slice is mapped to at least one task.</div>
                        )}
                    </Section>
                </div>
            ) : null}

            {activeTab === "reports" ? (
                <div className="space-y-4">
                    <Section
                        title="Bug intake"
                        subtitle="Keeps incoming bug reports readable on mobile without pushing the user into a separate detail surface."
                        defaultOpen
                        summary={<><Pill label="Loaded" value={(data?.bugReports || []).length} /><Pill label="Last 7d" value={data?.stats?.bugReportsLast7d ?? 0} tone={(data?.stats?.bugReportsLast7d ?? 0) > 0 ? "warn" : "good"} /></>}
                    >
                        <div className="space-y-3">
                            {(data?.bugReports || []).length ? (data?.bugReports || []).map((report: any) => (
                                <div key={report.id} className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-white">{report.summary || "Untitled bug report"}</p>
                                            <p className="mt-1 text-xs text-gray-400">{report.currentPath || "Unknown path"} | {report.componentName || "Unknown component"}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Status" value={report.status} />
                                            <Pill label="Severity" value={report.severity} tone={report.severity === "high" || report.severity === "critical" ? "bad" : report.severity === "medium" ? "warn" : "neutral"} />
                                        </div>
                                    </div>
                                    <p className="mt-3 line-clamp-3 text-sm text-gray-300">{report.message}</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Pill label="Breadcrumbs" value={report.breadcrumbsCount} />
                                        <Pill label="Diagnostics" value={report.diagnosticsCount} />
                                        <Pill label="Rollouts" value={report.rolloutCount} />
                                        <Pill label="When" value={formatRelative(report.timestamp)} />
                                    </div>
                                </div>
                            )) : <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300">No bug reports are loaded in the current sample.</div>}
                        </div>
                    </Section>

                    <Section
                        title="Rollout registry"
                        subtitle="Makes the current experimentation footprint readable without leaving the debug console."
                        defaultOpen={!isCompactViewport}
                        summary={<><Pill label="Configured rollouts" value={(data?.rollouts || []).length} /><Pill label="Sample actors" value={data?.stats?.rolloutSamples ?? 0} /></>}
                    >
                        <div className="space-y-4">
                            {data?.release ? (
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-white">{data.release.label}</p>
                                            <p className="mt-1 text-xs text-gray-400">{data.release.id}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Channel" value={data.release.channel} tone={data.release.channel === "alpha" ? "warn" : "good"} />
                                            <Pill label="Status" value={data.release.status} tone={data.release.status === "active" ? "good" : "neutral"} />
                                            <Pill label="Declared" value={data.release.declaredAt} />
                                        </div>
                                    </div>
                                    <p className="mt-3 text-sm text-gray-300">{data.release.summary}</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Pill label="Train" value={data.release.train} />
                                        <Pill label="Notes" value={(data.release.releaseNotes || []).length} />
                                        <Pill label="Changelog" value={(data.changeLog || []).length} />
                                    </div>
                                    {(data.release.releaseNotes || []).length ? (
                                        <ul className="mt-4 space-y-2 text-sm text-gray-300">
                                            {(data.release.releaseNotes || []).map((note: string) => (
                                                <li key={note} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">{note}</li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </div>
                            ) : null}

                            {(data?.changeLog || []).length ? (
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-white">Recent changelog</p>
                                            <p className="mt-1 text-xs text-gray-400">Codebase-native release notes for the current train.</p>
                                        </div>
                                        <Pill label="Entries" value={(data?.changeLog || []).length} />
                                    </div>
                                    <div className="mt-4 space-y-3">
                                        {(data?.changeLog || []).map((entry: any) => (
                                            <div key={entry.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-white">{entry.title}</p>
                                                        <p className="mt-1 text-xs text-gray-400">{entry.date}</p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(entry.areas || []).slice(0, 4).map((area: string) => (
                                                            <Pill key={area} label="Area" value={area} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <p className="mt-2 text-sm text-gray-300">{entry.summary}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            <div className="grid gap-3 lg:grid-cols-2">
                            {(data?.rollouts || []).map((rollout: any) => (
                                <div key={rollout.id} className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-white">{rollout.label}</p>
                                            <p className="mt-1 text-xs text-gray-400">{rollout.id}</p>
                                        </div>
                                        <Pill label="Enabled" value={rollout.enabled ? "Yes" : "No"} tone={rollout.enabled ? "good" : "warn"} />
                                    </div>
                                    <p className="mt-3 text-sm text-gray-300">{rollout.description}</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Pill label="Kind" value={rollout.kind} />
                                        <Pill label="Stage" value={rollout.stage} tone={rollout.stage === "alpha" ? "warn" : "good"} />
                                        <Pill label="Owner" value={rollout.owner} />
                                        <Pill label="Audience" value={rollout.audience} />
                                        <Pill label="Rollout" value={`${rollout.rolloutPercent}%`} />
                                        <Pill label="Default" value={rollout.defaultVariant} />
                                        <Pill label="Kill switch" value={rollout.killSwitchable ? "Ready" : "Locked"} tone={rollout.killSwitchable ? "good" : "warn"} />
                                    </div>
                                    {(rollout.requiredSegments || []).length ? <p className="mt-3 text-xs text-gray-400">Requires: {(rollout.requiredSegments || []).join(", ")}</p> : null}
                                    {(rollout.excludedSegments || []).length ? <p className="mt-1 text-xs text-gray-500">Excludes: {(rollout.excludedSegments || []).join(", ")}</p> : null}
                                </div>
                            ))}
                            </div>

                            {(data?.rolloutSamples || []).length ? (
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-white">Sample actor evaluation</p>
                                            <p className="mt-1 text-xs text-gray-400">Shows how the current registry resolves for representative guest, member, creator, and admin contexts.</p>
                                        </div>
                                        <Pill label="Actors" value={(data?.rolloutSamples || []).length} />
                                    </div>
                                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                        {(data?.rolloutSamples || []).map((sample: any) => (
                                            <div key={sample.key} className="rounded-xl border border-white/10 bg-black/20 p-3">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-white">{sample.label}</p>
                                                        <p className="mt-1 text-xs text-gray-400">{sample.path}</p>
                                                    </div>
                                                    <Pill label="Role" value={sample.role} />
                                                </div>
                                                <div className="mt-3 space-y-2">
                                                    {(sample.assignments || []).map((assignment: any) => (
                                                        <div key={`${sample.key}:${assignment.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
                                                            <span className="font-medium text-gray-200">{assignment.id}</span>
                                                            <div className="flex flex-wrap gap-2">
                                                                <Pill label="Variant" value={assignment.variant} />
                                                                <Pill label="Reason" value={assignment.reason} tone={assignment.active ? "good" : assignment.reason === "ineligible" ? "warn" : "neutral"} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </Section>
                </div>
            ) : null}

            {activeTab === "ops" ? (
                <div className="space-y-4">
                    <Section
                        title="Repair proposals and actor ownership"
                        subtitle="Admin-confirmed rebuilds stay inline here, and actor summaries help spot cross-session bleed before it becomes a reporting problem."
                        defaultOpen
                        summary={<><Pill label="Actionable" value={data?.stats?.orchestrationActionableRepairs ?? 0} tone={(data?.stats?.orchestrationActionableRepairs ?? 0) ? "warn" : "good"} /><Pill label="Contamination" value={data?.orchestration?.summary?.contaminationRisks ?? 0} tone={(data?.orchestration?.summary?.contaminationRisks ?? 0) ? "bad" : "good"} /></>}
                    >
                        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {(data?.orchestration?.proposals || []).length ? (data?.orchestration?.proposals || []).map((proposal: any) => (
                                        <div key={proposal.id} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{proposal.label}</p>
                                                    <p className="text-xs text-gray-400">{proposal.sourceDocumentPath}</p>
                                                </div>
                                                <Pill label="Status" value={proposal.status} tone={proposal.status === "open" ? "warn" : proposal.status === "resolved" ? "good" : "neutral"} />
                                            </div>
                                            <p className="text-sm text-gray-200">{proposal.detail}</p>
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    variant="glass"
                                                    size="sm"
                                                    disabled={repairingId === proposal.id || proposal.actionType !== "rebuild_projection" || proposal.status !== "open"}
                                                    onClick={() => handleRepairProposal(proposal.id, "apply")}
                                                >
                                                    {repairingId === proposal.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                    Apply
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={repairingId === proposal.id || proposal.status !== "open"}
                                                    onClick={() => handleRepairProposal(proposal.id, "dismiss")}
                                                >
                                                    Dismiss
                                                </Button>
                                            </div>
                                        </div>
                                    )) : <div className="px-4 py-4 text-sm text-emerald-100">No repair proposals are open in the current orchestration sample.</div>}
                                </div>
                            </ScrollWrap>
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {(data?.orchestration?.actorSummaries || []).map((actor: any) => (
                                        <div key={actor.id} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{actor.actorLabel || actor.actorId || actor.actorType}</p>
                                                    <p className="text-xs text-gray-400">{actor.actorType} | {actor.actorId || "anonymous"}</p>
                                                </div>
                                                <Pill label="Events" value={actor.eventCount} />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Warnings" value={actor.warningCount} tone={actor.warningCount ? "warn" : "good"} />
                                                <Pill label="Critical" value={actor.criticalCount} tone={actor.criticalCount ? "bad" : "good"} />
                                                <Pill label="Bleed risk" value={actor.contaminationCount} tone={actor.contaminationCount ? "bad" : "good"} />
                                            </div>
                                            {actor.topDomains?.length ? <p className="text-xs text-gray-400">Domains: {actor.topDomains.join(", ")}</p> : null}
                                        </div>
                                    ))}
                                </div>
                            </ScrollWrap>
                        </div>
                    </Section>

                    <Section
                        title="Pipeline health"
                        subtitle="High-level runtime, diagnostics, and materializer health without forcing every list open by default."
                        defaultOpen
                        summary={<><Pill label="Score" value={`${data?.opsHealth?.score ?? 0}%`} tone={(data?.opsHealth?.score ?? 0) >= 90 ? "good" : (data?.opsHealth?.score ?? 0) >= 70 ? "warn" : "bad"} /><Pill label="Failures" value={data?.opsHealth?.pipeline?.failureCount ?? 0} tone={data?.opsHealth?.pipeline?.failureCount ? "warn" : "good"} /><Pill label="Diagnostics" value={data?.opsHealth?.diagnostics?.total ?? 0} /></>}
                    >
                        <div className="grid gap-4 lg:grid-cols-3">
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Pipeline</p><p className="mt-2 text-xl font-black text-white">{data?.opsHealth?.pipeline?.failureCount ?? 0}</p><p className="mt-1 text-sm text-gray-400">Last failure {formatRelative(data?.opsHealth?.pipeline?.lastFailureAt)}</p></div>
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Diagnostics</p><p className="mt-2 text-xl font-black text-white">{data?.opsHealth?.diagnostics?.errorCount ?? 0}</p><p className="mt-1 text-sm text-gray-400">Errors in recent sample</p></div>
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Materializers</p><p className="mt-2 text-xl font-black text-white">{(data?.opsHealth?.materializers || []).length}</p><p className="mt-1 text-sm text-gray-400">Tracked downstream writers</p></div>
                        </div>
                    </Section>

                    <Section
                        title="Diagnostics and materializers"
                        subtitle="Shows noisy channels, recent diagnostics, route failures, and downstream freshness in one lane."
                        defaultOpen={!isCompactViewport}
                        summary={<><Pill label="Channels" value={(data?.opsHealth?.diagnostics?.channels || []).length} /><Pill label="Recent diagnostics" value={(data?.opsHealth?.diagnostics?.recent || []).length} /><Pill label="Routes" value={(data?.opsHealth?.pipeline?.routes || []).length} /></>}
                    >
                        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {(data?.opsHealth?.diagnostics?.channels || []).map((channel: any) => (
                                        <div key={channel.key} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{channel.label}</p>
                                                    <p className="text-xs text-gray-400">{formatRelative(channel.lastSeenAt)}</p>
                                                </div>
                                                <Pill label="Count" value={channel.count} />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Errors" value={channel.errorCount} tone={channel.errorCount ? "bad" : "good"} />
                                                <Pill label="Warns" value={channel.warnCount} tone={channel.warnCount ? "warn" : "good"} />
                                                <Pill label="Info" value={channel.infoCount} />
                                            </div>
                                        </div>
                                    ))}
                                    {(data?.opsHealth?.pipeline?.routes || []).map((route: any) => (
                                        <div key={route.routeKey} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                                            <div>
                                                <p className="font-semibold text-white">{route.label}</p>
                                                <p className="text-xs text-gray-400">{route.routeKey}</p>
                                            </div>
                                            <Pill label="Failures" value={route.count} tone={route.count ? "warn" : "good"} />
                                        </div>
                                    ))}
                                </div>
                            </ScrollWrap>
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {(data?.opsHealth?.diagnostics?.recent || []).map((entry: any) => (
                                        <div key={entry.id} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{entry.channel}</p>
                                                    <p className="text-xs text-gray-400">{formatTimestamp(entry.timestamp)}</p>
                                                </div>
                                                <Pill label="Severity" value={entry.severity} tone={entry.severity === "error" ? "bad" : entry.severity === "warn" ? "warn" : "neutral"} />
                                            </div>
                                            <p className="text-sm text-gray-200">{entry.message}</p>
                                            {entry.detailPreview ? <p className="text-xs text-gray-400">{entry.detailPreview}</p> : null}
                                        </div>
                                    ))}
                                    {(data?.opsHealth?.materializers || []).map((materializer: any) => (
                                        <div key={materializer.key} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{materializer.label}</p>
                                                    <p className="text-xs text-gray-400">{materializer.engine}</p>
                                                </div>
                                                <Pill label="Status" value={materializer.status} tone={materializer.status === "healthy" ? "good" : materializer.status === "warn" ? "warn" : "bad"} />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Count" value={materializer.count} />
                                                <Pill label="Last seen" value={formatRelative(materializer.lastSeenAt)} />
                                            </div>
                                            <p className="text-sm text-gray-300">{materializer.detail}</p>
                                        </div>
                                    ))}
                                </div>
                            </ScrollWrap>
                        </div>
                    </Section>

                    <Section
                        title="Actionable panel logs"
                        subtitle="Each major debug panel now resolves into a backend system log with a concrete next action, so parity warnings stop disappearing with the UI refresh cycle."
                        defaultOpen={!isCompactViewport}
                        summary={
                            <>
                                <Pill label="Panels" value={(data?.panelSystemLogs || []).length} />
                                <Pill label="Warn" value={(data?.panelSystemLogs || []).filter((entry: any) => entry.status === "warn").length} tone={(data?.panelSystemLogs || []).some((entry: any) => entry.status === "warn") ? "warn" : "good"} />
                                <Pill label="Fail" value={(data?.panelSystemLogs || []).filter((entry: any) => entry.status === "fail").length} tone={(data?.panelSystemLogs || []).some((entry: any) => entry.status === "fail") ? "bad" : "good"} />
                            </>
                        }
                    >
                        <ScrollWrap>
                            <div className="divide-y divide-white/10">
                                {(data?.panelSystemLogs || []).map((entry: any) => (
                                    <div key={entry.id} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{entry.panelTitle}</p>
                                                <p className="text-xs text-gray-400">{entry.tab} | {formatRelative(entry.updatedAtMs)}</p>
                                            </div>
                                            <Pill label="Status" value={entry.status} tone={entry.status === "healthy" ? "good" : entry.status === "warn" ? "warn" : "bad"} />
                                        </div>
                                        <p className="text-sm text-gray-200">{entry.summary}</p>
                                        <p className="text-xs text-gray-400">{entry.action}</p>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Signals" value={entry.signalCount ?? 0} tone={(entry.signalCount ?? 0) > 0 ? (entry.status === "fail" ? "bad" : "warn") : "good"} />
                                            {(entry.signalKeys || []).slice(0, 3).map((signalKey: string) => (
                                                <Pill key={`${entry.id}:${signalKey}`} label="Signal" value={signalKey} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {(data?.panelSystemLogs || []).length === 0 ? (
                                    <div className="px-4 py-4 text-sm text-gray-300">No persisted panel logs are loaded yet.</div>
                                ) : null}
                            </div>
                        </ScrollWrap>
                    </Section>
                </div>
            ) : null}
        </div>
    );
}
