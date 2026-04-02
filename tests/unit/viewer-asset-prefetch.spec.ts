import { describe, expect, it } from "vitest";

import {
    getViewerAssetPrefetchConcurrency,
    runConcurrentViewerPrefetch,
} from "@/lib/viewer-asset-prefetch";

describe("viewer asset prefetch helpers", () => {
    it("uses a small bounded concurrency based on network conditions", () => {
        expect(getViewerAssetPrefetchConcurrency(false, true)).toBe(1);
        expect(getViewerAssetPrefetchConcurrency(true, false)).toBe(2);
        expect(getViewerAssetPrefetchConcurrency(false, false)).toBe(3);
    });

    it("processes every item exactly once while respecting the concurrency cap", async () => {
        const items = [0, 1, 2, 3, 4, 5];
        const processed: number[] = [];
        let activeWorkers = 0;
        let maxActiveWorkers = 0;

        await runConcurrentViewerPrefetch(items, 3, async (item) => {
            activeWorkers += 1;
            maxActiveWorkers = Math.max(maxActiveWorkers, activeWorkers);

            await new Promise((resolve) => setTimeout(resolve, 10));
            processed.push(item);
            activeWorkers -= 1;
        });

        expect(processed.slice().sort((left, right) => left - right)).toEqual(items);
        expect(maxActiveWorkers).toBeLessThanOrEqual(3);
    });
});
