// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    authUser: { uid: "viewer_a" } as { uid: string } | null,
    userProfile: { uid: "viewer_a", gumDropsPurchasedBalance: 1000 } as Record<string, unknown> | null,
    publicFetch: vi.fn(),
    routerPush: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useParams: () => ({ username: "creator-one" }),
    useRouter: () => ({ push: mockState.routerPush }),
}));

vi.mock("@/context/AuthContext", () => ({
    useAuth: () => ({
        user: mockState.authUser,
        userProfile: mockState.userProfile,
        setUserProfile: vi.fn(),
        loading: false,
    }),
}));

vi.mock("@/context/UIContext", () => ({
    useUI: () => ({ openAuthModal: vi.fn(), openPurchaseModal: vi.fn() }),
}));

vi.mock("@/lib/ui-continuity", () => ({
    loadUiContinuityModules: async () => {
        const actor = mockState.authUser?.uid ?? "guest";
        const state = (key: string) => ({
            key,
            label: key,
            critical: false,
            status: "success",
            warning: null,
            fallbackActive: false,
            responseOk: true,
        });
        return [
            { state: state("relationship"), value: { relationship: { following: actor === "viewer_a", notificationsEnabled: actor === "viewer_a" } } },
            { state: state("subscriptions"), value: { subscription: actor === "viewer_a" ? { status: "active" } : null } },
            { state: state("messages"), value: { messages: actor === "viewer_a" ? [{ id: "private-a-message" }] : [] } },
            { state: state("bookings"), value: { bookings: actor === "viewer_a" ? [{ id: "private-a-booking" }] : [] } },
            { state: state("broadcasts"), value: { broadcasts: [] } },
        ];
    },
    readUiJson: vi.fn(),
}));

vi.mock("@/components/Creators/CreatorProfileHeader", () => ({
    CreatorProfileHeader: (props: { following: boolean; notificationsEnabled: boolean }) => (
        <div
            data-testid="creator-profile-header"
            data-following={String(props.following)}
            data-notifications={String(props.notificationsEnabled)}
        />
    ),
}));

vi.mock("@/components/Creators/CreatorExperiencesPanel", () => ({
    CreatorExperiencesPanel: (props: {
        existingBookings: Array<{ id?: string }>;
        messages: Array<{ id?: string }>;
        subscriptionActive: boolean;
    }) => (
        <div
            data-testid="creator-experiences"
            data-bookings={props.existingBookings.map((entry) => entry.id).join(",")}
            data-messages={props.messages.map((entry) => entry.id).join(",")}
            data-subscription-active={String(props.subscriptionActive)}
        />
    ),
}));

vi.mock("@/components/Creators/CreatorProfileTimelineFeed", () => ({
    CreatorProfileTimelineFeed: () => null,
}));
vi.mock("@/components/DropGrid", () => ({ DropGrid: () => null }));
vi.mock("@/components/ui/NotFoundSurface", () => ({ NotFoundSurface: () => <div>not found</div> }));
vi.mock("@/components/ui/UiContinuityNotice", () => ({ UiContinuityNotice: () => null }));
vi.mock("@/components/Creators/CreatorPaidGdGuidanceCard", () => ({ CreatorPaidGdGuidanceCard: () => null }));
vi.mock("@/lib/telemetry", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/client-error-reporting", () => ({ reportClientIssue: vi.fn() }));
vi.mock("@/lib/authFetch", () => ({ authFetch: vi.fn() }));

import CreatorProfileClient from "@/app/creators/[username]/CreatorProfileClient";

function publicCreatorResponse() {
    return {
        ok: true,
        json: async () => ({
            success: true,
            creator: {
                uid: "creator_1",
                username: "creator-one",
                displayName: "Creator One",
                role: "creator",
                creatorSettings: {
                    subscriptionsEnabled: true,
                    messagingEnabled: true,
                    customRequestsEnabled: true,
                    bookingsEnabled: true,
                },
            },
            drops: [],
            timeline: { items: [] },
        }),
    };
}

describe("CreatorProfileClient viewer isolation", () => {
    beforeEach(() => {
        mockState.authUser = { uid: "viewer_a" };
        mockState.userProfile = { uid: "viewer_a", gumDropsPurchasedBalance: 1000 };
        mockState.publicFetch.mockReset();
        mockState.publicFetch.mockResolvedValue(publicCreatorResponse());
        mockState.routerPush.mockReset();
        vi.stubGlobal("fetch", mockState.publicFetch);
    });

    it("does not paint viewer A relationship or experience data during an A to B switch", async () => {
        const { container, rerender } = render(<CreatorProfileClient />);
        await waitFor(() => {
            expect(screen.getByTestId("creator-profile-header").dataset.following).toBe("true");
        });
        fireEvent.click(screen.getByRole("button", { name: "Experiences" }));
        await waitFor(() => {
            expect(screen.getByTestId("creator-experiences").dataset.messages).toBe("private-a-message");
            expect(screen.getByTestId("creator-experiences").dataset.bookings).toBe("private-a-booking");
        });

        mockState.publicFetch.mockReturnValue(new Promise(() => undefined));
        mockState.authUser = { uid: "viewer_b" };
        mockState.userProfile = { uid: "viewer_b", gumDropsPurchasedBalance: 0 };
        rerender(<CreatorProfileClient />);

        expect(screen.queryByTestId("creator-profile-header")).toBeNull();
        expect(screen.queryByTestId("creator-experiences")).toBeNull();
        expect(container.textContent).not.toContain("private-a-message");
        expect(container.textContent).not.toContain("private-a-booking");
    });

    it("does not paint signed-in viewer data during sign-out", async () => {
        const { container, rerender } = render(<CreatorProfileClient />);
        await waitFor(() => {
            expect(screen.getByTestId("creator-profile-header").dataset.notifications).toBe("true");
        });

        mockState.publicFetch.mockReturnValue(new Promise(() => undefined));
        mockState.authUser = null;
        mockState.userProfile = null;
        rerender(<CreatorProfileClient />);

        expect(screen.queryByTestId("creator-profile-header")).toBeNull();
        expect(container.textContent).not.toContain("private-a-message");
        expect(container.textContent).not.toContain("private-a-booking");
    });
});
