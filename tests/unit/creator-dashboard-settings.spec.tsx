// @vitest-environment happy-dom

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  authFetch: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "creator_1", displayName: "Jessica" },
  }),
  useUserProfile: () => ({
    userProfile: {
      uid: "creator_1",
      role: "creator",
      username: "jessica",
      displayName: "Jessica",
    },
  }),
}));

vi.mock("@/context/AdminViewAsContext", () => ({
  useAdminViewAs: () => ({ viewAsState: null }),
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

describe("CreatorDashboardSettingsHub", () => {
  beforeEach(() => {
    mockState.authFetch.mockReset();
    mockState.trackEvent.mockReset();
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
});
