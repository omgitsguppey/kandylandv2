"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Loader2, RefreshCw, Sparkles, ThumbsDown, ThumbsUp, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import {
    ADMIN_AI_DROP_COVER_MODEL,
    formatAdminAiUsd,
    getAdminAiDropCoverModelOption,
    getAdminAiDropCoverSelectableModelOptions,
    type AdminAiDropCoverErrorCode,
    type AdminAiDropCoverJobRecord,
    type AdminAiDropCoverRuntimeStatus,
    type AdminAiDropCoverSelectableModel,
} from "@/lib/ai-drop-covers";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

type AdminAiDropCoverDashboard = {
    settings: {
        enabled: boolean;
        model: string;
        location: string;
        pricePerGenerationUsd: number;
        generationMode: "standard" | "reference_guided";
        useTemplateReference: boolean;
        useRecentDropCoverReferences: boolean;
    };
    runtime: {
        enabled: boolean;
        status: AdminAiDropCoverRuntimeStatus;
        note: string;
        generationMode: "standard" | "reference_guided";
    };
    recentJobs: AdminAiDropCoverJobRecord[];
};

interface AiDropCoverGeneratorPanelProps {
    visible: boolean;
    title: string;
    creatorId?: string | null;
    creatorName?: string | null;
    dropId?: string | null;
    draftSessionId?: string | null;
    dropType?: string | null;
    tags?: string[];
    selectedJobId?: string | null;
    onApplyCover: (job: AdminAiDropCoverJobRecord) => void;
    onSelectedJobChange: (jobId: string | null) => void;
}

function buildScopedJobs(
    allJobs: AdminAiDropCoverJobRecord[],
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

function getGenerationErrorMessage(errorCode?: AdminAiDropCoverErrorCode, fallback?: string) {
    switch (errorCode) {
        case "draft_session_required":
            return "This draft could not be identified. Close and reopen Create Drop, then try AI cover generation again.";
        case "model_location_unavailable":
            return fallback || "The configured AI image model is not available to this project in the current Vertex location.";
        case "provider_unavailable":
            return fallback || "The Vertex image provider is unavailable right now.";
        case "provider_timeout":
            return fallback || "The image provider ended the request before the cover finished rendering.";
        case "storage_failed":
            return fallback || "The cover rendered, but KandyDrops could not save it to Firebase Storage.";
        case "database_failed":
            return fallback || "The AI cover job could not be recorded or finalized in Firebase.";
        case "runtime_unavailable":
            return fallback || "AI cover generation is unavailable because a required runtime dependency is not ready.";
        case "feature_disabled":
            return fallback || "AI cover generation is turned off.";
        default:
            return fallback || "Cover generation failed";
    }
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
    draftSessionId,
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
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState<AdminAiDropCoverSelectableModel>(ADMIN_AI_DROP_COVER_MODEL);
    const [clearedBeforeMs, setClearedBeforeMs] = useState<number | null>(null);

    const titleReady = title.trim().length >= 3;
    const featureEnabled = dashboard?.settings.enabled === true;
    const runtimeReady = dashboard?.runtime.status === "ready";
    const modelOptions = useMemo(() => getAdminAiDropCoverSelectableModelOptions(), []);
    const visibleJobs = useMemo(
        () => jobs.filter((job) => clearedBeforeMs === null || job.requestedAtMs > clearedBeforeMs),
        [clearedBeforeMs, jobs],
    );
    const selectedModelOption = useMemo(
        () => getAdminAiDropCoverModelOption(selectedModel) || modelOptions[0],
        [modelOptions, selectedModel],
    );

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
            setJobs(buildScopedJobs(result.recentJobs || [], dropId, draftSessionId));
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                severity: "warn",
                message: "AI drop cover status fetch failed",
                error,
                detail: {
                    adminView: "create_drop_modal",
                    dropId: dropId || undefined,
                    draftSessionId: draftSessionId || undefined,
                },
                consoleLabel: "[AI Drop Cover Panel] status fetch failed",
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
        if (!dashboard?.settings.model) {
            return;
        }

        const dashboardModel = getAdminAiDropCoverModelOption(dashboard.settings.model);
        if (dashboardModel) {
            setSelectedModel(dashboardModel.id);
        }
    }, [dashboard?.settings.model]);

    useEffect(() => {
        if (!visible) {
            setClearedBeforeMs(null);
        }
    }, [visible]);

    const handleGenerate = useCallback(async (previousJobId?: string | null) => {
        if (!titleReady || generating) {
            return;
        }

        setGenerating(true);
        setGenerationError(null);
        try {
            const response = await authFetch("/api/admin/ai/drop-covers/generate", {
                method: "POST",
                body: JSON.stringify({
                    title: title.trim(),
                    creatorId,
                    creatorName,
                    dropId,
                    draftSessionId,
                    dropType,
                    tags,
                    previousJobId: previousJobId || undefined,
                    requestedModel: selectedModel,
                }),
            });
            const result = await response.json() as {
                error?: string;
                errorCode?: AdminAiDropCoverErrorCode;
                job?: AdminAiDropCoverJobRecord;
            };
            if (!response.ok || !result.job) {
                throw new Error(getGenerationErrorMessage(result.errorCode, result.error || "Cover generation failed"));
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
                    requestedModel: selectedModel,
                    previousJobId: previousJobId || undefined,
                    dropId: dropId || undefined,
                    draftSessionId: draftSessionId || undefined,
                },
                consoleLabel: "[AI Drop Cover Panel] generation failed",
            });
            const message = error instanceof Error ? error.message : "Cover generation failed";
            setGenerationError(message);
            toast.error(message);
        } finally {
            setGenerating(false);
        }
    }, [creatorId, creatorName, draftSessionId, dropId, dropType, generating, refreshDashboard, selectedModel, tags, title, titleReady]);

    const handleFeedback = useCallback(async (jobId: string, action: "like" | "dislike" | "accept") => {
        setFeedbackingJobId(jobId);
        try {
            const response = await authFetch("/api/admin/ai/drop-covers/feedback", {
                method: "POST",
                body: JSON.stringify({ jobId, action }),
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

    const clearHistory = useCallback(() => {
        const nowMs = Date.now();
        setClearedBeforeMs(nowMs);
        trackEvent("admin_ai_cover_history_cleared", {
            source: "create_drop_modal",
            drop_id: dropId || "",
            draft_session_id: draftSessionId || "",
        });
        toast.success("Cover history cleared for this modal");
    }, [draftSessionId, dropId]);

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
                            {formatAdminAiUsd(selectedModelOption.pricePerGenerationUsd)} / gen
                        </span>
                    ) : null}
                </div>
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
                    <div className="inline-flex min-h-11 items-center gap-1 rounded-full border border-white/10 bg-black/35 p-1">
                        {modelOptions.map((option) => {
                            const isActive = option.id === selectedModel;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setSelectedModel(option.id)}
                                    disabled={generating}
                                    aria-pressed={isActive}
                                    title={`${option.label} | ${formatAdminAiUsd(option.pricePerGenerationUsd)} per image`}
                                    className={cn(
                                        "inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold transition disabled:opacity-50",
                                        isActive ? "bg-brand-purple text-white" : "text-gray-300 hover:bg-white/5",
                                    )}
                                >
                                    {option.shortLabel}
                                    {option.launchStage === "preview" ? (
                                        <span className="rounded-full border border-white/15 bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/80">
                                            Preview
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                    {visibleJobs.length > 0 ? (
                        <>
                            <button
                                type="button"
                                onClick={() => void handleGenerate(visibleJobs[0]?.id || null)}
                                disabled={!titleReady || generating}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Regenerate
                            </button>
                            <button
                                type="button"
                                onClick={clearHistory}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 text-sm font-semibold text-white"
                            >
                                <Trash2 className="h-4 w-4" />
                                Clear history
                            </button>
                        </>
                    ) : null}
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

            {dashboard && !loadingDashboard ? (
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500">
                    <span>{selectedModelOption.label}</span>
                    <span>|</span>
                    <span>{formatAdminAiUsd(selectedModelOption.pricePerGenerationUsd)} / image</span>
                    {dashboard.runtime.note ? (
                        <>
                            <span>|</span>
                            <span>{dashboard.runtime.note}</span>
                        </>
                    ) : null}
                </div>
            ) : null}

            {loadingDashboard && !dashboard ? (
                <div className="mt-3 rounded-[1rem] border border-white/10 bg-black/30 p-3 text-xs text-gray-300">
                    <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading AI status...
                    </span>
                </div>
            ) : null}

            {generating ? (
                <div className="mt-3 rounded-[1rem] border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating a new cover with {selectedModelOption.label} from the current drop title...
                    </div>
                </div>
            ) : null}

            {generationError ? (
                <div className="mt-3 rounded-[1rem] border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
                    {generationError}
                </div>
            ) : null}

            {visibleJobs.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {visibleJobs.map((job) => {
                        const isSelected = selectedJobId === job.id;
                        const feedbackPending = feedbackingJobId === job.id;
                        const canUse = job.status === "succeeded" && typeof job.imageUrl === "string" && job.imageUrl.length > 0;

                        return (
                            <article
                                key={job.id}
                                className={cn(
                                    "overflow-hidden rounded-[1.2rem] border bg-black/35",
                                    isSelected ? "border-brand-purple/35" : "border-white/10",
                                )}
                            >
                                <div className="relative aspect-square overflow-hidden bg-black">
                                    {job.imageUrl ? (
                                        <Image src={job.imageUrl} alt={job.title} fill sizes="(max-width: 768px) 50vw, 240px" className="object-cover" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-xs text-gray-500">
                                            {job.status === "failed" ? "Generation failed" : "Rendering..."}
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
                                            <p className="mt-1 text-[11px] text-gray-500">
                                                {getAdminAiDropCoverModelOption(job.model)?.label || job.model}
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
