// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import { StrictMode, type ChangeEvent } from "react";
import type { User } from "firebase/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useProfileState } from "@/app/dashboard/profile/hooks/useProfileState";
import { KandySupportSafetyPanel } from "@/components/creative-tim/kandydrops/account/AccountSettingsPanels";
import { UserSettingsPage } from "@/components/Settings/UserSettingsPage";
import { buildCanonicalCreatorSettingsFixture, buildCanonicalUserFixture } from "@/lib/testing/canonical-test-factories";
import type { UserProfile } from "@/types/db";

const state = vi.hoisted(() => ({
    user: null as User | null,
    userProfile: null as UserProfile | null,
    loading: false,
    logout: vi.fn(),
    authFetch: vi.fn(),
    updateProfile: vi.fn(),
    uploadBytes: vi.fn(),
    getDownloadURL: vi.fn(),
    enableBrowserNotifications: vi.fn(),
    mutate: vi.fn(),
    assignLocation: vi.fn(),
    persistPrivacy: vi.fn(),
    trackEvent: vi.fn(),
    reportClientIssue: vi.fn(),
    toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock("@/context/AuthContext", () => ({
    useAuth: () => ({ user: state.user, logout: state.logout, loading: state.loading }),
    useUserProfile: () => ({ userProfile: state.userProfile }),
    useAuthLoading: () => ({ loading: state.loading }),
}));
vi.mock("@/lib/authFetch", () => ({ authFetch: (...args: unknown[]) => state.authFetch(...args) }));
vi.mock("firebase/auth", () => ({ updateProfile: (...args: unknown[]) => state.updateProfile(...args) }));
vi.mock("@/lib/firebase-data", () => ({ storage: {} }));
vi.mock("firebase/storage", () => ({ ref: vi.fn(), uploadBytes: (...args: unknown[]) => state.uploadBytes(...args), getDownloadURL: (...args: unknown[]) => state.getDownloadURL(...args) }));
vi.mock("swr", () => ({ mutate: (...args: unknown[]) => state.mutate(...args) }));
vi.mock("@/lib/firebase-messaging", () => ({
    getBrowserNotificationState: async () => ({ needsStandaloneInstall: false, browserCapable: false }),
}));
vi.mock("@/lib/browser-notification-enrollment", () => ({ enableBrowserNotifications: (...args: unknown[]) => state.enableBrowserNotifications(...args) }));
vi.mock("@/lib/privacy-consent", async (importOriginal) => ({
    ...await importOriginal<typeof import("@/lib/privacy-consent")>(),
    getBrowserGlobalPrivacyControl: () => false,
    persistPrivacySettingsSnapshot: (...args: unknown[]) => state.persistPrivacy(...args),
}));
vi.mock("@/lib/client-error-reporting", () => ({
    getClientErrorMessage: (_error: unknown, fallback: string) => fallback,
    reportClientIssue: (...args: unknown[]) => state.reportClientIssue(...args),
}));
vi.mock("@/lib/telemetry", () => ({ trackEvent: (...args: unknown[]) => state.trackEvent(...args) }));
vi.mock("sonner", () => ({ toast: state.toast }));

function account(role: NonNullable<UserProfile["role"]> = "user", uid = "account-owner", displayName = "Account Owner") {
    const profile = buildCanonicalUserFixture({
        uid,
        displayName,
        email: "fixture@example.test",
        role,
        creatorSettings: buildCanonicalCreatorSettingsFixture(),
        privacySettings: {
            anonymousAnalyticsEnabled: true,
            identifiedAnalyticsEnabled: true,
            allowRecommendations: true,
            showInAnonymousStats: true,
            honorGlobalPrivacyControl: false,
        },
    });
    // Firebase auth is an explicit fixture boundary; the actual Account hook
    // and its real profile/privacy payload builders execute unchanged.
    state.user = { uid: profile.uid, displayName: profile.displayName, email: profile.email, photoURL: null } as User;
    state.userProfile = profile;
}

function creatorRequests() {
    return state.authFetch.mock.calls.filter(([input]) => String(input).startsWith("/api/creator/"));
}

async function settleEffects() {
    await act(async () => { await Promise.resolve(); });
}

function AccountSafety() {
    const accountState = useProfileState();
    return <><button type="button">Outside account action</button><KandySupportSafetyPanel state={accountState} /></>;
}

beforeEach(() => {
    vi.useFakeTimers();
    state.loading = false;
    account();
    state.logout.mockReset().mockResolvedValue(undefined);
    state.authFetch.mockReset().mockImplementation(async (input: unknown) => {
        if (String(input).startsWith("/api/creator/")) {
            return Response.json({ error: "Creator tools are not available from Account" }, { status: 403 });
        }
        return Response.json({ success: true });
    });
    state.updateProfile.mockReset().mockResolvedValue(undefined);
    state.uploadBytes.mockReset().mockResolvedValue(undefined);
    state.getDownloadURL.mockReset().mockResolvedValue("https://media.example.test/account-avatar.png");
    state.enableBrowserNotifications.mockReset().mockResolvedValue({ status: "enabled", messagingSupported: true });
    state.mutate.mockReset();
    state.assignLocation.mockReset();
    vi.spyOn(window.location, "assign").mockImplementation(state.assignLocation);
    state.persistPrivacy.mockReset();
    state.trackEvent.mockReset();
    state.reportClientIssue.mockReset();
    Object.values(state.toast).forEach((spy) => spy.mockReset());
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.querySelectorAll("a[download]").forEach((node) => node.remove());
});

describe("the actual Account hook owns only Account work", () => {
    it.each(["user", "creator", "admin"] as const)("does not request hidden Creator tools for %s mounts or Creator-setting updates", async (role) => {
        account(role);
        const hook = renderHook(() => useProfileState());
        await settleEffects();
        expect(creatorRequests()).toEqual([]);
        expect(state.toast.error).not.toHaveBeenCalled();

        state.userProfile = {
            ...state.userProfile!,
            gumDropsBalance: 200,
            creatorSettings: buildCanonicalCreatorSettingsFixture({ broadcastsEnabled: false }),
        };
        hook.rerender();
        await settleEffects();
        expect(creatorRequests()).toEqual([]);
        expect(state.authFetch).not.toHaveBeenCalled();
        expect(hook.result.current.formState.displayName).toBe("Account Owner");
    });

    it("debounces a real account edit to the canonical endpoint and keeps successful profile feedback", async () => {
        const hook = renderHook(() => useProfileState());
        await settleEffects();
        act(() => hook.result.current.updateForm("displayName", "New Name"));
        await act(async () => { await vi.advanceTimersByTimeAsync(649); });
        expect(state.authFetch).not.toHaveBeenCalled();
        await act(async () => { await vi.advanceTimersByTimeAsync(1); });

        expect(state.updateProfile).toHaveBeenCalledExactlyOnceWith(state.user, { displayName: "New Name" });
        expect(state.authFetch).toHaveBeenCalledTimes(1);
        const [path, init] = state.authFetch.mock.calls[0] as [string, RequestInit];
        expect(path).toBe("/api/user/profile");
        expect(init.method).toBe("PUT");
        expect(JSON.parse(String(init.body))).toMatchObject({ displayName: "New Name" });
        expect(hook.result.current.saveFeedback).toBe("Saved");
        expect(hook.result.current.saving).toBe(false);
        expect(state.trackEvent).toHaveBeenCalledWith("setting_save_succeeded", expect.objectContaining({ settings_surface: "account" }));

        state.userProfile = { ...state.userProfile!, gumDropsBalance: 220 };
        hook.rerender();
        await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
        expect(state.authFetch).toHaveBeenCalledTimes(1);
        expect(creatorRequests()).toEqual([]);
    });

    it("keeps a failed edit visible without background retries, then accepts the next valid edit", async () => {
        state.authFetch.mockResolvedValueOnce(Response.json({ error: "Account changes could not be saved" }, { status: 503 }));
        const hook = renderHook(() => useProfileState());
        await settleEffects();
        act(() => hook.result.current.updateForm("username", "first_handle"));
        await act(async () => { await vi.advanceTimersByTimeAsync(650); });
        expect(hook.result.current.formState.username).toBe("first_handle");
        expect(hook.result.current.saveFeedback).toBe("Account changes could not be saved");
        expect(state.trackEvent).toHaveBeenCalledWith("setting_save_failed", expect.objectContaining({ failure_code: "profile_save_failed" }));
        await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
        expect(state.authFetch).toHaveBeenCalledTimes(1);

        act(() => hook.result.current.updateForm("username", "second_handle"));
        await act(async () => { await vi.advanceTimersByTimeAsync(650); });
        expect(state.authFetch).toHaveBeenCalledTimes(2);
        expect(hook.result.current.formState.username).toBe("second_handle");
        expect(hook.result.current.saveFeedback).toBe("Saved");
        expect(creatorRequests()).toEqual([]);
    });

    it("waits for a profile owned by the resolved actor before publishing fields or saving", async () => {
        account("user", "actor-a", "Actor A");
        const staleProfile = state.userProfile;
        account("user", "actor-b", "Actor B");
        state.userProfile = staleProfile;
        const hook = renderHook(() => useProfileState());
        await settleEffects();

        expect.soft(hook.result.current.formState.displayName).not.toBe("Actor A");
        act(() => hook.result.current.updateForm("username", "stale_actor_handle"));
        await act(async () => { await vi.advanceTimersByTimeAsync(650); });
        expect.soft(state.updateProfile).not.toHaveBeenCalled();
        expect.soft(state.authFetch).not.toHaveBeenCalled();

        account("user", "actor-b", "Actor B");
        hook.rerender();
        await settleEffects();
        expect(hook.result.current.formState.displayName).toBe("Actor B");
        state.authFetch.mockClear();
        state.updateProfile.mockClear();
        act(() => hook.result.current.updateForm("username", "actor_b_handle"));
        await act(async () => { await vi.advanceTimersByTimeAsync(650); });
        expect(state.authFetch).toHaveBeenCalledTimes(1);
        expect(JSON.parse(String(state.authFetch.mock.calls[0][1].body))).toMatchObject({ displayName: "Actor B", username: "actor_b_handle" });
    });

    it("discards an old actor's delayed save before the caller-scoped request and permits the new actor's next edit", async () => {
        account("user", "actor-a", "Actor A");
        let finishAuthProfile!: () => void;
        state.updateProfile.mockImplementationOnce(() => new Promise<void>((resolve) => { finishAuthProfile = resolve; }));
        const hook = renderHook(() => useProfileState());
        await settleEffects();
        act(() => hook.result.current.updateForm("displayName", "Actor A edited"));
        await act(async () => { await vi.advanceTimersByTimeAsync(650); });
        expect(state.updateProfile).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ uid: "actor-a" }), { displayName: "Actor A edited" });
        expect(state.authFetch).not.toHaveBeenCalled();

        account("user", "actor-b", "Actor B");
        hook.rerender();
        await settleEffects();
        await act(async () => { finishAuthProfile(); await Promise.resolve(); });
        expect.soft(state.authFetch).not.toHaveBeenCalled();
        expect.soft(state.persistPrivacy).not.toHaveBeenCalled();
        expect.soft(hook.result.current.saveFeedback).not.toBe("Saved");
        expect.soft(state.trackEvent.mock.calls.some(([name]) => name === "setting_save_succeeded")).toBe(false);
        expect(hook.result.current.formState.displayName).toBe("Actor B");

        state.authFetch.mockClear();
        state.persistPrivacy.mockClear();
        state.trackEvent.mockClear();
        act(() => hook.result.current.updateForm("username", "actor_b_next"));
        await act(async () => { await vi.advanceTimersByTimeAsync(650); });
        expect(state.authFetch).toHaveBeenCalledTimes(1);
        expect(JSON.parse(String(state.authFetch.mock.calls[0][1].body))).toMatchObject({ displayName: "Actor B", username: "actor_b_next" });
        expect(hook.result.current.saveFeedback).toBe("Saved");
    });

    it("disposes an old actor's delayed HTTP result without changing the new actor's privacy, feedback or view", async () => {
        account("user", "actor-a", "Actor A");
        let finishProfileWrite!: (response: Response) => void;
        state.authFetch.mockImplementationOnce(() => new Promise<Response>((resolve) => { finishProfileWrite = resolve; }));
        const hook = renderHook(() => useProfileState());
        await settleEffects();
        act(() => hook.result.current.updateForm("username", "actor_a_http"));
        await act(async () => { await vi.advanceTimersByTimeAsync(650); });
        expect(state.authFetch).toHaveBeenCalledTimes(1);
        account("user", "actor-b", "Actor B");
        hook.rerender();
        await settleEffects();
        await act(async () => { finishProfileWrite(Response.json({ success: true })); await Promise.resolve(); });
        expect(state.persistPrivacy).not.toHaveBeenCalled();
        expect(hook.result.current.formState.displayName).toBe("Actor B");
        expect(hook.result.current.saveFeedback).toBeNull();
        expect(hook.result.current.saving).toBe(false);
        expect(state.trackEvent.mock.calls.some(([name]) => name === "setting_save_succeeded")).toBe(false);
    });

    it("renders only the current actor's fields and counts each actual Account visit across profile/auth gaps", async () => {
        account("user", "actor-a", "Actor A");
        state.loading = true;
        const view = render(<UserSettingsPage />);
        await settleEffects();
        const viewFacts = () => state.trackEvent.mock.calls.filter(([name]) => name === "user_settings_viewed" || name === "settings_surface_viewed");
        expect.soft(screen.queryByLabelText("Display name")).not.toBeInTheDocument();
        expect.soft(viewFacts()).toHaveLength(0);
        state.loading = false;
        view.rerender(<UserSettingsPage />);
        await settleEffects();
        expect(screen.getByLabelText("Display name")).toHaveValue("Actor A");
        expect(viewFacts()).toHaveLength(2);

        const profileA = state.userProfile;
        account("user", "actor-b", "Actor B");
        state.userProfile = profileA;
        view.rerender(<UserSettingsPage />);
        await settleEffects();
        expect.soft(screen.queryByLabelText("Display name")).not.toBeInTheDocument();
        expect.soft(viewFacts()).toHaveLength(2);
        account("user", "actor-b", "Actor B");
        view.rerender(<UserSettingsPage />);
        await settleEffects();
        expect(screen.getByLabelText("Display name")).toHaveValue("Actor B");
        expect(viewFacts()).toHaveLength(4);
        for (const [, payload] of viewFacts().slice(2)) {
            expect(payload).toMatchObject({ creator_id: "actor-b", target_creator_id: "actor-b" });
        }

        state.loading = true;
        view.rerender(<UserSettingsPage />);
        await settleEffects();
        expect(screen.queryByLabelText("Display name")).not.toBeInTheDocument();
        state.loading = false;
        state.userProfile = { ...state.userProfile!, gumDropsBalance: 500 };
        view.rerender(<UserSettingsPage />);
        await settleEffects();
        expect(screen.getByLabelText("Display name")).toHaveValue("Actor B");
        expect(viewFacts()).toHaveLength(4);
        expect(state.authFetch).not.toHaveBeenCalled();
    });

    it.each(["privacy", "export", "delete"] as const)("ignores an old actor's delayed %s result after an Account owner change", async (operation) => {
        account("user", "actor-a", "Actor A");
        const createUrl = vi.spyOn(window.URL, "createObjectURL").mockReturnValue("blob:old-account-export");
        vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => undefined);
        const download = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
        let finishRequest!: (response: Response) => void;
        let pending!: Promise<unknown>;
        state.authFetch.mockImplementationOnce(() => new Promise<Response>((resolve) => { finishRequest = resolve; }));
        const hook = renderHook(() => useProfileState());
        await settleEffects();
        act(() => {
            if (operation === "privacy") pending = hook.result.current.handleWithdrawOptionalTracking();
            else if (operation === "export") pending = hook.result.current.handleDownloadData();
            else {
                hook.result.current.handleRequestDeletion();
                pending = hook.result.current.handleConfirmAccountDeletion();
            }
        });
        expect(state.authFetch).toHaveBeenCalledTimes(1);
        account("user", "actor-b", "Actor B");
        hook.rerender();
        await settleEffects();
        state.trackEvent.mockClear();
        await act(async () => {
            finishRequest(operation === "delete" ? Response.json({ error: "Unauthorized" }, { status: 401 }) : Response.json({ success: true, export: "actor-a" }));
            await pending;
        });
        expect(state.persistPrivacy).not.toHaveBeenCalled();
        expect(createUrl).not.toHaveBeenCalled();
        expect(download).not.toHaveBeenCalled();
        expect(hook.result.current.formState.displayName).toBe("Actor B");
        expect(hook.result.current.saveFeedback).toBeNull();
        expect(hook.result.current.deletionFeedback).toBeNull();
        expect(hook.result.current.deleteConfirmationOpen).toBe(false);
        expect(hook.result.current.isDownloading).toBe(false);
        expect(hook.result.current.isDeleting).toBe(false);
        expect(state.trackEvent).not.toHaveBeenCalled();
        expect(state.logout).not.toHaveBeenCalled();
        expect(state.assignLocation).not.toHaveBeenCalled();
    });

    it("stops an old avatar upload before publishing it through the new actor's caller-scoped endpoint", async () => {
        account("user", "actor-a", "Actor A");
        let finishUpload!: () => void;
        let pending!: Promise<void>;
        state.uploadBytes.mockImplementationOnce(() => new Promise<void>((resolve) => { finishUpload = resolve; }));
        const hook = renderHook(() => useProfileState());
        await settleEffects();
        act(() => {
            pending = hook.result.current.handleChangeAvatar({ target: { files: [new File(["fixture"], "avatar.png", { type: "image/png" })] } } as unknown as ChangeEvent<HTMLInputElement>);
        });
        expect(state.uploadBytes).toHaveBeenCalledTimes(1);
        account("user", "actor-b", "Actor B");
        hook.rerender();
        await settleEffects();
        await act(async () => { finishUpload(); await pending; });
        expect(state.getDownloadURL).not.toHaveBeenCalled();
        expect(state.authFetch).not.toHaveBeenCalled();
        expect(state.updateProfile).not.toHaveBeenCalled();
        expect(state.mutate).not.toHaveBeenCalled();
        expect(hook.result.current.isUploadingAvatar).toBe(false);
        expect(state.trackEvent.mock.calls.some(([name]) => name === "avatar_uploaded")).toBe(false);
    });

    it("does not apply the old actor's delayed notification enrollment to the new actor's preferences", async () => {
        account("user", "actor-a", "Actor A");
        let finishEnrollment!: (result: { status: "enabled"; messagingSupported: boolean }) => void;
        let pending!: Promise<void>;
        state.enableBrowserNotifications.mockImplementationOnce(() => new Promise((resolve) => { finishEnrollment = resolve; }));
        const hook = renderHook(() => useProfileState());
        await settleEffects();
        act(() => { pending = hook.result.current.handleBrowserPushToggle(true); });
        expect(state.enableBrowserNotifications).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ uid: "actor-a" }));
        account("user", "actor-b", "Actor B");
        hook.rerender();
        await settleEffects();
        await act(async () => { finishEnrollment({ status: "enabled", messagingSupported: true }); await pending; });
        expect(hook.result.current.formState.browserPushEnabled).toBe(false);
        expect(hook.result.current.notificationSetupLoading).toBe(false);
        await act(async () => { await vi.advanceTimersByTimeAsync(650); });
        expect(state.authFetch).not.toHaveBeenCalled();
        expect(state.toast.success).not.toHaveBeenCalled();
    });

    it("preserves a single real save in StrictMode and disposes an in-flight result after Account unmount", async () => {
        const hook = renderHook(() => useProfileState(), { wrapper: StrictMode });
        await settleEffects();
        act(() => hook.result.current.updateForm("username", "strict_save"));
        await act(async () => { await vi.advanceTimersByTimeAsync(650); });
        expect(state.authFetch).toHaveBeenCalledTimes(1);
        expect(state.trackEvent.mock.calls.filter(([name]) => name === "setting_save_succeeded")).toHaveLength(1);
        state.persistPrivacy.mockClear();
        state.trackEvent.mockClear();
        let finishRequest!: (response: Response) => void;
        state.authFetch.mockImplementationOnce(() => new Promise<Response>((resolve) => { finishRequest = resolve; }));
        act(() => hook.result.current.updateForm("username", "after_unmount"));
        await act(async () => { await vi.advanceTimersByTimeAsync(650); });
        expect(state.authFetch).toHaveBeenCalledTimes(2);
        hook.unmount();
        await act(async () => { finishRequest(Response.json({ success: true })); await Promise.resolve(); });
        expect(state.persistPrivacy).not.toHaveBeenCalled();
        expect(state.trackEvent).not.toHaveBeenCalled();
    });

    it("withdraws optional tracking through the real privacy builder and avoids a duplicate autosave", async () => {
        const hook = renderHook(() => useProfileState());
        await settleEffects();
        await act(async () => { await hook.result.current.handleWithdrawOptionalTracking(); });
        const [path, init] = state.authFetch.mock.calls[0] as [string, RequestInit];
        expect(path).toBe("/api/user/profile");
        expect(JSON.parse(String(init.body))).toMatchObject({
            privacySettings: {
                consentMode: "necessary_only",
                consentSource: "account_settings",
                anonymousAnalyticsEnabled: false,
                identifiedAnalyticsEnabled: false,
                allowRecommendations: false,
                showInAnonymousStats: false,
            },
        });
        expect(state.persistPrivacy).toHaveBeenCalledWith(expect.objectContaining({ consentSource: "account_settings", identifiedAnalyticsEnabled: false }));
        expect(hook.result.current.formState).toMatchObject({ anonymousAnalyticsEnabled: false, identifiedAnalyticsEnabled: false, allowRecommendations: false });
        expect(hook.result.current.saveFeedback).toBe("Essential-only mode saved");
        await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
        expect(state.authFetch).toHaveBeenCalledTimes(1);
        expect(creatorRequests()).toEqual([]);
    });

    it("requires confirmation and keeps the dialog open with readable failure after a rejected deletion", async () => {
        state.authFetch.mockResolvedValueOnce(Response.json({ error: "Unauthorized" }, { status: 401 }));
        const hook = renderHook(() => useProfileState());
        await settleEffects();
        act(() => hook.result.current.handleRequestDeletion());
        expect(hook.result.current.deleteConfirmationOpen).toBe(true);
        expect(state.authFetch).not.toHaveBeenCalled();
        await act(async () => { await hook.result.current.handleConfirmAccountDeletion(); });

        expect(state.authFetch).toHaveBeenCalledExactlyOnceWith("/api/user/delete", { method: "DELETE" });
        expect(hook.result.current.deleteConfirmationOpen).toBe(true);
        expect(hook.result.current.isDeleting).toBe(false);
        expect(hook.result.current.deletionFeedback).toMatch(/Sign in again and retry/);
        expect(state.logout).not.toHaveBeenCalled();
        expect(state.reportClientIssue).toHaveBeenCalledWith(expect.objectContaining({ fingerprint: "account-delete-flow-route-failed" }));
        expect(state.trackEvent).toHaveBeenCalledWith("account_delete_failed", expect.objectContaining({ failure_code: "http_401" }));
        act(() => hook.result.current.handleCancelAccountDeletion());
        expect(hook.result.current.deleteConfirmationOpen).toBe(false);
        expect(hook.result.current.deletionFeedback).toBeNull();
    });

    it("classifies pending cleanup as incomplete and does not announce deletion success", async () => {
        state.authFetch.mockResolvedValueOnce(Response.json({ success: false, message: "Account cleanup is pending" }, { status: 503 }));
        const hook = renderHook(() => useProfileState());
        await settleEffects();
        act(() => hook.result.current.handleRequestDeletion());
        await act(async () => { await hook.result.current.handleConfirmAccountDeletion(); });
        expect(hook.result.current.deletionFeedback).toMatch(/final cleanup needs support review/);
        expect(hook.result.current.deleteConfirmationOpen).toBe(true);
        expect(state.logout).not.toHaveBeenCalled();
        expect(state.trackEvent.mock.calls.some(([name]) => name === "account_delete_completed")).toBe(false);
        expect(state.toast.success).not.toHaveBeenCalled();
    });

    it("settles an explicitly acknowledged successful deletion once", async () => {
        state.authFetch.mockResolvedValue(Response.json({ success: true, deleted: { authUserDeleted: true } }));
        const hook = renderHook(() => useProfileState());
        await act(async () => { await Promise.resolve(); });
        act(() => hook.result.current.handleRequestDeletion());
        await act(async () => { await hook.result.current.handleConfirmAccountDeletion(); });
        expect(hook.result.current.deleteConfirmationOpen).toBe(false);
        expect(state.logout).toHaveBeenCalledTimes(1);
        expect(state.assignLocation).toHaveBeenCalledExactlyOnceWith("/");
        expect(state.trackEvent.mock.calls.filter(([event]) => event === "account_delete_completed")).toHaveLength(1);
        expect(state.trackEvent.mock.calls.some(([event]) => event === "account_delete_failed")).toBe(false);
    });

    it.each([
        { status: 409, code: "account_deletion_retention_review_required", accountActive: true, expected: /Contact support; your account remains active/ },
        { status: 503, code: "account_deletion_cleanup_pending", accountActive: false, expected: /Account login is disabled, but final cleanup is pending/ },
        { status: 503, code: "account_deletion_retention_reconciliation_pending", accountActive: false, expected: /Account login is disabled, but final cleanup is pending/ },
        { status: 200, code: undefined, accountActive: undefined, expected: /We could not submit the deletion request/ },
    ])("keeps $code incomplete with truthful human recovery", async ({ status, code, accountActive, expected }) => {
        // Provider/network/Auth are explicit fixtures. The hook, helper, error
        // state, confirmation lifecycle and event classifications run unchanged.
        state.authFetch.mockResolvedValue(Response.json({ success: false, code, retryable: false, accountActive, error: "Review required" }, { status }));
        const hook = renderHook(() => useProfileState());
        await act(async () => { await Promise.resolve(); });
        act(() => hook.result.current.handleRequestDeletion());
        expect(state.authFetch).not.toHaveBeenCalled();
        await act(async () => { await hook.result.current.handleConfirmAccountDeletion(); });
        expect(hook.result.current.deletionFeedback).toMatch(expected);
        expect(hook.result.current.deleteConfirmationOpen).toBe(true);
        expect(hook.result.current.isDeleting).toBe(false);
        expect(state.trackEvent).toHaveBeenCalledWith("account_delete_failed", expect.objectContaining({ failure_code: code || `http_${status}`, status }));
        await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
        expect(state.authFetch).toHaveBeenCalledExactlyOnceWith("/api/user/delete", { method: "DELETE" });
        expect(state.logout).not.toHaveBeenCalled();
        expect(state.assignLocation).not.toHaveBeenCalled();
        expect(state.toast.success).not.toHaveBeenCalled();
        expect(state.trackEvent.mock.calls.some(([event]) => event === "account_delete_completed")).toBe(false);
        expect(state.reportClientIssue).toHaveBeenCalledWith(expect.objectContaining({ fingerprint: "account-delete-flow-route-failed" }));
        act(() => hook.result.current.handleCancelAccountDeletion());
        expect(hook.result.current.deleteConfirmationOpen).toBe(false);
    });

    it("keeps the actual data-export endpoint and releases the local download URL", async () => {
        const createUrl = vi.spyOn(window.URL, "createObjectURL").mockReturnValue("blob:account-export-fixture");
        const revokeUrl = vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => undefined);
        const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
        const hook = renderHook(() => useProfileState());
        await settleEffects();
        await act(async () => { await hook.result.current.handleDownloadData(); });
        expect(state.authFetch).toHaveBeenCalledExactlyOnceWith("/api/user/data", { method: "GET" });
        expect(click).toHaveBeenCalledTimes(1);
        expect(createUrl).toHaveBeenCalledTimes(1);
        expect(revokeUrl).toHaveBeenCalledExactlyOnceWith("blob:account-export-fixture");
        expect(hook.result.current.isDownloading).toBe(false);
        expect(state.trackEvent).toHaveBeenCalledWith("data_export_requested", expect.objectContaining({ setting_id: "download_my_data" }));
        expect(creatorRequests()).toEqual([]);
    });

    it("keeps dialog focus inside and restores the real trigger after one Escape cancellation", async () => {
        vi.useRealTimers();
        render(<AccountSafety />);
        const trigger = screen.getByRole("button", { name: /^Delete account/ });
        trigger.focus();
        fireEvent.click(trigger);
        const dialog = await screen.findByRole("dialog", { name: "Delete account?" });
        expect(dialog).toHaveAttribute("aria-modal", "true");
        const title = within(dialog).getByRole("heading", { name: "Delete account?" });
        expect(title).toHaveAttribute("tabindex", "-1");
        await waitFor(() => expect(title).toHaveFocus());
        expect(within(dialog).getByRole("button", { name: "Keep account" })).toBeEnabled();
        screen.getByRole("button", { name: "Outside account action", hidden: true }).focus();
        expect(dialog).toContainElement(document.activeElement as HTMLElement);
        expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
        fireEvent.keyDown(dialog, { key: "Escape" });
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        await waitFor(() => expect(trigger).toHaveFocus());
        expect(state.trackEvent.mock.calls.filter(([name]) => name === "account_delete_cancelled")).toHaveLength(1);
        expect(state.authFetch).not.toHaveBeenCalled();
    });

    it.each([
        { status: 409, code: "account_deletion_retention_review_required", accountActive: true, expected: /your account remains active/ },
        { status: 503, code: "account_deletion_cleanup_pending", accountActive: false, expected: /Account login is disabled/ },
        { status: 503, code: "account_deletion_retention_reconciliation_pending", accountActive: false, expected: /Account login is disabled/ },
    ])("offers the real support route after $code instead of repeating deletion", async ({ status, code, accountActive, expected }) => {
        vi.useRealTimers();
        state.authFetch.mockResolvedValueOnce(Response.json({ success: false, code, retryable: false, accountActive, error: "Review required" }, { status }));
        render(<AccountSafety />);
        fireEvent.click(screen.getByRole("button", { name: /^Delete account/ }));
        const dialog = await screen.findByRole("dialog", { name: "Delete account?" });
        fireEvent.click(within(dialog).getByRole("button", { name: "Delete account" }));
        const support = await within(dialog).findByRole("link", { name: "Contact support" });
        expect(support).toHaveAttribute("href", "/dashboard/support");
        expect(within(dialog).getByRole("alert")).toHaveTextContent(expected);
        expect(within(dialog).queryByRole("button", { name: "Delete account" })).not.toBeInTheDocument();
        expect(state.authFetch).toHaveBeenCalledTimes(1);
        expect(state.logout).not.toHaveBeenCalled();
        fireEvent.click(within(dialog).getByRole("button", { name: "Keep account" }));
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("preserves an in-flight delete confirmation, then exposes failure and allows cancellation", async () => {
        vi.useRealTimers();
        let finish!: (response: Response) => void;
        state.authFetch.mockImplementationOnce(() => new Promise<Response>((resolve) => { finish = resolve; }));
        render(<AccountSafety />);
        fireEvent.click(screen.getByRole("button", { name: /^Delete account/ }));
        const dialog = await screen.findByRole("dialog", { name: "Delete account?" });
        fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
        expect(screen.getByRole("button", { name: "Deleting..." })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Keep account" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Cancel account deletion" })).toBeDisabled();
        fireEvent.keyDown(dialog, { key: "Escape" });
        expect(screen.getByRole("dialog", { name: "Delete account?" })).toBeInTheDocument();
        expect(state.authFetch).toHaveBeenCalledExactlyOnceWith("/api/user/delete", { method: "DELETE" });
        await act(async () => { finish(Response.json({ error: "Unauthorized" }, { status: 401 })); });
        expect(screen.getByRole("alert")).toHaveTextContent(/Sign in again and retry/);
        fireEvent.click(screen.getByRole("button", { name: "Keep account" }));
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(state.logout).not.toHaveBeenCalled();
        expect(state.trackEvent.mock.calls.filter(([name]) => name === "account_delete_cancelled")).toHaveLength(1);
    });
});
