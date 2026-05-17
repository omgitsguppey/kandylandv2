import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(path: string) {
    return readFileSync(join(process.cwd(), path), "utf8");
}

describe("post-economy creator flow QA guardrails", () => {
    it("keeps paid bundle bonus copy away from free or reward labels", () => {
        const purchaseModal = readSource("src/components/PurchaseModal.tsx");
        const bonusLines = purchaseModal
            .split(/\r?\n/u)
            .filter((line) => /bonus/i.test(line));

        expect(bonusLines.length).toBeGreaterThan(0);
        expect(bonusLines.some((line) => /(free|reward)/i.test(line))).toBe(false);
    });

    it("uses purchased GD guidance and keeps reward balance from enabling creator CTAs", () => {
        const panel = readSource("src/components/Creators/CreatorExperiencesPanel.tsx");
        const guidance = readSource("src/components/Creators/CreatorPaidGdGuidanceCard.tsx");
        const panelTest = readSource("tests/unit/creator-experiences-panel.spec.tsx");

        expect(panel).toContain("gumDropsPurchasedBalance");
        expect(panel).toContain("const balance = typeof user?.gumDropsPurchasedBalance");
        expect(guidance).toContain("Creator experiences use paid GumDrops only");
        expect(panelTest).toContain("reward balance from making paid creator CTAs available");
        expect(panelTest).toContain("gumDropsRewardBalance: 50_000");
        expect(panelTest).toContain("gumDropsPurchasedBalance: 0");
    });

    it("keeps booking slot UX generated-only and user-readable", () => {
        const panel = readSource("src/components/Creators/CreatorExperiencesPanel.tsx");
        const bookingRoute = readSource("src/app/api/creator/bookings/route.ts");

        expect(panel).toContain('data-booking-free-pick-disabled="true"');
        expect(panel).toContain("Choose a slot first");
        expect(panel).not.toContain("datetime-local");
        expect(bookingRoute).toContain("slot_unavailable");
        expect(bookingRoute).toContain("Pick one of the available creator time slots.");
    });

    it("keeps owner mode hidden from fan controls and non-owner fan controls tested", () => {
        const panel = readSource("src/components/Creators/CreatorExperiencesPanel.tsx");
        const ownerTest = readSource("tests/unit/creator-owner-mode.spec.tsx");
        const panelTest = readSource("tests/unit/creator-experiences-panel.spec.tsx");

        expect(panel).toContain('data-creator-owner-mode="true"');
        expect(panel).toContain('data-fan-controls-hidden="true"');
        expect(ownerTest).toContain("Manage experiences in Creator Dashboard.");
        expect(panelTest).toContain("keeps fan controls visible for non-owner fans");
    });

    it("keeps creator attribution metadata and public drop scope present", () => {
        const requestRoute = readSource("src/app/api/creator/requests/route.ts");
        const bookingRoute = readSource("src/app/api/creator/bookings/route.ts");
        const subscriptionRoute = readSource("src/app/api/creator/subscriptions/route.ts");
        const dropsClient = readSource("src/app/drops/DropsClient.tsx");

        for (const routeSource of [requestRoute, bookingRoute, subscriptionRoute]) {
            expect(routeSource).toContain("purchasedAmountSpent");
            expect(routeSource).toContain("rewardAmountSpent");
            expect(routeSource).toContain("creatorAccrualId");
            expect(routeSource).toContain("creatorExperienceRecordId");
            expect(routeSource).toContain("buildCreatorExperienceAttribution");
        }

        expect(dropsClient).toContain('data-drop-visibility-scope="public_discovery"');
        expect(dropsClient).not.toContain('data-drop-visibility-scope="own_creator_drops"');
    });
});
