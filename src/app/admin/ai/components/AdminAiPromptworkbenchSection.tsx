import { DisclosureSummary } from "@/components/ui/disclosure";
import { Disclosure } from "@/components/ui/disclosure";
import React from 'react';
import { WandSparkles } from "lucide-react";
import { AdminDashboardModule } from "@/components/Admin/AdminDashboardModule";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { MetricCard, TextAreaBlock, formatCompactTimestamp } from "../AiHelpers";
import type { AdminAiState } from '../hooks/useAdminAiState';

export function AdminAiPromptworkbenchSection({ state }: { state: AdminAiState }) {
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

    return (
        <AdminDashboardModule
                            title="Prompt"
                            description="Layout stays locked. Flavor comes from the title."
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
                                        disabled={!policyDirty || isLocalAdminUiTestSession}
                                    >
                                        Reset
                                    </Button>
                                    <Button variant="brand" size="sm" onClick={() => void handlePromptPolicySave()} isLoading={savingPromptPolicy} disabled={!policyDirty || isLocalAdminUiTestSession}>
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
                                    <TextAreaBlock label="Base prompt" value={policyDraft.baseStylePrompt} onChange={(value) => { setPolicyDraft((current) => ({ ...current, baseStylePrompt: value })); setPolicyDirty(true); }} rows={3} helper="Creator name and flavor title drive each run." />
                                    <Disclosure className="group border border-border bg-background/20 rounded-xl overflow-hidden">
                                        <DisclosureSummary className="cursor-pointer px-4 py-3 text-xs font-semibold text-foreground hover:bg-secondary">
                                            Advanced clauses
                                        </DisclosureSummary>
                                        <div className="p-4 space-y-3 border-t border-border">
                                            <TextAreaBlock label="Layout lock" value={policyDraft.lockedClauses} onChange={(value) => { setPolicyDraft((current) => ({ ...current, lockedClauses: value })); setPolicyDirty(true); }} rows={4} helper="One clause per line." />
                                            <TextAreaBlock label="Flavor rule" value={policyDraft.mutableClauses} onChange={(value) => { setPolicyDraft((current) => ({ ...current, mutableClauses: value })); setPolicyDirty(true); }} rows={4} helper="Keeps references from carrying flavor." />
                                            <TextAreaBlock label="Negative prompt" value={policyDraft.currentMutablePrompt} onChange={(value) => { setPolicyDraft((current) => ({ ...current, currentMutablePrompt: value })); setPolicyDirty(true); }} rows={4} helper="Blocks copied props and flavor leakage." />
                                        </div>
                                    </Disclosure>
                                </div>

                                <div className="min-w-0 flex flex-wrap gap-2">
                                    <Button variant="ghost"
                                        type="button"
                                        onClick={() => { setPolicyDraft((current) => ({ ...current, autoOptimize: !current.autoOptimize })); setPolicyDirty(true); }}
                                        className={cn("rounded-full border px-3 py-2 text-xs font-semibold transition", policyDraft.autoOptimize ? "border-primary/40 bg-primary/12 text-primary" : "border-border bg-secondary text-foreground")}
                                    >
                                        Auto optimize {policyDraft.autoOptimize ? "on" : "off"}
                                    </Button>
                                    <Button variant="ghost"
                                        type="button"
                                        onClick={() => void handleOptimizerEnabledChange(!(data?.settings.optimizerEnabled === true))}
                                        className={cn("rounded-full border px-3 py-2 text-xs font-semibold transition", data?.settings.optimizerEnabled ? "border-success/20 bg-success/10 text-success" : "border-border bg-secondary text-foreground")}
                                        disabled={savingReferenceSettings || isLocalAdminUiTestSession}
                                    >
                                        Runtime optimizer {data?.settings.optimizerEnabled ? "enabled" : "disabled"}
                                    </Button>
                                </div>

                                <Disclosure className="group border border-border bg-background/20 rounded-xl overflow-hidden mt-3">
                                    <DisclosureSummary className="cursor-pointer px-4 py-3 text-xs font-semibold text-foreground hover:bg-secondary">
                                        View Last Optimizer Run
                                    </DisclosureSummary>
                                    <div className="p-4 space-y-3 border-t border-border">
                                        <TextAreaBlock label="Latest optimizer proposal" value={data?.promptPolicy.optimizerProposal || "No optimizer proposal yet."} rows={4} readOnly />
                                        <TextAreaBlock label="Last auto-refinement diff" value={(data?.promptPolicy.lastAutoRefinementDiff || []).join("\n") || "No auto-refinement diff recorded yet."} rows={3} readOnly />
                                    </div>
                                </Disclosure>
                            </div>
                        </AdminDashboardModule>
    );
}
