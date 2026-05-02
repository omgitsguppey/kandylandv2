import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { CreatorExperiencesPanel } from "@/components/Creators/CreatorExperiencesPanel";
import { DEFAULT_CREATOR_SETTINGS } from "@/lib/creator-experiences";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

describe("CreatorExperiencesPanel", () => {
    const baseProps = {
        bookingDurationMinutes: 15,
        bookingServiceType: "video" as const,
        bookingStartAt: "",
        creatingBooking: false,
        creatingRequest: false,
        currentUser: { uid: "fan_1" },
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
});
