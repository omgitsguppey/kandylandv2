// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  authFetch: vi.fn(),
}));

vi.mock("@/lib/authFetch", () => ({
  authFetch: (...args: unknown[]) => mockState.authFetch(...args),
}));

import { CreatorBookingsManager } from "@/components/Creators/CreatorBookingsManager";

function okResponse(body: Record<string, unknown>) {
  return {
    ok: true,
    json: async () => body,
  };
}

function bookedRow(status = "booked") {
  return {
    id: `booking_${status}`,
    serviceType: "video",
    status,
    startAt: Date.UTC(2026, 4, 15, 18, 0, 0),
    durationMinutes: 30,
    priceGd: 900,
  };
}

function renderManager(overrides: Partial<ComponentProps<typeof CreatorBookingsManager>> = {}) {
  return render(
    <CreatorBookingsManager
      creatorId="creator_1"
      creatorName="Jessica"
      enabled
      restricted={false}
      readOnly={false}
      sourceState="live"
      availabilityConfigured
      {...overrides}
    />,
  );
}

describe("CreatorBookingsManager", () => {
  beforeEach(() => {
    mockState.authFetch.mockReset();
    mockState.authFetch.mockResolvedValue(okResponse({ success: true, bookings: [] }));
  });

  it("loads bookings with the target creator id query", async () => {
    renderManager();

    await waitFor(() => {
      expect(mockState.authFetch).toHaveBeenCalledWith("/api/creator/bookings?creatorId=creator_1");
    });
  });

  it("shows configuration-only state when availability is missing", async () => {
    renderManager({ availabilityConfigured: false });

    await waitFor(() => {
      expect(screen.getByTestId("creator-bookings-manager").dataset.creatorBookingsManagementState).toBe("configuration_only");
      expect(screen.getAllByText("Configure availability before accepting bookings.").length).toBeGreaterThan(0);
    });
  });

  it("disables booking actions in read-only projection", async () => {
    mockState.authFetch.mockResolvedValue(okResponse({ success: true, bookings: [bookedRow()] }));
    renderManager({ readOnly: true });

    await waitFor(() => {
      expect(screen.getByText("Complete")).toBeTruthy();
    });
    expect(screen.getByText("Read-only projection: booking actions are disabled.")).toBeTruthy();
    expect(screen.getByText("Complete")).toBeDisabled();
    expect(screen.getByText("Cancel")).toBeDisabled();
  });

  it("prevents duplicate booking action submits while pending", async () => {
    let resolvePut: (value: unknown) => void = () => undefined;
    mockState.authFetch
      .mockResolvedValueOnce(okResponse({ success: true, bookings: [bookedRow()] }))
      .mockReturnValueOnce(new Promise((resolve) => {
        resolvePut = resolve;
      }));

    renderManager();

    await waitFor(() => {
      expect(screen.getByText("Complete")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Complete"));
    fireEvent.click(screen.getByText("Complete"));

    expect(mockState.authFetch).toHaveBeenCalledTimes(2);
    expect(mockState.authFetch.mock.calls[1][0]).toBe("/api/creator/bookings");
    expect(mockState.authFetch.mock.calls[1][1]).toMatchObject({
      method: "PUT",
      body: JSON.stringify({ bookingId: "booking_booked", action: "complete" }),
    });

    resolvePut(okResponse({ success: true, status: "completed" }));

    await waitFor(() => {
      expect(screen.getByText("completed")).toBeTruthy();
    });
  });

  it("does not render action buttons for completed or canceled bookings", async () => {
    mockState.authFetch.mockResolvedValue(okResponse({
      success: true,
      bookings: [bookedRow("completed"), bookedRow("canceled")],
    }));

    renderManager();

    await waitFor(() => {
      expect(screen.getByText("completed")).toBeTruthy();
      expect(screen.getByText("canceled")).toBeTruthy();
    });
    expect(screen.queryByText("Complete")).toBeNull();
    expect(screen.queryByText("Cancel")).toBeNull();
  });
});
