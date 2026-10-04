/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/creative-tim/ui/input";
import { Badge } from "@/components/creative-tim/ui/badge";

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
        return <section data-admin-top-drops-table="true" className="min-w-0 space-y-2" aria-labelledby="top-drops-title"><h3 id="top-drops-title" className="text-base font-semibold">Top drops</h3><p className="text-xs leading-5 text-muted-foreground">Ranked by all-time unwraps</p><p className="py-6 text-sm leading-6 text-muted-foreground">No drop activity in this range.</p></section>;
    }

    return (
        <section data-admin-top-drops-table="true" className="min-w-0 space-y-4" aria-labelledby="top-drops-title">
            <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0"><h3 id="top-drops-title" className="text-base font-semibold">Top drops</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Ranked by all-time unwraps</p></div>
                <label className="relative block min-w-0 max-w-full flex-1 basis-56"><span className="sr-only">Search top drops</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input type="text" value={searchInput} onChange={(e) => { setSearchInput(e.target.value); trackEvent("admin_top_drops_search", { query: e.target.value.slice(0, 40) }); }} placeholder="Search drops" className="pl-10" /></label>
            </header>
            {filtered.length === 0 ? <p className="py-6 text-sm leading-6 text-muted-foreground">No drops match this search.</p> : (
                <ol className="min-w-0 divide-y divide-border" aria-label="Top drops ranked by all-time unwraps">
                    {pageSlice.map((drop, idx) => {
                        const rank = startIdx + idx + 1;
                        const statusKey = drop.approvalStatus === "pending_review" ? "pending_review" : drop.status;
                        const statusLabel = STATUS_LABEL[statusKey] || drop.status;
                        const pillStyle = STATUS_PILL_STYLES[statusKey] || STATUS_PILL_STYLES.expired;
                        return (
                            <li key={drop.id} className="min-w-0 py-4">
                                <div className="flex min-w-0 items-start gap-3">
                                    <span className="min-w-6 shrink-0 pt-1 text-sm font-medium tabular-nums text-muted-foreground">{rank}</span>
                                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">{drop.imageUrl ? <img src={drop.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No image</div>}</div>
                                    <div className="min-w-0 flex-1"><p className="wrap-anywhere text-sm font-medium">{drop.title}</p><p className="mt-1 wrap-anywhere font-mono text-xs text-muted-foreground">{drop.id}</p></div>
                                </div>
                                <div className="mt-3 flex min-w-0 flex-wrap items-start justify-between gap-3"><Badge variant="secondary" className={pillStyle}>{statusLabel}</Badge>
                                    <dl className="flex min-w-0 flex-wrap gap-x-5 gap-y-2 text-xs"><div><dt className="text-muted-foreground">Unwraps</dt><dd className="mt-1 font-semibold tabular-nums">{(drop.totalUnlocks || 0).toLocaleString()}</dd></div><div><dt className="text-muted-foreground">Clicks</dt><dd className="mt-1 font-semibold tabular-nums">{(drop.totalClicks || 0).toLocaleString()}</dd></div><div><dt className="text-muted-foreground">Price</dt><dd className="mt-1 font-semibold tabular-nums text-primary">{drop.unlockCost} GD</dd></div></dl>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
            {filtered.length > PAGE_SIZE && (
                <nav aria-label="Top drops pagination" className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground" aria-live="polite">Showing {startIdx + 1}-{endIdx} of {filtered.length}</p>
                    <div className="flex max-w-full flex-wrap items-center gap-2"><Button variant="ghost" size="icon" type="button" disabled={safePage === 0} onClick={() => handlePageChange("prev")} aria-label="Previous top drops page"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></Button><span className="text-xs font-medium tabular-nums text-muted-foreground">{safePage + 1} / {totalPages}</span><Button variant="ghost" size="icon" type="button" disabled={safePage >= totalPages - 1} onClick={() => handlePageChange("next")} aria-label="Next top drops page"><ChevronRight className="h-4 w-4" aria-hidden="true" /></Button></div>
                </nav>
            )}
        </section>
    );
}
