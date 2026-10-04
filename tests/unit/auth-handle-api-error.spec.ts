import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const roleSdk = vi.hoisted(() => ({ db: null as unknown, verifyIdToken: vi.fn(), get: vi.fn(), recordDebugEvidence: vi.fn(async () => undefined) }));
vi.mock("@/lib/server/firebase-admin", () => ({ adminAuth: { verifyIdToken: roleSdk.verifyIdToken }, get adminDb() { return roleSdk.db; } }));
vi.mock("@/lib/server/debug-evidence-store", () => ({ recordDebugEvidence: roleSdk.recordDebugEvidence }));
vi.mock("@/lib/server/rate-limit", () => ({
    RateLimitError: class MockRateLimitError extends Error {},
    buildRateLimitResponse: vi.fn(),
}));

import { NextRequest } from "next/server";
import { AuthError, handleApiError, readCurrentAnalyticsProfileRole, verifyAuth, verifyAdmin } from "@/lib/server/auth";

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


describe("identified current-profile admission in the existing auth owner", () => {
    beforeEach(() => {
        roleSdk.db = { collection: vi.fn((collection: string) => ({ doc: vi.fn((uid: string) => { expect(collection).toBe("users"); expect(uid).toBe("verified_user"); return { get: roleSdk.get }; }) })) };
        roleSdk.get.mockReset(); roleSdk.verifyIdToken.mockReset(); roleSdk.recordDebugEvidence.mockClear();
        roleSdk.verifyIdToken.mockResolvedValue({ uid: "verified_user", email: "user@example.invalid", admin: true });
    });
    const request = () => new NextRequest("http://localhost/api/analytics/ingest-identified", { headers: { authorization: "Bearer verified_token" } });
    it.each(["user", "creator", "admin"])("reads the exact recognized profile role %s once", async role => {
        roleSdk.get.mockResolvedValue({ exists: true, data: () => ({ role }) }); expect(await readCurrentAnalyticsProfileRole("verified_user")).toBe(role); expect(roleSdk.get).toHaveBeenCalledTimes(1);
    });
    it("keeps generic token verification free from profile reads", async () => {
        expect(await verifyAuth(request())).toMatchObject({ uid: "verified_user", isAdmin: true }); expect(roleSdk.get).not.toHaveBeenCalled(); expect(roleSdk.verifyIdToken).toHaveBeenCalledWith("verified_token", true);
    });
    it("keeps existing verifyAdmin profile authorization and its one exact read", async () => {
        roleSdk.get.mockResolvedValue({ exists: true, data: () => ({ role: "user" }) }); await expect(verifyAdmin(request())).rejects.toMatchObject({ status: 403, diagnosticClass: "permission_denied" });
        roleSdk.get.mockClear(); roleSdk.get.mockResolvedValue({ exists: true, data: () => ({ role: "admin" }) }); expect(await verifyAdmin(request())).toMatchObject({ uid: "verified_user", isAdmin: true }); expect(roleSdk.get).toHaveBeenCalledTimes(1);
    });
    it("classifies unknown profile authority without leaking provider data", async () => {
        roleSdk.get.mockResolvedValue({ exists: true, data: () => ({ role: "owner_admin", privateValue: "secret" }) });
        await expect(readCurrentAnalyticsProfileRole("verified_user")).rejects.toMatchObject({ status: 403, diagnosticClass: "role_unknown" });
    });
    it("classifies a configured-but-unavailable database as transient", async () => {
        roleSdk.db = null; await expect(readCurrentAnalyticsProfileRole("verified_user")).rejects.toMatchObject({ status: 503, diagnosticClass: "provider_config_failure" }); expect(roleSdk.get).not.toHaveBeenCalled();
    });
});
