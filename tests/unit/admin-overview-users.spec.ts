import { describe, expect, it } from "vitest";

import { buildAdminOverviewUserNameMap } from "@/lib/server/admin-overview-users";

type MockUserRecord = {
    username?: string;
    displayName?: string;
};

function createMockUsersCollection({
    records,
    fullScanLatencyMs,
    countLatencyMs,
    targetedQueryLatencyMs,
}: {
    records: Record<string, MockUserRecord>;
    fullScanLatencyMs: number;
    countLatencyMs: number;
    targetedQueryLatencyMs: number;
}) {
    return {
        get: async () => {
            await new Promise((resolve) => setTimeout(resolve, fullScanLatencyMs));
            return {
                size: Object.keys(records).length,
                docs: Object.entries(records).map(([id, data]) => ({
                    id,
                    data: () => data,
                })),
            };
        },
        count: () => ({
            get: async () => {
                await new Promise((resolve) => setTimeout(resolve, countLatencyMs));
                return {
                    data: () => ({ count: Object.keys(records).length }),
                };
            },
        }),
        where: (_fieldPath: string, _opStr: string, value: string[]) => ({
            get: async () => {
                await new Promise((resolve) => setTimeout(resolve, targetedQueryLatencyMs));
                return {
                    docs: value
                        .filter((userId) => userId in records)
                        .map((userId) => ({
                            id: userId,
                            data: () => records[userId],
                        })),
                };
            },
        }),
    };
}

async function buildBaselineOverviewUsers(input: {
    usersCollection: ReturnType<typeof createMockUsersCollection>;
    userIds: Iterable<string>;
}) {
    const snapshot = await input.usersCollection.get();
    const referencedUserIds = new Set(Array.from(input.userIds));
    const userNameMap = new Map<string, string>();

    for (const doc of snapshot.docs) {
        if (!referencedUserIds.has(doc.id)) {
            continue;
        }

        const raw = doc.data();
        userNameMap.set(
            doc.id,
            typeof raw.username === "string" && raw.username.trim().length > 0
                ? raw.username
                : typeof raw.displayName === "string" && raw.displayName.trim().length > 0
                    ? raw.displayName
                    : "Unknown",
        );
    }

    return {
        totalUsers: snapshot.size,
        userNameMap,
    };
}

describe("buildAdminOverviewUserNameMap", () => {
    it("builds names only for referenced overview users", async () => {
        const usersCollection = createMockUsersCollection({
            records: {
                alpha: { username: "alpha" },
                beta: { displayName: "Beta Display" },
                gamma: {},
            },
            fullScanLatencyMs: 1,
            countLatencyMs: 1,
            targetedQueryLatencyMs: 1,
        });

        const userNameMap = await buildAdminOverviewUserNameMap({
            usersCollection,
            userIds: ["alpha", "gamma", "missing"],
            chunkSize: 2,
        });

        expect(Array.from(userNameMap.entries())).toEqual([
            ["alpha", "alpha"],
            ["gamma", "Unknown"],
        ]);
    });

    it("reduces overview user lookup wall time by replacing the full users scan with count plus targeted fetches", async () => {
        const allUserIds = Array.from({ length: 5000 }, (_, index) => `user_${index}`);
        const referencedUserIds = allUserIds.slice(0, 30);
        const records = Object.fromEntries(
            allUserIds.map((userId) => [userId, { username: userId }]),
        );
        const usersCollection = createMockUsersCollection({
            records,
            fullScanLatencyMs: 300,
            countLatencyMs: 10,
            targetedQueryLatencyMs: 15,
        });

        const baselineStart = performance.now();
        const baselineUsers = await buildBaselineOverviewUsers({
            usersCollection,
            userIds: referencedUserIds,
        });
        const baselineMs = performance.now() - baselineStart;

        const optimizedStart = performance.now();
        const [countSnapshot, optimizedUserMap] = await Promise.all([
            usersCollection.count().get(),
            buildAdminOverviewUserNameMap({
                usersCollection,
                userIds: referencedUserIds,
            }),
        ]);
        const optimizedMs = performance.now() - optimizedStart;
        const improvement = ((baselineMs - optimizedMs) / baselineMs) * 100;

        expect(countSnapshot.data().count).toBe(baselineUsers.totalUsers);
        expect(Array.from(optimizedUserMap.entries())).toEqual(Array.from(baselineUsers.userNameMap.entries()));
        expect(optimizedMs).toBeLessThan(baselineMs);
        expect(improvement).toBeGreaterThan(50);
        console.log(
            `Admin overview user lookup benchmark: baseline=${baselineMs.toFixed(2)}ms optimized=${optimizedMs.toFixed(2)}ms improvement=${improvement.toFixed(1)}%`,
        );
    });
});
