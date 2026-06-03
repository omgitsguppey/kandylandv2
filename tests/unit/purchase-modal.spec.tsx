import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(path: string) {
    return readFileSync(join(process.cwd(), path), "utf8");
}

describe("PurchaseModal compact paid-GD labels", () => {
    it("uses compact paid-GD package labels", () => {
        const source = readSource("src/components/PurchaseModal.tsx");

        expect(source).toContain("Paid GD");
        expect(source).toContain("PurchasePromoBadge");
        expect(source).not.toContain("paid bonus GD");
        expect(source).not.toContain("Paid bundle bonus");
    });

    it("does not label package bonuses as free or reward", () => {
        const source = readSource("src/components/PurchaseModal.tsx");
        const bonusLines = source
            .split(/\r?\n/u)
            .filter((line) => /bonus/i.test(line));

        expect(bonusLines.length).toBeGreaterThan(0);
        expect(bonusLines.some((line) => /(free|reward)/i.test(line))).toBe(false);
    });

    it("uses translated payment error UI instead of raw provider copy", () => {
        const source = readSource("src/components/PurchaseModal.tsx");

        expect(source).toContain("HumanErrorNotice");
        expect(source).toContain("resolveClientActionError");
        expect(source).toContain("payment_not_completed");
        expect(source).not.toContain("{error && <div role=\"alert\"");
    });
});
