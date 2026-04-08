import { describe, expect, it } from "vitest";

import {
    buildCreatorDiscoveryNavigationParams,
    isCreatorVisibleInDiscovery,
    resolveCreatorPublicExperienceState,
} from "@/lib/creator-public-pages";

describe("creator-public-pages", () => {
    it("builds creator discovery navigation telemetry params", () => {
        expect(buildCreatorDiscoveryNavigationParams({
            creatorId: "creator_123",
            creatorUsername: "candylane",
            surface: "dashboard",
        })).toEqual({
            destination: "/creators/candylane",
            source: "creator_discovery_dashboard",
            action: "open_creator_profile",
            creator_id: "creator_123",
            creator_username: "candylane",
        });
    });

    it("falls back to default creator settings when none are stored yet", () => {
        const result = resolveCreatorPublicExperienceState(null, 2);

        expect(result.settings.subscriptionsEnabled).toBe(true);
        expect(result.settings.messagingEnabled).toBe(true);
        expect(result.summaryCards.map((card) => card.key)).toEqual([
            "drops",
            "subscriptions",
            "messages",
            "requests",
            "bookings",
            "broadcasts",
        ]);
    });

    it("hides disabled experience modules and empty request categories", () => {
        const result = resolveCreatorPublicExperienceState({
            messagingEnabled: false,
            broadcastsEnabled: false,
            subscriptionsEnabled: false,
            bookingsEnabled: true,
            customRequestsEnabled: true,
            subscriptionPriceGd: 900,
            phoneRatePerMinuteGd: 100,
            videoRatePerMinuteGd: 250,
            bookingMinimumMinutes: 10,
            videoSubscriberDiscountPercent: 50,
            chatFreeForSubscribers: false,
            requestCategories: [
                { id: "disabled", label: "Disabled", priceGd: 100, enabled: false },
            ],
            availabilityTimezone: "America/Chicago",
            availabilityWindows: [],
        }, 0);

        expect(result.summaryCards.map((card) => card.key)).toEqual(["bookings"]);
        expect(result.enabledRequestCategories).toEqual([]);
        expect(result.hasEnabledExperiences).toBe(true);
    });

    it("treats approved creator applicants as visible in discovery even before role activation catches up", () => {
        expect(isCreatorVisibleInDiscovery({
            role: "user",
            creatorApplication: {
                approvalStatus: "creator_approved",
            },
        })).toBe(true);
    });

    it("allows creators with live public drops into discovery and still blocks suspended accounts", () => {
        expect(isCreatorVisibleInDiscovery({
            role: "user",
            activeDropCount: 1,
        })).toBe(true);

        expect(isCreatorVisibleInDiscovery({
            role: "creator",
            status: "suspended",
            activeDropCount: 3,
        })).toBe(false);
    });
});
