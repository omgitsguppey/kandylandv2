import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
    buildDeviceUiDryAuditReport,
    hasCanonicalDesktopCapEvidence,
    hasComposedWalletDensityEvidence,
    isApprovedExperiencesCompactSpacing,
} from "../../src/lib/device-ui-dry-audit";

describe("device UI dry audit ownership evidence", () => {
    it("requires the purchase modal to compose the canonical wallet frame that owns density markers", () => {
        const walletSource = readFileSync(join(process.cwd(), "src/components/PurchaseModal.tsx"), "utf8");
        const walletFrameSource = readFileSync(
            join(process.cwd(), "src/components/creative-tim/kandydrops/wallet/KandyWalletModalFrame.tsx"),
            "utf8",
        );

        expect(hasComposedWalletDensityEvidence(walletSource, walletFrameSource, 'data-wallet-density="public-beta-compact"')).toBe(true);
        expect(hasComposedWalletDensityEvidence("<section />", walletFrameSource, 'data-wallet-density="public-beta-compact"')).toBe(false);
        expect(hasComposedWalletDensityEvidence(walletSource, "<section />", 'data-wallet-density="public-beta-compact"')).toBe(false);
    });

    it("accepts desktop caps owned by the explicit Drops and creator composition frames", () => {
        expect(hasCanonicalDesktopCapEvidence(
            "src/app/drops/DropsClient.tsx",
            "<DropsDiscoveryExperience />",
            { dropsDiscoveryExperienceSource: '<main className="mx-auto max-w-7xl" />' },
        )).toBe(true);
        expect(hasCanonicalDesktopCapEvidence(
            "src/app/creators/[username]/CreatorProfileClient.tsx",
            "<CreatorPublicProfileFrame />",
            { creatorPublicProfileFrameSource: '<div className="mx-auto max-w-6xl" />' },
        )).toBe(true);
        expect(hasCanonicalDesktopCapEvidence("src/app/drops/DropsClient.tsx", "<main />")).toBe(false);
    });

    it("allows only the marked compact Experiences container to use its intentional space-y-6 rhythm", () => {
        const source = [
            '<div data-experiences-layout="public-beta-compact">',
            '<div className="mx-auto max-w-6xl space-y-6 sm:space-y-8" />',
            '<div className="p-6" />',
            "</div>",
        ].join("\n");

        expect(isApprovedExperiencesCompactSpacing(source, source.indexOf("space-y-6"), "space-y-6")).toBe(true);
        expect(isApprovedExperiencesCompactSpacing(source, source.indexOf("p-6"), "p-6")).toBe(false);
    });

    it("builds a report against the real source tree", () => {
        expect(() => buildDeviceUiDryAuditReport({ root: process.cwd() })).not.toThrow();
    });
});
