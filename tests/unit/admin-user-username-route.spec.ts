import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    guardApiRequest: vi.fn(),
    getDoc: vi.fn(),
    reserveUsernameForUser: vi.fn(),
    reset() {
        this.guardApiRequest.mockReset();
        this.getDoc.mockReset();
        this.reserveUsernameForUser.mockReset();
    },
}));

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/rate-limit", () => ({
    ADMIN: {},
}));

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: {
        collection: vi.fn(() => ({
            doc: vi.fn(() => ({
                get: mockState.getDoc,
            })),
        })),
    },
}));

vi.mock("@/lib/server/username-suggestions", () => ({
    reserveUsernameForUser: mockState.reserveUsernameForUser,
}));

import { PATCH } from "@/app/api/admin/users/[userId]/username/route";

describe("PATCH /api/admin/users/[userId]/username", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "admin_1",
            role: "admin",
        });
        mockState.getDoc.mockResolvedValue({
            exists: true,
            data: () => ({
                username: "old_name",
            }),
        });
    });

    it("uses reserveUsernameForUser instead of directly mutating username ownership", async () => {
        mockState.reserveUsernameForUser.mockResolvedValue({
            ok: true,
            normalizedUsername: "new_name",
        });

        const request = new NextRequest("http://localhost/api/admin/users/user_1/username", {
            method: "PATCH",
            body: JSON.stringify({
                username: "new_name",
            }),
        });

        const response = await PATCH(request, {
            params: Promise.resolve({ userId: "user_1" }),
        });
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            username: "new_name",
        });
        expect(mockState.reserveUsernameForUser).toHaveBeenCalledWith(expect.objectContaining({
            requestedUsername: "new_name",
            uid: "user_1",
            previousUsername: "old_name",
            source: "admin_username_change",
            applyUserMutation: expect.any(Function),
        }));
    });

    it("returns unchanged without calling the reservation helper when the username matches", async () => {
        const request = new NextRequest("http://localhost/api/admin/users/user_1/username", {
            method: "PATCH",
            body: JSON.stringify({
                username: "old_name",
            }),
        });

        const response = await PATCH(request, {
            params: Promise.resolve({ userId: "user_1" }),
        });
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            message: "Username is unchanged",
        });
        expect(mockState.reserveUsernameForUser).not.toHaveBeenCalled();
    });

    it("returns conflict when reservation helper reports a taken username", async () => {
        mockState.reserveUsernameForUser.mockResolvedValue({
            ok: false,
            reason: "taken",
            normalizedUsername: "taken_name",
        });

        const request = new NextRequest("http://localhost/api/admin/users/user_1/username", {
            method: "PATCH",
            body: JSON.stringify({
                username: "taken_name",
            }),
        });

        const response = await PATCH(request, {
            params: Promise.resolve({ userId: "user_1" }),
        });
        const payload = await response.json();

        expect(response.status).toBe(409);
        expect(payload).toMatchObject({
            success: false,
            error: "Username is already taken",
        });
    });

    it("returns bad request when reservation helper reports invalid input", async () => {
        mockState.reserveUsernameForUser.mockResolvedValue({
            ok: false,
            reason: "invalid",
            normalizedUsername: null,
        });

        const request = new NextRequest("http://localhost/api/admin/users/user_1/username", {
            method: "PATCH",
            body: JSON.stringify({
                username: "bad_name",
            }),
        });

        const response = await PATCH(request, {
            params: Promise.resolve({ userId: "user_1" }),
        });
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload).toMatchObject({
            success: false,
            error: "Invalid username format",
        });
    });

    it("returns a canonical not-found payload when the target user is unavailable", async () => {
        mockState.getDoc.mockResolvedValueOnce({
            exists: false,
            data: () => undefined,
        });

        const request = new NextRequest("http://localhost/api/admin/users/user_404/username", {
            method: "PATCH",
            body: JSON.stringify({
                username: "new_name",
            }),
        });

        const response = await PATCH(request, {
            params: Promise.resolve({ userId: "user_404" }),
        });
        const payload = await response.json();

        expect(response.status).toBe(404);
        expect(payload).toMatchObject({
            error: "User not found",
            errorCode: "not_found",
            resource: "user",
        });
    });
});
