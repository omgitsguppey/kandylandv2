import { describe, expect, it } from "vitest";
import { buildDropReferenceMapForIds } from "@/lib/server/drop-references";

type MockDropRecord = {
  title?: string;
  status?: string;
  imageUrl?: string;
};

function createMockDropsCollection({
  records,
  docLatencyMs,
  batchLatencyMs,
}: {
  records: Record<string, MockDropRecord>;
  docLatencyMs: number;
  batchLatencyMs: number;
}) {
  return {
    doc: (dropId: string) => ({
      get: async () => {
        await new Promise((resolve) => setTimeout(resolve, docLatencyMs));
        return {
          exists: dropId in records,
          id: dropId,
          data: () => records[dropId],
        };
      },
    }),
    where: (_fieldPath: string, _opStr: string, value: string[]) => ({
      get: async () => {
        await new Promise((resolve) => setTimeout(resolve, batchLatencyMs));
        return {
          docs: value
            .filter((dropId) => dropId in records)
            .map((dropId) => ({
              id: dropId,
              data: () => records[dropId],
            })),
        };
      },
    }),
  };
}

async function buildSequentialDropReferenceMapForIds({
  dropsCollection,
  dropIds,
}: {
  dropsCollection: ReturnType<typeof createMockDropsCollection>;
  dropIds: string[];
}) {
  const uniqueIds = Array.from(new Set(dropIds.map((id) => id.trim()).filter(Boolean)));
  const entries: Array<[string, { id: string; title: string; status: string; imageUrl?: string }]> = [];

  for (const dropId of uniqueIds) {
    const snapshot = await dropsCollection.doc(dropId).get();
    if (!snapshot.exists) {
      continue;
    }

    const data = snapshot.data();
    entries.push([
      snapshot.id,
      {
        id: snapshot.id,
        title: typeof data.title === "string" && data.title.trim().length > 0 ? data.title.trim() : snapshot.id,
        status: typeof data.status === "string" ? data.status : "unknown",
        imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : undefined,
      },
    ]);
  }

  return Object.fromEntries(entries);
}

describe("buildDropReferenceMapForIds", () => {
  it("normalizes drop references and ignores missing IDs", async () => {
    const dropsCollection = createMockDropsCollection({
      records: {
        alpha: { title: " Alpha ", status: "active", imageUrl: "https://cdn.test/a.png" },
        beta: { status: "queued" },
      },
      docLatencyMs: 1,
      batchLatencyMs: 1,
    });

    const dropMap = await buildDropReferenceMapForIds({
      dropsCollection,
      dropIds: ["alpha", "beta", "missing", "alpha"],
      chunkSize: 2,
    });

    expect(dropMap).toEqual({
      alpha: {
        id: "alpha",
        title: "Alpha",
        status: "active",
        imageUrl: "https://cdn.test/a.png",
      },
      beta: {
        id: "beta",
        title: "beta",
        status: "queued",
      },
    });
  });

  it("returns an empty object without fetching when no valid IDs are provided", async () => {
    let whereCalls = 0;
    const dropsCollection = {
      where: () => {
        whereCalls += 1;
        return {
          get: async () => ({ docs: [] }),
        };
      },
    };

    const dropMap = await buildDropReferenceMapForIds({
      dropsCollection,
      dropIds: ["", "   "],
    });

    expect(dropMap).toEqual({});
    expect(whereCalls).toBe(0);
  });

  it("reduces lookup wall time by batching drop reference queries", async () => {
    const dropIds = Array.from({ length: 120 }, (_, index) => `drop_${index}`);
    const records = Object.fromEntries(
      dropIds.map((dropId) => [dropId, { title: dropId, status: "active" }]),
    );
    const dropsCollection = createMockDropsCollection({
      records,
      docLatencyMs: 10,
      batchLatencyMs: 15,
    });

    const sequentialStart = performance.now();
    const sequentialMap = await buildSequentialDropReferenceMapForIds({
      dropsCollection,
      dropIds,
    });
    const sequentialMs = performance.now() - sequentialStart;

    const optimizedStart = performance.now();
    const optimizedMap = await buildDropReferenceMapForIds({
      dropsCollection,
      dropIds,
      chunkSize: 30,
    });
    const optimizedMs = performance.now() - optimizedStart;
    const improvement = ((sequentialMs - optimizedMs) / sequentialMs) * 100;

    expect(optimizedMap).toEqual(sequentialMap);
    expect(optimizedMs).toBeLessThan(sequentialMs * 0.25);
    console.log(
      `Drop reference benchmark: sequential=${sequentialMs.toFixed(2)}ms batched=${optimizedMs.toFixed(2)}ms improvement=${improvement.toFixed(1)}%`,
    );
  });
});
