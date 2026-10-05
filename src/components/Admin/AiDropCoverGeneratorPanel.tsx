"use client";

import { DisclosureSummary } from "@/components/ui/disclosure";
import { Disclosure } from "@/components/ui/disclosure";
import { Button } from "@/components/ui/Button";


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
import { generateSecureClientId } from "@/lib/client-random";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";
import { buildCoverFeedbackNormalization } from "@/lib/ai-cover/cover-feedback-normalizer";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { CompactAiActionButton } from "@/components/Admin/CompactAiActionButton";
import { CompactAiModuleCard } from "@/components/Admin/CompactAiModuleCard";
import { CompactAiStatusChip } from "@/components/Admin/CompactAiStatusChip";

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

type GenerationProgress = {
    clientRequestId: string;
    startedAtMs: number;
    stage: "request_sent" | "running" | "saving";
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
            return fallback || "The configured AI image model is not available in the current runtime location.";
        case "provider_unavailable":
            return fallback || "The image provider is unavailable right now.";
        case "provider_timeout":
            return fallback || "The image provider ended the request before the cover finished rendering.";
        case "storage_failed":
            return fallback || "The cover rendered, but KandyDrops could not save the image file.";
        case "database_failed":
            return fallback || "The AI cover job could not be recorded or finalized.";
        case "runtime_unavailable":
            return fallback || "AI cover generation is unavailable because a required runtime dependency is not ready.";
        case "feature_disabled":
            return fallback || "AI cover generation is turned off.";
        default:
            return fallback || "Cover generation failed";
    }
}

function getAdminAiCoverSafeErrorMessage(error: unknown, fallback: string) {
    const safeError = sanitizeErrorForUser(error, "admin_truth", "admin_truth_unavailable");
    return safeError.errorKey === "unknown_error" ? fallback : safeError.operatorMessage;
}

function StatusPill({ status }: { status: AdminAiDropCoverJobRecord["status"] }) {
    const toneClassName = status === "succeeded"
        ? "border-success/20 bg-success/10 text-success"
        : status === "failed"
            ? "border-destructive/20 bg-destructive/10 text-destructive"
            : "border-info/20 bg-info/10 text-info";

    const label = status === "succeeded" ? "Ready" : status === "failed" ? "Failed" : "Generating";

    return (
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold", toneClassName)}>
            {status === "running" ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
            {label}
        </span>
    );
}

function formatElapsed(ms: number) {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return minutes > 0 ? `${minutes}m ${String(remainder).padStart(2, "0")}s` : `${remainder}s`;
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
    const [activeProgress, setActiveProgress] = useState<GenerationProgress | null>(null);
    const [elapsedNowMs, setElapsedNowMs] = useState(() => Date.now());

    const titleReady = title.trim().length >= 3;
    const featureEnabled = dashboard?.settings.enabled === true;
    const runtimeReady = dashboard?.runtime.status === "ready";
    const referenceGuided = dashboard?.settings.generationMode === "reference_guided";
    const modelOptions = useMemo(() => getAdminAiDropCoverSelectableModelOptions(), []);
    const visibleJobs = useMemo(
        () => jobs.filter((job) => clearedBeforeMs === null || job.requestedAtMs > clearedBeforeMs),
        [clearedBeforeMs, jobs],
    );
    const selectedModelOption = useMemo(
        () => getAdminAiDropCoverModelOption(selectedModel) || modelOptions[0],
        [modelOptions, selectedModel],
    );
    const activeRunningJob = useMemo(() => {
        if (!activeProgress) {
            return null;
        }
        return jobs.find((job) => job.clientRequestId === activeProgress.clientRequestId)
            || jobs.find((job) => job.status === "running" && job.requestedAtMs >= activeProgress.startedAtMs - 2_000)
            || null;
    }, [activeProgress, jobs]);

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
                    adminView: "admin_drop_action_panel",
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

    useEffect(() => {
        if (!activeProgress) {
            return;
        }

        const intervalId = window.setInterval(() => {
            setElapsedNowMs(Date.now());
            void refreshDashboard();
        }, 1_000);

        return () => window.clearInterval(intervalId);
    }, [activeProgress, refreshDashboard]);

    const handleGenerate = useCallback(async (previousJobId?: string | null) => {
        if (!titleReady || generating) {
            return;
        }

        setGenerating(true);
        setGenerationError(null);
        const clientRequestId = `cover-${Date.now()}-${generateSecureClientId()}`;
        setActiveProgress({
            clientRequestId,
            startedAtMs: Date.now(),
            stage: "request_sent",
        });
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
                    clientRequestId,
                    requestedModel: selectedModel,
                }),
            });
            setActiveProgress((current) => current?.clientRequestId === clientRequestId
                ? { ...current, stage: "saving" }
                : current);
            const result = await response.json() as {
                error?: string;
                errorCode?: AdminAiDropCoverErrorCode;
                job?: AdminAiDropCoverJobRecord;
                referenceLimitApplied?: boolean;
                requestedReferenceCount?: number;
                usedReferenceCount?: number;
                maxReferenceCount?: number;
                droppedReferenceCount?: number;
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
                    adminView: "admin_drop_action_panel",
                    title: title.trim(),
                    requestedModel: selectedModel,
                    previousJobId: previousJobId || undefined,
                    dropId: dropId || undefined,
                    draftSessionId: draftSessionId || undefined,
                },
                consoleLabel: "[AI Drop Cover Panel] generation failed",
            });
            const message = getAdminAiCoverSafeErrorMessage(error, "Cover generation failed");
            setGenerationError(message);
            toast.error(message);
        } finally {
            setGenerating(false);
            setActiveProgress(null);
        }
    }, [creatorId, creatorName, draftSessionId, dropId, dropType, generating, refreshDashboard, selectedModel, selectedModelOption.maxReferenceInputs, tags, title, titleReady]);

    const handleFeedback = useCallback(async (jobId: string, action: "like" | "dislike" | "accept") => {
        const sourceJob = jobs.find((job) => job.id === jobId) || null;
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
                const inferred = sourceJob
                    ? buildCoverFeedbackNormalization({
                        action: "dislike",
                        title: sourceJob.title,
                        creatorId: sourceJob.creatorId || undefined,
                        creatorName: sourceJob.creatorName || undefined,
                        dropId: sourceJob.dropId || undefined,
                        feedback: sourceJob.feedback,
                        accepted: sourceJob.accepted,
                        workingPrompt: sourceJob.workingPrompt,
                        optimizerAdjustedPrompt: sourceJob.optimizerAdjustedPrompt,
                        providerEnhancedPrompt: sourceJob.providerEnhancedPrompt,
                        referenceAssets: sourceJob.referenceAssets,
                    })
                    : null;
                toast.success(inferred?.nextToastMessage || "Generation disliked");
            }

            void refreshDashboard();
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                message: "AI drop cover feedback failed",
                error,
                detail: {
                    adminView: "admin_drop_action_panel",
                    action,
                    jobId,
                },
                consoleLabel: "[AI Drop Cover Panel] feedback failed",
            });
            toast.error(getAdminAiCoverSafeErrorMessage(error, "Cover feedback failed"));
        } finally {
            setFeedbackingJobId(null);
        }
    }, [jobs, onApplyCover, onSelectedJobChange, refreshDashboard]);

    const clearHistory = useCallback(() => {
        const nowMs = Date.now();
        setClearedBeforeMs(nowMs);
        trackEvent("admin_ai_cover_history_cleared", {
            source: "admin_drop_action_panel",
            drop_id: dropId || "",
            draft_session_id: draftSessionId || "",
        });
        toast.success("Cover history cleared for this drop draft");
    }, [draftSessionId, dropId]);

    const runtimeTone = useMemo(() => {
        switch (dashboard?.runtime.status) {
            case "ready":
                return "border-success/20 bg-success/10 text-success";
            case "disabled":
                return "border-border bg-secondary text-foreground";
            default:
                return "border-warning/20 bg-warning/10 text-warning";
        }
    }, [dashboard?.runtime.status]);

    if (!visible) {
        return null;
    }

    return (
        <CompactAiModuleCard
            title="Cover"
            defaultOpen
            statusChip={<CompactAiStatusChip label={dashboard?.runtime.status === "ready" ? "Ready" : "Needs review"} tone={dashboard?.runtime.status === "ready" ? "good" : "warn"} />}
            className="border-primary/15 bg-primary/[0.04]"
        >
        <div data-cover-prompt-source="deterministic-compiler" data-cover-title-source="title-prefix">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Sparkles className="h-4 w-4 text-primary" />
                        AI Cover Generation
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {dashboard ? (
                        <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", runtimeTone)}>
                            {dashboard.runtime.status === "ready" ? <Sparkles className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
                            {dashboard.runtime.status === "ready" ? "Ready" : dashboard.runtime.status === "disabled" ? "Off" : "Needs review"}
                        </span>
                    ) : null}
                    {dashboard?.settings ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/25 px-3 py-1 text-xs text-muted-foreground">
                            {formatAdminAiUsd(selectedModelOption.pricePerGenerationUsd)} / gen
                        </span>
                    ) : null}
                </div>
            </div>

            {featureEnabled && runtimeReady ? (
                <div className="mt-3 flex flex-wrap gap-2">
                    <CompactAiActionButton
                        type="button"
                        onClick={() => void handleGenerate(null)}
                        disabled={!titleReady || generating}
                        className="h-9 border-primary/25 bg-primary/15 px-3 text-xs"
                    >
                        {generating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" />}
                        Generate cover
                    </CompactAiActionButton>
                    <div className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border bg-background/35 p-1">
                        {modelOptions.map((option) => {
                            const isActive = option.id === selectedModel;
                            return (
                                <Button variant="ghost"
                                    key={option.id}
                                    type="button"
                                    onClick={() => setSelectedModel(option.id)}
                                    disabled={generating}
                                    aria-pressed={isActive}
                                    title={`${option.label} | ${formatAdminAiUsd(option.pricePerGenerationUsd)} per image`}
                                    className={cn(
                                        "inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold transition disabled:opacity-50",
                                        isActive ? "bg-primary text-foreground" : "text-muted-foreground hover:bg-secondary",
                                    )}
                                >
                                    {option.shortLabel}
                                    {option.launchStage === "preview" ? (
                                        <span className="rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-foreground/80">
                                            Preview
                                        </span>
                                    ) : null}
                                </Button>
                            );
                        })}
                    </div>
                    {visibleJobs.length > 0 ? (
                        <>
                            <Button variant="ghost"
                                type="button"
                                onClick={() => void handleGenerate(visibleJobs[0]?.id || null)}
                                disabled={!titleReady || generating}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-background/35 px-4 text-sm font-semibold text-foreground disabled:opacity-50"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Regenerate
                            </Button>
                            <Button variant="ghost"
                                type="button"
                                onClick={clearHistory}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-background/35 px-4 text-sm font-semibold text-foreground"
                            >
                                <Trash2 className="h-4 w-4" />
                                Clear history
                            </Button>
                        </>
                    ) : null}
                </div>
            ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                        href="/admin/ai"
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-background/35 px-4 text-sm font-semibold text-foreground"
                    >
                        Open Admin AI
                    </Link>
                </div>
            )}

            {!titleReady ? (
                <p className="mt-2 text-[11px] text-warning/80">Enter at least 3 title characters before generating a cover.</p>
            ) : null}

            {dashboard && !loadingDashboard ? (
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span>{selectedModelOption.label}</span>
                    <span>|</span>
                    <span>{formatAdminAiUsd(selectedModelOption.pricePerGenerationUsd)} / image</span>
                </div>
            ) : null}

            {featureEnabled && runtimeReady && referenceGuided ? (
                <Disclosure className="mt-2 overflow-hidden rounded-[0.9rem] border border-border bg-background/20">
                    <DisclosureSummary className="cursor-pointer list-none px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:bg-secondary">
                        Debug notes
                    </DisclosureSummary>
                    <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
                        Reference pool trimmed to model limit.
                    </div>
                </Disclosure>
            ) : null}

            {loadingDashboard && !dashboard ? (
                <div className="mt-3 rounded-[1rem] border border-border bg-background/30 p-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        Loading AI status...
                    </span>
                </div>
            ) : null}

            {activeProgress ? (
                <div className="mt-3 rounded-[1rem] border border-info/20 bg-info/10 p-3 text-sm text-info">
                    <div className="flex flex-wrap items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        <span>
                            {activeRunningJob?.status === "running"
                                ? "Running"
                                : activeProgress.stage === "saving"
                                    ? "Saving"
                                    : "Request sent"}
                        </span>
                        <span className="text-info/70">Elapsed {formatElapsed(elapsedNowMs - activeProgress.startedAtMs)}</span>
                    </div>
                    <p className="mt-1 text-xs text-info/70">
                        {activeRunningJob ? `Job ${activeRunningJob.id}` : "Waiting for the job record to appear."}
                    </p>
                </div>
            ) : null}

            {generationError ? (
                <div className="mt-3 rounded-[1rem] border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
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
                                    "overflow-hidden rounded-[1.2rem] border bg-background/35",
                                    isSelected ? "border-primary/35" : "border-border",
                                )}
                            >
                                <div className="relative aspect-square overflow-hidden bg-background">
                                    {job.imageUrl ? (
                                        <Image src={job.imageUrl} alt={job.title} fill sizes="(max-width: 840px) 50vw, 240px" className="object-cover" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                            {job.status === "failed" ? "Generation failed" : "Rendering..."}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-foreground">{job.title}</p>
                                            <p className="mt-1 text-[11px] text-muted-foreground">
                                                {getAdminAiDropCoverModelOption(job.model)?.label || job.model}
                                            </p>
                                        </div>
                                        <StatusPill status={job.status} />
                                    </div>

                                    {job.errorMessage ? <p className="text-[11px] text-destructive">{job.errorMessage}</p> : null}

                                    <div className="flex flex-wrap gap-2">
                                        <CompactAiActionButton
                                            type="button"
                                            onClick={() => void handleFeedback(job.id, "like")}
                                            disabled={!canUse || feedbackPending}
                                            className={cn(
                                                "h-9 gap-1 px-3 text-[11px] disabled:opacity-45",
                                                job.feedback === "liked" ? "border-success/20 bg-success/10" : "border-border bg-background/35",
                                            )}
                                        >
                                            <ThumbsUp className="h-3.5 w-3.5" />
                                            Like
                                        </CompactAiActionButton>
                                        <CompactAiActionButton
                                            type="button"
                                            onClick={() => void handleFeedback(job.id, "dislike")}
                                            disabled={!canUse || feedbackPending}
                                            className={cn(
                                                "h-9 gap-1 px-3 text-[11px] disabled:opacity-45",
                                                job.feedback === "disliked" ? "border-destructive/20 bg-destructive/10" : "border-border bg-background/35",
                                            )}
                                        >
                                            <ThumbsDown className="h-3.5 w-3.5" />
                                            Dislike
                                        </CompactAiActionButton>
                                        <CompactAiActionButton
                                            type="button"
                                            onClick={() => void handleFeedback(job.id, "accept")}
                                            disabled={!canUse || feedbackPending}
                                            className={cn(
                                                "h-9 gap-1 px-3 text-[11px] disabled:opacity-45",
                                                isSelected ? "border-primary/30 bg-primary/20" : "border-border bg-background/35",
                                            )}
                                        >
                                            {feedbackPending && selectedJobId !== job.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" />}
                                            {isSelected ? "Cover selected" : "Use as cover"}
                                        </CompactAiActionButton>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : null}
        </div>
        </CompactAiModuleCard>
    );
}
