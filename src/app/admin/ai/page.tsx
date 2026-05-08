"use client";

import React, { useMemo, useState } from "react";
import { Activity, ClipboardList, History, Power, SlidersHorizontal, WandSparkles } from "lucide-react";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { AdminModuleVerificationCard } from "@/components/Admin/AdminModuleVerificationCard";
import { AdminAiDescriptionOperations } from "@/components/Admin/AdminAiDescriptionOperations";
import { Button } from "@/components/ui/Button";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { MetricCard } from "./AiHelpers";
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
                                variant={state.data?.settings.enabled ? "outline" : "brand"}
                                size="sm"
                                onClick={state.handleToggle}
                                isLoading={state.updatingToggle}
                            >
                                <Power className="mr-2 h-3.5 w-3.5" />
                                {state.data?.settings.enabled ? "Disable" : "Enable"}
                            </Button>
                        </>
                    )}
                />

                <nav className="sticky top-[calc(env(safe-area-inset-top)+0.5rem)] z-20 -mx-1 overflow-x-auto border-b border-white/10 bg-black/90 px-1 py-2 backdrop-blur md:static md:mx-0 md:rounded-[1rem] md:border md:bg-white/[0.03]">
                    <div className="flex min-w-max gap-1 md:min-w-0 md:flex-wrap">
                        {ADMIN_AI_TASK_TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    aria-pressed={isActive}
                                    className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition ${isActive ? "border-brand-purple/40 bg-brand-purple/15 text-white" : "border-white/10 bg-black/35 text-gray-300 hover:bg-white/5"}`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </nav>

                {state.data?.verification ? (
                    <div className="mb-4">
                        <AdminModuleVerificationCard 
                            verification={state.data.verification} 
                            title="Cover Ops Verification" 
                            description="Source-of-truth diagnostic for the AI Cover Ops pipeline."
                        />
                    </div>
                ) : null}
                <section className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                    <MetricCard
                        label="Runtime"
                        value={state.data?.runtime.status === "ready" ? "Ready" : state.data?.runtime.status || "Loading"}
                        meta={state.latestDiagnostic?.summary || state.data?.runtime.note || "Waiting for runtime snapshot"}
                        tone={state.data?.runtime.status === "ready" ? "good" : "warn"}
                        truthState={state.data ? (state.data.runtime.status === "ready" ? "live" : "degraded") : dashboardTruthState}
                    />
                    <MetricCard
                        label="Current Policy"
                        value={`v${state.data?.promptPolicy.version || 1}`}
                        meta={`${state.currentVersionAcceptanceRate}% accept rate`}
                        tone={state.currentVersionAcceptanceRate >= 50 ? "good" : "neutral"}
                        truthState={dashboardTruthState}
                    />
                    <MetricCard
                        label="Reference Pool"
                        value={state.data?.visualSignals.totalReusableReferenceCount || 0}
                        meta={`${state.referencePreview.length}/${state.referenceCap} queued`}
                        tone={state.referencePreview.length > 0 ? "good" : "warn"}
                        truthState={dashboardTruthState}
                    />
                    <MetricCard
                        label="Rejected Gallery"
                        value={state.data?.reviewGallery.length || 0}
                        meta={state.data?.aggregate.generationCount ? `${Math.round(((state.data.aggregate.failedGenerationCount + state.data.reviewGallery.length) / Math.max(1, state.data.aggregate.generationCount)) * 100)}% not accepted` : "No history"}
                        truthState={dashboardTruthState}
                    />
                </section>

                {state.error && !state.data ? (
                    <div className="rounded-[1.2rem] border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
                        Failed to load AI cover operations. {state.error.message || "Error details unavailable."}
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
