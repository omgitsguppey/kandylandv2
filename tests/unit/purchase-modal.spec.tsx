import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(path: string) {
    return readFileSync(join(process.cwd(), path), "utf8");
}

describe("PurchaseModal paid bundle bonus labels", () => {
    it("labels package bonuses as paid or bundle bonus", () => {
        const source = readSource("src/components/PurchaseModal.tsx");

        expect(source).toContain("paid bonus GD");
        expect(source).toContain("Bundle bonus");
        expect(source).toContain("Paid bundle bonus");
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
