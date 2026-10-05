"use client";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { AdminOverviewActivityItem, AdminOverviewResponse } from "@/lib/admin-overview";
import { paginateOverviewItems } from "@/lib/admin-overview";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import type { AdminSurfaceState } from "@/lib/admin-parity";

/* ── Constants ──────────────────────────────────────────────────────────── */

const PAGE_SIZE = 5;
/** 14 days: beyond this the latest record is considered "stale context" */
const STALE_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000;

/* ── Types ──────────────────────────────────────────────────────────────── */

type AdminActivityLogPanelProps = {
    activity: AdminOverviewResponse["adminActivity"];
    /** Freshness timestamp from the overview response. */
    lastAdminActivityAt?: number;
    /** Truth note from the server or realtime hook. */
    truthNote?: string;
};

type AdminActivityDebugMeta = {
    feedSource: string;
    listenerNote: string;
    totalItems: number;
    adjustmentItems: number;
    telemetryItems: number;
    latestItemMs: number;
    oldestItemMs: number;
    staleDays: number;
    pageSize: number;
    currentPage: number;
    actorResolved: number;
    actorUnresolved: number;
    targetResolved: number;
    targetUnresolved: number;
};

/* ── Truth chip helpers ─────────────────────────────────────────────────── */

function resolveActivityTruthState(
    activity: AdminOverviewActivityItem[],
    truthNote?: string,
): AdminSurfaceState {
    const normalizedNote = truthNote?.toLowerCase() ?? "";
    if (normalizedNote.includes("failed")) return "failed";
    if (normalizedNote.includes("degraded") || normalizedNote.includes("fallback")) return "fallback";
    if (normalizedNote.includes("initializing") || normalizedNote.includes("waiting")) return "loading";
    if (activity.length === 0) return "unavailable";

    const allLegacy = activity.every(
        (item) => item.actorLabel === "Unknown operator" || item.actorLabel === "Legacy admin record",
    );
    if (allLegacy) return "degraded";

    if (normalizedNote.includes("active")) return "live";
    if (normalizedNote.includes("cached")) return "cached";

    return "unavailable";
}

/* ── Badge colors by source ─────────────────────────────────────────────── */

const SOURCE_BADGE_STYLES: Record<string, string> = {
    transactions: "border-sky-400/20 bg-sky-500/10 text-sky-300",
    analytics_event_facts: "border-purple-400/20 bg-purple-500/10 text-purple-300",
};

/* ── Component ─────────────────────────────────────────────────────────── */

export function AdminActivityLogPanel({
    activity,
    lastAdminActivityAt,
    truthNote,
}: AdminActivityLogPanelProps) {
    const [page, setPage] = useState(0);
    const paginated = useMemo(
        () => paginateOverviewItems(activity, page, PAGE_SIZE),
        [activity, page],
    );

    const truthState = useMemo(
        () => resolveActivityTruthState(activity, truthNote),
        [activity, truthNote],
    );

    /* ── Freshness label ───────────────────────────────────────────────── */
    const freshnessLabel = useMemo(() => {
        const latestTs = lastAdminActivityAt ?? (activity.length > 0
            ? activity.reduce((latest, item) => Math.max(latest, item.timestamp), 0)
            : 0);
        if (latestTs <= 0) return null;

        const ageMs = Date.now() - latestTs;
        const isStale = ageMs > STALE_THRESHOLD_MS;
        const relative = formatDistanceToNow(latestTs, { addSuffix: true });

        if (isStale) {
            return { text: `Latest admin action: ${relative}`, stale: true };
        }
        return { text: `Latest admin action: ${relative}`, stale: false };
    }, [lastAdminActivityAt, activity]);

    /* ── Debug metadata ────────────────────────────────────────────────── */
    const debugMeta: AdminActivityDebugMeta = useMemo(() => {
        const adjustmentItems = activity.filter(i => i.source === "transactions").length;
        const telemetryItems = activity.filter(i => i.source === "analytics_event_facts").length;
        const latestItemMs = activity.reduce((max, i) => Math.max(max, i.timestamp), 0);
        const oldestItemMs = activity.reduce((min, i) => (min === 0 ? i.timestamp : Math.min(min, i.timestamp)), 0);
        const staleDays = latestItemMs > 0 ? Math.round((Date.now() - latestItemMs) / (24 * 60 * 60 * 1000)) : -1;

        let actorResolved = 0;
        let actorUnresolved = 0;
        let targetResolved = 0;
        let targetUnresolved = 0;
        activity.forEach((item) => {
            if (item.actorLabel && item.actorLabel !== "Unknown operator") actorResolved++;
            else actorUnresolved++;
            if (item.targetLabel) targetResolved++;
            else targetUnresolved++;
        });

        return {
            feedSource: "firestore/transactions[admin_adjustment] + analytics_event_facts",
            listenerNote: truthNote ?? "no truth note provided",
            totalItems: activity.length,
            adjustmentItems,
            telemetryItems,
            latestItemMs,
            oldestItemMs,
            staleDays,
            pageSize: PAGE_SIZE,
            currentPage: page,
            actorResolved,
            actorUnresolved,
            targetResolved,
            targetUnresolved,
        };
    }, [activity, truthNote, page]);

    /* ── Render ──────────────────────────────────────────────────────────── */
    return (
        <div className="min-w-0 space-y-4" data-debug-admin-activity={JSON.stringify(debugMeta)}>
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0"><p className="text-sm font-medium text-muted-foreground">Activity evidence</p>{freshnessLabel ? <p className={`mt-1 text-xs ${freshnessLabel.stale ? "text-warning" : "text-muted-foreground"}`}>{freshnessLabel.text}</p> : null}</div>
                <AdminStatusBadge state={truthState} />
            </div>
            {activity.length === 0 ? <p className="py-6 text-sm leading-6 text-muted-foreground">No admin actions were found in the current source window.</p> : (
                <>
                    <ol className="min-w-0 divide-y divide-border" aria-label="Admin activity records">
                        {paginated.items.map((item) => {
                            const relativeLabel = item.timestamp > 0 ? formatDistanceToNow(item.timestamp, { addSuffix: true }) : "Unknown time";
                            const sourceLabel = item.source === "transactions" ? "Adjustment" : "Admin event";
                            const sourceBadgeStyle = SOURCE_BADGE_STYLES[item.source] ?? "border-border bg-secondary text-secondary-foreground";
                            return (
                                <li key={item.id} className="min-w-0 py-4">
                                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3"><Badge variant="secondary" className={sourceBadgeStyle}>{sourceLabel}</Badge><span className="text-xs text-muted-foreground">{relativeLabel}</span></div>
                                    <p className="mt-2 wrap-anywhere text-sm font-medium text-foreground">{item.label}</p>
                                    <dl className="mt-2 grid min-w-0 gap-1 text-xs leading-5">
                                        <div className="flex min-w-0 flex-wrap gap-x-2"><dt className="text-muted-foreground">Operator</dt><dd className="wrap-anywhere text-foreground">{item.actorLabel}</dd></div>
                                        {item.targetLabel ? <div className="flex min-w-0 flex-wrap gap-x-2"><dt className="text-muted-foreground">Target</dt><dd className="wrap-anywhere text-foreground">{item.targetLabel}</dd></div> : null}
                                        {item.detail ? <div className="min-w-0"><dt className="sr-only">Details</dt><dd className="wrap-anywhere text-muted-foreground">{item.detail}</dd></div> : null}
                                    </dl>
                                </li>
                            );
                        })}
                    </ol>
                    {paginated.totalPages > 1 ? (
                        <nav aria-label="Admin activity pagination" className="flex min-w-0 flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                            <span>Showing {paginated.startIndex + 1}-{paginated.endIndex} of {activity.length}</span>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" type="button" onClick={() => setPage((c) => Math.max(0, c - 1))} disabled={paginated.page === 0} aria-label="Previous page"><ChevronLeft aria-hidden="true" size={16} /></Button>
                                <Button variant="ghost" size="icon" type="button" onClick={() => setPage((c) => Math.min(paginated.totalPages - 1, c + 1))} disabled={paginated.page >= paginated.totalPages - 1} aria-label="Next page"><ChevronRight aria-hidden="true" size={16} /></Button>
                            </div>
                        </nav>
                    ) : null}
                </>
            )}
        </div>
    );
}
