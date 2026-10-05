import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveBundlePromoOffer, resolvePurchaseBonusPromoOffer } from "@/lib/wallet/purchase-promo-contract";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("payment module symmetry display contract", () => {
  const purchaseModal = read("src/components/PurchaseModal.tsx");
  const walletPackagePicker = read("src/components/creative-tim/kandydrops/wallet/KandyWalletPackagePicker.tsx");
  const walletCheckoutPanel = read("src/components/creative-tim/kandydrops/wallet/KandyWalletCheckoutPanel.tsx");

  it("uses compact paid-GD copy without legacy loud labels", () => {
    const paymentModuleEvidence = purchaseModal + walletPackagePicker + walletCheckoutPanel + read("agent/state/payment-module-symmetry.generated.json");

    expect(walletPackagePicker).toContain("GumDrops");
    expect(resolvePurchaseBonusPromoOffer(50)?.compactLabel).toBe("+50 bonus GD");
    expect(resolvePurchaseBonusPromoOffer(100)?.compactLabel).toBe("+100 bonus GD");
    expect(resolvePurchaseBonusPromoOffer(500)?.compactLabel).toBe("+500 bonus GD");
    expect(resolveBundlePromoOffer(true)?.compactLabel).toBe("2x bonus GD");
    expect(paymentModuleEvidence).toContain("+50 bonus GD");
    expect(paymentModuleEvidence).toContain("+100 bonus GD");
    expect(paymentModuleEvidence).toContain("+500 bonus GD");
    expect(paymentModuleEvidence).toContain("2x bonus GD");
    expect(purchaseModal).not.toContain("GUMDROPS");
    expect(purchaseModal).not.toContain("paid bonus GD");
    expect(purchaseModal).not.toContain("paid bundle bonus");
    expect(purchaseModal).not.toContain("Paid bundle bonus");
    expect(purchaseModal).not.toContain("2x Bonus GD");
  });

  it("keeps every package row aligned through stable display zones", () => {
    expect(walletPackagePicker).toContain("export function KandyWalletHeader");
    expect(walletPackagePicker).toContain("export function KandyWalletPackageOption");
    expect(walletPackagePicker).toContain("data-purchase-row-zone=\"icon\"");
    expect(walletPackagePicker).toContain("data-purchase-row-zone=\"copy\"");
    expect(walletPackagePicker).toContain("data-purchase-row-zone=\"price\"");
    expect(walletPackagePicker).toContain("data-purchase-promo-slot=\"reserved\"");
    expect(walletPackagePicker).toContain("data-payment-module-density=\"compact-v2\"");
    expect(walletPackagePicker).toContain("grid-cols-[2.75rem_minmax(0,1fr)]");
    expect(walletPackagePicker).toContain('import { Button } from "@/components/ui/Button"');
    expect(walletPackagePicker).toContain("aria-pressed={selected}");
    expect(walletPackagePicker).toContain("disabled={disabled}");
    expect(walletPackagePicker).toContain("max-w-[7.6rem]");
    expect(walletPackagePicker).toContain("border-t border-border");
  });

  it("uses a generic non-wrapping promo badge contract", () => {
    const contract = read("src/lib/wallet/purchase-promo-contract.ts");
    expect(contract).toContain("export type PurchasePromoKind");
    for (const kind of ["bonus", "sale", "discount", "subscription", "best_value", "limited", "starter"]) {
      expect(contract).toContain(`"${kind}"`);
    }
    for (const field of ["label", "tone", "priority", "compactLabel", "shouldShowOnMobile", "maxWidthClassName"]) {
      expect(contract).toContain(field);
    }
    expect(walletPackagePicker).toContain("function KandyWalletPromoBadge");
    expect(walletPackagePicker).toContain("function KandyWalletPriceBlock");
    expect(walletPackagePicker).toContain('import { Badge } from "@/components/ui/badge"');
    expect(read("src/components/ui/badge.tsx")).toContain("whitespace-nowrap");
    expect(walletPackagePicker).toContain("max-w-[7.6rem]");
    expect(walletPackagePicker).toContain("leading-none");
  });

  it("removes stale payment component backup and does not touch protected runtime paths", () => {
    expect(existsSync(join(root, "src/components/PurchaseModal.tsx.bak"))).toBe(false);
    for (const forbiddenPath of [
      "src/app/api/paypal/create/route.ts",
      "src/app/api/paypal/capture/route.ts",
      "src/app/api/wallet/packages/route.ts",
      "src/lib/server/paypal.ts",
      "src/lib/gumdrop-ledger.ts",
      "src/lib/gumdrop-source-of-funds.ts",
      "src/lib/gumdrops-packages.ts",
    ]) {
      expect(read("scripts/agent/validate-payment-module-symmetry.ts")).toContain(forbiddenPath);
    }
    expect(read("scripts/agent/validate-payment-module-symmetry.ts")).toContain("KandyWalletPackagePicker.tsx");
  });
});
