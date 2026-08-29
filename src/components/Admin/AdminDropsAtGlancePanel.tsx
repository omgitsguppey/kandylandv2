"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Edit, Loader2, Package, Repeat, Search, Settings2 } from "lucide-react";
import { toast } from "sonner";

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
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";
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
const ADMIN_DROP_QUEUE_SNAPSHOT_REFRESH_INTERVAL_MS = 0;

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
    if (state.fromCache) return "cached";
    return "live";
}

function getAdminDropsAtGlanceSafeErrorMessage(error: unknown, fallback: string) {
    const safeError = sanitizeErrorForUser(error, "admin_truth", "admin_truth_unavailable");
    return safeError.errorKey === "unknown_error" ? fallback : safeError.operatorMessage;
}

export function AdminDropsAtGlancePanel() {
    const [queueingDropId, setQueueingDropId] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [searchText, setSearchText] = useState("");
    const { drops, legacyQueueIds, loading, loadError, fromCache } = useAdminDropsFeed();

    const {
        data: queueConfig,
        mutate: mutateQueueConfig,
    } = useAdminPollingSWR<AdminDropQueueConfig>("/api/admin/queue", ADMIN_DROP_QUEUE_SNAPSHOT_REFRESH_INTERVAL_MS);
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
            toast.error(getAdminDropsAtGlanceSafeErrorMessage(error, "Failed to update queue."));
        } finally {
            setQueueingDropId(null);
        }
    }, [mutateQueueConfig]);

    return (
        <div className="space-y-3" data-admin-drops-at-glance="true">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <Link href="/admin/drops" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-brand-purple to-brand-pink px-4 text-sm font-bold text-white shadow-lg shadow-brand-purple/25 transition-transform hover:scale-[1.01]"><Package className="h-4 w-4" />Manage drops</Link>
                    <Link href="/admin/queue" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-4 text-sm font-semibold text-gray-200 transition-colors hover:border-kandy-lilac/35 hover:bg-white/[0.07] hover:text-white"><Settings2 className="h-4 w-4" />Queue</Link>
                </div>
                <AdminStatusBadge state={truthState} />
            </div>

            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
                <label className="relative block min-w-0"><span className="sr-only">Search drops</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input type="text" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search drops..." className="h-11 w-full rounded-xl border border-white/10 bg-black/35 pl-10 pr-3 text-sm text-white placeholder:text-gray-500 outline-none transition-colors focus:border-kandy-lilac/45 focus:ring-2 focus:ring-brand-purple/15" /></label>
                <div className="flex items-center rounded-xl border border-white/10 bg-black/20 px-3 text-xs font-medium text-gray-400">{isFiltered ? `${filteredRows.length} matching drops` : `${summary.total} drops in current source`}</div>
            </div>

            <dl className="grid grid-cols-5 gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
                {[
                    { label: "Total", value: summary.total },
                    { label: "Live", value: summary.live },
                    { label: "Scheduled", value: summary.scheduled },
                    { label: "Queued", value: summary.queued },
                    { label: "Review", value: summary.pending },
                ].map((item) => <div key={item.label} className="min-w-0 rounded-xl bg-white/[0.035] px-2 py-2 text-center"><dt className="truncate text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{item.label}</dt><dd className="mt-1 text-lg font-black text-white">{item.value}</dd></div>)}
            </dl>

            {loadError ? (
                <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100"><AdminStatusBadge state="failed" className="mb-2" /><p>{loadError}</p></div>
            ) : loading ? (
                <div className="grid gap-2 sm:grid-cols-2" aria-busy="true">{Array.from({ length: PAGE_SIZE }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.035]" />)}</div>
            ) : filteredRows.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-8 text-center"><Package className="mx-auto h-8 w-8 text-gray-600" /><p className="mt-3 text-sm font-bold text-white">{isFiltered ? `No drops match "${searchText.trim()}".` : "No drops exist in the current source."}</p>{isFiltered ? <button type="button" onClick={() => setSearchText("")} className="mt-2 min-h-11 rounded-xl px-3 text-sm font-semibold text-kandy-lilac hover:bg-white/[0.05]">Clear search</button> : null}</div>
            ) : (
                <>
                    <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                        {paginatedRows.items.map((row) => {
                            const isBusy = queueingDropId === row.drop.id;
                            return (
                                <article key={row.drop.id} className="grid gap-3 p-3 transition-colors hover:bg-white/[0.035] md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-4">
                                    <div className="flex min-w-0 gap-3">
                                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/50">{row.drop.imageUrl ? <Image src={row.drop.imageUrl} alt={row.drop.title} fill sizes="44px" className="object-contain bg-black" /> : <span className="grid h-full place-items-center text-xs font-black text-gray-400">KD</span>}</div>
                                        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-bold text-white">{row.drop.title}</p><span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold", row.statusClassName)}>{row.statusLabel}</span></div><div className="mt-2 grid gap-1 text-xs text-gray-400 sm:grid-cols-3"><span>{row.queueLabel ?? row.scheduleLabel}</span><span>{row.drop.unlockCost} GD</span><span>{(row.drop.totalUnlocks || 0).toLocaleString()} unwraps</span></div></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 md:flex"><Link href={`/admin/drops?dropId=${encodeURIComponent(row.drop.id)}`} aria-label={`Open ${row.drop.title}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 text-xs font-bold text-white transition-colors hover:border-kandy-lilac/35 hover:text-kandy-lilac"><Edit className="h-4 w-4" />Open</Link><button type="button" onClick={() => void handleQueueToggle(row.drop.id)} disabled={isBusy} aria-label={row.isQueued ? "Unqueue drop" : "Queue drop"} aria-busy={isBusy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 text-xs font-bold text-white transition-colors hover:border-kandy-lilac/35 hover:text-kandy-lilac disabled:opacity-60">{isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat className="h-4 w-4" />}{row.isQueued ? "Unqueue" : "Queue"}</button></div>
                                </article>
                            );
                        })}
                    </div>
                    {paginatedRows.totalPages > 1 ? <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-gray-400"><p>{paginatedRows.startIndex + 1}-{paginatedRows.endIndex} of {filteredRows.length}</p><div className="flex gap-2"><button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={paginatedRows.page === 0} className="min-h-11 rounded-xl border border-white/10 px-3 text-xs font-bold text-white disabled:opacity-40">Previous</button><button type="button" onClick={() => setPage((current) => Math.min(paginatedRows.totalPages - 1, current + 1))} disabled={paginatedRows.page >= paginatedRows.totalPages - 1} className="min-h-11 rounded-xl border border-white/10 px-3 text-xs font-bold text-white disabled:opacity-40">Next</button></div></div> : null}
                </>
            )}
        </div>
    );
}
