import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(path: string) {
    return readFileSync(join(process.cwd(), path), "utf8");
}

describe("drop visibility scope markers", () => {
    it("marks public creator profile drop sections and creator-owned drop list scope", () => {
        const source = readSource("src/app/creators/[username]/CreatorProfileClient.tsx");

        expect(source).toContain('data-drop-visibility-scope="creator_profile"');
        expect(source).toContain('data-drop-visibility-scope="own_creator_drops"');
    });

    it("keeps public drops discovery marked as public discovery", () => {
        const source = readSource("src/app/drops/DropsClient.tsx");

        expect(source).toContain('data-drop-visibility-scope="public_discovery"');
    });
});
