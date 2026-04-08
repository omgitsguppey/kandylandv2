import { describe, expect, it } from "vitest";

import { toggleAdminDropFormSection } from "@/lib/admin-drop-form-sections";

describe("toggleAdminDropFormSection", () => {
    it("starts closed until a section is explicitly opened", () => {
        expect(toggleAdminDropFormSection(null, "basics")).toBe("basics");
    });

    it("collapses the current section when toggled again", () => {
        expect(toggleAdminDropFormSection("assets", "assets")).toBeNull();
    });

    it("keeps only one section open at a time", () => {
        expect(toggleAdminDropFormSection("pricing", "assets")).toBe("assets");
        expect(toggleAdminDropFormSection("actions", "basics")).toBe("basics");
    });
});
