"use client";

import React, { useState } from "react";
import { Activity, ClipboardList, History, Power, RefreshCw, SlidersHorizontal, WandSparkles } from "lucide-react";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { AdminAiDescriptionOperations } from "@/components/Admin/AdminAiDescriptionOperations";
import { Button } from "@/components/ui/Button";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { AdminAiOperationsCanvas } from "@/components/creative-tim/kandydrops/admin-ai/AdminAiOperationsCanvas";
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";
import {
    ADMIN_AI_NO_SOURCE_VALUE,
    ADMIN_AI_NO_VERIFIED_RUNS_VALUE,
    formatAdminAiSnapshotNumber,
    formatAdminAiSnapshotPercent,
} from "./AiHelpers";
import { useAdminAiState } from "./hooks/useAdminAiState";
import { AdminAiRuntimestripSection } from "./components/AdminAiRuntimestripSection";
import { AdminAiReferencelibrarySection } from "./components/AdminAiReferencelibrarySection";
import { AdminAiRecentgenerationsSection } from "./components/AdminAiRecentgenerationsSection";
import { AdminAiPromptworkbenchSection } from "./components/AdminAiPromptworkbenchSection";
import { AdminAiReviewgallerySection } from "./components/AdminAiReviewgallerySection";
import { AdminAiOptimizerhealthSection } from "./components/AdminAiOptimizerhealthSection";
import { AdminAiDiagnosticsSection } from "./components/AdminAiDiagnosticsSection";

type AdminAiTaskTab = "generate" | "prompt" | "references" | "history" | "diagnostics";

const ADMIN_AI_TASK_TABS: Array<{ id: AdminAiTaskTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "generate", label: "Generate", icon: WandSparkles },
    { id: "prompt", label: "Prompt", icon: SlidersHorizontal },
    { id: "references", label: "References", icon: ClipboardList },
    { id: "history", label: "History", icon: History },
    { id: "diagnostics", label: "Diagnostics", icon: Activity },
];

export default function AIAdminPage() {
    const fullState = useAdminAiState();
    const { libraryInputRef, primaryInputRef, ...state } = fullState;
    const [activeTab, setActiveTab] = useState<AdminAiTaskTab>("generate");
    const dashboardTruthState = state.data ? "live" : state.error ? "failed" : state.isLoading ? "loading" : "unavailable";
    const hasDashboardSnapshot = Boolean(state.data);
    const safeLoadErrorMessage = state.error
        ? sanitizeErrorForUser(state.error, "admin_truth", "admin_truth_unavailable").operatorMessage
        : null;
    return (
        <>
            <PageViewEvent eventName="admin_ai_viewed" eventParams={{ page: "admin-ai" }} />
            <input
                ref={libraryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={fullState.handleLibraryUploadChange}
            />
            <input
                ref={primaryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={fullState.handlePrimaryUploadChange}
            />
            <AdminAiOperationsCanvas
                activeOperation={activeTab}
                actions={(
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void state.mutate()}
                            disabled={state.isLocalAdminUiTestSession}
                        >
                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            Refresh
                        </Button>
                        <Button
                            variant={state.data?.settings.enabled ? "outline" : "brand"}
                            size="sm"
                            onClick={state.handleToggle}
                            isLoading={state.updatingToggle}
                            disabled={state.isLocalAdminUiTestSession}
                        >
                            <Power className="mr-2 h-3.5 w-3.5" />
                            {state.data?.settings.enabled ? "Disable" : "Enable"}
                        </Button>
                    </>
                )}
                error={state.error && !state.data ? (
                    <div className="border-l-2 border-destructive bg-destructive/10 px-4 py-4 text-sm text-destructive" data-admin-ai-safe-error="true">
                        Failed to load AI cover operations. {safeLoadErrorMessage}
                    </div>
                ) : null}
                facts={[
                    {
                        label: "Runtime",
                        value: state.data?.runtime.status === "ready" ? "Ready" : state.data?.runtime.status || (state.isLoading ? "Loading" : ADMIN_AI_NO_SOURCE_VALUE),
                        detail: state.latestDiagnostic?.summary || state.data?.runtime.note || (state.isLoading ? "Waiting for runtime snapshot" : "No runtime source loaded"),
                        truthState: state.data ? (state.data.runtime.status === "ready" ? "live" : "degraded") : dashboardTruthState,
                    },
                    {
                        label: "Current Policy",
                        value: state.data ? `v${state.data.promptPolicy.version}` : ADMIN_AI_NO_SOURCE_VALUE,
                        detail: state.data ? (state.currentVersionJobs.length > 0 ? `${formatAdminAiSnapshotPercent(state.currentVersionAcceptanceRate, true)} accept rate` : ADMIN_AI_NO_VERIFIED_RUNS_VALUE) : "No policy source loaded",
                        truthState: dashboardTruthState,
                    },
                    {
                        label: "Reference Pool",
                        value: formatAdminAiSnapshotNumber(state.data?.visualSignals.totalReusableReferenceCount, hasDashboardSnapshot),
                        detail: state.data ? `${state.referencePreview.length}/${state.referenceCap} selected` : "No reference snapshot loaded",
                        truthState: dashboardTruthState,
                    },
                    {
                        label: "Review Gallery",
                        value: formatAdminAiSnapshotNumber(state.data?.reviewGallery.length, hasDashboardSnapshot),
                        detail: state.data?.aggregate.generationCount ? `${Math.round(((state.data.aggregate.failedGenerationCount + state.data.reviewGallery.length) / Math.max(1, state.data.aggregate.generationCount)) * 100)}% not accepted` : state.data ? "No generation history" : "No gallery source loaded",
                        truthState: dashboardTruthState,
                    },
                ]}
                fixture={state.isLocalAdminUiTestSession ? (
                    <div
                        className="border-l-2 border-warning bg-warning/10 px-3 py-2 text-xs text-warning"
                        data-admin-ai-fixture-boundary="true"
                    >
                        <div className="flex flex-wrap items-center gap-2">
                            <AdminStatusBadge state="unavailable" />
                            <span className="font-semibold text-foreground">source_missing fixture.</span>
                            <span>source_missing: Cover Ops source is not loaded in this fixture. Protected reads and writes stay blocked until verified admin access provides the source.</span>
                        </div>
                    </div>
                ) : null}
                onOperationChange={(operationId) => setActiveTab(operationId as AdminAiTaskTab)}
                operations={ADMIN_AI_TASK_TABS}
                subtitle={state.subtitle}
            >
                <section className="min-w-0 space-y-4">
                    {activeTab === "generate" ? (
                        <>
                            <AdminAiRuntimestripSection state={fullState} />
                            <AdminAiRecentgenerationsSection state={fullState} />
                            <AdminAiDescriptionOperations compact />
                        </>
                    ) : null}
                    {activeTab === "prompt" ? (
                        <>
                            <AdminAiPromptworkbenchSection state={fullState} />
                            <AdminAiOptimizerhealthSection state={fullState} />
                        </>
                    ) : null}
                    {activeTab === "references" ? (
                        <AdminAiReferencelibrarySection state={fullState} />
                    ) : null}
                    {activeTab === "history" ? (
                        <AdminAiReviewgallerySection state={fullState} />
                    ) : null}
                    {activeTab === "diagnostics" ? (
                        <AdminAiDiagnosticsSection state={fullState} />
                    ) : null}
                </section>
            </AdminAiOperationsCanvas>
        </>
    );
}
