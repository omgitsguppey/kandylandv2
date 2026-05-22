// @vitest-environment happy-dom

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProfile } from "@/types/db";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE = "test-client";
});

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
  paypalButtonsProps: null as Record<string, unknown> | null,
  trackEvent: vi.fn(),
}));

vi.mock("@paypal/react-paypal-js", () => ({
  FUNDING: { PAYPAL: "paypal" },
  PayPalButtons: (props: Record<string, unknown>) => {
    mockState.paypalButtonsProps = props;
    return <div data-testid="paypal-buttons" />;
  },
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
    mockState.paypalButtonsProps = null;
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
    expect(container.textContent).toContain("Paid GD");
    expect(container.textContent).toContain("+50 bonus GD");
    expect(container.textContent).toContain("+100 bonus GD");
    expect(container.textContent).toContain("+500 bonus GD");
    expect(container.textContent).toContain("2x bonus GD");
    expect(container.textContent).not.toContain("paid bonus GD");
    expect(container.textContent).not.toContain("Paid bundle bonus");
    expect(container.innerHTML).not.toContain("emerald-");
    expect(container.innerHTML).toContain("border-brand-purple/25");
    expect(container.innerHTML).toContain("bg-brand-purple/[0.12]");
    expect(container.querySelector("[data-wallet-density='public-beta-compact']")).toBeTruthy();
    expect(container.querySelector("[data-wallet-balance-chip='split-source']")).toBeTruthy();
    expect(container.querySelector("[data-wallet-package-subcopy='removed']")).toBeTruthy();
    expect(container.querySelector("[data-wallet-bonus-chip-theme='brand-purple']")).toBeTruthy();
    expect(container.querySelector("[data-payment-module-density='compact-v2']")).toBeTruthy();
    expect(container.querySelector("[data-purchase-promo-slot='reserved']")).toBeTruthy();
  });

  it("renders checkout in PayPal-only single button mode", async () => {
    await act(async () => {
      root.render(<PurchaseModal isOpen onClose={vi.fn()} />);
    });

    expect(container.querySelector("[data-wallet-paypal-render-mode='single-funding-source']")).toBeTruthy();
    expect(container.querySelector("[data-wallet-paypal-funding-source='paypal']")).toBeTruthy();
    expect(container.querySelector("[data-wallet-paypal-buttons-visible='1']")).toBeTruthy();
    expect(container.querySelector("[data-wallet-checkout-density='single-button']")).toBeTruthy();
    expect(container.textContent).not.toMatch(/Pay Later|Debit or Credit Card|Credit Card/);
    expect(mockState.paypalButtonsProps?.fundingSource).toBe("paypal");
    expect(mockState.paypalButtonsProps?.createOrder).toEqual(expect.any(Function));
    expect(mockState.paypalButtonsProps?.onApprove).toEqual(expect.any(Function));
    expect(mockState.paypalButtonsProps?.onError).toEqual(expect.any(Function));
    expect(mockState.paypalButtonsProps?.forceReRender).toEqual(["5.00", "550", "Sweet Pack"]);

    const firstPackageButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Sugar Rush Pack"));
    expect(firstPackageButton).toBeTruthy();

    await act(async () => {
      firstPackageButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mockState.paypalButtonsProps?.forceReRender).toEqual(["1.00", "100", "Sugar Rush Pack"]);
  });
});
