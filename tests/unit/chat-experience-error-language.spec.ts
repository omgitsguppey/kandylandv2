import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readChatExperienceSource() {
    return readFileSync(join(process.cwd(), "src/components/Chat/ChatExperience.tsx"), "utf8");
}

describe("ChatExperience error language", () => {
    it("keeps visible chat errors on safe local messages and typed diagnostic codes", () => {
        const source = readChatExperienceSource();

        expect(source).toContain("ChatClientSafeError");
        expect(source).toContain("buildChatSafeError");
        expect(source).toContain("readChatDiagnosticCode");
        expect(source).toContain("buildChatSendErrorMessage");
    });

    it("does not route raw response or exception messages into chat UI/telemetry", () => {
        const source = readChatExperienceSource();

        expect(source).not.toContain("String(error)");
        expect(source).not.toMatch(/error\.message/u);
        expect(source).not.toMatch(/body\.error(?!Code)/u);
        expect(source).not.toMatch(/body\.message\s*\|\|/u);
        expect(source).not.toMatch(/setSendErrorMessage\([^)]*body\.message/u);
        expect(source).not.toMatch(/toast\.error\([^)]*body\.message/u);
        expect(source).not.toMatch(/raw(Response|Text)\.slice/u);
        expect(source).not.toMatch(/prepareRawText\.slice|completeRawText\.slice/u);
        expect(source).not.toMatch(/throw new Error/u);
    });
});
