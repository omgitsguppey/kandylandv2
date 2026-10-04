// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCanonicalUserFixture } from "@/lib/testing/canonical-test-factories";

const mockState = vi.hoisted(() => ({
  trackEvent: vi.fn(),
  useProfileState: vi.fn(),
  loading: false,
}));

vi.mock("@/app/dashboard/profile/hooks/useProfileState", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/dashboard/profile/hooks/useProfileState")>();
  return { ...actual, useProfileState: mockState.useProfileState };
});
vi.mock("@/context/AuthContext", () => ({
  useAuthLoading: () => ({ loading: mockState.loading }),
  useAuth: () => ({ user: null, logout: vi.fn() }),
  useUserProfile: () => ({ userProfile: null }),
}));
vi.mock("@/lib/firebase-data", () => ({ storage: {}, db: {}, rtdb: {} }));
vi.mock("@/lib/firebase-messaging", () => ({ getBrowserNotificationState: vi.fn() }));
vi.mock("@/components/Analytics/PageViewEvent", () => ({ usePageViewEvent: () => undefined }));
vi.mock("@/lib/telemetry", () => ({ trackEvent: mockState.trackEvent }));

import { UserSettingsPage } from "@/components/Settings/UserSettingsPage";

function profileFixture(role: "user" | "creator" = "user") {
  return {
    user: { uid: "member_1", photoURL: null },
    userProfile: buildCanonicalUserFixture({
      uid: "member_1",
      role,
      unlockedContent: [],
      gumDropsBalance: 50,
      gumDropsPurchasedBalance: 20,
      gumDropsRewardBalance: 30,
      createdAt: undefined,
    }),
    accountReady: true,
    profileOwnerPending: false,
    avatarFallback: "U",
    profileIdentityLabel: "Member",
    profileIdentityDetail: "@member",
    profileEmail: "member@example.com",
    formState: {
      displayName: "Member", username: "member", dateOfBirth: "", timezone: "Auto",
      browserPushEnabled: false, inAppEnabled: true, newDropAlerts: true,
      anonymousAnalyticsEnabled: true, identifiedAnalyticsEnabled: true,
      allowRecommendations: true, showInAnonymousStats: true, honorGlobalPrivacyControl: false,
    },
    isCreatorProjectionActive: false,
    isUploadingAvatar: false,
    notificationSupportMessage: "",
    notificationSetupLoading: false,
    browserGpcEnabled: false,
    isDownloading: false,
    isDeleting: false,
    deleteConfirmationOpen: false,
    deletionFeedback: "",
    saving: false,
    saveFeedback: "",
    updateForm: vi.fn(),
    handleChangeAvatar: vi.fn(),
    handleBrowserPushToggle: vi.fn(),
    handleWithdrawOptionalTracking: vi.fn(),
    handleDownloadData: vi.fn(),
    handleRequestDeletion: vi.fn(),
    handleCancelAccountDeletion: vi.fn(),
    handleConfirmAccountDeletion: vi.fn(),
    logout: vi.fn(),
  };
}

beforeEach(() => {
  mockState.trackEvent.mockReset();
  mockState.loading = false;
  mockState.useProfileState.mockReturnValue(profileFixture());
});
afterEach(cleanup);

describe("UserSettingsPage current account panels", () => {
  it("shows real account sections and source-aware balance facts without Creator tools for a normal user", () => {
    render(<UserSettingsPage />);
    for (const name of ["Profile details", "Account details", "Notifications", "Privacy and data", "Support and account safety"]) {
      expect(screen.getByRole("heading", { name })).toBeTruthy();
    }
    expect(screen.queryByRole("link", { name: /open creator settings/i })).toBeNull();
    expect(screen.getByText("Paid GumDrops").nextElementSibling).toHaveTextContent("20");
    expect(screen.getByText("Reward GumDrops").nextElementSibling).toHaveTextContent("30");
    expect(screen.getByText("Joined").nextElementSibling).toHaveTextContent("Unavailable");
  });

  it("connects the Creator-only handoff to its canonical route and existing click fact", () => {
    mockState.useProfileState.mockReturnValue(profileFixture("creator"));
    render(<UserSettingsPage />);
    const link = screen.getByRole("link", { name: /open creator settings/i });
    expect(link).toHaveAttribute("href", "/dashboard/creator/settings");
    fireEvent.click(link);
    expect(mockState.trackEvent).toHaveBeenCalledWith("user_settings_creator_tools_cta_clicked", expect.objectContaining({
      actor_role: "creator", creator_id: "member_1", target_creator_id: "member_1", truth_state: "migrated",
    }));
  });

  it("keeps actual labeled fields, native timezone choice and privacy dependency handlers connected", () => {
    const profile = profileFixture();
    mockState.useProfileState.mockReturnValue(profile);
    render(<UserSettingsPage />);
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Updated" } });
    expect(profile.updateForm).toHaveBeenCalledWith("displayName", "Updated");
    fireEvent.change(screen.getByRole("combobox", { name: "Timezone" }), { target: { value: "America/Chicago" } });
    expect(profile.updateForm).toHaveBeenCalledWith("timezone", "America/Chicago");
    fireEvent.click(screen.getByRole("switch", { name: /anonymous analytics/i }));
    for (const name of ["anonymousAnalyticsEnabled", "identifiedAnalyticsEnabled", "allowRecommendations", "showInAnonymousStats"]) {
      expect(profile.updateForm).toHaveBeenCalledWith(name, false);
    }
    expect(mockState.trackEvent).toHaveBeenCalledWith("setting_toggle_changed", expect.objectContaining({ setting_id: "anonymous_analytics", settings_surface: "privacy", value: "false" }));
  });

  it("keeps profile and preference editing disabled in read-only projection", () => {
    const profile = { ...profileFixture(), isCreatorProjectionActive: true };
    mockState.useProfileState.mockReturnValue(profile);
    render(<UserSettingsPage />);
    expect(screen.getByLabelText("Display name")).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Timezone" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: /anonymous analytics/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("switch", { name: /anonymous analytics/i }));
    expect(profile.updateForm).not.toHaveBeenCalled();
    expect(screen.getByText("Read-only admin projection. Privacy choices are disabled.")).toBeTruthy();
  });

  it("shows existing autosave progress and outcome and distinguishes loading from missing profile", () => {
    const profile = { ...profileFixture(), saving: true };
    mockState.useProfileState.mockReturnValue(profile);
    const view = render(<UserSettingsPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Saving changes...");
    mockState.useProfileState.mockReturnValue({ ...profile, saving: false, saveFeedback: "Changes saved" });
    view.rerender(<UserSettingsPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Changes saved");
    mockState.loading = true;
    mockState.useProfileState.mockReturnValue({ ...profile, userProfile: null });
    view.rerender(<UserSettingsPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading account settings...");
    mockState.loading = false;
    view.rerender(<UserSettingsPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Account settings are unavailable right now.");
    expect(screen.getByRole("link", { name: "Open support" })).toHaveAttribute("href", "/dashboard/support");
  });

  it("keeps explicit deletion confirmation and human failure recovery connected to existing handlers", () => {
    const profile = { ...profileFixture(), deleteConfirmationOpen: true, deletionFeedback: "Try again or contact support." };
    mockState.useProfileState.mockReturnValue(profile);
    render(<UserSettingsPage />);
    expect(screen.getByRole("dialog", { name: "Delete account?" })).toBeTruthy();
    expect(screen.getByRole("alert")).toHaveTextContent("Try again or contact support.");
    fireEvent.click(screen.getByRole("button", { name: "Keep account" }));
    expect(profile.handleCancelAccountDeletion).toHaveBeenCalledOnce();
    const confirmation = screen.getByRole("dialog", { name: "Delete account?" });
    fireEvent.click(within(confirmation).getByRole("button", { name: "Delete account" }));
    expect(profile.handleConfirmAccountDeletion).toHaveBeenCalledOnce();
  });
});
