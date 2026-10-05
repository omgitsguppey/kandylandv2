"use client";

import { Button, buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Edit, Loader2, Package, Repeat, Search, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
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
import { resolveClientActionError } from "@/lib/errors/client-error-adapter";
import { readUiJson } from "@/lib/ui-continuity";
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
            statusClassName: "border-warning/25 bg-warning/10 text-warning",
            scheduleLabel: "Awaiting admin approval",
            sortPriority: 0,
        };
    }

    if (lifecycle.kind === "rejected") {
        return {
            statusLabel: "Rejected",
            statusClassName: "border-destructive/20 bg-destructive/10 text-destructive",
            scheduleLabel: "Needs changes before it can go live",
            sortPriority: 1,
        };
    }

    if (lifecycle.kind === "live") {
        return {
            statusLabel: "Live",
            statusClassName: "border-success/20 bg-success/10 text-success",
            scheduleLabel: drop.validUntil ? `Ends ${formatAdminCompactDateTime(drop.validUntil)}` : "Live with no end date",
            sortPriority: 2,
        };
    }

    if (isQueued) {
        return {
            statusLabel: "Queued",
            statusClassName: "border-primary/25 bg-primary/12 text-brand-pink",
            scheduleLabel: queueLabel ? `Next slot ${queueLabel}` : "Queued for the next available slot",
            sortPriority: 3,
        };
    }

    if (lifecycle.kind === "scheduled") {
        return {
            statusLabel: "Scheduled",
            statusClassName: "border-info/20 bg-info/10 text-info",
            scheduleLabel: `Starts ${formatAdminCompactDateTime(drop.validFrom)}`,
            sortPriority: 4,
        };
    }

    return {
        statusLabel: "Ended",
        statusClassName: "border-border bg-secondary text-muted-foreground",
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
        queueAuthorityVersion: queueConfig?.queueAuthorityVersion,
        cooldownDays: queueConfig?.cooldownDays ?? 1,
        timesPerDay: queueConfig?.timesPerDay ?? [],
        now: nowMs,
    }), [dropMap, legacyQueueIds, nowMs, queueConfig?.cooldownDays, queueConfig?.queueAuthorityVersion, queueConfig?.timesPerDay, queueOrder]);

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
            const result = await readUiJson<{ added?: unknown }>(response, {
                moduleLabel: "Admin queue toggle",
                url: "/api/admin/queue/toggle",
                requireSuccess: true,
            });
            if (typeof result.added !== "boolean") {
                throw Object.assign(new Error("Admin queue toggle returned no valid added state"), {
                    status: response.status,
                    code: "mutation_failed",
                });
            }

            const added = result.added;
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
            const resolvedError = resolveClientActionError(error, {
                surface: "admin_truth",
                route: "/api/admin/queue/toggle",
                fallbackKey: "mutation_failed",
                context: {
                    adminView: "home_drops_module",
                    action: "toggle_queue",
                    dropId,
                },
            });
            reportClientIssue({
                channel: "ui",
                message: "Admin home queue toggle failed",
                error,
                detail: resolvedError.context,
                humanMessage: resolvedError.descriptor.userMessage,
                consoleLabel: "[Admin Drops Home] toggle queue failed",
            });
            toast.error(resolvedError.descriptor.userMessage);
        } finally {
            setQueueingDropId(null);
        }
    }, [mutateQueueConfig]);

    return (
        <div className="min-w-0 space-y-4" data-admin-drops-at-glance="true">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 max-w-full flex-wrap items-center gap-2"><Link href="/admin/drops" className={buttonVariants({variant:"default"})}><Package className="h-4 w-4" aria-hidden="true" />Manage drops</Link><Link href="/admin/queue" className={buttonVariants({variant:"ghost"})}><Settings2 className="h-4 w-4" aria-hidden="true" />Queue</Link></div><AdminStatusBadge state={truthState} /></div>
            <div className="flex min-w-0 flex-wrap items-center gap-3"><label className="relative block min-w-0 max-w-full flex-1 basis-56"><span className="sr-only">Search drops</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input type="text" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search drops..." className="pl-10" /></label><p className="text-xs text-muted-foreground">{isFiltered ? `${filteredRows.length} matching drops` : `${summary.total} drops in current source`}</p></div>
            <dl className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,6rem),1fr))] gap-x-4 gap-y-3">{[{label:"Total",value:summary.total},{label:"Live",value:summary.live},{label:"Scheduled",value:summary.scheduled},{label:"Queued",value:summary.queued},{label:"Review",value:summary.pending}].map((item) => <div key={item.label} className="min-w-0"><dt className="wrap-anywhere text-xs text-muted-foreground">{item.label}</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{item.value}</dd></div>)}</dl>
            {loadError ? <div className="min-w-0 rounded-xl bg-destructive/10 p-4 text-sm text-destructive"><AdminStatusBadge state="failed" className="mb-2" /><p className="wrap-anywhere">{loadError}</p></div> : loading ? <div className="grid min-w-0 gap-2" aria-busy="true">{Array.from({length:PAGE_SIZE}).map((_,index) => <div key={index} className="h-24 animate-pulse rounded-xl bg-muted" />)}</div> : filteredRows.length === 0 ? <div className="min-w-0 py-6"><p className="wrap-anywhere text-sm leading-6 text-muted-foreground">{isFiltered ? `No drops match "${searchText.trim()}".` : "No drops exist in the current source."}</p>{isFiltered ? <Button variant="ghost" type="button" onClick={() => setSearchText("")} className="mt-2">Clear search</Button> : null}</div> : (
                <>
                    <div className="min-w-0 divide-y divide-border">
                        {paginatedRows.items.map((row) => {
                            const isBusy = queueingDropId === row.drop.id;
                            return <article key={row.drop.id} className="min-w-0 space-y-3 py-4">
                                <div className="flex min-w-0 items-start gap-3"><div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">{row.drop.imageUrl ? <Image src={row.drop.imageUrl} alt={row.drop.title} fill sizes="44px" className="object-contain bg-background" /> : <span className="grid h-full place-items-center text-xs font-semibold text-muted-foreground">KD</span>}</div><div className="min-w-0 flex-1"><p className="wrap-anywhere text-sm font-medium">{row.drop.title}</p><div className="mt-2 flex min-w-0 flex-wrap items-center gap-2"><Badge variant="secondary" className={row.statusClassName}>{row.statusLabel}</Badge><span className="wrap-anywhere text-xs text-muted-foreground">{row.queueLabel ?? row.scheduleLabel}</span></div></div></div>
                                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>{row.drop.unlockCost} GD</span><span>{(row.drop.totalUnlocks || 0).toLocaleString()} unwraps</span></div><div className="flex max-w-full flex-wrap items-center gap-2"><Link href={`/admin/drops?dropId=${encodeURIComponent(row.drop.id)}`} aria-label={`Open ${row.drop.title}`} className={buttonVariants({variant:"ghost"})}><Edit className="h-4 w-4" aria-hidden="true" />Open</Link><Button variant="ghost" type="button" onClick={() => void handleQueueToggle(row.drop.id)} disabled={isBusy} aria-label={row.isQueued ? "Unqueue drop" : "Queue drop"} aria-busy={isBusy}>{isBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Repeat className="h-4 w-4" aria-hidden="true" />}{row.isQueued ? "Unqueue" : "Queue"}</Button></div></div>
                            </article>;
                        })}
                    </div>
                    {paginatedRows.totalPages > 1 ? <nav aria-label="Drops at a glance pagination" className="flex min-w-0 flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"><p>{paginatedRows.startIndex + 1}-{paginatedRows.endIndex} of {filteredRows.length}</p><div className="flex max-w-full flex-wrap gap-2"><Button variant="ghost" type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={paginatedRows.page === 0}>Previous</Button><Button variant="ghost" type="button" onClick={() => setPage((current) => Math.min(paginatedRows.totalPages - 1, current + 1))} disabled={paginatedRows.page >= paginatedRows.totalPages - 1}>Next</Button></div></nav> : null}
                </>
            )}
        </div>
    );
}
