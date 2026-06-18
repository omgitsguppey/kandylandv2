import { describe, it, expect } from "vitest";
import { getSafeExternalUrl } from "@/lib/utils/url-sanitize";

describe("getSafeExternalUrl", () => {
    it("allows standard http and https protocols", () => {
        expect(getSafeExternalUrl("https://example.com")).toBe("https://example.com/");
        expect(getSafeExternalUrl("http://google.com")).toBe("http://google.com/");
    });

    it("allows valid relative urls", () => {
        expect(getSafeExternalUrl("/api/test")).toBe("/api/test");
        expect(getSafeExternalUrl("/")).toBe("/");
    });

    it("rejects javascript protocol", () => {
        expect(getSafeExternalUrl("javascript:alert(1)")).toBeUndefined();
        expect(getSafeExternalUrl("  javascript:alert(1)")).toBeUndefined();
        expect(getSafeExternalUrl("java\0script:alert(1)")).toBeUndefined();
    });

    it("rejects data and vbscript protocols", () => {
        expect(getSafeExternalUrl("data:text/html,<script>alert(1)</script>")).toBeUndefined();
        expect(getSafeExternalUrl("vbscript:msgbox(\"xss\")")).toBeUndefined();
    });

    it("returns undefined for empty", () => {
        expect(getSafeExternalUrl("")).toBeUndefined();
        expect(getSafeExternalUrl(undefined)).toBeUndefined();
    });
});
