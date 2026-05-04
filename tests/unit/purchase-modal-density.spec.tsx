// @vitest-environment happy-dom

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProfile } from "@/types/db";

const mockState = vi.hoisted(() => ({
  auth: {
    user: { uid: "wallet-user" },
    userProfile: {
      uid: "wallet-user",
      email: "wallet@example.com",
      displayName: "Wallet User",
      photoURL: null,
      gumDropsBalance: 80962,
      gumDropsPurchasedBalance: 5000,
      gumDropsRewardBalance: 75962,
      unlockedContent: [],
      createdAt: 0,
    } as UserProfile,
    setUserProfile: vi.fn(),
  },
  trackEvent: vi.fn(),
}));

vi.mock("@paypal/react-paypal-js", () => ({
  PayPalButtons: () => <div data-testid="paypal-buttons" />,
  usePayPalScriptReducer: () => [{ isPending: false }],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockState.auth,
}));

vi.mock("@/context/UIContext", () => ({
  useUI: () => ({ preferredPurchaseDrops: null }),
}));

vi.mock("@/components/Auth/GuestComponentBlur", () => ({
  GuestComponentBlur: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/Feedback/ReportBugButton", () => ({
  ReportBugButton: () => null,
}));

vi.mock("@/lib/telemetry", () => ({
  clearTimedFlow: vi.fn(),
  consumeTimedFlow: vi.fn(() => ({ mergedParams: {} })),
  startTimedFlow: vi.fn(),
  trackEvent: (...args: unknown[]) => mockState.trackEvent(...args),
}));

vi.mock("@/lib/authFetch", () => ({
  authFetch: vi.fn(),
}));

vi.mock("@/lib/activity-sync", () => ({
  dispatchActivitySync: vi.fn(),
}));

vi.mock("@/lib/client-error-reporting", () => ({
  reportClientIssue: vi.fn(),
}));

vi.mock("framer-motion", async () => {
  const ReactModule = await import("react");
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy({}, {
      get: (_target, tag: string) =>
        ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: Record<string, unknown>) =>
          ReactModule.createElement(tag, props, children as React.ReactNode),
    }),
  };
});

import { PurchaseModal } from "@/components/PurchaseModal";

describe("PurchaseModal public beta compact density", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    mockState.trackEvent.mockReset();
    mockState.auth.userProfile = {
      ...mockState.auth.userProfile,
      gumDropsBalance: 80962,
      gumDropsPurchasedBalance: 5000,
      gumDropsRewardBalance: 75962,
    } as UserProfile;
    vi.stubGlobal("fetch", vi.fn(async () => ({
      json: async () => ({}),
    })));
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it("renders explicit source-aware free and paid balance split", async () => {
    await act(async () => {
      root.render(<PurchaseModal isOpen onClose={vi.fn()} />);
    });

    expect(container.textContent).toContain("76k free GD");
    expect(container.textContent).toContain("5k paid GD");
    expect(container.textContent).toMatch(/76k free GD\s*\|\s*5k paid GD/);
    expect(container.textContent).not.toContain("80,962 balance");
  });

  it("uses the canonical legacy balance fallback when split fields are absent", async () => {
    mockState.auth.userProfile = {
      ...mockState.auth.userProfile,
      gumDropsBalance: 1500,
      gumDropsPurchasedBalance: undefined,
      gumDropsRewardBalance: undefined,
    } as UserProfile;

    await act(async () => {
      root.render(<PurchaseModal isOpen onClose={vi.fn()} />);
    });

    expect(container.textContent).toContain("0 free GD");
    expect(container.textContent).toContain("1.5k paid GD");
  });

  it("removes package source subcopy and uses purple bonus chip styling", async () => {
    await act(async () => {
      root.render(<PurchaseModal isOpen onClose={vi.fn()} />);
    });

    expect(container.textContent).not.toMatch(/\d+ paid \+ \d+ bonus GumDrops/);
    expect(container.textContent).not.toMatch(/\d+ paid GumDrops/);
    expect(container.innerHTML).not.toContain("emerald-");
    expect(container.innerHTML).toContain("border-brand-purple/30");
    expect(container.innerHTML).toContain("bg-brand-purple/15");
    expect(container.querySelector("[data-wallet-density='public-beta-compact']")).toBeTruthy();
    expect(container.querySelector("[data-wallet-balance-chip='split-source']")).toBeTruthy();
    expect(container.querySelector("[data-wallet-package-subcopy='removed']")).toBeTruthy();
    expect(container.querySelector("[data-wallet-bonus-chip-theme='brand-purple']")).toBeTruthy();
  });
});
