import { performance } from "node:perf_hooks";

import { PROCESS_QUEUE_FETCH_CHUNK_SIZE, buildQueuedDropsMap } from "../src/lib/server/process-queue-drops";

type BenchRef = {
    id: string;
};

type BenchData = {
    title: string;
    description: string;
    validFrom: number;
    validUntil: number;
    status: string;
    activationCount: number;
    contentUrls: string[];
    tags: string[];
    coverFileName: string;
    contentFileNames: string[];
};

type BenchSnapshot = {
    id: string;
    exists: boolean;
    data: () => BenchData | undefined;
};

function buildLegacyDropsMap(input: {
    dropIds: string[];
    createRef: (dropId: string) => BenchRef;
    getAll: (...refs: BenchRef[]) => Promise<BenchSnapshot[]>;
}) {
    const chunkArray = <T,>(items: T[], size: number) => {
        const chunks: T[][] = [];

        for (let index = 0; index < items.length; index += size) {
            chunks.push(items.slice(index, index + size));
        }

        return chunks;
    };

    return (async () => {
        const dropsMap = Object.create(null) as Record<string, BenchData & { id: string }>;
        const dropRefs = input.dropIds.map((id) => input.createRef(id));
        const chunkedRefs = chunkArray(dropRefs, PROCESS_QUEUE_FETCH_CHUNK_SIZE);
        const chunkPromises = chunkedRefs.map(async (refsChunk) => {
            if (refsChunk.length === 0) {
                return [];
            }

            return input.getAll(...refsChunk);
        });
        const allDocs = await Promise.all(chunkPromises);

        for (const docs of allDocs) {
            for (const doc of docs) {
                if (!doc.exists) {
                    continue;
                }

                const data = doc.data();
                if (!data) {
                    continue;
                }

                dropsMap[doc.id] = {
                    id: doc.id,
                    ...data,
                };
            }
        }

        return dropsMap;
    })();
}

function toFiniteNumber(value: unknown) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

async function buildOptimizedDropsMap(input: {
    dropIds: string[];
    createRef: (dropId: string) => BenchRef;
    getAll: (...refs: BenchRef[]) => Promise<BenchSnapshot[]>;
}) {
    return buildQueuedDropsMap({
        ...input,
        materialize: (doc) => {
            const data = doc.data();
            if (!data) {
                return null;
            }

            return {
                id: doc.id,
                validFrom: toFiniteNumber(data.validFrom),
                validUntil: toFiniteNumber(data.validUntil),
                activationCount: toFiniteNumber(data.activationCount) ?? 0,
            };
        },
    });
}

async function main() {
    const dropIds = Array.from({ length: 10_000 }, (_, index) => `drop_${index}`);
    const dataset = new Map<string, BenchData>(
        dropIds.map((dropId, index) => [
            dropId,
            {
                title: `Drop ${index}`,
                description: `Long description ${index}`.repeat(4),
                validFrom: 1_710_000_000_000 + index,
                validUntil: 1_710_086_400_000 + index,
                status: index % 2 === 0 ? "scheduled" : "expired",
                activationCount: index % 12,
                contentUrls: [`/content/${index}/1`, `/content/${index}/2`, `/content/${index}/3`],
                tags: ["sweet", "spicy", "raw"],
                coverFileName: `cover-${index}.png`,
                contentFileNames: [`asset-${index}-1.png`, `asset-${index}-2.mp4`, `asset-${index}-3.jpg`],
            },
        ]),
    );

    const createRef = (dropId: string): BenchRef => ({ id: dropId });
    const getAll = async (...refs: BenchRef[]) => refs.map((ref) => ({
        id: ref.id,
        exists: dataset.has(ref.id),
        data: () => dataset.get(ref.id),
    }));

    const iterations = 40;
    const warmups = 5;

    for (let index = 0; index < warmups; index += 1) {
        await buildLegacyDropsMap({ dropIds, createRef, getAll });
        await buildOptimizedDropsMap({ dropIds, createRef, getAll });
    }

    let legacyTotalMs = 0;
    let optimizedTotalMs = 0;

    for (let index = 0; index < iterations; index += 1) {
        const legacyStart = performance.now();
        await buildLegacyDropsMap({ dropIds, createRef, getAll });
        legacyTotalMs += performance.now() - legacyStart;

        const optimizedStart = performance.now();
        await buildOptimizedDropsMap({ dropIds, createRef, getAll });
        optimizedTotalMs += performance.now() - optimizedStart;
    }

    const legacyAverageMs = legacyTotalMs / iterations;
    const optimizedAverageMs = optimizedTotalMs / iterations;
    const improvementPercent = legacyAverageMs > 0
        ? ((legacyAverageMs - optimizedAverageMs) / legacyAverageMs) * 100
        : 0;

    console.log(JSON.stringify({
        queueLength: dropIds.length,
        iterations,
        baselineAverageMs: Number(legacyAverageMs.toFixed(2)),
        optimizedAverageMs: Number(optimizedAverageMs.toFixed(2)),
        improvementPercent: Number(improvementPercent.toFixed(1)),
    }, null, 2));
}

void main();
