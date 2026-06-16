import React from 'react';
import { AdminDashboardModule } from "@/components/Admin/AdminDashboardModule";
import { cn } from "@/lib/utils";
import { EmptyState, diagnosticTone, formatCompactTimestamp } from "../AiHelpers";
import type { AdminAiState } from '../hooks/useAdminAiState';


export function AdminAiDiagnosticsSection({ state }: { state: AdminAiState }) {
    const {
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
    );
}
