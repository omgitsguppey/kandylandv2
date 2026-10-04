// @vitest-environment happy-dom

import React, { act } from "react";

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



import { PurchaseModal } from "@/components/PurchaseModal";
import { authFetch } from "@/lib/authFetch";
vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

describe("PurchaseModal public beta compact density", () => {
  let container: HTMLDivElement;
  let root: Root;
  const walletDialog = () => document.querySelector<HTMLDivElement>('[role="dialog"][aria-labelledby="purchase-wallet-title"]')!;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    mockState.trackEvent.mockReset();
    vi.mocked(authFetch).mockReset();
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
    document.body.style.overflow = "";
  });

  it("renders explicit source-aware reward and paid balance split", async () => {
    await act(async () => {
      root.render(<PurchaseModal isOpen onClose={vi.fn()} />);
    });

    expect(walletDialog().querySelector("[aria-label='Wallet balance: 76k reward GD, 5k paid GD']"))
      .toBeTruthy();
    expect(walletDialog().textContent).not.toContain("80,962 balance");
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

    expect(walletDialog().querySelector("[aria-label='Wallet balance: 0 reward GD, 1.5k paid GD']"))
      .toBeTruthy();
  });

  it("removes package source subcopy and uses purple bonus chip styling", async () => {
    await act(async () => {
      root.render(<PurchaseModal isOpen onClose={vi.fn()} />);
    });

    expect(walletDialog().textContent).not.toMatch(/\d+ paid \+ \d+ bonus GumDrops/);
    expect(walletDialog().textContent).not.toMatch(/\d+ paid GumDrops/);
    expect(walletDialog().textContent).toContain("GumDrops");
    expect(walletDialog().textContent).toContain("+50 bonus GD");
    expect(walletDialog().textContent).toContain("+100 bonus GD");
    expect(walletDialog().textContent).toContain("+500 bonus GD");
    expect(walletDialog().textContent).toContain("2x bonus GD");
    expect(walletDialog().textContent).not.toContain("paid bonus GD");
    expect(walletDialog().textContent).not.toContain("Paid bundle bonus");
    expect(Array.from(walletDialog().querySelectorAll('[data-slot="badge"]'), (badge) => badge.textContent))
      .toEqual(["+50 bonus GD", "+100 bonus GD", "+500 bonus GD", "2x bonus GD"]);
    expect(walletDialog().matches("[data-wallet-density='public-beta-compact']")).toBe(true);
    expect(walletDialog().matches("[data-wallet-balance-chip='split-source']")).toBe(true);
    expect(walletDialog().matches("[data-wallet-package-subcopy='removed']")).toBe(true);
    expect(walletDialog().matches("[data-wallet-bonus-chip-theme='brand-purple']")).toBe(true);
    expect(walletDialog().querySelector("[data-payment-module-density='compact-v2']")).toBeTruthy();
    expect(walletDialog().querySelector("[data-purchase-promo-slot='reserved']")).toBeTruthy();
  });

  it("renders checkout in PayPal-only single button mode", async () => {
    await act(async () => {
      root.render(<PurchaseModal isOpen onClose={vi.fn()} />);
    });

    expect(walletDialog().querySelector("[data-wallet-paypal-render-mode='single-funding-source']")).toBeTruthy();
    expect(walletDialog().querySelector("[data-wallet-paypal-funding-source='paypal']")).toBeTruthy();
    expect(walletDialog().querySelector("[data-wallet-paypal-buttons-visible='1']")).toBeTruthy();
    expect(walletDialog().querySelector("[data-wallet-checkout-density='single-button']")).toBeTruthy();
    expect(walletDialog().textContent).not.toMatch(/Pay Later|Debit or Credit Card|Credit Card/);
    expect(mockState.paypalButtonsProps?.fundingSource).toBe("paypal");
    expect(mockState.paypalButtonsProps?.createOrder).toEqual(expect.any(Function));
    expect(mockState.paypalButtonsProps?.onApprove).toEqual(expect.any(Function));
    expect(mockState.paypalButtonsProps?.onError).toEqual(expect.any(Function));
    expect(mockState.paypalButtonsProps?.forceReRender).toEqual(["5.00", "550", "Sweet Pack"]);

    const firstPackageButton = Array.from(walletDialog().querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Sugar Rush Pack"));
    expect(firstPackageButton).toBeTruthy();

    await act(async () => {
      firstPackageButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mockState.paypalButtonsProps?.forceReRender).toEqual(["1.00", "100", "Sugar Rush Pack"]);
  });

  it("keeps a permanent dialog name and matching delivered amount after server-confirmed purchase success", async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(new Response(JSON.stringify({ drops: 550, transactionId: "fixture-ledger" }), { status: 200 }));
    await act(async () => { root.render(<PurchaseModal isOpen onClose={vi.fn()} />); });
    const sweetPackage = Array.from(walletDialog().querySelectorAll<HTMLButtonElement>("button[aria-pressed]")).find((button) => button.textContent?.includes("Sweet Pack"))!;
    expect(sweetPackage.querySelector('[data-purchase-row-zone="copy"] > :first-child > :first-child')?.textContent).toBe("550");
    expect(sweetPackage.textContent).toContain("GumDrops");
    expect(sweetPackage.textContent).toContain("+50 bonus GD");
    expect(sweetPackage.textContent).toContain("$5.00");
    await act(async () => { await (mockState.paypalButtonsProps?.onApprove as (data: { orderID: string }) => Promise<void>)({ orderID: "fixture-order" }); });
    expect(vi.mocked(authFetch).mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ orderId: "fixture-order", expectedDrops: 550 }));
    expect(walletDialog().getAttribute("aria-labelledby")).toBe("purchase-wallet-title");
    expect(document.getElementById("purchase-wallet-title")?.textContent).toBe("Kandy shop");
    expect(walletDialog().textContent).toContain("550 GD");
    expect(walletDialog().textContent).toContain("500 GD");
    expect(walletDialog().textContent).toContain("+50 paid bonus GD");
    expect(walletDialog().textContent).toContain("$5.00");
  });

  it("prevents package changes and dismissal while capture is pending, then recovers after failure", async () => {
    let settle!: (response: Response) => void;
    vi.mocked(authFetch).mockImplementationOnce(() => new Promise<Response>((resolve) => { settle = resolve; }));
    const onClose = vi.fn();
    await act(async () => { root.render(<PurchaseModal isOpen onClose={onClose} />); });
    let approval!: Promise<void>;
    await act(async () => { approval = (mockState.paypalButtonsProps?.onApprove as (data: { orderID: string }) => Promise<void>)({ orderID: "fixture-order" }); });
    expect(walletDialog().getAttribute("aria-busy")).toBe("true");
    expect(walletDialog().textContent).toContain("Confirming your payment…");
    expect(Array.from(walletDialog().querySelectorAll<HTMLButtonElement>("button[aria-pressed]"))).toSatisfy((buttons: HTMLButtonElement[]) => buttons.length === 5 && buttons.every((button) => button.disabled));
    await act(async () => {
      const firstPackage = Array.from(walletDialog().querySelectorAll<HTMLButtonElement>("button[aria-pressed]")).find((button) => button.textContent?.includes("Sugar Rush Pack"));
      firstPackage?.click();
      walletDialog().querySelector<HTMLButtonElement>('[aria-label="Close modal"]')?.click();
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(mockState.paypalButtonsProps?.forceReRender).toEqual(["5.00", "550", "Sweet Pack"]);
    await act(async () => { settle(new Response(JSON.stringify({ errorKey: "payment_not_completed" }), { status: 503 })); await approval; });
    expect(walletDialog().getAttribute("aria-busy")).toBe("false");
    expect(walletDialog().querySelector('[role="alert"]')).toBeTruthy();
    expect(Array.from(walletDialog().querySelectorAll<HTMLButtonElement>("button[aria-pressed]")).some((button) => button.disabled)).toBe(false);
    const retry = Array.from(walletDialog().querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent === "Try again");
    expect(retry).toBeTruthy();
    await act(async () => { retry?.click(); });
    expect(walletDialog().querySelector('[role="alert"]')).toBeNull();
    expect(mockState.paypalButtonsProps?.forceReRender).toEqual(["5.00", "550", "Sweet Pack"]);
  });

  it("uses the shared fixed catalog without an empty transport catalog crashing selection",async()=>{const source=vi.fn(async()=>({ok:true,json:async()=>({packages:[]})}));vi.stubGlobal("fetch",source);await act(async()=>{root.render(<PurchaseModal isOpen onClose={vi.fn()}/>);});expect(source).not.toHaveBeenCalled();expect(mockState.paypalButtonsProps?.forceReRender).toEqual(["5.00","550","Sweet Pack"]);expect(walletDialog().textContent).toContain("Sweet Pack");});
  it("changes package selection without requesting a duplicate catalog",async()=>{const source=vi.fn(()=>new Promise<Response>(()=>{}));vi.stubGlobal("fetch",source);await act(async()=>{root.render(<PurchaseModal isOpen onClose={vi.fn()}/>);});const button=Array.from(walletDialog().querySelectorAll("button")).find(b=>b.textContent?.includes("Sugar Rush Pack"));expect(button).toBeTruthy();await act(async()=>{button?.click();});expect(source).not.toHaveBeenCalled();expect(mockState.paypalButtonsProps?.forceReRender).toEqual(["1.00","100","Sugar Rush Pack"]);});
  it("retains the captured package after an obsolete external catalog resolves",async()=>{let resolveCatalog!:(r:unknown)=>void;const stale=new Promise(resolve=>{resolveCatalog=resolve;});const source=vi.fn(()=>stale);vi.stubGlobal("fetch",source);let settle!:(r:Response)=>void;vi.mocked(authFetch).mockImplementationOnce(()=>new Promise<Response>(resolve=>{settle=resolve;}));await act(async()=>{root.render(<PurchaseModal isOpen onClose={vi.fn()}/>);});let approval!:Promise<void>;await act(async()=>{approval=(mockState.paypalButtonsProps?.onApprove as (d:{orderID:string})=>Promise<void>)({orderID:"fixture-order"});});await act(async()=>{resolveCatalog({ok:true,json:async()=>({packages:[{drops:777,priceUsd:7,label:"Alternate"}]})});});expect(source).not.toHaveBeenCalled();expect(mockState.paypalButtonsProps?.forceReRender).toEqual(["5.00","550","Sweet Pack"]);expect(vi.mocked(authFetch).mock.calls[0]?.[1]?.body).toBe(JSON.stringify({orderId:"fixture-order",expectedDrops:550}));await act(async()=>{settle(new Response(JSON.stringify({errorKey:"payment_not_completed"}),{status:503}));await approval;});expect(walletDialog().querySelector("[role=alert]")).toBeTruthy();});
});
