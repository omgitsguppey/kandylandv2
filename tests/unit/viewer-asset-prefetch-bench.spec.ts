import { describe, expect, it } from "vitest";

import { runConcurrentViewerPrefetch } from "@/lib/viewer-asset-prefetch";

const BENCHMARK_ITEMS = Array.from({ length: 9 }, (_, index) => index);
const BENCHMARK_DELAY_MS = 40;

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("viewer asset prefetch benchmark", () => {
    it("shows the bounded concurrent prefetch queue beating the sequential baseline", async () => {
        const baselineStart = performance.now();
        await runConcurrentViewerPrefetch(BENCHMARK_ITEMS, 1, async () => {
            await delay(BENCHMARK_DELAY_MS);
        });
        const baselineDuration = performance.now() - baselineStart;

        const optimizedStart = performance.now();
        await runConcurrentViewerPrefetch(BENCHMARK_ITEMS, 3, async () => {
            await delay(BENCHMARK_DELAY_MS);
        });
        const optimizedDuration = performance.now() - optimizedStart;

        const improvementRatio = ((baselineDuration - optimizedDuration) / baselineDuration) * 100;

        console.log(`Viewer asset prefetch baseline (serial): ${baselineDuration.toFixed(2)}ms`);
        console.log(`Viewer asset prefetch optimized (3-way): ${optimizedDuration.toFixed(2)}ms`);
        console.log(`Viewer asset prefetch improvement: ${improvementRatio.toFixed(1)}%`);

        expect(optimizedDuration).toBeLessThan(baselineDuration * 0.7);
    });
});
