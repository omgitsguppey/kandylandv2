// @vitest-environment happy-dom

import { render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  authFetch: vi.fn(),
}));

vi.mock("@/lib/authFetch", () => ({
  authFetch: (...args: unknown[]) => mockState.authFetch(...args),
}));

import { CreatorFanPassManager } from "@/components/Creators/CreatorFanPassManager";

function okResponse(body: Record<string, unknown>) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}

function problemResponse(status: number, body: Record<string, unknown>) {
  return {
    ok: false,
    status,
    json: async () => body,
  };
}

function renderManager(overrides: Partial<ComponentProps<typeof CreatorFanPassManager>> = {}) {
  return render(
    <CreatorFanPassManager
      creatorId="creator_1"
      creatorName="Jessica"
      enabled
      restricted={false}
      priceGd={700}
      readOnly={false}
      sourceState="live"
      {...overrides}
    />,
  );
}

describe("CreatorFanPassManager", () => {
  beforeEach(() => {
    mockState.authFetch.mockReset();
    mockState.authFetch.mockResolvedValue(okResponse({ success: true, subscribers: [] }));
  });

  it("loads Fan Pass subscriber visibility with the target creator id query", async () => {
    renderManager();

    await waitFor(() => {
      expect(mockState.authFetch).toHaveBeenCalledWith("/api/creator/subscriptions?creatorId=creator_1");
      expect(screen.getByTestId("creator-fan-pass-manager").dataset.creatorFanPassManagementState).toBe("subscriber_visibility");
    });
  });

  it("renders subscriber rows without membership mutation controls", async () => {
    mockState.authFetch.mockResolvedValue(okResponse({
      success: true,
      subscribers: [
        {
          id: "fan_1234567890__creator_1",
          userId: "fan_1234567890",
          fanUsername: "zayfan",
          fanDisplayName: "Zay Fan",
          fanPhotoURL: "/avatars/zayfan.jpg",
          fanLabel: "@zayfan",
          fanIdentitySource: "user_profile",
          status: "active",
          priceGd: 700,
          renewAt: Date.UTC(2026, 5, 15),
          renewalState: "active",
        },
      ],
    }));

    renderManager();

    await waitFor(() => {
      expect(screen.getByText("@zayfan")).toBeTruthy();
      expect(screen.getByText("active")).toBeTruthy();
      expect(screen.getByText(/700 GD/u)).toBeTruthy();
    });
    expect(screen.queryByText("fan_1234567890")).toBeNull();
    expect(screen.getByTestId("creator-fan-pass-manager").dataset.fanPassCrm).toBe("mobile_v1");
    expect(screen.queryByRole("button", { name: "Subscribe" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    expect(screen.getByTestId("creator-fan-pass-manager").dataset.creatorFanPassReadOnly).toBe("true");
  });

  it("uses safe Fan fallback when identity is unavailable", async () => {
    mockState.authFetch.mockResolvedValue(okResponse({
      success: true,
      subscribers: [
        {
          id: "LLUNBLCOsXSm5qD9jispjgquoF3__creator_1",
          status: "active",
          priceGd: 700,
          fanLabel: "Fan",
          maskedFanId: "Fan • ending oF3",
          fanIdentitySource: "unavailable",
        },
      ],
    }));

    renderManager();

    await waitFor(() => {
      expect(screen.getByText("Fan")).toBeTruthy();
      expect(screen.getByText("Identity unavailable")).toBeTruthy();
    });
    expect(screen.queryByText("LLUNBLCOsXSm5qD9jispjgquoF3")).toBeNull();
  });

  it("shows an unavailable warning when the route returns fan subscription status", async () => {
    mockState.authFetch.mockResolvedValue(okResponse({
      success: true,
      viewMode: "fan_subscription_status",
      subscription: { id: "fan_1__creator_1", status: "active" },
    }));

    renderManager();

    await waitFor(() => {
      expect(screen.getByText("Subscriber visibility unavailable for this context.")).toBeTruthy();
    });
    expect(screen.queryByText("active")).toBeNull();
    expect(screen.queryByRole("button", { name: "Subscribe" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("does not load when Fan Pass is blocked or missing a price", () => {
    const { rerender } = renderManager({ restricted: true });

    expect(mockState.authFetch).not.toHaveBeenCalled();
    expect(screen.getByTestId("creator-fan-pass-manager").dataset.creatorFanPassManagementState).toBe("blocked");

    rerender(
      <CreatorFanPassManager
        creatorId="creator_1"
        creatorName="Jessica"
        enabled
        restricted={false}
        priceGd={0}
        readOnly={false}
        sourceState="needs_setup"
      />,
    );

    expect(mockState.authFetch).not.toHaveBeenCalled();
    expect(screen.getByTestId("creator-fan-pass-manager").dataset.creatorFanPassManagementState).toBe("configuration_only");
  });

  it("uses HumanErrorNotice for subscriber load failures", async () => {
    mockState.authFetch.mockResolvedValue(problemResponse(500, {
      error: "FirebaseError: subscriber visibility query failed",
    }));

    renderManager();

    await waitFor(() => {
      expect(screen.getByText("This section did not load")).toBeTruthy();
    });
    expect(screen.getAllByText("Send bug").length).toBeGreaterThan(0);
    expect(screen.queryByText(/FirebaseError/u)).toBeNull();
    expect(screen.queryByText(/subscriber visibility query failed/u)).toBeNull();
  });
});
