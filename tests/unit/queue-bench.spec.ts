import { describe, it } from "vitest";

function chunkArray<T>(items: T[], size: number) {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
}

// Emulate more closely real DB semantics
const MOCK_LATENCY_MS = 10;
const LATENCY_PER_DOC = 0.5;

const mockDropsRef = {
    where: (field: string, op: string, val: any) => ({
        get: async () => {
            const numDocs = val.length;
            await new Promise(resolve => setTimeout(resolve, MOCK_LATENCY_MS + (numDocs * LATENCY_PER_DOC))); // DB Latency per doc overhead
            return val.map((id: string) => ({ id, data: () => ({ validFrom: Date.now() }) }));
        }
    }),
    getAll: async (...refs: any[]) => {
        const numDocs = refs.length;
        await new Promise(resolve => setTimeout(resolve, MOCK_LATENCY_MS + (numDocs * LATENCY_PER_DOC))); // DB Latency per doc overhead
        return refs.map((ref: any) => ({ id: ref.id, data: () => ({ validFrom: Date.now() }) }));
    },
    doc: (id: string) => ({ id })
};

describe("Performance Benchmark: queue processing 'in' vs 'getAll'", () => {
    const MOCK_QUEUE_SIZE = 1000;
    const queue = Array.from({ length: MOCK_QUEUE_SIZE }, (_, i) => `drop-${i}`);

    it("measures batched 'in' queries (Baseline)", async () => {
        const start = performance.now();
        const chunks = chunkArray(queue, 10);
        let promises = [];
        for (const chunk of chunks) {
             promises.push(mockDropsRef.where("__name__", "in", chunk).get());
             if(promises.length >= 10) { // Limit concurrent request to 10
                 await Promise.all(promises);
                 promises = [];
             }
        }
        await Promise.all(promises);

        const end = performance.now();
        console.log(`Baseline (chunked 'in' queries size 10): ${(end - start).toFixed(2)}ms`);
    });

    it("measures batched 'getAll' queries (Optimized)", async () => {
        const start = performance.now();
        const refs = queue.map(id => mockDropsRef.doc(id));
        const chunks = chunkArray(refs, 100);
        let promises = [];
        for (const chunk of chunks) {
            promises.push(mockDropsRef.getAll(...chunk));
            if(promises.length >= 10) { // Limit concurrent request to 10
                 await Promise.all(promises);
                 promises = [];
             }
        }
        await Promise.all(promises);
        const end = performance.now();
        console.log(`Optimized (getAll chunked by 100): ${(end - start).toFixed(2)}ms`);
    });
});
