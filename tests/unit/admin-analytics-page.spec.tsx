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
  MetricCard: ({ label, value }: { label: string; value: string | number }) => (
    <div>
      {label}:{String(value)}
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
});
