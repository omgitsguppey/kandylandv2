import { describe, expect, it } from "vitest";

const LATENCY_MS = 10;
const AVAILABILITY_BATCH_SIZE = 10;
const SUFFIX_MIN = 2;
const SUFFIX_MAX = 100;

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUsernameSuffixBatch(candidate: string, batchStart: number) {
    const batchEnd = Math.min(SUFFIX_MAX, batchStart + AVAILABILITY_BATCH_SIZE);
    const alternatives: string[] = [];

    for (let suffix = batchStart; suffix < batchEnd; suffix += 1) {
        const suffixValue = `-${suffix}`;
        const truncatedBase = candidate.slice(0, Math.max(3, 20 - suffixValue.length));
        alternatives.push(`${truncatedBase}${suffixValue}`);
    }

    return alternatives;
}

async function baselineGenerateSuggestion(
    candidates: readonly string[],
    isUsernameAvailable: (username: string) => Promise<boolean>,
) {
    for (const candidate of candidates) {
        if (await isUsernameAvailable(candidate)) {
            return candidate;
        }

        for (let batchStart = SUFFIX_MIN; batchStart < SUFFIX_MAX; batchStart += 5) {
            const batchAlternatives: string[] = [];
            const batchEnd = Math.min(SUFFIX_MAX, batchStart + 5);

            for (let suffix = batchStart; suffix < batchEnd; suffix += 1) {
                const suffixValue = `-${suffix}`;
                const truncatedBase = candidate.slice(0, Math.max(3, 20 - suffixValue.length));
                batchAlternatives.push(`${truncatedBase}${suffixValue}`);
            }

            const results = await Promise.all(batchAlternatives.map((alternative) => isUsernameAvailable(alternative)));
            const availableIndex = results.findIndex(Boolean);

            if (availableIndex >= 0) {
                return batchAlternatives[availableIndex];
            }
        }
    }

    return null;
}

async function optimizedGenerateSuggestion(
    candidates: readonly string[],
    resolveAvailability: (usernames: readonly string[]) => Promise<Map<string, boolean>>,
) {
    const cache = new Map<string, boolean>();

    const findFirstAvailable = async (usernames: readonly string[]) => {
        const missing = usernames.filter((username) => !cache.has(username));
        if (missing.length > 0) {
            const availability = await resolveAvailability(missing);
            availability.forEach((value, username) => {
                cache.set(username, value);
            });
        }

        return usernames.find((username) => cache.get(username) === true) ?? null;
    };

    for (const candidate of candidates) {
        const initialBatch = [candidate, ...buildUsernameSuffixBatch(candidate, SUFFIX_MIN).slice(0, AVAILABILITY_BATCH_SIZE - 1)];
        const initialAvailable = await findFirstAvailable(initialBatch);
        if (initialAvailable) {
            return initialAvailable;
        }

        for (
            let batchStart = SUFFIX_MIN + (AVAILABILITY_BATCH_SIZE - 1);
            batchStart < SUFFIX_MAX;
            batchStart += AVAILABILITY_BATCH_SIZE
        ) {
            const availableAlternative = await findFirstAvailable(
                buildUsernameSuffixBatch(candidate, batchStart),
            );
            if (availableAlternative) {
                return availableAlternative;
            }
        }
    }

    return null;
}

describe("username suggestion benchmark", () => {
    it("measures the batched availability resolver against the old single-check flow", async () => {
        const targetUsername = "omega-2";
        const candidates = ["alpha", "beta", "gamma", "delta", "omega"];
        let baselineQueries = 0;
        let optimizedQueries = 0;

        const baselineStart = performance.now();
        const baselineSuggestion = await baselineGenerateSuggestion(candidates, async (username) => {
            baselineQueries += 1;
            await delay(LATENCY_MS);
            return username === targetUsername;
        });
        const baselineDuration = performance.now() - baselineStart;

        const optimizedStart = performance.now();
        const optimizedSuggestion = await optimizedGenerateSuggestion(candidates, async (usernames) => {
            optimizedQueries += 1;
            await delay(LATENCY_MS);
            return new Map(usernames.map((username) => [username, username === targetUsername]));
        });
        const optimizedDuration = performance.now() - optimizedStart;

        const durationImprovement = ((baselineDuration - optimizedDuration) / baselineDuration) * 100;
        const queryReduction = ((baselineQueries - optimizedQueries) / baselineQueries) * 100;

        console.log(`Username suggestion baseline: ${baselineDuration.toFixed(2)}ms across ${baselineQueries} queries`);
        console.log(`Username suggestion optimized: ${optimizedDuration.toFixed(2)}ms across ${optimizedQueries} queries`);
        console.log(`Username suggestion improvement: ${durationImprovement.toFixed(1)}% faster, ${queryReduction.toFixed(1)}% fewer queries`);

        expect(baselineSuggestion).toBe(targetUsername);
        expect(optimizedSuggestion).toBe(targetUsername);
        expect(optimizedDuration).toBeLessThan(baselineDuration);
        expect(optimizedQueries).toBeLessThan(baselineQueries / 2);
    });

    it("shows the promise cache eliminating duplicate suffix checks for colliding long candidates", async () => {
        const candidates = [
            "abcdefghijklmnopqrst",
            "abcdefghijklmnopqrsu",
        ];
        let baselineQueries = 0;
        let optimizedQueries = 0;

        await baselineGenerateSuggestion(candidates, async () => {
            baselineQueries += 1;
            await delay(1);
            return false;
        });

        await optimizedGenerateSuggestion(candidates, async (usernames) => {
            optimizedQueries += 1;
            await delay(1);
            return new Map(usernames.map((username) => [username, false]));
        });

        expect(optimizedQueries).toBeLessThan(baselineQueries);
    });
});
