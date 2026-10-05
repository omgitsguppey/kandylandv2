import { Button } from "@/components/ui/Button";
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
                                <div className="min-w-0 rounded-[1.1rem] border border-border bg-background/25 p-3.5">
                                    <div className="flex flex-wrap gap-2">
                                        {!data?.modelHealth ? (
                                            <div className="rounded-[1rem] border border-dashed border-border bg-background/25 p-3 text-sm text-muted-foreground">
                                                <AdminStatusBadge state={sectionTruthState} className="mr-2" />
                                                No model health source loaded yet.
                                            </div>
                                        ) : data.modelHealth.map((entry) => (
                                            <Button variant="ghost"
                                                key={entry.id}
                                                type="button"
                                                onClick={() => void handleDefaultModelChange(entry.id)}
                                                disabled={isLocalAdminUiTestSession}
                                                className={cn(
                                                    "min-w-0 flex-1 rounded-[1rem] border px-3 py-3 text-left transition",
                                                    entry.selected ? "border-primary/40 bg-primary/12" : "border-border bg-secondary hover:border-border",
                                                )}
                                            >
                                                <div className="flex min-w-0 items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold text-foreground">{entry.label}</div>
                                                        <div className="mt-1 break-words text-[11px] text-muted-foreground">
                                                            {entry.maxReferenceInputs} refs - {formatAdminAiUsd(entry.pricePerGenerationUsd)}
                                                        </div>
                                                    </div>
                                                    <AdminStatusBadge state={entry.preflightStatus === "pass" ? "live" : entry.preflightStatus === "fail" ? "failed" : "degraded"} />
                                                </div>
                                                <p className="mt-2 break-words text-xs text-muted-foreground">{entry.note}</p>
                                                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                                                    <span>{formatAdminAiNullableNumber(entry.recentSuccessCount)} success</span>
                                                    <span>{formatAdminAiNullableNumber(entry.recentFailureCount)} fail</span>
                                                    <span>{formatAdminAiNullableNumber(entry.diagnosticErrorCount)} errors</span>
                                                </div>
                                                {entry.selected && savingModelId === entry.id ? (
                                                    <div className="mt-2 flex items-center gap-2 text-xs text-primary">
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        Updating default
                                                    </div>
                                                ) : null}
                                            </Button>
                                        ))}
                                    </div>

                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                        <Button variant="ghost"
                                            type="button"
                                            onClick={() => data?.settings ? void handleReferenceToggle("useTemplateReference", !data.settings.useTemplateReference) : undefined}
                                            className={cn(
                                                "rounded-[1rem] border px-3 py-3 text-left transition",
                                                data?.settings.useTemplateReference ? "border-primary/40 bg-primary/10" : data?.settings ? "border-border bg-secondary" : "border-warning/20 bg-warning/10",
                                            )}
                                            disabled={savingReferenceSettings || !data?.settings || isLocalAdminUiTestSession}
                                        >
                                            <div className="text-xs font-semibold text-foreground">Template lock</div>
                                            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground"><AdminStatusBadge state={data?.settings ? sectionTruthState : "unavailable"} className="py-0.5" /> Guide typography & style</div>
                                        </Button>
                                        <Button variant="ghost"
                                            type="button"
                                            onClick={() => data?.settings ? void handleReferenceToggle("useRecentDropCoverReferences", !data.settings.useRecentDropCoverReferences) : undefined}
                                            className={cn(
                                                "rounded-[1rem] border px-3 py-3 text-left transition",
                                                data?.settings.useRecentDropCoverReferences ? "border-primary/40 bg-primary/10" : data?.settings ? "border-border bg-secondary" : "border-warning/20 bg-warning/10",
                                            )}
                                            disabled={savingReferenceSettings || !data?.settings || isLocalAdminUiTestSession}
                                        >
                                            <div className="text-xs font-semibold text-foreground">Catalog backfill</div>
                                            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground"><AdminStatusBadge state={data?.settings ? sectionTruthState : "unavailable"} className="py-0.5" /> Fill spare refs</div>
                                        </Button>
                                    </div>
                                </div>

                                <div className="min-w-0 rounded-[1.1rem] border border-border bg-background/25 p-3.5">
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {!data?.preflightChecks ? (
                                            <div className="rounded-[1rem] border border-dashed border-border bg-background/25 p-3 text-sm text-muted-foreground">
                                                <AdminStatusBadge state={sectionTruthState} className="mr-2" />
                                                No preflight source loaded yet.
                                            </div>
                                        ) : data.preflightChecks.map((check) => (
                                            <div key={check.key} className={cn("rounded-[1rem] border px-3 py-3", preflightTone(check.status))}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="text-sm font-semibold text-foreground">{check.label}</div>
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
