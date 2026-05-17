// @vitest-environment happy-dom

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  authFetch: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    userProfile: {
      uid: "creator_1",
      role: "creator",
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

import { CreatorBroadcastManager } from "@/components/Creators/CreatorBroadcastManager";

describe("CreatorBroadcastManager", () => {
  beforeEach(() => {
    mockState.authFetch.mockReset();
    mockState.trackEvent.mockReset();
  });

  it("shows an empty state when there are no broadcasts yet", async () => {
    mockState.authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, broadcasts: [] }),
    });

    render(<CreatorBroadcastManager creatorId="creator_1" creatorName="Jessica" />);

    await waitFor(() => {
      expect(screen.getByText("No broadcasts yet")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Create broadcast" })).toBeTruthy();
    });
  });

  it("disables refresh while broadcasts are loading", async () => {
    let resolveResponse: (value: unknown) => void = () => undefined;
    mockState.authFetch.mockReturnValue(new Promise((resolve) => {
      resolveResponse = resolve;
    }));

    render(<CreatorBroadcastManager creatorId="creator_1" creatorName="Jessica" />);

    expect(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();

    resolveResponse({
      ok: true,
      json: async () => ({ success: true, broadcasts: [] }),
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Refresh" })).not.toBeDisabled();
    });
  });

  it("renders sent, draft, and failed statuses from real broadcast data", async () => {
    mockState.authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        broadcasts: [
          {
            id: "b3",
            title: "Failed update",
            message: "Delivery failed",
            status: "failed",
            createdAtMs: 3000,
            failureReason: "notification delivery error",
          },
          {
            id: "b2",
            title: "Draft update",
            message: "Still drafting",
            status: "draft",
            createdAtMs: 2000,
          },
          {
            id: "b1",
            title: "Live update",
            message: "Sent to fans",
            status: "sent",
            createdAtMs: 1000,
            sentAtMs: 1000,
            deliveryCount: 12,
            openCount: 5,
          },
        ],
      }),
    });

    render(<CreatorBroadcastManager creatorId="creator_1" creatorName="Jessica" />);

    await waitFor(() => {
      expect(screen.getByText("failed")).toBeTruthy();
      expect(screen.getByText("draft")).toBeTruthy();
      expect(screen.getByText("sent")).toBeTruthy();
      expect(screen.getAllByText("View details").length).toBeGreaterThan(0);
    });

    const liveUpdateButton = Array.from(screen.getAllByRole("button")).find((button) =>
      button.textContent?.includes("Live update"),
    );
    expect(liveUpdateButton).toBeTruthy();
    fireEvent.click(liveUpdateButton!);
    expect(screen.getByText("Delivered 12")).toBeTruthy();
    expect(screen.getByText("Opened 5")).toBeTruthy();
  });
});
