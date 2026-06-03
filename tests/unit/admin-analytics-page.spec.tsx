// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  const icon = () => null;

  return {
    analyticsState: {
      range: "30d",
      activeViewerFilter: "",
      viewerUserFilter: "",
      showHistoricalEmptyState: false,
      blockingAnalyticsError: null,
      mobileShare: 0.5,
      mobileUsers: 25,
      commerce: { revenueUsd: 125 },
      funnel: { purchases: 3, checkoutStarts: 6 },
      analyticsOverviewCards: {
        mobileShare: {
          displayValue: "50%",
          hint: "25 mobile users",
          truthState: "live",
          statusBadgeLabel: "LIVE",
        },
        revenue: {
          displayValue: "$125",
          hint: "server transactions",
          truthState: "live",
          statusBadgeLabel: "LIVE",
        },
        purchases: {
          displayValue: "3",
          hint: "server transactions",
          truthState: "live",
          statusBadgeLabel: "LIVE",
        },
      },
      analyticsOverviewDisplayMetrics: {
        liveActive: {
          id: "liveActive",
          label: "Live Active",
          displayValue: "12",
          primaryValue: 12,
          displayState: "ready",
          exactness: "exact",
          compactFreshnessLine: "Updated 1m ago",
          debugReason: "live response loaded",
          debugSource: "realtime_snapshot",
          badgeLabel: "LIVE",
          showBadgeInPrimary: false,
        },
        mobileShare: {
          id: "mobileShare",
          label: "Mobile Share",
          displayValue: "50%",
          primaryValue: 0.5,
          displayState: "ready",
          exactness: "derived",
          compactFreshnessLine: "Updated 1m ago",
          debugReason: "device sample loaded",
          debugSource: "device_sample",
          badgeLabel: "LIVE",
          showBadgeInPrimary: false,
        },
        revenue: {
          id: "revenue",
          label: "Revenue",
          displayValue: "$125",
          primaryValue: 125,
          displayState: "partial",
          exactness: "derived",
          compactFreshnessLine: "From confirmed transactions - updated 30d",
          debugReason: "server transaction fallback",
          debugSource: "server_transaction_fallback",
          badgeLabel: "PARTIAL",
          showBadgeInPrimary: false,
        },
        purchases: {
          id: "purchases",
          label: "Purchases",
          displayValue: "3",
          primaryValue: 3,
          displayState: "partial",
          exactness: "derived",
          compactFreshnessLine: "Confirmed purchases - fallback",
          debugReason: "server transaction fallback",
          debugSource: "server_transaction_fallback",
          badgeLabel: "PARTIAL",
          showBadgeInPrimary: false,
        },
      },
      analyticsWarmState: "Polling enabled",
      liveSnapshotLabel: "[live]",
      historicalSnapshotLabel: "[historical]",
      isBackgroundSyncing: false,
      analyticsSectionHealthSummary: {
        healthy: 3,
        warn: 0,
        fail: 0,
        total: 3,
      },
      needsSetup: false,
      activeTab: "operations",
      setActiveTab: vi.fn(),
      liveLoading: false,
      historicalLoading: false,
      isPrimingAnalytics: false,
      liveResponse: { totalActive: 12, liveTruthLabel: "live" },
      backgroundAnalyticsIssues: [],
      visibleDegradedCopy: [],
      analyticsOverviewDebugMeta: { metrics: [] },
      analyticsSnapshotMigrationDebug: {
        snapshotFirstMigrationEnabled: true,
        verifiedSnapshotFirstRenderPath: true,
        manualRefreshEnabled: true,
        modules: [],
      },
      analyticsSectionHealth: [],
      clearAllFilters: vi.fn(),
      clearViewerFilter: vi.fn(),
      renderSectionRangeControl: vi.fn(() => null),
      dailyTaskPipelineModel: { items: [], hasData: false },
      activeNotificationFunnelPieData: [],
      notificationActionItems: [],
      maxNotificationActionValue: 0,
      hasNotificationReminderReasons: false,
      notificationReminderReasons: [],
      formatDuration: (value: unknown) => String(value),
      formatPercent: (value: unknown) => String(value),
    } as Record<string, unknown>,
    reportClientIssue: vi.fn(),
    tabOptions: [
      { id: "operations", label: "Operations", icon },
      { id: "audience", label: "Audience", icon },
      { id: "commerce", label: "Commerce", icon },
    ],
  };
});

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | false | null | undefined>) =>
    values.filter(Boolean).join(" "),
}));

vi.mock("@/components/Admin/AdminPageHeader", () => ({
  AdminPageHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/components/Admin/Analytics/AdminAnalyticsPrimitives", () => ({
  AnalyticsViewModeToggle: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: "chart" | "table" | "cards") => void;
  }) => (
    <button type="button" data-view-mode={value} onClick={() => onChange("table")}>
      View mode
    </button>
  ),
  MetricCard: ({
    label,
    value,
    hint,
    badgePlacement,
  }: {
    label: string;
    value: string | number;
    hint?: string;
    badgePlacement?: string;
  }) => (
    <div data-badge-placement={badgePlacement}>
      {label}:{String(value)}
      {hint ? <span>{hint}</span> : null}
    </div>
  ),
}));

vi.mock("@/components/Analytics/PageViewEvent", () => ({
  PageViewEvent: () => null,
}));

vi.mock("@/lib/client-error-reporting", () => ({
  reportClientIssue: (...args: unknown[]) => mockState.reportClientIssue(...args),
}));

vi.mock("@/lib/telemetry-catalog", () => ({
  TELEMETRY_EVENT_LABELS: {},
}));

vi.mock("@/app/admin/analytics/AnalyticsHelpers", () => ({
  RANGE_OPTIONS: [
    { value: "24h", label: "24H" },
    { value: "7d", label: "7D" },
    { value: "30d", label: "30D" },
    { value: "all", label: "All" },
  ],
  TAB_OPTIONS: mockState.tabOptions,
  formatCompactNumber: (value: unknown) => String(value),
  formatMoney: (value: unknown) => `$${String(value)}`,
  formatPercent: (value: unknown) => String(value),
}));

vi.mock("@/app/admin/analytics/hooks/useAdminAnalyticsState", () => ({
  useAdminAnalyticsState: () => mockState.analyticsState,
}));

import AdminAnalyticsPage from "@/app/admin/analytics/page";

describe("AdminAnalyticsPage", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockState.analyticsState = {
      ...mockState.analyticsState,
      clearAllFilters: vi.fn(),
      clearViewerFilter: vi.fn(),
      viewerUserFilter: "",
      showHistoricalEmptyState: false,
      blockingAnalyticsError: null,
      backgroundAnalyticsIssues: [],
      visibleDegradedCopy: [],
      analyticsOverviewDebugMeta: { metrics: [] },
    };
    mockState.reportClientIssue.mockReset();
    delete (window as typeof window & {
      __KANDYDROPS_ADMIN_ANALYTICS_OVERVIEW_DEBUG__?: unknown;
      __KANDYDROPS_ADMIN_ANALYTICS_SNAPSHOT_MIGRATION_DEBUG__?: unknown;
    }).__KANDYDROPS_ADMIN_ANALYTICS_OVERVIEW_DEBUG__;
    delete (window as typeof window & {
      __KANDYDROPS_ADMIN_ANALYTICS_SNAPSHOT_MIGRATION_DEBUG__?: unknown;
    }).__KANDYDROPS_ADMIN_ANALYTICS_SNAPSHOT_MIGRATION_DEBUG__;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("calls the clear-all handler from admin analytics state", async () => {
    const clearAllFilters = vi.fn();
    mockState.analyticsState = {
      ...mockState.analyticsState,
      clearAllFilters,
      viewerUserFilter: "test_user",
    };

    await act(async () => {
      root.render(<AdminAnalyticsPage />);
    });

    const button = Array.from(container.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Clear filter"),
    );

    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(clearAllFilters).toHaveBeenCalledTimes(1);
    expect(mockState.reportClientIssue).not.toHaveBeenCalled();
  });

  it("reports a runtime diagnostic when the clear-all handler is missing", async () => {
    mockState.analyticsState = {
      ...mockState.analyticsState,
      clearAllFilters: undefined,
      clearViewerFilter: undefined,
      viewerUserFilter: "test_user",
    };

    await act(async () => {
      root.render(<AdminAnalyticsPage />);
    });

    const button = Array.from(container.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Clear filter"),
    );

    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mockState.reportClientIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "runtime",
        message: "Admin analytics missing clear-all filter handler",
      }),
    );
  });

  it("publishes snapshot migration debug metadata for Admin Debug parity", async () => {
    await act(async () => {
      root.render(<AdminAnalyticsPage />);
    });

    expect(
      (window as typeof window & {
        __KANDYDROPS_ADMIN_ANALYTICS_SNAPSHOT_MIGRATION_DEBUG__?: {
          snapshotFirstMigrationEnabled?: boolean;
          manualRefreshEnabled?: boolean;
        };
      }).__KANDYDROPS_ADMIN_ANALYTICS_SNAPSHOT_MIGRATION_DEBUG__,
    ).toEqual(
      expect.objectContaining({
        snapshotFirstMigrationEnabled: true,
        manualRefreshEnabled: true,
      }),
    );
  });

  it("keeps raw platform_pulse snapshot keys out of the primary overview", async () => {
    mockState.analyticsState = {
      ...mockState.analyticsState,
      blockingAnalyticsError: {
        message:
          "No verified admin metric snapshot display payload is available for platform_pulse:30d.",
      },
      analyticsOverviewDebugMeta: {
        metrics: {
          liveActive: {
            cacheKey: "platform_pulse:30d",
          },
        },
      },
    };

    await act(async () => {
      root.render(<AdminAnalyticsPage />);
    });

    expect(container.textContent).toContain(
      "Overview snapshot unavailable. Showing available confirmed metrics.",
    );
    expect(container.textContent).not.toContain("platform_pulse:30d");
    expect(container.textContent).not.toContain(
      "No verified admin metric snapshot display payload",
    );
    expect(
      (window as typeof window & {
        __KANDYDROPS_ADMIN_ANALYTICS_OVERVIEW_DEBUG__?: {
          metrics?: {
            liveActive?: {
              cacheKey?: string;
            };
          };
        };
      }).__KANDYDROPS_ADMIN_ANALYTICS_OVERVIEW_DEBUG__?.metrics?.liveActive?.cacheKey,
    ).toBe("platform_pulse:30d");
  });

  it("renders compact overview metrics without giant waiting values or header badges", async () => {
    mockState.analyticsState = {
      ...mockState.analyticsState,
      analyticsOverviewDisplayMetrics: {
        ...(mockState.analyticsState as {
          analyticsOverviewDisplayMetrics: Record<string, unknown>;
        }).analyticsOverviewDisplayMetrics,
        revenue: {
          id: "revenue",
          label: "Revenue",
          displayValue: "Unavailable",
          primaryValue: null,
          displayState: "unavailable",
          exactness: "unavailable",
          compactFreshnessLine: "No verified snapshot yet.",
          debugReason: "missing revenue snapshot",
          debugSource: "commerce_snapshot",
          badgeLabel: "UNAVAILABLE",
          showBadgeInPrimary: false,
        },
        purchases: {
          id: "purchases",
          label: "Purchases",
          displayValue: "No snapshot yet",
          primaryValue: null,
          displayState: "loading",
          exactness: "unavailable",
          compactFreshnessLine: "No verified snapshot yet.",
          debugReason: "missing purchase snapshot",
          debugSource: "commerce_snapshot",
          badgeLabel: "WAIT",
          showBadgeInPrimary: false,
        },
      },
    };

    await act(async () => {
      root.render(<AdminAnalyticsPage />);
    });

    expect(container.textContent).toContain("Revenue:Unavailable");
    expect(container.textContent).toContain("Purchases:No snapshot yet");
    expect(container.textContent).not.toContain("Waiting for first snapshot");
    expect(
      Array.from(container.querySelectorAll("[data-badge-placement]")).every(
        (node) => node.getAttribute("data-badge-placement") === "hidden",
      ),
    ).toBe(true);
  });
});
