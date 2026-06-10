import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/firebase-admin", () => ({
    adminAuth: { verifyIdToken: vi.fn() },
    adminDb: null,
}));
vi.mock("@/lib/server/rate-limit", () => ({
    RateLimitError: class MockRateLimitError extends Error {},
    buildRateLimitResponse: vi.fn(),
}));

import { AuthError, handleApiError } from "@/lib/server/auth";

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
        expect(body).toMatchObject({
            success: false,
            errorKey: "internal_server_error",
            userTitle: "This hit a platform snag",
            primaryAction: "submit_bug",
        });
        expect(JSON.stringify(body)).not.toContain("database exploded");
        expect(JSON.stringify(body)).not.toContain("secret=abc123");
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

    it("returns translated auth payloads without echoing raw auth messages", async () => {
        const response = handleApiError(new AuthError("Invalid or expired token", 401, undefined, {
            errorKey: "session_expired",
            diagnosticClass: "expired_session",
        }), "Auth.Session.GET");
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body).toMatchObject({
            success: false,
            errorKey: "session_expired",
            surface: "auth",
            primaryAction: "sign_in",
        });
        expect(JSON.stringify(body)).not.toContain("Invalid or expired token");
    });

    it("returns canonical not-found payloads for AuthError 404s", async () => {
        const response = handleApiError(new AuthError("Creator profile not found", 404, "creator"), "Creator.Settings.GET");
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body).toEqual({
            error: "Creator not found",
            errorCode: "not_found",
            resource: "creator",
        });
    });
});
