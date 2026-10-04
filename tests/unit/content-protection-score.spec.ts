import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { hasViewerSanitizationBoundary } from "../../scripts/agent/score-content-protection";

describe("content-protection score viewer boundary", () => {
    it("recognizes the current server-only raw Drop and sanitized client projection boundary", () => {
        const source = readFileSync(join(process.cwd(), "src/app/dashboard/viewer/page.tsx"), "utf8");

        expect(hasViewerSanitizationBoundary(source)).toBe(true);
        expect(hasViewerSanitizationBoundary(source.replace("return <ViewerClient drop={drop}", "return <ViewerClient drop={rawDrop}"))).toBe(false);
        expect(hasViewerSanitizationBoundary(source.replace("const drop = sanitizeDropForClient(rawDrop);", "const drop = rawDrop;"))).toBe(false);
        expect(hasViewerSanitizationBoundary(source.replace("if (!viewerAccess.allowed) {", "if (false) {"))).toBe(false);
    });
});
