import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("PurchaseModal source-of-funds display guard", () => {
    const source = readFileSync(join(process.cwd(), "src/components/PurchaseModal.tsx"), "utf8");
    const walletPackagePickerSource = readFileSync(
        join(process.cwd(), "src/components/creative-tim/kandydrops/wallet/KandyWalletPackagePicker.tsx"),
        "utf8",
    );

    it("keeps visible package headlines on delivered GumDrops with the canonical bonus display", () => {
        expect(source).toContain("amount={pkg.drops}");
        expect(source).toContain("amount={customDrops}");
        expect(walletPackagePickerSource).toContain("export function KandyWalletPackageOption");
        expect(walletPackagePickerSource).toContain("GumDrops");
        expect(source).toContain("resolvePurchaseBonusPromoOffer(pkgEconomics.bonusGumDrops)");
        expect(source).toContain("resolveBundlePromoOffer(customDrops >= 5000)");
    });

    it("keeps checkout and telemetry tied to the selected delivered package total", () => {
        expect(source).toContain("expectedDrops: selectedPackage.drops");
        expect(source).toContain("package_drops: selectedPackage.drops");
        expect(source).not.toContain("expectedDrops: selectedEconomics.paidGumDrops");
    });
});
