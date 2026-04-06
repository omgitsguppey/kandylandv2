"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Loader2, RefreshCw, Sparkles, ThumbsDown, ThumbsUp, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import {
    formatAdminAiUsd,
    type AdminAiDropCoverJobRecord,
    type AdminAiDropCoverRuntimeStatus,
} from "@/lib/ai-drop-covers";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { cn } from "@/lib/utils";

type AdminAiDropCoverDashboard = {
    settings: {
        enabled: boolean;
        model: string;
        location: string;
        pricePerGenerationUsd: number;
    };
    runtime: {
        enabled: boolean;
        status: AdminAiDropCoverRuntimeStatus;
        note: string;
    };
    recentJobs: AdminAiDropCoverJobRecord[];
};

interface AiDropCoverGeneratorPanelProps {
    visible: boolean;
    title: string;
    creatorId?: string | null;
    creatorName?: string | null;
    dropId?: string | null;
    dropType?: string | null;
    tags?: string[];
    selectedJobId?: string | null;
    onApplyCover: (job: AdminAiDropCoverJobRecord) => void;
    onSelectedJobChange: (jobId: string | null) => void;
}

function buildScopedJobs(allJobs: AdminAiDropCoverJobRecord[], dropId?: string | null) {
    if (!dropId) {
        return [];
    }

    return allJobs.filter((job) => job.dropId === dropId || job.acceptedForDropId === dropId);
}

function StatusPill({ status }: { status: AdminAiDropCoverJobRecord["status"] }) {
    const toneClassName = status === "succeeded"
        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
        : status === "failed"
            ? "border-red-400/20 bg-red-500/10 text-red-100"
            : "border-cyan-400/20 bg-cyan-500/10 text-cyan-100";

    const label = status === "succeeded" ? "Ready" : status === "failed" ? "Failed" : "Generating";

    return (
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold", toneClassName)}>
            {status === "running" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {label}
        </span>
    );
}

export function AiDropCoverGeneratorPanel({
    visible,
    title,
    creatorId,
    creatorName,
    dropId,
    dropType,
    tags,
    selectedJobId,
    onApplyCover,
    onSelectedJobChange,
}: AiDropCoverGeneratorPanelProps) {
    const [dashboard, setDashboard] = useState<AdminAiDropCoverDashboard | null>(null);
    const [jobs, setJobs] = useState<AdminAiDropCoverJobRecord[]>([]);
    const [loadingDashboard, setLoadingDashboard] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [feedbackingJobId, setFeedbackingJobId] = useState<string | null>(null);

    const titleReady = title.trim().length >= 3;
    const latestJob = jobs[0] ?? null;
    const featureEnabled = dashboard?.settings.enabled === true;
    const runtimeReady = dashboard?.runtime.status === "ready";

    const refreshDashboard = useCallback(async () => {
        if (!visible) {
            return;
        }

        setLoadingDashboard(true);
        try {
            const response = await authFetch("/api/admin/ai/drop-covers");
            const result = await response.json() as AdminAiDropCoverDashboard;
            if (!response.ok) {
                throw new Error("Failed to load AI cover generation status");
            }

            setDashboard(result);
            const scoped = buildScopedJobs(result.recentJobs || [], dropId);
            if (scoped.length > 0) {
                setJobs(scoped);
            }
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                severity: "warn",
                message: "AI drop cover status fetch failed",
                error,
                detail: {
                    adminView: "create_drop_modal",
                    dropId: dropId || undefined,
                },
                consoleLabel: "[AI Drop Cover Panel] status fetch failed",
            });
        } finally {
            setLoadingDashboard(false);
        }
    }, [dropId, visible]);

    useEffect(() => {
        if (!visible) {
            return;
        }

        void refreshDashboard();
    }, [refreshDashboard, visible]);

    const handleGenerate = useCallback(async (previousJobId?: string | null) => {
        if (!titleReady || generating) {
            return;
        }

        setGenerating(true);
        try {
            const response = await authFetch("/api/admin/ai/drop-covers/generate", {
                method: "POST",
                body: JSON.stringify({
                    title: title.trim(),
                    creatorId,
                    creatorName,
                    dropId,
                    dropType,
                    tags,
                    previousJobId: previousJobId || undefined,
                }),
            });
            const result = await response.json() as { error?: string; job?: AdminAiDropCoverJobRecord };
            if (!response.ok || !result.job) {
                throw new Error(result.error || "Cover generation failed");
            }

            setJobs((current) => [result.job!, ...current.filter((job) => job.id !== result.job!.id)].slice(0, 6));
            toast.success(previousJobId ? "Cover regenerated" : "Cover generated");
            void refreshDashboard();
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                message: "AI drop cover generation failed",
                error,
                detail: {
                    adminView: "create_drop_modal",
                    title: title.trim(),
                    previousJobId: previousJobId || undefined,
                    dropId: dropId || undefined,
                },
                consoleLabel: "[AI Drop Cover Panel] generation failed",
            });
            toast.error(error instanceof Error ? error.message : "Cover generation failed");
        } finally {
            setGenerating(false);
        }
    }, [creatorId, creatorName, dropId, dropType, generating, refreshDashboard, tags, title, titleReady]);

    const handleFeedback = useCallback(async (jobId: string, action: "like" | "dislike" | "accept") => {
        setFeedbackingJobId(jobId);
        try {
            const response = await authFetch("/api/admin/ai/drop-covers/feedback", {
                method: "POST",
                body: JSON.stringify({
                    jobId,
                    action,
                }),
            });
            const result = await response.json() as { error?: string; job?: AdminAiDropCoverJobRecord };
            if (!response.ok || !result.job) {
                throw new Error(result.error || "Cover feedback update failed");
            }

            setJobs((current) => current.map((job) => job.id === jobId ? result.job! : job));

            if (action === "accept") {
                onSelectedJobChange(jobId);
                onApplyCover(result.job);
                toast.success("AI cover applied to this draft");
            } else if (action === "like") {
                toast.success("Generation liked");
            } else {
                toast.success("Generation disliked");
            }

            void refreshDashboard();
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                message: "AI drop cover feedback failed",
                error,
                detail: {
                    adminView: "create_drop_modal",
                    action,
                    jobId,
                },
                consoleLabel: "[AI Drop Cover Panel] feedback failed",
            });
            toast.error(error instanceof Error ? error.message : "Cover feedback failed");
        } finally {
            setFeedbackingJobId(null);
        }
    }, [onApplyCover, onSelectedJobChange, refreshDashboard]);

    const runtimeTone = useMemo(() => {
        switch (dashboard?.runtime.status) {
            case "ready":
                return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
            case "disabled":
                return "border-white/10 bg-white/5 text-gray-200";
            default:
                return "border-amber-400/20 bg-amber-500/10 text-amber-100";
        }
    }, [dashboard?.runtime.status]);

    if (!visible) {
        return null;
    }

    return (
        <div className="rounded-[1.4rem] border border-brand-purple/15 bg-brand-purple/[0.06] p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <Sparkles className="h-4 w-4 text-brand-purple" />
                        AI Cover Generation
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                        Title-driven only. The server builds the hidden image recipe and keeps cover text deterministic in the product UI instead of trusting model-rendered text.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {dashboard ? (
                        <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", runtimeTone)}>
                            {dashboard.runtime.status === "ready" ? <Sparkles className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
                            {dashboard.runtime.status === "ready" ? "Ready" : dashboard.runtime.status === "disabled" ? "Off" : "Degraded"}
                        </span>
                    ) : null}
                    {dashboard?.settings ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-gray-300">
                            {formatAdminAiUsd(dashboard.settings.pricePerGenerationUsd)} / gen
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="mt-3 rounded-[1rem] border border-white/10 bg-black/30 p-3 text-xs text-gray-300">
                {loadingDashboard && !dashboard ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading AI status…</span>
                ) : (
                    dashboard?.runtime.note || "AI status not loaded yet."
                )}
            </div>

            {featureEnabled && runtimeReady ? (
                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => void handleGenerate(null)}
                        disabled={!titleReady || generating}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-brand-purple/25 bg-brand-purple/15 px-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Generate cover
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleGenerate(latestJob?.id || null)}
                        disabled={!titleReady || generating || !latestJob}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Regenerate
                    </button>
                </div>
            ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                        href="/admin/ai"
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-black/35 px-4 text-sm font-semibold text-white"
                    >
                        Open Admin AI
                    </Link>
                </div>
            )}

            {!titleReady ? (
                <p className="mt-2 text-[11px] text-amber-200/80">Enter at least 3 title characters before generating a cover.</p>
            ) : null}

            {generating ? (
                <div className="mt-3 rounded-[1rem] border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating a new cover from the current drop title…
                    </div>
                </div>
            ) : null}

            {jobs.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {jobs.map((job) => {
                        const isSelected = selectedJobId === job.id;
                        const feedbackPending = feedbackingJobId === job.id;
                        const canUse = job.status === "succeeded" && typeof job.imageUrl === "string" && job.imageUrl.length > 0;

                        return (
                            <article key={job.id} className={cn(
                                "overflow-hidden rounded-[1.2rem] border bg-black/35",
                                isSelected ? "border-brand-purple/35" : "border-white/10",
                            )}>
                                <div className="relative aspect-square overflow-hidden bg-black">
                                    {job.imageUrl ? (
                                        <Image src={job.imageUrl} alt={job.title} fill sizes="(max-width: 768px) 50vw, 240px" className="object-cover" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-xs text-gray-500">
                                            {job.status === "failed" ? "Generation failed" : "Rendering…"}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-white">{job.title}</p>
                                            <p className="mt-1 text-[11px] text-gray-400">
                                                {job.latencyMs ? `${job.latencyMs} ms` : "Pending"} | {formatAdminAiUsd(job.estimatedCostUsd || 0)}
                                            </p>
                                        </div>
                                        <StatusPill status={job.status} />
                                    </div>

                                    {job.errorMessage ? <p className="text-[11px] text-red-200">{job.errorMessage}</p> : null}

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void handleFeedback(job.id, "like")}
                                            disabled={!canUse || feedbackPending}
                                            className={cn(
                                                "inline-flex min-h-10 items-center gap-1 rounded-full border px-3 text-xs font-semibold text-white disabled:opacity-45",
                                                job.feedback === "liked" ? "border-emerald-400/20 bg-emerald-500/10" : "border-white/10 bg-black/35",
                                            )}
                                        >
                                            <ThumbsUp className="h-3.5 w-3.5" />
                                            Like
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void handleFeedback(job.id, "dislike")}
                                            disabled={!canUse || feedbackPending}
                                            className={cn(
                                                "inline-flex min-h-10 items-center gap-1 rounded-full border px-3 text-xs font-semibold text-white disabled:opacity-45",
                                                job.feedback === "disliked" ? "border-red-400/20 bg-red-500/10" : "border-white/10 bg-black/35",
                                            )}
                                        >
                                            <ThumbsDown className="h-3.5 w-3.5" />
                                            Dislike
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void handleFeedback(job.id, "accept")}
                                            disabled={!canUse || feedbackPending}
                                            className={cn(
                                                "inline-flex min-h-10 items-center gap-1 rounded-full border px-3 text-xs font-semibold text-white disabled:opacity-45",
                                                isSelected ? "border-brand-purple/30 bg-brand-purple/20" : "border-white/10 bg-black/35",
                                            )}
                                        >
                                            {feedbackPending && selectedJobId !== job.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                            {isSelected ? "Cover selected" : "Use as cover"}
                                        </button>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : (
                <div className="mt-4 rounded-[1rem] border border-dashed border-white/10 bg-black/25 p-4 text-sm text-gray-400">
                    No AI cover jobs for this modal yet. Generate a cover from the current title to start the history.
                </div>
            )}
        </div>
    );
}
