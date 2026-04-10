import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
    const userDocs = new Map<string, Record<string, unknown>>();
    const updateCalls: Array<{ id: string; payload: Record<string, unknown> }> = [];

    return {
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        recordCanonicalTaskEvent: vi.fn(),
        normalizeUsername: vi.fn((value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : null),
        parseAdultDateOfBirth: vi.fn((value: unknown) => value === "1990-01-01"
            ? { ok: true as const, value: "1990-01-01" }
            : { ok: false as const, error: "Invalid date of birth format" }),
        isCreatorRole: vi.fn(() => false),
        normalizeCreatorSettings: vi.fn((value: unknown) => value),
        reserveUsernameForUser: vi.fn(),
        userDocs,
        updateCalls,
        adminDb: {
            collection(name: string) {
                return {
                    doc(id: string) {
                        return {
                            async get() {
                                return {
                                    exists: name === "users" ? userDocs.has(id) : false,
                                    data: () => userDocs.get(id),
                                };
                            },
                            async update(payload: Record<string, unknown>) {
                                updateCalls.push({ id, payload });
                                const current = userDocs.get(id) ?? {};
                                userDocs.set(id, { ...current, ...payload });
                            },
                        };
                    },
                };
            },
        },
        reset() {
            userDocs.clear();
            updateCalls.length = 0;
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.recordCanonicalTaskEvent.mockReset();
            this.normalizeUsername.mockClear();
            this.parseAdultDateOfBirth.mockClear();
            this.isCreatorRole.mockClear();
            this.normalizeCreatorSettings.mockClear();
            this.reserveUsernameForUser.mockReset();
        },
    };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));
vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));
vi.mock("@/lib/server/rate-limit", () => ({
    STANDARD: {},
}));
vi.mock("@/lib/server/daily-tasks", () => ({
    recordCanonicalTaskEvent: mockState.recordCanonicalTaskEvent,
}));
vi.mock("@/lib/privacy-policy", () => ({
    PRIVACY_POLICY_VERSION: "test-policy",
}));
vi.mock("@/lib/user-utils", () => ({
    normalizeUsername: mockState.normalizeUsername,
}));
vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));
vi.mock("@/lib/user-profile-validation", () => ({
    parseAdultDateOfBirth: mockState.parseAdultDateOfBirth,
}));
vi.mock("@/lib/creator-experiences", () => ({
    isCreatorRole: mockState.isCreatorRole,
    normalizeCreatorSettings: mockState.normalizeCreatorSettings,
}));
vi.mock("@/lib/server/username-suggestions", () => ({
    reserveUsernameForUser: mockState.reserveUsernameForUser,
}));

import { PUT } from "@/app/api/user/profile/route";

describe("PUT /api/user/profile", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "user_1",
            email: "user@example.com",
        });
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
    });

    it("rejects removing date of birth with null", async () => {
        const response = await PUT(new NextRequest("http://localhost/api/user/profile", {
            method: "PUT",
            body: JSON.stringify({
                dateOfBirth: null,
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBe("Date of birth cannot be removed.");
        expect(mockState.updateCalls).toHaveLength(0);
    });

    it("rejects removing date of birth with an empty string", async () => {
        const response = await PUT(new NextRequest("http://localhost/api/user/profile", {
            method: "PUT",
            body: JSON.stringify({
                dateOfBirth: "",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBe("Date of birth cannot be removed.");
        expect(mockState.updateCalls).toHaveLength(0);
    });

    it("allows updating date of birth to a valid adult date", async () => {
        mockState.userDocs.set("user_1", {
            username: "existing-user",
            dateOfBirth: "1989-01-01",
        });

        const response = await PUT(new NextRequest("http://localhost/api/user/profile", {
            method: "PUT",
            body: JSON.stringify({
                dateOfBirth: "1990-01-01",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockState.updateCalls).toEqual([
            {
                id: "user_1",
                payload: {
                    dateOfBirth: "1990-01-01",
                },
            },
        ]);
    });
});
