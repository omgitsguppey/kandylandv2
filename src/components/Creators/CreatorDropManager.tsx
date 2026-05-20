"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Package, Plus, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";

import { CreateDropModal } from "@/components/Admin/CreateDropModal";
import { MarqueeText } from "@/components/ui/MarqueeText";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { resolveCreatorDropMetrics, type CreatorDropMetricsResolution } from "@/lib/drops/drop-metrics-resolver";
import { resolveDropStatus, type DropStatusResolution } from "@/lib/drops/drop-status-resolver";
import { trackEvent } from "@/lib/telemetry";
import { getMobileModuleClassNames } from "@/lib/ui/mobile-scale-contract";
import { createStaleRequestGuard, getMobileSkeletonClass, getModuleLoadingState } from "@/lib/ui/loading-state-contract";

type CreatorDropReviewStatus = "draft" | "pending_admin_approval" | "approved" | "needs_changes" | "rejected";
type CreatorDropFilter = "all" | CreatorDropReviewStatus;

type CreatorDropRow = {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    status?: string;
    approvalStatus?: string;
    reviewStatus?: string;
    publicDiscovery?: boolean;
    rotationEligibility?: boolean;
    createdByRole?: string;
    submittedByCreatorId?: string;
    assignedCreatorIds?: string[];
    unlockCost?: number;
    validUntil?: number | null;
    expiresAt?: number | null;
    totalViews?: number | null;
    totalClicks?: number | null;
    totalUnlocks?: number | null;
    metrics?: CreatorDropMetricsResolution["serialized"];
    statusResolution?: DropStatusResolution;
    updatedAt?: number | string | null;
};

const REVIEW_TABS: Array<{
    id: CreatorDropFilter;
    label: string;
    icon: typeof Package;
}> = [
    { id: "all", label: "All", icon: Package },
    { id: "draft", label: "Drafts", icon: Package },
    { id: "pending_admin_approval", label: "Pending", icon: Clock3 },
    { id: "approved", label: "Approved", icon: CheckCircle2 },
    { id: "needs_changes", label: "Needs changes", icon: AlertCircle },
    { id: "rejected", label: "Rejected", icon: XCircle },
];

const REVIEW_STATUS_LABELS: Record<CreatorDropReviewStatus, string> = {
    draft: "Draft",
    pending_admin_approval: "Waiting on admin review",
    approved: "Approved",
    needs_changes: "Needs changes",
    rejected: "Not approved",
};

const creatorManagerModuleClassName = getMobileModuleClassNames("creator", "manager");
const creatorDropListSkeletonClassName = getMobileSkeletonClass("creator", "list");

function classifyDrop(drop: CreatorDropRow): CreatorDropReviewStatus {
    const status = drop.statusResolution ?? resolveDropStatus(drop);
    if (status.creatorStatusKey === "needs_changes") return "needs_changes";
    if (status.creatorStatusKey === "rejected") return "rejected";
    if (status.creatorStatusKey === "approved_live" || status.creatorStatusKey === "admin_created" || status.creatorStatusKey === "expired") return "approved";
    if (status.creatorStatusKey === "pending_review" || status.creatorStatusKey === "creator_submitted") return "pending_admin_approval";
    return "draft";
}

function statusToneClassName(tone: DropStatusResolution["statusTone"]) {
    if (tone === "success") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
    if (tone === "warning") return "border-amber-300/30 bg-amber-300/10 text-amber-100";
    if (tone === "danger") return "border-red-400/30 bg-red-400/10 text-red-100";
    if (tone === "info") return "border-sky-300/30 bg-sky-300/10 text-sky-100";
    if (tone === "muted") return "border-white/10 bg-white/[0.035] text-gray-400";
    return "border-white/10 bg-white/5 text-gray-300";
}

function renderMetric(metric: CreatorDropMetricsResolution["views"]) {
    return metric.displayValue;
}

export function CreatorDropManager() {
    const { user } = useAuth();
    const [drops, setDrops] = useState<CreatorDropRow[]>([]);
    const [activeTab, setActiveTab] = useState<CreatorDropFilter>("all");
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const openedTrackedRef = useRef(false);
    const dropLoadGuardRef = useRef(createStaleRequestGuard());

    const loadDrops = useCallback(async () => {
        const requestId = dropLoadGuardRef.current.next();
        setLoading(true);
        try {
            const response = await authFetch("/api/creator/drops?limit=100");
            const result = await response.json() as { drops?: CreatorDropRow[]; error?: string };
            if (!response.ok) {
                throw new Error(result.error || "Unable to load creator drops.");
            }
            if (!dropLoadGuardRef.current.isFresh(requestId)) {
                return;
            }
            setDrops(Array.isArray(result.drops) ? result.drops : []);
        } catch (error) {
            if (dropLoadGuardRef.current.isFresh(requestId)) {
                toast.error(error instanceof Error ? error.message : "Unable to load creator drops.");
            }
        } finally {
            if (dropLoadGuardRef.current.isFresh(requestId)) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void loadDrops();
    }, [loadDrops]);

    useEffect(() => {
        if (openedTrackedRef.current) return;
        openedTrackedRef.current = true;
        trackEvent("creator_drop_manager_opened", {
            source_component: "CreatorDropManager",
            surface: "creator_submission",
            ui_density: "mobile_compact",
        });
    }, []);

    const tabCounts = useMemo(() => {
        return REVIEW_TABS.reduce<Record<CreatorDropFilter, number>>((acc, tab) => {
            acc[tab.id] = tab.id === "all" ? drops.length : drops.filter((drop) => classifyDrop(drop) === tab.id).length;
            return acc;
        }, {
            all: 0,
            draft: 0,
            pending_admin_approval: 0,
            approved: 0,
            needs_changes: 0,
            rejected: 0,
        });
    }, [drops]);

    const visibleDrops = useMemo(
        () => activeTab === "all" ? drops : drops.filter((drop) => classifyDrop(drop) === activeTab),
        [activeTab, drops],
    );
    const dropListLoadingState = getModuleLoadingState({ loading, hasData: visibleDrops.length > 0 });
    const showDropListSkeleton = dropListLoadingState === "loading";

    const openSubmitForm = useCallback(() => {
        trackEvent("creator_drop_submission_started", {
            source_component: "CreatorDropManager",
            surface: "creator_submission",
            ui_density: "mobile_compact",
        });
        setIsModalOpen(true);
    }, []);

    return (
        <main
            className="min-h-[calc(100dvh-var(--root-shell-top-spacing,5rem))] bg-[#0b0614] px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] pt-5 text-white sm:px-6 lg:px-8"
            data-creator-drop-manager="true"
            data-drop-manager-surface="creator_submission"
            data-admin-approval-required="true"
            data-bottom-nav-safe="true"
            data-mobile-primary-action="submit_drop"
            data-mobile-density="compact"
            data-mobile-sprawl-guard="true"
            data-mobile-organization="summary-first"
            data-mobile-drilldown="true"
            data-desktop-flow-collapsed="true"
        >
            <section className="mx-auto flex w-full max-w-5xl flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black tracking-normal text-white sm:text-3xl">Manage drops</h1>
                        <p className="text-sm leading-5 text-gray-300">Submit drops for review before they go live.</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => void loadDrops()}
                            className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 text-sm font-bold text-gray-100 transition-colors hover:bg-white/10"
                            aria-label="Refresh creator drops"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={openSubmitForm}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-purple px-4 text-sm font-black text-white shadow-lg shadow-brand-purple/25 transition-transform hover:scale-[1.01]"
                        >
                            <Plus className="h-4 w-4" />
                            Submit drop
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Creator drop status filters" data-creator-drop-status-filter="all" data-mobile-density="compact" data-mobile-sprawl-guard="true" data-mobile-drilldown="true" data-desktop-flow-collapsed="true">
                    {REVIEW_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                data-creator-drop-status-filter={tab.id}
                                className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${active ? "border-brand-purple/60 bg-brand-purple/20" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"}`}
                            >
                                <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-300">
                                    <Icon className="h-3.5 w-3.5 shrink-0" />
                                    {tab.label}
                                </span>
                                <span className="text-sm font-black text-white">{tabCounts[tab.id]}</span>
                            </button>
                        );
                    })}
                </div>

                <div className={creatorManagerModuleClassName} data-creator-drop-list-density="compact_rows" data-mobile-density="compact" data-mobile-sprawl-guard="true">
                    {showDropListSkeleton ? (
                        <div className="grid gap-2" data-mobile-skeleton="creator-drop-list" data-mobile-density="compact" data-mobile-sprawl-guard="true" aria-label="Loading creator drops">
                            {[0, 1, 2].map((item) => (
                                <div key={item} className={creatorDropListSkeletonClassName} />
                            ))}
                        </div>
                    ) : visibleDrops.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center" data-empty-state-density="compact">
                            <Package className="h-7 w-7 text-brand-purple" />
                            <div>
                                <p className="text-base font-black text-white">No drops submitted yet</p>
                                <p className="mt-1 text-sm text-gray-400">Create your first drop for review.</p>
                            </div>
                            <button
                                type="button"
                                onClick={openSubmitForm}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white/10 px-4 text-sm font-bold text-white transition-colors hover:bg-white/15"
                            >
                                <Plus className="h-4 w-4" />
                                Submit drop
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {visibleDrops.map((drop) => {
                                const status = drop.statusResolution ?? resolveDropStatus(drop);
                                const metrics = drop.metrics ?? resolveCreatorDropMetrics(drop).serialized;
                                return (
                                    <article
                                        key={drop.id}
                                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-2.5"
                                        data-creator-drop-card-status={status.creatorStatusKey}
                                        data-creator-drop-metrics-source={metrics.source}
                                        data-creator-drop-expired={String(status.isExpired)}
                                        data-creator-drop-mobile-density="compact"
                                    >
                                        {drop.imageUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={drop.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                                        ) : (
                                            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white/5">
                                                <Package className="h-5 w-5 text-gray-400" />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex min-w-0 items-start justify-between gap-2">
                                                <MarqueeText
                                                    as="h2"
                                                    title={drop.title}
                                                    className="text-sm font-black text-white"
                                                    ariaLabel={drop.title}
                                                />
                                                <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${statusToneClassName(status.statusTone)}`}>
                                                    {status.creatorStatusLabel}
                                                </span>
                                            </div>
                                            <p className="mt-1 truncate text-xs leading-5 text-gray-400">{drop.description || "No description provided."}</p>
                                            <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] font-semibold text-gray-400">
                                                <span>{status.isAdminCreated ? "Added by admin" : status.isCreatorSubmitted ? "Submitted" : REVIEW_STATUS_LABELS[classifyDrop(drop)]}</span>
                                                <span aria-hidden="true">|</span>
                                                <span>{status.publicVisibilityLabel}</span>
                                                <span aria-hidden="true">|</span>
                                                <span>{typeof drop.unlockCost === "number" ? `${drop.unlockCost} GumDrops` : "Cost unset"}</span>
                                            </div>
                                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400">
                                                <span className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1">Views {renderMetric(metrics.views)}</span>
                                                <span className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1">Clicks {renderMetric(metrics.clicks)}</span>
                                                <span className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1">Unwraps {renderMetric(metrics.unwraps)}</span>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            <CreateDropModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    setIsModalOpen(false);
                    void loadDrops();
                }}
                mode="creator"
                creatorIdOverride={user?.uid || null}
            />
        </main>
    );
}
