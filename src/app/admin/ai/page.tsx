"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import {
    Activity,
    CheckCircle2,
    ChevronRight,
    Eye,
    FileWarning,
    Loader2,
    Pin,
    Power,
    RefreshCw,
    Sparkles,
    Trash2,
    Upload,
    WandSparkles,
} from "lucide-react";
import { toast } from "sonner";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { AdminAiDescriptionOperations } from "@/components/Admin/AdminAiDescriptionOperations";
import { AdminDashboardModule } from "@/components/Admin/AdminDashboardModule";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import {
    ADMIN_AI_DROP_COVER_ACTIVE_POLL_INTERVAL_MS,
    ADMIN_AI_DROP_COVER_IDLE_POLL_INTERVAL_MS,
    formatAdminAiUsd,
    getAdminAiDropCoverModelOption,
    type AdminAiDropCoverJobRecord,
    type AdminAiDropCoverModelHealth,
    type AdminAiDropCoverPreflightCheck,
    type AdminAiDropCoverPromptPolicy,
    type AdminAiDropCoverPromptPolicyHistoryEntry,
    type AdminAiDropCoverReferenceAsset,
    type AdminAiDropCoverReviewGalleryItem,
    type AdminAiDropCoverRuntimeDiagnostic,
    type AdminAiDropCoverRuntimeStatus,
    type AdminAiDropCoverSelectableModel,
    type AdminAiDropCoverSettings,
    type AdminAiDropCoverVisualSignalSummary,
} from "@/lib/ai-drop-covers";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { cn } from "@/lib/utils";

import {
    Badge,
    EmptyState,
    MetricCard,
    TextAreaBlock,
    diagnosticTone,
    formatCompactTimestamp,
    formatTimestamp,
    getReferenceSelectionReason,
    getReferenceSourceLabel,
    parseMultilineInput,
    preflightTone,
    runtimeTone,
    statTone,
} from "./AiHelpers";

export type AdminAiDropCoverDashboard = {
    refreshedAtMs: number;
    settings: AdminAiDropCoverSettings;
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
        houseReferences: AdminAiDropCoverReferenceAsset[];
        catalogDropCovers: AdminAiDropCoverReferenceAsset[];
        retainedAiCovers: AdminAiDropCoverReferenceAsset[];
    };
    visualSignals: AdminAiDropCoverVisualSignalSummary;
    promptPolicy: AdminAiDropCoverPromptPolicy;
    promptPolicyHistory: AdminAiDropCoverPromptPolicyHistoryEntry[];
    reviewGallery: AdminAiDropCoverReviewGalleryItem[];
};

export type AdminUiPreferencesResponse = {
    preferences?: {
        collapsedModules?: Record<string, boolean>;
    };
};

export const MODULE_DEFAULTS = {
    "admin_ai.runtime": true,
    "admin_ai.prompt": true,
    "admin_ai.references": true,
    "admin_ai.recent": true,
    "admin_ai.gallery": true,
    "admin_ai.optimizer": false,
    "admin_ai.diagnostics": false,
} as const;

export type AiModuleKey = keyof typeof MODULE_DEFAULTS;
export type ReviewFilter = "all" | "accepted" | "liked" | "neutral" | "disliked" | "failed";

export default function AIAdminPage() {
    const [refreshIntervalMs, setRefreshIntervalMs] = useState(ADMIN_AI_DROP_COVER_IDLE_POLL_INTERVAL_MS);
    const [updatingToggle, setUpdatingToggle] = useState(false);
    const [savingModelId, setSavingModelId] = useState<AdminAiDropCoverSelectableModel | null>(null);
    const [savingReferenceSettings, setSavingReferenceSettings] = useState(false);
    const [savingPromptPolicy, setSavingPromptPolicy] = useState(false);
    const [uploadingLibrary, setUploadingLibrary] = useState(false);
    const [uploadingPrimary, setUploadingPrimary] = useState(false);
    const [updatingReferenceId, setUpdatingReferenceId] = useState<string | null>(null);
    const [removingReferenceId, setRemovingReferenceId] = useState<string | null>(null);
    const [reviewingJobId, setReviewingJobId] = useState<string | null>(null);
    const [galleryFilter, setGalleryFilter] = useState<ReviewFilter>("all");
    const [moduleOpenState, setModuleOpenState] = useState<Record<AiModuleKey, boolean>>(MODULE_DEFAULTS);
    const [policyDraft, setPolicyDraft] = useState({
        baseStylePrompt: "",
        lockedClauses: "",
        mutableClauses: "",
        currentMutablePrompt: "",
        autoOptimize: true,
    });
    const [policyDirty, setPolicyDirty] = useState(false);

    const preferencesHydratedRef = useRef(false);
    const libraryInputRef = useRef<HTMLInputElement | null>(null);
    const primaryInputRef = useRef<HTMLInputElement | null>(null);

    const { data, error, isLoading, mutate } = useAdminPollingSWR<AdminAiDropCoverDashboard>("/api/admin/ai/drop-covers", refreshIntervalMs, {
        keepPreviousData: true,
    });
    const { data: uiPreferencesData } = useAdminPollingSWR<AdminUiPreferencesResponse>("/api/admin/ui/preferences", 15_000, {
        keepPreviousData: true,
    });

    useEffect(() => {
        const nextInterval = (data?.aggregate.activeGenerationCount || 0) > 0
            ? ADMIN_AI_DROP_COVER_ACTIVE_POLL_INTERVAL_MS
            : ADMIN_AI_DROP_COVER_IDLE_POLL_INTERVAL_MS;
        setRefreshIntervalMs((current) => current === nextInterval ? current : nextInterval);
    }, [data?.aggregate.activeGenerationCount]);

    useEffect(() => {
        const collapsedModules = uiPreferencesData?.preferences?.collapsedModules;
        if (!collapsedModules || preferencesHydratedRef.current) {
            return;
        }

        preferencesHydratedRef.current = true;
        setModuleOpenState({
            "admin_ai.runtime": collapsedModules["admin_ai.runtime"] === true ? false : MODULE_DEFAULTS["admin_ai.runtime"],
            "admin_ai.prompt": collapsedModules["admin_ai.prompt"] === true ? false : MODULE_DEFAULTS["admin_ai.prompt"],
            "admin_ai.references": collapsedModules["admin_ai.references"] === true ? false : MODULE_DEFAULTS["admin_ai.references"],
            "admin_ai.recent": collapsedModules["admin_ai.recent"] === true ? false : MODULE_DEFAULTS["admin_ai.recent"],
            "admin_ai.gallery": collapsedModules["admin_ai.gallery"] === true ? false : MODULE_DEFAULTS["admin_ai.gallery"],
            "admin_ai.optimizer": collapsedModules["admin_ai.optimizer"] === true ? false : MODULE_DEFAULTS["admin_ai.optimizer"],
            "admin_ai.diagnostics": collapsedModules["admin_ai.diagnostics"] === true ? false : MODULE_DEFAULTS["admin_ai.diagnostics"],
        });
    }, [uiPreferencesData?.preferences?.collapsedModules]);

    useEffect(() => {
        if (!data?.promptPolicy || policyDirty) {
            return;
        }

        setPolicyDraft({
            baseStylePrompt: data.promptPolicy.baseStylePrompt,
            lockedClauses: data.promptPolicy.lockedClauses.join("\n"),
            mutableClauses: data.promptPolicy.mutableClauses.join("\n"),
            currentMutablePrompt: data.promptPolicy.currentMutablePrompt,
            autoOptimize: data.promptPolicy.autoOptimize,
        });
    }, [data?.promptPolicy, policyDirty]);

    const selectedModelHealth = useMemo(
        () => (data?.modelHealth || []).find((entry) => entry.selected) || null,
        [data?.modelHealth],
    );
    const referenceCap = selectedModelHealth?.maxReferenceInputs
        || getAdminAiDropCoverModelOption(data?.settings.model || "")?.maxReferenceInputs
        || 6;
    const activeHouseReferences = useMemo(
        () => (data?.referenceAssets.houseReferences || []).filter((asset) => asset.active !== false),
        [data?.referenceAssets.houseReferences],
    );
    const currentPrimaryReference = useMemo(
        () => activeHouseReferences.find((asset) => asset.primary) || data?.referenceAssets.template || null,
        [activeHouseReferences, data?.referenceAssets.template],
    );
    const referencePreview = useMemo(() => {
        const preview: Array<AdminAiDropCoverReferenceAsset & { selectionReason: string }> = [];
        const seen = new Set<string>();
        const pushAsset = (asset: AdminAiDropCoverReferenceAsset | null | undefined) => {
            if (!asset || seen.has(asset.id) || preview.length >= referenceCap) {
                return;
            }
            seen.add(asset.id);
            preview.push({
                ...asset,
                selectionReason: getReferenceSelectionReason(asset),
            });
        };

        pushAsset(currentPrimaryReference);
        activeHouseReferences.filter((asset) => !asset.primary && asset.pinned).forEach(pushAsset);
        (data?.referenceAssets.retainedAiCovers || [])
            .filter((asset) => asset.retentionReason === "accepted" || asset.accepted)
            .forEach(pushAsset);
        (data?.referenceAssets.retainedAiCovers || [])
            .filter((asset) => asset.retentionReason !== "accepted" && asset.reusable !== false)
            .forEach(pushAsset);
        (data?.referenceAssets.catalogDropCovers || []).forEach(pushAsset);

        return preview;
    }, [activeHouseReferences, currentPrimaryReference, data?.referenceAssets.catalogDropCovers, data?.referenceAssets.retainedAiCovers, referenceCap]);
    const currentVersionJobs = useMemo(
        () => (data?.recentJobs || []).filter((job) => job.promptPolicyVersion === data?.promptPolicy.version),
        [data?.recentJobs, data?.promptPolicy.version],
    );
    const currentVersionAcceptanceRate = currentVersionJobs.length > 0
        ? Math.round((currentVersionJobs.filter((job) => job.accepted).length / currentVersionJobs.length) * 100)
        : 0;
    const referenceReuseRate = useMemo(() => {
        const totals = (data?.referenceAssets.retainedAiCovers || []).reduce((accumulator, asset) => ({
            usage: accumulator.usage + (asset.usageCount || 0),
            positive: accumulator.positive + (asset.positiveReuseCount || 0),
        }), { usage: 0, positive: 0 });

        return totals.usage > 0 ? Math.round((totals.positive / totals.usage) * 100) : 0;
    }, [data?.referenceAssets.retainedAiCovers]);
    const topFailureReasons = useMemo(
        () => (data?.recentDiagnostics || [])
            .filter((item) => item.severity === "error")
            .slice(0, 3)
            .map((item) => item.summary || item.message),
        [data?.recentDiagnostics],
    );
    const filteredReviewGallery = useMemo(() => {
        const items = data?.reviewGallery || [];
        if (galleryFilter === "all") return items;
        return items.filter((item) => {
            if (galleryFilter === "accepted") return item.accepted;
            if (galleryFilter === "failed") return item.status === "failed";
            if (galleryFilter === "liked") return item.feedback === "liked";
            if (galleryFilter === "disliked") return item.feedback === "disliked";
            if (galleryFilter === "neutral") return item.feedback === "neutral";
            return true;
        });
    }, [data?.reviewGallery, galleryFilter]);
    const latestDiagnostic = (data?.recentDiagnostics || [])[0] || null;
    const subtitle = data?.runtime
        ? `${selectedModelHealth?.label || data.runtime.model} • ${referenceCap} reference slots • ${formatCompactTimestamp(data.refreshedAtMs)}`
        : "Dense operations view for prompt policy, reference ranking, and rejected cover review.";

    const persistModuleState = (key: AiModuleKey, nextOpen: boolean) => {
        setModuleOpenState((current) => ({ ...current, [key]: nextOpen }));
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
                    message: "Admin AI module preference save failed",
                    error: issue,
                    detail: { adminView: "admin_ai_page", moduleKey: key, nextOpen },
                    consoleLabel: "[Admin AI] module preference save failed",
                });
            }
        })();
    };

    const persistSettingsPatch = async (patch: Partial<AdminAiDropCoverDashboard["settings"]>, successMessage: string) => {
        const response = await authFetch("/api/admin/ai/drop-covers", {
            method: "PUT",
            body: JSON.stringify(patch),
        });
        const result = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) {
            throw new Error(result.error || "Failed to update AI cover settings");
        }
        toast.success(successMessage);
        await mutate();
    };

    const handleToggle = async () => {
        if (!data?.settings) return;
        setUpdatingToggle(true);
        try {
            await persistSettingsPatch(
                { enabled: !data.settings.enabled },
                !data.settings.enabled ? "AI cover generation enabled" : "AI cover generation disabled",
            );
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

    const handleDefaultModelChange = async (modelId: AdminAiDropCoverSelectableModel) => {
        if (!data?.settings || data.settings.model === modelId) return;
        setSavingModelId(modelId);
        try {
            await persistSettingsPatch({ model: modelId }, `${getAdminAiDropCoverModelOption(modelId)?.label || modelId} set as default model`);
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

    const handleReferenceToggle = async (field: "useTemplateReference" | "useRecentDropCoverReferences", nextValue: boolean) => {
        setSavingReferenceSettings(true);
        try {
            await persistSettingsPatch(
                { [field]: nextValue },
                nextValue
                    ? field === "useTemplateReference" ? "Primary style guidance enabled" : "Catalog backfill enabled"
                    : field === "useTemplateReference" ? "Primary style guidance disabled" : "Catalog backfill disabled",
            );
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

    const handleOptimizerEnabledChange = async (nextValue: boolean) => {
        setSavingReferenceSettings(true);
        try {
            await persistSettingsPatch(
                { optimizerEnabled: nextValue } as Partial<AdminAiDropCoverDashboard["settings"]>,
                nextValue ? "Prompt optimizer enabled" : "Prompt optimizer disabled",
            );
        } catch (issue) {
            reportClientIssue({
                channel: "ui",
                message: "Admin AI optimizer toggle update failed",
                error: issue,
                detail: { adminView: "admin_ai_page", nextValue },
                consoleLabel: "[Admin AI] optimizer toggle failed",
            });
            toast.error(issue instanceof Error ? issue.message : "Failed to update prompt optimizer");
        } finally {
            setSavingReferenceSettings(false);
        }
    };

    const uploadReferences = async (files: File[], options: { primary: boolean }) => {
        if (files.length === 0) return;

        if (options.primary) {
            setUploadingPrimary(true);
        } else {
            setUploadingLibrary(true);
        }

        try {
            let uploadedCount = 0;
            for (const [index, file] of files.entries()) {
                const formData = new FormData();
                formData.append("file", file);
                if (options.primary && index === 0) {
                    formData.append("primary", "true");
                    formData.append("pinned", "true");
                }

                const response = await authFetch("/api/admin/ai/drop-covers/references", {
                    method: "POST",
                    body: formData,
                });
                const result = await response.json().catch(() => ({})) as { error?: string };
                if (!response.ok) {
                    throw new Error(result.error || `Failed to upload ${file.name}`);
                }
                uploadedCount += 1;
            }

            toast.success(uploadedCount === 1 ? "Reference uploaded" : `${uploadedCount} references uploaded`);
            await mutate();
        } catch (issue) {
            reportClientIssue({
                channel: "ui",
                message: "Admin AI reference upload failed",
                error: issue,
                detail: { adminView: "admin_ai_page", primary: options.primary, fileCount: files.length },
                consoleLabel: "[Admin AI] reference upload failed",
            });
            toast.error(issue instanceof Error ? issue.message : "Failed to upload references");
        } finally {
            setUploadingPrimary(false);
            setUploadingLibrary(false);
        }
    };

    const handleLibraryUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        await uploadReferences(files, { primary: false });
        event.target.value = "";
    };

    const handlePrimaryUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []).slice(0, 1);
        await uploadReferences(files, { primary: true });
        event.target.value = "";
    };

    const handleReferenceUpdate = async (
        assetId: string,
        patch: { primary?: boolean; pinned?: boolean; active?: boolean },
        successMessage: string,
    ) => {
        setUpdatingReferenceId(assetId);
        try {
            const response = await authFetch("/api/admin/ai/drop-covers/references", {
                method: "PUT",
                body: JSON.stringify({ id: assetId, ...patch }),
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) {
                throw new Error(result.error || "Failed to update reference");
            }
            toast.success(successMessage);
            await mutate();
        } catch (issue) {
            reportClientIssue({
                channel: "ui",
                message: "Admin AI reference update failed",
                error: issue,
                detail: { adminView: "admin_ai_page", assetId, patch },
                consoleLabel: "[Admin AI] reference update failed",
            });
            toast.error(issue instanceof Error ? issue.message : "Failed to update reference");
        } finally {
            setUpdatingReferenceId(null);
        }
    };

    const handleReferenceDelete = async (assetId: string) => {
        setRemovingReferenceId(assetId);
        try {
            const response = await authFetch("/api/admin/ai/drop-covers/references", {
                method: "DELETE",
                body: JSON.stringify({ id: assetId }),
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) {
                throw new Error(result.error || "Failed to remove reference");
            }
            toast.success("Reference removed");
            await mutate();
        } catch (issue) {
            reportClientIssue({
                channel: "ui",
                message: "Admin AI reference removal failed",
                error: issue,
                detail: { adminView: "admin_ai_page", assetId },
                consoleLabel: "[Admin AI] reference removal failed",
            });
            toast.error(issue instanceof Error ? issue.message : "Failed to remove reference");
        } finally {
            setRemovingReferenceId(null);
        }
    };

    const handleLegacyTemplateDelete = async () => {
        setRemovingReferenceId("template");
        try {
            const response = await authFetch("/api/admin/ai/drop-covers/template", {
                method: "DELETE",
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) {
                throw new Error(result.error || "Failed to remove primary style reference");
            }
            toast.success("Primary style reference removed");
            await mutate();
        } catch (issue) {
            reportClientIssue({
                channel: "ui",
                message: "Admin AI template removal failed",
                error: issue,
                detail: { adminView: "admin_ai_page" },
                consoleLabel: "[Admin AI] template removal failed",
            });
            toast.error(issue instanceof Error ? issue.message : "Failed to remove primary style reference");
        } finally {
            setRemovingReferenceId(null);
        }
    };

    const handlePromptPolicySave = async () => {
        setSavingPromptPolicy(true);
        try {
            const response = await authFetch("/api/admin/ai/drop-covers/prompt-policy", {
                method: "PUT",
                body: JSON.stringify({
                    baseStylePrompt: policyDraft.baseStylePrompt,
                    lockedClauses: parseMultilineInput(policyDraft.lockedClauses),
                    mutableClauses: parseMultilineInput(policyDraft.mutableClauses),
                    currentMutablePrompt: policyDraft.currentMutablePrompt,
                    autoOptimize: policyDraft.autoOptimize,
                }),
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) {
                throw new Error(result.error || "Failed to save prompt policy");
            }
            toast.success("Prompt policy saved");
            setPolicyDirty(false);
            await mutate();
        } catch (issue) {
            reportClientIssue({
                channel: "ui",
                message: "Admin AI prompt policy update failed",
                error: issue,
                detail: { adminView: "admin_ai_page" },
                consoleLabel: "[Admin AI] prompt policy update failed",
            });
            toast.error(issue instanceof Error ? issue.message : "Failed to save prompt policy");
        } finally {
            setSavingPromptPolicy(false);
        }
    };

    const handleReviewGalleryUpdate = async (jobId: string, reusable: boolean) => {
        setReviewingJobId(jobId);
        try {
            const response = await authFetch("/api/admin/ai/drop-covers/review-gallery", {
                method: "PUT",
                body: JSON.stringify({ jobId, reusable }),
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) {
                throw new Error(result.error || "Failed to update review gallery item");
            }
            toast.success(reusable ? "Output promoted for reuse" : "Output removed from reuse pool");
            await mutate();
        } catch (issue) {
            reportClientIssue({
                channel: "ui",
                message: "Admin AI review gallery update failed",
                error: issue,
                detail: { adminView: "admin_ai_page", jobId, reusable },
                consoleLabel: "[Admin AI] review gallery update failed",
            });
            toast.error(issue instanceof Error ? issue.message : "Failed to update gallery item");
        } finally {
            setReviewingJobId(null);
        }
    };

    return (
        <div className="min-h-screen overflow-x-clip bg-black px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 lg:px-8">
            <PageViewEvent eventName="admin_ai_viewed" eventParams={{ page: "admin-ai" }} />
            <input
                ref={libraryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleLibraryUploadChange}
            />
            <input
                ref={primaryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePrimaryUploadChange}
            />

            <div className="mx-auto min-w-0 max-w-7xl space-y-4 overflow-x-clip">
                <AdminPageHeader
                    eyebrow="Admin AI"
                    title="Cover Ops"
                    subtitle={subtitle}
                    compact
                    actions={(
                        <>
                            <Button variant="outline" size="sm" onClick={() => void mutate()} disabled={isLoading}>
                                <RefreshCw className={cn("mr-2 h-3.5 w-3.5", isLoading ? "animate-spin" : "")} />
                                Refresh
                            </Button>
                            <Button
                                variant={data?.settings.enabled ? "outline" : "brand"}
                                size="sm"
                                onClick={handleToggle}
                                isLoading={updatingToggle}
                            >
                                <Power className="mr-2 h-3.5 w-3.5" />
                                {data?.settings.enabled ? "Disable" : "Enable"}
                            </Button>
                        </>
                    )}
                />

                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="Runtime"
                        value={data?.runtime.status === "ready" ? "Ready" : data?.runtime.status || "Loading"}
                        meta={latestDiagnostic?.summary || data?.runtime.note || "Waiting for runtime snapshot"}
                        tone={data?.runtime.status === "ready" ? "good" : "warn"}
                    />
                    <MetricCard
                        label="Current Policy"
                        value={`v${data?.promptPolicy.version || 1}`}
                        meta={`${currentVersionAcceptanceRate}% accept rate on recent jobs`}
                        tone={currentVersionAcceptanceRate >= 50 ? "good" : "neutral"}
                    />
                    <MetricCard
                        label="Reference Pool"
                        value={data?.visualSignals.totalReusableReferenceCount || 0}
                        meta={`${referencePreview.length}/${referenceCap} queued for the next ranked set`}
                        tone={referencePreview.length > 0 ? "good" : "warn"}
                    />
                    <MetricCard
                        label="Rejected Gallery"
                        value={data?.reviewGallery.length || 0}
                        meta={data?.aggregate.generationCount ? `${Math.round(((data.aggregate.failedGenerationCount + data.reviewGallery.length) / Math.max(1, data.aggregate.generationCount)) * 100)}% not accepted yet` : "No generation history yet"}
                    />
                </section>

                {error && !data ? (
                    <div className="rounded-[1.2rem] border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
                        Failed to load AI cover operations. {error.message || "Unknown error."}
                    </div>
                ) : null}

                <div className="grid min-w-0 gap-4 xl:grid-cols-12">
                    <div className="min-w-0 space-y-4 xl:col-span-7">
                        <AdminDashboardModule
                            title="Runtime strip"
                            description="Model readiness and current preflight state."
                            defaultOpen={MODULE_DEFAULTS["admin_ai.runtime"]}
                            open={moduleOpenState["admin_ai.runtime"]}
                            onOpenChange={(nextOpen) => persistModuleState("admin_ai.runtime", nextOpen)}
                            actions={(
                                <Badge className={cn("border", runtimeTone(data?.runtime.status))}>
                                    <Activity className="h-3.5 w-3.5" />
                                    {data?.runtime.status === "ready" ? "Live" : data?.runtime.status || "Loading"}
                                </Badge>
                            )}
                        >
                            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                                <div className="min-w-0 rounded-[1.1rem] border border-white/10 bg-black/25 p-3.5">
                                    <div className="flex flex-wrap gap-2">
                                        {(data?.modelHealth || []).map((entry) => (
                                            <button
                                                key={entry.id}
                                                type="button"
                                                onClick={() => void handleDefaultModelChange(entry.id)}
                                                className={cn(
                                                    "min-w-0 flex-1 rounded-[1rem] border px-3 py-3 text-left transition",
                                                    entry.selected ? "border-brand-purple/40 bg-brand-purple/12" : "border-white/10 bg-white/[0.03] hover:border-white/20",
                                                )}
                                            >
                                                <div className="flex min-w-0 items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold text-white">{entry.label}</div>
                                                        <div className="mt-1 break-words text-xs text-gray-400">
                                                            {entry.maxReferenceInputs} refs • {formatAdminAiUsd(entry.pricePerGenerationUsd)}/run
                                                        </div>
                                                    </div>
                                                    <Badge className={cn("border", preflightTone(entry.preflightStatus))}>{entry.preflightStatus}</Badge>
                                                </div>
                                                <p className="mt-2 break-words text-xs text-gray-400">{entry.note}</p>
                                                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-500">
                                                    <span>{entry.recentSuccessCount} success</span>
                                                    <span>{entry.recentFailureCount} fail</span>
                                                    <span>{entry.diagnosticErrorCount} errors</span>
                                                </div>
                                                {entry.selected && savingModelId === entry.id ? (
                                                    <div className="mt-2 flex items-center gap-2 text-xs text-brand-purple">
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        Updating default
                                                    </div>
                                                ) : null}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            onClick={() => void handleReferenceToggle("useTemplateReference", !data?.settings.useTemplateReference)}
                                            className={cn(
                                                "rounded-[1rem] border px-3 py-3 text-left transition",
                                                data?.settings.useTemplateReference ? "border-brand-purple/40 bg-brand-purple/10" : "border-white/10 bg-white/[0.03]",
                                            )}
                                            disabled={savingReferenceSettings}
                                        >
                                            <div className="text-sm font-semibold text-white">Primary style lock</div>
                                            <div className="mt-1 text-xs text-gray-400">Keep typography and poster rhythm anchored to the chosen style reference.</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void handleReferenceToggle("useRecentDropCoverReferences", !data?.settings.useRecentDropCoverReferences)}
                                            className={cn(
                                                "rounded-[1rem] border px-3 py-3 text-left transition",
                                                data?.settings.useRecentDropCoverReferences ? "border-brand-purple/40 bg-brand-purple/10" : "border-white/10 bg-white/[0.03]",
                                            )}
                                            disabled={savingReferenceSettings}
                                        >
                                            <div className="text-sm font-semibold text-white">Catalog backfill</div>
                                            <div className="mt-1 text-xs text-gray-400">Fill spare slots with best-fit catalog covers only after pinned and retained references.</div>
                                        </button>
                                    </div>
                                </div>

                                <div className="min-w-0 rounded-[1.1rem] border border-white/10 bg-black/25 p-3.5">
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {(data?.preflightChecks || []).map((check) => (
                                            <div key={check.key} className={cn("rounded-[1rem] border px-3 py-3", preflightTone(check.status))}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="text-sm font-semibold text-white">{check.label}</div>
                                                    {check.status === "pass" ? <CheckCircle2 className="h-4 w-4" /> : <FileWarning className="h-4 w-4" />}
                                                </div>
                                                <p className="mt-1 break-words text-xs">{check.detail}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </AdminDashboardModule>

                        <AdminDashboardModule
                            title="Reference library"
                            description="Primary style refs lead, then pinned, retained, and catalog support refs."
                            defaultOpen={MODULE_DEFAULTS["admin_ai.references"]}
                            open={moduleOpenState["admin_ai.references"]}
                            onOpenChange={(nextOpen) => persistModuleState("admin_ai.references", nextOpen)}
                            actions={(
                                <>
                                    <Button variant="outline" size="sm" onClick={() => libraryInputRef.current?.click()} isLoading={uploadingLibrary}>
                                        <Upload className="mr-2 h-3.5 w-3.5" />
                                        Upload refs
                                    </Button>
                                    <Button variant="brand" size="sm" onClick={() => primaryInputRef.current?.click()} isLoading={uploadingPrimary}>
                                        <Sparkles className="mr-2 h-3.5 w-3.5" />
                                        Replace primary
                                    </Button>
                                </>
                            )}
                        >
                            <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                                <div className="min-w-0 space-y-3">
                                    <div className="min-w-0 rounded-[1.1rem] border border-white/10 bg-black/25 p-3.5">
                                        <div className="flex min-w-0 items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-white">Current ranked set</div>
                                                <div className="mt-1 break-words text-xs text-gray-400">{referencePreview.length}/{referenceCap} references queued for the next generation.</div>
                                            </div>
                                            <Badge className={cn("border", statTone(referencePreview.length > 0))}>
                                                <Eye className="h-3.5 w-3.5" />
                                                Next run
                                            </Badge>
                                        </div>

                                        <div className="mt-3 min-w-0 space-y-2">
                                            {referencePreview.length === 0 ? (
                                                <EmptyState
                                                    title="No ranked references yet"
                                                    detail="Upload a primary style reference to seed the next ranked set."
                                                />
                                            ) : referencePreview.map((asset, index) => (
                                                <div key={`${asset.id}-${index}`} className="flex min-w-0 items-start gap-3 rounded-[1rem] border border-white/8 bg-white/[0.03] p-2.5">
                                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/40 text-xs font-semibold text-white">{index + 1}</div>
                                                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[0.9rem] border border-white/10 bg-black/30">
                                                        <Image src={asset.imageUrl} alt={asset.title || "Reference"} fill className="object-cover" sizes="56px" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <div className="truncate text-sm font-semibold text-white">{asset.title || asset.fileName || "Untitled reference"}</div>
                                                            <Badge className="border border-white/10 bg-white/5 text-gray-200">{getReferenceSourceLabel(asset)}</Badge>
                                                        </div>
                                                        <p className="mt-1 break-words text-xs text-gray-400">{asset.selectionReason}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="min-w-0 rounded-[1.1rem] border border-white/10 bg-black/25 p-3.5">
                                        <div className="text-sm font-semibold text-white">Uploaded house references</div>
                                        <div className="mt-1 break-words text-xs text-gray-400">Gemini 3 Pro Preview uses up to 14 refs, and the ranked set stops at that cap.</div>

                                        <div className="mt-3 space-y-3">
                                            {activeHouseReferences.length === 0 ? (
                                                <EmptyState
                                                    title="No uploaded house references"
                                                    detail="Upload reusable house references here and Create Drop AI will inherit them automatically."
                                                />
                                            ) : activeHouseReferences.map((asset) => (
                                                <div key={asset.id} className="min-w-0 rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                                                    <div className="flex flex-col gap-3 sm:flex-row">
                                                        <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-[0.9rem] border border-white/10 bg-black/30 sm:h-24 sm:w-24">
                                                            <Image src={asset.imageUrl} alt={asset.title || asset.fileName || "Reference"} fill className="object-cover" sizes="96px" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <div className="truncate text-sm font-semibold text-white">{asset.title || asset.fileName || "House reference"}</div>
                                                                {asset.primary ? <Badge className="border border-brand-purple/30 bg-brand-purple/15 text-brand-purple">Primary</Badge> : null}
                                                                {asset.pinned ? <Badge className="border border-white/10 bg-white/5 text-gray-200">Pinned</Badge> : null}
                                                            </div>
                                                            <p className="mt-1 break-words text-xs text-gray-400">{getReferenceSelectionReason(asset)}</p>
                                                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500">
                                                                <span>{asset.usageCount || 0} reuse</span>
                                                                <span>{asset.successfulReuseCount || 0} success</span>
                                                                <span>{asset.positiveReuseCount || 0} positive</span>
                                                            </div>
                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                {!asset.primary ? (
                                                                    <Button variant="outline" size="sm" onClick={() => void handleReferenceUpdate(asset.id, { primary: true }, "Primary style reference updated")} isLoading={updatingReferenceId === asset.id}>
                                                                        <Sparkles className="mr-2 h-3.5 w-3.5" />
                                                                        Set primary
                                                                    </Button>
                                                                ) : (
                                                                    <Button variant="outline" size="sm" onClick={() => void handleReferenceUpdate(asset.id, { primary: false }, "Primary style reference cleared")} isLoading={updatingReferenceId === asset.id}>
                                                                        Clear primary
                                                                    </Button>
                                                                )}
                                                                <Button variant="outline" size="sm" onClick={() => void handleReferenceUpdate(asset.id, { pinned: asset.pinned !== true }, asset.pinned ? "Reference unpinned" : "Reference pinned")} isLoading={updatingReferenceId === asset.id}>
                                                                    <Pin className="mr-2 h-3.5 w-3.5" />
                                                                    {asset.pinned ? "Unpin" : "Pin"}
                                                                </Button>
                                                                <Button variant="danger" size="sm" onClick={() => void handleReferenceDelete(asset.id)} isLoading={removingReferenceId === asset.id}>
                                                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                                    Remove
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {data?.referenceAssets.template && !activeHouseReferences.some((asset) => asset.primary) ? (
                                            <div className="mt-3 rounded-[1rem] border border-amber-400/20 bg-amber-500/10 p-3">
                                                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold text-white">Legacy primary style asset</div>
                                                        <div className="mt-1 break-words text-xs text-amber-100/80">This primary reference still lives on the legacy template path. Replace it with an uploaded house reference when ready.</div>
                                                    </div>
                                                    <Button variant="danger" size="sm" onClick={handleLegacyTemplateDelete} isLoading={removingReferenceId === "template"}>
                                                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                        Clear legacy primary
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="min-w-0 space-y-3">
                                    <div className="min-w-0 rounded-[1.1rem] border border-white/10 bg-black/25 p-3.5">
                                        <div className="text-sm font-semibold text-white">Reference health</div>
                                        <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
                                            <MetricCard label="House refs" value={data?.visualSignals.houseReferenceCount || 0} />
                                            <MetricCard label="Retained positive" value={data?.visualSignals.acceptedRetainedCount || 0} />
                                            <MetricCard label="Catalog fallback" value={data?.referenceAssets.catalogDropCovers.length || 0} />
                                            <MetricCard label="Reuse rate" value={`${referenceReuseRate}%`} />
                                        </div>
                                    </div>
                                    <div className="min-w-0 rounded-[1.1rem] border border-white/10 bg-black/25 p-3.5">
                                        <div className="text-sm font-semibold text-white">Why the next set looks different</div>
                                        <div className="mt-2 space-y-2 text-sm text-gray-300">
                                            <p className="break-words">The style lock keeps typography, ribbon rhythm, and poster finish stable.</p>
                                            <p className="break-words">The subject lock now derives the hero object and palette from the flavor side of <span className="font-semibold text-white">Creator | Flavor</span>.</p>
                                            <p className="break-words">Anti-anchoring blocks the reference subject from dictating the next food form unless the requested flavor matches it.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </AdminDashboardModule>

                        <AdminDashboardModule
                            title="Recent generations"
                            description="Recent jobs show prompt lineage, refs, and validation results."
                            defaultOpen={MODULE_DEFAULTS["admin_ai.recent"]}
                            open={moduleOpenState["admin_ai.recent"]}
                            onOpenChange={(nextOpen) => persistModuleState("admin_ai.recent", nextOpen)}
                            actions={(
                                <Badge className="border border-white/10 bg-white/5 text-gray-200">
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    {refreshIntervalMs <= ADMIN_AI_DROP_COVER_ACTIVE_POLL_INTERVAL_MS ? "2.5s active" : "10s idle"}
                                </Badge>
                            )}
                        >
                            {(data?.recentJobs || []).length === 0 ? (
                                <EmptyState title="No generation jobs yet" detail="Generate a cover from Create Drop to populate prompt lineage here." />
                            ) : (
                                <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                                    {(data?.recentJobs || []).map((job) => (
                                        <div key={job.id} className="min-w-0 overflow-hidden rounded-[1.1rem] border border-white/10 bg-black/25">
                                            <div className="relative aspect-square overflow-hidden bg-black/40">
                                                {job.imageUrl ? (
                                                    <Image src={job.imageUrl} alt={job.title} fill className="object-cover" sizes="(min-width: 1280px) 360px, 100vw" />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-sm text-gray-500">No image saved</div>
                                                )}
                                            </div>
                                            <div className="space-y-3 p-3.5">
                                                <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-semibold text-white">{job.title}</div>
                                                        <div className="mt-1 break-words text-xs text-gray-400">{formatCompactTimestamp(job.requestedAtMs)} • {job.model}</div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Badge className={cn("border", job.status === "succeeded" ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : job.status === "failed" ? "border-red-400/20 bg-red-500/10 text-red-100" : "border-cyan-400/20 bg-cyan-500/10 text-cyan-100")}>{job.status}</Badge>
                                                        <Badge className="border border-white/10 bg-white/5 text-gray-200">v{job.promptPolicyVersion || 1}</Badge>
                                                    </div>
                                                </div>

                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    <MetricCard label="Refs used" value={job.referenceImageCount || 0} meta={`${job.referenceRequestCount || job.referenceImageCount || 0} requested`} />
                                                    <MetricCard label="Anchoring risk" value={job.overAnchoringRisk || "low"} meta={job.referenceTruncated ? "Truncated to model cap" : "Within model cap"} />
                                                </div>

                                                {job.validationWarnings && job.validationWarnings.length > 0 ? (
                                                    <div className="rounded-[0.95rem] border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 break-words">{job.validationWarnings.join(" | ")}</div>
                                                ) : null}

                                                <details className="overflow-hidden rounded-[0.95rem] border border-white/10 bg-white/[0.03] px-3 py-2">
                                                    <summary className="cursor-pointer list-none text-sm font-semibold text-white">Prompt provenance</summary>
                                                    <div className="mt-3 space-y-3 text-xs text-gray-300">
                                                        <div>
                                                            <div className="mb-1 font-semibold text-white">Working prompt</div>
                                                            <pre className="whitespace-pre-wrap break-words font-sans">{job.workingPrompt || "Not recorded"}</pre>
                                                        </div>
                                                        {job.optimizerAdjustedPrompt ? (
                                                            <div>
                                                                <div className="mb-1 font-semibold text-white">Optimizer-adjusted prompt</div>
                                                                <pre className="whitespace-pre-wrap break-words font-sans">{job.optimizerAdjustedPrompt}</pre>
                                                            </div>
                                                        ) : null}
                                                        {job.providerEnhancedPrompt ? (
                                                            <div>
                                                                <div className="mb-1 font-semibold text-white">Provider-enhanced prompt</div>
                                                                <pre className="whitespace-pre-wrap break-words font-sans">{job.providerEnhancedPrompt}</pre>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </details>

                                                <details className="overflow-hidden rounded-[0.95rem] border border-white/10 bg-white/[0.03] px-3 py-2">
                                                    <summary className="cursor-pointer list-none text-sm font-semibold text-white">References used</summary>
                                                    <div className="mt-3 space-y-2">
                                                        {(job.referenceAssets || []).length === 0 ? (
                                                            <p className="text-xs text-gray-400">No reference metadata stored on this job.</p>
                                                        ) : (job.referenceAssets || []).map((asset) => (
                                                            <div key={`${job.id}-${asset.id}`} className="flex min-w-0 items-center gap-3 rounded-[0.9rem] border border-white/8 bg-black/25 p-2.5">
                                                                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[0.8rem] border border-white/10 bg-black/30">
                                                                    <Image src={asset.imageUrl} alt={asset.title || "Reference"} fill className="object-cover" sizes="48px" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="truncate text-sm font-semibold text-white">{asset.title || asset.fileName || "Reference"}</div>
                                                                    <div className="mt-1 text-xs text-gray-400">{getReferenceSourceLabel(asset)}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </details>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </AdminDashboardModule>
                    </div>

                    <div className="min-w-0 space-y-4 xl:col-span-5">
                        <AdminDashboardModule
                            title="Prompt workbench"
                            description="Locked style stays fixed while mutable prompt rules adapt."
                            defaultOpen={MODULE_DEFAULTS["admin_ai.prompt"]}
                            open={moduleOpenState["admin_ai.prompt"]}
                            onOpenChange={(nextOpen) => persistModuleState("admin_ai.prompt", nextOpen)}
                            actions={(
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (!data?.promptPolicy) return;
                                            setPolicyDraft({
                                                baseStylePrompt: data.promptPolicy.baseStylePrompt,
                                                lockedClauses: data.promptPolicy.lockedClauses.join("\n"),
                                                mutableClauses: data.promptPolicy.mutableClauses.join("\n"),
                                                currentMutablePrompt: data.promptPolicy.currentMutablePrompt,
                                                autoOptimize: data.promptPolicy.autoOptimize,
                                            });
                                            setPolicyDirty(false);
                                        }}
                                        disabled={!policyDirty}
                                    >
                                        Reset
                                    </Button>
                                    <Button variant="brand" size="sm" onClick={() => void handlePromptPolicySave()} isLoading={savingPromptPolicy} disabled={!policyDirty}>
                                        <WandSparkles className="mr-2 h-3.5 w-3.5" />
                                        Save prompt policy
                                    </Button>
                                </>
                            )}
                        >
                            <div className="space-y-3">
                                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                                    <MetricCard label="Policy version" value={`v${data?.promptPolicy.version || 1}`} meta={formatCompactTimestamp(data?.promptPolicy.lastEditedAtMs)} />
                                    <MetricCard label="Last accepted" value={formatCompactTimestamp(data?.promptPolicy.lastAcceptedAtMs)} meta={data?.promptPolicy.lastAcceptedPrompt ? "Accepted prompt snapshot retained" : "No accepted prompt snapshot yet"} />
                                </div>

                                <div className="grid min-w-0 gap-3">
                                    <TextAreaBlock label="Base style prompt" value={policyDraft.baseStylePrompt} onChange={(value) => { setPolicyDraft((current) => ({ ...current, baseStylePrompt: value })); setPolicyDirty(true); }} rows={4} helper="This stays constant across flavors." />
                                    <TextAreaBlock label="Locked clauses" value={policyDraft.lockedClauses} onChange={(value) => { setPolicyDraft((current) => ({ ...current, lockedClauses: value })); setPolicyDirty(true); }} rows={6} helper="Keep one clause per line." />
                                    <TextAreaBlock label="Mutable clauses" value={policyDraft.mutableClauses} onChange={(value) => { setPolicyDraft((current) => ({ ...current, mutableClauses: value })); setPolicyDirty(true); }} rows={5} helper="The optimizer can reshape these rules." />
                                    <TextAreaBlock label="Current mutable prompt" value={policyDraft.currentMutablePrompt} onChange={(value) => { setPolicyDraft((current) => ({ ...current, currentMutablePrompt: value })); setPolicyDirty(true); }} rows={8} helper="This seeds the next run before flavor shaping." />
                                </div>

                                <div className="min-w-0 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setPolicyDraft((current) => ({ ...current, autoOptimize: !current.autoOptimize })); setPolicyDirty(true); }}
                                        className={cn("rounded-full border px-3 py-2 text-xs font-semibold transition", policyDraft.autoOptimize ? "border-brand-purple/40 bg-brand-purple/12 text-brand-purple" : "border-white/10 bg-white/[0.03] text-gray-200")}
                                    >
                                        Auto optimize {policyDraft.autoOptimize ? "on" : "off"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleOptimizerEnabledChange(!(data?.settings.optimizerEnabled === true))}
                                        className={cn("rounded-full border px-3 py-2 text-xs font-semibold transition", data?.settings.optimizerEnabled ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.03] text-gray-200")}
                                        disabled={savingReferenceSettings}
                                    >
                                        Runtime optimizer {data?.settings.optimizerEnabled ? "enabled" : "disabled"}
                                    </button>
                                </div>

                                <TextAreaBlock label="Latest optimizer proposal" value={data?.promptPolicy.optimizerProposal || "No optimizer proposal yet."} rows={5} readOnly />
                                <TextAreaBlock label="Last auto-refinement diff" value={(data?.promptPolicy.lastAutoRefinementDiff || []).join("\n") || "No auto-refinement diff recorded yet."} rows={4} readOnly />
                            </div>
                        </AdminDashboardModule>

                        <AdminDashboardModule
                            title="Review gallery"
                            description="Rejected and neutral outputs stay here until you promote them."
                            defaultOpen={MODULE_DEFAULTS["admin_ai.gallery"]}
                            open={moduleOpenState["admin_ai.gallery"]}
                            onOpenChange={(nextOpen) => persistModuleState("admin_ai.gallery", nextOpen)}
                            actions={(
                                <div className="min-w-0 flex flex-wrap gap-2">
                                    {(["all", "accepted", "liked", "neutral", "disliked", "failed"] as ReviewFilter[]).map((filter) => (
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
                            {filteredReviewGallery.length === 0 ? (
                                <EmptyState title="No outputs in this filter" detail="Rejected, neutral, and failed covers appear here as they land." />
                            ) : (
                                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                                    {filteredReviewGallery.map((item) => (
                                        <div key={item.id} className="min-w-0 overflow-hidden rounded-[1rem] border border-white/10 bg-black/25">
                                            <div className="relative aspect-square overflow-hidden bg-black/40">
                                                <Image src={item.imageUrl} alt={item.title} fill className="object-cover" sizes="(min-width: 1024px) 280px, 100vw" />
                                            </div>
                                            <div className="space-y-3 p-3">
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-semibold text-white">{item.title}</div>
                                                    <div className="mt-1 text-xs text-gray-400">{formatCompactTimestamp(item.requestedAtMs)} • {item.model}</div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge className="border border-white/10 bg-white/5 text-gray-200">{item.feedback}</Badge>
                                                    <Badge className={cn("border", item.status === "failed" ? "border-red-400/20 bg-red-500/10 text-red-100" : "border-white/10 bg-white/5 text-gray-200")}>{item.status}</Badge>
                                                    {item.accepted ? <Badge className="border border-emerald-400/20 bg-emerald-500/10 text-emerald-100">accepted</Badge> : null}
                                                </div>
                                                <Button variant={item.reusable ? "outline" : "brand"} size="sm" onClick={() => void handleReviewGalleryUpdate(item.id, !item.reusable)} isLoading={reviewingJobId === item.id}>
                                                    {item.reusable ? "Remove from reuse" : "Promote to reusable"}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </AdminDashboardModule>

                        <AdminDashboardModule
                            title="Optimizer health"
                            description="Optimizer status, policy lineage, and recent failure reasons."
                            defaultOpen={MODULE_DEFAULTS["admin_ai.optimizer"]}
                            open={moduleOpenState["admin_ai.optimizer"]}
                            onOpenChange={(nextOpen) => persistModuleState("admin_ai.optimizer", nextOpen)}
                            actions={(
                                <Badge className={cn("border", data?.settings.optimizerEnabled ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : "border-amber-400/20 bg-amber-500/10 text-amber-100")}>
                                    <WandSparkles className="h-3.5 w-3.5" />
                                    {data?.settings.optimizerEnabled ? "Enabled" : "Rules-only"}
                                </Badge>
                            )}
                        >
                            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                                <MetricCard label="Optimizer status" value={data?.promptPolicy.optimizerStatus || "idle"} meta={data?.promptPolicy.optimizerNote || "No optimizer note"} tone={data?.promptPolicy.optimizerStatus === "ready" ? "good" : "warn"} />
                                <MetricCard label="Reuse win rate" value={`${referenceReuseRate}%`} meta="Positive retained output reuse" />
                                <MetricCard label="Current version jobs" value={currentVersionJobs.length} meta={`${currentVersionAcceptanceRate}% accepted`} />
                                <MetricCard label="Last run" value={formatCompactTimestamp(data?.promptPolicy.lastOptimizerRunAtMs)} meta={data?.settings.optimizerModel || "gemini-2.5-flash-lite"} />
                            </div>

                            <div className="mt-3 min-w-0 rounded-[1rem] border border-white/10 bg-black/25 p-3">
                                <div className="text-sm font-semibold text-white">Prompt history</div>
                                <div className="mt-3 space-y-2">
                                    {(data?.promptPolicyHistory || []).slice(0, 8).map((entry) => (
                                        <div key={entry.id} className="rounded-[0.95rem] border border-white/8 bg-white/[0.03] p-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                                                    <ChevronRight className="h-4 w-4 text-gray-500" />
                                                    v{entry.version} • {entry.source}
                                                </div>
                                                <div className="text-xs text-gray-400">{formatCompactTimestamp(entry.createdAtMs)}</div>
                                            </div>
                                            <div className="mt-2 text-xs text-gray-400">
                                                {entry.action}{entry.feedbackAction ? ` • ${entry.feedbackAction}` : ""}{entry.jobId ? ` • job ${entry.jobId}` : ""}
                                            </div>
                                            {entry.diff.length > 0 ? (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {entry.diff.map((line, index) => (
                                                        <span key={`${entry.id}-${index}`} className="max-w-full break-all rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-gray-300">{line}</span>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-3 min-w-0 rounded-[1rem] border border-white/10 bg-black/25 p-3">
                                <div className="text-sm font-semibold text-white">Top failure reasons</div>
                                <div className="mt-3 space-y-2">
                                    {topFailureReasons.length === 0 ? (
                                        <p className="text-sm text-gray-400">No recent AI failures recorded.</p>
                                    ) : topFailureReasons.map((reason, index) => (
                                        <div key={`${reason}-${index}`} className="rounded-[0.95rem] border border-red-400/15 bg-red-500/5 px-3 py-2 text-sm text-red-100 break-words">{reason}</div>
                                    ))}
                                </div>
                            </div>
                        </AdminDashboardModule>

                        <AdminDashboardModule
                            title="Diagnostics"
                            description="Recent AI runtime events with clear failure context."
                            defaultOpen={MODULE_DEFAULTS["admin_ai.diagnostics"]}
                            open={moduleOpenState["admin_ai.diagnostics"]}
                            onOpenChange={(nextOpen) => persistModuleState("admin_ai.diagnostics", nextOpen)}
                        >
                            {(data?.recentDiagnostics || []).length === 0 ? (
                                <EmptyState title="No AI diagnostics yet" detail="Runtime diagnostics appear here as AI events land." />
                            ) : (
                                <div className="min-w-0 space-y-2">
                                    {(data?.recentDiagnostics || []).map((entry) => (
                                        <div key={entry.id} className={cn("min-w-0 rounded-[1rem] border px-3 py-3", diagnosticTone(entry.severity))}>
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="text-sm font-semibold text-white">{entry.message}</div>
                                                <div className="text-xs text-gray-300">{formatCompactTimestamp(entry.createdAtMs)}</div>
                                            </div>
                                            <div className="mt-1 break-all text-xs text-gray-300">{[entry.model, entry.generationMode, entry.failureCode, entry.jobId].filter(Boolean).join(" • ") || "No extra metadata"}</div>
                                            {entry.summary ? <p className="mt-2 break-words text-xs text-gray-200">{entry.summary}</p> : null}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </AdminDashboardModule>
                    </div>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                    <AdminAiDescriptionOperations />
                </div>
            </div>
        </div>
    );
}
