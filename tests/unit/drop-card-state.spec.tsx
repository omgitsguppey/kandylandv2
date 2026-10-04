// @vitest-environment happy-dom

import React, { useEffect } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildTestDrop,
  enoughGumDropsState,
  guestAuthState,
  insufficientGumDropsState,
  ownedDropState,
} from "./utils/kandydrops-test-states";
import type { EmblaCarouselType } from "embla-carousel";
import type { Drop, UserProfile } from "@/types/db";

const mockState = vi.hoisted(() => ({
  userProfile: null as UserProfile | null,
  identityUser: null as ReturnType<typeof buildTestUser> | null,
  openProfileSidebar: vi.fn(),
  feed: { drops: [] as Drop[], loading: false, error: null as string | null, size: 1, setSize: vi.fn(), isLoadingMore: false, isReachingEnd: true },
  setUserProfile: vi.fn(),
  openAuthModal: vi.fn(),
  openPurchaseModal: vi.fn(),
  trackEvent: vi.fn(),
  push: vi.fn(),
  loading: false,
  useActualFeed: false,
  successToast: vi.fn(),
  emblaApi: null as EmblaCarouselType | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockState.push }),
}));

vi.mock("next/image", () => ({
  default: function MockNextImage({ alt, onLoadingComplete, onError: _onError, ...props }: {
    alt: string;
    onLoadingComplete?: () => void;
    onError?: () => void;
  }) {
    useEffect(() => {
      onLoadingComplete?.();
    }, [onLoadingComplete]);
    return <img alt={alt} {...props} />;
  },
}));

vi.mock("@/context/AuthContext", () => ({
  useAuthLoading: () => ({ loading: mockState.loading }),
  useAuthIdentity: () => ({ user: mockState.identityUser }),
  useAuth: () => ({ user: mockState.identityUser, userProfile: mockState.userProfile, loading: mockState.loading }),
  useUserProfile: () => ({
    userProfile: mockState.userProfile,
    setUserProfile: mockState.setUserProfile,
  }),
}));

vi.mock("@/context/AdminViewAsContext", () => ({
  useAdminViewAs: () => ({
    viewAsState: null,
  }),
}));

vi.mock("@/context/UIContext", () => ({
  useUI: () => ({
    openAuthModal: mockState.openAuthModal,
    openPurchaseModal: mockState.openPurchaseModal,
    openProfileSidebar: mockState.openProfileSidebar,
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
  showUnwrapSuccessToast: (...args: unknown[]) => mockState.successToast(...args),
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

vi.mock("@/hooks/useDrops", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useDrops")>();
  return { useDrops: (...args: Parameters<typeof actual.useDrops>) => mockState.useActualFeed ? actual.useDrops(...args) : mockState.feed };
});
vi.mock("@/hooks/useDeferredClientReady", () => ({ useDeferredClientReady: () => false }));
vi.mock("@/hooks/useNetworkConditions", () => ({ useNetworkConditions: () => ({ isConstrained: false, isVerySlow: false }) }));
vi.mock("@/components/CreatorDiscoveryRail", () => ({ CreatorDiscoveryRail: () => null }));
vi.mock("@/components/PromoCard", () => ({ PromoCard: () => null }));
vi.mock("embla-carousel-react", () => ({ default: () => [vi.fn(), mockState.emblaApi] }));
vi.mock("next/dynamic", async () => {
  const { FeaturedCarousel } = await vi.importActual<typeof import("@/components/FeaturedCarousel")>("@/components/FeaturedCarousel");
  return { default: () => FeaturedCarousel };
});

import { DropCard } from "@/components/DropCard";
import { DropsClient } from "@/app/drops/DropsClient";
import { FeaturedCarousel } from "@/components/FeaturedCarousel";
import { buildAccountOverviewViewModel } from "@/lib/drops-account-overview-view-model";

describe("DropCard state behavior", () => {
  beforeEach(() => {
    mockState.useActualFeed = false;
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

    await userEvent.click(screen.getByRole("button", { name: /create account to unwrap/i }));

    expect(mockState.openAuthModal).toHaveBeenCalledWith("signup");
    expect(mockState.openPurchaseModal).not.toHaveBeenCalled();
    expect(screen.getByText(drop.title).closest("[data-drop-card-auth-state]")).toHaveAttribute("data-drop-card-auth-state", "guest");
    expect(screen.getByText(drop.title).closest("[data-drop-cover-treatment]")).toHaveAttribute("data-drop-card-should-blur-cover", "true");
  });

  it("keeps logged-in enough-balance covers clear", () => {
    const drop = buildTestDrop({ unlockCost: 500 });
    const auth = enoughGumDropsState(drop.unlockCost);
    mockState.userProfile = auth.userProfile;

    render(<DropCard drop={drop} user={auth.user} onPreview={vi.fn()} />);

    const card = screen.getByText(drop.title).closest("[data-drop-cover-treatment]");
    expect(card).toHaveAttribute("data-drop-card-auth-state", "authenticated");
    expect(card).toHaveAttribute("data-drop-cover-treatment", "clear");
    expect(card).toHaveAttribute("data-drop-card-should-blur-cover", "false");
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
    expect(card).toHaveAttribute("data-drop-card-should-blur-cover", "true");
    expect(card).toHaveAttribute("data-drop-cta-state", "refill");
    expect(card).toHaveAttribute("data-drop-affordability-reason", "authenticated_insufficient_balance");

    await userEvent.click(screen.getByRole("button", { name: /refill to unwrap/i }));

    expect(mockState.openPurchaseModal).toHaveBeenCalledWith(1);
  });

  it("lets creators preview their own card cover without showing a refill CTA", async () => {
    const drop = buildTestDrop({ creatorId: "creator_1", submittedByCreatorId: "creator_1", unlockCost: 500 });
    const auth = insufficientGumDropsState(drop.unlockCost, { uid: "creator_1", role: "creator" });
    const onPreview = vi.fn();
    mockState.userProfile = auth.userProfile;

    render(<DropCard drop={drop} user={auth.user} onPreview={onPreview} />);

    const card = screen.getByText(drop.title).closest("[data-drop-cover-treatment]");
    expect(card).toHaveAttribute("data-drop-cover-treatment", "creator_preview");
    expect(card).toHaveAttribute("data-drop-card-owner-or-creator", "true");
    expect(card).toHaveAttribute("data-drop-card-should-blur-cover", "false");
    expect(card).toHaveAttribute("data-drop-cta-state", "preview");

    await userEvent.click(screen.getByRole("button", { name: /preview cover/i }));

    expect(onPreview).toHaveBeenCalledWith(drop, "compact_drop_card");
    expect(mockState.openPurchaseModal).not.toHaveBeenCalled();
  });

  it("renders owned drops as viewable and clear of affordability blur", () => {
    const drop = buildTestDrop({ id: "owned_drop" });
    const auth = ownedDropState(drop.id);
    mockState.userProfile = auth.userProfile;

    render(<DropCard drop={drop} user={auth.user} isUnlocked onPreview={vi.fn()} />);

    const card = screen.getByText(drop.title).closest("[data-drop-cover-treatment]");
    expect(card).toHaveAttribute("data-drop-cover-treatment", "owned");
    expect(card).toHaveAttribute("data-drop-cta-state", "view");
    expect(card).toHaveAttribute("data-drop-card-should-blur-cover", "false");
    expect(screen.getByRole("link", { name: /view content/i })).toHaveAttribute("href", `/dashboard/viewer?id=${drop.id}`);
  });
});


import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { dispatchActivitySync } from "@/lib/activity-sync";
import { toast } from "sonner";
import { buildTestProfile, buildTestUser } from "./utils/kandydrops-test-states";

function unlockResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function waitForUnlockResponse() {
  let resolve!: (response: Response) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<Response>((settle, fail) => { resolve = settle; reject = fail; });
  return { promise, resolve, reject };
}

describe("DropCard unwrap belongs to its current account and Drop", () => {
  beforeEach(() => {
    mockState.useActualFeed = false;
    mockState.userProfile = buildTestProfile();
    mockState.loading = false;
    mockState.setUserProfile.mockReset();
    mockState.openAuthModal.mockReset();
    mockState.openPurchaseModal.mockReset();
    mockState.trackEvent.mockReset();
    mockState.push.mockReset();
    mockState.successToast.mockReset();
    vi.mocked(authFetch).mockReset();
    vi.mocked(dispatchActivitySync).mockReset();
    vi.mocked(toast.error).mockReset();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true })));
  });

  async function confirmUnwrap() {
    await userEvent.click(screen.getByRole("button", { name: /^unwrap$/i }));
    await userEvent.click(screen.getByRole("button", { name: /confirm 500 gd/i }));
  }

  it.each([{ success: false, error: "Confirmation failed" }, {}])("rejects incomplete HTTP200 acknowledgement %j and recovers the next valid attempt", async (body) => {
    vi.mocked(authFetch).mockResolvedValueOnce(unlockResponse(body));
    const drop = buildTestDrop();
    render(<DropCard drop={drop} user={buildTestUser()} onPreview={vi.fn()} />);
    await confirmUnwrap();
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(mockState.setUserProfile).not.toHaveBeenCalled();
    expect(dispatchActivitySync).not.toHaveBeenCalled();
    expect(mockState.successToast).not.toHaveBeenCalled();
    vi.mocked(authFetch).mockResolvedValueOnce(unlockResponse({ success: true, newBalance: 500, unwrappedAt: 1700000000001 }));
    await confirmUnwrap();
    await waitFor(() => expect(mockState.successToast).toHaveBeenCalledTimes(1));
    expect(mockState.setUserProfile).toHaveBeenCalledTimes(1);
    expect(dispatchActivitySync).toHaveBeenCalledTimes(1);
  });

  it.each(["missing", "other-account", "auth-pending"])("holds stale access and refill actions while profile readiness is %s, then recovers", async (mode) => {
    const drop = buildTestDrop();
    const user = buildTestUser("user_b");
    mockState.userProfile = mode === "missing" ? null : buildTestProfile({ uid: mode === "other-account" ? "user_a" : "user_b", unlockedContent: [drop.id], gumDropsBalance: 10000 });
    mockState.loading = mode === "auth-pending";
    const { rerender } = render(<DropCard drop={drop} user={user} isUnlocked onPreview={vi.fn()} />);
    const action = screen.queryByRole("button", { name: /checking access|unwrap|refill/i });
    if (action) await userEvent.click(action);
    expect.soft(mockState.openPurchaseModal).not.toHaveBeenCalled();
    expect.soft(vi.mocked(authFetch)).not.toHaveBeenCalled();
    expect.soft(screen.queryByRole("link", { name: /view content/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /checking access/i })).toBeDisabled();
    mockState.userProfile = buildTestProfile({ uid: "user_b" });
    mockState.loading = false;
    rerender(<DropCard drop={drop} user={user} onPreview={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^unwrap$/i })).toBeEnabled();
    expect(mockState.openPurchaseModal).not.toHaveBeenCalled();
  });

  it("settles a valid current-account acknowledgement once and keeps its viewer action", async () => {
    const profile = mockState.userProfile!;
    vi.mocked(authFetch).mockResolvedValue(unlockResponse({ success: true, newBalance: 500, unwrappedAt: 1700000000001 }));
    const drop = buildTestDrop();
    render(<DropCard drop={drop} user={buildTestUser()} onPreview={vi.fn()} />);
    await confirmUnwrap();
    await waitFor(() => expect(mockState.setUserProfile).toHaveBeenCalledTimes(1));
    const update = mockState.setUserProfile.mock.calls[0][0] as (current: UserProfile) => UserProfile;
    expect(update(profile)).toMatchObject({ uid: "user_1", gumDropsBalance: 500, unlockedContent: [drop.id], unlockedContentTimestamps: { [drop.id]: 1700000000001 } });
    const success = mockState.successToast.mock.calls[0][0] as { onTaste: () => void };
    success.onTaste();
    expect(mockState.push).toHaveBeenCalledWith("/dashboard/viewer?id=" + drop.id);
    expect(dispatchActivitySync).toHaveBeenCalledTimes(1);
  });

  it("suppresses duplicate synchronous confirmation activation while the request is pending", async () => {
    const pending = waitForUnlockResponse();
    vi.mocked(authFetch).mockReturnValue(pending.promise);
    render(<DropCard drop={buildTestDrop()} user={buildTestUser()} onPreview={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /^unwrap$/i }));
    const confirm = screen.getByRole("button", { name: /confirm 500 gd/i });
    act(() => { confirm.click(); confirm.click(); });
    expect(authFetch).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(unlockResponse({ success: true, newBalance: 500 })));
    expect(mockState.successToast).toHaveBeenCalledTimes(1);
  });

  it.each(["account", "drop", "unmount", "logout-return"])("does not settle an old unwrap after %s changes", async (change) => {
    const pending = waitForUnlockResponse();
    vi.mocked(authFetch).mockReturnValue(pending.promise);
    const drop = buildTestDrop();
    const view = render(<DropCard drop={drop} user={buildTestUser()} onPreview={vi.fn()} />);
    await confirmUnwrap();
    if (change === "unmount") view.unmount();
    else if (change === "logout-return") {
      mockState.userProfile = null;
      view.rerender(<DropCard drop={drop} user={null} onPreview={vi.fn()} />);
      mockState.userProfile = buildTestProfile();
      view.rerender(<DropCard drop={drop} user={buildTestUser()} onPreview={vi.fn()} />);
    } else {
      if (change === "account") mockState.userProfile = buildTestProfile({ uid: "user_b" });
      view.rerender(<DropCard drop={change === "drop" ? buildTestDrop({ id: "drop_b" }) : drop} user={buildTestUser(change === "account" ? "user_b" : "user_1")} onPreview={vi.fn()} />);
    }
    await act(async () => pending.resolve(unlockResponse({ success: true, newBalance: 500, unwrappedAt: 1700000000001 })));
    expect(mockState.setUserProfile).not.toHaveBeenCalled();
    expect(dispatchActivitySync).not.toHaveBeenCalled();
    expect(mockState.successToast).not.toHaveBeenCalled();
    expect(mockState.push).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("checks account custody when a queued profile updater or success action later executes", async () => {
    vi.mocked(authFetch).mockResolvedValue(unlockResponse({ success: true, newBalance: 500 }));
    const drop = buildTestDrop();
    const view = render(<DropCard drop={drop} user={buildTestUser()} onPreview={vi.fn()} />);
    await confirmUnwrap();
    const update = mockState.setUserProfile.mock.calls[0][0] as (current: UserProfile) => UserProfile;
    const success = mockState.successToast.mock.calls[0][0] as { onTaste: () => void };
    const nextProfile = buildTestProfile({ uid: "user_b", gumDropsBalance: 9000 });
    mockState.userProfile = nextProfile;
    view.rerender(<DropCard drop={drop} user={buildTestUser("user_b")} onPreview={vi.fn()} />);
    expect.soft(update(nextProfile)).toBe(nextProfile);
    success.onTaste();
    expect(mockState.push).not.toHaveBeenCalled();
  });

  it("waits for body acknowledgement before settlement and rechecks custody after body delivery", async () => {
    let stream!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({ start(controller) { stream = controller; } });
    vi.mocked(authFetch).mockResolvedValue(new Response(body, { status: 200, headers: { "content-type": "application/json" } }));
    const drop = buildTestDrop();
    const view = render(<DropCard drop={drop} user={buildTestUser()} onPreview={vi.fn()} />);
    await confirmUnwrap();
    expect(mockState.setUserProfile).not.toHaveBeenCalled();
    mockState.userProfile = buildTestProfile({ uid: "user_b" });
    view.rerender(<DropCard drop={drop} user={buildTestUser("user_b")} onPreview={vi.fn()} />);
    await act(async () => { stream.enqueue(new TextEncoder().encode(JSON.stringify({ success: true, newBalance: 500 }))); stream.close(); });
    expect(mockState.setUserProfile).not.toHaveBeenCalled();
    expect(mockState.successToast).not.toHaveBeenCalled();
    expect(dispatchActivitySync).not.toHaveBeenCalled();
  });

  it("does not release a replacement actor's pending request when the old request finishes", async () => {
    const oldRequest = waitForUnlockResponse(), nextRequest = waitForUnlockResponse();
    vi.mocked(authFetch).mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(nextRequest.promise);
    const drop = buildTestDrop();
    const view = render(<DropCard drop={drop} user={buildTestUser()} onPreview={vi.fn()} />);
    await confirmUnwrap();
    mockState.userProfile = buildTestProfile({ uid: "user_b", gumDropsBalance: 9000 });
    view.rerender(<DropCard drop={drop} user={buildTestUser("user_b")} onPreview={vi.fn()} />);
    await confirmUnwrap();
    await act(async () => oldRequest.resolve(unlockResponse({ success: true, newBalance: 500 })));
    expect(screen.getByRole("button", { name: /unwrapping/i })).toBeDisabled();
    expect(mockState.setUserProfile).not.toHaveBeenCalled();
    await act(async () => nextRequest.resolve(unlockResponse({ success: true, newBalance: 8500 })));
    expect(authFetch).toHaveBeenCalledTimes(2);
    expect(mockState.setUserProfile).toHaveBeenCalledTimes(1);
    expect(mockState.successToast).toHaveBeenCalledTimes(1);
    expect(dispatchActivitySync).toHaveBeenCalledTimes(1);
    const update = mockState.setUserProfile.mock.calls[0][0] as (current: UserProfile) => UserProfile;
    expect(update(mockState.userProfile!)).toMatchObject({ uid: "user_b", gumDropsBalance: 8500, unlockedContent: [drop.id] });
  });

  it("does not report an old account's late failure and retains the new account's next valid action", async () => {
    const oldRequest = waitForUnlockResponse();
    vi.mocked(authFetch).mockReturnValueOnce(oldRequest.promise);
    vi.mocked(reportClientIssue).mockClear();
    const drop = buildTestDrop();
    const view = render(<DropCard drop={drop} user={buildTestUser()} onPreview={vi.fn()} />);
    await confirmUnwrap();
    mockState.userProfile = buildTestProfile({ uid: "user_b" });
    view.rerender(<DropCard drop={drop} user={buildTestUser("user_b")} onPreview={vi.fn()} />);
    await act(async () => oldRequest.reject(new Error("Old account transport failed")));
    expect(reportClientIssue).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /^unwrap$/i })).toBeEnabled();
    vi.mocked(authFetch).mockResolvedValueOnce(unlockResponse({ success: true, newBalance: 500 }));
    await confirmUnwrap();
    expect(mockState.successToast).toHaveBeenCalledTimes(1);
    expect(dispatchActivitySync).toHaveBeenCalledTimes(1);
  });

});


describe("public Discovery source and action continuity", () => {
  beforeEach(() => {
    mockState.useActualFeed = false;
    mockState.identityUser = null;
    mockState.userProfile = null;
    mockState.loading = false;
    mockState.feed = { drops: [], loading: false, error: null, size: 1, setSize: vi.fn(), isLoadingMore: false, isReachingEnd: true };
    mockState.openAuthModal.mockReset();
    mockState.openPurchaseModal.mockReset();
    mockState.openProfileSidebar.mockReset();
    mockState.trackEvent.mockReset();
    mockState.push.mockReset();
    vi.stubGlobal("IntersectionObserver", class {
      observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
    });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true })));
  });

  function renderDiscovery() { return render(<DropsClient initialDrops={[]} creatorRailProfiles={[]} />); }
  function collection() { return document.getElementById("live-drops")!; }

  it("retains the new account's available collection while the previous account's profile is stale, then recovers known zero", async () => {
    const ownedA = buildTestDrop({ id: "owned_a", title: "Account A collection record" });
    mockState.feed.drops = [ownedA];
    mockState.identityUser = buildTestUser();
    mockState.userProfile = buildTestProfile({ unlockedContent: [ownedA.id], gumDropsBalance: 9000 });
    const view = renderDiscovery();
    expect(collection().querySelector('[data-drop-card-root]')).toBeNull();
    mockState.identityUser = buildTestUser("user_b");
    view.rerender(<DropsClient initialDrops={[]} creatorRailProfiles={[]} />);
    expect(collection().querySelector('[data-drop-card-root]')).not.toBeNull();
    expect(screen.queryByText("9,000 GD")).toBeNull();
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent("Checking your account");
    mockState.userProfile = buildTestProfile({ uid: "user_b", gumDropsBalance: 0 });
    view.rerender(<DropsClient initialDrops={[]} creatorRailProfiles={[]} />);
    expect(screen.getByRole("button", { name: "Open wallet" })).toHaveTextContent("0 GD");
    await userEvent.click(screen.getByRole("button", { name: "Open wallet" }));
    expect(mockState.openPurchaseModal).toHaveBeenCalledTimes(1);
    expect(mockState.openAuthModal).not.toHaveBeenCalled();
  });

  it("shows known source failure instead of claiming product restocking and recovers the next loaded result", () => {
    mockState.feed.error = "Failed to load drops";
    const view = renderDiscovery();
    expect(screen.getByRole("alert")).toHaveTextContent("couldn’t load");
    expect(screen.queryByText(/restocked|Sealed for now|next KandyDrop/i)).toBeNull();
    mockState.feed.error = null;
    mockState.feed.drops = [buildTestDrop()];
    view.rerender(<DropsClient initialDrops={[]} creatorRailProfiles={[]} />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(collection().querySelector('[data-drop-card-root]')).not.toBeNull();
    expect(mockState.trackEvent.mock.calls.filter(([name]) => name === "drops_page_viewed")).toHaveLength(1);
  });

  it("renders actual useDrops HTTP failure, retained data and next valid recovery without adding requests", async () => {
    mockState.useActualFeed = true;
    let now = Date.now();
    const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
    const first = buildTestDrop({ id: "actual_feed_first", title: "First fetched release" });
    const next = buildTestDrop({ id: "actual_feed_next", title: "Recovered fetched release" });
    const responses = [
      new Response(JSON.stringify({ error: "Public collection unavailable" }), { status: 500 }),
      new Response(JSON.stringify({ drops: [first], nextCursor: null }), { status: 200 }),
      new Response(JSON.stringify({ error: "Refresh failed" }), { status: 500 }),
      new Response(JSON.stringify({ drops: [next], nextCursor: null }), { status: 200 }),
    ];
    const fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/api/drops/actual_feed_first/click" && options?.method === "POST") return new Response("{}", { status: 200 });
      if (url !== "/api/drops?limit=12") throw new Error("Unexpected request: " + url);
      const response = responses.shift();
      if (!response) throw new Error("Unexpected additional feed request");
      return response;
    });
    vi.stubGlobal("fetch", fetch);
    const view = render(<SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false, dedupingInterval: 0 }}><DropsClient initialDrops={[]} creatorRailProfiles={[]} /></SWRConfig>);
    try {
      await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("couldn’t load"));
      expect(collection().querySelector('[data-drop-card-root]')).toBeNull();
      expect(screen.queryByText(/restocked|Sealed for now/i)).toBeNull();
      expect(fetch).toHaveBeenCalledTimes(1);
      act(() => { window.dispatchEvent(new Event("focus")); });
      await waitFor(() => expect(collection().querySelector('[data-drop-card-root]')).not.toBeNull());
      expect(screen.queryByRole("alert")).toBeNull();
      expect(collection()).toHaveTextContent("First fetched release");
      expect(fetch).toHaveBeenCalledTimes(2);
      now += 7_000;
      act(() => { window.dispatchEvent(new Event("focus")); });
      await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("keep browsing"));
      expect(collection()).toHaveTextContent("First fetched release");
      await userEvent.click(collection().querySelector('button[aria-label="Preview First fetched release"]') as HTMLButtonElement);
      expect(mockState.push).toHaveBeenCalledWith("/drops/actual_feed_first/preview?source_component=compact_drop_card");
      expect(fetch.mock.calls.filter(([url]) => url === "/api/drops?limit=12")).toHaveLength(3);
      expect(fetch.mock.calls.filter(([url]) => url.endsWith("/click"))).toEqual([["/api/drops/actual_feed_first/click", { method: "POST" }]]);
      now += 7_000;
      act(() => { window.dispatchEvent(new Event("focus")); });
      await waitFor(() => expect(collection()).toHaveTextContent("Recovered fetched release"));
      expect(collection()).not.toHaveTextContent("First fetched release");
      expect(screen.queryByRole("alert")).toBeNull();
      expect(fetch).toHaveBeenCalledTimes(5);
      expect(fetch.mock.calls.filter(([url]) => url === "/api/drops?limit=12")).toHaveLength(4);
      expect(responses).toHaveLength(0);
    } finally {
      view.unmount(); clock.mockRestore(); mockState.useActualFeed = false;
    }
  });

  it("keeps loaded records actionable during a refresh failure", async () => {
    const drop = buildTestDrop();
    mockState.feed.drops = [drop];
    mockState.feed.error = "Failed to load drops";
    const view = renderDiscovery();
    expect(screen.getByRole("alert")).toHaveTextContent("keep browsing");
    const cover = collection().querySelector('button[aria-label="Preview Public Beta Drop"]') as HTMLButtonElement;
    await userEvent.click(cover);
    expect(mockState.push).toHaveBeenCalledWith("/drops/drop_1/preview?source_component=compact_drop_card");
    expect(mockState.feed.setSize).not.toHaveBeenCalled();
    mockState.feed.error = null;
    view.rerender(<DropsClient initialDrops={[]} creatorRailProfiles={[]} />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(collection().querySelector('[data-drop-card-root]')).not.toBeNull();
  });

  it("renders actual initial loading without product-empty copy", () => {
    mockState.feed.loading = true;
    renderDiscovery();
    expect(screen.getByRole("status")).toHaveTextContent("Loading Drops");
    expect(screen.queryByText(/restocked|Sealed for now|no loaded releases./i)).toBeNull();
  });

  it("keeps a selected later category visible after collapse and clears the actual filter without fabricated Featured absence", async () => {
    mockState.feed.drops = [buildTestDrop({ tags: ["Spicy"] })];
    renderDiscovery();
    await userEvent.click(screen.getByRole("button", { name: "Show all Drop filters" }));
    await userEvent.click(screen.getByRole("button", { name: "Sweet" }));
    expect(screen.getByRole("button", { name: "Sweet" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Sealed for now")).toBeNull();
    expect(screen.getByText("No loaded Drops match these filters.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    expect(collection().querySelector('[data-drop-card-root]')).not.toBeNull();
    expect(mockState.feed.setSize).not.toHaveBeenCalled();
    const categoryEvents = mockState.trackEvent.mock.calls.filter(([name]) => name === "drops_category_selected");
    expect(categoryEvents.map(([, payload]) => payload.category)).toEqual(["Sweet", "All"]);
  });

  it("preserves the scoped debounced search, sanitized event payload and clicked result source", async () => {
    const drop = buildTestDrop({ id: "sugar_drop", title: "Sugar", description: "Fan mail fan@example.com" });
    mockState.feed.drops = [drop];
    renderDiscovery();
    const input = screen.getByRole("searchbox", { name: "Search Drops" });
    await userEvent.click(input);
    await userEvent.type(input, "Sugar");
    await waitFor(() => expect(screen.getByRole("region", { name: 'Results for "Sugar"' })).toBeInTheDocument(), { timeout: 2000 });
    const results = screen.getByRole("region", { name: 'Results for "Sugar"' });
    await userEvent.click(results.querySelector('button[aria-label="Preview Sugar"]') as HTMLButtonElement);
    expect(mockState.push).toHaveBeenCalledWith("/drops/sugar_drop/preview?source_component=compact_drop_card");
    const events = mockState.trackEvent.mock.calls.filter(([name]) => String(name).startsWith("search_"));
    expect(events.some(([name]) => name === "search_focused")).toBe(true);
    const click = events.find(([name]) => name === "search_result_clicked");
    expect(click?.[1]).toMatchObject({ result_id: "sugar_drop", source_component: "compact_drop_card", raw_query_stored: false });
    expect(JSON.stringify(events)).not.toContain('"Sugar"');
    expect(mockState.feed.setSize).not.toHaveBeenCalled();
  });

  it("retains both guest entry actions in the actual account row", async () => {
    renderDiscovery();
    await userEvent.click(screen.getByRole("button", { name: "Open profile menu" }));
    await userEvent.click(screen.getByRole("button", { name: "Open wallet" }));
    expect(mockState.openAuthModal.mock.calls).toEqual([["signup"], ["signup"]]);
    expect(mockState.openPurchaseModal).not.toHaveBeenCalled();
    expect(mockState.openProfileSidebar).not.toHaveBeenCalled();
  });

  it("uses actual identity presence and distinguishes unavailable balance from a known zero in the existing view model", () => {
    const model = buildAccountOverviewViewModel({ authLoading: false, isAuthenticated: true, userDisplayName: null, userEmail: null, userPhotoURL: null, profileBalance: null });
    expect(model.state).toBe("authenticated");
    expect(model.balanceLabel).toBe("Balance unavailable");
    expect(buildAccountOverviewViewModel({ authLoading: false, isAuthenticated: true, userDisplayName: "Collector", userEmail: null, userPhotoURL: null, profileBalance: 0 }).balanceLabel).toBe("0 GD");
  });

  it("does not show the previous account's owned/affordable Featured cover during actor change, then recovers", async () => {
    const drop = buildTestDrop();
    mockState.identityUser = buildTestUser();
    mockState.userProfile = buildTestProfile({ unlockedContent: [drop.id], gumDropsBalance: 9000 });
    const select = vi.fn();
    const view = render(<FeaturedCarousel drops={[drop]} onSelectDrop={select} />);
    expect(view.container.querySelector('[data-featured-drop-affordability]')).toHaveAttribute("data-featured-drop-affordability", "owned");
    mockState.identityUser = buildTestUser("user_b");
    view.rerender(<FeaturedCarousel drops={[drop]} onSelectDrop={select} />);
    expect(view.container.querySelector('[data-featured-drop-affordability]')).toHaveAttribute("data-featured-drop-affordability", "pending");
    expect(view.container.querySelector('img')).toHaveClass("blur-[10px]");
    expect(screen.queryByRole("button", { name: "View Content" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Refill to unwrap" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Check access" }));
    expect(select).toHaveBeenCalledExactlyOnceWith(drop, "compact_featured_carousel");
    expect(mockState.openPurchaseModal).not.toHaveBeenCalled();
    mockState.userProfile = buildTestProfile({ uid: "user_b", gumDropsBalance: 0 });
    view.rerender(<FeaturedCarousel drops={[drop]} onSelectDrop={select} />);
    expect(view.container.querySelector('[data-featured-drop-affordability]')).toHaveAttribute("data-featured-drop-affordability", "insufficient");
    expect(screen.getByRole("button", { name: "Refill to unwrap" })).toBeInTheDocument();
    mockState.userProfile = buildTestProfile({ uid: "user_b", gumDropsBalance: 1000 });
    view.rerender(<FeaturedCarousel drops={[drop]} onSelectDrop={select} />);
    expect(view.container.querySelector('[data-featured-drop-affordability]')).toHaveAttribute("data-featured-drop-affordability", "sufficient");
    expect(view.container.querySelector('img')).not.toHaveClass("blur-[10px]");
  });

  it.each(["guest", "affordable", "refill", "creator"])("preserves the actual Featured %s action/source/cover contract", async (mode) => {
    const drop = buildTestDrop({ creatorId: mode === "creator" ? "user_1" : "other_creator", tags: ["Cherry"] });
    if (mode !== "guest") {
      mockState.identityUser = buildTestUser();
      mockState.userProfile = buildTestProfile({ gumDropsBalance: mode === "refill" ? 0 : 1000, role: mode === "creator" ? "creator" : "user" });
    }
    const select = vi.fn();
    const view = render(<FeaturedCarousel drops={[drop]} onSelectDrop={select} />);
    const state = view.container.querySelector('[data-featured-drop-cta-state]');
    const expected = mode === "guest" ? "create_profile" : mode === "refill" ? "refill" : mode === "creator" ? "preview" : "unwrap";
    expect(state).toHaveAttribute("data-featured-drop-cta-state", expected);
    await userEvent.click(view.container.querySelector('button') as HTMLButtonElement);
    expect(select).toHaveBeenCalledWith(drop, "compact_featured_carousel");
    const clicks = mockState.trackEvent.mock.calls.filter(([name]) => name === "featured_slide_clicked");
    expect(clicks).toHaveLength(1);
    expect(clicks[0][1]).toMatchObject({ drop_id: drop.id, source_component: "compact_featured_carousel", featured_cta_accent: "cherry" });
    expect(mockState.openPurchaseModal).not.toHaveBeenCalled();
    expect(mockState.openAuthModal).not.toHaveBeenCalled();
  });

  it.each([10, 11])("retains the actual Featured %s-unwrap threshold and safe cover", (count) => {
    const drop = buildTestDrop({ totalUnlocks: count });
    const view = render(<FeaturedCarousel drops={[drop]} onSelectDrop={vi.fn()} />);
    expect(view.container.querySelector('[data-featured-social-proof-type]')).toHaveAttribute("data-featured-social-proof-type", count > 10 ? "unwraps" : "views");
    expect(view.container.querySelector('img')).toHaveAttribute("src", "/test-cover.jpg");
    expect(view.container.innerHTML).not.toContain("/locked-content.jpg");
  });
});

describe("Featured carousel deliberate selection and inactive actions", () => {
  beforeEach(() => {
    mockState.identityUser = null;
    mockState.userProfile = null;
    mockState.loading = false;
    mockState.trackEvent.mockReset();
    mockState.emblaApi = null;
    vi.useFakeTimers();
    vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });
  afterEach(() => {
    mockState.emblaApi = null;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function controlledEmbla() {
    let selected = 0;
    const listeners = new Map<string, Set<() => void>>();
    const emit = (name: string) => { for (const listener of listeners.get(name) ?? []) listener(); };
    const api = {
      selectedScrollSnap: vi.fn(() => selected),
      scrollTo: vi.fn((index: number, _jump?: boolean) => { selected = index; emit("select"); }),
      scrollNext: vi.fn(() => { selected = (selected + 1) % 2; emit("select"); }),
      on: vi.fn((name: string, callback: () => void) => { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name)!.add(callback); return api; }),
      off: vi.fn((name: string, callback: () => void) => { listeners.get(name)?.delete(callback); return api; }),
    };
    mockState.emblaApi = api as unknown as EmblaCarouselType;
    return { api, reInit(index: number) { selected = index; emit("reInit"); }, listenerCount() { return [...listeners.values()].reduce((sum, entries) => sum + entries.size, 0); } };
  }
  function featuredPair() {
    return [buildTestDrop({ id: "featured_a", title: "First featured release" }), buildTestDrop({ id: "featured_b", title: "Second featured release" })];
  }
  function slides(container: HTMLElement) { return [...container.querySelectorAll<HTMLElement>("[data-featured-drop-affordability]")]; }

  it("keeps the focused release and action stable instead of rotating on a timer", () => {
    const embla = controlledEmbla(), pair = featuredPair(), select = vi.fn();
    const view = render(<FeaturedCarousel drops={pair} onSelectDrop={select} />);
    act(() => vi.advanceTimersByTime(0));
    const cover = screen.getByRole("button", { name: "Preview First featured release" });
    cover.focus();
    act(() => vi.advanceTimersByTime(11000));
    expect(embla.api.scrollNext).not.toHaveBeenCalled();
    expect(cover).toHaveFocus();
    expect(slides(view.container)[0]).toHaveAttribute("aria-hidden", "false");
    expect(select).not.toHaveBeenCalled();
    cover.blur();
    act(() => vi.advanceTimersByTime(11000));
    expect(embla.api.scrollNext).not.toHaveBeenCalled();
  });

  it("rejects an inactive release's pointer actions and admits that same release after deliberate selection", () => {
    controlledEmbla();
    const pair = featuredPair(), select = vi.fn(), view = render(<FeaturedCarousel drops={pair} onSelectDrop={select} />);
    act(() => vi.advanceTimersByTime(0));
    const inactive = slides(view.container)[1];
    const inactiveButtons = [...inactive.querySelectorAll<HTMLButtonElement>("button")];
    for (const button of inactiveButtons) fireEvent.click(button);
    expect(select).not.toHaveBeenCalled();
    expect(mockState.trackEvent.mock.calls.filter(([event]) => event === "featured_slide_clicked")).toHaveLength(0);
    expect(inactive).toHaveAttribute("inert");
    for (const button of inactiveButtons) { expect(button).toBeDisabled(); expect(button).toHaveAttribute("tabindex", "-1"); }
    fireEvent.click(screen.getByRole("button", { name: "Go to featured Drop 2" }));
    expect(inactive).not.toHaveAttribute("inert");
    const cover = screen.getByRole("button", { name: "Preview Second featured release" });
    expect(cover).toBeEnabled();
    fireEvent.click(cover);
    expect(select).toHaveBeenCalledExactlyOnceWith(pair[1], "compact_featured_carousel");
    const clicks = mockState.trackEvent.mock.calls.filter(([event]) => event === "featured_slide_clicked");
    expect(clicks).toHaveLength(1);
    expect(clicks[0][1]).toMatchObject({ drop_id: pair[1].id, position: 2, featured_rank: 2, source_component: "compact_featured_carousel" });
  });

  it.each([false, true])("uses the existing reduced-motion preference (%s) for manual selection", (reduced) => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const embla = controlledEmbla();
    render(<FeaturedCarousel drops={featuredPair()} onSelectDrop={vi.fn()} />);
    act(() => vi.advanceTimersByTime(0));
    fireEvent.click(screen.getByRole("button", { name: "Go to featured Drop 2" }));
    const [index, jump] = embla.api.scrollTo.mock.calls.at(-1)!;
    expect(index).toBe(1);
    expect(jump ?? false).toBe(reduced);
    expect(embla.api.scrollNext).not.toHaveBeenCalled();
  });

  it("follows real selected-snap/reInit changes and disposes the original listeners on unmount", () => {
    const embla = controlledEmbla(), pair = featuredPair(), select = vi.fn();
    const view = render(<FeaturedCarousel drops={pair} onSelectDrop={select} />);
    act(() => vi.advanceTimersByTime(0));
    act(() => embla.reInit(1));
    expect(slides(view.container)[0]).toHaveAttribute("aria-hidden", "true");
    expect(slides(view.container)[1]).toHaveAttribute("aria-hidden", "false");
    fireEvent.click(screen.getByRole("button", { name: "Preview Second featured release" }));
    expect(select).toHaveBeenCalledExactlyOnceWith(pair[1], "compact_featured_carousel");
    expect(embla.listenerCount()).toBe(2);
    view.unmount();
    expect(embla.listenerCount()).toBe(0);
    act(() => { embla.reInit(0); vi.advanceTimersByTime(11000); });
    expect(select).toHaveBeenCalledTimes(1);
    expect(embla.api.scrollNext).not.toHaveBeenCalled();
  });

  it("clamps a removed selected release and recovers the remaining release's real action", () => {
    const embla = controlledEmbla(), pair = featuredPair(), select = vi.fn();
    const view = render(<FeaturedCarousel drops={pair} onSelectDrop={select} />);
    act(() => { vi.advanceTimersByTime(0); embla.reInit(1); });
    view.rerender(<FeaturedCarousel drops={[pair[0]]} onSelectDrop={select} />);
    act(() => vi.advanceTimersByTime(0));
    expect(embla.api.scrollTo).toHaveBeenLastCalledWith(0, true);
    fireEvent.click(screen.getByRole("button", { name: "Preview First featured release" }));
    expect(select).toHaveBeenCalledExactlyOnceWith(pair[0], "compact_featured_carousel");
    expect(screen.queryByRole("button", { name: "Go to featured Drop 2" })).toBeNull();
  });
});
