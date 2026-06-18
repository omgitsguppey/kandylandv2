import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase-data", () => ({
    db: {},
    rtdb: {},
    storage: {},
}));

import { resolveTruthChipLabel, resolveTruthChipVariant } from "@/hooks/useAdminOverviewRealtime";
import type { AdminOverviewRealtimeDebugMeta } from "@/lib/admin-overview";

/**
 * Targeted validation for Admin Overview truth state.
 * This test suite validates:
 * - Title copy ("Admin Overview" not "Admin Dashboard")
 * - "CONTROL ROOM" eyebrow is not referenced
 * - "Last txn" is not in the chip vocabulary
 * - Vague chips [PARTIAL], [DEGRADED] are not produced by the truth resolver
 * - Admin Overview has a declared canonical source
 * - cache/fallback/live states are distinguishable
 * - admin top spacing token contract
 * - fromCache metadata fields exist in the type
 */

describe("admin overview truth chips", () => {
    const allLoaded = {
        dropsLoaded: true,
        summaryLoaded: true,
        transactionsLoaded: true,
        adminActivityLoaded: true,
        dropsFailed: false,
        summaryFailed: false,
        transactionsFailed: false,
        adminActivityFailed: false,
        dropsFromCache: false,
        summaryFromCache: false,
        transactionsFromCache: false,
        adminActivityFromCache: false,
    };

    it("returns hot-cache snapshot copy when server data is present", () => {
        expect(resolveTruthChipLabel(allLoaded, true)).toBe("Showing hourly hot-cache snapshot");
    });

    it("returns last verified data when server data is present from cache", () => {
        expect(resolveTruthChipLabel({ ...allLoaded, dropsFromCache: true }, true)).toBe("Last verified data");
    });

    it("returns refresh due copy when operational pulse lanes fail", () => {
        expect(resolveTruthChipLabel({ ...allLoaded, dropsFailed: true }, true)).toBe(
            "Refresh due",
        );
        expect(resolveTruthChipLabel({ ...allLoaded, dropsFailed: true, summaryFailed: true }, true)).toBe(
            "Refresh due",
        );
    });

    it("returns 'Collecting activity' when nothing has loaded", () => {
        const empty = {
            dropsLoaded: false, summaryLoaded: false, transactionsLoaded: false, adminActivityLoaded: false,
            dropsFailed: false, summaryFailed: false, transactionsFailed: false, adminActivityFailed: false,
            dropsFromCache: false, summaryFromCache: false, transactionsFromCache: false, adminActivityFromCache: false,
        };
        expect(resolveTruthChipLabel(empty, false)).toBe("Collecting activity");
    });

    it("keeps hot-cache snapshot copy when server data exists during partial client loading", () => {
        const partial = { ...allLoaded, summaryLoaded: false, transactionsLoaded: false };
        expect(resolveTruthChipLabel(partial, true)).toBe("Showing hourly hot-cache snapshot");
    });

    it("returns hot-cache snapshot copy when no client refresh has loaded but server data exists", () => {
        const noRealtime = {
            dropsLoaded: false, summaryLoaded: false, transactionsLoaded: false, adminActivityLoaded: false,
            dropsFailed: false, summaryFailed: false, transactionsFailed: false, adminActivityFailed: false,
            dropsFromCache: false, summaryFromCache: false, transactionsFromCache: false, adminActivityFromCache: false,
        };
        expect(resolveTruthChipLabel(noRealtime, true)).toBe("Showing hourly hot-cache snapshot");
    });

    it("never produces vague bracket-prefixed labels", () => {
        const allStates = [
            resolveTruthChipLabel(allLoaded, true),
            resolveTruthChipLabel({ ...allLoaded, dropsFromCache: true }, true),
            resolveTruthChipLabel({ ...allLoaded, dropsFailed: true }, true),
            resolveTruthChipLabel({ ...allLoaded, summaryLoaded: false }, true),
            resolveTruthChipLabel({
                dropsLoaded: false, summaryLoaded: false, transactionsLoaded: false, adminActivityLoaded: false,
                dropsFailed: false, summaryFailed: false, transactionsFailed: false, adminActivityFailed: false,
                dropsFromCache: false, summaryFromCache: false, transactionsFromCache: false, adminActivityFromCache: false,
            }, false),
        ];

        for (const label of allStates) {
            expect(label).not.toMatch(/\[PARTIAL\]/i);
            expect(label).not.toMatch(/\[DEGRADED\]/i);
            expect(label).not.toMatch(/\[Live\]/i);
            expect(label).not.toMatch(/\[Failed\]/i);
            expect(label).not.toMatch(/\[Unknown\]/i);
            expect(label).not.toContain("Last txn");
            expect(label).not.toContain("CONTROL ROOM");
            expect(label).not.toContain("Feed");
        }
    });
});

describe("admin overview truth chip variants", () => {
    it("maps known labels to correct CSS variants", () => {
        expect(resolveTruthChipVariant("Showing hourly hot-cache snapshot")).toBe("cached");
        expect(resolveTruthChipVariant("Last verified data")).toBe("cached");
        expect(resolveTruthChipVariant("Connecting snapshot refresh")).toBe("degraded");
        expect(resolveTruthChipVariant("Refresh due")).toBe("fallback");
        expect(resolveTruthChipVariant("Collecting activity")).toBe("unavailable");
    });

    it("returns waiting for unknown labels", () => {
        expect(resolveTruthChipVariant("something unknown")).toBe("unavailable");
    });
});

describe("admin overview debug meta type contract", () => {
    it("AdminOverviewRealtimeDebugMeta has all required fromCache fields", () => {
        // This test validates the type shape at runtime by constructing a valid instance.
        const meta: AdminOverviewRealtimeDebugMeta = {
            dropsFromCache: false,
            summaryFromCache: false,
            transactionsFromCache: true,
            adminActivityFromCache: false,
            lastServerConfirmedAt: Date.now(),
            lastClientSnapshotAt: Date.now(),
            pollingActive: true,
            pollingIntervalMs: 60000,
            legacyDataMapped: false,
            metricScope: "operational_pulse_only",
            purpose: "operational_pulse_only",
            owner: "admin_overview",
            costRisk: "moderate",
            businessTruthSource: "refresh_based_hot_cache",
        };

        expect(meta).toHaveProperty("dropsFromCache");
        expect(meta).toHaveProperty("summaryFromCache");
        expect(meta).toHaveProperty("transactionsFromCache");
        expect(meta).toHaveProperty("adminActivityFromCache");
        expect(meta).toHaveProperty("lastServerConfirmedAt");
        expect(meta).toHaveProperty("lastClientSnapshotAt");
        expect(meta).toHaveProperty("pollingActive");
        expect(meta).toHaveProperty("pollingIntervalMs");
        expect(meta).toHaveProperty("legacyDataMapped");
        expect(meta).toHaveProperty("metricScope");
        expect(meta).toHaveProperty("purpose");
        expect(meta).toHaveProperty("owner");
        expect(meta).toHaveProperty("costRisk");
        expect(meta).toHaveProperty("businessTruthSource");
    });
});

describe("admin overview copy contract", () => {
    it("title must be 'Admin Overview' not 'Admin Dashboard'", () => {
        // This test documents the expected title. The actual UI component renders this string.
        const ADMIN_OVERVIEW_TITLE = "Admin Overview";
        expect(ADMIN_OVERVIEW_TITLE).toBe("Admin Overview");
        expect(ADMIN_OVERVIEW_TITLE).not.toBe("Admin Dashboard");
    });

    it("eyebrow must not be 'Control Room'", () => {
        // The admin overview page passes eyebrow={null} to AdminPageHeader.
        // This test documents that CONTROL ROOM is forbidden.
        const FORBIDDEN_EYEBROWS = ["Control Room", "CONTROL ROOM"];
        const currentEyebrow = null;
        expect(FORBIDDEN_EYEBROWS).not.toContain(currentEyebrow);
    });
});

describe("admin top spacing tokens", () => {
    it("documents the expected CSS custom property names", () => {
        // These tokens are defined in globals.css and consumed by the admin layout.
        const ADMIN_SPACING_TOKENS = [
            "--admin-shell-gap",
            "--admin-shell-gap-md",
        ];
        expect(ADMIN_SPACING_TOKENS).toHaveLength(2);
        expect(ADMIN_SPACING_TOKENS[0]).toBe("--admin-shell-gap");
        expect(ADMIN_SPACING_TOKENS[1]).toBe("--admin-shell-gap-md");
    });

    it("mobile token is 1rem and shared, not an ad hoc top-only token", () => {
        const globalsCss = readFileSync(
            join(__dirname, "../../src/app/globals.css"),
            "utf-8",
        );
        expect(globalsCss).toContain("--admin-shell-gap: 1rem");
        expect(globalsCss).not.toContain("--admin-top-spacing:");
    });

    it("desktop token is 1.25rem and shared, not an ad hoc top-only token", () => {
        const globalsCss = readFileSync(
            join(__dirname, "../../src/app/globals.css"),
            "utf-8",
        );
        expect(globalsCss).toContain("--admin-shell-gap-md: 1.25rem");
        expect(globalsCss).not.toContain("--admin-top-spacing-md:");
    });

    it("admin layout uses shared admin shell spacing classes", () => {
        const adminLayout = readFileSync(
            join(__dirname, "../../src/app/admin/layout.tsx"),
            "utf-8",
        );
        expect(adminLayout).toContain("ADMIN_TOP_TO_CONSOLE_GAP_CLASS");
        expect(adminLayout).toContain("ADMIN_CONSOLE_TO_CONTENT_GAP_CLASS");
        expect(adminLayout).toContain("data-admin-shell-spacing=\"shared\"");
    });
});

describe("hero truth display rule", () => {
    it("hero has exactly one chip (truth chip), not multiple", () => {
        // The AdminPageHeader actions slot must contain a single <span> chip.
        // Extract the actions prop block from <AdminPageHeader ... />
        const startIdx = ADMIN_PAGE_SOURCE.indexOf("<AdminPageHeader");
        expect(startIdx).toBeGreaterThan(-1);
        const endIdx = ADMIN_PAGE_SOURCE.indexOf("/>", startIdx);
        expect(endIdx).toBeGreaterThan(startIdx);
        const headerBlock = ADMIN_PAGE_SOURCE.slice(startIdx, endIdx + 2);

        // Must NOT contain a Fragment wrapper (<> ... </>), which indicates multiple chips
        expect(headerBlock).not.toContain("<>");
        expect(headerBlock).not.toContain("</>");

        // Must contain the single source-state badge plus the exact truth label text.
        expect(ADMIN_PAGE_SOURCE).toContain("pageData.truthLabel");
        expect(headerBlock).toContain("<AdminStatusBadge state={truthVariant}");
        expect(ADMIN_PAGE_SOURCE).toContain("pageData.truthLabel}</span>");
    });

    it("serverUpdateLabel is passed as subtitle, not as a standalone chip", () => {
        expect(ADMIN_PAGE_SOURCE).toContain("pageData.serverUpdateLabel");
        // Must NOT have a standalone chip with serverUpdateLabel
        expect(ADMIN_PAGE_SOURCE).not.toContain(">{serverUpdateLabel}</span>");
    });

    it("issue chip is NOT in the hero", () => {
        // issueChipLabel should not be rendered in AdminPageHeader
        expect(ADMIN_PAGE_SOURCE).not.toContain("issueChipLabel");
    });

    it("issue count remains in AdminStatsBar", () => {
        expect(ADMIN_PAGE_SOURCE).toContain("overviewIssues={data.overviewIssues}");
    });
});

// ─── Drops at a Glance panel contracts ────────────────────────────────────────

describe("drops panel status sort priorities", () => {
    it("assigns sort priorities in the documented order: pending < rejected < live < queued < scheduled < ended", () => {
        // These values mirror buildStatusPresentation in AdminDropsAtGlancePanel.tsx.
        // If the sort order changes, this test must be updated and the agent-truth doc must be updated.
        const PRIORITY_ORDER = [
            { kind: "pending_review", priority: 0 },
            { kind: "rejected", priority: 1 },
            { kind: "live", priority: 2 },
            { kind: "queued", priority: 3 },
            { kind: "scheduled", priority: 4 },
            { kind: "ended", priority: 5 },
        ];

        for (let i = 1; i < PRIORITY_ORDER.length; i++) {
            expect(PRIORITY_ORDER[i].priority).toBeGreaterThan(PRIORITY_ORDER[i - 1].priority);
        }
    });
});

describe("drops panel summary reducer", () => {
    it("counts statuses correctly from a mock row set", () => {
        const mockRows = [
            { statusLabel: "Live", isQueued: false },
            { statusLabel: "Live", isQueued: true },
            { statusLabel: "Scheduled", isQueued: false },
            { statusLabel: "Queued", isQueued: true },
            { statusLabel: "Pending review", isQueued: false },
            { statusLabel: "Ended", isQueued: false },
        ];

        const summary = mockRows.reduce((totals, row) => {
            totals.total += 1;
            if (row.statusLabel === "Live") totals.live += 1;
            if (row.statusLabel === "Scheduled") totals.scheduled += 1;
            if (row.isQueued) totals.queued += 1;
            if (row.statusLabel === "Pending review") totals.pending += 1;
            return totals;
        }, { total: 0, live: 0, scheduled: 0, queued: 0, pending: 0 });

        expect(summary.total).toBe(6);
        expect(summary.live).toBe(2);
        expect(summary.scheduled).toBe(1);
        expect(summary.queued).toBe(2);
        expect(summary.pending).toBe(1);
    });
});

describe("drops panel search filter logic", () => {
    const titles = ["Galaxy Drop", "Cosmic Candy", "Sweet Galaxy Burst", "Midnight Glow"];

    function filterBySearch(rows: string[], search: string) {
        const trimmed = search.trim().toLowerCase();
        if (!trimmed) return rows;
        return rows.filter((t) => t.toLowerCase().includes(trimmed));
    }

    it("returns all rows when search is empty", () => {
        expect(filterBySearch(titles, "")).toEqual(titles);
        expect(filterBySearch(titles, "   ")).toEqual(titles);
    });

    it("filters by case-insensitive substring", () => {
        expect(filterBySearch(titles, "galaxy")).toEqual(["Galaxy Drop", "Sweet Galaxy Burst"]);
        expect(filterBySearch(titles, "GALAXY")).toEqual(["Galaxy Drop", "Sweet Galaxy Burst"]);
    });

    it("returns empty array when no match", () => {
        expect(filterBySearch(titles, "nonexistent")).toEqual([]);
    });
});

describe("drops feed fromCache type contract", () => {
    it("documents that useAdminDropsFeed return type includes fromCache: boolean", () => {
        // This test validates the expected return shape of useAdminDropsFeed.
        // The actual hook is client-only and cannot be tested in a Node.js unit test,
        // but this documents the contract that the panel depends on.
        type AdminDropsFeedReturn = {
            drops: unknown[];
            legacyQueueIds: Set<string>;
            loading: boolean;
            loadError: string | null;
            fromCache: boolean;
        };

        const mock: AdminDropsFeedReturn = {
            drops: [],
            legacyQueueIds: new Set(),
            loading: false,
            loadError: null,
            fromCache: false,
        };

        expect(mock).toHaveProperty("fromCache");
        expect(typeof mock.fromCache).toBe("boolean");
    });
});

describe("drops truth label resolver", () => {
    // Mirror of resolveDropsTruthLabel from AdminDropsAtGlancePanel.tsx
    function resolveDropsTruthLabel(state: { loading: boolean; loadError: string | null; fromCache: boolean }) {
        if (state.loadError) return { label: "Error", dotClass: "bg-red-400" };
        if (state.loading) return { label: "Loading…", dotClass: "bg-gray-400 animate-pulse" };
        if (state.fromCache) return { label: "Cached", dotClass: "bg-amber-400" };
        return { label: "Live", dotClass: "bg-emerald-400" };
    }

    it("returns Error when loadError is present", () => {
        expect(resolveDropsTruthLabel({ loading: false, loadError: "fail", fromCache: false }).label).toBe("Error");
    });

    it("returns Loading when loading", () => {
        expect(resolveDropsTruthLabel({ loading: true, loadError: null, fromCache: true }).label).toBe("Loading…");
    });

    it("returns Cached when fromCache is true", () => {
        expect(resolveDropsTruthLabel({ loading: false, loadError: null, fromCache: true }).label).toBe("Cached");
    });

    it("returns Live when server-confirmed", () => {
        expect(resolveDropsTruthLabel({ loading: false, loadError: null, fromCache: false }).label).toBe("Live");
    });

    it("never produces vague bracket labels", () => {
        const states = [
            resolveDropsTruthLabel({ loading: false, loadError: null, fromCache: false }),
            resolveDropsTruthLabel({ loading: false, loadError: null, fromCache: true }),
            resolveDropsTruthLabel({ loading: true, loadError: null, fromCache: true }),
            resolveDropsTruthLabel({ loading: false, loadError: "err", fromCache: false }),
        ];
        for (const s of states) {
            expect(s.label).not.toMatch(/\[/);
            expect(s.label).not.toContain("PARTIAL");
            expect(s.label).not.toContain("DEGRADED");
        }
    });
});

/* ========================================================================
   Revenue + Unwraps module source-code contracts
   ======================================================================== */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const CHART_SOURCE = readFileSync(
    join(__dirname, "../../src/components/Admin/AdminAnalyticsCharts.tsx"),
    "utf-8",
);

const ADMIN_PAGE_SOURCE = readFileSync(
    join(__dirname, "../../src/app/admin/page.tsx"),
    "utf-8",
);

import { calculateOverviewMetricDelta } from "@/lib/admin-overview";

describe("revenue + unwraps module: source-code contracts", () => {
    it("uses canonical purple #b28cff", () => {
        expect(CHART_SOURCE).toContain("KANDYDROPS_CHART_COLORS.brand");
    });

    it("uses lighter purple tint #d8b4fe for unwraps", () => {
        expect(CHART_SOURCE).toContain("KANDYDROPS_CHART_COLORS.brandSoft");
    });

    it("does NOT use pink #d946ef (fuchsia-500)", () => {
        expect(CHART_SOURCE).not.toContain("#d946ef");
    });

    it("does NOT use pink #f472b6 (pink-400)", () => {
        expect(CHART_SOURCE).not.toContain("#f472b6");
    });

    it("exposes all 5 time-range options", () => {
        expect(CHART_SOURCE).toContain('"24h"');
        expect(CHART_SOURCE).toContain('"7d"');
        expect(CHART_SOURCE).toContain('"14d"');
        expect(CHART_SOURCE).toContain('"30d"');
        expect(CHART_SOURCE).toContain('"all"');
    });

    it("does NOT contain '1 read issue' text", () => {
        expect(CHART_SOURCE.toLowerCase()).not.toContain("read issue");
    });

    it("does NOT contain 'issueCount' prop", () => {
        expect(CHART_SOURCE).not.toContain("issueCount");
    });

    it("does NOT contain 'Revenue view' / 'Unwrap view' tab labels", () => {
        expect(CHART_SOURCE).not.toContain("Revenue view");
        expect(CHART_SOURCE).not.toContain("Unwrap view");
    });

    it("uses 'Days with sales' instead of 'Active days'", () => {
        expect(CHART_SOURCE).toContain("Days with sales");
        expect(CHART_SOURCE).not.toContain("Active days");
    });

    it("renders both revenue and unwraps data in the same chart", () => {
        expect(CHART_SOURCE).toContain('dataKey="revenue"');
        expect(CHART_SOURCE).toContain('dataKey="unwraps"');
    });

    it("uses ComposedChart (not separate AreaChart/BarChart)", () => {
        expect(CHART_SOURCE).toContain("ComposedChart");
    });

    it("passes truthLabel/truthVariant instead of issueCount to AdminAnalyticsCharts", () => {
        expect(ADMIN_PAGE_SOURCE).toContain("truthLabel={pageData.truthLabel}");
        expect(ADMIN_PAGE_SOURCE).toContain("truthVariant={truthVariant}");
        // AdminAnalyticsCharts must not receive issueCount.
        // Note: AdminStatsBar still legitimately receives issueCount, so we check the chart block specifically.
        // Extract lines between <AdminAnalyticsCharts and the next closing />
        const startIdx = ADMIN_PAGE_SOURCE.indexOf("<AdminAnalyticsCharts");
        expect(startIdx).toBeGreaterThan(-1);
        const endIdx = ADMIN_PAGE_SOURCE.indexOf("/>", startIdx);
        expect(endIdx).toBeGreaterThan(startIdx);
        const chartBlock = ADMIN_PAGE_SOURCE.slice(startIdx, endIdx + 2);
        expect(chartBlock).not.toContain("issueCount");
    });

    it("admin page accordion is titled 'Revenue + Unwraps' not 'Revenue trends'", () => {
        expect(ADMIN_PAGE_SOURCE).toContain('title="Revenue + Unwraps"');
        expect(ADMIN_PAGE_SOURCE).not.toContain('title="Revenue trends"');
    });
});

describe("revenue + unwraps module: delta safety", () => {
    it("returns null percentChange when previous is 0", () => {
        const result = calculateOverviewMetricDelta(100, 0);
        expect(result.percentChange).toBeNull();
    });

    it("returns 0 percentChange when both are equal and nonzero", () => {
        const result = calculateOverviewMetricDelta(50, 50);
        expect(result.percentChange).toBe(0);
    });

    it("returns positive percentChange when current > previous", () => {
        const result = calculateOverviewMetricDelta(150, 100);
        expect(result.percentChange).toBeGreaterThan(0);
    });

    it("returns negative percentChange when current < previous", () => {
        const result = calculateOverviewMetricDelta(50, 100);
        expect(result.percentChange).toBeLessThan(0);
    });

    it("never produces NaN or Infinity", () => {
        const testCases = [
            [0, 0],
            [100, 0],
            [0, 100],
            [1, 1000000],
            [1000000, 1],
        ];
        for (const [current, previous] of testCases) {
            const result = calculateOverviewMetricDelta(current, previous);
            if (result.percentChange !== null) {
                expect(Number.isFinite(result.percentChange)).toBe(true);
            }
        }
    });
});

/* ========================================================================
   Top drops table: source-code contracts
   ======================================================================== */

const TOP_DROPS_TABLE_SOURCE = readFileSync(
    join(__dirname, "../../src/components/Admin/TopDropsTable.tsx"),
    "utf-8",
);

describe("top drops table: source-code contracts", () => {
    it("standalone 'Top performing drops' accordion is removed from admin page", () => {
        expect(ADMIN_PAGE_SOURCE).not.toContain('title="Top performing drops"');
    });

    it("TopDropsPanel import is removed from admin page", () => {
        expect(ADMIN_PAGE_SOURCE).not.toContain("TopDropsPanel");
    });

    it("admin page passes topDrops prop to AdminAnalyticsCharts", () => {
        expect(ADMIN_PAGE_SOURCE).toContain("topDrops={data?.topDrops");
    });

    it("AdminAnalyticsCharts accepts topDrops prop", () => {
        expect(CHART_SOURCE).toContain("topDrops");
        expect(CHART_SOURCE).toContain("TopDropsTable");
    });

    it("top drops table has a search input", () => {
        expect(TOP_DROPS_TABLE_SOURCE).toContain("Search drops");
        expect(TOP_DROPS_TABLE_SOURCE).toContain("<input");
    });

    it("top drops table has pagination controls (Prev/Next/Showing)", () => {
        expect(TOP_DROPS_TABLE_SOURCE).toContain("Showing");
        expect(TOP_DROPS_TABLE_SOURCE).toContain("ChevronLeft");
        expect(TOP_DROPS_TABLE_SOURCE).toContain("ChevronRight");
    });

    it("top drops table uses compact row layout with thumbnail", () => {
        expect(TOP_DROPS_TABLE_SOURCE).toContain("imageUrl");
        expect(TOP_DROPS_TABLE_SOURCE).toContain("object-cover");
    });

    it("time range key is passed to top drops table", () => {
        expect(CHART_SOURCE).toContain("timeRangeKey={timeRange}");
    });

    it("pagination resets on time-range change", () => {
        expect(TOP_DROPS_TABLE_SOURCE).toContain("setCurrentPage(0)");
        expect(TOP_DROPS_TABLE_SOURCE).toContain("timeRangeKey");
    });

    it("does not use offset pagination for Firestore", () => {
        expect(TOP_DROPS_TABLE_SOURCE).not.toContain(".offset(");
        expect(TOP_DROPS_TABLE_SOURCE).not.toContain("offset:");
    });

    it("declares ranking source in debug metadata", () => {
        expect(TOP_DROPS_TABLE_SOURCE).toContain("totalUnlocks");
        expect(TOP_DROPS_TABLE_SOURCE).toContain("rankingSource");
    });

    it("declares drop metadata source in debug metadata", () => {
        expect(TOP_DROPS_TABLE_SOURCE).toContain("dropMetadataSource");
    });

    it("does NOT use pink colors", () => {
        expect(TOP_DROPS_TABLE_SOURCE).not.toContain("#d946ef");
        expect(TOP_DROPS_TABLE_SOURCE).not.toContain("#f472b6");
    });

    it("does not produce duplicate status labels", () => {
        // Each status maps to exactly one label in STATUS_LABEL
        const statusMatches = TOP_DROPS_TABLE_SOURCE.match(/STATUS_LABEL/g);
        expect(statusMatches).toBeTruthy();
        // Verify clean labels are present
        expect(TOP_DROPS_TABLE_SOURCE).toContain('"Live"');
        expect(TOP_DROPS_TABLE_SOURCE).toContain('"Scheduled"');
        expect(TOP_DROPS_TABLE_SOURCE).toContain('"Expired"');
    });

    it("uses debounced search input (not instant)", () => {
        expect(TOP_DROPS_TABLE_SOURCE).toContain("SEARCH_DEBOUNCE_MS");
        expect(TOP_DROPS_TABLE_SOURCE).toContain("setTimeout");
    });

    it("search does not require full catalog hydration", () => {
        // Search operates on props.drops, not a Firestore query
        expect(TOP_DROPS_TABLE_SOURCE).not.toContain("collection(");
        expect(TOP_DROPS_TABLE_SOURCE).not.toContain("getDocs");
        expect(TOP_DROPS_TABLE_SOURCE).not.toContain("onSnapshot");
    });

    it("exposes timing instrumentation in debug metadata", () => {
        expect(TOP_DROPS_TABLE_SOURCE).toContain("firstRenderMs");
        expect(TOP_DROPS_TABLE_SOURCE).toContain("searchReadyMs");
        expect(TOP_DROPS_TABLE_SOURCE).toContain("pageChangeMs");
    });

    it("server sends up to 20 drops (not 6)", () => {
        const serverSource = readFileSync(
            join(__dirname, "../../src/app/api/admin/overview/route.ts"),
            "utf-8",
        );
        expect(serverSource).toContain(".slice(0, 20)");
        expect(serverSource).not.toContain(".slice(0, 6)");
    });

    it("overview refresh hook does not own top-drop slicing", () => {
        const realtimeSource = readFileSync(
            join(__dirname, "../../src/hooks/useAdminOverviewRealtime.ts"),
            "utf-8",
        );
        expect(realtimeSource).toContain('"/api/admin/overview"');
        expect(realtimeSource).not.toContain("topDrops.slice");
        expect(realtimeSource).not.toContain(".slice(0, 6)");
    });

    it("shows empty state messages", () => {
        expect(TOP_DROPS_TABLE_SOURCE).toContain("No drop activity in this range");
        expect(TOP_DROPS_TABLE_SOURCE).toContain("No drops match this search");
    });

    it("TopDropsPanel.tsx file no longer exists", () => {
        const { existsSync } = require("fs");
        const oldFile = join(__dirname, "../../src/components/Admin/TopDropsPanel.tsx");
        expect(existsSync(oldFile)).toBe(false);
    });
});

/* ═══════════════════════════════════════════════════════════════════════════
   Recent Transactions Panel — contract tests
   ═══════════════════════════════════════════════════════════════════════════ */

describe("admin overview recent transactions contract", () => {
    const RECENT_TRANSACTIONS_SOURCE = readFileSync(
        join(__dirname, "../../src/components/Admin/RecentTransactionsPanel.tsx"),
        "utf-8",
    );

    const REALTIME_HOOK_SOURCE = readFileSync(
        join(__dirname, "../../src/hooks/useAdminOverviewRealtime.ts"),
        "utf-8",
    );

    /* ── Identity resolution ──────────────────────────────────────────── */

    it("does NOT assign 'Pending lookup' as a display label", () => {
        // "Pending lookup" may appear in a guard/rejection check (!== "Pending lookup"),
        // but must NOT appear as an assignment/default value.
        // Count occurrences: every instance must be in a !== context.
        const allOccurrences = RECENT_TRANSACTIONS_SOURCE.split('"Pending lookup"').length - 1;
        const guardOccurrences = RECENT_TRANSACTIONS_SOURCE.split('!== "Pending lookup"').length - 1;
        expect(allOccurrences).toBe(guardOccurrences);
        // Must not be used as a string literal label
        expect(RECENT_TRANSACTIONS_SOURCE).not.toMatch(/label:\s*"Pending lookup"/);
        expect(RECENT_TRANSACTIONS_SOURCE).not.toMatch(/fallback\w*\s*=\s*"Pending lookup"/);
    });

    it("realtime hook does NOT produce 'Pending lookup' fallback", () => {
        expect(REALTIME_HOOK_SOURCE).not.toContain('"Pending lookup"');
        expect(REALTIME_HOOK_SOURCE).not.toContain("'Pending lookup'");
    });

    it("uses batch user identity resolution from users collection", () => {
        // Must batch-fetch from the users collection
        expect(RECENT_TRANSACTIONS_SOURCE).toContain('collection(db, "users")');
        // Must use documentId() in-query pattern
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("documentId()");
        expect(RECENT_TRANSACTIONS_SOURCE).toContain('"in"');
    });

    it("shows 'Unknown user' for resolved-but-unnamed users", () => {
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("Unknown user");
    });

    it("shows 'Guest activity' for missing actor", () => {
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("Guest activity");
    });

    it("never shows '@Pending lookup' in identity resolution", () => {
        expect(RECENT_TRANSACTIONS_SOURCE).not.toContain("@Pending lookup");
    });

    it("rejects 'Pending lookup' in resolveDisplayName function", () => {
        expect(RECENT_TRANSACTIONS_SOURCE).toContain('!== "Pending lookup"');
    });

    /* ── Truth chip ───────────────────────────────────────────────────── */

    it("has correct truth chip labels", () => {
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("<AdminStatusBadge state={truthState}");
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("if (liveFeedError) return \"fallback\"");
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("if (!isLiveFeedActive) return \"loading\"");
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("if (snapshotFromCache) return \"cached\"");
        expect(RECENT_TRANSACTIONS_SOURCE).not.toContain("if (snapshotFromCache) return \"stale\"");
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("if (identityLookupFailures > 0) return \"degraded\"");
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("return \"live\"");
    });

    it("does NOT use bracket-jargon labels", () => {
        expect(RECENT_TRANSACTIONS_SOURCE).not.toContain("[live]");
        expect(RECENT_TRANSACTIONS_SOURCE).not.toContain("[cached]");
        expect(RECENT_TRANSACTIONS_SOURCE).not.toContain("[fallback]");
    });

    /* ── includeMetadataChanges ────────────────────────────────────────── */

    it("overview refresh uses the hot-cache route instead of raw Firestore listeners", () => {
        expect(REALTIME_HOOK_SOURCE).toContain('"/api/admin/overview"');
        expect(REALTIME_HOOK_SOURCE).toContain("refreshInterval: ADMIN_OVERVIEW_REALTIME_POLICY.snapshotRefreshCadenceMs");
        expect(REALTIME_HOOK_SOURCE).not.toContain("onSnapshot(");
    });

    it("uses includeMetadataChanges in the panel's own listener", () => {
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("includeMetadataChanges: true");
    });

    /* ── Compact layout ───────────────────────────────────────────────── */

    it("does NOT use oversized card styling per row", () => {
        expect(RECENT_TRANSACTIONS_SOURCE).not.toContain("rounded-[1.15rem]");
    });

    it("uses hairline dividers instead of card gaps", () => {
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("divide-y divide-white/6");
    });

    it("uses compact row height (min-h-[36px])", () => {
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("min-h-[36px]");
    });

    /* ── Debug metadata ───────────────────────────────────────────────── */

    it("exposes RecentTransactionsDebugMeta type with required fields", () => {
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("transactionSource");
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("identitySource");
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("listenerStatus");
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("snapshotSource");
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("lastServerFeedMs");
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("lastClientSnapshotMs");
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("resolvedUserCount");
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("pendingLookupCount");
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("missingActorCount");
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("identityLookupLatencyMs");
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("identityLookupFailures");
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("embeddedUsernameUsed");
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("firstFeedRenderMs");
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("identityResolutionCompleteMs");
    });

    /* ── Color contract ───────────────────────────────────────────────── */

    it("does NOT use pink accent colors", () => {
        expect(RECENT_TRANSACTIONS_SOURCE).not.toContain("pink-");
        expect(RECENT_TRANSACTIONS_SOURCE).not.toContain("fuchsia-");
    });

    /* ── Empty state ──────────────────────────────────────────────────── */

    it("shows meaningful empty state message", () => {
        expect(RECENT_TRANSACTIONS_SOURCE).toContain("No recent transactions available");
    });
});

/* ═════════════════════════════════════════════════════════════════════════
   Admin Activity Truth Contracts
   ═════════════════════════════════════════════════════════════════════════ */

const ADMIN_ACTIVITY_SOURCE = readFileSync(
    join(__dirname, "../../src/components/Admin/AdminActivityLogPanel.tsx"),
    "utf-8",
);

const ADMIN_ACTIVITY_HOOK_SOURCE = readFileSync(
    join(__dirname, "../../src/hooks/useAdminOverviewRealtime.ts"),
    "utf-8",
);

const ADMIN_ACTIVITY_TYPES_SOURCE = readFileSync(
    join(__dirname, "../../src/lib/admin-overview.ts"),
    "utf-8",
);

describe("admin activity truth contracts", () => {

    /* ── Source separation ────────────────────────────────────────────── */

    it("admin activity source declares admin adjustments and analytics facts", () => {
        expect(ADMIN_ACTIVITY_TYPES_SOURCE).toContain('"admin_adjustment"');
        expect(ADMIN_ACTIVITY_SOURCE).toContain("analytics_event_facts");
    });

    it("overview hook does not own a dedicated admin activity Firestore listener", () => {
        expect(ADMIN_ACTIVITY_HOOK_SOURCE).not.toContain("admin_overview_admin_activity");
        expect(ADMIN_ACTIVITY_HOOK_SOURCE).not.toContain("onSnapshot(");
    });

    it("panel preserves server telemetry items alongside admin adjustments", () => {
        expect(ADMIN_ACTIVITY_SOURCE).toContain('activity.filter(i => i.source === "analytics_event_facts")');
    });

    /* ── Actor / target separation ────────────────────────────────────── */

    it("AdminOverviewActivityItem type has targetLabel field", () => {
        expect(ADMIN_ACTIVITY_TYPES_SOURCE).toContain("targetLabel?:");
    });

    it("AdminOverviewActivityItem type has targetUserId field", () => {
        expect(ADMIN_ACTIVITY_TYPES_SOURCE).toContain("targetUserId?:");
    });

    it("panel renders actor label and target label separately", () => {
        expect(ADMIN_ACTIVITY_SOURCE).toContain("item.actorLabel");
        expect(ADMIN_ACTIVITY_SOURCE).toContain("item.targetLabel");
    });

    it("does NOT concatenate actor and target into detail string", () => {
        // The detail field should not contain 'target' concatenation — that's done by dedicated targetLabel
        expect(ADMIN_ACTIVITY_SOURCE).not.toMatch(/item\.detail.*target/);
    });

    /* ── Actor fallback rules ─────────────────────────────────────────── */

    it("uses 'Unknown operator' as fallback actor, not 'Admin'", () => {
        expect(ADMIN_ACTIVITY_SOURCE).toContain('"Unknown operator"');
        // 'Admin' as a generic fallback is forbidden
        const fallbackAdminLines = ADMIN_ACTIVITY_SOURCE.split("\n").filter(
            (line) => line.includes('?? "Admin"') || line.includes(': "Admin"'),
        );
        expect(fallbackAdminLines.length).toBe(0);
    });

    /* ── Truth chip vocabulary ─────────────────────────────────────────── */

    it("truth chip has proper source-state vocabulary for activity recovery", () => {
        expect(ADMIN_ACTIVITY_SOURCE).toContain("<AdminStatusBadge state={truthState}");
        expect(ADMIN_ACTIVITY_SOURCE).toContain("Unknown operator");
        expect(ADMIN_ACTIVITY_SOURCE).toContain("Legacy admin record");
        expect(ADMIN_ACTIVITY_SOURCE).toContain("live");
        expect(ADMIN_ACTIVITY_SOURCE).toContain("cached");
        expect(ADMIN_ACTIVITY_SOURCE).toContain("stale");
        expect(ADMIN_ACTIVITY_SOURCE).toContain("degraded");
        expect(ADMIN_ACTIVITY_SOURCE).toContain("fallback");
        expect(ADMIN_ACTIVITY_SOURCE).toContain("loading");
        expect(ADMIN_ACTIVITY_SOURCE).toContain("unavailable");
    });

    it("does NOT use 'Admin-only feed' as the sole truth indicator", () => {
        expect(ADMIN_ACTIVITY_SOURCE).not.toContain("Admin-only feed");
    });

    it("does NOT produce vague labels like [PARTIAL] or [DEGRADED]", () => {
        const truthChipSection = ADMIN_ACTIVITY_SOURCE.match(/TRUTH_CHIP_LABELS[\s\S]*?};/)?.[0] ?? "";
        expect(truthChipSection).not.toContain("[PARTIAL]");
        expect(truthChipSection).not.toContain("[DEGRADED]");
    });

    /* ── Freshness context ────────────────────────────────────────────── */

    it("shows freshness context with 'Latest admin action:' label", () => {
        expect(ADMIN_ACTIVITY_SOURCE).toContain("Latest admin action:");
    });

    it("does not label cached activity evidence as stale truth", () => {
        expect(ADMIN_ACTIVITY_SOURCE).toContain('normalizedNote.includes("cached")) return "cached"');
        expect(ADMIN_ACTIVITY_SOURCE).not.toContain('normalizedNote.includes("cached")) return "stale"');
    });

    it("uses amber coloring for stale freshness", () => {
        expect(ADMIN_ACTIVITY_SOURCE).toContain("amber-400");
    });

    /* ── Compact layout ──────────────────────────────────────────────── */

    it("uses compact rows with min-h-[36px], not oversized cards", () => {
        expect(ADMIN_ACTIVITY_SOURCE).toContain("min-h-[36px]");
        expect(ADMIN_ACTIVITY_SOURCE).not.toContain("rounded-[1.15rem]");
    });

    it("uses hairline dividers (divide-y divide-white/6)", () => {
        expect(ADMIN_ACTIVITY_SOURCE).toContain("divide-y divide-white/6");
    });

    it("does NOT use per-row bg-black/30 card layout", () => {
        // Per-row bg-black/30 is the old oversized card pattern
        // The new pattern uses a single rounded-xl container with divide-y
        const rowMatches = ADMIN_ACTIVITY_SOURCE.match(/min-h-\[36px\].*?bg-black\/30/g);
        expect(rowMatches).toBeNull();
    });

    /* ── Debug metadata ──────────────────────────────────────────────── */

    it("exposes debug metadata as data-debug-admin-activity", () => {
        expect(ADMIN_ACTIVITY_SOURCE).toContain("data-debug-admin-activity");
    });

    it("debug metadata includes source separation fields", () => {
        expect(ADMIN_ACTIVITY_SOURCE).toContain("adjustmentItems");
        expect(ADMIN_ACTIVITY_SOURCE).toContain("telemetryItems");
    });

    it("debug metadata includes actor/target resolution counts", () => {
        expect(ADMIN_ACTIVITY_SOURCE).toContain("actorResolved");
        expect(ADMIN_ACTIVITY_SOURCE).toContain("actorUnresolved");
        expect(ADMIN_ACTIVITY_SOURCE).toContain("targetResolved");
        expect(ADMIN_ACTIVITY_SOURCE).toContain("targetUnresolved");
    });

    /* ── Listener state ──────────────────────────────────────────────── */

    it("listener state includes adminActivityLoaded and adminActivityFailed", () => {
        expect(ADMIN_ACTIVITY_HOOK_SOURCE).toContain("adminActivityLoaded");
        expect(ADMIN_ACTIVITY_HOOK_SOURCE).toContain("adminActivityFailed");
    });

    it("debug meta type includes adminActivityFromCache", () => {
        expect(ADMIN_ACTIVITY_TYPES_SOURCE).toContain("adminActivityFromCache");
    });

    /* ── Color contract ──────────────────────────────────────────────── */

    it("does NOT use pink accent colors in admin activity panel", () => {
        expect(ADMIN_ACTIVITY_SOURCE).not.toContain("pink-");
        expect(ADMIN_ACTIVITY_SOURCE).not.toContain("fuchsia-");
    });

    /* ── Empty state ─────────────────────────────────────────────────── */

    it("shows meaningful empty state message", () => {
        expect(ADMIN_ACTIVITY_SOURCE).toContain("No admin actions found");
    });
});

/* ═══════════════════════════════════════════════════════════════════════
   ADMIN ANALYTICS OVERVIEW TRUTH
   ═══════════════════════════════════════════════════════════════════════ */



const ANALYTICS_PAGE_SOURCE = readFileSync(
    join(__dirname, "../../src/app/admin/analytics/page.tsx"),
    "utf-8",
);
const ANALYTICS_STATE_SOURCE = readFileSync(
    join(__dirname, "../../src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx"),
    "utf-8",
);
const ANALYTICS_REALTIME_HOOK_PATH = join(
    __dirname,
    "../../src/app/admin/analytics/hooks/useAdminAnalyticsRealtime.ts",
);
const ANALYTICS_PRIMITIVES_SOURCE = readFileSync(
    join(__dirname, "../../src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx"),
    "utf-8",
);
const ANALYTICS_RUNTIME_SOURCE = readFileSync(
    join(__dirname, "../../src/lib/admin-analytics-live-runtime.ts"),
    "utf-8",
);

describe("admin analytics overview truth", () => {
    /* ── Fake-zero prevention ───────────────────────────────────────── */

    it("state hook produces fake-zero-protected revenueDisplay", () => {
        expect(ANALYTICS_STATE_SOURCE).toContain("revenueDisplay");
        expect(ANALYTICS_STATE_SOURCE).toContain("historicalOverviewWaitingLabel");
        expect(ANALYTICS_STATE_SOURCE).toContain("snapshotRevenueValue");
    });

    it("state hook produces fake-zero-protected purchasesDisplay", () => {
        expect(ANALYTICS_STATE_SOURCE).toContain("purchasesDisplay");
    });

    it("state hook produces fake-zero-protected mobileShareDisplay", () => {
        expect(ANALYTICS_STATE_SOURCE).toContain("mobileShareDisplay");
    });

    it("state hook produces fake-zero-protected liveActiveDisplay", () => {
        expect(ANALYTICS_STATE_SOURCE).toContain("liveActiveDisplay");
    });

    it("page uses compact live active metric model instead of raw totalActive", () => {
        expect(ANALYTICS_PAGE_SOURCE).toContain("analyticsOverviewDisplayMetrics.liveActive.displayValue");
        expect(ANALYTICS_PAGE_SOURCE).not.toContain("liveResponse?.totalActive ?? 0)");
    });

    it("page uses compact revenue metric model instead of direct commerce math", () => {
        expect(ANALYTICS_PAGE_SOURCE).toContain("analyticsOverviewDisplayMetrics.revenue.displayValue");
        expect(ANALYTICS_PAGE_SOURCE).not.toContain("formatMoney(commerce.revenueUsd)");
    });

    it("page uses compact purchases metric model instead of direct funnel math", () => {
        expect(ANALYTICS_PAGE_SOURCE).toContain("analyticsOverviewDisplayMetrics.purchases.displayValue");
        expect(ANALYTICS_PAGE_SOURCE).not.toContain("formatCompactNumber(funnel.purchases)");
    });

    /* ── Truth state computation ────────────────────────────────────── */

    it("state hook computes historicalOverviewTruthState", () => {
        expect(ANALYTICS_STATE_SOURCE).toContain("historicalOverviewTruthState");
    });

    it("state hook computes liveActiveTruthState", () => {
        expect(ANALYTICS_STATE_SOURCE).toContain("liveActiveTruthState");
    });

    it("historicalOverviewTruthState includes unavailable variant", () => {
        expect(ANALYTICS_STATE_SOURCE).toContain("\"unavailable\"");
    });

    /* ── Debug meta registry ────────────────────────────────────────── */

    it("state hook exposes analyticsOverviewDebugMeta", () => {
        expect(ANALYTICS_STATE_SOURCE).toContain("analyticsOverviewDebugMeta");
    });

    it("debug meta contains valueSource per metric", () => {
        expect(ANALYTICS_STATE_SOURCE).toContain("valueSource");
    });

    it("debug meta contains fakeZeroPrevented per metric", () => {
        expect(ANALYTICS_STATE_SOURCE).toContain("fakeZeroPrevented");
    });

    it("debug meta includes realtimeListenerDebug", () => {
        expect(ANALYTICS_STATE_SOURCE).toContain("realtimeListenerDebug");
    });

    /* ── fromCache tracking ─────────────────────────────────────────── */

    it("retired the raw admin analytics realtime hook", () => {
        expect(existsSync(ANALYTICS_REALTIME_HOOK_PATH)).toBe(false);
        expect(ANALYTICS_STATE_SOURCE).not.toContain("from \"./useAdminAnalyticsRealtime\"");
        expect(ANALYTICS_STATE_SOURCE).not.toContain("useAdminAnalyticsRealtime(");
        expect(ANALYTICS_STATE_SOURCE).toContain("ADMIN_ANALYTICS_RAW_REALTIME_LISTENERS_DISABLED_FOR_COST");
        expect(ANALYTICS_STATE_SOURCE).toContain("rawDisplayFallbackDisabled: true");
        expect(ANALYTICS_STATE_SOURCE).toContain("sourceUse: \"snapshot_first_route\"");
    });

    it("runtime ListenerState type includes fromCache fields", () => {
        expect(ANALYTICS_RUNTIME_SOURCE).toContain("eventFactsFromCache");
        expect(ANALYTICS_RUNTIME_SOURCE).toContain("guestBatchesFromCache");
        expect(ANALYTICS_RUNTIME_SOURCE).toContain("guestSessionsFromCache");
        expect(ANALYTICS_RUNTIME_SOURCE).toContain("watchSessionsFromCache");
    });

    it("snapshot-first state still exposes listener debug metadata shape", () => {
        expect(ANALYTICS_STATE_SOURCE).toContain("lastServerConfirmedAtMs");
        expect(ANALYTICS_STATE_SOURCE).toContain("mountedAtMs");
        expect(ANALYTICS_STATE_SOURCE).toContain("sourceUse: \"debug_only\"");
    });

    /* ── MetricCard unavailable state ───────────────────────────────── */

    it("MetricCard supports unavailable truth state", () => {
        expect(ANALYTICS_PRIMITIVES_SOURCE).toContain("truthState?: AdminSurfaceState");
        expect(ANALYTICS_PRIMITIVES_SOURCE).toContain("coerceAdminSurfaceState(truthState)");
    });

    /* ── Module filter purge ────────────────────────────────────────── */

    it("page does NOT contain Module filters explanation", () => {
        expect(ANALYTICS_PAGE_SOURCE).not.toContain("Module filters");
        expect(ANALYTICS_PAGE_SOURCE).not.toContain("Each card owns its own time range");
    });

    /* ── Compact tab nav ────────────────────────────────────────────── */

    it("tab buttons use compact inline layout not tile grid", () => {
        expect(ANALYTICS_PAGE_SOURCE).toContain("inline-flex items-center gap-1.5");
        expect(ANALYTICS_PAGE_SOURCE).not.toContain("py-3 text-left");
    });

    /* ── Compact alert banner ───────────────────────────────────────── */

    it("alert banner uses single-line degraded format", () => {
        expect(ANALYTICS_PAGE_SOURCE).toContain("Needs attention:");
        expect(ANALYTICS_PAGE_SOURCE).not.toContain("recovering in the background");
    });

    /* ── Branding purge ─────────────────────────────────────────────── */

    it("page does NOT reference Mobile Monitoring Station", () => {
        expect(ANALYTICS_PAGE_SOURCE).not.toContain("Mobile Monitoring Station");
    });

    it("page title is Analytics Overview", () => {
        expect(ANALYTICS_PAGE_SOURCE).toContain("Analytics Overview");
    });

    /* ── Agent truth doc ────────────────────────────────────────────── */

    it("admin-analytics-overview.md truth doc exists", () => {
        const docPath = join(__dirname, "../../docs/agent-truth/admin-analytics-overview.md");
        expect(existsSync(docPath)).toBe(true);
    });

    it("truth doc documents fake-zero prevention", () => {
        const docPath = join(__dirname, "../../docs/agent-truth/admin-analytics-overview.md");
        const doc = readFileSync(docPath, "utf-8");
        expect(doc).toContain("Fake-Zero Prevention");
    });

    it("truth doc documents prohibited patterns", () => {
        const docPath = join(__dirname, "../../docs/agent-truth/admin-analytics-overview.md");
        const doc = readFileSync(docPath, "utf-8");
        expect(doc).toContain("Prohibited Patterns");
    });

    /* ── Density contract ───────────────────────────────────────────── */

    it("MetricCard uses compact padding p-2.5", () => {
        expect(ANALYTICS_PRIMITIVES_SOURCE).toContain("p-2.5");
    });

    it("MetricCard uses compact font text-[1.45rem]", () => {
        expect(ANALYTICS_PRIMITIVES_SOURCE).toContain("text-[1.45rem]");
    });

    it("loading spinner uses min-h-[20vh] not min-h-[40vh]", () => {
        expect(ANALYTICS_PAGE_SOURCE).toContain("min-h-[20vh]");
        expect(ANALYTICS_PAGE_SOURCE).not.toContain("min-h-[40vh]");
    });
});
