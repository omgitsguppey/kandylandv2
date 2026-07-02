import React from "react";
import Image from "next/image";
import { AdminDashboardModule } from "@/components/Admin/AdminDashboardModule";
import { cn } from "@/lib/utils";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { Badge, EmptyState, MetricCard, formatAdminAiNullableNumber, formatCompactTimestamp, getReferenceSourceLabel, resolveAdminAiDataState } from "../AiHelpers";
import type { AdminAiState } from "../hooks/useAdminAiState";

export function AdminAiRecentgenerationsSection({ state }: { state: AdminAiState }) {
    const {
        moduleOpenState,
        data,
        error,
        isLoading,
        MODULE_DEFAULTS,
        persistModuleState,
    } = state;

    const sectionTruthState = resolveAdminAiDataState({ data, error, isLoading });
    const recentJobs = data?.recentJobs;

    return (
        <AdminDashboardModule
            title="Recent generations"
            description="Recent jobs show the compact result and collapsed debug details."
            defaultOpen={MODULE_DEFAULTS["admin_ai.recent"]}
            open={moduleOpenState["admin_ai.recent"]}
            onOpenChange={(nextOpen) => persistModuleState("admin_ai.recent", nextOpen)}
            actions={(
                <div className="flex flex-wrap items-center gap-2">
                    <AdminStatusBadge state={sectionTruthState} />
                </div>
            )}
        >
            {!recentJobs ? (
                <EmptyState
                    title="No generation job source"
                    detail={error ? "The generation job source failed to load." : "Waiting for a verified generation job snapshot."}
                />
            ) : recentJobs.length === 0 ? (
                <EmptyState title="No generation jobs yet" detail="Generate a cover from Create Drop to populate prompt lineage here." />
            ) : (
                <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                    {recentJobs.map((job) => {
                        const jobTruthState = job.status === "failed" ? "failed" : sectionTruthState;
                        return (
                            <div key={job.id} className="min-w-0 overflow-hidden rounded-[1.1rem] border border-white/10 bg-black/25">
                                <div className="relative aspect-video overflow-hidden bg-black/40">
                                    {job.imageUrl ? (
                                        <Image src={job.imageUrl} alt={job.title} fill className="object-cover" sizes="(min-width: 1280px) 360px, 100vw" />
                                    ) : (
                                        <div className="flex h-full flex-col items-center justify-center gap-1 text-xs text-gray-500">
                                            <AdminStatusBadge state={jobTruthState} className="py-0.5" />
                                            <span>No image saved</span>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3 p-3.5">
                                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-white">{job.title}</div>
                                            <div className="mt-1 break-words text-xs text-gray-400">
                                                {formatCompactTimestamp(job.requestedAtMs)} - {job.model}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <AdminStatusBadge state={jobTruthState} />
                                            <Badge
                                                className={cn(
                                                    "border",
                                                    job.status === "succeeded"
                                                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                                                        : job.status === "failed"
                                                            ? "border-red-400/20 bg-red-500/10 text-red-100"
                                                            : "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
                                                )}
                                            >
                                                {job.status}
                                            </Badge>
                                        </div>
                                    </div>

                                    <details className="overflow-hidden rounded-[0.95rem] border border-white/10 bg-white/[0.03]">
                                        <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-semibold text-white hover:bg-white/[0.02]">
                                            Debug details
                                        </summary>
                                        <div className="space-y-3 border-t border-white/10 px-3 pb-3 pt-2 text-[11px] text-gray-300">
                                            <div className="grid grid-cols-2 gap-2">
                                                <MetricCard
                                                    label="Queued refs"
                                                    value={formatAdminAiNullableNumber(job.usedReferenceCount ?? job.referenceImageCount)}
                                                    meta={`Pool ${formatAdminAiNullableNumber(job.referenceRequestCount)} - Max ${formatAdminAiNullableNumber(job.maxReferenceCount)}${(job.droppedReferenceCount || 0) > 0 ? ` - Dropped ${formatAdminAiNullableNumber(job.droppedReferenceCount)}` : ""}`}
                                                    truthState={jobTruthState}
                                                />
                                                <MetricCard
                                                    label="Risk"
                                                    value={job.overAnchoringRisk || "Not recorded"}
                                                    meta={job.referenceTruncated ? "Reference cap applied" : "Within cap"}
                                                    truthState={job.overAnchoringRisk ? jobTruthState : "unavailable"}
                                                />
                                            </div>

                                            <div>
                                                <div className="mb-0.5 font-semibold text-white">Prompt provenance</div>
                                                <pre className="whitespace-pre-wrap break-words font-sans text-gray-400">{job.workingPrompt || "Not recorded"}</pre>
                                            </div>
                                            {job.optimizerAdjustedPrompt ? (
                                                <div>
                                                    <div className="mb-0.5 font-semibold text-white">Optimizer adjusted</div>
                                                    <pre className="whitespace-pre-wrap break-words font-sans text-gray-400">{job.optimizerAdjustedPrompt}</pre>
                                                </div>
                                            ) : null}
                                            {job.providerEnhancedPrompt ? (
                                                <div>
                                                    <div className="mb-0.5 font-semibold text-white">Provider enhanced</div>
                                                    <pre className="whitespace-pre-wrap break-words font-sans text-gray-400">{job.providerEnhancedPrompt}</pre>
                                                </div>
                                            ) : null}
                                            <div>
                                                <div className="mb-0.5 font-semibold text-white">References used</div>
                                                {(job.referenceAssets || []).length === 0 ? (
                                                    <p className="flex items-center gap-2 text-[11px] text-gray-400">
                                                        <AdminStatusBadge state="unavailable" className="py-0.5" />
                                                        No reference metadata stored on this job.
                                                    </p>
                                                ) : (
                                                    (job.referenceAssets || []).map((asset) => (
                                                        <div key={`${job.id}-${asset.id}`} className="flex min-w-0 items-center gap-2 rounded-[0.8rem] border border-white/8 bg-black/25 p-2">
                                                            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/30">
                                                                <Image src={asset.imageUrl} alt={asset.title || "Reference"} fill className="object-cover" sizes="32px" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="truncate text-xs font-semibold text-white">{asset.title || asset.fileName || "Reference"}</div>
                                                                <div className="mt-0.5 text-[10px] text-gray-400">{getReferenceSourceLabel(asset)}</div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </AdminDashboardModule>
    );
}
