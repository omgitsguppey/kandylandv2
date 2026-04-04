import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MockDoc = {
    id: string;
    data: () => Record<string, unknown>;
};

const mockState = vi.hoisted(() => {
    const collections = new Map<string, MockDoc[]>();

    const createQuerySnapshot = (docs: MockDoc[]) => ({
        docs,
        size: docs.length,
        empty: docs.length === 0,
    });

    const createCollectionRef = (name: string) => {
        let usernameFilter: string | null = null;
        let limitCount: number | null = null;

        return {
            where(field: string, operator: string, value: unknown) {
                if (field === "username" && operator === "==") {
                    usernameFilter = typeof value === "string" ? value : null;
                }
                return this;
            },
            limit(value: number) {
                limitCount = value;
                return this;
            },
            async get() {
                let docs = collections.get(name) ?? [];
                if (usernameFilter) {
                    docs = docs.filter((doc) => doc.data().username === usernameFilter);
                }
                if (typeof limitCount === "number") {
                    docs = docs.slice(0, limitCount);
                }
                return createQuerySnapshot(docs) as FirebaseFirestore.QuerySnapshot;
            },
        };
    };

    return {
        collections,
        adminDb: {
            collection(name: string) {
                return createCollectionRef(name);
            },
        },
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        recordRouteWarning: vi.fn(),
        reset() {
            collections.clear();
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.recordRouteWarning.mockReset();
        },
    };
});

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
    AuthError: class AuthError extends Error {
        status: number;
        constructor(message: string, status: number) {
            super(message);
            this.status = status;
        }
    },
    handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/rate-limit", () => ({
    STANDARD: {},
}));

vi.mock("@/lib/server/route-diagnostics", () => ({
    recordRouteWarning: mockState.recordRouteWarning,
}));

import { POST } from "@/app/api/auth/manual-sign-in-lookup/route";

describe("POST /api/auth/manual-sign-in-lookup", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue(null);
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
    });

    it("passes normalized email addresses through without a user lookup", async () => {
        const request = new NextRequest("http://localhost/api/auth/manual-sign-in-lookup", {
            method: "POST",
            body: JSON.stringify({
                identifier: "  test@example.com  ",
            }),
            headers: {
                "Content-Type": "application/json",
            },
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toEqual({
            resolvedEmail: "test@example.com",
            identifierType: "email",
        });
    });

    it("resolves a username to the account email for Firebase password sign-in", async () => {
        mockState.collections.set("users", [
            {
                id: "user_1",
                data: () => ({
                    username: "fan-one",
                    email: "fan@example.com",
                }),
            },
        ]);

        const request = new NextRequest("http://localhost/api/auth/manual-sign-in-lookup", {
            method: "POST",
            body: JSON.stringify({
                identifier: "Fan One",
            }),
            headers: {
                "Content-Type": "application/json",
            },
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toEqual({
            resolvedEmail: "fan@example.com",
            identifierType: "username",
        });
    });

    it("returns a generic invalid-credential payload for usernames that do not resolve", async () => {
        const request = new NextRequest("http://localhost/api/auth/manual-sign-in-lookup", {
            method: "POST",
            body: JSON.stringify({
                identifier: "missing_user",
            }),
            headers: {
                "Content-Type": "application/json",
            },
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toEqual({
            resolvedEmail: null,
            identifierType: "username",
            authErrorCode: "auth/invalid-credential",
        });
    });
});
