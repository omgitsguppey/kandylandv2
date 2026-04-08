import { beforeEach, describe, expect, it, vi } from "vitest";

type UserDoc = {
    id: string;
    username?: string;
};

type ReservationDoc = {
    uid: string;
    username: string;
    source: string;
    legacyBackfilled?: boolean;
};

const mockState = vi.hoisted(() => {
    const users = new Map<string, UserDoc>();
    const reservations = new Map<string, ReservationDoc>();

    const buildQuery = (name: string, field: string, operator: string, value: string | string[], limitCount?: number) => ({
        __kind: "query" as const,
        name,
        field,
        operator,
        value,
        limitCount,
        limit(nextLimit: number) {
            return buildQuery(name, field, operator, value, nextLimit);
        },
        async get() {
            if (name !== "users" || field !== "username") {
                throw new Error(`Unexpected query ${name}.${field}`);
            }

            const candidates = Array.isArray(value) ? value : [value];
            let docs = Array.from(users.values())
                .filter((doc) => typeof doc.username === "string" && candidates.includes(doc.username))
                .map((doc) => ({
                    id: doc.id,
                    data: () => ({ username: doc.username }),
                }));

            if (typeof limitCount === "number") {
                docs = docs.slice(0, limitCount);
            }

            return {
                empty: docs.length === 0,
                docs,
            };
        },
    });

    const buildDocRef = (name: string, id: string) => ({
        __kind: "doc" as const,
        name,
        id,
        async get() {
            if (name === "username_reservations") {
                const data = reservations.get(id);
                return {
                    exists: Boolean(data),
                    data: () => data,
                };
            }

            if (name === "users") {
                const data = users.get(id);
                return {
                    exists: Boolean(data),
                    data: () => data,
                };
            }

            throw new Error(`Unexpected doc ref ${name}`);
        },
        async set(data: Record<string, unknown>, options?: { merge?: boolean }) {
            if (name !== "username_reservations") {
                throw new Error(`Unexpected set on ${name}`);
            }

            const current = options?.merge ? (reservations.get(id) ?? null) : null;
            reservations.set(id, {
                ...(current ?? {}),
                uid: typeof data.uid === "string" ? data.uid : current?.uid ?? "",
                username: typeof data.username === "string" ? data.username : current?.username ?? id,
                source: typeof data.source === "string" ? data.source : current?.source ?? "test",
                legacyBackfilled: data.legacyBackfilled === true || current?.legacyBackfilled === true,
            });
        },
    });

    const adminDb = {
        collection(name: string) {
            return {
                where(field: string, operator: string, value: string | string[]) {
                    return buildQuery(name, field, operator, value);
                },
                doc(id: string) {
                    return buildDocRef(name, id);
                },
            };
        },
        async runTransaction<T>(callback: (transaction: {
            get: (target: any) => Promise<any>;
            set: (target: any, data: Record<string, unknown>, options?: { merge?: boolean }) => void;
            delete: (target: any) => void;
            update: (target: any, data: Record<string, unknown>) => void;
        }) => Promise<T>) {
            const transaction = {
                async get(target: any) {
                    if (target?.__kind === "doc" || typeof target?.get === "function") {
                        return target.get();
                    }
                    if (target?.__kind === "query" || typeof target?.where === "function") {
                        return target.get();
                    }
                    throw new Error("Unexpected transaction target");
                },
                set(target: any, data: Record<string, unknown>, options?: { merge?: boolean }) {
                    if (target?.__kind !== "doc") {
                        throw new Error("Unexpected transaction set target");
                    }
                    if (target.name === "username_reservations") {
                        const current = options?.merge ? (reservations.get(target.id) ?? null) : null;
                        reservations.set(target.id, {
                            ...(current ?? {}),
                            uid: typeof data.uid === "string" ? data.uid : current?.uid ?? "",
                            username: typeof data.username === "string" ? data.username : current?.username ?? target.id,
                            source: typeof data.source === "string" ? data.source : current?.source ?? "test",
                            legacyBackfilled: data.legacyBackfilled === true || current?.legacyBackfilled === true,
                        });
                        return;
                    }

                    if (target.name === "users") {
                        const current: UserDoc = options?.merge
                            ? (users.get(target.id) ?? { id: target.id, username: undefined })
                            : { id: target.id, username: undefined };
                        users.set(target.id, {
                            ...current,
                            username: typeof data.username === "string" ? data.username : current.username,
                        });
                        return;
                    }

                    throw new Error("Unexpected transaction set collection");
                },
                delete(target: any) {
                    if (target?.__kind === "doc" && target.name === "username_reservations") {
                        reservations.delete(target.id);
                        return;
                    }
                    throw new Error("Unexpected transaction delete target");
                },
                update(target: any, data: Record<string, unknown>) {
                    if (target?.__kind === "doc" && target.name === "users") {
                        const current: UserDoc = users.get(target.id) ?? { id: target.id, username: undefined };
                        users.set(target.id, {
                            ...current,
                            username: typeof data.username === "string" ? data.username : current.username,
                        });
                        return;
                    }
                    throw new Error("Unexpected transaction update target");
                },
            };

            return callback(transaction);
        },
        reset() {
            users.clear();
            reservations.clear();
        },
    };

    return {
        users,
        reservations,
        adminDb,
        reset() {
            adminDb.reset();
        },
    };
});

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

import {
    checkUsernameAvailability,
    generateUniqueUsernameSuggestion,
    releaseUsernameReservationForUser,
    reserveUsernameForUser,
} from "@/lib/server/username-suggestions";

describe("username suggestions and reservations", () => {
    beforeEach(() => {
        mockState.reset();
    });

    it("keeps the current candidate ordering by preferring the current base suffix before later base candidates", async () => {
        mockState.reservations.set("alpha", {
            uid: "someone-else",
            username: "alpha",
            source: "existing",
        });
        mockState.reservations.set("beta", {
            uid: "different-user",
            username: "beta",
            source: "existing",
        });

        const suggestion = await generateUniqueUsernameSuggestion({
            uid: "abc123456789",
            preferredUsername: "alpha",
            displayName: "Beta Person",
            email: "beta@example.com",
        });

        expect(suggestion).toBe("alpha-2");
    });

    it("backfills a legacy user into the reservation map during availability checks", async () => {
        mockState.users.set("user-123", {
            id: "user-123",
            username: "creator-name",
        });

        const result = await checkUsernameAvailability("creator-name");

        expect(result).toEqual({
            normalized: "creator-name",
            available: false,
        });
        expect(mockState.reservations.get("creator-name")).toMatchObject({
            uid: "user-123",
            username: "creator-name",
            source: "legacy_backfill",
            legacyBackfilled: true,
        });
    });

    it("treats the excluded uid as available for the same username and backfills the reservation", async () => {
        mockState.users.set("user-123", {
            id: "user-123",
            username: "creator-name",
        });

        const result = await checkUsernameAvailability("creator-name", "user-123");

        expect(result).toEqual({
            normalized: "creator-name",
            available: true,
        });
        expect(mockState.reservations.get("creator-name")?.uid).toBe("user-123");
    });

    it("reserves a username and releases the previous reservation for the same user", async () => {
        mockState.reservations.set("old-name", {
            uid: "user-123",
            username: "old-name",
            source: "existing",
        });

        const result = await reserveUsernameForUser({
            requestedUsername: "new-name",
            uid: "user-123",
            previousUsername: "old-name",
            source: "profile_update",
        });

        expect(result).toEqual({
            ok: true,
            normalizedUsername: "new-name",
        });
        expect(mockState.reservations.get("new-name")).toMatchObject({
            uid: "user-123",
            source: "profile_update",
        });
        expect(mockState.reservations.has("old-name")).toBe(false);
    });

    it("blocks a claim when a legacy user already owns the username", async () => {
        mockState.users.set("legacy-user", {
            id: "legacy-user",
            username: "taken-name",
        });

        const result = await reserveUsernameForUser({
            requestedUsername: "taken-name",
            uid: "new-user",
            source: "user_register",
        });

        expect(result).toEqual({
            ok: false,
            reason: "taken",
            normalizedUsername: "taken-name",
            ownerUid: "legacy-user",
        });
        expect(mockState.reservations.get("taken-name")?.uid).toBe("legacy-user");
    });

    it("releases a reservation when the owning user account is deleted", async () => {
        mockState.reservations.set("creator-name", {
            uid: "user-123",
            username: "creator-name",
            source: "existing",
        });

        await releaseUsernameReservationForUser({
            uid: "user-123",
            username: "creator-name",
        });

        expect(mockState.reservations.has("creator-name")).toBe(false);
    });
});
