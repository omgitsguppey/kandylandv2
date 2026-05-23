import { afterEach, describe, expect, it, vi } from "vitest";

import {
    buildDropFormValuesFromDrop,
    buildDropRequestPayload,
    createDefaultDropFormValues,
    dropFormSchema,
} from "@/lib/admin-drop-form";
import { toCSTString } from "@/lib/timezone";

describe("admin drop form helpers", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("allows promo and external drops to validate without content files when the action target is safe", () => {
        const defaults = createDefaultDropFormValues();
        const parsed = dropFormSchema.parse({
            ...defaults,
            title: "Spring Promo",
            description: "This promo description is comfortably long enough.",
            imageUrl: "https://example.com/cover.jpg",
            type: "promo",
            contentUrls: [],
            actionUrl: "/drops/spring-promo",
        });

        expect(parsed.type).toBe("promo");
        expect(parsed.actionUrl).toBe("/drops/spring-promo");
    });

    it("still requires content assets for content drops", () => {
        const defaults = createDefaultDropFormValues();

        expect(() => dropFormSchema.parse({
            ...defaults,
            title: "Content Drop",
            description: "This content description is comfortably long enough.",
            imageUrl: "https://example.com/cover.jpg",
            type: "content",
            contentUrls: [],
        })).toThrowError(/At least one content file is required/u);
    });

    it("hydrates legacy drop records through normalization for edit mode", () => {
        const validFromMs = 1_700_000_000_000;
        const { values, contentAssets } = buildDropFormValuesFromDrop({
            title: "Legacy Drop",
            description: "A legacy drop body that still needs to edit cleanly.",
            imageUrl: "https://example.com/legacy-cover.jpg",
            contentUrl: "https://example.com/assets/legacy-video.mp4",
            unlockCost: 42,
            validFrom: { seconds: validFromMs / 1000, nanoseconds: 0 },
            validUntil: null,
            status: "scheduled",
            totalUnlocks: 9,
            type: "external",
            actionUrl: "/legacy/offer",
            ctaText: "Open offer",
        }, "legacy_drop");

        expect(values.title).toBe("Legacy Drop");
        expect(values.validFrom).toBe(toCSTString(validFromMs));
        expect(values.validUntil).toBe("");
        expect(values.contentUrls).toEqual(["https://example.com/assets/legacy-video.mp4"]);
        expect(contentAssets).toEqual([
            expect.objectContaining({
                url: "https://example.com/assets/legacy-video.mp4",
                type: "video/mp4",
            }),
        ]);
    });

    it("omits create-only null fields while preserving promo destinations", () => {
        const { dropData, status } = buildDropRequestPayload({
            ...createDefaultDropFormValues(),
            title: "Promo Drop",
            description: "A promo drop description that is long enough to pass.",
            imageUrl: "https://example.com/promo-cover.jpg",
            type: "promo",
            contentUrls: [],
            actionUrl: "/promo/spring",
            ctaText: "Shop now",
            validFrom: "2027-01-01T10:00",
            validUntil: "",
            fileMetadata: null,
        }, {
            isEditMode: false,
            now: 0,
        });

        expect(status).toBe("scheduled");
        expect(dropData.actionUrl).toBe("/promo/spring");
        expect("validUntil" in dropData).toBe(false);
        expect("fileMetadata" in dropData).toBe(false);
    });

    it("clears obsolete edit-mode fields when a drop is converted back to content", () => {
        const { dropData } = buildDropRequestPayload({
            ...createDefaultDropFormValues(),
            title: "Content Drop",
            description: "A content drop description that is long enough to pass.",
            imageUrl: "https://example.com/content-cover.jpg",
            type: "content",
            contentUrls: ["https://example.com/assets/content.mp4"],
            contentUrl: "https://example.com/assets/content.mp4",
            actionUrl: "",
            ctaText: "",
            validFrom: "2026-01-01T10:00",
            validUntil: "",
            creatorId: "",
            fileMetadata: null,
        }, {
            isEditMode: true,
        });

        expect(dropData.creatorId).toBeNull();
        expect(dropData.validUntil).toBeNull();
        expect(dropData.fileMetadata).toBeNull();
        expect(dropData.actionUrl).toBeNull();
        expect(dropData.ctaText).toBeNull();
        expect(dropData.accentColor).toBeNull();
    });

    it("blocks protocol-relative open redirect URLs in actionUrl", () => {
        const defaults = createDefaultDropFormValues();
        expect(() => dropFormSchema.parse({
            ...defaults,
            title: "Open Redirect",
            description: "This promo description is comfortably long enough.",
            imageUrl: "https://example.com/cover.jpg",
            type: "promo",
            contentUrls: [],
            actionUrl: "https://kandydrops.invalid//evil.com",
        })).toThrowError(/Use a relative path or an http\/https URL/u);

        expect(() => dropFormSchema.parse({
            ...defaults,
            title: "Open Redirect",
            description: "This promo description is comfortably long enough.",
            imageUrl: "https://example.com/cover.jpg",
            type: "promo",
            contentUrls: [],
            actionUrl: "https://kandydrops.invalid/\\evil.com",
        })).toThrowError(/Use a relative path or an http\/https URL/u);

        expect(() => dropFormSchema.parse({
            ...defaults,
            title: "Open Redirect",
            description: "This promo description is comfortably long enough.",
            imageUrl: "https://example.com/cover.jpg",
            type: "promo",
            contentUrls: [],
            actionUrl: "\\\\evil.com/drop",
        })).toThrowError(/Use a relative path or an http\/https URL/u);
    });
});
