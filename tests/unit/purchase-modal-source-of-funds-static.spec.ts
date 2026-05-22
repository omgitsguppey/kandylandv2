import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("PurchaseModal source-of-funds display guard", () => {
    const source = readFileSync(join(process.cwd(), "src/components/PurchaseModal.tsx"), "utf8");

    it("keeps visible package headlines framed around paid GD plus explicit bonus display", () => {
        expect(source).toContain("amount={pkgEconomics.paidGumDrops}");
        expect(source).toContain("amount={deriveGumdropEconomics(customDrops, (customDrops / 1000) * 5).paidGumDrops}");
        expect(source).toContain("Paid GD");
        expect(source).toContain("resolvePurchaseBonusPromoOffer(pkgEconomics.bonusGumDrops)");
        expect(source).toContain("resolveBundlePromoOffer(customDrops >= 5000)");
    });

    it("keeps checkout and telemetry tied to the selected delivered package total", () => {
        expect(source).toContain("expectedDrops: selectedPackage.drops");
        expect(source).toContain("package_drops: selectedPackage.drops");
        expect(source).not.toContain("expectedDrops: selectedEconomics.paidGumDrops");
    });
});
