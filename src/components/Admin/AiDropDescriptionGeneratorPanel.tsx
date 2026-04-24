"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, Sparkles, ThumbsDown, ThumbsUp, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import {
    formatAdminAiUsd,
    type AdminAiDropDescriptionJobRecord,
    type AdminAiDropDescriptionRuntimeStatus,
} from "@/lib/ai-drop-descriptions";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

type AdminAiDropDescriptionDashboard = {
    settings: {
        enabled: boolean;
        model: string;
        optimizerEnabled: boolean;
    };
    runtime: {
        enabled: boolean;
        status: AdminAiDropDescriptionRuntimeStatus;
        note: string;
        model: string;
        resolvedModel?: string | null;
        inputUsdPerMillion: number;
        outputUsdPerMillion: number;
    };
    recentJobs: AdminAiDropDescriptionJobRecord[];
};

interface AiDropDescriptionGeneratorPanelProps {
    visible: boolean;
    title: string;
    creatorId?: string | null;
    creatorName?: string | null;
    dropId?: string | null;
    draftSessionId?: string | null;
    selectedJobId?: string | null;
    onApplyDescription: (job: AdminAiDropDescriptionJobRecord) => void;
    onSelectedJobChange: (jobId: string | null) => void;
}

function buildScopedJobs(
    allJobs: AdminAiDropDescriptionJobRecord[],
    dropId?: string | null,
    draftSessionId?: string | null,
) {
    if (!dropId && !draftSessionId) {
        return [];
    }

    return allJobs.filter((job) => (
        (dropId && (job.dropId === dropId || job.acceptedForDropId === dropId))
        || (draftSessionId && job.draftSessionId === draftSessionId)
    ));
}

function runtimeTone(status?: AdminAiDropDescriptionRuntimeStatus) {
    switch (status) {
        case "ready":
            return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
        case "disabled":
            return "border-white/10 bg-white/5 text-gray-200";
        default:
            return "border-amber-400/20 bg-amber-500/10 text-amber-100";
    }
}

export function AiDropDescriptionGeneratorPanel({
    visible,
    title,
    creatorId,
    creatorName,
    dropId,
    draftSessionId,
    selectedJobId,
    onApplyDescription,
    onSelectedJobChange,
}: AiDropDescriptionGeneratorPanelProps) {
    const [dashboard, setDashboard] = useState<AdminAiDropDescriptionDashboard | null>(null);
    const [jobs, setJobs] = useState<AdminAiDropDescriptionJobRecord[]>([]);
    const [loadingDashboard, setLoadingDashboard] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [feedbackingJobId, setFeedbackingJobId] = useState<string | null>(null);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [clearedBeforeMs, setClearedBeforeMs] = useState<number | null>(null);

    const titleReady = title.trim().length >= 3;
    const featureEnabled = dashboard?.settings.enabled === true;
    const runtimeReady = dashboard?.runtime.status === "ready";
    const visibleJobs = useMemo(
        () => jobs.filter((job) => clearedBeforeMs === null || job.requestedAtMs > clearedBeforeMs),
        [clearedBeforeMs, jobs],
    );

    const refreshDashboard = useCallback(async () => {
        if (!visible) {
            return;
        }

        setLoadingDashboard(true);
        try {
            const response = await authFetch("/api/admin/ai/drop-descriptions");
            const result = await response.json() as AdminAiDropDescriptionDashboard;
            if (!response.ok) {
                throw new Error("Failed to load AI description generation status");
            }

            setDashboard(result);
            setJobs(buildScopedJobs(result.recentJobs || [], dropId, draftSessionId));
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                severity: "warn",
                message: "AI drop description status fetch failed",
                error,
                detail: {
                    adminView: "create_drop_modal",
                    dropId: dropId || undefined,
                    draftSessionId: draftSessionId || undefined,
                },
                consoleLabel: "[AI Drop Description Panel] status fetch failed",
            });
        } finally {
            setLoadingDashboard(false);
        }
    }, [draftSessionId, dropId, visible]);

    useEffect(() => {
        if (!visible) {
            return;
        }

        void refreshDashboard();
    }, [refreshDashboard, visible]);

    useEffect(() => {
        if (!visible) {
            setClearedBeforeMs(null);
        }
    }, [visible]);

    const handleGenerate = useCallback(async () => {
        if (!titleReady || generating) {
            return;
        }

        setGenerating(true);
        setGenerationError(null);
        try {
            const response = await authFetch("/api/admin/ai/drop-descriptions/generate", {
                method: "POST",
                body: JSON.stringify({
                    title: title.trim(),
                    creatorId,
                    creatorName,
                    dropId,
                    draftSessionId,
                    previousJobId: visibleJobs[0]?.id || undefined,
                }),
            });
            const result = await response.json() as { error?: string; job?: AdminAiDropDescriptionJobRecord };
            if (!response.ok || !result.job) {
                throw new Error(result.error || "Description generation failed");
            }

            setJobs((current) => [result.job!, ...current.filter((job) => job.id !== result.job!.id)].slice(0, 8));
            toast.success("Description generated");
            void refreshDashboard();
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                message: "AI drop description generation failed",
                error,
                detail: {
                    adminView: "create_drop_modal",
                    title: title.trim(),
                    dropId: dropId || undefined,
                    draftSessionId: draftSessionId || undefined,
                },
                consoleLabel: "[AI Drop Description Panel] generation failed",
            });
            const message = error instanceof Error ? error.message : "Description generation failed";
            setGenerationError(message);
            toast.error(message);
        } finally {
            setGenerating(false);
        }
    }, [creatorId, creatorName, draftSessionId, dropId, generating, refreshDashboard, title, titleReady, visibleJobs]);

    const handleFeedback = useCallback(async (jobId: string, action: "like" | "dislike" | "accept") => {
        setFeedbackingJobId(jobId);
        try {
            const response = await authFetch("/api/admin/ai/drop-descriptions/feedback", {
                method: "POST",
                body: JSON.stringify({
                    jobId,
                    action,
                }),
            });
            const result = await response.json() as { error?: string; job?: AdminAiDropDescriptionJobRecord };
            if (!response.ok || !result.job) {
                throw new Error(result.error || "Description feedback update failed");
            }

            setJobs((current) => current.map((job) => job.id === jobId ? result.job! : job));

            if (action === "accept") {
                onSelectedJobChange(jobId);
                onApplyDescription(result.job);
                toast.success("Description applied");
            } else if (action === "like") {
                toast.success("Generation liked");
            } else {
                toast.success("Generation disliked");
            }

            void refreshDashboard();
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                message: "AI drop description feedback failed",
                error,
                detail: {
                    adminView: "create_drop_modal",
                    action,
                    jobId,
                },
                consoleLabel: "[AI Drop Description Panel] feedback failed",
            });
            toast.error(error instanceof Error ? error.message : "Description feedback failed");
        } finally {
            setFeedbackingJobId(null);
        }
    }, [onApplyDescription, onSelectedJobChange, refreshDashboard]);

    const clearHistory = useCallback(() => {
        const nowMs = Date.now();
        setClearedBeforeMs(nowMs);
        trackEvent("admin_ai_description_history_cleared", {
            source: "create_drop_modal",
            drop_id: dropId || "",
            draft_session_id: draftSessionId || "",
        });
        toast.success("Description history cleared for this modal");
    }, [draftSessionId, dropId]);

    if (!visible) {
        return null;
    }

    return (
        <div className="rounded-[1rem] border border-brand-purple/15 bg-brand-purple/[0.04] p-3">
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-purple" />
                    <span className="truncate text-sm font-semibold text-white">AI Description</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {dashboard ? (
                        <span className={cn("inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px]", runtimeTone(dashboard.runtime.status))}>
                            {dashboard.runtime.status === "ready" ? <Sparkles className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
                            {dashboard.runtime.status === "ready" ? "Ready" : dashboard.runtime.status === "disabled" ? "Off" : "Degraded"}
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => void handleGenerate()}
                    disabled={!featureEnabled || !runtimeReady || !titleReady || generating}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-brand-purple/25 bg-brand-purple/15 px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {visibleJobs.length > 0 ? "Generate again" : "Generate description"}
                </button>
                {visibleJobs.length > 0 ? (
                    <button
                        type="button"
                        onClick={clearHistory}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 text-sm font-semibold text-white"
                    >
                        <Trash2 className="h-4 w-4" />
                        Clear history
                    </button>
                ) : null}
            </div>

            {dashboard ? (
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-400">
                    <span>{dashboard.runtime.model}</span>
                    <span>|</span>
                    <span>{formatAdminAiUsd((dashboard.runtime.inputUsdPerMillion || 0) / 1_000_000)} in/token est.</span>
                    <span>|</span>
                    <span>{formatAdminAiUsd((dashboard.runtime.outputUsdPerMillion || 0) / 1_000_000)} out/token est.</span>
                </div>
            ) : null}

            {loadingDashboard && !dashboard ? (
                <div className="mt-3 rounded-[1rem] border border-white/10 bg-black/25 p-3 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading AI status...</span>
                </div>
            ) : null}

            {!titleReady ? <p className="mt-2 text-[11px] text-amber-200/80">Enter at least 3 title characters before generating.</p> : null}
            {generationError ? <div className="mt-3 rounded-[1rem] border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">{generationError}</div> : null}

            {visibleJobs.length > 0 ? (
                <div className="mt-3 space-y-2">
                    {visibleJobs.map((job) => {
                        const isSelected = selectedJobId === job.id;
                        const feedbackPending = feedbackingJobId === job.id;
                        const canUse = job.status === "succeeded" && typeof job.descriptionText === "string" && job.descriptionText.length > 0;

                        return (
                            <article
                                key={job.id}
                                className={cn(
                                    "rounded-[1rem] border p-3",
                                    isSelected ? "border-brand-purple/35 bg-brand-purple/[0.08]" : "border-white/10 bg-black/35",
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">{job.title}</p>
                                        <p className="mt-2 whitespace-pre-wrap text-sm text-white">{job.descriptionText || job.errorMessage || "Generating..."}</p>
                                        <p className="mt-1 text-[11px] text-gray-500">
                                            {job.model} | {job.latencyMs ? `${job.latencyMs} ms` : "Pending"} | {formatAdminAiUsd(job.estimatedCostUsd || 0)}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
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
                                        {isSelected ? "Applied" : "Use"}
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
