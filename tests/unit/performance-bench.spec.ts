import { describe, expect, it } from "vitest";

const LATENCY_MS = 10; // Simulated network latency per request
const NUM_FACTS = 10;  // Number of facts to fetch

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const mockTransaction = {
    get: async (ref: any) => {
        await delay(LATENCY_MS);
        return { exists: false };
    },
    getAll: async (...refs: any[]) => {
        await delay(LATENCY_MS);
        return refs.map(() => ({ exists: false }));
    },
    create: (ref: any, data: any) => {}
};

describe("Performance Benchmark: transaction.get vs transaction.getAll", () => {
    it("measures sequential transaction.get performance (Baseline)", async () => {
        const start = performance.now();
        const onboardingFactWrites = Array.from({ length: NUM_FACTS }, (_, i) => ({
            key: `fact-${i}`,
            data: { event: "test" }
        }));

        for (const factWrite of onboardingFactWrites) {
            const factRef = { key: factWrite.key }; // Mock ref
            const existingFact = await mockTransaction.get(factRef);
            if (existingFact.exists) continue;
            mockTransaction.create(factRef, factWrite.data);
        }
        const end = performance.now();
        console.log(`Sequential transaction.get (Baseline): ${(end - start).toFixed(2)}ms`);
    });

    it("measures batched transaction.getAll performance (Optimized)", async () => {
        const start = performance.now();
        const onboardingFactWrites = Array.from({ length: NUM_FACTS }, (_, i) => ({
            key: `fact-${i}`,
            data: { event: "test" }
        }));

        const factRefs = onboardingFactWrites.map(fw => ({ key: fw.key })); // Mock refs
        const existingFacts = await mockTransaction.getAll(...factRefs);

        for (let i = 0; i < onboardingFactWrites.length; i++) {
            if (existingFacts[i].exists) continue;
            mockTransaction.create(factRefs[i], onboardingFactWrites[i].data);
        }
        const end = performance.now();
        console.log(`Batched transaction.getAll (Optimized): ${(end - start).toFixed(2)}ms`);
    });

    it("measures drop-grid unlocked membership lookups with includes vs Set", () => {
        const drops = Array.from({ length: 400 }, (_, index) => `drop-${index}`);
        const unlocked = Array.from({ length: 200 }, (_, index) => `drop-${index * 2}`);
        const iterations = 2_000;

        const baselineStart = performance.now();
        for (let iteration = 0; iteration < iterations; iteration += 1) {
            drops.forEach((dropId) => unlocked.includes(dropId));
        }
        const baselineDuration = performance.now() - baselineStart;

        const optimizedStart = performance.now();
        const unlockedLookup = new Set(unlocked);
        for (let iteration = 0; iteration < iterations; iteration += 1) {
            drops.forEach((dropId) => unlockedLookup.has(dropId));
        }
        const optimizedDuration = performance.now() - optimizedStart;

        console.log(`Drop grid unlocked lookup baseline (Array.includes): ${baselineDuration.toFixed(2)}ms`);
        console.log(`Drop grid unlocked lookup optimized (Set.has): ${optimizedDuration.toFixed(2)}ms`);
        expect(optimizedDuration).toBeLessThan(baselineDuration);
    });
});
