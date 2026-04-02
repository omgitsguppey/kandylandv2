type QueueDropRefLike = {
    id: string;
};

type QueueDropSnapshotLike<TData extends Record<string, unknown>> = {
    id: string;
    exists: boolean;
    data: () => TData | undefined;
};

export const PROCESS_QUEUE_FETCH_CHUNK_SIZE = 100;

export async function buildQueuedDropsMap<
    TRef extends QueueDropRefLike,
    TData extends Record<string, unknown>,
    TSnapshot extends QueueDropSnapshotLike<TData>,
    TResult extends { id: string },
>(input: {
    dropIds: string[];
    createRef: (dropId: string) => TRef;
    getAll: (...refs: TRef[]) => Promise<TSnapshot[]>;
    materialize: (doc: TSnapshot) => TResult | null;
    chunkSize?: number;
}) {
    const chunkSize = input.chunkSize ?? PROCESS_QUEUE_FETCH_CHUNK_SIZE;
    const dropsMap = Object.create(null) as Record<string, TResult>;
    const fetchTasks: Promise<void>[] = [];

    for (let start = 0; start < input.dropIds.length; start += chunkSize) {
        const refsChunk: TRef[] = [];
        const end = Math.min(start + chunkSize, input.dropIds.length);

        for (let index = start; index < end; index += 1) {
            refsChunk.push(input.createRef(input.dropIds[index]!));
        }

        fetchTasks.push((async () => {
            const docs = refsChunk.length > 0 ? await input.getAll(...refsChunk) : [];

            for (const doc of docs) {
                if (!doc.exists) {
                    continue;
                }

                const materialized = input.materialize(doc);
                if (!materialized) {
                    continue;
                }

                dropsMap[doc.id] = materialized;
            }
        })());
    }

    await Promise.all(fetchTasks);
    return dropsMap;
}
