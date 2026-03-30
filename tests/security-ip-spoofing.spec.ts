import { expect, it, describe, vi } from "vitest";
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { getTrustedClientIp } from "@/lib/server/request-client-ip";

// Mocking dependencies
vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: null,
}));

// Function to test buildAnonymousFingerprint logic (it's not exported from the route file)
function buildAnonymousFingerprintLogic(request: NextRequest, dropId: string, dayKey: string, pagePath: string, surface: string) {
    const clientIp = getTrustedClientIp(request);
    const userAgent = request.headers.get("user-agent")?.trim() || "unknown";
    return createHash("sha256")
        .update(`${clientIp}:${userAgent}:${dropId}:${dayKey}:${pagePath}:${surface}`)
        .digest("hex");
}

describe("IP Spoofing Protection", () => {
    it("buildAnonymousFingerprint should use request.ip and ignore X-Forwarded-For", () => {
        const mockIp = "1.2.3.4";
        const spoofedIp = "9.9.9.9";

        const headers = new Headers({
            "x-forwarded-for": spoofedIp,
            "user-agent": "test-agent"
        });

        // Mock NextRequest with IP provided by the platform
        const request = {
            ip: mockIp,
            headers: headers,
        } as unknown as NextRequest;

        const fingerprint = buildAnonymousFingerprintLogic(request, "drop1", "2024-01-01", "/path", "surface");

        // Expected hash uses the verified client IP, not the forwarded header
        const expectedHash = createHash("sha256")
            .update(`${mockIp}:test-agent:drop1:2024-01-01:/path:surface`)
            .digest("hex");

        expect(fingerprint).toBe(expectedHash);

        // Ensure spoofed header does not influence the fingerprint
        const spoofedHash = createHash("sha256")
            .update(`${spoofedIp}:test-agent:drop1:2024-01-01:/path:surface`)
            .digest("hex");

        expect(fingerprint).not.toBe(spoofedHash);
    });

    it("resolveCallerIdentifier logic should use request.ip and ignore X-Forwarded-For", () => {
        const mockIp = "1.2.3.4";
        const spoofedIp = "9.9.9.9";

        const headers = new Headers({
            "x-forwarded-for": spoofedIp,
            "user-agent": "test-agent"
        });

        // Current secure implementation from src/lib/server/rate-limit.ts
        const resolveCallerIdentifierLogic = (request: NextRequest) => {
            const ip = getTrustedClientIp(request);
            const userAgent = request.headers.get("user-agent")?.trim() || "unknown";
            return `${ip}:${userAgent}`;
        };

        const request = {
            ip: mockIp,
            headers: headers,
        } as unknown as NextRequest;

        const identifier = resolveCallerIdentifierLogic(request);

        expect(identifier).toBe(`${mockIp}:test-agent`);
        expect(identifier).not.toBe(`${spoofedIp}:test-agent`);
    });
});
