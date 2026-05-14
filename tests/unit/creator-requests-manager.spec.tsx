// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  authFetch: vi.fn(),
}));

vi.mock("@/lib/authFetch", () => ({
  authFetch: (...args: unknown[]) => mockState.authFetch(...args),
}));

import { CreatorRequestsManager } from "@/components/Creators/CreatorRequestsManager";

function okResponse(body: Record<string, unknown>) {
  return {
    ok: true,
    json: async () => body,
  };
}

function pendingRequest() {
  return {
    id: "request_1",
    categoryId: "photo",
    categoryLabel: "Photo",
    details: "A launch-safe creator request.",
    priceGd: 300,
    status: "pending",
    createdAt: 1000,
  };
}

describe("CreatorRequestsManager", () => {
  beforeEach(() => {
    mockState.authFetch.mockReset();
    mockState.authFetch.mockResolvedValue(okResponse({ success: true, requests: [] }));
  });

  it("loads creator requests only when creator id and enabled state allow it", async () => {
    const { rerender } = render(
      <CreatorRequestsManager
        creatorId=""
        creatorName="Jessica"
        enabled
        restricted={false}
        readOnly={false}
        sourceState="live"
      />,
    );

    expect(mockState.authFetch).not.toHaveBeenCalled();

    rerender(
      <CreatorRequestsManager
        creatorId="creator_1"
        creatorName="Jessica"
        enabled
        restricted={false}
        readOnly={false}
        sourceState="live"
      />,
    );

    await waitFor(() => {
      expect(mockState.authFetch).toHaveBeenCalledWith("/api/creator/requests");
    });
  });

  it("does not load when custom requests are disabled or restricted", async () => {
    const { rerender } = render(
      <CreatorRequestsManager
        creatorId="creator_1"
        creatorName="Jessica"
        enabled={false}
        restricted={false}
        readOnly={false}
        sourceState="needs_setup"
      />,
    );

    expect(mockState.authFetch).not.toHaveBeenCalled();

    rerender(
      <CreatorRequestsManager
        creatorId="creator_1"
        creatorName="Jessica"
        enabled
        restricted
        readOnly={false}
        sourceState="blocked"
      />,
    );

    expect(mockState.authFetch).not.toHaveBeenCalled();
    expect(screen.getAllByText("Custom requests are restricted for this creator.")).toHaveLength(2);
  });

  it("shows an honest empty state for connected request management", async () => {
    render(
      <CreatorRequestsManager
        creatorId="creator_1"
        creatorName="Jessica"
        enabled
        restricted={false}
        readOnly={false}
        sourceState="live"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("No open requests.")).toBeTruthy();
    });
  });

  it("disables mutation buttons in read-only projection", async () => {
    mockState.authFetch.mockResolvedValue(okResponse({ success: true, requests: [pendingRequest()] }));

    render(
      <CreatorRequestsManager
        creatorId="creator_1"
        creatorName="Jessica"
        enabled
        restricted={false}
        readOnly
        sourceState="live"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Accept")).toBeTruthy();
    });
    expect(screen.getByText("Read-only projection: request actions are disabled.")).toBeTruthy();
    expect(screen.getByText("Accept")).toBeDisabled();
    expect(screen.getByText("Decline")).toBeDisabled();
  });

  it("prevents duplicate request action submits while a mutation is pending", async () => {
    let resolvePut: (value: unknown) => void = () => undefined;
    mockState.authFetch
      .mockResolvedValueOnce(okResponse({ success: true, requests: [pendingRequest()] }))
      .mockReturnValueOnce(new Promise((resolve) => {
        resolvePut = resolve;
      }));

    render(
      <CreatorRequestsManager
        creatorId="creator_1"
        creatorName="Jessica"
        enabled
        restricted={false}
        readOnly={false}
        sourceState="live"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Accept")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Accept"));
    fireEvent.click(screen.getByText("Accept"));

    expect(mockState.authFetch).toHaveBeenCalledTimes(2);
    expect(mockState.authFetch.mock.calls[1][0]).toBe("/api/creator/requests");
    expect(mockState.authFetch.mock.calls[1][1]).toMatchObject({
      method: "PUT",
      body: JSON.stringify({ requestId: "request_1", action: "accept" }),
    });

    resolvePut(okResponse({ success: true, status: "accepted" }));

    await waitFor(() => {
      expect(screen.getByText("accepted")).toBeTruthy();
    });
  });
});
