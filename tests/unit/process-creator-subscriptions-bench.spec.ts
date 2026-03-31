import { describe, it } from "vitest";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const mockTransaction = async () => {
    await delay(10);
};

describe("Performance Benchmark: Sequential vs Chunked Promises", () => {
    it("measures sequential execution", async () => {
        const start = performance.now();
        const items = Array.from({ length: 50 }, (_, i) => i);
        for (const item of items) {
            await mockTransaction();
        }
        const end = performance.now();
        console.log(`Sequential execution (Baseline): ${(end - start).toFixed(2)}ms`);
    });

    it("measures chunked execution", async () => {
        const start = performance.now();
        const items = Array.from({ length: 50 }, (_, i) => i);
        const chunkSize = 10;
        for (let i = 0; i < items.length; i += chunkSize) {
            const chunk = items.slice(i, i + chunkSize);
            await Promise.all(chunk.map(() => mockTransaction()));
        }
        const end = performance.now();
        console.log(`Chunked execution (Optimized): ${(end - start).toFixed(2)}ms`);
    });
});
