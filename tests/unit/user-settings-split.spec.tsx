// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockState = vi.hoisted(() => ({
  trackEvent: vi.fn(),
  useProfileState: vi.fn(),
}));

vi.mock("@/app/dashboard/profile/hooks/useProfileState", () => ({
  useProfileState: mockState.useProfileState,
}));

vi.mock("@/components/Analytics/PageViewEvent", () => ({
  PageViewEvent: () => null,
}));

vi.mock("@/app/dashboard/profile/components/ProfileProfileSection", () => ({
  ProfileProfileSection: () => <section>Profile</section>,
}));
vi.mock("@/app/dashboard/profile/components/ProfileAccountSection", () => ({
  ProfileAccountSection: () => <section>Account</section>,
}));
vi.mock("@/app/dashboard/profile/components/ProfileNotificationsSection", () => ({
  ProfileNotificationsSection: () => <section>Notifications</section>,
}));
vi.mock("@/app/dashboard/profile/components/ProfilePrivacyDataSection", () => ({
  ProfilePrivacyDataSection: () => <section>Privacy & Data</section>,
}));
vi.mock("@/app/dashboard/profile/components/ProfileSupportSafetySection", () => ({
  ProfileSupportSafetySection: () => <section>Support & Safety</section>,
}));
vi.mock("@/lib/telemetry", () => ({
  trackEvent: mockState.trackEvent,
}));

import { UserSettingsPage } from "@/components/Settings/UserSettingsPage";

describe("UserSettingsPage split", () => {
  beforeEach(() => {
    mockState.trackEvent.mockReset();
  });

  it("does not show creator controls to a normal user", () => {
    mockState.useProfileState.mockReturnValue({
      avatarFallback: "U",
      profileName: "User",
      profileEmail: "user@example.com",
      userProfile: {
        uid: "user_1",
        role: "user",
      },
    });

    render(<UserSettingsPage />);

    expect(screen.getByText("Profile")).toBeTruthy();
    expect(screen.getByText("Account")).toBeTruthy();
    expect(screen.getByText("Notifications")).toBeTruthy();
    expect(screen.getByText("Privacy & Data")).toBeTruthy();
    expect(screen.getByText("Support & Safety")).toBeTruthy();
    expect(screen.queryByText("Creator tools moved to your Creator Dashboard.")).toBeNull();
  });

  it("shows the creator dashboard CTA for creators", () => {
    mockState.useProfileState.mockReturnValue({
      avatarFallback: "J",
      profileName: "Jessica",
      profileEmail: "jessica@example.com",
      userProfile: {
        uid: "creator_1",
        role: "creator",
      },
    });

    render(<UserSettingsPage />);

    expect(screen.getByText("Creator tools moved to your Creator Dashboard.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Creator Dashboard" })).toBeTruthy();
  });
});
