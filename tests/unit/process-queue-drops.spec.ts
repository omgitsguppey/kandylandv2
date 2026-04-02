import { describe, expect, it } from "vitest";

import { PROCESS_QUEUE_FETCH_CHUNK_SIZE, buildQueuedDropsMap } from "@/lib/server/process-queue-drops";

describe("buildQueuedDropsMap", () => {
    it("fetches queued drops in chunks and materializes only existing records", async () => {
        const getAllCalls: string[][] = [];
        const dataset = new Map([
            ["drop_1", { title: "Drop One", activationCount: 1 }],
            ["drop_2", { title: "Drop Two", activationCount: 2 }],
            ["drop_205", { title: "Drop 205", activationCount: 3 }],
        ]);

        const dropIds = [
            "drop_1",
            "drop_2",
            ...Array.from({ length: PROCESS_QUEUE_FETCH_CHUNK_SIZE }, (_, index) => `missing_${index}`),
            "drop_205",
        ];

        const dropsMap = await buildQueuedDropsMap({
            dropIds,
            createRef: (dropId) => ({ id: dropId }),
            getAll: async (...refs) => {
                getAllCalls.push(refs.map((ref) => ref.id));

                return refs.map((ref) => ({
                    id: ref.id,
                    exists: dataset.has(ref.id),
                    data: () => dataset.get(ref.id),
                }));
            },
            materialize: (doc) => {
                const data = doc.data();
                if (!data) {
                    return null;
                }

                return {
                    id: doc.id,
                    ...data,
                };
            },
        });

        expect(getAllCalls).toHaveLength(2);
        expect(Object.keys(dropsMap)).toEqual(["drop_1", "drop_2", "drop_205"]);
        expect(dropsMap.drop_1).toMatchObject({
            id: "drop_1",
            title: "Drop One",
            activationCount: 1,
        });
        expect(dropsMap.drop_205).toMatchObject({
            id: "drop_205",
            title: "Drop 205",
            activationCount: 3,
        });
    });

    it("fetches queue chunks concurrently instead of waiting for each chunk in sequence", async () => {
        let inFlight = 0;
        let maxInFlight = 0;
        const dropIds = Array.from({ length: PROCESS_QUEUE_FETCH_CHUNK_SIZE * 2 + 5 }, (_, index) => `drop_${index}`);

        await buildQueuedDropsMap({
            dropIds,
            createRef: (dropId) => ({ id: dropId }),
            getAll: async (...refs) => {
                inFlight += 1;
                maxInFlight = Math.max(maxInFlight, inFlight);
                await new Promise((resolve) => setTimeout(resolve, 10));
                inFlight -= 1;

                return refs.map((ref) => ({
                    id: ref.id,
                    exists: true,
                    data: () => ({ activationCount: 0 }),
                }));
            },
            materialize: (doc) => ({
                id: doc.id,
                ...doc.data(),
            }),
        });

        expect(maxInFlight).toBeGreaterThan(1);
    });
});
