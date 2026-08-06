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
            <div className="rounded-xl border border-white/8 bg-black/25 px-4 py-5 text-center">
                <p className="text-[11px] font-semibold text-gray-400">No drop activity in this range.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                    Top drops in this range
                </p>
                <div className="relative w-40 sm:w-48">
                    <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => {
                            setSearchInput(e.target.value);
                            trackEvent("admin_top_drops_search", { query: e.target.value.slice(0, 40) });
                        }}
                        placeholder="Search drops"
                        className="w-full rounded-lg border border-white/10 bg-black/40 py-1.5 pl-7 pr-2 text-[11px] text-white placeholder-gray-500 outline-none focus:border-brand-purple/40 focus:ring-1 focus:ring-brand-purple/20"
                    />
                </div>
            </div>
            {filtered.length === 0 ? (
                <div className="rounded-xl border border-white/8 bg-black/25 px-4 py-5 text-center">
                    <p className="text-[11px] font-semibold text-gray-400">No drops match this search.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-white/8 bg-black/30">
                    <div className="grid grid-cols-[1.5rem,28px,minmax(0,1fr),auto,auto,auto,auto] items-center gap-x-2 border-b border-white/6 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-gray-500">
                        <span>#</span>
                        <span />
                        <span>Title</span>
                        <span className="text-right">Status</span>
                        <span className="text-right">Unwraps</span>
                        <span className="hidden text-right sm:block">Clicks</span>
                        <span className="text-right">Price</span>
                    </div>
                    {pageSlice.map((drop, idx) => {
                        const rank = startIdx + idx + 1;
                        const statusKey = drop.approvalStatus === "pending_review" ? "pending_review" : drop.status;
                        const statusLabel = STATUS_LABEL[statusKey] || drop.status;
                        const pillStyle = STATUS_PILL_STYLES[statusKey] || STATUS_PILL_STYLES.expired;

                        return (
                            <div
                                key={drop.id}
                                className="grid grid-cols-[1.5rem,28px,minmax(0,1fr),auto,auto,auto,auto] items-center gap-x-2 border-b border-white/4 px-2.5 py-1.5 last:border-b-0 transition-colors hover:bg-white/[0.03]"
                            >
                                <span className="text-[10px] font-black text-gray-500">{rank}</span>
                                <div className="h-7 w-7 flex-shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/40">
                                    {drop.imageUrl ? (
                                        <img
                                            src={drop.imageUrl}
                                            alt=""
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-[8px] text-gray-600">No image</div>
                                    )}
                                </div>
                                <MarqueeText
                                    as="p"
                                    title={drop.title}
                                    className="text-[11px] font-semibold text-white"
                                    ariaLabel={drop.title}
                                />
                                <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] ${pillStyle}`}>
                                    {statusLabel}
                                </span>
                                <span className="text-right text-[11px] font-semibold tabular-nums text-gray-300">
                                    {(drop.totalUnlocks || 0).toLocaleString()}
                                </span>
                                <span className="hidden text-right text-[11px] font-semibold tabular-nums text-gray-400 sm:block">
                                    {(drop.totalClicks || 0).toLocaleString()}
                                </span>
                                <span className="text-right text-[11px] font-bold tabular-nums text-brand-purple">
                                    {drop.unlockCost} GD
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
            {filtered.length > PAGE_SIZE && (
                <div className="flex items-center justify-between pt-0.5">
                    <p className="text-[10px] text-gray-500">
                        Showing {startIdx + 1}-{endIdx} of {filtered.length}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            disabled={safePage === 0}
                            onClick={() => handlePageChange("prev")}
                            aria-label="Previous page"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-black/35 text-gray-400 transition-colors hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="h-3 w-3" aria-hidden="true" />
                        </button>
                        <span className="min-w-[3rem] text-center text-[10px] font-semibold text-gray-400">
                            {safePage + 1} / {totalPages}
                        </span>
                        <button
                            type="button"
                            disabled={safePage >= totalPages - 1}
                            onClick={() => handlePageChange("next")}
                            aria-label="Next page"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-black/35 text-gray-400 transition-colors hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="h-3 w-3" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
