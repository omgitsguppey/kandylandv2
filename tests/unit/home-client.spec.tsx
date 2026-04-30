// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    authValue: {
        user: null,
        userProfile: null,
        loading: false,
    } as {
        user: { uid: string } | null;
        userProfile: { role?: string; creatorApplication?: unknown } | null;
        loading: boolean;
    },
    redirectUiReady: false,
    replace: vi.fn(),
    trackEvent: vi.fn(),
    getPreferredAuthenticatedPathForProfile: vi.fn(() => "/dashboard"),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        replace: mockState.replace,
    }),
}));

vi.mock("@/context/AuthContext", () => ({
    useAuth: () => mockState.authValue,
    useAuthIdentity: () => ({ user: mockState.authValue.user }),
    useUserProfile: () => ({ userProfile: mockState.authValue.userProfile }),
    useAuthLoading: () => ({ loading: mockState.authValue.loading }),
}));

vi.mock("@/hooks/useDeferredClientReady", () => ({
    useDeferredClientReady: () => mockState.redirectUiReady,
}));

vi.mock("@/lib/creator-application", () => ({
    getPreferredAuthenticatedPathForProfile: (profile: unknown, ownerId: unknown) =>
        (mockState.getPreferredAuthenticatedPathForProfile as (profile: unknown, ownerId: unknown) => string)(profile, ownerId),
}));

vi.mock("@/lib/telemetry", () => ({
    trackEvent: (...args: unknown[]) => mockState.trackEvent(...args),
}));

import HomeClient from "@/app/HomeClient";

describe("HomeClient", () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
        mockState.authValue = {
            user: null,
            userProfile: null,
            loading: false,
        };
        mockState.redirectUiReady = false;
        mockState.replace.mockReset();
        mockState.trackEvent.mockReset();
        mockState.getPreferredAuthenticatedPathForProfile.mockReset();
        mockState.getPreferredAuthenticatedPathForProfile.mockReturnValue("/dashboard");
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    it("tracks the homepage view for guests without redirecting", async () => {
        await act(async () => {
            root.render(<HomeClient />);
        });

        expect(mockState.trackEvent).toHaveBeenCalledWith("home_page_viewed");
        expect(mockState.replace).not.toHaveBeenCalled();
        expect(container.textContent).toBe("");
    });

    it("redirects signed-in non-admin users without blocking the page shell", async () => {
        mockState.authValue = {
            user: { uid: "fan_1" },
            userProfile: { role: "user" },
            loading: false,
        };
        mockState.redirectUiReady = true;
        mockState.getPreferredAuthenticatedPathForProfile.mockReturnValue("/dashboard");

        await act(async () => {
            root.render(<HomeClient />);
        });

        expect(mockState.getPreferredAuthenticatedPathForProfile).toHaveBeenCalledWith(mockState.authValue.userProfile, "fan_1");
        expect(mockState.replace).toHaveBeenCalledWith("/dashboard");
        expect(container.textContent).toContain("Returning you to your dashboard");
        expect(mockState.trackEvent).not.toHaveBeenCalledWith("home_page_viewed");
    });
});
