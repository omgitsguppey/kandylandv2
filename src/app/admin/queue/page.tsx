"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Calendar, Edit, Save, Trash2 } from "lucide-react";
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
import { AdminQueueTriageCanvas } from "@/components/creative-tim/kandydrops/admin-queue/AdminQueueTriageCanvas";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { formatAdminCompactDateTime, formatAdminTimeLabel } from "@/lib/admin-drop-formatting";
import { createStaleRequestGuard, getMobileSkeletonClass, getModuleLoadingState } from "@/lib/frontend-hardening/ui/loading-state-contract";
import {
    buildAdminQueueProjection,
    buildReadableQueueScheduleSummary,
    readAdminDropQueueConfig,
    type AdminDropQueueConfig,
} from "@/lib/admin-drop-queue";
import { normalizeDropRecordOrFallback } from "@/lib/drop-read-models";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/Button";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { resolveClientActionError, type ResolvedClientActionError } from "@/lib/errors/client-error-adapter";
import { classifyFirestoreClientRetry } from "@/lib/firestore-client-errors";
import { shouldRetry4xx } from "@/lib/route-hardening/route-4xx-mitigation";

type QueueConfig = AdminDropQueueConfig;

const adminQueueSkeletonClassName = getMobileSkeletonClass("admin", "manager");

export default function ManageQueuePage() {
    const { user } = useAuth();
    const [config, setConfig] = useState<QueueConfig | null>(null);
    const [drops, setDrops] = useState<Record<string, Drop>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<ResolvedClientActionError | null>(null);
    const [dropDetailsLoading, setDropDetailsLoading] = useState(false);
    const [dropDetailsError, setDropDetailsError] = useState<unknown>(null);
    const queueEditButtonRef = useRef<HTMLButtonElement>(null);
    const [scheduleExpanded, setScheduleExpanded] = useState(false);
    const [queueEditMode, setQueueEditMode] = useState(false);
    const queueLoadGuardRef = useRef(createStaleRequestGuard());
    const isLocalAdminUiTestSession = isAdminUiTestSessionUser(user);

    const fetchQueueDropDetails = useCallback(async (requestId: number) => {
        if (!queueLoadGuardRef.current.isFresh(requestId)) return false;
        setDropDetailsLoading(true);
        setDropDetailsError(null);
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
                return true;
            } catch (dropLoadError) {
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
                setDropDetailsError(dropLoadError);
                toast.error("Queue schedule loaded. Drop details could not be refreshed.");
                return false;
            } finally {
            if (queueLoadGuardRef.current.isFresh(requestId)) setDropDetailsLoading(false);
        }
    }, []);

    const fetchQueueData = useCallback(async (preserveDraftOnFailure = false) => {
        if (isLocalAdminUiTestSession) {
            setConfig(null);
            setDrops({});
            setError(null);
            setDropDetailsLoading(false);
            setDropDetailsError(null);
            setLoading(false);
            return true;
        }

        const requestId = queueLoadGuardRef.current.next();
        try {
            setError(null);
            const queueRes = await authFetch("/api/admin/queue");

            if (!queueRes.ok) {
                const responseBody = await queueRes.json().catch(() => null);
                const failure = resolveClientActionError(responseBody, { surface: "admin_truth", route: "/admin/queue", status: queueRes.status, fallbackKey: "admin_truth_unavailable" });
                throw Object.assign(new Error(failure.descriptor.operatorMessage), { code: failure.descriptor.errorKey, status: queueRes.status });
            }

            const queueData = readAdminDropQueueConfig(await queueRes.json());
            if (!queueData) throw Object.assign(new Error("Queue source response is not a verified configuration."), { code: "admin_truth_unavailable", status: queueRes.status });

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

            await fetchQueueDropDetails(requestId);
            return true;
        } catch (err: unknown) {
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
            if (!preserveDraftOnFailure) {
                setConfig(null);
                setDrops({});
            }
            const failure = resolveClientActionError(err, { surface: "admin_truth", route: "/admin/queue", fallbackKey: "admin_truth_unavailable", context: { unconfirmedSave: preserveDraftOnFailure } });
            setError(failure);
            toast.error(failure.descriptor.operatorMessage);
            return false;
        } finally {
            if (queueLoadGuardRef.current.isFresh(requestId)) {
                setLoading(false);
            }
        }
    }, [fetchQueueDropDetails, isLocalAdminUiTestSession]);

    useEffect(() => {
        setLoading(true);
        setSaving(false);
        setDrops({});
        setDropDetailsLoading(false);
        setDropDetailsError(null);
        void fetchQueueData();
        return () => { queueLoadGuardRef.current.next(); };
    }, [fetchQueueData, user?.uid]);

    const handleSave = useCallback(async () => {
        if (isLocalAdminUiTestSession) {
            return;
        }

        if (!config) {
            return;
        }

        const requestId = queueLoadGuardRef.current.current();
        setSaving(true);
        try {
            setError(null);
            const response = await authFetch("/api/admin/queue", {
                method: "PUT",
                body: JSON.stringify(config),
            });
            if (!queueLoadGuardRef.current.isFresh(requestId)) return;
            if (!response.ok) {
                const responseBody = await response.json().catch(() => null);
                const failure = resolveClientActionError(responseBody, { surface: "admin_truth", route: "/admin/queue", status: response.status, fallbackKey: "mutation_failed" });
                throw Object.assign(new Error(failure.descriptor.operatorMessage), { code: failure.descriptor.errorKey, status: response.status });
            }
            const acknowledgement: unknown = await response.json().catch(() => null);
            if (!queueLoadGuardRef.current.isFresh(requestId)) return;
            const savedConfig = acknowledgement !== null && typeof acknowledgement === "object" && !Array.isArray(acknowledgement)
                && "success" in acknowledgement && acknowledgement.success === true && "config" in acknowledgement
                ? readAdminDropQueueConfig(acknowledgement.config) : null;
            if (!savedConfig) throw Object.assign(new Error("Queue Save response did not confirm the saved configuration."), { code: "stale_data", status: response.status });
            setConfig(savedConfig);
            toast.success("Queue configuration saved!");
        } catch (err: unknown) {
            if (!queueLoadGuardRef.current.isFresh(requestId)) return;
            reportClientIssue({
                channel: "network",
                message: "Admin queue save failed",
                error: err,
                detail: {
                    action: "save_queue_config",
                },
                consoleLabel: "[Admin Queue] save failed",
            });
            const failure = resolveClientActionError(err, { surface: "admin_truth", route: "/admin/queue", fallbackKey: "mutation_failed", context: { unconfirmedSave: Boolean(err && typeof err === "object" && "code" in err && err.code === "stale_data") } });
            setError(failure);
            toast.error(failure.descriptor.operatorMessage);
        } finally {
            if (queueLoadGuardRef.current.isFresh(requestId)) setSaving(false);
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
    const dropDetailsState = getModuleLoadingState({ loading: dropDetailsLoading, error: dropDetailsError, hasData: Object.keys(drops).length > 0 });
    const dropsHydrating = Boolean(config && config.queue.length > 0 && dropDetailsState === "loading");
    const dropDetailsRecovery = classifyFirestoreClientRetry(dropDetailsError);
    const loadStatus = error?.context.status;
    const canRetryQueueLoad = typeof loadStatus !== "number" || loadStatus < 400 || loadStatus >= 500
        || shouldRetry4xx({ route: "/api/admin/queue", method: "GET", statusCode: loadStatus }).retry;
    const saveBlockedByAccess = error?.context.unconfirmedSave === true || error?.descriptor.primaryAction === "go_back" || error?.descriptor.primaryAction === "sign_in";

    
    if (loading) {
        return <AdminQueueTriageCanvas eyebrow="Queue control" title="Preparing triage" subtitle="Loading the current queue source and schedule." stateContent={(
            <Card className="min-w-0 gap-3 p-4 shadow-none" data-mobile-density="compact" data-mobile-sprawl-guard="true" data-mobile-skeleton="admin-queue-route">
                <div className={adminQueueSkeletonClassName} />
                <div className={adminQueueSkeletonClassName} data-mobile-skeleton="admin-queue-lineup" />
            </Card>
        )} />;
    }
    if (!config) {
        return <AdminQueueTriageCanvas eyebrow="Queue control" title="Queue unavailable" subtitle="Configure automated drop rotation and schedule." beforeContent={<PageViewEvent eventName="admin_queue_viewed" />} stateContent={(
            <Card className="min-w-0 gap-3 p-4 shadow-none" data-mobile-density="compact" data-mobile-sprawl-guard="true" data-admin-queue-fixture-boundary={isLocalAdminUiTestSession ? "true" : undefined} data-admin-queue-error-key={error?.descriptor.errorKey}>
                {isLocalAdminUiTestSession ? <>
                    <p className="font-semibold text-foreground">source_missing fixture.</p>
                    <p className="break-words text-sm text-muted-foreground">source_missing: queue source is not loaded in this fixture. Protected reads and writes stay blocked until verified admin access provides the source.</p>
                </> : <>
                    <AdminStatusBadge state="failed" />
                    <div role="alert" className="min-w-0 space-y-2 break-words">
                        <p className="font-semibold text-foreground">Queue data could not be loaded.</p>
                        <p className="text-sm text-muted-foreground">{error?.descriptor.operatorMessage ?? "The queue configuration is unavailable right now."}</p>
                    </div>
                    {canRetryQueueLoad ? <Button variant="outline" className="max-w-full self-start whitespace-normal" onClick={() => { setLoading(true); void fetchQueueData(); }}>Retry Queue Load</Button> : null}
                </>}
            </Card>
        )} />;
    }
    return <AdminQueueTriageCanvas
        eyebrow="Queue control" title="Release Triage" subtitle="Review the lineup, edit the schedule, then save your changes."
        beforeContent={<PageViewEvent eventName="admin_queue_viewed" />}
        backLink={<Link href="/admin/drops" className={buttonVariants({ variant: "ghost", size: "sm" })}><ArrowLeft className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />Back to Drops</Link>}
        action={<Button variant="brand" className="max-w-full whitespace-normal" onClick={handleSave} isLoading={saving} disabled={saveBlockedByAccess}>{!saving ? <Save className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" /> : null}Save Queue Settings</Button>}
    >
        {error ? <Card role="alert" className="min-w-0 gap-2 border border-destructive/40 p-4 shadow-none" data-admin-queue-error-key={error.descriptor.errorKey}><AdminStatusBadge state={error.descriptor.errorKey === "stale_data" ? "stale" : "failed"} /><p className="break-words text-sm text-foreground">{error.descriptor.operatorMessage}</p><p className="text-sm text-muted-foreground">Your draft remains on this page.</p>{error.context.unconfirmedSave === true && canRetryQueueLoad ? <Button variant="outline" size="sm" className="max-w-full self-start whitespace-normal" disabled={saving} onClick={() => { setLoading(true); void fetchQueueData(true); }}>Refresh Queue Source</Button> : null}</Card> : null}
        <Card role="region" aria-labelledby="queue-schedule-heading" className="min-w-0 gap-3 p-4 shadow-none" data-mobile-density="compact" data-mobile-sprawl-guard="true" data-mobile-organization="summary-first" data-desktop-flow-collapsed="true">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-[1_1_14rem]"><h2 id="queue-schedule-heading" className="text-base font-semibold text-foreground">Auto Queue</h2><p className="mt-1 break-words text-sm text-muted-foreground">{scheduleSummary}</p></div>
                <Button variant="outline" size="sm" className="max-w-full whitespace-normal" disabled={saving} aria-expanded={scheduleExpanded} aria-controls="queue-schedule-fields" onClick={() => setScheduleExpanded(current => !current)}><Edit className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />{scheduleExpanded ? "Done editing schedule" : "Edit schedule"}</Button>
            </div>
            <dl className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-3 text-sm">
                <div className="min-w-0"><dt className="font-medium text-foreground">Next live slot</dt><dd className="mt-1 break-words text-muted-foreground">{nextSlotLabel || (config.queue.length === 0 ? "Queue is empty right now." : "Drop details are needed to project the next slot.")}</dd></div>
                <div className="min-w-0"><dt className="font-medium text-foreground">Cooldown window</dt><dd className="mt-1 break-words text-muted-foreground">{config.cooldownDays}-day return cooldown for recycled drops.</dd></div>
            </dl>
            {scheduleExpanded ? <div id="queue-schedule-fields" className="min-w-0 space-y-4 border-t border-border pt-4">
                <label className="block min-w-0 space-y-2"><span className="text-sm font-medium text-foreground">Drops per day</span><Input type="number" min="1" max="10" disabled={saving} value={config.dropsPerDay} onChange={event => {
                    const count = Math.max(1, parseInt(event.target.value, 10) || 1);
                    let times = [...config.timesPerDay];
                    if (times.length < count) times = [...times, ...Array(count - times.length).fill(times[times.length - 1] || "12:00")];
                    else if (times.length > count) times = times.slice(0, count);
                    setConfig({ ...config, dropsPerDay: count, timesPerDay: times });
                }} /></label>
                <fieldset className="min-w-0 space-y-3"><legend className="mb-2 text-sm font-medium text-foreground">Daily release times</legend>
                    {config.timesPerDay.map((time,index) => <label key={index} className="block min-w-0 space-y-2"><span className="block text-sm text-muted-foreground">Release time {index + 1} · {formatAdminTimeLabel(time)}</span><Input type="time" className="[color-scheme:dark]" disabled={saving} value={time} onChange={event => { const nextTimes = [...config.timesPerDay]; nextTimes[index] = event.target.value; setConfig({ ...config, timesPerDay: nextTimes }); }} /></label>)}
                </fieldset>
                <label className="block min-w-0 space-y-2"><span className="text-sm font-medium text-foreground">Return cooldown (days)</span><Input type="number" min="1" disabled={saving} value={config.cooldownDays} onChange={event => setConfig({ ...config, cooldownDays: Math.max(1, parseInt(event.target.value, 10) || 1) })} /><span className="block break-words text-sm text-muted-foreground">How long the system waits before a completed drop can cycle back into the queue.</span></label>
            </div> : null}
        </Card>
        <Card role="region" aria-labelledby="queue-lineup-heading" className="min-w-0 gap-0 overflow-hidden py-0 shadow-none" data-mobile-density="compact" data-mobile-sprawl-guard="true" data-mobile-drilldown="true" data-mobile-organization="summary-first" data-desktop-flow-collapsed="true">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-[1_1_14rem]"><h2 id="queue-lineup-heading" className="text-base font-semibold text-foreground">{config.queue.length} queued drops</h2><p className="mt-1 break-words text-sm text-muted-foreground">{queueEditMode ? "Reorder and clean up the queue with the controls below." : "Review the lineup or edit its order."}</p></div>
                <Button ref={queueEditButtonRef} variant="outline" size="sm" className="max-w-full whitespace-normal" disabled={saving} aria-expanded={queueEditMode} onClick={() => setQueueEditMode(current => !current)}><Edit className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />{queueEditMode ? "Done editing queue" : "Edit queue"}</Button>
            </div>
            {dropDetailsError ? <div className="min-w-0 space-y-2 border-t border-border p-4" role="alert" data-admin-queue-drop-details-state="failed"><AdminStatusBadge state="degraded" /><p className="break-words text-sm font-medium text-foreground">Drop details could not be refreshed.</p><p className="break-words text-sm text-muted-foreground">The queue configuration and your draft remain available. {dropDetailsRecovery.retryable ? "Retry the detail read to reconnect." : "Check access or the source before reopening this view."}</p>{dropDetailsRecovery.retryable ? <Button variant="outline" size="sm" className="max-w-full whitespace-normal" disabled={saving} onClick={() => { void fetchQueueDropDetails(queueLoadGuardRef.current.next()); }}>Retry Drop Details</Button> : null}</div> : null}
            {dropDetailsLoading && !dropsHydrating ? <p role="status" className="break-words border-t border-border p-4 text-sm text-muted-foreground">Refreshing drop details. Your draft remains available.</p> : null}
            {dropsHydrating ? <div className="space-y-2 border-t border-border p-4" data-mobile-density="compact" data-mobile-sprawl-guard="true" data-mobile-skeleton="admin-queue-drop-details">{[0,1,2].map(item => <div key={item} className={adminQueueSkeletonClassName} />)}</div> : config.queue.length === 0 ? <div className="min-w-0 space-y-2 border-t border-border p-4"><p className="font-medium text-foreground">Queue is empty</p><p className="break-words text-sm text-muted-foreground">Add drops from the Manage Drops page to start building the lineup.</p></div> : <ol className="min-w-0 divide-y divide-border border-t border-border">
                {queueItems.map(({dropId,index,drop,lifecycle}) => {
                    const projectedSlot = lifecycle?.queueSlotMs ?? null;
                    const lifecycleLabel = lifecycle?.queueStatus === "live"
                                        ? (drop?.validUntil ? `Live until ${formatAdminCompactDateTime(drop.validUntil)}` : "Live now")
                                        : lifecycle?.queueStatus === "cooldown"
                                            ? (lifecycle.cooldownEndsAt ? `Eligible again ${formatAdminCompactDateTime(lifecycle.cooldownEndsAt)}` : "Cooling down")
                                            : projectedSlot
                                                ? formatAdminCompactDateTime(projectedSlot)
                                                : "Waiting for a slot";
                    const recordTitleId = "queue-record-title-" + index;
                    if (!drop) return <li key={dropId} className="min-w-0 space-y-3 p-4"><p id={recordTitleId} className="break-words text-sm text-foreground">{dropDetailsError ? "Drop details unavailable: " : "Unknown drop ID: "}{dropId}</p>{!dropDetailsError ? <Button variant="danger" size="sm" disabled={saving} aria-label="Remove missing queue entry" aria-describedby={recordTitleId} onClick={() => { removeDrop(index); queueEditButtonRef.current?.focus(); }}><Trash2 className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />Remove missing entry</Button> : null}</li>;
                    return <li key={dropId} className="min-w-0 space-y-3 p-4">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-secondary">{drop.imageUrl ? <NextImage src={drop.imageUrl} alt={drop.title} fill sizes="56px" className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-foreground">KD</span>}</div>
                            <div className="min-w-0 flex-1 space-y-1"><p className="text-sm text-muted-foreground">Slot {index + 1}</p><p id={recordTitleId} className="break-words text-base font-semibold text-foreground">{drop.title}</p><p className="text-sm text-muted-foreground">{drop.unlockCost} GD · {drop.type || "content"} drop</p></div>
                        </div>
                        {lifecycleLabel ? <p className="flex min-w-0 items-start gap-2 text-sm text-muted-foreground"><Calendar className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">{lifecycleLabel}</span></p> : null}
                        {queueEditMode ? <div className="flex min-w-0 flex-wrap gap-2"><Button variant="outline" size="icon" aria-label="Move up" aria-describedby={recordTitleId} disabled={saving || index === 0} onClick={() => moveDrop(index,"up")}><ArrowUp className="h-4 w-4" aria-hidden="true" /></Button><Button variant="outline" size="icon" aria-label="Move down" aria-describedby={recordTitleId} disabled={saving || index === config.queue.length - 1} onClick={() => moveDrop(index,"down")}><ArrowDown className="h-4 w-4" aria-hidden="true" /></Button><Button variant="danger" size="icon" aria-label="Remove from queue" aria-describedby={recordTitleId} disabled={saving} onClick={() => { removeDrop(index); queueEditButtonRef.current?.focus(); }}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button></div> : null}
                    </li>;
                })}
            </ol>}
        </Card>
    </AdminQueueTriageCanvas>;
}
