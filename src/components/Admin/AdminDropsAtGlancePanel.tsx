"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Edit, Loader2, Package, PlusCircle, Repeat, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { CreateDropModal } from "@/components/Admin/CreateDropModal";
import { useAuthSWR } from "@/hooks/useAuthSWR";
import { CLIENT_RUNTIME_EVENTS, dispatchClientRuntimeEvent } from "@/hooks/client-runtime";
import { useNow } from "@/hooks/useNow";
import { formatAdminCompactDateTime } from "@/lib/admin-drop-formatting";
import { authFetch } from "@/lib/authFetch";
import { buildDropQueueLifecycleProjection } from "@/lib/drop-queue-lifecycle";
import { normalizeDropRecord } from "@/lib/drop-normalizers";
import { resolveDropStatusFromTiming } from "@/lib/drop-status";
import { db } from "@/lib/firebase-data";
import { cn } from "@/lib/utils";
import type { Drop } from "@/types/db";

interface QueueConfig {
    queue: string[];
    dropsPerDay: number;
    cooldownDays: number;
    timesPerDay: string[];
}

type DropRow = {
    drop: Drop;
    statusLabel: string;
    statusClassName: string;
    scheduleLabel: string;
    queueLabel: string | null;
    isQueued: boolean;
    sortPriority: number;
};

function buildStatusPresentation(drop: Drop, isQueued: boolean, queueLabel: string | null, now: number) {
    const liveStatus = resolveDropStatusFromTiming(drop, now);

    if (drop.approvalStatus === "pending_review") {
        return {
            statusLabel: "Pending review",
            statusClassName: "border-amber-400/25 bg-amber-500/10 text-amber-200",
            scheduleLabel: "Awaiting admin approval",
            sortPriority: 0,
        };
    }

    if (drop.approvalStatus === "rejected") {
        return {
            statusLabel: "Rejected",
            statusClassName: "border-red-400/20 bg-red-500/10 text-red-200",
            scheduleLabel: "Needs changes before it can go live",
            sortPriority: 1,
        };
    }

    if (liveStatus === "active") {
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

    if (liveStatus === "scheduled") {
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

export function AdminDropsAtGlancePanel() {
    const [drops, setDrops] = useState<Drop[]>([]);
    const [legacyQueueIds, setLegacyQueueIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingDropId, setEditingDropId] = useState<string | null>(null);
    const [queueingDropId, setQueueingDropId] = useState<string | null>(null);

    const {
        data: queueConfig,
        mutate: mutateQueueConfig,
    } = useAuthSWR<QueueConfig>("/api/admin/queue", {
        refreshInterval: 30_000,
        revalidateOnFocus: true,
        keepPreviousData: true,
    });
    const nowMs = useNow({ intervalMs: 60_000, initialNowMs: 0, enabled: drops.length > 0 });

    useEffect(() => {
        const dropsQuery = query(collection(db, "drops"), orderBy("validFrom", "desc"));
        const unsubscribe = onSnapshot(dropsQuery, (snapshot) => {
            const nextDrops: Drop[] = [];
            const nextLegacyQueueIds = new Set<string>();

            snapshot.forEach((docSnapshot) => {
                const raw = docSnapshot.data() as Record<string, unknown>;
                try {
                    nextDrops.push(normalizeDropRecord(raw, docSnapshot.id));
                } catch {
                    nextDrops.push({ id: docSnapshot.id, ...raw } as Drop);
                }

                const rotationConfig = raw.rotationConfig as Record<string, unknown> | undefined;
                if (rotationConfig?.enabled === true) {
                    nextLegacyQueueIds.add(docSnapshot.id);
                }
            });

            setDrops(nextDrops);
            setLegacyQueueIds(nextLegacyQueueIds);
            setLoadError(null);
            setLoading(false);
        }, (error) => {
            console.error("Failed to subscribe to drops for the admin dashboard", error);
            setLoadError(error instanceof Error ? error.message : "Failed to load drops.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const dropMap = useMemo(() => {
        const map = new Map<string, Drop>();
        drops.forEach((drop) => {
            map.set(drop.id, drop);
        });
        return map;
    }, [drops]);

    const queueOrder = useMemo(() => queueConfig?.queue ?? [], [queueConfig]);
    const visibleQueueIds = useMemo(
        () => new Set<string>([...Array.from(legacyQueueIds), ...queueOrder]),
        [legacyQueueIds, queueOrder],
    );

    const queueProjectionOrder = useMemo(() => {
        const queuedIds = new Set(queueOrder);
        return [
            ...queueOrder,
            ...Array.from(legacyQueueIds).filter((dropId) => !queuedIds.has(dropId)),
        ];
    }, [legacyQueueIds, queueOrder]);

    const queueLifecycleMap = useMemo(() => {
        if (!queueConfig || queueProjectionOrder.length === 0) {
            return new Map();
        }

        const queueEntries = queueProjectionOrder
            .map((dropId) => dropMap.get(dropId))
            .filter((drop): drop is Drop => Boolean(drop));

        return buildDropQueueLifecycleProjection(queueEntries, {
            cooldownDays: queueConfig.cooldownDays,
            timesPerDay: queueConfig.timesPerDay,
            now: nowMs,
        });
    }, [dropMap, nowMs, queueConfig, queueProjectionOrder]);

    const rows = useMemo(() => {
        const nextRows = drops.map((drop) => {
            const isQueued = visibleQueueIds.has(drop.id);
            const queueSlotMs = queueLifecycleMap.get(drop.id)?.queueSlotMs;
            const queueSlotLabel = queueSlotMs
                ? formatAdminCompactDateTime(queueSlotMs)
                : null;
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

    const closeModal = useCallback(() => {
        setIsCreateModalOpen(false);
        setEditingDropId(null);
    }, []);

    const handleModalSuccess = useCallback(() => {
        closeModal();
        dispatchClientRuntimeEvent(CLIENT_RUNTIME_EVENTS.adminOverviewSync);
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

            dispatchClientRuntimeEvent(CLIENT_RUNTIME_EVENTS.adminOverviewSync);
            toast.success(added ? "Drop added to queue" : "Drop removed from queue");
        } catch (error) {
            console.error("Failed to toggle queue from admin home", error);
            toast.error(error instanceof Error ? error.message : "Failed to update queue.");
        } finally {
            setQueueingDropId(null);
        }
    }, [mutateQueueConfig]);

    return (
        <>
            <div className="space-y-4">
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

                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
                    {[
                        { label: "Total", value: summary.total },
                        { label: "Live", value: summary.live },
                        { label: "Scheduled", value: summary.scheduled },
                        { label: "Queued", value: summary.queued },
                        { label: "Review", value: summary.pending },
                    ].map((item) => (
                        <div key={item.label} className="rounded-[1.2rem] border border-white/8 bg-black/30 px-3 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">{item.label}</p>
                            <p className="mt-1 text-xl font-black text-white">{item.value}</p>
                        </div>
                    ))}
                </div>

                {loadError ? (
                    <div className="rounded-[1.4rem] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                        {loadError}
                    </div>
                ) : loading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="h-20 animate-pulse rounded-[1.35rem] border border-white/8 bg-white/5" />
                        ))}
                    </div>
                ) : rows.length === 0 ? (
                    <div className="rounded-[1.4rem] border border-white/8 bg-black/25 px-4 py-8 text-center">
                        <Package className="mx-auto h-10 w-10 text-gray-600" />
                        <p className="mt-3 text-sm font-semibold text-white">No drops have been created yet.</p>
                        <p className="mt-1 text-sm text-gray-400">Create the first drop here or open the full manager for bulk actions.</p>
                    </div>
                ) : (
                    <div className="max-h-[30rem] space-y-2 overflow-y-auto pr-1">
                        {rows.map((row) => (
                            <article
                                key={row.drop.id}
                                className="rounded-[1.35rem] border border-white/8 bg-black/30 p-3.5"
                            >
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="truncate text-sm font-bold text-white md:text-base">{row.drop.title}</p>
                                            <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]", row.statusClassName)}>
                                                {row.statusLabel}
                                            </span>
                                            {row.isQueued ? (
                                                <span className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-pink">
                                                    {row.queueLabel ? `Queued | ${row.queueLabel}` : "Queued"}
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                                            <span>{row.scheduleLabel}</span>
                                            <span>{row.drop.unlockCost} GD</span>
                                            <span>{row.drop.totalUnlocks || 0} unwraps</span>
                                            <span>{row.drop.type || "content"}</span>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2">
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
                                </div>
                            </article>
                        ))}
                    </div>
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
