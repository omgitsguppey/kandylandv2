/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

import { MarqueeText } from "@/components/ui/MarqueeText";
import type { Drop } from "@/types/db";
import { trackEvent } from "@/lib/telemetry";

/* ── Constants ───────────────────────────────────────────────────────────── */

const PAGE_SIZE = 5;
const SEARCH_DEBOUNCE_MS = 300;

/** Canonical status labels — no brackets, no duplicates */
const STATUS_LABEL: Record<string, string> = {
    active: "Live",
    scheduled: "Scheduled",
    expired: "Expired",
    queued: "Queued",
    draft: "Draft",
    pending_review: "Review",
};

const STATUS_PILL_STYLES: Record<string, string> = {
    active: "border-emerald-400/20 bg-emerald-500/10 text-emerald-400",
    scheduled: "border-amber-400/20 bg-amber-500/10 text-amber-400",
    expired: "border-gray-400/20 bg-gray-500/10 text-gray-400",
    queued: "border-blue-400/20 bg-blue-500/10 text-blue-400",
    draft: "border-gray-400/20 bg-gray-500/10 text-gray-400",
    pending_review: "border-orange-400/20 bg-orange-500/10 text-orange-400",
};

/* ── Props ───────────────────────────────────────────────────────────────── */

export type TopDropsTableDebugMeta = {
    rankingSource: string;
    rankingMetric: string;
    tieBreaker: string;
    searchMode: string;
    paginationMode: string;
    pageSize: number;
    currentPage: number;
    totalDrops: number;
    visibleDrops: number;
    searchQuery: string;
    timeRangeKey: string;
    thumbnailSource: string;
    dropMetadataSource: string;
    clickSource: string;
    unwrapSource: string;
    dedupeKeys: string;
    excludedRecords: string;
    firstRenderMs: number | null;
    searchReadyMs: number | null;
    pageChangeMs: number | null;
};

type TopDropsTableProps = {
    drops: Drop[];
    timeRangeKey: string;
    onDebugMeta?: (meta: TopDropsTableDebugMeta) => void;
};

/* ── Component ───────────────────────────────────────────────────────────── */

export function TopDropsTable({ drops, timeRangeKey, onDebugMeta }: TopDropsTableProps) {
    const [searchInput, setSearchInput] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(0);
    const [prevTimeRangeKey, setPrevTimeRangeKey] = useState(timeRangeKey);

    if (timeRangeKey !== prevTimeRangeKey) {
        setPrevTimeRangeKey(timeRangeKey);
        setCurrentPage(0);
    }

    /* Timing instrumentation */
    const [mountTime] = useState(() => performance.now());
    const firstRenderMs = useRef<number | null>(null);
    const searchReadyMs = useRef<number | null>(null);
    const pageChangeMs = useRef<number | null>(null);

    /* Mark first render */
    useEffect(() => {
        if (firstRenderMs.current === null) {
            firstRenderMs.current = performance.now() - mountTime;
        }
    }, [mountTime]);



    /* Debounce search */
    useEffect(() => {
        const t0 = performance.now();
        const timer = setTimeout(() => {
            setDebouncedQuery(searchInput);
            setCurrentPage(0);
            searchReadyMs.current = performance.now() - t0;
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [searchInput]);

    /* Filter drops by search query */
    const filtered = useMemo(() => {
        if (!debouncedQuery.trim()) return drops;
        const q = debouncedQuery.toLowerCase().trim();
        return drops.filter((d) =>
            d.title.toLowerCase().includes(q) ||
            d.status.toLowerCase().includes(q) ||
            d.id.toLowerCase().includes(q) ||
            (d.creatorId && d.creatorId.toLowerCase().includes(q))
        );
    }, [drops, debouncedQuery]);

    /* Pagination math */
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages - 1);
    const startIdx = safePage * PAGE_SIZE;
    const endIdx = Math.min(startIdx + PAGE_SIZE, filtered.length);
    const pageSlice = filtered.slice(startIdx, endIdx);

    const handlePageChange = useCallback((dir: "prev" | "next") => {
        const t0 = performance.now();
        setCurrentPage((p) => {
            const next = dir === "prev" ? Math.max(0, p - 1) : Math.min(totalPages - 1, p + 1);
            pageChangeMs.current = performance.now() - t0;
            trackEvent("admin_top_drops_page_changed", { page: next, direction: dir });
            return next;
        });
    }, [totalPages]);

    /* Surface debug metadata to parent */
    useEffect(() => {
        onDebugMeta?.({
            rankingSource: "drop.totalUnlocks (all-time counter on drop document)",
            rankingMetric: "totalUnlocks",
            tieBreaker: "array sort order (stable: insertion order)",
            searchMode: "local-bounded",
            paginationMode: "bounded-result",
            pageSize: PAGE_SIZE,
            currentPage: safePage,
            totalDrops: drops.length,
            visibleDrops: filtered.length,
            searchQuery: debouncedQuery,
            timeRangeKey,
            thumbnailSource: "drop.imageUrl (cover image from drop document)",
            dropMetadataSource: "Firestore drops collection, normalized + status-applied",
            clickSource: "drop.totalClicks (optional, from drop document)",
            unwrapSource: "drop.totalUnlocks (from drop document, all-time)",
            dedupeKeys: "drop.id (unique document ID)",
            excludedRecords: "Hidden drops excluded by isDropHiddenFromPublic; failed/test/pending excluded at rollup level",
            firstRenderMs: firstRenderMs.current,
            searchReadyMs: searchReadyMs.current,
            pageChangeMs: pageChangeMs.current,
        });
    }, [drops.length, filtered.length, debouncedQuery, safePage, timeRangeKey, onDebugMeta]);

    if (drops.length === 0) {
        return (
            <section
                data-admin-top-drops-table="true"
                className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(24,14,39,0.92),rgba(8,10,24,0.94))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.2)]"
                aria-labelledby="top-drops-title"
            >
                <div className="border-b border-white/8 pb-3">
                    <p id="top-drops-title" className="text-xs font-black uppercase tracking-[0.18em] text-white">
                        Top drops in this range
                    </p>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-gray-500">
                        Ranked by all-time unwraps
                    </p>
                </div>
                <div className="mt-3 flex min-h-24 items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 px-4 text-center">
                    <p className="text-xs font-semibold text-gray-400">No drop activity in this range.</p>
                </div>
            </section>
        );
    }

    return (
        <section
            data-admin-top-drops-table="true"
            className="space-y-3 rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(24,14,39,0.92),rgba(8,10,24,0.94))] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.2)] sm:p-4"
            aria-labelledby="top-drops-title"
        >
            <div className="flex flex-col gap-3 border-b border-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p id="top-drops-title" className="text-xs font-black uppercase tracking-[0.18em] text-white">
                        Top drops in this range
                    </p>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-gray-500">
                        Ranked by all-time unwraps
                    </p>
                </div>
                <label className="relative block w-full sm:w-56">
                    <span className="sr-only">Search top drops</span>
                    <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                        aria-hidden="true"
                    />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => {
                            setSearchInput(e.target.value);
                            trackEvent("admin_top_drops_search", { query: e.target.value.slice(0, 40) });
                        }}
                        placeholder="Search drops"
                        className="h-11 w-full rounded-xl border border-white/10 bg-black/35 pl-10 pr-3 text-xs font-medium text-white placeholder:text-gray-500 outline-none transition-colors focus:border-brand-purple/50 focus:bg-black/50 focus:ring-2 focus:ring-brand-purple/20"
                    />
                </label>
            </div>

            {filtered.length === 0 ? (
                <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 px-4 text-center">
                    <p className="text-xs font-semibold text-gray-400">No drops match this search.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/25">
                    <table className="min-w-[620px] w-full table-fixed border-collapse text-left">
                        <caption className="sr-only">Top drops in this range, ranked by all-time unwraps.</caption>
                        <thead className="border-b border-white/8 bg-white/[0.035] text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">
                            <tr>
                                <th scope="col" className="w-14 px-3 py-3">Rank</th>
                                <th scope="col" className="px-3 py-3">Drop</th>
                                <th scope="col" className="w-28 px-3 py-3">Status</th>
                                <th scope="col" className="w-24 px-3 py-3 text-right">Unwraps</th>
                                <th scope="col" className="hidden w-20 px-3 py-3 text-right sm:table-cell">Clicks</th>
                                <th scope="col" className="w-24 px-3 py-3 text-right">Price</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.055]">
                            {pageSlice.map((drop, idx) => {
                                const rank = startIdx + idx + 1;
                                const statusKey = drop.approvalStatus === "pending_review" ? "pending_review" : drop.status;
                                const statusLabel = STATUS_LABEL[statusKey] || drop.status;
                                const pillStyle = STATUS_PILL_STYLES[statusKey] || STATUS_PILL_STYLES.expired;

                                return (
                                    <tr key={drop.id} className="group transition-colors hover:bg-white/[0.035]">
                                        <td className="px-3 py-3 align-middle">
                                            <span className="inline-flex min-w-7 items-center justify-center rounded-lg border border-white/8 bg-black/30 px-1.5 py-1 text-[10px] font-black tabular-nums text-gray-400">
                                                {rank}
                                            </span>
                                        </td>
                                        <td className="min-w-0 px-3 py-3 align-middle">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-[0_8px_20px_rgba(0,0,0,0.18)]">
                                                    {drop.imageUrl ? (
                                                        <img
                                                            src={drop.imageUrl}
                                                            alt=""
                                                            className="h-full w-full object-cover"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-[8px] font-semibold text-gray-600">
                                                            No image
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <MarqueeText
                                                        as="p"
                                                        title={drop.title}
                                                        className="text-sm font-bold text-white"
                                                        ariaLabel={drop.title}
                                                    />
                                                    <p className="mt-0.5 truncate font-mono text-[9px] font-medium uppercase tracking-[0.08em] text-gray-600">
                                                        {drop.id}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 align-middle">
                                            <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${pillStyle}`}>
                                                {statusLabel}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-right align-middle">
                                            <span className="text-sm font-bold tabular-nums text-white">
                                                {(drop.totalUnlocks || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="hidden px-3 py-3 text-right align-middle sm:table-cell">
                                            <span className="text-sm font-semibold tabular-nums text-gray-400">
                                                {(drop.totalClicks || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-right align-middle">
                                            <span className="inline-flex rounded-lg border border-brand-purple/20 bg-brand-purple/10 px-2 py-1 text-xs font-black tabular-nums text-brand-purple">
                                                {drop.unlockCost} GD
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {filtered.length > PAGE_SIZE && (
                <nav aria-label="Top drops pagination" className="flex items-center justify-between gap-3 border-t border-white/8 pt-3">
                    <p className="text-xs font-medium text-gray-500" aria-live="polite">
                        Showing {startIdx + 1}-{endIdx} of {filtered.length}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={safePage === 0}
                            onClick={() => handlePageChange("prev")}
                            aria-label="Previous top drops page"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/35 text-gray-400 transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                        >
                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <span className="min-w-[4.5rem] text-center text-xs font-bold tabular-nums text-gray-400">
                            {safePage + 1} / {totalPages}
                        </span>
                        <button
                            type="button"
                            disabled={safePage >= totalPages - 1}
                            onClick={() => handlePageChange("next")}
                            aria-label="Next top drops page"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/35 text-gray-400 transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                        >
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                </nav>
            )}
        </section>
    );
}