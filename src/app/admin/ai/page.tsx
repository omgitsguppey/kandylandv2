"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
    Activity,
    CheckCircle2,
    DollarSign,
    Loader2,
    Power,
    RefreshCw,
    Sparkles,
    ThumbsDown,
    ThumbsUp,
    TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import { formatAdminAiUsd, type AdminAiDropCoverJobRecord, type AdminAiDropCoverRuntimeStatus } from "@/lib/ai-drop-covers";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { cn } from "@/lib/utils";

type AdminAiDropCoverDashboard = {
    settings: {
        enabled: boolean;
        model: string;
        location: string;
        pricePerGenerationUsd: number;
        priceBasis: string;
        priceSourceUrl: string;
    };
    runtime: {
        enabled: boolean;
        status: AdminAiDropCoverRuntimeStatus;
        note: string;
        project: string;
        location: string;
        model: string;
        pricePerGenerationUsd: number;
        priceBasis: string;
        priceSourceUrl: string;
    };
    aggregate: {
        generationCount: number;
        successfulGenerationCount: number;
        failedGenerationCount: number;
        acceptedCount: number;
        likedCount: number;
        dislikedCount: number;
        regeneratedCount: number;
        totalEstimatedCostUsd: number;
        averageLatencyMs: number;
        activeGenerationCount: number;
    };
    recentJobs: AdminAiDropCoverJobRecord[];
};

function formatTimestamp(timestamp?: number | null) {
    if (!timestamp) {
        return "Not recorded";
    }

    return new Date(timestamp).toLocaleString();
}

function runtimeTone(status?: AdminAiDropCoverRuntimeStatus) {
    switch (status) {
        case "ready":
            return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
        case "disabled":
            return "border-white/10 bg-white/5 text-gray-200";
        default:
            return "border-amber-400/20 bg-amber-500/10 text-amber-100";
    }
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

function JobStatusBadge({ job }: { job: AdminAiDropCoverJobRecord }) {
    const toneClassName = job.status === "succeeded"
        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
        : job.status === "failed"
            ? "border-red-400/20 bg-red-500/10 text-red-100"
            : "border-cyan-400/20 bg-cyan-500/10 text-cyan-100";

    return (
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold", toneClassName)}>
            {job.status === "running" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {job.status === "succeeded" ? "Ready" : job.status === "failed" ? "Failed" : "Generating"}
        </span>
    );
}

export default function AIAdminPage() {
    const [updatingToggle, setUpdatingToggle] = useState(false);
    const {
        data,
        error,
        isLoading,
        mutate,
    } = useAdminPollingSWR<AdminAiDropCoverDashboard>("/api/admin/ai/drop-covers", 10_000, {
        keepPreviousData: true,
    });

    const acceptedJobs = useMemo(
        () => (data?.recentJobs || []).filter((job) => job.accepted && job.imageUrl).slice(0, 6),
        [data?.recentJobs],
    );

    const handleToggle = async () => {
        if (!data?.settings) {
            return;
        }

        setUpdatingToggle(true);
        try {
            const response = await authFetch("/api/admin/ai/drop-covers", {
                method: "PUT",
                body: JSON.stringify({
                    enabled: !data.settings.enabled,
                }),
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) {
                throw new Error(result.error || "Failed to update AI cover controls");
            }

            toast.success(!data.settings.enabled ? "AI cover generation enabled" : "AI cover generation disabled");
            await mutate();
        } catch (issue) {
            reportClientIssue({
                channel: "ui",
                message: "Admin AI toggle update failed",
                error: issue,
                detail: {
                    adminView: "admin_ai_page",
                    nextEnabled: !data.settings.enabled,
                },
                consoleLabel: "[Admin AI] toggle failed",
            });
            toast.error(issue instanceof Error ? issue.message : "Failed to update AI cover controls");
        } finally {
            setUpdatingToggle(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageViewEvent eventName="admin_ai_viewed" />
            <AdminPageHeader
                eyebrow="AI Operations"
                title="AI Cover Generation"
                subtitle="Control the real Vertex-powered drop-cover workflow, monitor runtime health, and inspect actual generation cost and feedback history."
                actions={(
                    <>
                        <div className={cn("inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm", runtimeTone(data?.runtime.status))}>
                            {data?.runtime.status === "ready" ? <Sparkles className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
                            {data?.runtime.status === "ready" ? "Vertex ready" : data?.runtime.status === "disabled" ? "AI off" : "Needs attention"}
                        </div>
                        <Button variant="glass" onClick={() => void mutate()}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                        <button
                            type="button"
                            onClick={handleToggle}
                            disabled={!data?.settings || updatingToggle}
                            className={cn(
                                "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold text-white disabled:opacity-50",
                                data?.settings?.enabled
                                    ? "border-red-400/20 bg-red-500/10"
                                    : "border-emerald-400/20 bg-emerald-500/10",
                            )}
                        >
                            {updatingToggle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                            {data?.settings?.enabled ? "Turn AI off" : "Turn AI on"}
                        </button>
                    </>
                )}
            />

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <StatCard label="Runtime" value={data?.runtime.status || (error ? "error" : "--")} meta={data?.runtime.model || "Vertex"} />
                <StatCard label="Generations" value={data?.aggregate.generationCount ?? "--"} meta={`${data?.aggregate.activeGenerationCount ?? 0} active`} />
                <StatCard label="Accepted" value={data?.aggregate.acceptedCount ?? "--"} meta={`${data?.aggregate.regeneratedCount ?? 0} regens`} />
                <StatCard label="Signals" value={`${data?.aggregate.likedCount ?? 0}/${data?.aggregate.dislikedCount ?? 0}`} meta="likes / dislikes" />
                <StatCard label="Avg runtime" value={data?.aggregate.averageLatencyMs ? `${data.aggregate.averageLatencyMs} ms` : "--"} meta={data?.aggregate.successfulGenerationCount ? `${data.aggregate.successfulGenerationCount} successes` : "No completed jobs"} />
                <StatCard label="Estimated cost" value={data ? formatAdminAiUsd(data.aggregate.totalEstimatedCostUsd) : "--"} meta={data ? `${formatAdminAiUsd(data.settings.pricePerGenerationUsd)} each` : "Pricing unavailable"} />
            </div>

            {isLoading && !data ? (
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-6 text-sm text-gray-300">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    Loading AI control state…
                </div>
            ) : null}

            {error ? (
                <div className="rounded-[1.5rem] border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
                    AI cover operations could not be loaded right now.
                </div>
            ) : null}

            <section className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-white">Runtime and cost truth</h2>
                        <p className="mt-1 text-sm text-gray-400">
                            Covers are generated server-side with a dedicated Vertex image model. Admins choose title-driven actions only; no prompt textbox exists in the UI.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200">
                            <Activity className="h-3.5 w-3.5" />
                            {data?.runtime.project || "No project"}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200">
                            <Sparkles className="h-3.5 w-3.5" />
                            {data?.runtime.location || "global"}
                        </span>
                    </div>
                </div>
                <div className="mt-4 rounded-[1.15rem] border border-white/10 bg-black/25 p-4 text-sm text-gray-300">
                    <p>{data?.runtime.note || "Runtime status not loaded."}</p>
                    <p className="mt-2 text-xs text-gray-500">
                        Cost is tracked as a real estimate from the current Google Cloud Vertex AI pricing page for the active image model. Failed requests that never reach a successful model response are not counted as billed.
                    </p>
                </div>
            </section>

            <section className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 md:p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white">Feedback dataset</h2>
                        <p className="mt-1 text-sm text-gray-400">
                            These are real operator signals only: generate, regenerate, like, dislike, and accepted-cover selections. No live model retraining is claimed here.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">
                            <ThumbsUp className="h-3.5 w-3.5" />
                            {data?.aggregate.likedCount ?? 0} likes
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs text-red-100">
                            <ThumbsDown className="h-3.5 w-3.5" />
                            {data?.aggregate.dislikedCount ?? 0} dislikes
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-xs text-brand-purple">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {data?.aggregate.acceptedCount ?? 0} accepted
                        </span>
                    </div>
                </div>

                {acceptedJobs.length > 0 ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {acceptedJobs.map((job) => (
                            <article key={job.id} className="overflow-hidden rounded-[1.2rem] border border-white/10 bg-black/25">
                                <div className="relative aspect-square overflow-hidden bg-black">
                                    <Image src={job.imageUrl!} alt={job.title} fill sizes="(max-width: 1280px) 50vw, 320px" className="object-cover" />
                                </div>
                                <div className="space-y-2 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-white">{job.title}</p>
                                            <p className="mt-1 text-[11px] text-gray-400">
                                                Accepted {formatTimestamp(job.acceptedAtMs)}
                                            </p>
                                        </div>
                                        <span className="inline-flex items-center gap-1 rounded-full border border-brand-purple/20 bg-brand-purple/10 px-2.5 py-1 text-[11px] font-semibold text-brand-purple">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Selected
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-500">
                                        {job.acceptedForDropId ? `Linked to ${job.acceptedForDropId}` : "Accepted in draft flow"}
                                    </p>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="mt-4 rounded-[1rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                        No accepted AI covers yet.
                    </div>
                )}
            </section>

            <section className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 md:p-5">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-white">Recent generation jobs</h2>
                        <p className="mt-1 text-sm text-gray-400">
                            Real job history with success/failure state, latency, estimated cost, and feedback signals.
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200">
                        <DollarSign className="h-3.5 w-3.5" />
                        Aggregate cost {data ? formatAdminAiUsd(data.aggregate.totalEstimatedCostUsd) : "--"}
                    </div>
                </div>

                <div className="mt-4 grid gap-3">
                    {(data?.recentJobs || []).length > 0 ? (
                        data!.recentJobs.map((job) => (
                            <article key={job.id} className="rounded-[1.15rem] border border-white/10 bg-black/25 p-3 md:p-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div className="min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <JobStatusBadge job={job} />
                                            {job.feedback === "liked" ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-100">
                                                    <ThumbsUp className="h-3 w-3" />
                                                    Liked
                                                </span>
                                            ) : null}
                                            {job.feedback === "disliked" ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-red-400/20 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-100">
                                                    <ThumbsDown className="h-3 w-3" />
                                                    Disliked
                                                </span>
                                            ) : null}
                                            {job.accepted ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-brand-purple/20 bg-brand-purple/10 px-2.5 py-1 text-[11px] text-brand-purple">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Accepted
                                                </span>
                                            ) : null}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{job.title}</p>
                                            <p className="mt-1 text-[11px] text-gray-500">
                                                Requested {formatTimestamp(job.requestedAtMs)}{job.creatorName ? ` | ${job.creatorName}` : ""}
                                            </p>
                                        </div>
                                        {job.errorMessage ? <p className="text-sm text-red-200">{job.errorMessage}</p> : null}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 sm:min-w-[15rem]">
                                        <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                                            <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">Latency</p>
                                            <p className="mt-1 text-sm font-semibold text-white">{job.latencyMs ? `${job.latencyMs} ms` : "Pending"}</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                                            <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">Cost</p>
                                            <p className="mt-1 text-sm font-semibold text-white">{formatAdminAiUsd(job.estimatedCostUsd || 0)}</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                                            <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">Model</p>
                                            <p className="mt-1 truncate text-sm font-semibold text-white">{job.model}</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                                            <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">Chain</p>
                                            <p className="mt-1 text-sm font-semibold text-white">{job.chainDepth ? `Regen ${job.chainDepth}` : "Original"}</p>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))
                    ) : (
                        <div className="rounded-[1rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                            No generation jobs have been recorded yet.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
