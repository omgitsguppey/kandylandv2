"use client";

import React, { useMemo, useState } from "react";
import { Activity, ClipboardList, History, Power, RefreshCw, SlidersHorizontal, WandSparkles } from "lucide-react";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { AdminAiDescriptionOperations } from "@/components/Admin/AdminAiDescriptionOperations";
import { Button } from "@/components/ui/Button";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";
import {
    ADMIN_AI_NO_SOURCE_VALUE,
    ADMIN_AI_NO_VERIFIED_RUNS_VALUE,
    MetricCard,
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
    const activeTabMeta = useMemo(
        () => ADMIN_AI_TASK_TABS.find((tab) => tab.id === activeTab) || ADMIN_AI_TASK_TABS[0],
        [activeTab],
    );

    return (
        <div className="min-h-screen overflow-x-clip bg-black px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8" data-ai-dashboard-density="compact-v2">
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

            <div className="mx-auto min-w-0 max-w-7xl space-y-4 overflow-x-clip">
                <AdminPageHeader
                    eyebrow="Admin AI"
                    title="Cover Ops"
                    subtitle={state.subtitle}
                    compact
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
                />

                {state.isLocalAdminUiTestSession ? (
                    <div
                        className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
                        data-admin-ai-fixture-boundary="true"
                    >
                        <div className="flex flex-wrap items-center gap-2">
                            <AdminStatusBadge state="unavailable" />
                            <span className="font-bold text-white">Local UI review only.</span>
                            <span>No verified Cover Ops source is loaded in this local review. Use a real admin session before reading runtime evidence, uploading references, changing settings, or reviewing generations.</span>
                        </div>
                    </div>
                ) : null}

                <nav className="sticky top-[calc(env(safe-area-inset-top)+0.5rem)] z-20 -mx-1 border-b border-white/10 bg-black/90 px-1 py-2 backdrop-blur md:static md:mx-0 md:rounded-[1rem] md:border md:bg-white/[0.03]">
                    <div className="flex flex-wrap gap-1">
                        {ADMIN_AI_TASK_TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    aria-pressed={isActive}
                                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition sm:min-h-10 sm:gap-2 sm:px-3 sm:text-sm ${isActive ? "border-brand-purple/40 bg-brand-purple/15 text-white" : "border-white/10 bg-black/35 text-gray-300 hover:bg-white/5"}`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </nav>

                <section className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                    <MetricCard
                        label="Runtime"
                        value={state.data?.runtime.status === "ready" ? "Ready" : state.data?.runtime.status || (state.isLoading ? "Loading" : ADMIN_AI_NO_SOURCE_VALUE)}
                        meta={state.latestDiagnostic?.summary || state.data?.runtime.note || (state.isLoading ? "Waiting for runtime snapshot" : "No runtime source loaded")}
                        tone={state.data?.runtime.status === "ready" ? "good" : "warn"}
                        truthState={state.data ? (state.data.runtime.status === "ready" ? "live" : "degraded") : dashboardTruthState}
                    />
                    <MetricCard
                        label="Current Policy"
                        value={state.data ? `v${state.data.promptPolicy.version}` : ADMIN_AI_NO_SOURCE_VALUE}
                        meta={state.data ? (state.currentVersionJobs.length > 0 ? `${formatAdminAiSnapshotPercent(state.currentVersionAcceptanceRate, true)} accept rate` : ADMIN_AI_NO_VERIFIED_RUNS_VALUE) : "No policy source loaded"}
                        tone={state.data && state.currentVersionAcceptanceRate >= 50 ? "good" : "neutral"}
                        truthState={dashboardTruthState}
                    />
                    <MetricCard
                        label="Reference Pool"
                        value={formatAdminAiSnapshotNumber(state.data?.visualSignals.totalReusableReferenceCount, hasDashboardSnapshot)}
                        meta={state.data ? `${state.referencePreview.length}/${state.referenceCap} selected` : "No reference snapshot loaded"}
                        tone={state.referencePreview.length > 0 ? "good" : "warn"}
                        truthState={dashboardTruthState}
                    />
                    <MetricCard
                        label="Review Gallery"
                        value={formatAdminAiSnapshotNumber(state.data?.reviewGallery.length, hasDashboardSnapshot)}
                        meta={state.data?.aggregate.generationCount ? `${Math.round(((state.data.aggregate.failedGenerationCount + state.data.reviewGallery.length) / Math.max(1, state.data.aggregate.generationCount)) * 100)}% not accepted` : state.data ? "No generation history" : "No gallery source loaded"}
                        truthState={dashboardTruthState}
                    />
                </section>

                {state.error && !state.data ? (
                    <div className="rounded-[1.2rem] border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100" data-admin-ai-safe-error="true">
                        Failed to load AI cover operations. {safeLoadErrorMessage}
                    </div>
                ) : null}

                <section className="min-w-0 space-y-4" aria-label={`${activeTabMeta.label} AI operations`}>
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
            </div>
        </div>
    );
}
