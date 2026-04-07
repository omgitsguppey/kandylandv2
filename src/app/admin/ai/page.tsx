"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import {
    Activity,
    CheckCircle2,
    DollarSign,
    ImageIcon,
    Loader2,
    Power,
    RefreshCw,
    Sparkles,
    ThumbsDown,
    ThumbsUp,
    Trash2,
    TriangleAlert,
    Upload,
} from "lucide-react";
import { toast } from "sonner";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import {
    ADMIN_AI_DROP_COVER_ACTIVE_POLL_INTERVAL_MS,
    ADMIN_AI_DROP_COVER_IDLE_POLL_INTERVAL_MS,
    formatAdminAiUsd,
    type AdminAiDropCoverJobRecord,
    type AdminAiDropCoverModelHealth,
    type AdminAiDropCoverPreflightCheck,
    type AdminAiDropCoverReferenceAsset,
    type AdminAiDropCoverRuntimeDiagnostic,
    type AdminAiDropCoverRuntimeStatus,
    type AdminAiDropCoverSelectableModel,
} from "@/lib/ai-drop-covers";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { cn } from "@/lib/utils";

type AdminAiDropCoverDashboard = {
    refreshedAtMs: number;
    settings: {
        enabled: boolean;
        model: string;
        location: string;
        pricePerGenerationUsd: number;
        priceBasis: string;
        priceSourceUrl: string;
        generationMode: "standard" | "reference_guided";
        useTemplateReference: boolean;
        useRecentDropCoverReferences: boolean;
        templateReferenceUrl?: string | null;
        templateReferenceStoragePath?: string | null;
        templateReferenceFileName?: string | null;
    };
    runtime: {
        enabled: boolean;
        status: AdminAiDropCoverRuntimeStatus;
        note: string;
        project: string;
        location: string;
        model: string;
        generationMode: "standard" | "reference_guided";
        pricePerGenerationUsd: number;
        priceBasis: string;
        priceSourceUrl: string;
    };
    preflightChecks: AdminAiDropCoverPreflightCheck[];
    modelHealth: AdminAiDropCoverModelHealth[];
    recentDiagnostics: AdminAiDropCoverRuntimeDiagnostic[];
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
    recentJobs: AdminAiDropCoverJobRecord[];
    referenceAssets: {
        template: AdminAiDropCoverReferenceAsset | null;
        catalogDropCovers: AdminAiDropCoverReferenceAsset[];
        retainedAiCovers: AdminAiDropCoverReferenceAsset[];
    };
    visualSignals: {
        templateCount: number;
        catalogDropCoverCount: number;
        retainedAiCoverCount: number;
        acceptedRetainedCount: number;
        likedRetainedCount: number;
        dislikedHistoryCount: number;
        totalReusableReferenceCount: number;
        referenceGuidanceReady: boolean;
    };
};

function formatTimestamp(timestamp?: number | null) {
    if (!timestamp) return "Not recorded";
    return new Date(timestamp).toLocaleString();
}

function formatCompactTimestamp(timestamp?: number | null) {
    if (!timestamp) return "Not recorded";
    return new Date(timestamp).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
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

function preflightTone(status?: AdminAiDropCoverPreflightCheck["status"]) {
    switch (status) {
        case "pass":
            return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
        case "fail":
            return "border-red-400/20 bg-red-500/10 text-red-100";
        default:
            return "border-amber-400/20 bg-amber-500/10 text-amber-100";
    }
}

function diagnosticTone(severity?: AdminAiDropCoverRuntimeDiagnostic["severity"]) {
    switch (severity) {
        case "error":
            return "border-red-400/20 bg-red-500/10 text-red-100";
        case "warn":
            return "border-amber-400/20 bg-amber-500/10 text-amber-100";
        default:
            return "border-white/10 bg-white/5 text-gray-200";
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

function describeReferenceAsset(asset: AdminAiDropCoverReferenceAsset) {
    if (asset.source === "template") return "Template";
    if (asset.source === "retained_ai_cover") {
        return asset.retentionReason === "accepted" ? "Accepted AI cover" : "Liked AI cover";
    }
    return "Drop cover library";
}

function formatReuseStats(asset: AdminAiDropCoverReferenceAsset) {
    const parts: string[] = [];
    if (asset.usageCount) {
        parts.push(`used ${asset.usageCount}x`);
    }
    if (asset.successfulReuseCount) {
        parts.push(`${asset.successfulReuseCount} successful`);
    }
    if (asset.positiveReuseCount) {
        parts.push(`${asset.positiveReuseCount} positive`);
    }
    return parts.length > 0 ? parts.join(" | ") : "Not reused yet";
}

function getPollCadenceLabel(refreshIntervalMs: number) {
    return refreshIntervalMs <= ADMIN_AI_DROP_COVER_ACTIVE_POLL_INTERVAL_MS
        ? "2.5s active cadence"
        : "10s idle cadence";
}

export default function AIAdminPage() {
    const [updatingToggle, setUpdatingToggle] = useState(false);
    const [savingModelId, setSavingModelId] = useState<AdminAiDropCoverSelectableModel | null>(null);
    const [savingReferenceSettings, setSavingReferenceSettings] = useState(false);
    const [uploadingTemplate, setUploadingTemplate] = useState(false);
    const [removingTemplate, setRemovingTemplate] = useState(false);
    const [refreshIntervalMs, setRefreshIntervalMs] = useState(ADMIN_AI_DROP_COVER_IDLE_POLL_INTERVAL_MS);
    const templateInputRef = useRef<HTMLInputElement | null>(null);
    const { data, error, isLoading, mutate } = useAdminPollingSWR<AdminAiDropCoverDashboard>("/api/admin/ai/drop-covers", refreshIntervalMs, {
        keepPreviousData: true,
    });

    const activeJobs = useMemo(() => (data?.recentJobs || []).filter((job) => job.status === "running").slice(0, 4), [data?.recentJobs]);
    const retainedAcceptedCount = useMemo(() => (data?.referenceAssets.retainedAiCovers || []).filter((asset) => asset.retentionReason === "accepted").length, [data?.referenceAssets.retainedAiCovers]);
    const retainedLikedCount = useMemo(() => (data?.referenceAssets.retainedAiCovers || []).filter((asset) => asset.retentionReason === "liked").length, [data?.referenceAssets.retainedAiCovers]);
    const retainedReferenceCount = useMemo(() => (
        (data?.referenceAssets.template ? 1 : 0)
        + (data?.referenceAssets.catalogDropCovers.length || 0)
        + (data?.referenceAssets.retainedAiCovers.length || 0)
    ), [data?.referenceAssets]);
    const failingPreflightChecks = useMemo(
        () => (data?.preflightChecks || []).filter((check) => check.status === "fail"),
        [data?.preflightChecks],
    );
    const warningPreflightChecks = useMemo(
        () => (data?.preflightChecks || []).filter((check) => check.status === "warn"),
        [data?.preflightChecks],
    );
    const selectedModelHealth = useMemo(
        () => (data?.modelHealth || []).find((entry) => entry.selected) || null,
        [data?.modelHealth],
    );
    const latestDiagnostic = useMemo(
        () => (data?.recentDiagnostics || [])[0] || null,
        [data?.recentDiagnostics],
    );
    const missingReferenceInputs = Boolean(
        data?.settings.generationMode === "reference_guided"
        && !data.referenceAssets.template
        && (data.referenceAssets.catalogDropCovers || []).length === 0
        && (data.referenceAssets.retainedAiCovers || []).length === 0,
    );
    const latestRecipe = data?.recentJobs.find((job) => job.consistencyRecipe)?.consistencyRecipe || null;

    const pollCadenceLabel = useMemo(() => getPollCadenceLabel(refreshIntervalMs), [refreshIntervalMs]);

    const lastRefreshLabel = useMemo(() => formatCompactTimestamp(data?.refreshedAtMs), [data?.refreshedAtMs]);

    useEffect(() => {
        const nextInterval = (data?.aggregate.activeGenerationCount || 0) > 0
            ? ADMIN_AI_DROP_COVER_ACTIVE_POLL_INTERVAL_MS
            : ADMIN_AI_DROP_COVER_IDLE_POLL_INTERVAL_MS;

        setRefreshIntervalMs((current) => current === nextInterval ? current : nextInterval);
    }, [data?.aggregate.activeGenerationCount]);

    const persistSettingsPatch = async (
        patch: Partial<AdminAiDropCoverDashboard["settings"]>,
        successMessage: string,
    ) => {
        const response = await authFetch("/api/admin/ai/drop-covers", {
            method: "PUT",
            body: JSON.stringify(patch),
        });
        const result = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(result.error || "Failed to update AI cover controls");
        toast.success(successMessage);
        await mutate();
    };

    const handleDefaultModelChange = async (modelId: AdminAiDropCoverSelectableModel) => {
        if (!data?.settings || data.settings.model === modelId) return;
        setSavingModelId(modelId);
        try {
            await persistSettingsPatch({ model: modelId }, `${modelId === "gemini-3-pro-image-preview" ? "Gemini 3 Pro Image Preview" : "Gemini 2.5 Flash Image"} set as default model`);
        } catch (issue) {
            reportClientIssue({
                channel: "ui",
                message: "Admin AI default model update failed",
                error: issue,
                detail: { adminView: "admin_ai_page", modelId },
                consoleLabel: "[Admin AI] model update failed",
            });
            toast.error(issue instanceof Error ? issue.message : "Failed to update the default AI image model");
        } finally {
            setSavingModelId(null);
        }
    };

    const handleToggle = async () => {
        if (!data?.settings) return;
        setUpdatingToggle(true);
        try {
            const response = await authFetch("/api/admin/ai/drop-covers", {
                method: "PUT",
                body: JSON.stringify({ enabled: !data.settings.enabled }),
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) throw new Error(result.error || "Failed to update AI cover controls");
            toast.success(!data.settings.enabled ? "AI cover generation enabled" : "AI cover generation disabled");
            await mutate();
        } catch (issue) {
            reportClientIssue({
                channel: "ui",
                message: "Admin AI toggle update failed",
                error: issue,
                detail: { adminView: "admin_ai_page", nextEnabled: !data.settings.enabled },
                consoleLabel: "[Admin AI] toggle failed",
            });
            toast.error(issue instanceof Error ? issue.message : "Failed to update AI cover controls");
        } finally {
            setUpdatingToggle(false);
        }
    };

    const handleReferenceToggle = async (field: "useTemplateReference" | "useRecentDropCoverReferences", nextValue: boolean) => {
        if (!data?.settings) return;
        setSavingReferenceSettings(true);
        try {
            await persistSettingsPatch({ [field]: nextValue }, nextValue
                ? field === "useTemplateReference" ? "Template guidance enabled" : "Recent cover references enabled"
                : field === "useTemplateReference" ? "Template guidance disabled" : "Recent cover references disabled");
        } catch (issue) {
            reportClientIssue({
                channel: "ui",
                message: "Admin AI reference toggle update failed",
                error: issue,
                detail: { adminView: "admin_ai_page", field, nextValue },
                consoleLabel: "[Admin AI] reference toggle failed",
            });
            toast.error(issue instanceof Error ? issue.message : "Failed to update reference guidance");
        } finally {
            setSavingReferenceSettings(false);
        }
    };

    const handleTemplateFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploadingTemplate(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const response = await authFetch("/api/admin/ai/drop-covers/template", { method: "POST", body: formData });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) throw new Error(result.error || "Failed to upload AI cover template");
            toast.success("AI cover template uploaded");
            await mutate();
        } catch (issue) {
            reportClientIssue({
                channel: "ui",
                message: "Admin AI template upload failed",
                error: issue,
                detail: { adminView: "admin_ai_page", fileName: file.name, fileSize: file.size },
                consoleLabel: "[Admin AI] template upload failed",
            });
            toast.error(issue instanceof Error ? issue.message : "Failed to upload AI cover template");
        } finally {
            event.target.value = "";
            setUploadingTemplate(false);
        }
    };

    const handleRemoveTemplate = async () => {
        setRemovingTemplate(true);
        try {
            const response = await authFetch("/api/admin/ai/drop-covers/template", { method: "DELETE" });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) throw new Error(result.error || "Failed to remove AI cover template");
            toast.success("AI cover template removed");
            await mutate();
        } catch (issue) {
            reportClientIssue({
                channel: "ui",
                message: "Admin AI template removal failed",
                error: issue,
                detail: { adminView: "admin_ai_page" },
                consoleLabel: "[Admin AI] template removal failed",
            });
            toast.error(issue instanceof Error ? issue.message : "Failed to remove AI cover template");
        } finally {
            setRemovingTemplate(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageViewEvent eventName="admin_ai_viewed" />
            <input
                ref={templateInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => void handleTemplateFileChange(event)}
            />
            <AdminPageHeader
                eyebrow="AI Operations"
                title="AI Cover Generation"
                actions={(
                    <>
                        <div className={cn("inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm", runtimeTone(data?.runtime.status))}>
                            {failingPreflightChecks.length === 0 && warningPreflightChecks.length === 0 ? <Sparkles className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
                            {failingPreflightChecks.length > 0
                                ? `${failingPreflightChecks.length} blocking issue${failingPreflightChecks.length === 1 ? "" : "s"}`
                                : warningPreflightChecks.length > 0
                                    ? `${warningPreflightChecks.length} warning${warningPreflightChecks.length === 1 ? "" : "s"}`
                                    : data?.runtime.status === "disabled"
                                        ? "AI off"
                                        : "Vertex checks passed"}
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
                                data?.settings?.enabled ? "border-red-400/20 bg-red-500/10" : "border-emerald-400/20 bg-emerald-500/10",
                            )}
                        >
                            {updatingToggle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                            {data?.settings?.enabled ? "Turn AI off" : "Turn AI on"}
                        </button>
                    </>
                )}
            />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
                <StatCard
                    label="Runtime"
                    value={data?.runtime.status || (error ? "error" : "--")}
                    meta={selectedModelHealth ? `${selectedModelHealth.label} | ${selectedModelHealth.preflightStatus}` : (data?.runtime.model || "Vertex")}
                />
                <StatCard label="Blocking checks" value={failingPreflightChecks.length} meta={failingPreflightChecks.length ? "fix before generating" : "none"} />
                <StatCard label="Warnings" value={warningPreflightChecks.length} meta={latestDiagnostic ? `${latestDiagnostic.severity} at ${formatCompactTimestamp(latestDiagnostic.createdAtMs)}` : "no recent AI warning"} />
                <StatCard label="Active jobs" value={data?.aggregate.activeGenerationCount ?? "--"} meta={pollCadenceLabel} />
                <StatCard label="Last refresh" value={lastRefreshLabel} meta="persisted dashboard snapshot time" />
                <StatCard label="Selected model" value={selectedModelHealth?.shortLabel || "--"} meta={selectedModelHealth?.lastSuccessAtMs ? `last success ${formatCompactTimestamp(selectedModelHealth.lastSuccessAtMs)}` : selectedModelHealth?.note || "not yet proven"} />
                <StatCard label="Visual signals" value={data?.visualSignals.totalReusableReferenceCount ?? "--"} meta={`${data?.visualSignals.templateCount ?? 0} template | ${data?.visualSignals.catalogDropCoverCount ?? 0} catalog | ${data?.visualSignals.retainedAiCoverCount ?? 0} positive AI`} />
                <StatCard label="Estimated cost" value={data ? formatAdminAiUsd(data.aggregate.totalEstimatedCostUsd) : "--"} meta={data ? `${formatAdminAiUsd(data.settings.pricePerGenerationUsd)} each | ${data.settings.model}` : "Pricing unavailable"} />
            </div>

            {isLoading && !data ? (
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-6 text-sm text-gray-300">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    Loading AI control state...
                </div>
            ) : null}

            {error ? (
                <div className="rounded-[1.5rem] border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
                    AI cover operations could not be loaded right now.
                </div>
            ) : null}

            {failingPreflightChecks.length > 0 ? (
                <div className="rounded-[1.5rem] border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
                    <p className="font-semibold text-white">Blocking AI issues</p>
                    <div className="mt-3 space-y-2">
                        {failingPreflightChecks.slice(0, 4).map((check) => (
                            <div key={check.key} className="rounded-[1rem] border border-red-300/20 bg-black/20 px-3 py-2">
                                <p className="font-medium text-white">{check.label}</p>
                                <p className="mt-1 text-xs text-red-100">{check.detail}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            {!failingPreflightChecks.length && warningPreflightChecks.length > 0 ? (
                <div className="rounded-[1.5rem] border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                    <p className="font-semibold text-white">AI warnings</p>
                    <div className="mt-3 space-y-2">
                        {warningPreflightChecks.slice(0, 3).map((check) => (
                            <div key={check.key} className="rounded-[1rem] border border-amber-300/20 bg-black/20 px-3 py-2">
                                <p className="font-medium text-white">{check.label}</p>
                                <p className="mt-1 text-xs text-amber-100">{check.detail}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            <section className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-white">Preflight, model control, and live diagnostics</h2>
                        <p className="mt-1 text-sm text-gray-400">
                            This page polls every {refreshIntervalMs / 1000}s while jobs are active and every {ADMIN_AI_DROP_COVER_IDLE_POLL_INTERVAL_MS / 1000}s when idle. It shows persisted job state, retained visual signals, and stored diagnostics only. It does not simulate live training, hidden reasoning, or provider-side step streaming because those signals do not exist in this runtime.
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
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200">
                            <RefreshCw className="h-3.5 w-3.5" />
                            {pollCadenceLabel}
                        </span>
                    </div>
                </div>
                <div className="mt-4 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                    <div className="space-y-4">
                        <div className="rounded-[1.15rem] border border-white/10 bg-black/25 p-4 text-sm text-gray-300">
                            <p>{data?.runtime.note || "Runtime status not loaded."}</p>
                            <p className="mt-2 text-xs text-gray-500">
                                Cost is tracked as a real estimate from the current Google Cloud Vertex AI pricing page for the active image model. Failed requests that never reach a successful model response are not counted as billed.
                            </p>
                        </div>
                        <div className="rounded-[1.15rem] border border-white/10 bg-black/25 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-white">Preflight checks</p>
                                    <p className="mt-1 text-xs text-gray-400">What can block the next generation before you waste a run.</p>
                                </div>
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200">
                                    <TriangleAlert className="h-3.5 w-3.5" />
                                    {failingPreflightChecks.length} fail / {warningPreflightChecks.length} warn
                                </span>
                            </div>
                            <div className="mt-4 space-y-3">
                                {(data?.preflightChecks || []).map((check) => (
                                    <div key={check.key} className={cn("rounded-[1rem] border px-3 py-3", preflightTone(check.status))}>
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-white">{check.label}</p>
                                            <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                                                {check.status}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-xs leading-5">{check.detail}</p>
                                        {check.updatedAtMs ? (
                                            <p className="mt-2 text-[11px] text-white/60">Last signal {formatCompactTimestamp(check.updatedAtMs)}</p>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-[1.15rem] border border-white/10 bg-black/25 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-white">Individual model control</p>
                                    <p className="mt-1 text-xs text-gray-400">Pick the default model and see the last proven state for each model separately.</p>
                                </div>
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    {selectedModelHealth?.label || "No default model"}
                                </span>
                            </div>
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                {(data?.modelHealth || []).map((model) => (
                                    <article key={model.id} className={cn("rounded-[1rem] border p-4", preflightTone(model.preflightStatus))}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-white">{model.label}</p>
                                                <p className="mt-1 text-[11px] text-white/70">{model.location} | {model.launchStage === "preview" ? "Preview model" : "GA model"}</p>
                                            </div>
                                            {model.selected ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-brand-purple/20 bg-brand-purple/10 px-2.5 py-1 text-[11px] text-brand-purple">
                                                    Default
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className="mt-3 text-xs leading-5 text-white/80">{model.note}</p>
                                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/75">
                                            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                                                <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Recent runs</p>
                                                <p className="mt-1 text-sm font-semibold text-white">{model.recentGenerationCount}</p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                                                <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Warn / error</p>
                                                <p className="mt-1 text-sm font-semibold text-white">{model.diagnosticWarnCount} / {model.diagnosticErrorCount}</p>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/70">
                                            <span>Success {model.lastSuccessAtMs ? formatCompactTimestamp(model.lastSuccessAtMs) : "none"}</span>
                                            <span>Failure {model.lastFailureAtMs ? formatCompactTimestamp(model.lastFailureAtMs) : "none"}</span>
                                        </div>
                                        <div className="mt-4">
                                            <Button
                                                type="button"
                                                variant={model.selected ? "brand" : "outline"}
                                                size="sm"
                                                onClick={() => void handleDefaultModelChange(model.id)}
                                                disabled={savingModelId !== null && savingModelId !== model.id}
                                            >
                                                {savingModelId === model.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                                                {model.selected ? "Default model" : "Set as default"}
                                            </Button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[1.15rem] border border-white/10 bg-black/25 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-white">Recent AI diagnostics</p>
                                    <p className="mt-1 text-xs text-gray-400">Latest stored AI warnings and failures from the real server diagnostic channel.</p>
                                </div>
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200">
                                    <Activity className="h-3.5 w-3.5" />
                                    {(data?.recentDiagnostics || []).length} loaded
                                </span>
                            </div>
                            {(data?.recentDiagnostics || []).length > 0 ? (
                                <div className="mt-4 space-y-3">
                                    {data!.recentDiagnostics.map((entry) => (
                                        <div key={entry.id} className={cn("rounded-[1rem] border px-3 py-3", diagnosticTone(entry.severity))}>
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="text-sm font-semibold text-white">{entry.message}</p>
                                                <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">{entry.severity}</span>
                                            </div>
                                            <p className="mt-2 text-xs text-white/75">
                                                {entry.summary || "No extra diagnostic detail recorded."}
                                            </p>
                                            <p className="mt-2 text-[11px] text-white/60">{formatCompactTimestamp(entry.createdAtMs)}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-4 rounded-[1rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                                    No recent AI diagnostics were recorded.
                                </div>
                            )}
                        </div>

                        <div className="rounded-[1.15rem] border border-white/10 bg-black/25 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-white">Running now</p>
                                    <p className="mt-1 text-xs text-gray-400">Near-real-time running jobs from the last completed poll. No provider-side step stream exists beyond these persisted job states.</p>
                                </div>
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200">
                                    <Activity className="h-3.5 w-3.5" />
                                    {activeJobs.length} active
                                </span>
                            </div>
                            {activeJobs.length > 0 ? (
                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    {activeJobs.map((job) => (
                                        <article key={job.id} className="rounded-[1rem] border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-semibold text-white">{job.title}</p>
                                                    <p className="mt-1 text-xs text-cyan-100/80">
                                                        Requested {formatTimestamp(job.requestedAtMs)} | {job.model}
                                                    </p>
                                                    {job.consistencyRecipe ? (
                                                        <p className="mt-1 text-[11px] text-cyan-100/75">
                                                            Recipe: {job.consistencyRecipe.family.replace(/_/g, " ")} | focus {job.consistencyRecipe.focusTerms.join(", ") || "title-only"}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                <JobStatusBadge job={job} />
                                            </div>
                                            {(job.referenceAssets || []).length > 0 ? (
                                                <div className="mt-3 space-y-2">
                                                    {job.referenceAssets!.map((asset) => (
                                                        <div key={`${job.id}_${asset.id}`} className="rounded-[0.85rem] border border-cyan-300/20 bg-black/25 px-2.5 py-2 text-[11px] text-cyan-50">
                                                            <div className="inline-flex items-center gap-1">
                                                                <ImageIcon className="h-3 w-3" />
                                                                {describeReferenceAsset(asset)}: {asset.title || asset.dropId || asset.fileName || asset.id}
                                                            </div>
                                                            {asset.selectionReasons?.length ? (
                                                                <p className="mt-1 text-cyan-100/75">
                                                                    Score {asset.selectionScore ?? 0}: {asset.selectionReasons.join(" | ")}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-4 rounded-[1rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                                    No AI cover job is running right now.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 md:p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white">Retained visual signals</h2>
                        <p className="mt-1 text-sm text-gray-400">
                            KandyDrops does not retrain model weights here. Later reference-guided generations reuse these retained visual signals: the uploaded template, the drop cover library across current and legacy drops, and positively scored AI covers.
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200">
                        <ImageIcon className="h-3.5 w-3.5" />
                        {data?.settings.generationMode === "reference_guided" ? `${retainedReferenceCount} retained refs available` : "Reference guidance off"}
                    </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-3">
                    <div className="rounded-[1.15rem] border border-white/10 bg-black/25 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-sm font-semibold text-white">Template reference</p>
                                <p className="mt-1 text-xs text-gray-400">One uploaded template acts as the strongest fixed style anchor for later generations.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant={data?.settings.useTemplateReference ? "brand" : "outline"}
                                    size="sm"
                                    onClick={() => void handleReferenceToggle("useTemplateReference", !(data?.settings.useTemplateReference === true))}
                                    disabled={!data?.settings || savingReferenceSettings || uploadingTemplate}
                                >
                                    {savingReferenceSettings ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                                    {data?.settings.useTemplateReference ? "Template on" : "Template off"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="glass"
                                    size="sm"
                                    onClick={() => templateInputRef.current?.click()}
                                    disabled={uploadingTemplate}
                                >
                                    {uploadingTemplate ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
                                    Upload template
                                </Button>
                                {data?.referenceAssets.template ? (
                                    <Button
                                        type="button"
                                        variant="danger"
                                        size="sm"
                                        onClick={() => void handleRemoveTemplate()}
                                        disabled={removingTemplate}
                                    >
                                        {removingTemplate ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-2 h-3.5 w-3.5" />}
                                        Remove
                                    </Button>
                                ) : null}
                            </div>
                        </div>

                        {data?.referenceAssets.template ? (
                            <div className="mt-4 overflow-hidden rounded-[1rem] border border-white/10 bg-black">
                                <div className="relative aspect-square">
                                    <Image
                                        src={data.referenceAssets.template.imageUrl}
                                        alt={data.referenceAssets.template.fileName || "AI cover template"}
                                        fill
                                        sizes="(max-width: 1280px) 100vw, 460px"
                                        className="object-cover"
                                    />
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs text-gray-300">
                                    <span className="font-medium text-white">{data.referenceAssets.template.fileName || "Current template"}</span>
                                    <span>{formatReuseStats(data.referenceAssets.template)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 rounded-[1rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                                No template uploaded yet.
                            </div>
                        )}
                    </div>

                    <div className="rounded-[1.15rem] border border-white/10 bg-black/25 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-sm font-semibold text-white">Drop cover library</p>
                                <p className="mt-1 text-xs text-gray-400">These are real uploaded drop covers currently eligible as reference inputs, including older legacy covers still present in the drop catalog.</p>
                            </div>
                            <Button
                                type="button"
                                variant={data?.settings.useRecentDropCoverReferences ? "brand" : "outline"}
                                size="sm"
                                onClick={() => void handleReferenceToggle("useRecentDropCoverReferences", !(data?.settings.useRecentDropCoverReferences === true))}
                                disabled={!data?.settings || savingReferenceSettings}
                            >
                                {savingReferenceSettings ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                                {data?.settings.useRecentDropCoverReferences ? "Library on" : "Library off"}
                            </Button>
                        </div>

                        {(data?.referenceAssets.catalogDropCovers || []).length > 0 ? (
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                {data!.referenceAssets.catalogDropCovers.map((asset) => (
                                    <article key={asset.id} className="overflow-hidden rounded-[1rem] border border-white/10 bg-black/30">
                                        <div className="relative aspect-square">
                                            <Image src={asset.imageUrl} alt={asset.title || "Drop cover library reference"} fill sizes="(max-width: 1280px) 50vw, 220px" className="object-cover" />
                                        </div>
                                        <div className="space-y-1 p-3">
                                            <p className="text-xs font-semibold text-white">{asset.title || "Untitled Drop"}</p>
                                            <p className="text-[11px] text-gray-400">{asset.dropId || "drop"}</p>
                                            <p className="text-[11px] text-gray-500">{formatReuseStats(asset)}</p>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-4 rounded-[1rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                                No uploaded drop covers are currently retained in the library as usable references.
                            </div>
                        )}
                    </div>

                    <div className="rounded-[1.15rem] border border-white/10 bg-black/25 p-4">
                        <div>
                            <p className="text-sm font-semibold text-white">Retained positive AI covers</p>
                            <p className="mt-1 text-xs text-gray-400">Accepted and liked AI covers are eligible for later reference-guided generations. Disliked covers stay in history but are not reused.</p>
                        </div>

                        {(data?.referenceAssets.retainedAiCovers || []).length > 0 ? (
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                {data!.referenceAssets.retainedAiCovers.map((asset) => (
                                    <article key={asset.id} className="overflow-hidden rounded-[1rem] border border-white/10 bg-black/30">
                                        <div className="relative aspect-square">
                                            <Image src={asset.imageUrl} alt={asset.title || "Retained AI cover"} fill sizes="(max-width: 1280px) 50vw, 220px" className="object-cover" />
                                        </div>
                                        <div className="space-y-1 p-3">
                                            <p className="text-xs font-semibold text-white">{asset.title || "Retained AI cover"}</p>
                                            <p className="text-[11px] text-gray-400">{describeReferenceAsset(asset)}</p>
                                            <p className="text-[11px] text-gray-500">{formatReuseStats(asset)}</p>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-4 rounded-[1rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                                No accepted or liked AI covers are retained yet.
                            </div>
                        )}
                    </div>
                </div>

                {missingReferenceInputs ? (
                    <div className="mt-4 rounded-[1rem] border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                        Reference-guided mode is selected, but there is no uploaded template, no retained positive AI cover, and no drop cover library reference to send yet. The next generation will fail until at least one reference source exists.
                    </div>
                ) : null}
            </section>
            <section className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 md:p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white">Feedback retained for later generations</h2>
                        <p className="mt-1 text-sm text-gray-400">
                            These counters reflect real operator signals only. Accepted and liked AI covers can be retained for later reference-guided generations. Disliked covers remain visible in job history but are not reused as reference inputs.
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
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <StatCard label="Retained AI refs" value={data?.referenceAssets.retainedAiCovers.length ?? 0} meta="eligible for later reference-guided runs" />
                    <StatCard label="Accepted refs" value={retainedAcceptedCount} meta="selected by operators" />
                    <StatCard label="Liked refs" value={retainedLikedCount} meta="positive signal, not yet accepted" />
                    <StatCard label="Last failure" value={formatCompactTimestamp(data?.aggregate.lastFailureAtMs)} meta={`${data?.aggregate.failedGenerationCount ?? 0} failed jobs stored`} />
                </div>
                {latestRecipe ? (
                    <div className="mt-4 rounded-[1rem] border border-white/10 bg-black/25 p-4 text-sm text-gray-300">
                        <p className="font-semibold text-white">Latest analyzed recipe</p>
                        <p className="mt-2 text-xs text-gray-400">
                            Family: {latestRecipe.family.replace(/_/g, " ")} | Flavor title: {latestRecipe.normalizedFlavorTitle}
                        </p>
                        <p className="mt-2 text-xs text-gray-400">
                            Focus terms: {latestRecipe.focusTerms.join(", ") || "No extracted focus terms"}
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                            Overlay rule: {latestRecipe.overlayDirection}
                        </p>
                    </div>
                ) : null}
            </section>

            <section className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 md:p-5">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-white">Recent generation jobs</h2>
                        <p className="mt-1 text-sm text-gray-400">
                            Real job history with exact model, latency, estimated billed cost, feedback outcome, and the retained references each job used.
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
                                            {job.generationMode === "reference_guided" ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-brand-purple/20 bg-brand-purple/10 px-2.5 py-1 text-[11px] text-brand-purple">
                                                    <ImageIcon className="h-3 w-3" />
                                                    {job.referenceImageCount ? `${job.referenceImageCount} refs` : "Reference-guided"}
                                                </span>
                                            ) : null}
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
                                            {job.consistencyRecipe ? (
                                                <p className="mt-1 text-[11px] text-gray-500">
                                                    Recipe family {job.consistencyRecipe.family.replace(/_/g, " ")} | focus {job.consistencyRecipe.focusTerms.join(", ") || "title-only"}
                                                </p>
                                            ) : null}
                                            {job.generationMode === "reference_guided" ? (
                                                <p className="mt-1 text-[11px] text-gray-500">
                                                    Template {job.templateReferenceUsed ? "on" : "off"} | {job.catalogDropReferenceCount || job.recentDropReferenceCount || 0} catalog covers | {job.retainedAiReferenceCount || 0} retained AI covers
                                                </p>
                                            ) : null}
                                        </div>
                                        {(job.referenceAssets || []).length > 0 ? (
                                            <div className="space-y-2">
                                                {job.referenceAssets!.map((asset) => (
                                                    <div key={`${job.id}_${asset.id}`} className="rounded-[0.9rem] border border-white/10 bg-black/25 px-2.5 py-2 text-[11px] text-gray-300">
                                                        <div className="inline-flex items-center gap-1">
                                                            <ImageIcon className="h-3 w-3" />
                                                            {describeReferenceAsset(asset)}: {asset.title || asset.dropId || asset.fileName || asset.id}
                                                        </div>
                                                        {asset.selectionReasons?.length ? (
                                                            <p className="mt-1 text-gray-500">
                                                                Score {asset.selectionScore ?? 0}: {asset.selectionReasons.join(" | ")}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}
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
