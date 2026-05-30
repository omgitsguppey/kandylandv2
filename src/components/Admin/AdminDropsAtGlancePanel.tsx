"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Edit, Loader2, Package, PlusCircle, Repeat, Search, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { CreateDropModal } from "@/components/Admin/CreateDropModal";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { TitleMarquee } from "@/components/ui/TitleMarquee";
import { paginateOverviewItems } from "@/lib/admin-overview";
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
import type { AdminSurfaceState } from "@/lib/admin-parity";
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

/** Compact grid shows 8 cards (2 rows of 4 on xl, 4 rows of 2 on mobile). */
const PAGE_SIZE = 8;

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

function resolveDropsTruthState(state: { loading: boolean; loadError: string | null; fromCache: boolean }): AdminSurfaceState {
    if (state.loadError) return "failed";
    if (state.loading) return "loading";
    if (state.fromCache) return "fallback";
    return "live";
}

export function AdminDropsAtGlancePanel() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingDropId, setEditingDropId] = useState<string | null>(null);
    const [queueingDropId, setQueueingDropId] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [searchText, setSearchText] = useState("");
    const { drops, legacyQueueIds, loading, loadError, fromCache } = useAdminDropsFeed();

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

    /** Rows filtered by search text (client-side only). */
    const filteredRows = useMemo(() => {
        const trimmed = searchText.trim().toLowerCase();
        if (!trimmed) return rows;
        return rows.filter((row) => row.drop.title.toLowerCase().includes(trimmed));
    }, [rows, searchText]);

    const summary = useMemo(() => {
        return filteredRows.reduce((totals, row) => {
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
    }, [filteredRows]);

    const paginatedRows = useMemo(
        () => paginateOverviewItems(filteredRows, page, PAGE_SIZE),
        [page, filteredRows],
    );

    useEffect(() => {
        setPage(0);
    }, [filteredRows.length]);

    const truthState = resolveDropsTruthState({ loading, loadError, fromCache });
    const isFiltered = searchText.trim().length > 0;
    const sourceLabel = isFiltered ? "filtered" : (fromCache ? "cached" : "live");

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
            <div className="space-y-2.5">
                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setEditingDropId(null);
                            setIsCreateModalOpen(true);
                        }}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-brand-purple px-3.5 text-xs font-bold text-white transition-transform hover:scale-[1.01]"
                    >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Create drop
                    </button>
                    <Link
                        href="/admin/drops"
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-3.5 text-xs font-semibold text-white transition-colors hover:border-brand-purple/40 hover:text-brand-pink"
                    >
                        <Package className="h-3.5 w-3.5" />
                        Drops manager
                    </Link>
                    <Link
                        href="/admin/queue"
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-3.5 text-xs font-semibold text-white transition-colors hover:border-brand-purple/40 hover:text-brand-pink"
                    >
                        <Settings2 className="h-3.5 w-3.5" />
                        Queue
                    </Link>
                </div>

                {/* Search bar + source state */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder="Search drops…"
                            className="h-9 w-full rounded-full border border-white/8 bg-black/40 pl-8 pr-3 text-xs text-white placeholder:text-gray-500 focus:border-brand-purple/40 focus:outline-none focus:ring-1 focus:ring-brand-purple/30"
                        />
                    </div>
                    <AdminStatusBadge state={truthState} />
                </div>

                {/* Search result count */}
                {isFiltered ? (
                    <p className="text-[10px] font-semibold text-gray-500">
                        {filteredRows.length} result{filteredRows.length !== 1 ? "s" : ""} for &ldquo;{searchText.trim()}&rdquo;
                    </p>
                ) : null}

                {/* Summary counters */}
                <div className="grid grid-cols-5 gap-1.5">
                    {[
                        { label: "Total", value: summary.total },
                        { label: "Live", value: summary.live },
                        { label: "Scheduled", value: summary.scheduled },
                        { label: "Queued", value: summary.queued },
                        { label: "Pending", value: summary.pending },
                    ].map((item) => (
                        <div key={item.label} className="rounded-xl border border-white/8 bg-black/30 px-2 py-2 text-center">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-gray-500">{item.label}</p>
                            <p className="mt-0.5 text-sm font-black text-white">{item.value}</p>
                            <p className="text-[8px] font-medium text-gray-600">{sourceLabel === "filtered" ? "[filtered]" : null} <AdminStatusBadge state={truthState} className="mt-1 py-0 text-[8px]" /></p>
                        </div>
                    ))}
                </div>

                

                {loadError ? (
                    <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-100">
                        {loadError}
                    </div>
                ) : loading ? (
                    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                        {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                            <div key={index} className="h-[6.5rem] animate-pulse rounded-xl border border-white/8 bg-white/5" />
                        ))}
                    </div>
                ) : filteredRows.length === 0 ? (
                    <div className="rounded-xl border border-white/8 bg-black/25 px-4 py-6 text-center">
                        <Package className="mx-auto h-8 w-8 text-gray-600" />
                        {isFiltered ? (
                            <>
                                <p className="mt-2 text-xs font-semibold text-white">No drops match &ldquo;{searchText.trim()}&rdquo;</p>
                                <button
                                    type="button"
                                    onClick={() => setSearchText("")}
                                    className="mt-1.5 text-xs font-medium text-brand-pink hover:underline"
                                >
                                    Clear search
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="mt-2 text-xs font-semibold text-white">No drops exist yet.</p>
                                <p className="mt-1 text-[11px] text-gray-400">Create the first drop or open the full manager.</p>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        {/* 2×2 compact card grid (mobile: 2 cols, xl: 4 cols) */}
                        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                            {paginatedRows.items.map((row) => {
                                const delaySeed = getDelaySeed(row.drop.id);

                                return (
                                    <article
                                        key={row.drop.id}
                                        className="group flex flex-col gap-2 rounded-xl border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-2.5"
                                    >
                                        {/* Thumbnail + status pill row */}
                                        <div className="flex items-start gap-2">
                                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/55">
                                                {row.drop.imageUrl ? (
                                                    <Image src={row.drop.imageUrl} alt={row.drop.title} fill sizes="40px" className="object-contain bg-black" />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-white">KD</div>
                                                )}
                                            </div>
                                            <span className={cn("mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]", row.statusClassName)}>
                                                {row.statusLabel}
                                            </span>
                                        </div>

                                        {/* Title */}
                                        <TitleMarquee title={row.drop.title} delaySeed={delaySeed} className="text-xs font-semibold text-white leading-tight" />

                                        {/* Metrics line */}
                                        <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-gray-400">
                                            <span>{row.drop.unlockCost} GD</span>
                                            <span>{(row.drop.totalUnlocks || 0).toLocaleString()} unwraps</span>
                                        </div>

                                        {/* Action icons */}
                                        <div className="mt-auto flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingDropId(row.drop.id);
                                                    setIsCreateModalOpen(true);
                                                }}
                                                aria-label="Edit drop"
                                                className="inline-flex h-7 items-center gap-1 rounded-full border border-white/10 bg-black/35 px-2 text-[10px] font-semibold text-white transition-colors hover:border-brand-purple/35 hover:text-brand-pink"
                                            >
                                                <Edit className="h-3 w-3" />
                                                <span className="hidden md:inline">Edit</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handleQueueToggle(row.drop.id)}
                                                disabled={queueingDropId === row.drop.id}
                                                aria-label={row.isQueued ? "Unqueue drop" : "Queue drop"}
                                                className="inline-flex h-7 items-center gap-1 rounded-full border border-white/10 bg-black/35 px-2 text-[10px] font-semibold text-white transition-colors hover:border-brand-purple/35 hover:text-brand-pink disabled:opacity-60"
                                            >
                                                {queueingDropId === row.drop.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Repeat className="h-3 w-3" />}
                                                <span className="hidden md:inline">{row.isQueued ? "Unqueue" : "Queue"}</span>
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        {paginatedRows.totalPages > 1 ? (
                            <div className="flex items-center justify-between text-[10px] text-gray-400">
                                <p>
                                    {paginatedRows.startIndex + 1}–{paginatedRows.endIndex} of {filteredRows.length}
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setPage((current) => Math.max(0, current - 1))}
                                        disabled={paginatedRows.page === 0}
                                        className="rounded-full border border-white/10 px-2.5 py-1 text-white disabled:opacity-40"
                                    >
                                        Prev
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPage((current) => Math.min(paginatedRows.totalPages - 1, current + 1))}
                                        disabled={paginatedRows.page >= paginatedRows.totalPages - 1}
                                        className="rounded-full border border-white/10 px-2.5 py-1 text-white disabled:opacity-40"
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
