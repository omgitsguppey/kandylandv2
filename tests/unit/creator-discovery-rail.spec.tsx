// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreatorDiscoveryRail } from "@/components/CreatorDiscoveryRail";
import type { CreatorDiscoveryProfile } from "@/lib/creator-public-pages";

const mockState = vi.hoisted(() => ({
  authFetch: vi.fn(),
  loading: false,
  openAuthModal: vi.fn(),
  dispatchActivitySync: vi.fn(),
  trackEvent: vi.fn(),
  user: null as { uid: string } | null,
}));

vi.mock("next/image", () => ({
  default: ({ alt, fetchPriority, preload: _preload, ...props }: Record<string, unknown>) => {
    const priority = fetchPriority === "high" || fetchPriority === "low" || fetchPriority === "auto"
      ? fetchPriority
      : undefined;
    return <img alt={String(alt)} fetchPriority={priority} {...props} />;
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuthIdentity: () => ({ user: mockState.user }),
  useAuthLoading: () => ({ loading: mockState.loading }),
}));

vi.mock("@/context/UIContext", () => ({
  useUIActions: () => ({ openAuthModal: mockState.openAuthModal }),
}));

vi.mock("@/lib/authFetch", () => ({
  authFetch: (...args: unknown[]) => mockState.authFetch(...args),
}));

vi.mock("@/lib/firebase-data", () => ({
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({})),
  onSnapshot: vi.fn(() => vi.fn()),
}));

vi.mock("@/lib/self-healing", () => ({
  createAutoHealingObserver: (subscribe: () => () => void) => ({
    cleanup: subscribe(),
    triggerReconnect: vi.fn(),
  }),
}));

vi.mock("@/lib/client-error-reporting", () => ({
  reportClientIssue: vi.fn(),
}));

vi.mock("@/lib/activity-sync", () => ({
  dispatchActivitySync: () => mockState.dispatchActivitySync(),
}));

vi.mock("@/lib/telemetry", () => ({
  trackEvent: (...args: unknown[]) => mockState.trackEvent(...args),
}));

const creators: CreatorDiscoveryProfile[] = [
  {
    uid: "creator-a",
    displayName: "Jess Ray",
    username: "jessirayxo",
    photoURL: "https://cdn.example.com/jessi.jpg",
    bio: "Creator",
    isVerified: true,
    activeDropCount: 3,
    followerCount: 365,
  },
  {
    uid: "creator-b",
    displayName: "Zayla Nimo",
    username: "zaylanimo",
    photoURL: "https://cdn.example.com/zayla.jpg",
    bio: "Creator",
    isVerified: true,
    activeDropCount: 2,
    followerCount: 88,
  },
];

class ImmediateIntersectionObserver {
  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe = (target: Element) => {
    this.callback([
      {
        target,
        isIntersecting: true,
        intersectionRatio: 1,
      } as IntersectionObserverEntry,
    ], this as unknown as IntersectionObserver);
  };

  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = () => [];
}

describe("CreatorDiscoveryRail home spotlight", () => {
  beforeEach(() => {
    mockState.authFetch.mockReset();
    mockState.dispatchActivitySync.mockReset();
    mockState.loading = false;
    mockState.openAuthModal.mockReset();
    mockState.trackEvent.mockReset();
    mockState.user = null;
    vi.stubGlobal("IntersectionObserver", ImmediateIntersectionObserver);
    vi.stubGlobal("requestIdleCallback", vi.fn(() => 1));
    vi.stubGlobal("cancelIdleCallback", vi.fn());
  });

  it("renders the redesigned home spotlight copy and stable image-led creator cards", () => {
    render(<CreatorDiscoveryRail surface="home" initialCreators={creators} />);
    const oldSupportCopy = ["Follow creators to unlock drops", "and private requests."].join(" ");

    expect(screen.getByText("CREATOR SPOTLIGHT")).toBeInTheDocument();
    expect(screen.getByText("Follow creators to unwrap drops and exclusive experiences.")).toBeInTheDocument();
    expect(screen.queryByText(oldSupportCopy)).not.toBeInTheDocument();

    const jessiImage = screen.getByAltText("jessirayxo");
    expect(jessiImage).toHaveAttribute("width", "112");
    expect(jessiImage).toHaveAttribute("height", "112");
    expect(jessiImage).toHaveAttribute("sizes");
    expect(jessiImage).toHaveAttribute("data-creator-spotlight-image", "stable-frame");
    expect(jessiImage.closest("[data-creator-spotlight-avatar-frame]")).toHaveAttribute("data-creator-spotlight-avatar-frame", "fixed");
    expect(screen.getAllByRole("button", { name: "Follow" })).toHaveLength(2);
  });

  it("preserves follow behavior and emits one canonical follow attempt per click", async () => {
    mockState.user = { uid: "fan-1" };
    mockState.authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        relationship: {
          creatorId: "creator-a",
          following: true,
          followerCount: 366,
        },
      }),
    });

    render(<CreatorDiscoveryRail surface="home" initialCreators={creators} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Follow" })[0]);

    await waitFor(() => {
      expect(mockState.authFetch).toHaveBeenCalledWith("/api/creator/relationships", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ creatorId: "creator-a", action: "follow" }),
      }));
    });
    expect(mockState.trackEvent.mock.calls.filter(([eventName]) => eventName === "creator_follow_attempted")).toHaveLength(1);
    expect(mockState.trackEvent.mock.calls.filter(([eventName]) => eventName === "creator_follow_succeeded")).toHaveLength(1);
    expect(mockState.dispatchActivitySync).toHaveBeenCalledTimes(1);
  });

  it("does not duplicate spotlight or card view telemetry across rerenders", async () => {
    const { rerender } = render(<CreatorDiscoveryRail surface="home" initialCreators={creators} />);

    await waitFor(() => {
      expect(mockState.trackEvent.mock.calls.filter(([eventName]) => eventName === "creator_discovery_surface_viewed")).toHaveLength(1);
      expect(mockState.trackEvent.mock.calls.filter(([eventName]) => eventName === "creator_rail_impression")).toHaveLength(2);
      expect(mockState.trackEvent.mock.calls.filter(([eventName]) => eventName === "creator_card_viewed")).toHaveLength(2);
    });

    rerender(<CreatorDiscoveryRail surface="home" initialCreators={creators} />);

    expect(mockState.trackEvent.mock.calls.filter(([eventName]) => eventName === "creator_discovery_surface_viewed")).toHaveLength(1);
    expect(mockState.trackEvent.mock.calls.filter(([eventName]) => eventName === "creator_rail_impression")).toHaveLength(2);
    expect(mockState.trackEvent.mock.calls.filter(([eventName]) => eventName === "creator_card_viewed")).toHaveLength(2);
  });
});
