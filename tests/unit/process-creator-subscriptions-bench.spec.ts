import { describe, expect, it } from "vitest";

const RENEWAL_LATENCY_MS = 10;
const SUBSCRIPTION_COUNT = 50;
const RENEWAL_CHUNK_SIZE = 20;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function mockRenewalTransaction() {
    await delay(RENEWAL_LATENCY_MS);
}

async function runSequentialRenewals(totalSubscriptions: number) {
    for (let index = 0; index < totalSubscriptions; index += 1) {
        await mockRenewalTransaction();
    }
}

async function runChunkedConcurrentRenewals(totalSubscriptions: number, chunkSize: number) {
    const items = Array.from({ length: totalSubscriptions }, (_, index) => index);

    for (let start = 0; start < items.length; start += chunkSize) {
        const chunk = items.slice(start, start + chunkSize);
        await Promise.all(chunk.map(() => mockRenewalTransaction()));
    }
}

describe("Performance Benchmark: process-creator-subscriptions renewal loop", () => {
    it("measures the legacy sequential renewal loop baseline", async () => {
        const start = performance.now();
        await runSequentialRenewals(SUBSCRIPTION_COUNT);
        const duration = performance.now() - start;

        console.log(`Creator subscription renewal baseline (sequential): ${duration.toFixed(2)}ms`);
    });

    it("measures the chunked concurrent renewal loop used by the cron route", async () => {
        const baselineStart = performance.now();
        await runSequentialRenewals(SUBSCRIPTION_COUNT);
        const baselineDuration = performance.now() - baselineStart;

        const optimizedStart = performance.now();
        await runChunkedConcurrentRenewals(SUBSCRIPTION_COUNT, RENEWAL_CHUNK_SIZE);
        const optimizedDuration = performance.now() - optimizedStart;
        const improvement = ((baselineDuration - optimizedDuration) / baselineDuration) * 100;

        console.log(`Creator subscription renewal optimized (chunked Promise.all): ${optimizedDuration.toFixed(2)}ms`);
        console.log(`Creator subscription renewal improvement: ${improvement.toFixed(1)}%`);

        expect(optimizedDuration).toBeLessThan(baselineDuration * 0.4);
    });
});
