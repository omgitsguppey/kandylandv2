// @vitest-environment happy-dom

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import * as fs from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildTestProfile, buildTestUser } from "./utils/kandydrops-test-states";
import type { UserProfile } from "@/types/db";

const fixedNowMs = new Date("2026-05-04T15:00:00.000Z").getTime();

const mockState = vi.hoisted(() => ({
  user: { uid: "checkin_user" } as { uid: string } | null,
  userProfile: null as UserProfile | null,
  authLoading: false,
  setUserProfile: vi.fn(),
  trackEvent: vi.fn(),
  authFetch: vi.fn(),
  activitySync: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
  confetti: vi.fn(),
}));

vi.mock("canvas-confetti", () => ({ default: (...args: unknown[]) => mockState.confetti(...args) }));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: mockState.user,
    userProfile: mockState.userProfile,
    setUserProfile: mockState.setUserProfile,
    loading: mockState.authLoading,
  }),
}));

vi.mock("@/hooks/useNow", () => ({
  useNow: () => fixedNowMs,
}));

vi.mock("@/lib/authFetch", () => ({
  authFetch: (...args: unknown[]) => mockState.authFetch(...args),
}));

vi.mock("@/lib/activity-sync", () => ({
  dispatchActivitySync: () => mockState.activitySync(),
}));

vi.mock("@/lib/client-error-reporting", () => ({
  reportClientIssue: vi.fn(),
}));

vi.mock("@/lib/telemetry", () => ({
  trackEvent: (...args: unknown[]) => mockState.trackEvent(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockState.toastError(...args),
    info: (...args: unknown[]) => mockState.toastInfo(...args),
    success: (...args: unknown[]) => mockState.toastSuccess(...args),
  },
}));

import { DailyCheckIn } from "@/components/Dashboard/DailyCheckIn";

describe("DailyCheckIn presentation variants", () => {
  beforeEach(() => {
    mockState.user = buildTestUser("checkin_user");
    mockState.userProfile = buildTestProfile({
      uid: "checkin_user",
      displayName: "Kandy Fan",
      gumDropsBalance: 1200,
      unlockedContent: ["drop_1", "drop_2"],
      streakCount: 3,
      lastCheckIn: fixedNowMs,
    });
    mockState.setUserProfile.mockReset();
    mockState.trackEvent.mockReset();
  });

  it("keeps the dashboard welcome header and subtitle", () => {
    render(<DailyCheckIn />);

    expect(screen.getByText(/welcome back, kandy\./i)).toBeInTheDocument();
    expect(screen.getByText(/your streak is ready when you are/i)).toBeInTheDocument();
    const rewardHeading = screen.getByRole("heading", { name: /your next reward gd/i });
    expect(rewardHeading).toBeInTheDocument();
    expect(screen.getAllByText(/^reward gd$/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Streak", { exact: true }).parentElement).toHaveTextContent("3/7");
    expect(rewardHeading.closest("[data-daily-checkin-variant]")).toHaveAttribute("data-daily-checkin-variant", "dashboard");
  });

  it("hides only the welcome header and subtitle on Experiences", () => {
    render(<DailyCheckIn variant="experiences" />);

    expect(screen.queryByText(/welcome back,/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/your streak is ready when you are/i)).not.toBeInTheDocument();
    const rewardHeading = screen.getByRole("heading", { name: /your next reward gd/i });
    expect(rewardHeading).toBeInTheDocument();
    expect(screen.getAllByText(/^reward gd$/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Streak", { exact: true }).parentElement).toHaveTextContent("3/7");
    expect(rewardHeading.closest("[data-daily-checkin-variant]")).toHaveAttribute("data-daily-checkin-variant", "experiences");
  });
});


describe("DailyCheckIn reward balance source", () => {
  beforeEach(() => {
    mockState.user = buildTestUser("checkin_user");
    mockState.userProfile = buildTestProfile({
      uid: "checkin_user", displayName: "Kandy Fan", gumDropsBalance: 1200,
      gumDropsPurchasedBalance: 900, gumDropsRewardBalance: 300,
      lastCheckIn: fixedNowMs, streakCount: 3,
    });
    mockState.setUserProfile.mockReset();
    mockState.trackEvent.mockReset();
  });

  function rewardValue() {
    const label = screen.getByText("Reward GD", { exact: true });
    const fact = label.parentElement;
    if (!fact) throw new Error("Reward balance fact is absent");
    return within(fact);
  }

  it.each(["dashboard", "experiences"] as const)("shows only earned-source balance on %s", (variant) => {
    render(<DailyCheckIn variant={variant} />);
    expect(rewardValue().getByText("300", { exact: true })).toBeInTheDocument();
    expect(rewardValue().queryByText("1.2K", { exact: true })).not.toBeInTheDocument();
    expect(mockState.setUserProfile).not.toHaveBeenCalled();
  });

  it("shows a proven reward zero even when the account has paid GumDrops", () => {
    mockState.userProfile = buildTestProfile({ uid: "checkin_user", gumDropsBalance: 1200, gumDropsPurchasedBalance: 1200, gumDropsRewardBalance: 0, lastCheckIn: fixedNowMs });
    render(<DailyCheckIn />);
    expect(rewardValue().getByText("0", { exact: true })).toBeInTheDocument();
    expect(rewardValue().queryByText("Unavailable", { exact: true })).not.toBeInTheDocument();
  });

  it.each([
    { name: "missing profile", profile: null, user: { uid: "checkin_user" } },
    { name: "missing reward source", profile: buildTestProfile({ uid: "checkin_user", gumDropsBalance: 1200, gumDropsPurchasedBalance: 1200, gumDropsRewardBalance: undefined, lastCheckIn: fixedNowMs }), user: { uid: "checkin_user" } },
    { name: "nonfinite reward source", profile: buildTestProfile({ uid: "checkin_user", gumDropsRewardBalance: Number.NaN, lastCheckIn: fixedNowMs }), user: { uid: "checkin_user" } },
    { name: "mismatched profile", profile: buildTestProfile({ uid: "other_actor", gumDropsRewardBalance: 300, lastCheckIn: fixedNowMs }), user: { uid: "checkin_user" } },
    { name: "signed-out source", profile: buildTestProfile({ uid: "checkin_user", gumDropsRewardBalance: 300, lastCheckIn: fixedNowMs }), user: null },
  ])("keeps $name unavailable rather than zero", ({ profile, user }) => {
    mockState.userProfile = profile;
    mockState.user = user;
    render(<DailyCheckIn />);
    expect(rewardValue().getByText("Unavailable", { exact: true })).toBeInTheDocument();
    expect(rewardValue().queryByText("0", { exact: true })).not.toBeInTheDocument();
  });

  it("waits for a matching profile on actor switch and recovers the next valid reward source", () => {
    const { rerender } = render(<DailyCheckIn />);
    expect(rewardValue().getByText("300", { exact: true })).toBeInTheDocument();
    mockState.user = buildTestUser("next_actor");
    rerender(<DailyCheckIn />);
    expect(rewardValue().getByText("Unavailable", { exact: true })).toBeInTheDocument();
    mockState.userProfile = buildTestProfile({ uid: "next_actor", gumDropsBalance: 720, gumDropsPurchasedBalance: 700, gumDropsRewardBalance: 20, lastCheckIn: fixedNowMs });
    rerender(<DailyCheckIn />);
    expect(rewardValue().getByText("20", { exact: true })).toBeInTheDocument();
    expect(mockState.setUserProfile).not.toHaveBeenCalled();
  });
});


describe("DailyCheckIn actual claim control and acknowledgement custody", () => {
  beforeEach(async () => {
    await vi.dynamicImportSettled();
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 0));
    mockState.authLoading = false;
    mockState.user = buildTestUser("checkin_user");
    mockState.userProfile = buildTestProfile({ uid: "checkin_user", displayName: "Kandy Fan", gumDropsBalance: 1200, gumDropsPurchasedBalance: 900, gumDropsRewardBalance: 300, lastCheckIn: 0, streakCount: 0 });
    mockState.setUserProfile.mockReset();
    mockState.trackEvent.mockReset();
    mockState.authFetch.mockReset();
    mockState.activitySync.mockReset();
    mockState.toastError.mockReset();
    mockState.toastInfo.mockReset();
    mockState.toastSuccess.mockReset();
    mockState.confetti.mockReset();
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  function result(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }

  function successfulResult() {
    return result({ success: true, reward: 20, streak: 1, lastCheckIn: fixedNowMs, gumDropsBalance: 1220, rewardSource: "reward_gd_only" });
  }

  function deferredResponse() {
    let settle: ((response: Response) => void) | undefined;
    const promise = new Promise<Response>((resolve) => { settle = resolve; });
    return { promise, settle: (response: Response) => {
      if (!settle) throw new Error("Deferred response was not initialized");
      settle(response);
    } };
  }

  function completedFacts() {
    return mockState.trackEvent.mock.calls.filter(([event]) => ["daily_checkin_claimed", "daily_task_completed", "daily_task_reward_granted"].includes(String(event)));
  }

  it("binds the real claim control once, retains its pending action label, then shows confirmed settlement", async () => {
    const response = deferredResponse();
    mockState.authFetch.mockReturnValueOnce(response.promise);
    render(<DailyCheckIn />);
    const button = screen.getByRole("button", { name: /claim .*reward gd/i });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(mockState.authFetch).toHaveBeenCalledExactlyOnceWith("/api/checkin", { method: "POST" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleName(/claim .*reward gd/i);
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(mockState.setUserProfile).not.toHaveBeenCalled();
    await act(async () => response.settle(successfulResult()));
    await waitFor(() => expect(mockState.toastSuccess).toHaveBeenCalledTimes(1));
    expect(mockState.setUserProfile).toHaveBeenCalledTimes(1);
    expect(mockState.activitySync).toHaveBeenCalledTimes(1);
    expect(completedFacts()).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /claim .*reward gd/i })).not.toBeInTheDocument();
    expect(screen.getByText(/come back after reset for/i)).toBeInTheDocument();
  });

  it("does not settle a failed request and permits the next valid manual claim", async () => {
    mockState.authFetch.mockResolvedValueOnce(result({ error: "Try again later." }, 503));
    render(<DailyCheckIn />);
    fireEvent.click(screen.getByRole("button", { name: /claim .*reward gd/i }));
    await waitFor(() => expect(mockState.toastError).toHaveBeenCalledExactlyOnceWith("Try again later."));
    expect(mockState.setUserProfile).not.toHaveBeenCalled();
    expect(mockState.activitySync).not.toHaveBeenCalled();
    expect(completedFacts()).toHaveLength(0);
    const button = screen.getByRole("button", { name: /claim .*reward gd/i });
    expect(button).toBeEnabled();
    mockState.authFetch.mockResolvedValueOnce(successfulResult());
    fireEvent.click(button);
    await waitFor(() => expect(mockState.toastSuccess).toHaveBeenCalledTimes(1));
    expect(mockState.authFetch).toHaveBeenCalledTimes(2);
    expect(completedFacts()).toHaveLength(3);
  });

  it.each([
    { name: "explicit incomplete acknowledgement", body: { success: false, error: "Not settled." } },
    { name: "missing acknowledgement", body: {} },
    { name: "array acknowledgement", body: [] },
    { name: "null acknowledgement", body: null },
    { name: "string-valued acknowledgement", body: { success: "true" } },
  ])("does not turn an HTTP200 $name into a reward grant", async ({ body }) => {
    mockState.authFetch.mockResolvedValueOnce(result(body));
    render(<DailyCheckIn />);
    fireEvent.click(screen.getByRole("button", { name: /claim .*reward gd/i }));
    await waitFor(() => expect(mockState.toastError).toHaveBeenCalledTimes(1));
    expect(mockState.toastError).toHaveBeenCalledWith("We could not confirm your check-in. Check your reward status before trying again.");
    expect(mockState.setUserProfile).not.toHaveBeenCalled();
    expect(mockState.toastSuccess).not.toHaveBeenCalled();
    expect(mockState.activitySync).not.toHaveBeenCalled();
    expect(completedFacts()).toHaveLength(0);
    const next = screen.getByRole("button", { name: /claim .*reward gd/i });
    expect(next).toBeEnabled();
    mockState.authFetch.mockResolvedValueOnce(successfulResult());
    fireEvent.click(next);
    await waitFor(() => expect(mockState.toastSuccess).toHaveBeenCalledTimes(1));
    expect(mockState.authFetch).toHaveBeenCalledTimes(2);
    expect(completedFacts()).toHaveLength(3);
  });

  it("does not publish or toast actor A's late claim after the actual parent removes A and B owns the profile", async () => {
    const response = deferredResponse();
    mockState.authFetch.mockReturnValueOnce(response.promise);
    mockState.setUserProfile.mockImplementation((update: (previous: UserProfile | null) => UserProfile | null) => {
      mockState.userProfile = update(mockState.userProfile);
    });
    const first = render(<DailyCheckIn />);
    fireEvent.click(screen.getByRole("button", { name: /claim .*reward gd/i }));
    expect(mockState.authFetch).toHaveBeenCalledTimes(1);
    first.unmount();
    mockState.user = buildTestUser("member-b");
    mockState.userProfile = buildTestProfile({ uid: "member-b", displayName: "Member B", gumDropsBalance: 700, gumDropsPurchasedBalance: 650, gumDropsRewardBalance: 50, lastCheckIn: fixedNowMs, streakCount: 3 });
    render(<DailyCheckIn />);
    await act(async () => response.settle(successfulResult()));
    expect(mockState.userProfile?.gumDropsBalance).toBe(700);
    expect(mockState.userProfile?.uid).toBe("member-b");
    expect(mockState.setUserProfile).not.toHaveBeenCalled();
    expect(mockState.toastSuccess).not.toHaveBeenCalled();
    expect(mockState.activitySync).not.toHaveBeenCalled();
    expect(completedFacts()).toHaveLength(0);
  });
  it.each([
    { name: "missing profile", profile: null, loading: false },
    { name: "stale profile", profile: buildTestProfile({ uid: "other-actor", lastCheckIn: 0 }), loading: false },
    { name: "unresolved authentication", profile: buildTestProfile({ uid: "checkin_user", lastCheckIn: 0 }), loading: true },
  ])("waits for $name before offering a claim and recovers matching account readiness", ({ profile, loading }) => {
    mockState.userProfile = profile;
    mockState.authLoading = loading;
    const view = render(<DailyCheckIn />);
    expect(screen.queryByRole("button", { name: /claim .*reward gd/i })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("waiting for your account profile");
    expect(mockState.authFetch).not.toHaveBeenCalled();
    expect(completedFacts()).toHaveLength(0);
    mockState.authLoading = false;
    mockState.userProfile = buildTestProfile({ uid: "checkin_user", lastCheckIn: 0 });
    view.rerender(<DailyCheckIn />);
    expect(screen.getByRole("button", { name: /claim .*reward gd/i })).toBeEnabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("preserves the existing duplicate409 lock without claiming a new reward", async () => {
    mockState.authFetch.mockResolvedValueOnce(result({ alreadyClaimed: true, errorCode: "duplicate_claim", retryable: false, lastCheckIn: fixedNowMs, streak: 4, eligibilityExplanation: "The next claim is available after the daily reset." }, 409));
    render(<DailyCheckIn />);
    fireEvent.click(screen.getByRole("button", { name: /claim .*reward gd/i }));
    await waitFor(() => expect(mockState.toastInfo).toHaveBeenCalledTimes(1));
    expect(mockState.toastInfo).toHaveBeenCalledWith("Already claimed today", { description: "The next claim is available after the daily reset." });
    expect(mockState.setUserProfile).not.toHaveBeenCalled();
    expect(mockState.activitySync).not.toHaveBeenCalled();
    expect(mockState.toastSuccess).not.toHaveBeenCalled();
    expect(completedFacts()).toHaveLength(0);
    expect(mockState.trackEvent.mock.calls.filter(([event]) => event === "daily_task_failed")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /claim .*reward gd/i })).not.toBeInTheDocument();
    expect(screen.getByText(/come back after reset for/i)).toBeInTheDocument();
  });

  it("rejects invalid JSON acknowledgement and permits a later explicitly confirmed claim", async () => {
    mockState.authFetch.mockResolvedValueOnce(new Response("{not-json", { status: 200 }));
    render(<DailyCheckIn />);
    fireEvent.click(screen.getByRole("button", { name: /claim .*reward gd/i }));
    await waitFor(() => expect(mockState.toastError).toHaveBeenCalledTimes(1));
    expect(mockState.setUserProfile).not.toHaveBeenCalled();
    expect(mockState.activitySync).not.toHaveBeenCalled();
    expect(completedFacts()).toHaveLength(0);
    const next = screen.getByRole("button", { name: /claim .*reward gd/i });
    expect(next).toBeEnabled();
    mockState.authFetch.mockResolvedValueOnce(successfulResult());
    fireEvent.click(next);
    await waitFor(() => expect(mockState.toastSuccess).toHaveBeenCalledTimes(1));
    expect(mockState.authFetch).toHaveBeenCalledTimes(2);
    expect(completedFacts()).toHaveLength(3);
  });

  it("keeps a same-actor claim pending through unrelated profile updates and settles once", async () => {
    const response = deferredResponse();
    mockState.authFetch.mockReturnValueOnce(response.promise);
    const view = render(<DailyCheckIn />);
    fireEvent.click(screen.getByRole("button", { name: /claim .*reward gd/i }));
    mockState.userProfile = buildTestProfile({ uid: "checkin_user", displayName: "New display name", gumDropsBalance: 1200, lastCheckIn: 0 });
    view.rerender(<DailyCheckIn />);
    const button = document.querySelector<HTMLButtonElement>('[data-onboarding-target="daily-reward-claim"]');
    expect(button).toBeDisabled();
    if (!button) throw new Error("Actual pending claim control is absent");
    fireEvent.click(button);
    expect(mockState.authFetch).toHaveBeenCalledTimes(1);
    await act(async () => response.settle(successfulResult()));
    await waitFor(() => expect(mockState.toastSuccess).toHaveBeenCalledTimes(1));
    expect(mockState.setUserProfile).toHaveBeenCalledTimes(1);
    expect(completedFacts()).toHaveLength(3);
  });

  it("declines old A settlement without clearing B's pending claim, then settles B's current action", async () => {
    const first = deferredResponse();
    const second = deferredResponse();
    mockState.authFetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    mockState.setUserProfile.mockImplementation((update: (previous: UserProfile | null) => UserProfile | null) => { mockState.userProfile = update(mockState.userProfile); });
    const view = render(<DailyCheckIn />);
    fireEvent.click(screen.getByRole("button", { name: /claim .*reward gd/i }));
    mockState.user = buildTestUser("member-b");
    mockState.userProfile = buildTestProfile({ uid: "member-b", gumDropsBalance: 700, lastCheckIn: 0 });
    view.rerender(<DailyCheckIn />);
    fireEvent.click(screen.getByRole("button", { name: /claim .*reward gd/i }));
    expect(mockState.authFetch).toHaveBeenCalledTimes(2);
    await act(async () => first.settle(successfulResult()));
    expect(mockState.userProfile?.gumDropsBalance).toBe(700);
    expect(mockState.setUserProfile).not.toHaveBeenCalled();
    expect(mockState.toastSuccess).not.toHaveBeenCalled();
    expect(mockState.activitySync).not.toHaveBeenCalled();
    expect(completedFacts()).toHaveLength(0);
    expect(document.querySelector('[data-onboarding-target="daily-reward-claim"]')).toBeDisabled();
    await act(async () => second.settle(result({ success: true, reward: 30, streak: 2, lastCheckIn: fixedNowMs, gumDropsBalance: 730 })));
    await waitFor(() => expect(mockState.toastSuccess).toHaveBeenCalledTimes(1));
    expect(mockState.userProfile).toMatchObject({ uid: "member-b", gumDropsBalance: 730 });
    expect(mockState.setUserProfile).toHaveBeenCalledTimes(1);
    expect(mockState.activitySync).toHaveBeenCalledTimes(1);
    expect(completedFacts()).toHaveLength(3);
    const claimed = mockState.trackEvent.mock.calls.find(([event]) => event === "daily_checkin_claimed");
    expect(claimed?.[1]).toMatchObject({ transaction_id: `member-b:checkin:${fixedNowMs}` });
  });

  it("invalidates the old lifetime through logout and a return to the same UID", async () => {
    const response = deferredResponse();
    mockState.authFetch.mockReturnValueOnce(response.promise);
    const view = render(<DailyCheckIn />);
    fireEvent.click(screen.getByRole("button", { name: /claim .*reward gd/i }));
    mockState.user = null;
    view.rerender(<DailyCheckIn />);
    mockState.user = buildTestUser("checkin_user");
    mockState.userProfile = buildTestProfile({ uid: "checkin_user", lastCheckIn: 0 });
    view.rerender(<DailyCheckIn />);
    await act(async () => response.settle(successfulResult()));
    expect(mockState.setUserProfile).not.toHaveBeenCalled();
    expect(mockState.toastSuccess).not.toHaveBeenCalled();
    expect(mockState.activitySync).not.toHaveBeenCalled();
    expect(completedFacts()).toHaveLength(0);
    expect(screen.getByRole("button", { name: /claim .*reward gd/i })).toBeEnabled();
  });

  it("checks the shared profile updater when it executes after account custody changes", async () => {
    mockState.authFetch.mockResolvedValueOnce(successfulResult());
    const view = render(<DailyCheckIn />);
    fireEvent.click(screen.getByRole("button", { name: /claim .*reward gd/i }));
    await waitFor(() => expect(mockState.setUserProfile).toHaveBeenCalledTimes(1));
    const update = mockState.setUserProfile.mock.calls[0][0] as (previous: UserProfile | null) => UserProfile | null;
    const a = mockState.userProfile;
    expect(update(a)).toMatchObject({ uid: "checkin_user", gumDropsBalance: 1220, lastCheckIn: fixedNowMs, streakCount: 1 });
    const b = buildTestProfile({ uid: "member-b", gumDropsBalance: 700, streakCount: 3, lastCheckIn: 0 });
    expect(update(b)).toBe(b);
    mockState.user = buildTestUser("member-b");
    mockState.userProfile = b;
    view.rerender(<DailyCheckIn />);
    expect(update(b)).toBe(b);
    expect(update(b)?.gumDropsBalance).toBe(700);
    expect(completedFacts()).toHaveLength(3);
    const claimed = mockState.trackEvent.mock.calls.find(([event]) => event === "daily_checkin_claimed");
    expect(claimed?.[1]).toMatchObject({ transaction_id: `checkin_user:checkin:${fixedNowMs}` });
  });

  it("settles a legitimate StrictMode action once", async () => {
    mockState.authFetch.mockResolvedValueOnce(successfulResult());
    render(<StrictMode><DailyCheckIn /></StrictMode>);
    fireEvent.click(screen.getByRole("button", { name: /claim .*reward gd/i }));
    await waitFor(() => expect(mockState.toastSuccess).toHaveBeenCalledTimes(1));
    expect(mockState.authFetch).toHaveBeenCalledTimes(1);
    expect(mockState.setUserProfile).toHaveBeenCalledTimes(1);
    expect(mockState.activitySync).toHaveBeenCalledTimes(1);
    expect(completedFacts()).toHaveLength(3);
  });

  it("does not report old A's late failure as B's failure and allows B's valid claim", async () => {
    const response = deferredResponse();
    mockState.authFetch.mockReturnValueOnce(response.promise);
    const view = render(<DailyCheckIn />);
    fireEvent.click(screen.getByRole("button", { name: /claim .*reward gd/i }));
    mockState.user = buildTestUser("member-b");
    mockState.userProfile = buildTestProfile({ uid: "member-b", lastCheckIn: 0 });
    view.rerender(<DailyCheckIn />);
    await act(async () => response.settle(result({ error: "Actor A failed." }, 503)));
    expect(mockState.toastError).not.toHaveBeenCalled();
    expect(mockState.trackEvent.mock.calls.filter(([event]) => event === "daily_task_failed")).toHaveLength(0);
    expect(mockState.setUserProfile).not.toHaveBeenCalled();
    mockState.authFetch.mockResolvedValueOnce(successfulResult());
    fireEvent.click(screen.getByRole("button", { name: /claim .*reward gd/i }));
    await waitFor(() => expect(mockState.toastSuccess).toHaveBeenCalledTimes(1));
    expect(mockState.authFetch).toHaveBeenCalledTimes(2);
    expect(completedFacts()).toHaveLength(3);
  });

  it("does not publish after unmount while an already received response body is still pending", async () => {
    let settleBody: ((text: string) => void) | undefined;
    const body = new Promise<string>((resolve) => { settleBody = resolve; });
    const response = successfulResult();
    vi.spyOn(response, "text").mockReturnValueOnce(body);
    mockState.authFetch.mockResolvedValueOnce(response);
    const view = render(<DailyCheckIn />);
    fireEvent.click(screen.getByRole("button", { name: /claim .*reward gd/i }));
    await waitFor(() => expect(response.text).toHaveBeenCalledTimes(1));
    view.unmount();
    await act(async () => settleBody?.(JSON.stringify({ success: true, reward: 20, gumDropsBalance: 1220, lastCheckIn: fixedNowMs })));
    expect(mockState.setUserProfile).not.toHaveBeenCalled();
    expect(mockState.toastSuccess).not.toHaveBeenCalled();
    expect(mockState.activitySync).not.toHaveBeenCalled();
    expect(completedFacts()).toHaveLength(0);
  });

  it("stops the actual claim animation frame after the initiating actor leaves", async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", vi.fn((frame: FrameRequestCallback) => { frames.push(frame); return frames.length; }));
    try {
      mockState.authFetch.mockResolvedValueOnce(successfulResult());
      const view = render(<DailyCheckIn />);
      fireEvent.click(screen.getByRole("button", { name: /claim .*reward gd/i }));
      await waitFor(() => expect(mockState.confetti).toHaveBeenCalledTimes(2));
      expect(frames).toHaveLength(1);
      mockState.user = buildTestUser("member-b");
      mockState.userProfile = buildTestProfile({ uid: "member-b", lastCheckIn: 0 });
      view.rerender(<DailyCheckIn />);
      mockState.confetti.mockClear();
      const queuedFrames = frames.splice(0);
      act(() => queuedFrames.forEach(frame => frame(0)));
      expect(mockState.confetti).not.toHaveBeenCalled();
      expect(frames).toHaveLength(0);
      expect(completedFacts()).toHaveLength(3);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("reconciles an unconfirmed reply from the next canonical profile and keeps that result on remount", async () => {
    mockState.authFetch.mockResolvedValueOnce(result({}));
    const view = render(<DailyCheckIn />);
    fireEvent.click(screen.getByRole("button", { name: /claim .*reward gd/i }));
    await waitFor(() => expect(mockState.toastError).toHaveBeenCalledTimes(1));
    expect(mockState.setUserProfile).not.toHaveBeenCalled();
    expect(mockState.toastSuccess).not.toHaveBeenCalled();
    expect(mockState.activitySync).not.toHaveBeenCalled();
    expect(completedFacts()).toHaveLength(0);
    mockState.userProfile = buildTestProfile({ uid: "checkin_user", gumDropsBalance: 1220, gumDropsPurchasedBalance: 900, gumDropsRewardBalance: 320, lastCheckIn: fixedNowMs, streakCount: 1 });
    view.rerender(<DailyCheckIn />);
    expect(screen.queryByRole("button", { name: /claim .*reward gd/i })).not.toBeInTheDocument();
    expect(screen.getByText(/come back after reset for/i)).toBeInTheDocument();
    const reward = screen.getByText("Reward GD", { exact: true }).parentElement;
    expect(reward).toHaveTextContent("320");
    view.unmount();
    render(<DailyCheckIn />);
    expect(screen.queryByRole("button", { name: /claim .*reward gd/i })).not.toBeInTheDocument();
    expect(screen.getByText(/come back after reset for/i)).toBeInTheDocument();
    expect(screen.getByText("Reward GD", { exact: true }).parentElement).toHaveTextContent("320");
    expect(mockState.authFetch).toHaveBeenCalledTimes(1);
    expect(completedFacts()).toHaveLength(0);
  });

});

describe("canonical Experiences variant doctrine ownership", () => {
  function runReader(mode: "unrelated-docs-absent" | "canonical-contract-missing") {
    const root = process.cwd();
    const file = "scripts/agent/validate-experiences-compact-layout.ts";
    const source = fs.readFileSync(join(root, file), "utf8");
    const unrelated = new Set(["AGENTS.md", "REPO_MEMORY_LEDGER.md", "FULL_SCALE_CODEBASE_AUDIT.md", "docs/agent-truth/mobile-shell-safe-area.md", "docs/agent-truth/pwa-service-worker-mobile.md"]);
    const logs: string[] = [];
    let exitCode = 0;
    const exitSignal = new Error("validator exit");
    const actualRequire = createRequire(join(root, file));
    const projectedFs = {
      ...fs,
      existsSync(input: fs.PathLike) {
        const file = relative(root, String(input)).replaceAll("\\", "/");
        return mode === "unrelated-docs-absent" && unrelated.has(file) ? false : fs.existsSync(input);
      },
      readFileSync(input: fs.PathOrFileDescriptor, encoding: BufferEncoding) {
        const file = relative(root, String(input)).replaceAll("\\", "/");
        const value = fs.readFileSync(input, encoding);
        return mode === "canonical-contract-missing" && file === "docs/agent-truth/experiences-compact-daily-hub.md"
          ? value.replace(/^DailyCheckIn has two allowed presentation variants\..*$/m, "")
          : value;
      },
    };
    const compiled = ts.transpileModule(source, { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    try {
      vm.runInNewContext(compiled, {
        module: { exports: {} }, exports: {},
        require: (id: string) => id === "node:fs" ? projectedFs : actualRequire(id),
        process: { ...process, cwd: () => root, exit: (code: number) => { exitCode = code; throw exitSignal; } },
        console: { log: (...values: unknown[]) => logs.push(values.join(" ")), error: (...values: unknown[]) => logs.push(values.join(" ")) },
      }, { filename: file, timeout: 10_000 });
    } catch (error) {
      if (error !== exitSignal) throw error;
    }
    return { exitCode, logs };
  }

  it("does not require duplicated variant rules from unrelated instruction or historical documents", () => {
    const result = runReader("unrelated-docs-absent");
    expect(result.exitCode).toBe(0);
    expect(result.logs.join("\n")).toContain("Experiences compact layout validation passed.");
  });

  it("rejects a missing canonical two-variant contract even when historical copies remain", () => {
    const result = runReader("canonical-contract-missing");
    expect(result.exitCode).toBe(1);
    expect(result.logs.join("\n")).toContain("must include");
  });
});
