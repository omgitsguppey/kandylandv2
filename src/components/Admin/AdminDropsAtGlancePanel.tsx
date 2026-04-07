"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Edit, Loader2, Package, PlusCircle, Repeat, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { CreateDropModal } from "@/components/Admin/CreateDropModal";
import { TitleMarquee } from "@/components/ui/TitleMarquee";
import { useAdminUiChartHealthReporter } from "@/hooks/useAdminUiChartHealthReporter";
import { paginateOverviewItems } from "@/lib/admin-overview";
import { buildAdminUiChartHealthItem, getAdminUiChartHealthTone } from "@/lib/admin-ui-chart-health";
import { dispatchAdminOverviewSync } from "@/hooks/client-runtime";
import { useAdminDropsFeed } from "@/hooks/useAdminDropsFeed";
import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import { useNow } from "@/hooks/useNow";
import { formatAdminCompactDateTime } from "@/lib/admin-drop-formatting";
import { resolveAdminDropLifecycleFacts } from "@/lib/admin-drop-lifecycle";
import { buildAdminQueueProjection, type AdminDropQueueConfig } from "@/lib/admin-drop-queue";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { cn } from "@/lib/utils";
import type { Drop } from "@/types/db";

type DropRow = {
    drop: Drop;
    statusLabel: string;
    statusClassName: string;
    scheduleLabel: string;
    queueLabel: string | null;
    isQueued: boolean;
    sortPriority: number;
};

const PAGE_SIZE = 4;

function buildStatusPresentation(drop: Drop, isQueued: boolean, queueLabel: string | null, now: number) {
    const lifecycle = resolveAdminDropLifecycleFacts(drop, {
        now,
        isQueueManaged: isQueued,
    });

    if (lifecycle.kind === "pending_review") {
        return {
            statusLabel: "Pending review",
            statusClassName: "border-amber-400/25 bg-amber-500/10 text-amber-200",
            scheduleLabel: "Awaiting admin approval",
            sortPriority: 0,
        };
    }

    if (lifecycle.kind === "rejected") {
        return {
            statusLabel: "Rejected",
            statusClassName: "border-red-400/20 bg-red-500/10 text-red-200",
            scheduleLabel: "Needs changes before it can go live",
            sortPriority: 1,
        };
    }

    if (lifecycle.kind === "live") {
        return {
            statusLabel: "Live",
            statusClassName: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
            scheduleLabel: drop.validUntil ? `Ends ${formatAdminCompactDateTime(drop.validUntil)}` : "Live with no end date",
            sortPriority: 2,
        };
    }

    if (isQueued) {
        return {
            statusLabel: "Queued",
            statusClassName: "border-brand-purple/25 bg-brand-purple/12 text-brand-pink",
            scheduleLabel: queueLabel ? `Next slot ${queueLabel}` : "Queued for the next available slot",
            sortPriority: 3,
        };
    }

    if (lifecycle.kind === "scheduled") {
        return {
            statusLabel: "Scheduled",
            statusClassName: "border-sky-400/20 bg-sky-500/10 text-sky-200",
            scheduleLabel: `Starts ${formatAdminCompactDateTime(drop.validFrom)}`,
            sortPriority: 4,
        };
    }

    return {
        statusLabel: "Ended",
        statusClassName: "border-white/10 bg-white/6 text-gray-300",
        scheduleLabel: drop.validUntil ? `Ended ${formatAdminCompactDateTime(drop.validUntil)}` : "No active schedule",
        sortPriority: 5,
    };
}

function getDelaySeed(id: string) {
    return id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 7;
}

export function AdminDropsAtGlancePanel() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingDropId, setEditingDropId] = useState<string | null>(null);
    const [queueingDropId, setQueueingDropId] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const { drops, legacyQueueIds, loading, loadError } = useAdminDropsFeed();

    const {
        data: queueConfig,
        mutate: mutateQueueConfig,
    } = useAdminPollingSWR<AdminDropQueueConfig>("/api/admin/queue", 30_000);
    const nowMs = useNow({ intervalMs: 60_000, initialNowMs: 0, enabled: drops.length > 0 });

    const dropMap = useMemo(() => {
        const map = new Map<string, Drop>();
        drops.forEach((drop) => {
            map.set(drop.id, drop);
        });
        return map;
    }, [drops]);

    const queueOrder = useMemo(() => queueConfig?.queue ?? [], [queueConfig]);
    const queueProjection = useMemo(() => buildAdminQueueProjection({
        getDropById: (dropId) => dropMap.get(dropId),
        queueOrder,
        legacyQueueIds,
        cooldownDays: queueConfig?.cooldownDays ?? 1,
        timesPerDay: queueConfig?.timesPerDay ?? [],
        now: nowMs,
    }), [dropMap, legacyQueueIds, nowMs, queueConfig?.cooldownDays, queueConfig?.timesPerDay, queueOrder]);

    const visibleQueueIds = queueProjection.visibleQueueIds;
    const queueLifecycleMap = queueProjection.lifecycleMap;

    const rows = useMemo(() => {
        const nextRows = drops.map((drop) => {
            const isQueued = visibleQueueIds.has(drop.id);
            const lifecycle = resolveAdminDropLifecycleFacts(drop, {
                now: nowMs,
                isQueueManaged: isQueued,
                queueLifecycle: queueLifecycleMap.get(drop.id),
            });
            const queueSlotLabel = lifecycle.queueSlotLabel;
            const status = buildStatusPresentation(drop, isQueued, queueSlotLabel, nowMs);

            return {
                drop,
                ...status,
                isQueued,
                queueLabel: queueSlotLabel,
            } satisfies DropRow;
        });

        nextRows.sort((left, right) => {
            if (left.sortPriority !== right.sortPriority) {
                return left.sortPriority - right.sortPriority;
            }

            const leftTimestamp = Number(left.drop.validFrom || left.drop.createdAt || 0);
            const rightTimestamp = Number(right.drop.validFrom || right.drop.createdAt || 0);
            return rightTimestamp - leftTimestamp;
        });

        return nextRows;
    }, [drops, nowMs, queueLifecycleMap, visibleQueueIds]);

    const summary = useMemo(() => {
        return rows.reduce((totals, row) => {
            totals.total += 1;
            if (row.statusLabel === "Live") totals.live += 1;
            if (row.statusLabel === "Scheduled") totals.scheduled += 1;
            if (row.isQueued) totals.queued += 1;
            if (row.statusLabel === "Pending review") totals.pending += 1;
            return totals;
        }, {
            total: 0,
            live: 0,
            scheduled: 0,
            queued: 0,
            pending: 0,
        });
    }, [rows]);

    const paginatedRows = useMemo(
        () => paginateOverviewItems(rows, page, PAGE_SIZE),
        [page, rows],
    );
    const dropsHealthUpdatedAtMs = useMemo(
        () => rows.reduce((latest, row) => Math.max(
            latest,
            Number(row.drop.createdAt || row.drop.validFrom || row.drop.validUntil || 0),
        ), 0),
        [rows],
    );
    const chartHealth = useMemo(() => buildAdminUiChartHealthItem({
        key: "dashboard.drops_at_a_glance",
        title: "Drops at a glance",
        page: "dashboard",
        category: "overview",
        source: "mixed_client_live",
        updatedAtMs: dropsHealthUpdatedAtMs,
        hasLoaded: !loading || Boolean(loadError) || rows.length > 0,
        loading,
        hasData: rows.length > 0,
        blockingIssues: loadError && rows.length === 0 ? [loadError] : [],
        backgroundIssues: loadError && rows.length > 0 ? [loadError] : [],
        healthySummary: "Realtime drops feed and queue projection are loaded.",
        emptySummary: "No drops are available in the current admin drops feed.",
        degradedAction: "Review the drops feed or queue route before trusting the home summary as current.",
    }), [dropsHealthUpdatedAtMs, loadError, loading, rows.length]);

    useAdminUiChartHealthReporter([chartHealth]);

    useEffect(() => {
        setPage(0);
    }, [rows.length]);

    const closeModal = useCallback(() => {
        setIsCreateModalOpen(false);
        setEditingDropId(null);
    }, []);

    const handleModalSuccess = useCallback(() => {
        closeModal();
        dispatchAdminOverviewSync();
    }, [closeModal]);

    const handleQueueToggle = useCallback(async (dropId: string) => {
        try {
            setQueueingDropId(dropId);
            const response = await authFetch("/api/admin/queue/toggle", {
                method: "POST",
                body: JSON.stringify({ dropId }),
            });
            const result = await response.json() as { added?: boolean; error?: string };
            if (!response.ok) {
                throw new Error(result.error || "Failed to update queue");
            }

            const added = result.added === true;
            await mutateQueueConfig((current) => current ? {
                ...current,
                queue: added
                    ? [...current.queue.filter((id) => id !== dropId), dropId]
                    : current.queue.filter((id) => id !== dropId),
            } : current, {
                revalidate: false,
            });

            dispatchAdminOverviewSync();
            toast.success(added ? "Drop added to queue" : "Drop removed from queue");
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                message: "Admin home queue toggle failed",
                error,
                detail: {
                    adminView: "home_drops_module",
                    action: "toggle_queue",
                    dropId,
                },
                consoleLabel: "[Admin Drops Home] toggle queue failed",
            });
            toast.error(error instanceof Error ? error.message : "Failed to update queue.");
        } finally {
            setQueueingDropId(null);
        }
    }, [mutateQueueConfig]);

    return (
        <>
            <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setEditingDropId(null);
                            setIsCreateModalOpen(true);
                        }}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-purple px-4 text-sm font-bold text-white transition-transform hover:scale-[1.01]"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Create drop
                    </button>
                    <Link
                        href="/admin/drops"
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 text-sm font-semibold text-white transition-colors hover:border-brand-purple/40 hover:text-brand-pink"
                    >
                        <Package className="h-4 w-4" />
                        Open drops manager
                    </Link>
                    <Link
                        href="/admin/queue"
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 text-sm font-semibold text-white transition-colors hover:border-brand-purple/40 hover:text-brand-pink"
                    >
                        <Settings2 className="h-4 w-4" />
                        Queue settings
                    </Link>
                </div>

                <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-5">
                    {[
                        { label: "Total", value: summary.total },
                        { label: "Live", value: summary.live },
                        { label: "Scheduled", value: summary.scheduled },
                        { label: "Queued", value: summary.queued },
                        { label: "Review", value: summary.pending },
                    ].map((item) => (
                        <div key={item.label} className="rounded-[1.1rem] border border-white/8 bg-black/30 px-3 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">{item.label}</p>
                            <p className="mt-1 text-lg font-black text-white">{item.value}</p>
                        </div>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                    <span className={cn(
                        "rounded-full border px-2.5 py-1",
                        chartHealth.status === "healthy"
                            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                            : chartHealth.status === "fail"
                                ? "border-red-400/20 bg-red-500/10 text-red-100"
                                : "border-amber-400/20 bg-amber-500/10 text-amber-100",
                    )}>
                        {getAdminUiChartHealthTone(chartHealth.status) === "good"
                            ? "Feed loaded"
                            : getAdminUiChartHealthTone(chartHealth.status) === "bad"
                                ? "Feed failed"
                                : chartHealth.hydrationState === "loading"
                                    ? "Feed loading"
                                    : "Feed degraded"}
                    </span>
                    <span className="text-xs text-gray-500">{chartHealth.summary}</span>
                </div>

                {loadError ? (
                    <div className="rounded-[1.35rem] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                        {loadError}
                    </div>
                ) : loading ? (
                    <div className="space-y-2">
                        {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                            <div key={index} className="h-24 animate-pulse rounded-[1.35rem] border border-white/8 bg-white/5" />
                        ))}
                    </div>
                ) : rows.length === 0 ? (
                    <div className="rounded-[1.35rem] border border-white/8 bg-black/25 px-4 py-8 text-center">
                        <Package className="mx-auto h-10 w-10 text-gray-600" />
                        <p className="mt-3 text-sm font-semibold text-white">No drops exist yet.</p>
                        <p className="mt-1 text-sm text-gray-400">Create the first drop here or open the full manager for broader controls.</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            {paginatedRows.items.map((row) => {
                                const delaySeed = getDelaySeed(row.drop.id);

                                return (
                                    <article
                                        key={row.drop.id}
                                        className="grid gap-3 rounded-[1.35rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-3 md:grid-cols-[4.5rem,minmax(0,1fr),auto]"
                                    >
                                        <div className="relative h-[4.5rem] w-[4.5rem] overflow-hidden rounded-[1.1rem] border border-white/10 bg-black/55">
                                            {row.drop.imageUrl ? (
                                                <Image src={row.drop.imageUrl} alt={row.drop.title} fill sizes="72px" className="object-contain bg-black" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">KD</div>
                                            )}
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">{row.scheduleLabel}</p>
                                            <TitleMarquee title={row.drop.title} delaySeed={delaySeed} className="mt-1 text-[0.96rem] font-semibold text-white" />
                                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]", row.statusClassName)}>
                                                    {row.statusLabel}
                                                </span>
                                                {row.isQueued ? (
                                                    <span className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-2.5 py-1 text-[10px] font-semibold text-brand-pink">
                                                        {row.queueLabel ? `Queued · ${row.queueLabel}` : "Queued"}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                                                <span>{row.drop.unlockCost} GD</span>
                                                <span>{(row.drop.totalUnlocks || 0).toLocaleString()} unwraps</span>
                                                <span>{row.drop.type || "content"}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 md:w-[11rem] md:flex-col md:items-end">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingDropId(row.drop.id);
                                                    setIsCreateModalOpen(true);
                                                }}
                                                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 text-sm font-semibold text-white transition-colors hover:border-brand-purple/35 hover:text-brand-pink"
                                            >
                                                <Edit className="h-4 w-4" />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handleQueueToggle(row.drop.id)}
                                                disabled={queueingDropId === row.drop.id}
                                                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 text-sm font-semibold text-white transition-colors hover:border-brand-purple/35 hover:text-brand-pink disabled:opacity-60"
                                            >
                                                {queueingDropId === row.drop.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat className="h-4 w-4" />}
                                                {row.isQueued ? "Unqueue" : "Queue"}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        {paginatedRows.totalPages > 1 ? (
                            <div className="flex items-center justify-between text-xs text-gray-400">
                                <p>
                                    Showing {paginatedRows.startIndex + 1}-{paginatedRows.endIndex} of {rows.length}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPage((current) => Math.max(0, current - 1))}
                                        disabled={paginatedRows.page === 0}
                                        className="rounded-full border border-white/10 px-3 py-1.5 text-white disabled:opacity-40"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPage((current) => Math.min(paginatedRows.totalPages - 1, current + 1))}
                                        disabled={paginatedRows.page >= paginatedRows.totalPages - 1}
                                        className="rounded-full border border-white/10 px-3 py-1.5 text-white disabled:opacity-40"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </>
                )}
            </div>

            <CreateDropModal
                isOpen={isCreateModalOpen}
                onClose={closeModal}
                dropId={editingDropId}
                onSuccess={handleModalSuccess}
            />
        </>
    );
}
