import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase-runtime", () => ({
    shouldRequireAppCheck: () => false,
}));
vi.mock("@/lib/server/firebase-admin", () => ({
    adminAppCheck: { verifyToken: vi.fn() },
    adminAuth: { verifyIdToken: vi.fn() },
    adminDb: null,
}));
vi.mock("@/lib/server/rate-limit", () => ({
    RateLimitError: class MockRateLimitError extends Error {},
    buildRateLimitResponse: vi.fn(),
}));

import { handleApiError } from "@/lib/server/auth";

describe("handleApiError", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("sanitizes structured server logs without exposing stack or raw payloads", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const error = new Error("database exploded\nsecret=abc123\twith control chars");
        error.name = "ExplosiveError";
        error.stack = "ExplosiveError: database exploded\n at hidden/path.ts:10:2";

        const response = handleApiError(error, "Admin.Route\nHistorical");
        const body = await response.json();
        const logPayload = JSON.parse(consoleErrorSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>;

        expect(response.status).toBe(500);
        expect(body).toEqual({ error: "Internal server error" });
        expect(logPayload).toMatchObject({
            level: "error",
            tag: "API_ERROR",
            context: "Admin.Route Historical",
            status: 500,
            errorName: "ExplosiveError",
            message: "database exploded secret=abc123 with control chars",
        });
        expect(logPayload).not.toHaveProperty("stack");
        expect(logPayload).not.toHaveProperty("raw");
    });
});
