import React from 'react';
import { ChevronRight, WandSparkles } from "lucide-react";
import { AdminDashboardModule } from "@/components/Admin/AdminDashboardModule";
import { cn } from "@/lib/utils";
import { Badge, MetricCard, formatCompactTimestamp } from "../AiHelpers";
import type { AdminAiState } from '../hooks/useAdminAiState';


export function AdminAiOptimizerhealthSection({ state }: { state: AdminAiState }) {
    const {
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
        uiPreferencesData, MODULE_DEFAULTS,
        subtitle, latestDiagnostic, currentVersionJobs, currentVersionAcceptanceRate,
        referencePreview, activeHouseReferences, referenceCap, referenceReuseRate,
        filteredReviewGallery, topFailureReasons,
        persistModuleState, handleToggle, handleDefaultModelChange,
        handleReferenceToggle, handleOptimizerEnabledChange,
        uploadReferences, handleLibraryUploadChange, handlePrimaryUploadChange,
        handleReferenceUpdate, handleReferenceDelete, handleLegacyTemplateDelete,
        handlePromptPolicySave, handleReviewGalleryUpdate
    } = state;

    return (
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
                                                <details className="mt-2 text-[11px] text-gray-300">
                                                    <summary className="cursor-pointer font-semibold opacity-80 hover:opacity-100">View Diffs ({entry.diff.length})</summary>
                                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                                        {entry.diff.map((line, index) => (
                                                            <span key={`${entry.id}-${index}`} className="max-w-full break-all rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5">{line}</span>
                                                        ))}
                                                    </div>
                                                </details>
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
    );
}
