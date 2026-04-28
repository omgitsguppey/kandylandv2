import React from 'react';
import { Activity, CheckCircle2, FileWarning, Loader2 } from "lucide-react";
import { AdminDashboardModule } from "@/components/Admin/AdminDashboardModule";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { formatAdminAiUsd  } from "@/lib/ai-drop-covers";
import { cn } from "@/lib/utils";
import { Badge, formatAdminAiNullableNumber, preflightTone, runtimeTone, resolveAdminAiDataState } from "../AiHelpers";
import type { AdminAiState } from '../hooks/useAdminAiState';


export function AdminAiRuntimestripSection({ state }: { state: AdminAiState }) {
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

    const sectionTruthState = resolveAdminAiDataState({ data, error, isLoading });
    const runtimeState = data?.runtime.status === "ready" ? "live" : data?.runtime.status === "disabled" ? "degraded" : sectionTruthState;

    return (
        <AdminDashboardModule
                            title="Runtime strip"
                            description="Model readiness and current preflight state."
                            defaultOpen={MODULE_DEFAULTS["admin_ai.runtime"]}
                            open={moduleOpenState["admin_ai.runtime"]}
                            onOpenChange={(nextOpen) => persistModuleState("admin_ai.runtime", nextOpen)}
                            actions={(
                              <div className="flex flex-wrap items-center gap-2">
                                <AdminStatusBadge state={runtimeState} />
                                <Badge className={cn("border", runtimeTone(data?.runtime.status))}>
                                    <Activity className="h-3.5 w-3.5" />
                                    {data?.runtime.status || "Waiting"}
                                </Badge>
                              </div>
                            )}
                        >
                            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                                <div className="min-w-0 rounded-[1.1rem] border border-white/10 bg-black/25 p-3.5">
                                    <div className="flex flex-wrap gap-2">
                                        {!data?.modelHealth ? (
                                            <div className="rounded-[1rem] border border-dashed border-white/10 bg-black/25 p-3 text-sm text-gray-400">
                                                <AdminStatusBadge state={sectionTruthState} className="mr-2" />
                                                Model health snapshot unavailable.
                                            </div>
                                        ) : data.modelHealth.map((entry) => (
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
                                                        <div className="mt-1 break-words text-[11px] text-gray-400">
                                                            {entry.maxReferenceInputs} refs • {formatAdminAiUsd(entry.pricePerGenerationUsd)}
                                                        </div>
                                                    </div>
                                                    <AdminStatusBadge state={entry.preflightStatus === "pass" ? "live" : entry.preflightStatus === "fail" ? "failed" : "degraded"} />
                                                </div>
                                                <p className="mt-2 break-words text-xs text-gray-400">{entry.note}</p>
                                                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-500">
                                                    <span>{formatAdminAiNullableNumber(entry.recentSuccessCount)} success</span>
                                                    <span>{formatAdminAiNullableNumber(entry.recentFailureCount)} fail</span>
                                                    <span>{formatAdminAiNullableNumber(entry.diagnosticErrorCount)} errors</span>
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
                                            onClick={() => data?.settings ? void handleReferenceToggle("useTemplateReference", !data.settings.useTemplateReference) : undefined}
                                            className={cn(
                                                "rounded-[1rem] border px-3 py-3 text-left transition",
                                                data?.settings.useTemplateReference ? "border-brand-purple/40 bg-brand-purple/10" : data?.settings ? "border-white/10 bg-white/[0.03]" : "border-amber-400/20 bg-amber-500/10",
                                            )}
                                            disabled={savingReferenceSettings || !data?.settings}
                                        >
                                            <div className="text-xs font-semibold text-white">Template lock</div>
                                            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-gray-400"><AdminStatusBadge state={data?.settings ? sectionTruthState : "unavailable"} className="py-0.5" /> Guide typography & style</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => data?.settings ? void handleReferenceToggle("useRecentDropCoverReferences", !data.settings.useRecentDropCoverReferences) : undefined}
                                            className={cn(
                                                "rounded-[1rem] border px-3 py-3 text-left transition",
                                                data?.settings.useRecentDropCoverReferences ? "border-brand-purple/40 bg-brand-purple/10" : data?.settings ? "border-white/10 bg-white/[0.03]" : "border-amber-400/20 bg-amber-500/10",
                                            )}
                                            disabled={savingReferenceSettings || !data?.settings}
                                        >
                                            <div className="text-xs font-semibold text-white">Catalog backfill</div>
                                            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-gray-400"><AdminStatusBadge state={data?.settings ? sectionTruthState : "unavailable"} className="py-0.5" /> Fill spare refs</div>
                                        </button>
                                    </div>
                                </div>

                                <div className="min-w-0 rounded-[1.1rem] border border-white/10 bg-black/25 p-3.5">
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {!data?.preflightChecks ? (
                                            <div className="rounded-[1rem] border border-dashed border-white/10 bg-black/25 p-3 text-sm text-gray-400">
                                                <AdminStatusBadge state={sectionTruthState} className="mr-2" />
                                                Preflight checks unavailable.
                                            </div>
                                        ) : data.preflightChecks.map((check) => (
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
    );
}
