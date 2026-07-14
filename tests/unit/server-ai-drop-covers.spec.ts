import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: null,
    adminStorage: null,
}));
vi.mock("@/lib/server/analytics", () => ({
    trackServerEvent: vi.fn(),
}));
vi.mock("@/lib/server/route-diagnostics", () => ({
    recordRouteWarning: vi.fn(),
}));
vi.mock("@/lib/server/server-diagnostics", () => ({
    recordServerDiagnostic: vi.fn(),
}));
vi.mock("@/lib/server/storage-assets", () => ({
    ensureFirebaseDownloadUrl: vi.fn(),
    sanitizeStorageFileName: (value: string) => value,
}));

import {
    ADMIN_AI_DROP_COVER_PROVIDER_CALL_BUDGET_PER_REQUEST,
    ADMIN_AI_DROP_COVER_PROVIDER_TIMEOUT_MS,
    buildGeminiGenerateContentRequestBody,
    withAdminAiDropCoverProviderTimeout,
} from "@/lib/server/ai-drop-covers";

describe("server ai drop cover request assembly", () => {
    it("includes the prompt, reference style guidance, and inline reference images in the Gemini request body", () => {
        const body = buildGeminiGenerateContentRequestBody({
            prompt: "Use the provided reference image and maintain the same style, focusing this time on \"Jessi Ray's Strawberry Shortcake\", ensuring the color matches the title theme and the colors are easy to distinguish.",
            aspectRatio: "1:1",
            referenceImages: [
                {
                    mimeType: "image/png",
                    bytesBase64Encoded: "ZmFrZS10ZW1wbGF0ZS1ieXRlcw==",
                    styleDescription: "KandyDrops premium candy-poster cover art with a centered dessert hero and bold title treatment.",
                },
                {
                    mimeType: "image/jpeg",
                    bytesBase64Encoded: "ZmFrZS1jYXRhbG9nLWJ5dGVz",
                    styleDescription: "KandyDrops premium candy-poster cover art with a centered dessert hero and bold title treatment.",
                },
            ],
        });

        expect(body.contents.parts[0]).toEqual({
            text: "Use the provided reference image and maintain the same style, focusing this time on \"Jessi Ray's Strawberry Shortcake\", ensuring the color matches the title theme and the colors are easy to distinguish.",
        });
        expect(body.contents.parts[1]).toEqual({
            text: "Reference style guidance: KandyDrops premium candy-poster cover art with a centered dessert hero and bold title treatment.",
        });
        expect(body.contents.parts[2]).toEqual({
            inlineData: {
                mimeType: "image/png",
                data: "ZmFrZS10ZW1wbGF0ZS1ieXRlcw==",
            },
        });
        expect(body.contents.parts[3]).toEqual({
            inlineData: {
                mimeType: "image/jpeg",
                data: "ZmFrZS1jYXRhbG9nLWJ5dGVz",
            },
        });
        expect(body.generationConfig.imageConfig.aspectRatio).toBe("1:1");
        expect(body.generationConfig.candidateCount).toBe(ADMIN_AI_DROP_COVER_PROVIDER_CALL_BUDGET_PER_REQUEST);
    });

    it("maps an aborted provider request to the typed timeout message within the configured cap", async () => {
        await expect(withAdminAiDropCoverProviderTimeout(
            (signal) => new Promise((_, reject) => {
                signal.addEventListener("abort", () => reject(signal.reason), { once: true });
            }),
            5,
        )).rejects.toThrow("Vertex image request timed out after 5ms.");

        expect(ADMIN_AI_DROP_COVER_PROVIDER_TIMEOUT_MS).toBe(45_000);
    });
});
