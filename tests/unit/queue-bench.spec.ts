import { describe, expect, it } from "vitest";

import { PROCESS_QUEUE_FETCH_CHUNK_SIZE, buildQueuedDropsMap } from "@/lib/server/process-queue-drops";

type MockQueueRef = { id: string };

function chunkRefs(items: MockQueueRef[], size: number) {
    const chunks: MockQueueRef[][] = [];

    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }

    return chunks;
}

async function runSequentialGetAllBaseline(queue: string[], getAll: (...refs: MockQueueRef[]) => Promise<MockQueueRef[]>) {
    const refs = queue.map((id) => ({ id }));

    for (const refsChunk of chunkRefs(refs, PROCESS_QUEUE_FETCH_CHUNK_SIZE)) {
        await getAll(...refsChunk);
    }
}

describe("Performance Benchmark: queue chunk fetching", () => {
    const MOCK_QUEUE_SIZE = 1000;
    const MOCK_LATENCY_MS = 25;
    const queue = Array.from({ length: MOCK_QUEUE_SIZE }, (_, index) => `drop-${index}`);
    const getAll = async (...refs: MockQueueRef[]) => {
        await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
        return refs;
    };

    it("measures sequential chunked getAll as the legacy baseline", async () => {
        const start = performance.now();
        await runSequentialGetAllBaseline(queue, getAll);
        const end = performance.now();

        console.log(`Queue baseline (sequential getAll chunks of ${PROCESS_QUEUE_FETCH_CHUNK_SIZE}): ${(end - start).toFixed(2)}ms`);
    });

    it("measures concurrent chunked getAll as the optimized path", async () => {
        const baselineStart = performance.now();
        await runSequentialGetAllBaseline(queue, getAll);
        const baselineMs = performance.now() - baselineStart;

        const optimizedStart = performance.now();
        await buildQueuedDropsMap({
            dropIds: queue,
            createRef: (dropId) => ({ id: dropId }),
            getAll: async (...refs) => {
                await getAll(...refs);
                return refs.map((ref) => ({
                    id: ref.id,
                    exists: true,
                    data: () => ({ validFrom: Date.now() }),
                }));
            },
            materialize: (doc) => ({
                id: doc.id,
                validFrom: doc.data().validFrom,
            }),
        });
        const optimizedMs = performance.now() - optimizedStart;
        const improvement = ((baselineMs - optimizedMs) / baselineMs) * 100;

        console.log(
            `Queue optimized (concurrent getAll chunks of ${PROCESS_QUEUE_FETCH_CHUNK_SIZE}): ${optimizedMs.toFixed(2)}ms`,
        );
        console.log(`Queue benchmark improvement: ${improvement.toFixed(1)}%`);

        expect(optimizedMs).toBeLessThan(baselineMs * 0.4);
    });
});
