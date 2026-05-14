// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  authFetch: vi.fn(),
  trackEvent: vi.fn(),
  userProfile: {
    uid: "creator_1",
    role: "creator",
    username: "jessica",
    displayName: "Jessica",
  },
  viewAsState: null as null | { adminViewingAsUserId: string; adminViewingAsDisplayName?: string },
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "creator_1", displayName: "Jessica" },
  }),
  useUserProfile: () => ({
    userProfile: mockState.userProfile,
  }),
}));

vi.mock("@/context/AdminViewAsContext", () => ({
  useAdminViewAs: () => ({ viewAsState: mockState.viewAsState }),
}));

vi.mock("@/lib/authFetch", () => ({
  authFetch: (...args: unknown[]) => mockState.authFetch(...args),
}));

vi.mock("@/lib/telemetry", () => ({
  trackEvent: mockState.trackEvent,
}));

vi.mock("@/components/Analytics/PageViewEvent", () => ({
  PageViewEvent: () => null,
}));

vi.mock("@/components/Creators/CreatorBroadcastManager", () => ({
  CreatorBroadcastManager: () => <div data-testid="broadcast-manager" />,
}));

import { CreatorDashboardSettingsHub } from "@/components/Creators/CreatorDashboardSettingsHub";

function source(value: number, state = value > 0 ? "verified_sample" : "queried_zero", sampleKnown = true) {
  return {
    state,
    value,
    sampleKnown,
    collection: "test_collection",
  };
}

function buildStatsEvidence(overrides: Record<string, unknown> = {}) {
  return {
    generatedAtUtc: "2026-05-14T00:00:00.000Z",
    sourceTruth: "canonical",
    sourceFreshness: "fresh",
    sampleCount: 8,
    zeroValuesAreProven: true,
    readOnlyProjection: false,
    sources: {
      ledgerAccruals: source(1234),
      pendingPayouts: source(250),
      subscriptions: source(3),
      customRequests: source(2),
      callBookings: source(1),
      relationshipsOps: source(17),
      drops: source(4),
      userProfile: source(88),
    },
    issues: [],
    ...overrides,
  };
}

function section(container: HTMLElement, key: string) {
  const element = container.querySelector(`[data-creator-section-key="${key}"]`);
  expect(element).toBeTruthy();
  return element as HTMLElement;
}

describe("CreatorDashboardSettingsHub", () => {
  beforeEach(() => {
    mockState.authFetch.mockReset();
    mockState.trackEvent.mockReset();
    mockState.viewAsState = null;
    mockState.userProfile = {
      uid: "creator_1",
      role: "creator",
      username: "jessica",
      displayName: "Jessica",
    };
    mockState.authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        creatorSettings: {
          broadcastsEnabled: true,
          subscriptionsEnabled: true,
          messagingEnabled: true,
          customRequestsEnabled: true,
          bookingsEnabled: true,
          availabilityWindows: [{ day: "mon" }],
          subscriptionPriceGd: 500,
        },
        creatorRestrictions: {},
        stats: {
          earningsGd: 1234,
          pendingCashoutGd: 250,
          followerCount: 17,
          profileViewsCount: 88,
          liveDropsCount: 4,
          activeSubscribers: 3,
          openRequests: 2,
          bookedCalls: 1,
        },
        statsEvidence: buildStatsEvidence(),
      }),
    });
  });

  it("renders the creator settings sections and embeds the broadcast manager", async () => {
    render(<CreatorDashboardSettingsHub />);

    await waitFor(() => {
      expect(screen.getByText("Public Profile")).toBeTruthy();
      expect(screen.getByText("Broadcasts")).toBeTruthy();
      expect(screen.getByText("Fan Pass")).toBeTruthy();
      expect(screen.getByText("Messages")).toBeTruthy();
      expect(screen.getByText("Requests")).toBeTruthy();
      expect(screen.getByText("Live time / bookings")).toBeTruthy();
      expect(screen.getByText("Availability")).toBeTruthy();
      expect(screen.getByText("Earnings / payout")).toBeTruthy();
      expect(screen.getByText("Notifications / audience")).toBeTruthy();
      expect(screen.getByTestId("broadcast-manager")).toBeTruthy();
    });
  });

  it("does not mark Fan Pass live when restricted or price is not configured", async () => {
    mockState.authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        creatorSettings: {
          broadcastsEnabled: true,
          subscriptionsEnabled: true,
          messagingEnabled: true,
          customRequestsEnabled: true,
          bookingsEnabled: true,
          availabilityWindows: [{ day: "mon" }],
          subscriptionPriceGd: 0,
        },
        creatorRestrictions: { subscriptionsRestricted: true },
        stats: {
          earningsGd: 0,
          pendingCashoutGd: 0,
          followerCount: 0,
          profileViewsCount: 0,
          liveDropsCount: 0,
          activeSubscribers: 0,
          openRequests: 0,
          bookedCalls: 0,
        },
        statsEvidence: buildStatsEvidence(),
      }),
    });
    const { container } = render(<CreatorDashboardSettingsHub />);

    await waitFor(() => {
      expect(section(container, "fan_pass").dataset.creatorSectionState).toBe("blocked");
    });
  });

  it("keeps bookings and earnings out of live state when source evidence is missing", async () => {
    mockState.authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        creatorSettings: {
          broadcastsEnabled: true,
          subscriptionsEnabled: true,
          messagingEnabled: true,
          customRequestsEnabled: true,
          bookingsEnabled: true,
          availabilityWindows: [{ day: "mon" }],
          subscriptionPriceGd: 500,
        },
        creatorRestrictions: {},
        stats: {
          earningsGd: 0,
          pendingCashoutGd: 0,
          followerCount: 0,
          profileViewsCount: 0,
          liveDropsCount: 0,
          activeSubscribers: 0,
          openRequests: 0,
          bookedCalls: 0,
        },
        statsEvidence: buildStatsEvidence({
          sourceTruth: "partial",
          sources: {
            ledgerAccruals: source(0, "partial", false),
            pendingPayouts: source(0, "partial", false),
            subscriptions: source(0),
            customRequests: source(0),
            callBookings: source(0),
            relationshipsOps: source(0),
            drops: source(0),
            userProfile: source(0),
          },
        }),
      }),
    });
    const { container } = render(<CreatorDashboardSettingsHub />);

    await waitFor(() => {
      expect(section(container, "bookings").dataset.creatorSectionState).toBe("live");
      expect(section(container, "earnings").dataset.creatorSectionState).toBe("needs_review");
      expect(screen.getByText("Earnings need source review.")).toBeTruthy();
    });
  });

  it("does not render self-loop creator dashboard links for inline sections", async () => {
    const { container } = render(<CreatorDashboardSettingsHub />);

    await waitFor(() => {
      expect(screen.getByText("Requests")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Requests"));
    fireEvent.click(screen.getByText("Live time / bookings"));
    const creatorSelfLinks = Array.from(container.querySelectorAll("a"))
      .filter((anchor) => anchor.getAttribute("href") === "/dashboard/creator");
    expect(creatorSelfLinks).toHaveLength(0);
  });

  it("only links messages to chat when messaging is enabled and unrestricted", async () => {
    mockState.authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        creatorSettings: {
          messagingEnabled: true,
          broadcastsEnabled: true,
          subscriptionsEnabled: true,
          customRequestsEnabled: true,
          bookingsEnabled: true,
          availabilityWindows: [{ day: "mon" }],
          subscriptionPriceGd: 500,
        },
        creatorRestrictions: { messagingRestricted: true },
        stats: {
          earningsGd: 1234,
          pendingCashoutGd: 250,
          followerCount: 17,
          profileViewsCount: 88,
          liveDropsCount: 4,
          activeSubscribers: 3,
          openRequests: 2,
          bookedCalls: 1,
        },
        statsEvidence: buildStatsEvidence(),
      }),
    });
    const { container } = render(<CreatorDashboardSettingsHub />);

    await waitFor(() => {
      expect(section(container, "messages").dataset.creatorSectionState).toBe("blocked");
    });

    fireEvent.click(screen.getByText("Messages"));
    expect(container.querySelector('a[href="/dashboard/chat"]')).toBeNull();
  });
});
