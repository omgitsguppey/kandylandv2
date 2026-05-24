import React from 'react';
import Image from "next/image";
import { AdminDashboardModule } from "@/components/Admin/AdminDashboardModule";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Badge, EmptyState, formatCompactTimestamp } from "../AiHelpers";
import type { AdminAiState, ReviewFilter } from '../hooks/useAdminAiState';

export function AdminAiReviewgallerySection({ state }: { state: AdminAiState }) {
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
                                                <Image src={item.imageUrl} alt={item.title} fill className="object-cover" sizes="(min-width: 960px) 280px, 100vw" />
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
    );
}
