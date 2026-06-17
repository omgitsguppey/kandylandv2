"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Check, Loader2, Power, RefreshCw, Sparkles, ThumbsDown, ThumbsUp, WandSparkles } from "lucide-react";
import { toast } from "sonner";

import { AdminDashboardModule } from "@/components/Admin/AdminDashboardModule";
import { Button } from "@/components/ui/Button";
import { MarqueeText } from "@/components/ui/MarqueeText";
import { useAuth } from "@/context/AuthContext";
import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import {
    formatAdminAiUsd,
    type AdminAiDropDescriptionFeedback,
    type AdminAiDropDescriptionJobRecord,
    type AdminAiDropDescriptionPromptPolicy,
    type AdminAiDropDescriptionPromptPolicyHistoryEntry,
    type AdminAiDropDescriptionRuntimeStatus,
} from "@/lib/ai-drop-descriptions";
import { isAdminUiTestSessionUser } from "@/lib/admin/admin-ui-test-session";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";
import { cn } from "@/lib/utils";

type AdminAiDropDescriptionDashboard = {
    refreshedAtMs: number;
    settings: {
        enabled: boolean;
        model: string;
        location: string;
        optimizerModel: string;
        optimizerEnabled: boolean;
        priceSourceUrl: string;
        priceBasis: string;
        inputUsdPerMillion: number;
        outputUsdPerMillion: number;
    };
    runtime: {
        enabled: boolean;
        status: AdminAiDropDescriptionRuntimeStatus;
        note: string;
        project: string;
        location: string;
        model: string;
        resolvedModel?: string | null;
        priceSourceUrl: string;
        priceBasis: string;
        inputUsdPerMillion: number;
        outputUsdPerMillion: number;
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
        lastSuccessAtMs?: number | null;
        lastFailureAtMs?: number | null;
    };
    recentJobs: AdminAiDropDescriptionJobRecord[];
    promptPolicy: AdminAiDropDescriptionPromptPolicy;
    promptPolicyHistory: AdminAiDropDescriptionPromptPolicyHistoryEntry[];
    reviewGallery: Array<{
        id: string;
        title: string;
        descriptionText: string;
        feedback: AdminAiDropDescriptionFeedback;
        status: AdminAiDropDescriptionJobRecord["status"];
        requestedAtMs: number;
        model: string;
        accepted: boolean;
    }>;
};

type AdminUiPreferencesResponse = {
    preferences?: {
        collapsedModules?: Record<string, boolean>;
    };
};

const MODULE_DEFAULTS = {
    "admin_ai_desc.runtime": true,
    "admin_ai_desc.prompt": true,
    "admin_ai_desc.recent": true,
    "admin_ai_desc.gallery": true,
} as const;

const ADMIN_AI_DESCRIPTION_SNAPSHOT_REFRESH_INTERVAL_MS = 0;
const ADMIN_AI_DESCRIPTION_NO_SOURCE_VALUE = "No source";
const ADMIN_AI_DESCRIPTION_NO_VERIFIED_RUNS_VALUE = "No verified runs";

type ModuleKey = keyof typeof MODULE_DEFAULTS;
type GalleryFilter = "all" | "accepted" | "liked" | "neutral" | "disliked" | "failed";

function formatTimestamp(value?: number | null) {
    if (!value) {
        return "Not recorded";
    }
    return new Date(value).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function formatSnapshotNumber(value: number | null | undefined, hasSnapshot: boolean) {
    if (!hasSnapshot) {
        return ADMIN_AI_DESCRIPTION_NO_SOURCE_VALUE;
    }
    return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "Not recorded";
}

function formatSnapshotPercent(value: number | null | undefined, hasSnapshot: boolean) {
    if (!hasSnapshot) {
        return ADMIN_AI_DESCRIPTION_NO_SOURCE_VALUE;
    }
    return typeof value === "number" && Number.isFinite(value) ? `${value}%` : ADMIN_AI_DESCRIPTION_NO_VERIFIED_RUNS_VALUE;
}

function formatSnapshotUsd(value: number | null | undefined, hasSnapshot: boolean) {
    if (!hasSnapshot) {
        return ADMIN_AI_DESCRIPTION_NO_SOURCE_VALUE;
    }
    return typeof value === "number" && Number.isFinite(value) ? formatAdminAiUsd(value) : "Not recorded";
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

function MetricCard({
    label,
    value,
    meta,
    tone = "neutral",
}: {
    label: string;
    value: string | number;
    meta?: string;
    tone?: "neutral" | "good" | "warn";
}) {
    const toneClassName = tone === "good"
        ? "border-emerald-400/20 bg-emerald-500/10"
        : tone === "warn"
            ? "border-amber-400/20 bg-amber-500/10"
            : "border-white/10 bg-white/[0.04]";

    return (
        <div className={cn("min-w-0 overflow-hidden rounded-[1rem] border p-3", toneClassName)}>
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">{label}</p>
            <div className="mt-1 break-words text-xl font-black text-white">{value}</div>
            {meta ? <p className="mt-1 break-words text-xs text-gray-400">{meta}</p> : null}
        </div>
    );
}

function TextAreaBlock({
    label,
    value,
    rows,
    onChange,
    readOnly = false,
}: {
    label: string;
    value: string;
    rows: number;
    onChange?: (value: string) => void;
    readOnly?: boolean;
}) {
    return (
        <label className="block space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{label}</div>
            <textarea
                value={value}
                onChange={(event) => onChange?.(event.target.value)}
                rows={rows}
                readOnly={readOnly}
                className={cn(
                    "w-full rounded-[1rem] border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none transition focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/40",
                    readOnly ? "cursor-default text-gray-300" : "",
                )}
            />
        </label>
    );
}

function buildGalleryDescription(item: AdminAiDropDescriptionDashboard["reviewGallery"][number]) {
    if (item.status === "failed") {
        return item.descriptionText || "Generation failed before text was returned.";
    }
    return item.descriptionText || "No description text stored.";
}

function getAdminAiDescriptionSafeErrorMessage(issue: unknown, fallback: string) {
    const safeError = sanitizeErrorForUser(issue, "admin_truth", "admin_truth_unavailable");
    return safeError.errorKey === "unknown_error" ? fallback : safeError.operatorMessage;
}

export function AdminAiDescriptionOperations({ compact = false }: { compact?: boolean } = {}) {
    const { user } = useAuth();
    const isLocalAdminUiTestSession = isAdminUiTestSessionUser(user);
    const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>("all");
    const [moduleOpenState, setModuleOpenState] = useState<Record<ModuleKey, boolean>>(MODULE_DEFAULTS);
    const [policyDirty, setPolicyDirty] = useState(false);
    const [savingPolicy, setSavingPolicy] = useState(false);
    const [updatingSettings, setUpdatingSettings] = useState(false);
    const [feedbackingJobId, setFeedbackingJobId] = useState<string | null>(null);
    const [policyDraft, setPolicyDraft] = useState({
        baseInstructionPrompt: "",
        lockedClauses: "",
        mutableClauses: "",
        currentMutablePrompt: "",
        autoOptimize: true,
    });
    const preferencesHydratedRef = useRef(false);

    const { data, error, isLoading, mutate } = useAdminPollingSWR<AdminAiDropDescriptionDashboard>(isLocalAdminUiTestSession ? null : "/api/admin/ai/drop-descriptions", ADMIN_AI_DESCRIPTION_SNAPSHOT_REFRESH_INTERVAL_MS, {
        keepPreviousData: true,
    });
    const { data: uiPreferencesData } = useAdminPollingSWR<AdminUiPreferencesResponse>(isLocalAdminUiTestSession ? null : "/api/admin/ui/preferences", ADMIN_AI_DESCRIPTION_SNAPSHOT_REFRESH_INTERVAL_MS, {
        keepPreviousData: true,
    });

    useEffect(() => {
        const collapsedModules = uiPreferencesData?.preferences?.collapsedModules;
        if (!collapsedModules || preferencesHydratedRef.current) {
            return;
        }

        preferencesHydratedRef.current = true;
        setModuleOpenState({
            "admin_ai_desc.runtime": collapsedModules["admin_ai_desc.runtime"] === true ? false : MODULE_DEFAULTS["admin_ai_desc.runtime"],
            "admin_ai_desc.prompt": collapsedModules["admin_ai_desc.prompt"] === true ? false : MODULE_DEFAULTS["admin_ai_desc.prompt"],
            "admin_ai_desc.recent": collapsedModules["admin_ai_desc.recent"] === true ? false : MODULE_DEFAULTS["admin_ai_desc.recent"],
            "admin_ai_desc.gallery": collapsedModules["admin_ai_desc.gallery"] === true ? false : MODULE_DEFAULTS["admin_ai_desc.gallery"],
        });
    }, [uiPreferencesData?.preferences?.collapsedModules]);

    useEffect(() => {
        if (!data?.promptPolicy || policyDirty) {
            return;
        }

        setPolicyDraft({
            baseInstructionPrompt: data.promptPolicy.baseInstructionPrompt,
            lockedClauses: data.promptPolicy.lockedClauses.join("\n"),
            mutableClauses: data.promptPolicy.mutableClauses.join("\n"),
            currentMutablePrompt: data.promptPolicy.currentMutablePrompt,
            autoOptimize: data.promptPolicy.autoOptimize,
        });
    }, [data?.promptPolicy, policyDirty]);

    const latestResolvedModel = useMemo(
        () => data?.recentJobs.find((job) => typeof job.resolvedModel === "string" && job.resolvedModel.trim().length > 0)?.resolvedModel || data?.runtime.resolvedModel || null,
        [data?.recentJobs, data?.runtime.resolvedModel],
    );
    const hasDashboardSnapshot = Boolean(data);
    const acceptanceRate = useMemo(() => {
        const total = data?.aggregate.generationCount || 0;
        if (total <= 0) {
            return null;
        }
        return Math.round(((data?.aggregate.acceptedCount || 0) / total) * 100);
    }, [data?.aggregate.acceptedCount, data?.aggregate.generationCount]);
    const currentPolicyJobs = useMemo(
        () => (data?.recentJobs || []).filter((job) => job.promptPolicyVersion === data?.promptPolicy.version),
        [data?.recentJobs, data?.promptPolicy.version],
    );
    const currentPolicyAcceptanceRate = useMemo(() => {
        if (currentPolicyJobs.length === 0) {
            return null;
        }
        return Math.round((currentPolicyJobs.filter((job) => job.accepted).length / currentPolicyJobs.length) * 100);
    }, [currentPolicyJobs]);
    const filteredGallery = useMemo(() => {
        const items = data?.reviewGallery || [];
        if (galleryFilter === "all") {
            return items;
        }
        return items.filter((item) => {
            if (galleryFilter === "accepted") return item.accepted;
            if (galleryFilter === "liked") return item.feedback === "liked";
            if (galleryFilter === "neutral") return item.feedback === "neutral";
            if (galleryFilter === "disliked") return item.feedback === "disliked";
            if (galleryFilter === "failed") return item.status === "failed";
            return true;
        });
    }, [data?.reviewGallery, galleryFilter]);
    const configuredAliasValue = data?.settings.model || ADMIN_AI_DESCRIPTION_NO_SOURCE_VALUE;
    const configuredAliasMeta = data?.settings.priceBasis || "No price basis";
    const runtimeVersionValue = latestResolvedModel || "Not exposed";
    const runtimeVersionMeta = data?.runtime.note || "No runtime note";
    const acceptanceRateValue = formatSnapshotPercent(acceptanceRate, hasDashboardSnapshot);
    const acceptanceRateMeta = data
        ? `${formatSnapshotNumber(data.aggregate.acceptedCount, true)} accepted`
        : "No acceptance source loaded";
    const averageLatencyValue = data?.aggregate.averageLatencyMs
        ? `${data.aggregate.averageLatencyMs} ms`
        : "Not recorded";
    const averageLatencyMeta = `Last success ${formatTimestamp(data?.aggregate.lastSuccessAtMs)}`;
    const promptPolicyValue = data ? `v${data.promptPolicy.version}` : ADMIN_AI_DESCRIPTION_NO_SOURCE_VALUE;
    const promptPolicyMeta = data && currentPolicyAcceptanceRate !== null
        ? `${currentPolicyAcceptanceRate}% accepted on this version`
        : data
            ? ADMIN_AI_DESCRIPTION_NO_VERIFIED_RUNS_VALUE
            : "No policy source loaded";
    const estimatedCostValue = formatSnapshotUsd(
        data?.aggregate.totalEstimatedCostUsd,
        hasDashboardSnapshot,
    );
    const estimatedCostMeta = data
        ? `${formatSnapshotUsd(data.settings.inputUsdPerMillion / 1_000_000, true)}/input token est.`
        : "No cost source loaded";

    const persistModuleState = (key: ModuleKey, nextOpen: boolean) => {
        setModuleOpenState((current) => ({ ...current, [key]: nextOpen }));
        if (isLocalAdminUiTestSession) {
            return;
        }
        void (async () => {
            try {
                await authFetch("/api/admin/ui/preferences", {
                    method: "PUT",
                    body: JSON.stringify({
                        key,
                        collapsed: !nextOpen,
                    }),
                });
            } catch (issue) {
                reportClientIssue({
                    channel: "ui",
                    severity: "warn",
                    message: "Admin AI description module preference save failed",
                    error: issue,
                    detail: { adminView: "admin_ai_page", moduleKey: key, nextOpen },
                    consoleLabel: "[Admin AI Description] module preference save failed",
                });
            }
        })();
    };

    const updateSettings = async (patch: Record<string, unknown>, successMessage: string) => {
        if (isLocalAdminUiTestSession) {
            toast.error("Description operations require a real admin session");
            return;
        }
        setUpdatingSettings(true);
        try {
            const response = await authFetch("/api/admin/ai/drop-descriptions", {
                method: "PUT",
                body: JSON.stringify(patch),
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) {
                throw new Error(result.error || "Failed to update AI description settings");
            }
            toast.success(successMessage);
            await mutate();
        } catch (issue) {
            reportClientIssue({
                channel: "ui",
                message: "Admin AI description settings update failed",
                error: issue,
                detail: { adminView: "admin_ai_page", patch },
                consoleLabel: "[Admin AI Description] settings update failed",
            });
            toast.error(getAdminAiDescriptionSafeErrorMessage(issue, "Failed to update description settings"));
        } finally {
            setUpdatingSettings(false);
        }
    };

    const handlePromptPolicySave = async () => {
        if (isLocalAdminUiTestSession) {
            toast.error("Description prompt changes require a real admin session");
            return;
        }
        setSavingPolicy(true);
        try {
            const response = await authFetch("/api/admin/ai/drop-descriptions/prompt-policy", {
                method: "PUT",
                body: JSON.stringify({
                    baseInstructionPrompt: policyDraft.baseInstructionPrompt,
                    lockedClauses: policyDraft.lockedClauses.split("\n").map((line) => line.trim()).filter(Boolean),
                    mutableClauses: policyDraft.mutableClauses.split("\n").map((line) => line.trim()).filter(Boolean),
                    currentMutablePrompt: policyDraft.currentMutablePrompt,
                    autoOptimize: policyDraft.autoOptimize,
                }),
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) {
                throw new Error(result.error || "Failed to save description prompt policy");
            }
            setPolicyDirty(false);
            toast.success("Description prompt policy saved");
            await mutate();
        } catch (issue) {
            reportClientIssue({
                channel: "ui",
                message: "Admin AI description prompt policy save failed",
                error: issue,
                detail: { adminView: "admin_ai_page" },
                consoleLabel: "[Admin AI Description] prompt policy save failed",
            });
            toast.error(getAdminAiDescriptionSafeErrorMessage(issue, "Failed to save description prompt policy"));
        } finally {
            setSavingPolicy(false);
        }
    };

    const handleFeedback = async (jobId: string, action: "like" | "dislike" | "accept") => {
        if (isLocalAdminUiTestSession) {
            toast.error("Description feedback requires a real admin session");
            return;
        }
        setFeedbackingJobId(jobId);
        try {
            const response = await authFetch("/api/admin/ai/drop-descriptions/feedback", {
                method: "POST",
                body: JSON.stringify({ jobId, action }),
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) {
                throw new Error(result.error || "Failed to update description feedback");
            }
            toast.success(action === "accept" ? "Description accepted" : action === "like" ? "Description liked" : "Description disliked");
            await mutate();
        } catch (issue) {
            reportClientIssue({
                channel: "ui",
                message: "Admin AI description feedback update failed",
                error: issue,
                detail: { adminView: "admin_ai_page", jobId, action },
                consoleLabel: "[Admin AI Description] feedback update failed",
            });
            toast.error(getAdminAiDescriptionSafeErrorMessage(issue, "Failed to update description feedback"));
        } finally {
            setFeedbackingJobId(null);
        }
    };

    if (error && !data && !isLocalAdminUiTestSession) {
        const safeError = sanitizeErrorForUser(error, "admin_truth", "admin_truth_unavailable");
        return (
            <AdminDashboardModule title="Description operations" description="Description AI runtime is not available." defaultOpen>
                <div className="rounded-[1rem] border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100" data-admin-ai-description-safe-error="true">
                    {safeError.operatorMessage}
                </div>
            </AdminDashboardModule>
        );
    }

    return (
        <div className="space-y-4">
            {isLocalAdminUiTestSession ? (
                <div
                    className="rounded-[1rem] border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100"
                    data-admin-ai-description-fixture-boundary="true"
                >
                    <span className="font-semibold text-white">Local UI review only.</span> Description operations have no verified source until a real admin session loads AI evidence.
                </div>
            ) : null}
            <div className={cn("overflow-hidden rounded-[1.2rem] border border-white/10 bg-black/70 px-3 py-3 backdrop-blur", compact ? "" : "sticky top-[calc(env(safe-area-inset-top)+0.75rem)] z-10")}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                            <Activity className="h-4 w-4 text-brand-purple" />
                            Description operations
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-400">
                            <span>{data?.settings.model || ADMIN_AI_DESCRIPTION_NO_SOURCE_VALUE}</span>
                            <span>|</span>
                            <span>{latestResolvedModel || "Version not reported"}</span>
                            <span>|</span>
                            <span>{formatTimestamp(data?.refreshedAtMs)}</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", runtimeTone(data?.runtime.status))}>
                            {data?.runtime.status === "ready" ? <Sparkles className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                            {data?.runtime.status === "ready" ? "Ready" : data?.runtime.status === "disabled" ? "Off" : "Needs review"}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-200">
                            {formatSnapshotUsd(data?.aggregate.totalEstimatedCostUsd, hasDashboardSnapshot)} total
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void mutate()}
                            disabled={isLocalAdminUiTestSession}
                        >
                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid min-w-0 gap-4 xl:grid-cols-12">
                <div className="min-w-0 space-y-4 xl:col-span-6">
                    <AdminDashboardModule
                        title="Runtime"
                        description="Model state, cost, and controls from the latest snapshot."
                        defaultOpen={MODULE_DEFAULTS["admin_ai_desc.runtime"]}
                        open={moduleOpenState["admin_ai_desc.runtime"]}
                        onOpenChange={(nextOpen) => persistModuleState("admin_ai_desc.runtime", nextOpen)}
                        actions={(
                            <Button
                                variant={data?.settings.enabled ? "outline" : "brand"}
                                size="sm"
                                onClick={() => void updateSettings({ enabled: !data?.settings.enabled }, data?.settings.enabled ? "Description AI disabled" : "Description AI enabled")}
                                isLoading={updatingSettings}
                                disabled={isLocalAdminUiTestSession}
                            >
                                <Power className="mr-2 h-3.5 w-3.5" />
                                {data?.settings.enabled ? "Turn off" : "Turn on"}
                            </Button>
                        )}
                    >
                        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                            <MetricCard label="Configured alias" value={configuredAliasValue} meta={configuredAliasMeta} />
                            <MetricCard label="Runtime version" value={runtimeVersionValue} meta={runtimeVersionMeta} tone={data?.runtime.status === "ready" ? "good" : "warn"} />
                            <MetricCard label="Acceptance rate" value={acceptanceRateValue} meta={acceptanceRateMeta} />
                            <MetricCard label="Average latency" value={averageLatencyValue} meta={averageLatencyMeta} />
                            <MetricCard label="Prompt policy" value={promptPolicyValue} meta={promptPolicyMeta} />
                            <MetricCard label="Estimated cost" value={estimatedCostValue} meta={estimatedCostMeta} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                                variant={data?.settings.optimizerEnabled ? "outline" : "brand"}
                                size="sm"
                                onClick={() => void updateSettings({ optimizerEnabled: !data?.settings.optimizerEnabled }, data?.settings.optimizerEnabled ? "Description optimizer disabled" : "Description optimizer enabled")}
                                isLoading={updatingSettings}
                                disabled={isLocalAdminUiTestSession}
                            >
                                <WandSparkles className="mr-2 h-3.5 w-3.5" />
                                {data?.settings.optimizerEnabled ? "Optimizer on" : "Optimizer off"}
                            </Button>
                        </div>
                    </AdminDashboardModule>

                    <AdminDashboardModule
                        title="Prompt workbench"
                        description="Locked rules stay fixed while mutable prompt text adapts."
                        defaultOpen={MODULE_DEFAULTS["admin_ai_desc.prompt"]}
                        open={moduleOpenState["admin_ai_desc.prompt"]}
                        onOpenChange={(nextOpen) => persistModuleState("admin_ai_desc.prompt", nextOpen)}
                        actions={(
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!policyDirty}
                                    onClick={() => {
                                        if (!data?.promptPolicy) {
                                            return;
                                        }
                                        setPolicyDraft({
                                            baseInstructionPrompt: data.promptPolicy.baseInstructionPrompt,
                                            lockedClauses: data.promptPolicy.lockedClauses.join("\n"),
                                            mutableClauses: data.promptPolicy.mutableClauses.join("\n"),
                                            currentMutablePrompt: data.promptPolicy.currentMutablePrompt,
                                            autoOptimize: data.promptPolicy.autoOptimize,
                                        });
                                        setPolicyDirty(false);
                                    }}
                                >
                                    Reset
                                </Button>
                                <Button variant="brand" size="sm" onClick={() => void handlePromptPolicySave()} isLoading={savingPolicy} disabled={!policyDirty || isLocalAdminUiTestSession}>
                                    <WandSparkles className="mr-2 h-3.5 w-3.5" />
                                    Save
                                </Button>
                            </>
                        )}
                    >
                        <div className="space-y-3">
                            <TextAreaBlock label="Base instruction" value={policyDraft.baseInstructionPrompt} rows={3} onChange={(value) => { setPolicyDraft((current) => ({ ...current, baseInstructionPrompt: value })); setPolicyDirty(true); }} />
                            <TextAreaBlock label="Locked clauses" value={policyDraft.lockedClauses} rows={5} onChange={(value) => { setPolicyDraft((current) => ({ ...current, lockedClauses: value })); setPolicyDirty(true); }} />
                            <TextAreaBlock label="Mutable clauses" value={policyDraft.mutableClauses} rows={4} onChange={(value) => { setPolicyDraft((current) => ({ ...current, mutableClauses: value })); setPolicyDirty(true); }} />
                            <TextAreaBlock label="Current mutable prompt" value={policyDraft.currentMutablePrompt} rows={5} onChange={(value) => { setPolicyDraft((current) => ({ ...current, currentMutablePrompt: value })); setPolicyDirty(true); }} />
                            <button
                                type="button"
                                onClick={() => { setPolicyDraft((current) => ({ ...current, autoOptimize: !current.autoOptimize })); setPolicyDirty(true); }}
                                className={cn("rounded-full border px-3 py-2 text-xs font-semibold transition", policyDraft.autoOptimize ? "border-brand-purple/40 bg-brand-purple/12 text-brand-purple" : "border-white/10 bg-white/[0.03] text-gray-200")}
                            >
                                Auto optimize {policyDraft.autoOptimize ? "on" : "off"}
                            </button>
                            <TextAreaBlock label="Latest optimizer proposal" value={data?.promptPolicy.optimizerProposal || "No optimizer proposal yet."} rows={4} readOnly />
                            <TextAreaBlock label="Last refinement diff" value={(data?.promptPolicy.lastAutoRefinementDiff || []).join("\n") || "No refinement diff recorded yet."} rows={4} readOnly />
                        </div>
                    </AdminDashboardModule>
                </div>

                <div className="min-w-0 space-y-4 xl:col-span-6">
                    <AdminDashboardModule
                        title="Recent generations"
                        description="Recent jobs show output, feedback, and lineage."
                        defaultOpen={MODULE_DEFAULTS["admin_ai_desc.recent"]}
                        open={moduleOpenState["admin_ai_desc.recent"]}
                        onOpenChange={(nextOpen) => persistModuleState("admin_ai_desc.recent", nextOpen)}
                    >
                        {(data?.recentJobs || []).length === 0 ? (
                            <div className="rounded-[1rem] border border-dashed border-white/10 bg-black/25 p-4 text-sm text-gray-400">
                                No description generations recorded yet.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {(data?.recentJobs || []).map((job) => {
                                    const canFeedback = job.status === "succeeded" && typeof job.descriptionText === "string" && job.descriptionText.trim().length > 0;
                                    return (
                                        <article key={job.id} className="rounded-[1rem] border border-white/10 bg-black/25 p-3">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <MarqueeText
                                                        title={job.title}
                                                        className="text-sm font-semibold text-white"
                                                        ariaLabel={job.title}
                                                    />
                                                    <div className="mt-1 text-xs text-gray-400">
                                                        {job.model}{job.resolvedModel ? ` -> ${job.resolvedModel}` : " -> runtime version not exposed"} | {job.latencyMs ? `${job.latencyMs} ms` : "Pending"} | {formatAdminAiUsd(job.estimatedCostUsd || 0)}
                                                    </div>
                                                </div>
                                                <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold", job.status === "succeeded" ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : job.status === "failed" ? "border-red-400/20 bg-red-500/10 text-red-100" : "border-cyan-400/20 bg-cyan-500/10 text-cyan-100")}>
                                                    {job.status}
                                                </span>
                                            </div>
                                            <p className="mt-3 whitespace-pre-wrap text-sm text-white">{job.descriptionText || job.errorMessage || "Generation pending..."}</p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <Button size="sm" variant={job.feedback === "liked" ? "brand" : "outline"} onClick={() => void handleFeedback(job.id, "like")} disabled={!canFeedback || isLocalAdminUiTestSession} isLoading={feedbackingJobId === job.id}>
                                                    <ThumbsUp className="mr-2 h-3.5 w-3.5" />
                                                    Like
                                                </Button>
                                                <Button size="sm" variant={job.feedback === "disliked" ? "brand" : "outline"} onClick={() => void handleFeedback(job.id, "dislike")} disabled={!canFeedback || isLocalAdminUiTestSession} isLoading={feedbackingJobId === job.id}>
                                                    <ThumbsDown className="mr-2 h-3.5 w-3.5" />
                                                    Dislike
                                                </Button>
                                                <Button size="sm" variant={job.accepted ? "brand" : "outline"} onClick={() => void handleFeedback(job.id, "accept")} disabled={!canFeedback || isLocalAdminUiTestSession} isLoading={feedbackingJobId === job.id}>
                                                    <Check className="mr-2 h-3.5 w-3.5" />
                                                    {job.accepted ? "Accepted" : "Accept"}
                                                </Button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </AdminDashboardModule>

                    <AdminDashboardModule
                        title="Review gallery"
                        description="Accepted, rejected, and failed drafts remain visible here."
                        defaultOpen={MODULE_DEFAULTS["admin_ai_desc.gallery"]}
                        open={moduleOpenState["admin_ai_desc.gallery"]}
                        onOpenChange={(nextOpen) => persistModuleState("admin_ai_desc.gallery", nextOpen)}
                        actions={(
                            <div className="flex flex-wrap gap-2">
                                {(["all", "accepted", "liked", "neutral", "disliked", "failed"] as GalleryFilter[]).map((filter) => (
                                    <button
                                        key={filter}
                                        type="button"
                                        onClick={() => setGalleryFilter(filter)}
                                        className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold transition", galleryFilter === filter ? "border-brand-purple/40 bg-brand-purple/15 text-brand-purple" : "border-white/10 bg-white/5 text-gray-300")}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                        )}
                    >
                        {filteredGallery.length === 0 ? (
                            <div className="rounded-[1rem] border border-dashed border-white/10 bg-black/25 p-4 text-sm text-gray-400">
                                No description jobs match this filter.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredGallery.map((item) => (
                                    <article key={item.id} className="rounded-[1rem] border border-white/10 bg-black/25 p-3">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <MarqueeText
                                                    title={item.title}
                                                    className="text-sm font-semibold text-white"
                                                    ariaLabel={item.title}
                                                />
                                                <div className="mt-1 text-xs text-gray-400">{item.model} | {formatTimestamp(item.requestedAtMs)}</div>
                                            </div>
                                            <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold", item.status === "failed" ? "border-red-400/20 bg-red-500/10 text-red-100" : item.accepted ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/5 text-gray-200")}>
                                                {item.accepted ? "accepted" : item.feedback}
                                            </span>
                                        </div>
                                        <p className="mt-3 whitespace-pre-wrap text-sm text-white">{buildGalleryDescription(item)}</p>
                                    </article>
                                ))}
                            </div>
                        )}
                        <div className="mt-3 rounded-[1rem] border border-white/10 bg-black/25 p-3">
                            <div className="text-sm font-semibold text-white">Prompt history</div>
                            <div className="mt-3 space-y-2">
                                {(data?.promptPolicyHistory || []).slice(0, 6).map((entry) => (
                                    <div key={entry.id} className="rounded-[0.9rem] border border-white/8 bg-white/[0.03] p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="text-sm font-semibold text-white">v{entry.version} | {entry.source}</div>
                                            <div className="text-xs text-gray-400">{formatTimestamp(entry.createdAtMs)}</div>
                                        </div>
                                        <div className="mt-1 text-xs text-gray-400">{entry.action}{entry.feedbackAction ? ` | ${entry.feedbackAction}` : ""}</div>
                                        {entry.diff.length > 0 ? (
                                            <div className="mt-2 space-y-1">
                                                {entry.diff.map((line, index) => (
                                                    <div key={`${entry.id}-${index}`} className="break-words text-xs text-gray-300">{line}</div>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </AdminDashboardModule>
                </div>
            </div>

            {isLoading && !data ? (
                <div className="rounded-[1rem] border border-white/10 bg-black/25 p-3 text-sm text-gray-300">
                    <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Loading description operations...
                    </span>
                </div>
            ) : null}
        </div>
    );
}
