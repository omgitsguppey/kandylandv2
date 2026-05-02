// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { CreatorExperiencesPanel } from "@/components/Creators/CreatorExperiencesPanel";
import {
    CREATOR_BOOKING_RATES,
    CREATOR_MESSAGE_COSTS,
    CREATOR_SUBSCRIPTION_MIN_GD,
    DEFAULT_CREATOR_SETTINGS,
} from "@/lib/creator-experiences";

const mockState = vi.hoisted(() => ({
    routerPush: vi.fn(),
    trackEvent: vi.fn(),
}));
type CreatorExperienceView = "subscriptions" | "messages" | "requests" | "bookings";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockState.routerPush, replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/lib/telemetry", () => ({
    trackEvent: mockState.trackEvent,
}));

describe("CreatorExperiencesPanel", () => {
    const baseProps = {
        bookingDurationMinutes: 15,
        bookingServiceType: "video" as const,
        bookingStartAt: "",
        creatingBooking: false,
        creatingRequest: false,
        creatorId: "creator_1",
        creatorUsername: "creator",
        currentUser: { uid: "fan_1", gumDropsBalance: 50_000 },
        experienceWarnings: [],
        latestBooking: null,
        messages: [],
        onBookingDurationMinutesChange: () => undefined,
        onBookingServiceTypeChange: () => undefined,
        onBookingStartAtChange: () => undefined,
        onCreateBooking: () => undefined,
        onCreateRequest: () => undefined,
        onOpenAuth: () => undefined,
        onOpenChat: () => undefined,
        onSelectedExperienceChange: () => undefined,
        onStartSubscription: () => undefined,
        requestCategories: DEFAULT_CREATOR_SETTINGS.requestCategories,
        requestCategoryId: "",
        requestDetails: "",
        selectedExperience: "bookings" as const,
        settings: DEFAULT_CREATOR_SETTINGS,
        setRequestCategoryId: () => undefined,
        setRequestDetails: () => undefined,
        subscriptionActive: false,
        subscriptionHydrated: true,
        subscribeLoading: false,
    };

    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        mockState.trackEvent.mockClear();
        mockState.routerPush.mockClear();
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    it("renders continuity warnings and server-backed booking details", () => {
        const markup = renderToStaticMarkup(
            <CreatorExperiencesPanel
                {...baseProps}
                experienceWarnings={[{ key: "bookings", label: "Bookings", message: "Bookings route unavailable." }]}
                latestBooking={{ serviceType: "video", status: "booked", priceGd: 750, subscriberDiscountApplied: true }}
                subscriptionActive
            />,
        );

        expect(markup).toContain("Bookings is degraded");
        expect(markup).toContain("Subscriber 50% Off Applied");
        expect(markup).toContain("Live Time");
    });

    it("reflects updated creator settings for live time pricing", () => {
        const markup = renderToStaticMarkup(
            <CreatorExperiencesPanel
                {...baseProps}
                settings={{
                    ...DEFAULT_CREATOR_SETTINGS,
                    videoRatePerMinuteGd: 1500,
                    videoSubscriberDiscountPercent: 20,
                }}
            />,
        );

        expect(markup).toContain("@ 1500 GD/min");
        expect(markup).toContain("22500");
    });

    it("renders access-oriented copy for all creator experience lanes", () => {
        const renderLane = (selectedExperience: CreatorExperienceView, requestCategoryId = "") => renderToStaticMarkup(
            <CreatorExperiencesPanel
                {...baseProps}
                requestCategoryId={requestCategoryId}
                selectedExperience={selectedExperience}
            />,
        );

        expect(renderLane("subscriptions")).toContain("Stay closer when new access opens.");
        expect(renderLane("subscriptions")).toContain("Priority access to creator moments");
        expect(renderLane("messages")).toContain("Send a private message without getting lost in comments.");
        expect(renderLane("messages")).toContain("No private thread yet. Start with a simple message.");
        expect(renderLane("requests", "custom-photo")).toContain("Ask for something specific, then let the creator decide what fits.");
        expect(renderLane("requests", "custom-photo")).toContain("Describe what you want, the vibe, and any details the creator should know.");
        expect(renderLane("bookings")).toContain("Reserve real time before the window closes.");
        expect(renderLane("bookings")).toContain("Pick a time");
    });

    it("emits lane CTA telemetry with creator id and lane", () => {
        const onOpenChat = vi.fn();
        act(() => {
            root.render(
                <CreatorExperiencesPanel
                    {...baseProps}
                    onOpenChat={onOpenChat}
                    selectedExperience="messages"
                />,
            );
        });

        const button = Array.from(container.querySelectorAll("button"))
            .find((entry) => entry.textContent?.includes("Open private chat"));
        expect(button).toBeTruthy();

        act(() => {
            button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });

        expect(mockState.trackEvent).toHaveBeenCalledWith("creator_experience_cta_clicked", expect.objectContaining({
            creatorId: "creator_1",
            lane: "chat",
            actorType: "user",
            actorUid: "fan_1",
            route: "/creators/creator",
            source: "creator_experiences_panel",
        }));
        expect(onOpenChat).toHaveBeenCalledTimes(1);
    });

    it("tracks insufficient balance before routing fans to the wallet", () => {
        act(() => {
            root.render(
                <CreatorExperiencesPanel
                    {...baseProps}
                    currentUser={{ uid: "fan_1", gumDropsBalance: 0 }}
                    selectedExperience="subscriptions"
                />,
            );
        });

        const button = Array.from(container.querySelectorAll("button"))
            .find((entry) => entry.textContent?.includes("Add Gum Drops"));
        expect(button).toBeTruthy();

        act(() => {
            button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });

        expect(mockState.trackEvent).toHaveBeenCalledWith("creator_experience_insufficient_balance", expect.objectContaining({
            creatorId: "creator_1",
            lane: "fan_pass",
            balanceState: "insufficient_gd",
            priceGd: CREATOR_SUBSCRIPTION_MIN_GD,
        }));
        expect(mockState.routerPush).toHaveBeenCalledWith("/dashboard/wallet");
    });

    it("keeps creator experience pricing constants unchanged", () => {
        expect(CREATOR_MESSAGE_COSTS).toEqual({ text: 1, image: 5, video: 10 });
        expect(CREATOR_BOOKING_RATES).toEqual({ phone: 500, video: 1000 });
        expect(CREATOR_SUBSCRIPTION_MIN_GD).toBe(500);
    });
});
