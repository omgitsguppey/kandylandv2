import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(path: string) {
    return readFileSync(join(process.cwd(), path), "utf8");
}

describe("creator owner mode", () => {
    it("hides fan controls and routes owners to Creator Dashboard", () => {
        const source = readSource("src/components/Creators/CreatorExperiencesPanel.tsx");

        expect(source).toContain('data-creator-owner-mode="true"');
        expect(source).toContain('data-fan-controls-hidden="true"');
        expect(source).toContain("You are viewing your creator profile.");
        expect(source).toContain("Manage experiences in Creator Dashboard.");
        expect(source).toContain('router.push("/dashboard/creator")');
    });

    it("keeps owner detection tied to same verified creator identity", () => {
        const source = readSource("src/components/Creators/CreatorExperiencesPanel.tsx");

        expect(source).toContain('userId === creatorId');
        expect(source).toContain('role === "creator"');
    });
});
