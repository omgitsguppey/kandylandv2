import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { toast } from "sonner";
import {
    ADMIN_AI_DROP_COVER_ACTIVE_POLL_INTERVAL_MS,
    ADMIN_AI_DROP_COVER_IDLE_POLL_INTERVAL_MS,
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
    getAdminAiDropCoverModelOption,
} from "@/lib/ai-drop-covers";
import { parseMultilineInput, formatCompactTimestamp, getReferenceSelectionReason } from "../AiHelpers";


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



export function useAdminAiState() {

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


    return {
        refreshIntervalMs, setRefreshIntervalMs,
        updatingToggle, setUpdatingToggle,
        savingModelId, setSavingModelId,
        savingReferenceSettings, setSavingReferenceSettings,
        savingPromptPolicy, setSavingPromptPolicy,
        uploadingLibrary, setUploadingLibrary,
        uploadingPrimary, setUploadingPrimary,
        updatingReferenceId, setUpdatingReferenceId,
        removingReferenceId, setRemovingReferenceId,
        reviewingJobId, setReviewingJobId,
        galleryFilter, setGalleryFilter,
        moduleOpenState, setModuleOpenState,
        policyDraft, setPolicyDraft,
        policyDirty, setPolicyDirty,
        libraryInputRef, primaryInputRef,
        data, error, isLoading, mutate,
        uiPreferencesData,
        subtitle, latestDiagnostic, currentVersionJobs, currentVersionAcceptanceRate,
        referencePreview, activeHouseReferences, referenceCap, referenceReuseRate,
        filteredReviewGallery, topFailureReasons,
        persistModuleState, handleToggle, handleDefaultModelChange,
        handleReferenceToggle, handleOptimizerEnabledChange,
        uploadReferences, handleLibraryUploadChange, handlePrimaryUploadChange,
        handleReferenceUpdate, handleReferenceDelete, handleLegacyTemplateDelete,
        handlePromptPolicySave, handleReviewGalleryUpdate,
        MODULE_DEFAULTS
    };
}

export type AdminAiState = ReturnType<typeof useAdminAiState>;
