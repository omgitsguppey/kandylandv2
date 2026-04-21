import React from 'react';
import Image from "next/image";
import { RefreshCw } from "lucide-react";
import { AdminDashboardModule } from "@/components/Admin/AdminDashboardModule";
import {  ADMIN_AI_DROP_COVER_ACTIVE_POLL_INTERVAL_MS } from "@/lib/ai-drop-covers";
import { cn } from "@/lib/utils";
import { Badge, EmptyState, MetricCard, formatCompactTimestamp, getReferenceSourceLabel } from "../AiHelpers";
import type { AdminAiState } from '../hooks/useAdminAiState';


export function AdminAiRecentgenerationsSection({ state }: { state: AdminAiState }) {
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
    );
}
