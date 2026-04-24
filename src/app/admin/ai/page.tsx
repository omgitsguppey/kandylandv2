"use client";

import React from "react";
import { Power } from "lucide-react";
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

export default function AIAdminPage() {
    const fullState = useAdminAiState();
    const { libraryInputRef, primaryInputRef, ...state } = fullState;

    return (
        <div className="min-h-screen overflow-x-clip bg-black px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 lg:px-8">
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
                    />
                    <MetricCard
                        label="Current Policy"
                        value={`v${state.data?.promptPolicy.version || 1}`}
                        meta={`${state.currentVersionAcceptanceRate}% accept rate`}
                        tone={state.currentVersionAcceptanceRate >= 50 ? "good" : "neutral"}
                    />
                    <MetricCard
                        label="Reference Pool"
                        value={state.data?.visualSignals.totalReusableReferenceCount || 0}
                        meta={`${state.referencePreview.length}/${state.referenceCap} queued`}
                        tone={state.referencePreview.length > 0 ? "good" : "warn"}
                    />
                    <MetricCard
                        label="Rejected Gallery"
                        value={state.data?.reviewGallery.length || 0}
                        meta={state.data?.aggregate.generationCount ? `${Math.round(((state.data.aggregate.failedGenerationCount + state.data.reviewGallery.length) / Math.max(1, state.data.aggregate.generationCount)) * 100)}% not accepted` : "No history"}
                    />
                </section>

                {state.error && !state.data ? (
                    <div className="rounded-[1.2rem] border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
                        Failed to load AI cover operations. {state.error.message || "Unknown error."}
                    </div>
                ) : null}

                <div className="grid min-w-0 gap-4 xl:grid-cols-12">
                    <div className="min-w-0 space-y-4 xl:col-span-7">
                        <AdminAiRuntimestripSection state={fullState} />
                        <AdminAiReferencelibrarySection state={fullState} />
                        <AdminAiRecentgenerationsSection state={fullState} />
                    </div>

                    <div className="min-w-0 space-y-4 xl:col-span-5">
                        <AdminAiPromptworkbenchSection state={fullState} />
                        <AdminAiReviewgallerySection state={fullState} />
                        <AdminAiOptimizerhealthSection state={fullState} />
                        <AdminAiDiagnosticsSection state={fullState} />
                    </div>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                    <AdminAiDescriptionOperations />
                </div>
            </div>
        </div>
    );
}
