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

vi.mock("@/components/Creators/CreatorRequestsManager", () => ({
  CreatorRequestsManager: (props: {
    enabled: boolean;
    restricted: boolean;
    readOnly: boolean;
    sourceState: string;
  }) => (
    <div
      data-testid="requests-manager"
      data-enabled={String(props.enabled)}
      data-restricted={String(props.restricted)}
      data-read-only={String(props.readOnly)}
      data-source-state={props.sourceState}
    />
  ),
}));

vi.mock("@/components/Creators/CreatorBookingsManager", () => ({
  CreatorBookingsManager: (props: {
    enabled: boolean;
    restricted: boolean;
    readOnly: boolean;
    sourceState: string;
    availabilityConfigured: boolean;
  }) => (
    <div
      data-testid="bookings-manager"
      data-enabled={String(props.enabled)}
      data-restricted={String(props.restricted)}
      data-read-only={String(props.readOnly)}
      data-source-state={props.sourceState}
      data-availability-configured={String(props.availabilityConfigured)}
    />
  ),
}));

vi.mock("@/components/Creators/CreatorFanPassManager", () => ({
  CreatorFanPassManager: (props: {
    enabled: boolean;
    restricted: boolean;
    priceGd: number;
    readOnly: boolean;
    sourceState: string;
  }) => (
    <div
      data-testid="fan-pass-manager"
      data-enabled={String(props.enabled)}
      data-restricted={String(props.restricted)}
      data-price-gd={String(props.priceGd)}
      data-read-only={String(props.readOnly)}
      data-source-state={props.sourceState}
    />
  ),
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

  it("renders the creator settings sections without mounting every manager on page load", async () => {
    const { container } = render(<CreatorDashboardSettingsHub />);

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
    });
    expect(container.querySelector("[data-creator-active-manager]")?.getAttribute("data-creator-active-manager")).toBe("none");
    expect(screen.getByText("Open a section to load its manager.")).toBeTruthy();
    expect(screen.queryByTestId("requests-manager")).toBeNull();
    expect(screen.queryByTestId("bookings-manager")).toBeNull();
    expect(screen.queryByTestId("fan-pass-manager")).toBeNull();
    expect(screen.queryByTestId("broadcast-manager")).toBeNull();
  });

  it("connects the requests manager when custom requests are enabled", async () => {
    const { container } = render(<CreatorDashboardSettingsHub />);

    await waitFor(() => {
      expect(screen.getByText("Requests")).toBeTruthy();
    });
    fireEvent.click(screen.getByText("Requests"));
    expect(screen.getByTestId("requests-manager").dataset.enabled).toBe("true");
    expect(screen.getByTestId("requests-manager").dataset.restricted).toBe("false");
    expect(screen.getByTestId("requests-manager").dataset.readOnly).toBe("false");
    expect(screen.getByTestId("requests-manager").dataset.sourceState).toBe("live");
    expect(section(container, "requests").textContent).toContain("Manage pending custom requests below.");
    expect(container.querySelector("[data-creator-active-manager]")?.getAttribute("data-creator-active-manager")).toBe("requests");
    expect(screen.queryByTestId("bookings-manager")).toBeNull();
    expect(screen.queryByTestId("fan-pass-manager")).toBeNull();
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
      expect(section(container, "fan_pass").dataset.creatorFanPassManagementState).toBe("blocked");
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
      expect(section(container, "bookings").dataset.creatorBookingsManagementState).toBe("connected");
      expect(section(container, "earnings").dataset.creatorSectionState).toBe("needs_review");
      expect(screen.getByText("Earnings need source review.")).toBeTruthy();
    });
  });

  it("creator earnings summary uses the safe settings source and attribution marker", async () => {
    const { container } = render(<CreatorDashboardSettingsHub />);

    await waitFor(() => {
      expect(section(container, "earnings").dataset.creatorSectionState).toBe("live");
    });

    const earnings = section(container, "earnings");
    expect(earnings.dataset.creatorEarningsSource).toBe("test_collection");
    expect(earnings.dataset.creatorEarningsAttribution).toBe("creator_experience_paid_source");
    expect(earnings.getAttribute("data-creator-earnings-attribution")).toBe("creator_experience_paid_source");
    expect(earnings.textContent).toContain("1,234 GD earned, 250 GD pending.");

    fireEvent.click(screen.getByText("Earnings / payout"));
    expect(screen.getByText(/Earnings are based on paid creator experiences/i)).toBeTruthy();
  });

  it("mounts only the opened booking or Fan Pass manager", async () => {
    const { container } = render(<CreatorDashboardSettingsHub />);

    await waitFor(() => {
      expect(screen.getByText("Live time / bookings")).toBeTruthy();
    });
    fireEvent.click(screen.getByText("Live time / bookings"));
    expect(screen.getByTestId("bookings-manager").dataset.enabled).toBe("true");
    expect(screen.getByTestId("bookings-manager").dataset.availabilityConfigured).toBe("true");
    expect(screen.getByTestId("bookings-manager").dataset.sourceState).toBe("live");
    expect(container.querySelector("[data-creator-active-manager]")?.getAttribute("data-creator-active-manager")).toBe("bookings");
    expect(screen.queryByTestId("requests-manager")).toBeNull();
    expect(screen.queryByTestId("fan-pass-manager")).toBeNull();

    fireEvent.click(screen.getByText("Fan Pass"));
    expect(screen.getByTestId("fan-pass-manager").dataset.enabled).toBe("true");
    expect(screen.getByTestId("fan-pass-manager").dataset.priceGd).toBe("500");
    expect(container.querySelector("[data-creator-active-manager]")?.getAttribute("data-creator-active-manager")).toBe("fan_pass");
    expect(screen.queryByTestId("bookings-manager")).toBeNull();
    expect(section(container, "fan_pass").dataset.creatorFanPassManagementState).toBe("subscriber_visibility");
    expect(section(container, "bookings").dataset.creatorBookingsManagementState).toBe("connected");
  });

  it("mounts the broadcast manager only when Broadcasts is opened", async () => {
    render(<CreatorDashboardSettingsHub />);

    await waitFor(() => {
      expect(screen.getByText("Broadcasts")).toBeTruthy();
      expect(screen.queryByTestId("broadcast-manager")).toBeNull();
    });
    fireEvent.click(screen.getByText("Broadcasts"));
    expect(screen.getByTestId("broadcast-manager")).toBeTruthy();
    expect(screen.queryByTestId("requests-manager")).toBeNull();
  });

  it("does not make manager fetches before a manager is mounted", async () => {
    render(<CreatorDashboardSettingsHub />);

    await waitFor(() => {
      expect(mockState.authFetch).toHaveBeenCalledTimes(1);
      expect(mockState.authFetch).toHaveBeenCalledWith("/api/creator/settings");
    });
    expect(screen.queryByTestId("requests-manager")).toBeNull();
    expect(screen.queryByTestId("bookings-manager")).toBeNull();
    expect(screen.queryByTestId("fan-pass-manager")).toBeNull();
  });

  it("does not fetch creator settings for plain admin accounts outside view-as projection", async () => {
    mockState.userProfile = {
      uid: "admin_1",
      role: "admin",
      username: "admin",
      displayName: "Admin",
    };

    render(<CreatorDashboardSettingsHub />);

    await waitFor(() => {
      expect(screen.getByText("Creator tools are not available on this account.")).toBeTruthy();
    });
    expect(mockState.authFetch).not.toHaveBeenCalled();
  });

  it("passes connected booking and Fan Pass state into opened dashboard managers", async () => {
    const { container } = render(<CreatorDashboardSettingsHub />);

    await waitFor(() => {
      expect(screen.getByText("Live time / bookings")).toBeTruthy();
    });
    fireEvent.click(screen.getByText("Live time / bookings"));
    expect(screen.getByTestId("bookings-manager").dataset.enabled).toBe("true");
    expect(screen.getByTestId("bookings-manager").dataset.availabilityConfigured).toBe("true");
    expect(screen.getByTestId("bookings-manager").dataset.sourceState).toBe("live");
    fireEvent.click(screen.getByText("Fan Pass"));
    expect(screen.getByTestId("fan-pass-manager").dataset.enabled).toBe("true");
    expect(screen.getByTestId("fan-pass-manager").dataset.priceGd).toBe("500");
    expect(section(container, "fan_pass").dataset.creatorFanPassManagementState).toBe("subscriber_visibility");
    expect(section(container, "bookings").dataset.creatorBookingsManagementState).toBe("connected");
  });

  it("keeps only the active manager mounted when switching sections", async () => {
    render(<CreatorDashboardSettingsHub />);

    await waitFor(() => {
      expect(screen.getByText("Live time / bookings")).toBeTruthy();
    });
    fireEvent.click(screen.getByText("Live time / bookings"));
    expect(screen.getByTestId("bookings-manager")).toBeTruthy();
    fireEvent.click(screen.getByText("Requests"));
    expect(screen.getByTestId("requests-manager")).toBeTruthy();
    expect(screen.queryByTestId("bookings-manager")).toBeNull();
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
    expect(container.textContent).not.toContain("Open section");
  });

  it("uses specific route labels and keeps source detail out of primary card copy", async () => {
    const { container } = render(<CreatorDashboardSettingsHub />);

    await waitFor(() => {
      expect(screen.getByText("Public Profile")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Public Profile"));
    expect(screen.getByText("Open profile")).toBeTruthy();
    fireEvent.click(screen.getByText("Messages"));
    expect(screen.getByText("Open chat")).toBeTruthy();
    expect(container.textContent).not.toContain("Dashboard data connected.");
    expect(container.textContent).not.toContain("Dashboard data unavailable.");
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
      expect(section(container, "messages").dataset.creatorChatRouteConnected).toBe("false");
    });

    fireEvent.click(screen.getByText("Messages"));
    expect(container.querySelector('a[href="/dashboard/chat"]')).toBeNull();
  });
});
