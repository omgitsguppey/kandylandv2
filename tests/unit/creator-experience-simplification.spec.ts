import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(path: string) {
    return readFileSync(join(process.cwd(), path), "utf8");
}

describe("creator experience simplification guardrails", () => {
    it("keeps the Phase 1 economy contract available", () => {
        expect(existsSync(join(process.cwd(), "src/lib/gumdrop-source-of-funds.ts"))).toBe(true);
        expect(existsSync(join(process.cwd(), "agent/state/gumdrop-economy-accuracy.generated.json"))).toBe(true);
        expect(readSource("src/lib/gumdrop-source-of-funds.ts")).toContain("paid_purchase_including_bonus");
    });

    it("guards generated slot booking in source and tests", () => {
        const panel = readSource("src/components/Creators/CreatorExperiencesPanel.tsx");
        const route = readSource("src/app/api/creator/bookings/route.ts");

        expect(panel).toContain('data-booking-free-pick-disabled="true"');
        expect(panel).toContain("selectedBookingSlot");
        expect(panel).not.toContain("datetime-local");
        expect(route).toContain("buildCreatorBookingSlots");
        expect(route).toContain("slot_unavailable");
        expect(route).toContain("Pick one of the available creator time slots.");
    });

    it("locks creator owner mode and drop visibility scope", () => {
        const panel = readSource("src/components/Creators/CreatorExperiencesPanel.tsx");
        const creatorProfile = readSource("src/app/creators/[username]/CreatorProfileClient.tsx");
        const drops = readSource("src/app/drops/DropsClient.tsx");

        expect(panel).toContain('data-creator-owner-mode="true"');
        expect(panel).toContain('data-fan-controls-hidden="true"');
        expect(panel).toContain("/dashboard/creator");
        expect(creatorProfile).toContain('data-drop-visibility-scope="creator_profile"');
        expect(creatorProfile).toContain('data-drop-visibility-scope="own_creator_drops"');
        expect(drops).toContain('data-drop-visibility-scope="public_discovery"');
        expect(drops).not.toContain('data-drop-visibility-scope="own_creator_drops"');
    });

    it("keeps memory and docs aligned with durable Phase 2 rules", () => {
        const memory = readSource("memory.md");
        const docs = readSource("docs/agent-truth/creator-experience-simplification.md");
        const packageJson = readSource("package.json");

        expect(memory).toContain("Creator booking UX uses generated availability slots, not arbitrary fan date/time.");
        expect(memory).toContain("Phase 2 depends on Phase 1 GumDrop economy contract and must not change paid-bonus ledger math.");
        expect(memory.toLowerCase()).not.toContain("bonus gumdrops are reward");
        expect(docs).toContain("Fan booking no longer uses arbitrary date/time input.");
        expect(packageJson).toContain('"check:creator-experience-simplification"');
    });
});
