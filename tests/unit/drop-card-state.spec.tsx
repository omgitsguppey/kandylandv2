// @vitest-environment happy-dom

import React, { useEffect } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildTestDrop,
  enoughGumDropsState,
  guestAuthState,
  insufficientGumDropsState,
  ownedDropState,
} from "./utils/kandydrops-test-states";
import type { UserProfile } from "@/types/db";

const mockState = vi.hoisted(() => ({
  userProfile: null as UserProfile | null,
  setUserProfile: vi.fn(),
  openAuthModal: vi.fn(),
  openPurchaseModal: vi.fn(),
  trackEvent: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockState.push }),
}));

vi.mock("next/image", () => ({
  default: ({ alt, onLoadingComplete, onError: _onError, ...props }: {
    alt: string;
    onLoadingComplete?: () => void;
    onError?: () => void;
  }) => {
    useEffect(() => {
      onLoadingComplete?.();
    }, [onLoadingComplete]);
    return <img alt={alt} {...props} />;
  },
}));

vi.mock("@/context/AuthContext", () => ({
  useUserProfile: () => ({
    userProfile: mockState.userProfile,
    setUserProfile: mockState.setUserProfile,
  }),
}));

vi.mock("@/context/UIContext", () => ({
  useUI: () => ({
    openAuthModal: mockState.openAuthModal,
    openPurchaseModal: mockState.openPurchaseModal,
  }),
}));

vi.mock("@/hooks/useDropCardImpression", () => ({
  DROPS_MOBILE_UI_DENSITY: "public-beta-compact",
  useDropCardImpression: vi.fn(),
}));

vi.mock("@/hooks/useNow", () => ({
  useNow: () => Date.now(),
}));

vi.mock("@/components/ui/TitleMarquee", () => ({
  TitleMarquee: ({ title, className }: { title: string; className?: string }) => (
    <span className={className}>{title}</span>
  ),
}));

vi.mock("@/components/Toasts/UnwrapSuccessToast", () => ({
  showUnwrapSuccessToast: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
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

vi.mock("@/lib/telemetry", () => ({
  trackEvent: (...args: unknown[]) => mockState.trackEvent(...args),
}));

import { DropCard } from "@/components/DropCard";

describe("DropCard state behavior", () => {
  beforeEach(() => {
    mockState.userProfile = null;
    mockState.setUserProfile.mockReset();
    mockState.openAuthModal.mockReset();
    mockState.openPurchaseModal.mockReset();
    mockState.trackEvent.mockReset();
    mockState.push.mockReset();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true })));
  });

  it("opens signup for guest unwrap CTA", async () => {
    const drop = buildTestDrop();
    mockState.userProfile = guestAuthState.userProfile;

    render(<DropCard drop={drop} user={guestAuthState.user} onPreview={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /unwrap now/i }));

    expect(mockState.openAuthModal).toHaveBeenCalledWith("signup");
    expect(mockState.openPurchaseModal).not.toHaveBeenCalled();
    expect(screen.getByText(drop.title).closest("[data-drop-card-auth-state]")).toHaveAttribute("data-drop-card-auth-state", "guest");
  });

  it("keeps logged-in enough-balance covers clear", () => {
    const drop = buildTestDrop({ unlockCost: 500 });
    const auth = enoughGumDropsState(drop.unlockCost);
    mockState.userProfile = auth.userProfile;

    render(<DropCard drop={drop} user={auth.user} onPreview={vi.fn()} />);

    const card = screen.getByText(drop.title).closest("[data-drop-cover-treatment]");
    expect(card).toHaveAttribute("data-drop-card-auth-state", "authenticated");
    expect(card).toHaveAttribute("data-drop-cover-treatment", "clear");
    expect(card).toHaveAttribute("data-drop-cta-state", "unwrap");
    expect(card).toHaveAttribute("data-drop-affordability-reason", "authenticated_can_afford");
    expect(screen.getByRole("button", { name: /^unwrap$/i })).toBeEnabled();
  });

  it("shows refill state for logged-in insufficient-balance drops", async () => {
    const drop = buildTestDrop({ unlockCost: 500 });
    const auth = insufficientGumDropsState(drop.unlockCost);
    mockState.userProfile = auth.userProfile;

    render(<DropCard drop={drop} user={auth.user} onPreview={vi.fn()} />);

    const card = screen.getByText(drop.title).closest("[data-drop-cover-treatment]");
    expect(card).toHaveAttribute("data-drop-cover-treatment", "blurred_insufficient_balance");
    expect(card).toHaveAttribute("data-drop-cta-state", "refill");
    expect(card).toHaveAttribute("data-drop-affordability-reason", "authenticated_insufficient_balance");

    await userEvent.click(screen.getByRole("button", { name: /refill gumdrops/i }));

    expect(mockState.openPurchaseModal).toHaveBeenCalledWith(1);
  });

  it("renders owned drops as viewable and clear of affordability blur", () => {
    const drop = buildTestDrop({ id: "owned_drop" });
    const auth = ownedDropState(drop.id);
    mockState.userProfile = auth.userProfile;

    render(<DropCard drop={drop} user={auth.user} isUnlocked onPreview={vi.fn()} />);

    const card = screen.getByText(drop.title).closest("[data-drop-cover-treatment]");
    expect(card).toHaveAttribute("data-drop-cover-treatment", "owned");
    expect(card).toHaveAttribute("data-drop-cta-state", "view");
    expect(screen.getByRole("link", { name: /view content/i })).toHaveAttribute("href", `/dashboard/viewer?id=${drop.id}`);
  });
});
