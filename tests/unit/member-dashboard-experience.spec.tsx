// @vitest-environment happy-dom

import { useLayoutEffect } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DashboardClient from "@/app/dashboard/DashboardClient";
import DashboardLayout from "@/app/dashboard/layout";
import { KandyRecentActivityExperience } from "@/components/creative-tim/kandydrops/activity/KandyRecentActivityExperience";
import { KandyCreatorDiscoveryCard } from "@/components/creative-tim/kandydrops/creator-discovery/CreatorDiscoveryPresentation";
import { RecentActivityFeed, type ActivityItem } from "@/components/Dashboard/RecentActivityFeed";
import { ACTIVITY_SYNC_EVENT } from "@/lib/activity-sync";
import { buildCanonicalUserFixture, buildCanonicalGumDropLedgerFixture } from "@/lib/testing/canonical-test-factories";
import type { UserProfile } from "@/types/db";

const state = vi.hoisted(() => ({
  user: null as { uid: string } | null,
  userProfile: null as Partial<UserProfile> | null,
  loading: false,
  openPurchaseModal: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  trackEvent: vi.fn(),
  activityFetch: vi.fn(),
  activityIssue: vi.fn(),
  unsubscribeActivity: vi.fn(),
  activityRuntimeSetup: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({ useAuth: () => state }));
vi.mock("@/context/UIContext", () => ({ useUI: () => ({ openPurchaseModal: state.openPurchaseModal }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: state.replace, push: state.push }), usePathname: () => "/dashboard" }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/hooks/useDrops", () => ({ useDrops: () => ({ drops: [], nowMs: 1_000 }) }));
vi.mock("@/lib/telemetry", () => ({ trackEvent: (...args: unknown[]) => state.trackEvent(...args) }));
vi.mock("@/components/CreatorDiscoveryRail", () => ({ CreatorDiscoveryRail: () => null }));
vi.mock("@/components/Dashboard/DailyCheckIn", () => ({ DailyCheckIn: () => <div>Daily check-in control</div> }));
vi.mock("@/components/Dashboard/CollectionList", () => ({
  CollectionList: ({ userProfile }: { userProfile: Partial<UserProfile> }) => <div data-testid="collection-owner">Collection owner {userProfile.uid}</div>,
}));

function account(uid: string, values: Partial<UserProfile> = {}) {
  state.user = { uid };
  state.userProfile = buildCanonicalUserFixture({ uid, displayName: uid, unlockedContent: [], gumDropsBalance: 50, ...values });
  state.loading = false;
}

const surface = () => <DashboardLayout><DashboardClient drops={[]} creatorRailProfiles={[]} /></DashboardLayout>;

beforeEach(() => {
  state.user = null;
  state.userProfile = null;
  state.loading = false;
  state.openPurchaseModal.mockReset();
  state.replace.mockReset();
  state.push.mockReset();
  state.trackEvent.mockReset();
  state.activityFetch.mockReset();
  state.activityIssue.mockReset();
  state.unsubscribeActivity.mockReset();
  state.activityRuntimeSetup.mockReset().mockReturnValue({});
});
afterEach(cleanup);

describe("Member dashboard binds its rendered account and redirect to resolved identity", () => {
  it("does not publish a retained profile while the resolved actor is signed out", () => {
    account("member-a");
    state.user = null;
    const view = render(surface());
    expect(view.container.querySelector('[data-dashboard-surface="user_dashboard"]')).toBeNull();
    expect(screen.queryByTestId("collection-owner")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refill GumDrops" })).not.toBeInTheDocument();
    expect(state.trackEvent).not.toHaveBeenCalled();
    expect(state.replace).toHaveBeenCalledExactlyOnceWith("/");
  });

  it("masks actor A immediately during A to B and recovers only on B's matching profile", () => {
    account("member-a", { unlockedContent: ["a-one", "a-two"], gumDropsBalance: 900 });
    const view = render(surface());
    expect(screen.getByTestId("collection-owner")).toHaveTextContent("member-a");
    state.user = { uid: "member-b" };
    view.rerender(surface());
    expect(view.container.querySelector('[data-dashboard-surface="user_dashboard"]')).toBeNull();
    expect(screen.queryByTestId("collection-owner")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refill GumDrops" })).not.toBeInTheDocument();
    expect(state.trackEvent).toHaveBeenCalledTimes(1);
    account("member-b", { unlockedContent: ["b-one"], gumDropsBalance: 20 });
    view.rerender(surface());
    expect(view.container.querySelector('[data-dashboard-surface="user_dashboard"]')).not.toBeNull();
    expect(screen.getByTestId("collection-owner")).toHaveTextContent("member-b");
    expect(state.trackEvent).toHaveBeenCalledTimes(2);
  });

  it("does not redirect B using A's retained Creator role", () => {
    account("creator-a", { role: "creator" });
    state.user = { uid: "member-b" };
    const view = render(surface());
    expect(state.replace).not.toHaveBeenCalled();
    expect(view.container.querySelector('[data-dashboard-surface="creator_redirect"]')).toBeNull();
    account("member-b");
    view.rerender(surface());
    expect(screen.getByTestId("collection-owner")).toHaveTextContent("member-b");
    expect(state.replace).not.toHaveBeenCalled();
  });

  it("waits through unresolved auth before redirecting a matching Creator", () => {
    account("creator-a", { role: "creator" });
    state.loading = true;
    const view = render(surface());
    expect(state.replace).not.toHaveBeenCalled();
    expect(screen.queryByTestId("collection-owner")).not.toBeInTheDocument();
    state.loading = false;
    view.rerender(surface());
    expect(state.replace).toHaveBeenCalledExactlyOnceWith("/dashboard/creator");
    expect(view.container.querySelector('[data-dashboard-surface="creator_redirect"]')).not.toBeNull();
    expect(screen.queryByTestId("collection-owner")).not.toBeInTheDocument();
  });

  it("keeps the actual wallet control and rendered member collection for a matching actor", () => {
    account("member-a");
    render(surface());
    expect(screen.getByTestId("collection-owner")).toHaveTextContent("member-a");
    fireEvent.click(screen.getByRole("button", { name: "Refill GumDrops" }));
    expect(state.openPurchaseModal).toHaveBeenCalledTimes(1);
    expect(state.trackEvent).toHaveBeenCalledExactlyOnceWith("dashboard_viewed", undefined);
    expect(state.replace).not.toHaveBeenCalled();
  });

  it("keeps profile-only member updates in the same visit while presenting current source", () => {
    account("member-a");
    const view = render(surface());
    state.userProfile = { ...state.userProfile, gumDropsBalance: 75, unlockedContent: ["one"] };
    view.rerender(surface());
    expect(screen.getByTestId("collection-owner")).toHaveTextContent("member-a");
    expect(state.trackEvent).toHaveBeenCalledTimes(1);
    expect(state.replace).not.toHaveBeenCalled();
  });
});


vi.mock("next/link", () => ({ default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => <a href={href} {...props}>{children}</a> }));
vi.mock("next/image", () => ({ default: ({ alt, fill: _fill, preload: _preload, ...props }: Record<string, unknown>) => <img alt={String(alt)} {...props} /> }));
vi.mock("@/components/Feedback/ReportBugButton", () => ({ ReportBugButton: ({ context }: { context: string }) => <button type="button" data-report-context={context}>Report a bug</button> }));

describe("Member primary content and sourced presentation controls", () => {
  it("places the collection before daily rewards in the actual reading and focus order", () => {
    account("member-a");
    render(surface());
    const collection = screen.getByTestId("collection-owner");
    const daily = screen.getByText("Daily check-in control");
    expect(collection.compareDocumentPosition(daily) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.queryByText("The Drops waiting for you")).not.toBeInTheDocument();
  });

  function activityProps(overrides: Partial<React.ComponentProps<typeof KandyRecentActivityExperience>> = {}) {
    return {
      expanded: false, onToggleExpanded: vi.fn(), loadingSummary: false, summaryError: false, onRetry: vi.fn(), hasRecordedActivity: true,
      summaryActivity: null, activities: [], currentPage: 1, historyError: false, loadingHistory: false,
      searchValue: "", totalPages: 1, onSearchChange: vi.fn(), onNextPage: vi.fn(), onPreviousPage: vi.fn(),
      onUnwrapNow: vi.fn(), onOpenExperiences: vi.fn(), ...overrides,
    };
  }

  function transaction(id: string, type: "daily_reward" | "unlock_content", amount: number, label: string): ActivityItem {
    const timestamp = 1_700_000_000_000;
    return { id, timestamp, kind: "transaction", label, transaction: buildCanonicalGumDropLedgerFixture({ id, type, amount, timestamp, description: label }) };
  }

  it("keeps source transaction amounts and task status readable in the actual history rows", () => {
    const task: ActivityItem = { id: "task-one", timestamp: 1_700_000_000_000, kind: "task", label: "", taskEvent: { id: "task-one", type: "failed", title: "Daily task", reward: 30, progress: 0, maxProgress: 1, timestamp: 1_700_000_000_000 } };
    const props = activityProps({ expanded: true, activities: [transaction("reward-one", "daily_reward", 20, "Daily reward"), transaction("unlock-one", "unlock_content", 100, "Unwrapped a Drop"), task] });
    render(<KandyRecentActivityExperience {...props} />);
    expect(screen.getByText("Daily reward")).toBeInTheDocument();
    expect(screen.getByText("+20 GD")).toBeInTheDocument();
    expect(screen.getByText("-100 GD")).toBeInTheDocument();
    expect(screen.getByText("Task reset: Daily task")).toBeInTheDocument();
    expect(screen.getByText("Reset", { exact: true })).toBeInTheDocument();
  });

  it("delegates the disclosure and resolves its actual controlled content in every source state", () => {
    const props = activityProps({ summaryActivity: transaction("reward-one", "daily_reward", 20, "Daily reward") });
    const view = render(<KandyRecentActivityExperience {...props} />);
    const button = screen.getByRole("button", { name: "View all" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    const target = button.getAttribute("aria-controls");
    expect(target).toBeTruthy();
    expect(document.getElementById(String(target))).toContainElement(screen.getByText("Daily reward"));
    fireEvent.click(button);
    expect(props.onToggleExpanded).toHaveBeenCalledTimes(1);
    view.rerender(<KandyRecentActivityExperience {...props} expanded activities={[props.summaryActivity!]} />);
    expect(screen.getByRole("button", { name: "Collapse" })).toHaveAttribute("aria-expanded", "true");
    view.rerender(<KandyRecentActivityExperience {...props} hasRecordedActivity={false} />);
    expect(document.getElementById(String(target))).toContainElement(screen.getByText("Your recent unlocks, GumDrop changes, and task history will appear here."));
  });

  it("keeps search scoped to activity and delegates real page controls with correct boundaries", () => {
    const props = activityProps({ expanded: true, activities: [transaction("reward-one", "daily_reward", 20, "Daily reward")], totalPages: 3 });
    const view = render(<KandyRecentActivityExperience {...props} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search activity" }), { target: { value: "reward" } });
    expect(props.onSearchChange).toHaveBeenCalledExactlyOnceWith("reward");
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(props.onNextPage).toHaveBeenCalledTimes(1);
    view.rerender(<KandyRecentActivityExperience {...props} currentPage={3} searchValue="reward" />);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(props.onPreviousPage).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("searchbox", { name: "Search activity" })).toHaveValue("reward");
  });

  it("keeps missing history, a known empty result and a filtered no-result state distinct", () => {
    const props = activityProps({ expanded: true, historyError: true });
    const view = render(<KandyRecentActivityExperience {...props} />);
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load your full history right now.");
    expect(screen.queryByText("No activity has been recorded yet.")).not.toBeInTheDocument();
    view.rerender(<KandyRecentActivityExperience {...props} historyError={false} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("No activity has been recorded yet.")).toBeInTheDocument();
    view.rerender(<KandyRecentActivityExperience {...props} historyError={false} searchValue="missing" />);
    expect(screen.getByText("No activity matches your search yet.")).toBeInTheDocument();
  });

  it("keeps loading as pending rather than recorded empty and exposes its status", () => {
    const props = activityProps({ loadingSummary: true, hasRecordedActivity: false });
    const view = render(<KandyRecentActivityExperience {...props} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading recent activity");
    expect(screen.queryByText("Your recent unlocks, GumDrop changes, and task history will appear here.")).not.toBeInTheDocument();
    view.rerender(<KandyRecentActivityExperience {...props} loadingSummary={false} hasRecordedActivity expanded loadingHistory />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading activity");
    expect(screen.queryByText("No activity has been recorded yet.")).not.toBeInTheDocument();
  });

  it("preserves both empty activity recovery actions and their existing feedback context", () => {
    const props = activityProps({ hasRecordedActivity: false });
    render(<KandyRecentActivityExperience {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Unwrap now" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Experiences" }));
    expect(props.onUnwrapNow).toHaveBeenCalledTimes(1);
    expect(props.onOpenExperiences).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Report a bug" })).toHaveAttribute("data-report-context", "recent-activity-empty");
  });

  function creatorProps(overrides: Partial<React.ComponentProps<typeof KandyCreatorDiscoveryCard>> = {}) {
    return { creator: { uid: "creator-a", displayName: "Creator A", username: "creatora", photoURL: null, followerCount: 5 }, compact: true, surface: "dashboard" as const, position: 0, cardRef: vi.fn(), profileHref: "/creators/creatora", missingProfileReason: "", isPending: false, isSelf: false, onFollow: vi.fn(), onProfileClick: vi.fn(), ...overrides };
  }

  it("keeps canonical Creator profile and follow actions on the actual portrait composition", () => {
    const props = creatorProps();
    render(<KandyCreatorDiscoveryCard {...props} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/creators/creatora");
    expect(link).toHaveAttribute("data-creator-profile-route-source", "canonical-builder");
    fireEvent.click(link);
    fireEvent.click(screen.getByRole("button", { name: "Follow @creatora" }));
    expect(props.onProfileClick).toHaveBeenCalledTimes(1);
    expect(props.onFollow).toHaveBeenCalledTimes(1);
  });

  it("keeps pending, self and unavailable-profile Creator states from inventing actions", () => {
    const props = creatorProps({ isPending: true });
    const view = render(<KandyCreatorDiscoveryCard {...props} />);
    expect(screen.getByRole("button", { name: "Follow @creatora" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Follow @creatora" }));
    expect(props.onFollow).not.toHaveBeenCalled();
    view.rerender(<KandyCreatorDiscoveryCard {...props} isSelf />);
    expect(screen.queryByRole("button", { name: "Follow @creatora" })).not.toBeInTheDocument();
    view.rerender(<KandyCreatorDiscoveryCard {...props} isSelf profileHref={null} missingProfileReason="missing_canonical_username" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(view.container.querySelector('[data-creator-profile-missing-reason="missing_canonical_username"]')).toHaveAttribute("aria-disabled", "true");
    expect(props.onProfileClick).not.toHaveBeenCalled();
  });
});


vi.mock("@/lib/authFetch", () => ({ authFetch: (...args: unknown[]) => state.activityFetch(...args) }));
vi.mock("@/lib/client-error-reporting", () => ({ reportClientIssue: (...args: unknown[]) => state.activityIssue(...args), buildFirestoreClientIssueDetail: () => ({}) }));
vi.mock("@/lib/firebase-data", () => ({ get db() { return state.activityRuntimeSetup(); } }));
vi.mock("firebase/firestore", () => ({
  doc: (...parts: unknown[]) => parts,
  onSnapshot: (_reference: unknown, next: (snapshot: { data: () => unknown }) => void) => {
    queueMicrotask(() => next({ data: () => ({}) }));
    return state.unsubscribeActivity;
  },
}));
vi.mock("@/lib/self-healing", () => ({ createAutoHealingObserver: (subscribe: () => () => void) => ({ cleanup: subscribe(), triggerReconnect: vi.fn() }) }));

describe("Recent activity separates failed source reads from confirmed empty accounts", () => {
  const row = (id = "reward-one", label = "Daily reward"): ActivityItem => {
    const timestamp = 1_700_000_000_000;
    return { id, timestamp, kind: "transaction", label, transaction: buildCanonicalGumDropLedgerFixture({ id, type: "daily_reward", amount: 20, timestamp, description: label }) };
  };
  const reply = (body: unknown, status = 200, etag?: string) => new Response(JSON.stringify(body), { status, headers: etag ? { etag } : undefined });
  const unchanged = () => new Response(null, { status: 304 });
  function pending() {
    let resolve!: (value: Response) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<Response>((complete, fail) => { resolve = complete; reject = fail; });
    return { promise, resolve, reject };
  }
  const focus = () => act(() => window.dispatchEvent(new Event("focus")));
  const sync = () => act(() => window.dispatchEvent(new Event(ACTIVITY_SYNC_EVENT)));
  const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

  beforeEach(() => account("member-a"));

  it("shows a summary failure, dedupes an explicit pending retry and recovers on the next valid read", async () => {
    const recovery = pending();
    state.activityFetch.mockResolvedValueOnce(reply({ success: false }, 503)).mockReturnValueOnce(recovery.promise);
    render(<RecentActivityFeed />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/recent activity/i));
    expect(screen.queryByText("No recent activity")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unwrap now" })).not.toBeInTheDocument();
    const retry = screen.getByRole("button", { name: "Try again" });
    fireEvent.click(retry);
    focus();
    sync();
    expect(state.activityFetch).toHaveBeenCalledTimes(2);
    await act(async () => recovery.resolve(reply({ success: true, activities: [row()] }, 200, '"a-summary"')));
    expect(await screen.findByText("Daily reward")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(state.activityIssue).toHaveBeenCalledTimes(1);
    expect(state.trackEvent.mock.calls.filter(([event]) => event === "recent_activity_viewed")).toHaveLength(1);
  });

  it.each([{}, { activities: null }])("rejects a successful body without an actual activity array: %j", async body => {
    state.activityFetch.mockResolvedValueOnce(reply({ success: true, ...body })).mockResolvedValueOnce(reply({ success: true, activities: [] }));
    render(<RecentActivityFeed />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.queryByText("No recent activity")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No recent activity")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(state.activityFetch).toHaveBeenCalledTimes(2);
  });

  it("shows confirmed empty actions only after a successful array response", async () => {
    state.activityFetch.mockResolvedValueOnce(reply({ success: true, activities: [] }));
    render(<RecentActivityFeed />);
    expect(await screen.findByText("No recent activity")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Unwrap now" }));
    expect(state.push).toHaveBeenCalledExactlyOnceWith("/drops");
    expect(state.trackEvent).toHaveBeenCalledWith("navigation_click", { destination: "/drops", source: "recent_activity_empty" });
    expect(state.activityFetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("dedupes simultaneous initial refresh triggers and does not poll a confirmed empty source", async () => {
    const initial = pending();
    state.activityFetch.mockReturnValueOnce(initial.promise);
    render(<RecentActivityFeed />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading recent activity");
    focus();
    sync();
    expect(state.activityFetch).toHaveBeenCalledTimes(1);
    await act(async () => initial.resolve(reply({ success: true, activities: [] })));
    expect(screen.getByText("No recent activity")).toBeInTheDocument();
    await flush();
    expect(state.activityFetch).toHaveBeenCalledTimes(1);
  });

  it("retains a verified summary across refresh failure and settles a seeded ETag recovery", async () => {
    state.activityFetch.mockResolvedValueOnce(reply({ success: true, activities: [row()] }, 200, '"a-summary"')).mockResolvedValueOnce(reply({ success: false }, 503)).mockResolvedValueOnce(unchanged());
    render(<RecentActivityFeed />);
    expect(await screen.findByText("Daily reward")).toBeInTheDocument();
    focus();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText("Daily reward")).toBeInTheDocument();
    expect(screen.queryByText("No recent activity")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.getByText("Daily reward")).toBeInTheDocument();
    expect((state.activityFetch.mock.calls[2][1] as { headers: Headers }).headers.get("If-None-Match")).toBe('"a-summary"');
    expect(state.activityFetch).toHaveBeenCalledTimes(3);
  });

  it("does not turn an unseeded 304 into a confirmed empty account", async () => {
    state.activityFetch.mockResolvedValueOnce(unchanged()).mockResolvedValueOnce(reply({ success: true, activities: [] }));
    render(<RecentActivityFeed />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.queryByText("No recent activity")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No recent activity")).toBeInTheDocument();
    expect(state.activityFetch).toHaveBeenCalledTimes(2);
  });

  it("keeps expanded history failure separate from a verified empty summary and permits searched paged recovery", async () => {
    const history = pending();
    const rows = Array.from({ length: 6 }, (_, index) => row("row-" + index, "Reward " + index));
    state.activityFetch.mockImplementation((url: string) => url.includes("view=history") ? history.promise : Promise.resolve(reply({ success: true, activities: [] })));
    render(<RecentActivityFeed />);
    expect(await screen.findByText("No recent activity")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View all" }));
    expect(screen.getByRole("status")).toHaveTextContent("Loading activity");
    expect(screen.queryByText("No recent activity")).not.toBeInTheDocument();
    await act(async () => history.resolve(reply({ success: false }, 503)));
    expect(screen.getByRole("alert")).toHaveTextContent(/full history/i);
    expect(screen.getByText("Results unavailable")).toBeInTheDocument();
    expect(screen.queryByText("0 results")).not.toBeInTheDocument();
    state.activityFetch.mockImplementation((url: string) => Promise.resolve(reply({ success: true, activities: url.includes("view=history") ? rows : [rows[0]] })));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("5 on this page")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Reward 5")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search activity" }), { target: { value: "Reward 2" } });
    expect(screen.getByText("Reward 2")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(state.activityFetch.mock.calls.filter(([url]) => String(url).includes("view=history"))).toHaveLength(2);
  });

  it("retains loaded history with an explicit refresh failure and clears that notice on a valid refresh", async () => {
    let failHistory = false;
    state.activityFetch.mockImplementation((url: string) => Promise.resolve(url.includes("view=history") && failHistory ? reply({ success: false }, 503) : reply({ success: true, activities: [row()] })));
    render(<RecentActivityFeed />);
    expect(await screen.findByText("Daily reward")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View all" }));
    await waitFor(() => expect(screen.getByRole("searchbox", { name: "Search activity" })).toBeInTheDocument());
    await flush();
    failHistory = true;
    sync();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText("Daily reward")).toBeInTheDocument();
    failHistory = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.getByText("Daily reward")).toBeInTheDocument();
    expect(state.activityFetch.mock.calls.filter(([url]) => String(url).includes("view=history"))).toHaveLength(3);
  });

  it("does not release actor B's pending refresh lock when actor A's old request settles", async () => {
    const a = pending();
    const b = pending();
    state.activityFetch.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise).mockResolvedValue(reply({ success: true, activities: [row("unexpected", "Unexpected third read")] }));
    const view = render(<RecentActivityFeed />);
    expect(state.activityFetch).toHaveBeenCalledTimes(1);
    account("member-b");
    view.rerender(<RecentActivityFeed />);
    expect(state.activityFetch).toHaveBeenCalledTimes(2);
    await act(async () => a.reject(new Error("Actor A unavailable")));
    focus();
    expect(state.activityFetch).toHaveBeenCalledTimes(2);
    await act(async () => b.resolve(reply({ success: true, activities: [row("b-one", "Actor B reward")] })));
    expect(screen.getByText("Actor B reward")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Unexpected third read")).not.toBeInTheDocument();
  });

  it("retains the same actor's pending history through collapse and re-expansion without another read", async () => {
    const history = pending();
    state.activityFetch.mockImplementation((url: string) => url.includes("view=history") ? history.promise : Promise.resolve(reply({ success: true, activities: [row()] })));
    render(<RecentActivityFeed />);
    expect(await screen.findByText("Daily reward")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View all" }));
    fireEvent.click(screen.getByRole("button", { name: "Collapse" }));
    fireEvent.click(screen.getByRole("button", { name: "View all" }));
    await act(async () => history.resolve(reply({ success: true, activities: [row("history-one", "Retained history reward")] })));
    expect(screen.getByText("Retained history reward")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(state.activityFetch.mock.calls.filter(([url]) => String(url).includes("view=history"))).toHaveLength(1);
  });

  function CommitWitness({ observed }: { observed: string[] }) {
    useLayoutEffect(() => { observed.push(document.getElementById("recent-activity-content")?.textContent ?? ""); });
    return <RecentActivityFeed />;
  }

  it("does not display a confirmed empty result on B's first commit using A's retained loaded state", async () => {
    const b = pending();
    const observed: string[] = [];
    state.activityFetch.mockResolvedValueOnce(reply({ success: true, activities: [row()] })).mockReturnValueOnce(b.promise);
    const view = render(<CommitWitness observed={observed} />);
    expect(await screen.findByText("Daily reward")).toBeInTheDocument();
    observed.length = 0;
    account("member-b");
    view.rerender(<CommitWitness observed={observed} />);
    expect(observed[0]).toContain("Loading recent activity");
    expect(observed[0]).not.toContain("No recent activity");
    expect(observed[0]).not.toContain("Daily reward");
    await act(async () => b.resolve(reply({ success: true, activities: [] })));
    expect(screen.getByText("No recent activity")).toBeInTheDocument();
    expect(state.activityFetch).toHaveBeenCalledTimes(2);
  });

  it("does not attach A's summary failure to B's first commit", async () => {
    const b = pending();
    const observed: string[] = [];
    state.activityFetch.mockResolvedValueOnce(reply({ success: false }, 503)).mockReturnValueOnce(b.promise);
    const view = render(<CommitWitness observed={observed} />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/unavailable/i));
    observed.length = 0;
    account("member-b");
    view.rerender(<CommitWitness observed={observed} />);
    expect(observed[0]).toContain("Loading recent activity");
    expect(observed[0]).not.toContain("unavailable");
    await act(async () => b.resolve(reply({ success: true, activities: [row("b-one", "Actor B reward")] })));
    expect(screen.getByText("Actor B reward")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not attach A's expanded history failure or empty result to B's first commit", async () => {
    const bSummary = pending();
    const bHistory = pending();
    const observed: string[] = [];
    state.activityFetch.mockImplementation((url: string) => Promise.resolve(url.includes("view=history") ? reply({ success: false }, 503) : reply({ success: true, activities: [row()] })));
    const view = render(<CommitWitness observed={observed} />);
    expect(await screen.findByText("Daily reward")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View all" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/full history/i));
    state.activityFetch.mockImplementation((url: string) => url.includes("view=history") ? bHistory.promise : bSummary.promise);
    observed.length = 0;
    account("member-b");
    view.rerender(<CommitWitness observed={observed} />);
    expect(observed[0]).toContain("Loading activity");
    expect(observed[0]).not.toContain("full history right now");
    expect(observed[0]).not.toContain("No activity has been recorded");
    await act(async () => { bSummary.resolve(reply({ success: true, activities: [] })); bHistory.resolve(reply({ success: true, activities: [row("b-history", "Actor B history")] })); });
    expect(screen.getByText("Actor B history")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("disposes refresh listeners and ignores a late summary failure after unmount", async () => {
    const initial = pending();
    state.activityFetch.mockReturnValueOnce(initial.promise);
    const view = render(<RecentActivityFeed />);
    await flush();
    view.unmount();
    await act(async () => initial.reject(new Error("Late unmounted source")));
    focus();
    sync();
    expect(state.activityFetch).toHaveBeenCalledTimes(1);
    expect(state.unsubscribeActivity).toHaveBeenCalledTimes(1);
    expect(state.activityIssue.mock.calls.every(([issue]) => issue.detail.userId === "member-a")).toBe(true);
  });
});


describe("Recent activity subscription setup belongs to its live account effect", () => {
  const response = (activities: ActivityItem[]) => new Response(JSON.stringify({ success: true, activities }), { status: 200 });
  const activity = (uid: string): ActivityItem => {
    const timestamp = 1_700_000_000_000;
    return { id: uid + "-reward", timestamp, kind: "transaction", label: uid + " reward", transaction: buildCanonicalGumDropLedgerFixture({ id: uid + "-reward", type: "daily_reward", amount: 20, timestamp, description: uid + " reward" }) };
  };
  const settled = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
  beforeEach(async () => {
    account("member-a");
    await Promise.all([import("@/lib/firebase-data"), import("firebase/firestore")]);
    await settled();
    state.activityRuntimeSetup.mockClear();
    state.activityIssue.mockClear();
  });

  it("reports a live setup failure once and recovers a subsequent valid account subscription", async () => {
    const failure = new Error("Live actor A runtime setup rejected");
    state.activityRuntimeSetup.mockImplementationOnce(() => { throw failure; });
    state.activityFetch.mockResolvedValueOnce(response([activity("member-a")])).mockResolvedValueOnce(response([activity("member-b")]));
    const view = render(<RecentActivityFeed />);
    await waitFor(() => expect(state.activityIssue).toHaveBeenCalledTimes(1));
    expect(state.activityIssue).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ channel: "firebase", message: "Recent activity runtime setup failed", detail: { userId: "member-a" }, error: failure }));
    expect(await screen.findByText("member-a reward")).toBeInTheDocument();
    account("member-b");
    view.rerender(<RecentActivityFeed />);
    expect(await screen.findByText("member-b reward")).toBeInTheDocument();
    await waitFor(() => expect(state.activityRuntimeSetup).toHaveBeenCalledTimes(2));
    expect(state.activityIssue).toHaveBeenCalledTimes(1);
    expect(state.activityFetch).toHaveBeenCalledTimes(2);
    view.unmount();
    expect(state.unsubscribeActivity).toHaveBeenCalledTimes(1);
  });

  it("does not publish a setup rejection after unmount and retains the next valid visit", async () => {
    state.activityRuntimeSetup.mockImplementationOnce(() => { throw new Error("Retired unmounted runtime setup rejected"); });
    state.activityFetch.mockImplementation(() => Promise.resolve(response([])));
    const view = render(<RecentActivityFeed />);
    expect(state.activityRuntimeSetup).not.toHaveBeenCalled();
    view.unmount();
    await waitFor(() => expect(state.activityRuntimeSetup).toHaveBeenCalledTimes(1));
    await settled();
    expect(state.activityIssue).not.toHaveBeenCalled();
    expect(state.unsubscribeActivity).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event(ACTIVITY_SYNC_EVENT));
    expect(state.activityFetch).toHaveBeenCalledTimes(1);
    account("member-a");
    const next = render(<RecentActivityFeed />);
    expect(await screen.findByText("No recent activity")).toBeInTheDocument();
    await waitFor(() => expect(state.activityRuntimeSetup).toHaveBeenCalledTimes(2));
    expect(state.activityFetch).toHaveBeenCalledTimes(2);
    expect(state.activityIssue).not.toHaveBeenCalled();
    next.unmount();
    expect(state.unsubscribeActivity).toHaveBeenCalledTimes(1);
  });

  it("does not attach retired A's setup failure to B or suppress B's live setup failure", async () => {
    state.activityRuntimeSetup.mockImplementationOnce(() => { throw new Error("Shared import setup rejected while actor A retired"); });
    state.activityFetch.mockResolvedValueOnce(response([activity("member-a")])).mockResolvedValueOnce(response([activity("member-b")])).mockResolvedValueOnce(response([activity("member-b-next")]));
    const view = render(<RecentActivityFeed />);
    expect(state.activityRuntimeSetup).not.toHaveBeenCalled();
    account("member-b");
    view.rerender(<RecentActivityFeed />);
    expect(await screen.findByText("member-b reward")).toBeInTheDocument();
    await settled();
    expect(state.activityRuntimeSetup).toHaveBeenCalledTimes(1);
    expect(state.activityIssue.mock.calls.filter(([issue]) => issue.detail.userId === "member-a")).toHaveLength(0);
    expect(state.activityIssue).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ channel: "firebase", message: "Recent activity runtime setup failed", detail: { userId: "member-b" }, error: expect.any(Error) }));
    fireEvent(window, new Event("focus"));
    expect(await screen.findByText("member-b-next reward")).toBeInTheDocument();
    expect(state.activityFetch).toHaveBeenCalledTimes(3);
    expect(state.activityIssue).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(state.unsubscribeActivity).not.toHaveBeenCalled();
  });
});
