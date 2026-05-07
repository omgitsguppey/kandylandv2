import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("PurchaseModal source-of-funds display guard", () => {
    const source = readFileSync(join(process.cwd(), "src/components/PurchaseModal.tsx"), "utf8");

    it("keeps visible package headlines framed around separated paid GumDrops base amount", () => {
        expect(source).toMatch(/<span[^>]*>\{pkgEconomics\.paidGumDrops\.toLocaleString\(\)\}<\/span>/);
        expect(source).toMatch(/<span[^>]*>\{deriveGumdropEconomics\(customDrops, \(customDrops \/ 1000\) \* 5\)\.paidGumDrops\.toLocaleString\(\)\}<\/span>/);
    });

    it("keeps checkout and telemetry tied to the selected delivered package total", () => {
        expect(source).toContain("expectedDrops: selectedPackage.drops");
        expect(source).toContain("package_drops: selectedPackage.drops");
        expect(source).not.toContain("expectedDrops: selectedEconomics.paidGumDrops");
    });
});
