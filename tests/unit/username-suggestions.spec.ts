import { beforeEach, describe, expect, it, vi } from "vitest";

type UserDoc = {
    id: string;
    data: () => { username?: string };
};

const mockState = vi.hoisted(() => {
    const usernameOwners = new Map<string, string>();

    return {
        usernameOwners,
        adminDb: {
            collection: vi.fn(() => ({
                where: vi.fn((field: string, operator: string, value: string | string[]) => ({
                    async get() {
                        if (field !== "username") {
                            throw new Error(`Unexpected field ${field}`);
                        }

                        const candidates = Array.isArray(value) ? value : [value];
                        const docs = candidates.flatMap((candidate) => {
                            const ownerId = usernameOwners.get(candidate);
                            if (!ownerId) {
                                return [];
                            }

                            return [{
                                id: ownerId,
                                data: () => ({ username: candidate }),
                            } satisfies UserDoc];
                        });

                        return {
                            empty: docs.length === 0,
                            docs,
                        };
                    },
                })),
            })),
        },
        reset() {
            usernameOwners.clear();
            this.adminDb.collection.mockClear();
        },
    };
});

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

import {
    checkUsernameAvailability,
    generateUniqueUsernameSuggestion,
} from "@/lib/server/username-suggestions";

describe("username suggestions", () => {
    beforeEach(() => {
        mockState.reset();
    });

    it("keeps the current candidate ordering by preferring the current base suffix before later base candidates", async () => {
        mockState.usernameOwners.set("alpha", "someone-else");
        mockState.usernameOwners.set("beta", "different-user");

        const suggestion = await generateUniqueUsernameSuggestion({
            uid: "abc123456789",
            preferredUsername: "alpha",
            displayName: "Beta Person",
            email: "beta@example.com",
        });

        expect(suggestion).toBe("alpha-2");
    });

    it("treats the excluded uid as available for the same username", async () => {
        mockState.usernameOwners.set("creator-name", "user-123");

        const result = await checkUsernameAvailability("creator-name", "user-123");

        expect(result).toEqual({
            normalized: "creator-name",
            available: true,
        });
    });

    it("falls back to suffixed alternatives when the preferred username is taken", async () => {
        mockState.usernameOwners.set("taken-name", "someone-else");

        const suggestion = await generateUniqueUsernameSuggestion({
            uid: "9876543210",
            preferredUsername: "taken name",
        });

        expect(suggestion).toBe("taken-name-2");
    });
});
