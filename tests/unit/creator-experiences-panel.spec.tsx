import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { CreatorExperiencesPanel } from "@/components/Creators/CreatorExperiencesPanel";
import { DEFAULT_CREATOR_SETTINGS } from "@/lib/creator-experiences";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

describe("CreatorExperiencesPanel", () => {
    it("renders continuity warnings and server-backed booking details", () => {
        const markup = renderToStaticMarkup(
            <CreatorExperiencesPanel
                bookingDurationMinutes={15}
                bookingServiceType="video"
                bookingStartAt=""
                creatingBooking={false}
                creatingRequest={false}
                currentUser={{ uid: "fan_1" }}
                experienceWarnings={[{ key: "bookings", label: "Bookings", message: "Bookings route unavailable." }]}
                latestBooking={{ serviceType: "video", status: "booked", priceGd: 750, subscriberDiscountApplied: true }}
                messages={[]}
                onBookingDurationMinutesChange={() => undefined}
                onBookingServiceTypeChange={() => undefined}
                onBookingStartAtChange={() => undefined}
                onCreateBooking={() => undefined}
                onCreateRequest={() => undefined}
                onOpenAuth={() => undefined}
                onOpenChat={() => undefined}
                onSelectedExperienceChange={() => undefined}
                onStartSubscription={() => undefined}
                requestCategories={DEFAULT_CREATOR_SETTINGS.requestCategories}
                requestCategoryId=""
                requestDetails=""
                selectedExperience="bookings"
                settings={DEFAULT_CREATOR_SETTINGS}
                setRequestCategoryId={() => undefined}
                setRequestDetails={() => undefined}
                subscriptionActive
                subscriptionHydrated
                subscribeLoading={false}
            />,
        );

        expect(markup).toContain("Bookings is degraded");
        expect(markup).toContain("Subscriber 50% Off Applied");
        expect(markup).toContain("Live Time");
    });
});
