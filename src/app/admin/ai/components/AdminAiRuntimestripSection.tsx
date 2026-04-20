import React from 'react';
import Image from "next/image";
import { Activity, CheckCircle2, ChevronRight, Eye, FileWarning, Loader2, Pin, Power, RefreshCw, Sparkles, Trash2, Upload, WandSparkles } from "lucide-react";
import { AdminDashboardModule } from "@/components/Admin/AdminDashboardModule";
import { Button } from "@/components/ui/Button";
import { formatAdminAiUsd } from "@/lib/ai-drop-covers";
import { cn } from "@/lib/utils";
import { Badge, EmptyState, MetricCard, TextAreaBlock, diagnosticTone, formatCompactTimestamp, formatTimestamp, getReferenceSelectionReason, getReferenceSourceLabel, preflightTone, runtimeTone, statTone } from "./AiHelpers";
import type { AdminAiState, ReviewFilter } from '../hooks/useAdminAiState';
import { ADMIN_AI_DROP_COVER_ACTIVE_POLL_INTERVAL_MS, ADMIN_AI_DROP_COVER_IDLE_POLL_INTERVAL_MS } from "@/lib/ai-drop-covers";

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

    return (
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
    );
}
