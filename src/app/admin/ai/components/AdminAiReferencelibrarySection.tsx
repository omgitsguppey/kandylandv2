import React from 'react';
import Image from "next/image";
import { Eye, Pin, Sparkles, Trash2, Upload } from "lucide-react";
import { AdminDashboardModule } from "@/components/Admin/AdminDashboardModule";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Badge, EmptyState, MetricCard, formatAdminAiNullableNumber, getReferenceSelectionReason, getReferenceSourceLabel, resolveAdminAiDataState, statTone } from "../AiHelpers";
import type { AdminAiState } from '../hooks/useAdminAiState';

export function AdminAiReferencelibrarySection({ state }: { state: AdminAiState }) {
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
        isLocalAdminUiTestSession,
        subtitle, latestDiagnostic, currentVersionJobs, currentVersionAcceptanceRate,
        referencePreview, activeHouseReferences, referenceCap, referenceReuseRate,
        filteredReviewGallery, topFailureReasons,
        persistModuleState, handleToggle, handleDefaultModelChange,
        handleReferenceToggle, handleOptimizerEnabledChange,
        uploadReferences, handleLibraryUploadChange, handlePrimaryUploadChange,
        handleReferenceUpdate, handleReferenceDelete, handleLegacyTemplateDelete,
        handlePromptPolicySave, handleReviewGalleryUpdate
    } = state;

    const sectionTruthState = resolveAdminAiDataState({ data, error, isLoading });

    return (
        <AdminDashboardModule
                            title="References"
                            description="Two layout anchors max."
                            defaultOpen={MODULE_DEFAULTS["admin_ai.references"]}
                            open={moduleOpenState["admin_ai.references"]}
                            onOpenChange={(nextOpen) => persistModuleState("admin_ai.references", nextOpen)}
                            actions={(
                                <>
                                    <Button variant="outline" size="sm" onClick={() => libraryInputRef.current?.click()} isLoading={uploadingLibrary} disabled={isLocalAdminUiTestSession}>
                                        <Upload className="mr-2 h-3.5 w-3.5" />
                                        Upload refs
                                    </Button>
                                    <Button variant="brand" size="sm" onClick={() => primaryInputRef.current?.click()} isLoading={uploadingPrimary} disabled={isLocalAdminUiTestSession}>
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
                                                <div className="mt-1 break-words text-xs text-gray-400">{referencePreview.length}/{referenceCap} layout anchors queued.</div>
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
                                        <div className="mt-1 break-words text-xs text-gray-400">Generation uses 2 layout anchors max.</div>

                                        <div className="mt-3 space-y-3">
                                            {activeHouseReferences.length === 0 ? (
                                                <EmptyState
                                                    title="No uploaded house references"
                                                    detail="Upload reusable house references here and Create Drop AI will inherit them automatically."
                                                />
                                            ) : activeHouseReferences.map((asset) => (
                                                <div key={asset.id} className="min-w-0 rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                                                    <div className="flex flex-col gap-3 sm:flex-row items-start">
                                                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                                                            <Image src={asset.imageUrl} alt={asset.title || asset.fileName || "Reference"} fill className="object-cover" sizes="64px" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <div className="truncate text-sm font-semibold text-white">{asset.title || asset.fileName || "House reference"}</div>
                                                                {asset.primary ? <Badge className="border border-brand-purple/30 bg-brand-purple/15 text-brand-purple">Primary</Badge> : null}
                                                                {asset.pinned ? <Badge className="border border-white/10 bg-white/5 text-gray-200">Pinned</Badge> : null}
                                                            </div>
                                                            <p className="mt-1 break-words text-xs text-gray-400">{getReferenceSelectionReason(asset)}</p>
                                                            <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-gray-500">
                                                                <span>{formatAdminAiNullableNumber(asset.usageCount)} reuse <AdminStatusBadge state={sectionTruthState} className="ml-1 py-0.5" /></span>
                                                                <span>{formatAdminAiNullableNumber(asset.successfulReuseCount)} success</span>
                                                                <span>{formatAdminAiNullableNumber(asset.positiveReuseCount)} positive</span>
                                                            </div>
                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                {!asset.primary ? (
                                                                    <Button variant="outline" size="sm" onClick={() => void handleReferenceUpdate(asset.id, { primary: true }, "Primary style reference updated")} isLoading={updatingReferenceId === asset.id} disabled={isLocalAdminUiTestSession}>
                                                                        <Sparkles className="mr-2 h-3.5 w-3.5" />
                                                                        Set primary
                                                                    </Button>
                                                                ) : (
                                                                    <Button variant="outline" size="sm" onClick={() => void handleReferenceUpdate(asset.id, { primary: false }, "Primary style reference cleared")} isLoading={updatingReferenceId === asset.id} disabled={isLocalAdminUiTestSession}>
                                                                        Clear primary
                                                                    </Button>
                                                                )}
                                                                <Button variant="outline" size="sm" onClick={() => void handleReferenceUpdate(asset.id, { pinned: asset.pinned !== true }, asset.pinned ? "Reference unpinned" : "Reference pinned")} isLoading={updatingReferenceId === asset.id} disabled={isLocalAdminUiTestSession}>
                                                                    <Pin className="mr-2 h-3.5 w-3.5" />
                                                                    {asset.pinned ? "Unpin" : "Pin"}
                                                                </Button>
                                                                <Button variant="danger" size="sm" className="h-7 text-[10px] px-2" onClick={() => void handleReferenceDelete(asset.id)} isLoading={removingReferenceId === asset.id} disabled={isLocalAdminUiTestSession}>
                                                                    <Trash2 className="mr-1.5 h-3 w-3" />
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
                                                    <Button variant="danger" size="sm" onClick={handleLegacyTemplateDelete} isLoading={removingReferenceId === "template"} disabled={isLocalAdminUiTestSession}>
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
                                            <MetricCard label="House refs" value={formatAdminAiNullableNumber(data?.visualSignals.houseReferenceCount)} truthState={sectionTruthState} />
                                            <MetricCard label="Retained positive" value={formatAdminAiNullableNumber(data?.visualSignals.acceptedRetainedCount)} truthState={sectionTruthState} />
                                            <MetricCard label="Catalog fallback" value={formatAdminAiNullableNumber(data?.referenceAssets.catalogDropCovers.length)} truthState={sectionTruthState} />
                                            <MetricCard label="Reuse rate" value={data ? `${referenceReuseRate}%` : "[unavailable]"} truthState={sectionTruthState} />
                                        </div>
                                    </div>
                                    <details className="min-w-0 rounded-xl border border-white/10 bg-black/20 overflow-hidden group">
                                        <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-white hover:bg-white/[0.02]">
                                            Why the next set looks different
                                        </summary>
                                        <div className="p-4 space-y-2 text-xs text-gray-300 border-t border-white/10">
                                            <p className="break-words">The style lock keeps typography, ribbon rhythm, and poster finish stable.</p>
                                            <p className="break-words">The subject lock now derives the hero object and palette from the flavor side of <span className="font-semibold text-white">Creator | Flavor</span>.</p>
                                            <p className="break-words">Anti-anchoring blocks the reference subject from dictating the next food form unless the requested flavor matches it.</p>
                                        </div>
                                    </details>
                                </div>
                            </div>
                        </AdminDashboardModule>
    );
}
