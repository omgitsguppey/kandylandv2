// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildTestProfile, buildTestUser } from "./utils/kandydrops-test-states";
import type { UserProfile } from "@/types/db";

const fixedNowMs = new Date("2026-05-04T15:00:00.000Z").getTime();

const mockState = vi.hoisted(() => ({
  user: { uid: "checkin_user" },
  userProfile: null as UserProfile | null,
  setUserProfile: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: mockState.user,
    userProfile: mockState.userProfile,
    setUserProfile: mockState.setUserProfile,
  }),
}));

vi.mock("@/hooks/useNow", () => ({
  useNow: () => fixedNowMs,
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

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
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

    expect(screen.getByText(/welcome back to the kandy shop, kandy/i)).toBeInTheDocument();
    expect(screen.getByText(/claim your streak and stay ready to unwrap/i)).toBeInTheDocument();
    const rewardHeading = screen.getByRole("heading", { name: /daily reward gd/i });
    expect(rewardHeading).toBeInTheDocument();
    expect(screen.getAllByText(/^reward gd$/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/day streak/i)).toBeInTheDocument();
    expect(rewardHeading.closest("[data-daily-checkin-variant]")).toHaveAttribute("data-daily-checkin-variant", "dashboard");
  });

  it("hides only the welcome header and subtitle on Experiences", () => {
    render(<DailyCheckIn variant="experiences" />);

    expect(screen.queryByText(/welcome back to the kandy shop/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/claim your streak and stay ready to unwrap/i)).not.toBeInTheDocument();
    const rewardHeading = screen.getByRole("heading", { name: /daily reward gd/i });
    expect(rewardHeading).toBeInTheDocument();
    expect(screen.getAllByText(/^reward gd$/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/day streak/i)).toBeInTheDocument();
    expect(rewardHeading.closest("[data-daily-checkin-variant]")).toHaveAttribute("data-daily-checkin-variant", "experiences");
  });
});
