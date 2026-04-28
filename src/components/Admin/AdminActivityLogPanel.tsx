"use client";

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
    if (normalizedNote.includes("initializing") || normalizedNote.includes("waiting")) return "unavailable";
    if (activity.length === 0) return "unavailable";

    const allLegacy = activity.every(
        (item) => item.actorLabel === "Unknown operator" || item.actorLabel === "Legacy admin record",
    );
    if (allLegacy) return "degraded";

    if (normalizedNote.includes("active")) return "live";
    if (normalizedNote.includes("cached")) return "stale";

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
        <div className="space-y-2" data-debug-admin-activity={JSON.stringify(debugMeta)}>
            {/* ── Truth chip + freshness ──────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                <AdminStatusBadge state={truthState} />
                {freshnessLabel && (
                    <span className={`text-[10px] ${freshnessLabel.stale ? "text-amber-400/70" : "text-gray-500"}`}>
                        {freshnessLabel.text}
                    </span>
                )}
            </div>

            {/* ── Feed rows ──────────────────────────────────────────── */}
            {activity.length === 0 ? (
                <div className="rounded-xl border border-white/8 bg-black/25 px-4 py-6 text-center">
                    <p className="text-[11px] font-semibold text-gray-400">
                        No admin actions found in the current window.
                    </p>
                </div>
            ) : (
                <>
                    <div className="divide-y divide-white/6 rounded-xl border border-white/8 bg-black/20 overflow-hidden">
                        {paginated.items.map((item) => {
                            const relativeLabel = item.timestamp > 0
                                ? formatDistanceToNow(item.timestamp, { addSuffix: true })
                                : "Unknown time";

                            const sourceLabel = item.source === "transactions" ? "Adjustment" : "Admin event";
                            const sourceBadgeStyle = SOURCE_BADGE_STYLES[item.source] ?? "border-white/10 bg-white/5 text-gray-300";

                            return (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-2 px-3 py-2 min-h-[36px]"
                                >
                                    {/* Source badge */}
                                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${sourceBadgeStyle}`}>
                                        {sourceLabel}
                                    </span>

                                    {/* Label + actor · target */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline gap-1.5 text-[12px]">
                                            <span className="truncate font-medium text-white">
                                                {item.label}
                                            </span>
                                            <span className="shrink-0 text-[10px] text-gray-400">
                                                {item.actorLabel}
                                            </span>
                                        </div>
                                        {(item.targetLabel || item.detail) && (
                                            <div className="flex items-baseline gap-1.5 text-[10px] text-gray-500 mt-0.5">
                                                {item.targetLabel && (
                                                    <span className="text-purple-300/70">
                                                        → {item.targetLabel}
                                                    </span>
                                                )}
                                                {item.detail && (
                                                    <span className="truncate">{item.detail}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Time */}
                                    <span className="hidden shrink-0 text-[10px] text-gray-500 sm:block">
                                        {relativeLabel}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Pagination ──────────────────────────────────── */}
                    {paginated.totalPages > 1 && (
                        <div className="flex items-center justify-between px-1 text-[11px] text-gray-400">
                            <span>
                                Showing {paginated.startIndex + 1}–{paginated.endIndex} of {activity.length}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setPage((c) => Math.max(0, c - 1))}
                                    disabled={paginated.page === 0}
                                    className="rounded-full border border-white/10 p-1 text-white disabled:opacity-30"
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPage((c) => Math.min(paginated.totalPages - 1, c + 1))}
                                    disabled={paginated.page >= paginated.totalPages - 1}
                                    className="rounded-full border border-white/10 p-1 text-white disabled:opacity-30"
                                    aria-label="Next page"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
