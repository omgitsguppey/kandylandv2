import { describe, expect, it } from "vitest";
import { buildHistoricalAnalyticsUserMap } from "@/lib/server/admin-analytics-historical-users";

type MockUserRecord = {
  username?: string;
  displayName?: string;
  photoURL?: string;
};

function createMockUsersCollection({
  latencyMs,
  records,
}: {
  latencyMs: number;
  records: Record<string, MockUserRecord>;
}) {
  return {
    where: (_fieldPath: string, _opStr: string, value: string[]) => ({
      get: async () => {
        await new Promise((resolve) => setTimeout(resolve, latencyMs));
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

async function buildSequentialHistoricalAnalyticsUserMap({
  usersCollection,
  userIds,
  chunkSize,
}: {
  usersCollection: ReturnType<typeof createMockUsersCollection>;
  userIds: Iterable<string>;
  chunkSize: number;
}) {
  const uidArray = Array.from(userIds);
  const userMap: Record<string, { username: string; photoURL: string }> = {};

  for (let index = 0; index < uidArray.length; index += chunkSize) {
    const chunk = uidArray.slice(index, index + chunkSize);
    const snapshot = await usersCollection.where("__name__", "in", chunk).get();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      userMap[doc.id] = {
        username:
          typeof data.username === "string" && data.username.length > 0
            ? data.username
            : typeof data.displayName === "string" && data.displayName.length > 0
              ? data.displayName
              : "Unknown User",
        photoURL: typeof data.photoURL === "string" ? data.photoURL : "",
      };
    }
  }

  return userMap;
}

describe("buildHistoricalAnalyticsUserMap", () => {
  it("builds a user map across multiple chunks with fallback names", async () => {
    const usersCollection = createMockUsersCollection({
      latencyMs: 1,
      records: {
        user_1: { username: "alpha", photoURL: "https://cdn.test/alpha.png" },
        user_2: { displayName: "Bravo" },
        user_3: {},
      },
    });

    const userMap = await buildHistoricalAnalyticsUserMap({
      usersCollection,
      userIds: ["user_1", "user_2", "user_3"],
      chunkSize: 2,
    });

    expect(userMap).toEqual({
      user_1: {
        username: "alpha",
        photoURL: "https://cdn.test/alpha.png",
      },
      user_2: {
        username: "Bravo",
        photoURL: "",
      },
      user_3: {
        username: "Unknown User",
        photoURL: "",
      },
    });
  });

  it("returns an empty map without issuing lookups when there are no user IDs", async () => {
    let lookupCount = 0;
    const usersCollection = {
      where: () => {
        lookupCount += 1;
        return {
          get: async () => ({ docs: [] }),
        };
      },
    };

    const userMap = await buildHistoricalAnalyticsUserMap({
      usersCollection,
      userIds: [],
    });

    expect(userMap).toEqual({});
    expect(lookupCount).toBe(0);
  });

  it("reduces chunk lookup wall time by running independent user batches concurrently", async () => {
    const userIds = Array.from({ length: 120 }, (_, index) => `user_${index}`);
    const records = Object.fromEntries(
      userIds.map((userId) => [userId, { username: userId, photoURL: "" }]),
    );
    const usersCollection = createMockUsersCollection({
      latencyMs: 20,
      records,
    });

    const sequentialStart = performance.now();
    const sequentialUserMap = await buildSequentialHistoricalAnalyticsUserMap({
      usersCollection,
      userIds,
      chunkSize: 20,
    });
    const sequentialMs = performance.now() - sequentialStart;

    const parallelStart = performance.now();
    const parallelUserMap = await buildHistoricalAnalyticsUserMap({
      usersCollection,
      userIds,
      chunkSize: 20,
    });
    const parallelMs = performance.now() - parallelStart;
    const improvement = ((sequentialMs - parallelMs) / sequentialMs) * 100;

    expect(parallelUserMap).toEqual(sequentialUserMap);
    expect(parallelMs).toBeLessThan(sequentialMs * 0.6);
    console.log(
      `Historical analytics user enrichment benchmark: sequential=${sequentialMs.toFixed(2)}ms parallel=${parallelMs.toFixed(2)}ms improvement=${improvement.toFixed(1)}%`,
    );
  });
});
