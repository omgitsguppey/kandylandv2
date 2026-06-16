"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Calendar, Clock3, Edit, Loader2, RefreshCw, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import NextImage from "next/image";

import { useAuth } from "@/context/AuthContext";
import { isAdminUiTestSessionUser } from "@/lib/admin/admin-ui-test-session";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { toast } from "sonner";
import { db } from "@/lib/firebase-data";
import { Drop } from "@/types/db";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { formatAdminCompactDateTime, formatAdminTimeLabel } from "@/lib/admin-drop-formatting";
import { getMobileModuleClassNames } from "@/lib/ui/mobile-scale-contract";
import { createStaleRequestGuard, getMobileSkeletonClass } from "@/lib/ui/loading-state-contract";
import {
    buildAdminQueueProjection,
    buildReadableQueueScheduleSummary,
    type AdminDropQueueConfig,
} from "@/lib/admin-drop-queue";
import { normalizeDropRecordOrFallback } from "@/lib/drop-read-models";

type QueueConfig = AdminDropQueueConfig;

const adminQueueModuleClassName = getMobileModuleClassNames("admin", "manager");
const adminQueueSkeletonClassName = getMobileSkeletonClass("admin", "manager");

function IconControl({
    label,
    onClick,
    icon: Icon,
    disabled = false,
    tone = "neutral",
}: {
    label: string;
    onClick: () => void;
    icon: typeof ArrowUp;
    disabled?: boolean;
    tone?: "neutral" | "danger";
}) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            onClick={onClick}
            disabled={disabled}
            className={[
                "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/45 transition-colors disabled:opacity-35",
                tone === "danger"
                    ? "text-red-300 hover:border-red-400/20 hover:bg-red-500/10"
                    : "text-gray-200 hover:border-white/15 hover:bg-white/8",
            ].join(" ")}
        >
            <Icon className="h-4 w-4" />
        </button>
    );
}

export default function ManageQueuePage() {
    const { user } = useAuth();
    const [config, setConfig] = useState<QueueConfig | null>(null);
    const [drops, setDrops] = useState<Record<string, Drop>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scheduleExpanded, setScheduleExpanded] = useState(false);
    const [queueEditMode, setQueueEditMode] = useState(false);
    const queueLoadGuardRef = useRef(createStaleRequestGuard());
    const isLocalAdminUiTestSession = isAdminUiTestSessionUser(user);

    const fetchQueueData = useCallback(async () => {
        if (isLocalAdminUiTestSession) {
            setConfig(null);
            setDrops({});
            setError(null);
            setLoading(false);
            return true;
        }

        const requestId = queueLoadGuardRef.current.next();
        try {
            setError(null);
            const queueRes = await authFetch("/api/admin/queue");

            if (!queueRes.ok) {
                throw new Error("Failed to fetch queue config");
            }

            const queueData = await queueRes.json() as QueueConfig;

            let times = queueData.timesPerDay || ["12:00"];
            if (times.length < queueData.dropsPerDay) {
                times = [...times, ...Array(queueData.dropsPerDay - times.length).fill(times[times.length - 1] || "12:00")];
            } else if (times.length > queueData.dropsPerDay) {
                times = times.slice(0, queueData.dropsPerDay);
            }

            if (!queueLoadGuardRef.current.isFresh(requestId)) {
                return false;
            }

            setConfig({
                ...queueData,
                timesPerDay: times,
            });
            setLoading(false);

            try {
                const dropsSnap = await getDocs(collection(db, "drops"));
                if (!queueLoadGuardRef.current.isFresh(requestId)) {
                    return false;
                }
                const dropsMap: Record<string, Drop> = {};
                dropsSnap.forEach((docSnapshot) => {
                    const raw = docSnapshot.data() as Record<string, unknown>;
                    dropsMap[docSnapshot.id] = normalizeDropRecordOrFallback(raw, docSnapshot.id);
                });
                setDrops(dropsMap);
            } catch (dropLoadError: any) {
                if (!queueLoadGuardRef.current.isFresh(requestId)) {
                    return false;
                }
                reportClientIssue({
                    channel: "network",
                    message: "Admin queue drop details load failed",
                    error: dropLoadError,
                    detail: {
                        action: "fetch_queue_drop_details",
                    },
                    consoleLabel: "[Admin Queue] drop detail load failed",
                });
                toast.error("Queue schedule loaded. Drop details could not be refreshed.");
            }
            return true;
        } catch (err: any) {
            if (!queueLoadGuardRef.current.isFresh(requestId)) {
                return false;
            }
            reportClientIssue({
                channel: "network",
                message: "Admin queue load failed",
                error: err,
                detail: {
                    action: "fetch_queue_data",
                },
                consoleLabel: "[Admin Queue] load failed",
            });
            setConfig(null);
            setDrops({});
            const message = err instanceof Error ? err.message : "Failed to load queue data";
            setError(message);
            toast.error(message);
            return false;
        } finally {
            if (queueLoadGuardRef.current.isFresh(requestId)) {
                setLoading(false);
            }
        }
    }, [isLocalAdminUiTestSession]);

    useEffect(() => {
        void fetchQueueData();
    }, [fetchQueueData]);

    const handleSave = useCallback(async () => {
        if (isLocalAdminUiTestSession) {
            return;
        }

        if (!config) {
            return;
        }

        setSaving(true);
        try {
            setError(null);
            const response = await authFetch("/api/admin/queue", {
                method: "PUT",
                body: JSON.stringify(config),
            });
            if (!response.ok) {
                throw new Error("Save failed");
            }
            toast.success("Queue configuration saved!");
        } catch (err: any) {
            reportClientIssue({
                channel: "network",
                message: "Admin queue save failed",
                error: err,
                detail: {
                    action: "save_queue_config",
                },
                consoleLabel: "[Admin Queue] save failed",
            });
            const message = err instanceof Error ? err.message : "Failed to save configuration.";
            setError(message);
            toast.error(message);
        } finally {
            setSaving(false);
        }
    }, [config, isLocalAdminUiTestSession]);

    const moveDrop = useCallback((index: number, direction: "up" | "down") => {
        setConfig((current) => {
            if (!current) {
                return current;
            }

            const nextQueue = [...current.queue];
            if (direction === "up" && index > 0) {
                [nextQueue[index - 1], nextQueue[index]] = [nextQueue[index], nextQueue[index - 1]];
            } else if (direction === "down" && index < nextQueue.length - 1) {
                [nextQueue[index + 1], nextQueue[index]] = [nextQueue[index], nextQueue[index + 1]];
            }

            return { ...current, queue: nextQueue };
        });
    }, []);

    const removeDrop = useCallback((index: number) => {
        setConfig((current) => {
            if (!current) {
                return current;
            }

            return {
                ...current,
                queue: current.queue.filter((_, position) => position !== index),
            };
        });
    }, []);

    const queueProjection = useMemo(() => buildAdminQueueProjection({
        getDropById: (dropId) => drops[dropId],
        queueOrder: config?.queue ?? [],
        cooldownDays: config?.cooldownDays ?? 1,
        timesPerDay: config?.timesPerDay ?? [],
        now: Date.now(),
    }), [config?.cooldownDays, config?.queue, config?.timesPerDay, drops]);

    const queueLifecycleMap = queueProjection.lifecycleMap;
    const queueItems = useMemo(() => (
        config?.queue.map((dropId, index) => ({
            dropId,
            index,
            drop: drops[dropId],
            lifecycle: queueLifecycleMap.get(dropId),
        })) ?? []
    ), [config?.queue, drops, queueLifecycleMap]);

    const scheduleSummary = useMemo(
        () => (config ? buildReadableQueueScheduleSummary(config) : ""),
        [config],
    );
    const nextSlotLabel = useMemo(() => {
        const nextQueueSlot = queueItems
            .map((item) => item.lifecycle?.queueSlotMs)
            .find((slot): slot is number => typeof slot === "number");
        return nextQueueSlot ? formatAdminCompactDateTime(nextQueueSlot) : null;
    }, [queueItems]);
    const dropsHydrating = Boolean(config && config.queue.length > 0 && Object.keys(drops).length === 0);

    if (loading) {
        return (
            <div
                className="mx-auto w-full max-w-4xl space-y-3 px-3 pb-[calc(env(safe-area-inset-bottom)+6.5rem)]"
                data-mobile-density="compact"
                data-mobile-sprawl-guard="true"
                data-mobile-skeleton="admin-queue-route"
            >
                <div className={adminQueueSkeletonClassName} />
                <div className="grid gap-3 lg:grid-cols-[1.05fr_1.95fr]">
                    <div className={adminQueueSkeletonClassName} data-mobile-skeleton="admin-queue-schedule" />
                    <div className={adminQueueSkeletonClassName} data-mobile-skeleton="admin-queue-lineup" />
                </div>
            </div>
        );
    }

    if (!config) {
        return (
            <div className="mx-auto max-w-4xl pb-32">
                <PageViewEvent eventName="admin_queue_viewed" />
                <AdminPageHeader
                    eyebrow="Admin Queue"
                    title="Manage Queue"
                    subtitle="Configure automated drop rotation and schedule."
                    compact
                />
                {isLocalAdminUiTestSession ? (
                    <div
                        className={`${adminQueueModuleClassName} border-amber-400/20 bg-amber-400/10 text-center text-amber-100`}
                        data-admin-queue-fixture-boundary="true"
                        data-mobile-density="compact"
                        data-mobile-sprawl-guard="true"
                    >
                        <p className="text-base font-semibold">Local UI review only.</p>
                        <p className="mt-2 text-sm text-amber-100/90">Queue data is source_missing in local review. Use a real admin session before reviewing or changing queue items.</p>
                    </div>
                ) : (
                    <div className={`${adminQueueModuleClassName} bg-red-500/10 text-center`} data-mobile-density="compact" data-mobile-sprawl-guard="true">
                        <p className="text-base font-semibold text-red-200">Queue data could not be loaded.</p>
                        <p className="mt-2 text-sm text-red-100/90">{error || "The queue configuration is unavailable right now."}</p>
                        <button
                            type="button"
                            onClick={() => {
                                setLoading(true);
                                void fetchQueueData();
                            }}
                            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-black/40 px-5 py-2 text-sm font-bold text-white transition-colors hover:border-brand-purple/40 hover:bg-white/5"
                        >
                            Retry Queue Load
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            className="mx-auto max-w-4xl pb-[calc(env(safe-area-inset-bottom)+6.5rem)] md:pb-28"
            data-mobile-density="compact"
            data-mobile-sprawl-guard="true"
            data-mobile-organization="summary-first"
            data-mobile-drilldown="true"
            data-desktop-flow-collapsed="true"
        >
            <PageViewEvent eventName="admin_queue_viewed" />
            <AdminPageHeader
                eyebrow="Admin Queue"
                topSlot={(
                    <Link href="/admin/drops" className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white">
                        <ArrowLeft className="h-4 w-4" /> Back to Drops
                    </Link>
                )}
                title="Manage Queue"
                subtitle="Keep automated rotation readable by default and switch to edit mode only when needed."
                compact
                actions={(
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="hidden min-h-11 items-center gap-2 rounded-full bg-brand-purple px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-purple/20 transition-all hover:bg-[#d946ef] disabled:opacity-50 md:inline-flex"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Settings
                    </button>
                )}
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.05fr_1.95fr] lg:gap-6" data-mobile-organization="summary-first">
                <section className={`${adminQueueModuleClassName} bg-white/[0.02] shadow-xl shadow-black/20`} data-mobile-density="compact" data-mobile-sprawl-guard="true">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-purple">Schedule Summary</p>
                            <h2 className="mt-2 text-xl font-black text-white">Auto Queue</h2>
                            <p className="mt-2 text-sm leading-6 text-gray-400">{scheduleSummary}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setScheduleExpanded((current) => !current)}
                            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/8"
                        >
                            <Edit className="h-3.5 w-3.5" />
                            {scheduleExpanded ? "Done" : "Edit"}
                        </button>
                    </div>

                    <div className="mt-4 space-y-3 rounded-[1.35rem] border border-white/8 bg-black/30 p-3.5">
                        <div className="flex items-start gap-2 text-sm text-gray-300">
                            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple/80" />
                            <div>
                                <p className="font-semibold text-white">Next live slot</p>
                                <p className="mt-1 text-sm text-gray-400">{nextSlotLabel || "Queue is empty right now."}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-gray-300">
                            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple/80" />
                            <div>
                                <p className="font-semibold text-white">Cooldown window</p>
                                <p className="mt-1 text-sm text-gray-400">{config.cooldownDays}-day return cooldown for recycled drops.</p>
                            </div>
                        </div>
                    </div>

                    {scheduleExpanded ? (
                        <div className="mt-4 space-y-4 border-t border-white/8 pt-4">
                            <label className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Drops per day</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={config.dropsPerDay}
                                    onChange={(event) => {
                                        const count = Math.max(1, parseInt(event.target.value, 10) || 1);
                                        let times = [...config.timesPerDay];
                                        if (times.length < count) {
                                            times = [...times, ...Array(count - times.length).fill(times[times.length - 1] || "12:00")];
                                        } else if (times.length > count) {
                                            times = times.slice(0, count);
                                        }
                                        setConfig({ ...config, dropsPerDay: count, timesPerDay: times });
                                    }}
                                    className="min-h-11 rounded-2xl border border-white/10 bg-black/40 px-4 text-white outline-none transition-colors focus:border-brand-purple/40"
                                />
                            </label>

                            <div className="space-y-2">
                                <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Daily release times</span>
                                <div className="space-y-2">
                                    {config.timesPerDay.map((time, index) => (
                                        <label key={`${time}-${index}`} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/35 px-3 py-2.5">
                                            <span className="w-12 text-xs font-bold uppercase tracking-[0.16em] text-brand-purple">#{index + 1}</span>
                                            <input
                                                type="time"
                                                value={time}
                                                onChange={(event) => {
                                                    const nextTimes = [...config.timesPerDay];
                                                    nextTimes[index] = event.target.value;
                                                    setConfig({ ...config, timesPerDay: nextTimes });
                                                }}
                                                className="w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                                            />
                                            <span className="text-xs text-gray-500">{formatAdminTimeLabel(time)}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Return cooldown (days)</span>
                                <input
                                    type="number"
                                    min="1"
                                    value={config.cooldownDays}
                                    onChange={(event) => setConfig({ ...config, cooldownDays: Math.max(1, parseInt(event.target.value, 10) || 1) })}
                                    className="min-h-11 rounded-2xl border border-white/10 bg-black/40 px-4 text-white outline-none transition-colors focus:border-brand-purple/40"
                                />
                                <p className="text-xs text-gray-500">How long the system waits before a completed drop can cycle back into the queue.</p>
                            </label>
                        </div>
                    ) : null}
                </section>

                <section className={`${adminQueueModuleClassName} bg-white/[0.02] shadow-xl shadow-black/20`} data-mobile-density="compact" data-mobile-sprawl-guard="true" data-mobile-drilldown="true">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-4">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-purple">Queue Lineup</p>
                            <h2 className="mt-1 text-xl font-black text-white">{config.queue.length} queued drops</h2>
                            <p className="mt-1 text-sm text-gray-400">
                                {queueEditMode ? "Reorder and clean up the queue with the controls below." : "Compact view first, edit mode only when you need to move or remove items."}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setQueueEditMode((current) => !current)}
                            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/8"
                        >
                            <Edit className="h-3.5 w-3.5" />
                            {queueEditMode ? "Done" : "Edit queue"}
                        </button>
                    </div>

                    <div className="p-3 md:p-4">
                        {dropsHydrating ? (
                            <div className="space-y-2" data-mobile-density="compact" data-mobile-sprawl-guard="true" data-mobile-skeleton="admin-queue-drop-details">
                                {[0, 1, 2].map((item) => (
                                    <div key={item} className={adminQueueSkeletonClassName} />
                                ))}
                            </div>
                        ) : config.queue.length === 0 ? (
                            <div className="rounded-[1.35rem] border-2 border-dashed border-white/10 bg-black/20 px-4 py-6 text-center" data-mobile-density="compact" data-mobile-sprawl-guard="true">
                                <RefreshCw className="mx-auto mb-2 h-8 w-8 text-gray-600" />
                                <p className="font-medium text-gray-300">Queue is empty</p>
                                <p className="mt-1 text-sm text-gray-500">Add drops from the Manage Drops page to start building the lineup.</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {queueItems.map(({ dropId, index, drop, lifecycle }) => {
                                    const projectedSlot = lifecycle?.queueSlotMs ?? null;
                                    const lifecycleLabel = lifecycle?.queueStatus === "live"
                                        ? (drop?.validUntil ? `Live until ${formatAdminCompactDateTime(drop.validUntil)}` : "Live now")
                                        : lifecycle?.queueStatus === "cooldown"
                                            ? (lifecycle.cooldownEndsAt ? `Eligible again ${formatAdminCompactDateTime(lifecycle.cooldownEndsAt)}` : "Cooling down")
                                            : projectedSlot
                                                ? formatAdminCompactDateTime(projectedSlot)
                                                : "Waiting for a slot";

                                    if (!drop) {
                                        return (
                                            <div key={`${dropId}-${index}`} className="flex items-center rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-sm text-red-300">
                                                <span className="truncate">Unknown drop ID: {dropId}</span>
                                                <div className="ml-auto">
                                                    <IconControl label="Remove missing queue entry" onClick={() => removeDrop(index)} icon={Trash2} tone="danger" />
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            key={`${dropId}-${index}`}
                                            className={[
                                                "rounded-[1.45rem] border border-white/8 bg-black/35 p-3 transition-colors",
                                                queueEditMode ? "shadow-[0_14px_28px_rgba(0,0,0,0.16)]" : "hover:bg-white/[0.06]",
                                            ].join(" ")}
                                        >
                                            <div className="flex gap-3">
                                                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[1rem] border border-white/10 bg-black/55">
                                                    {drop.imageUrl ? (
                                                        <NextImage src={drop.imageUrl} alt={drop.title} fill sizes="56px" className="object-cover" />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white">KD</div>
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Slot {index + 1}</p>
                                                            <p className="truncate text-sm font-semibold text-white">{drop.title}</p>
                                                        </div>
                                                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-gray-300">
                                                            {drop.unlockCost} GD
                                                        </span>
                                                    </div>

                                                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                                                        {lifecycleLabel ? (
                                                            <span className="inline-flex items-center gap-1 font-medium text-white">
                                                                <Calendar className="h-3.5 w-3.5 text-brand-purple/80" />
                                                                {lifecycleLabel}
                                                            </span>
                                                        ) : null}
                                                        <span className="inline-flex items-center gap-1">
                                                            <Clock3 className="h-3.5 w-3.5 text-gray-500" />
                                                            {drop.type || "content"} drop
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {queueEditMode ? (
                                                <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/8 pt-3">
                                                    <IconControl
                                                        label="Move up"
                                                        onClick={() => moveDrop(index, "up")}
                                                        icon={ArrowUp}
                                                        disabled={index === 0}
                                                    />
                                                    <IconControl
                                                        label="Move down"
                                                        onClick={() => moveDrop(index, "down")}
                                                        icon={ArrowDown}
                                                        disabled={index === config.queue.length - 1}
                                                    />
                                                    <IconControl
                                                        label="Remove from queue"
                                                        onClick={() => removeDrop(index)}
                                                        icon={Trash2}
                                                        tone="danger"
                                                    />
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-20 md:hidden">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-purple px-5 text-sm font-bold text-white shadow-[0_18px_40px_rgba(236,72,153,0.28)] transition-colors hover:bg-[#d946ef] disabled:opacity-50"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Queue Settings
                </button>
            </div>
        </div>
    );
}
