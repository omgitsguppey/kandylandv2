export function getViewerAssetPrefetchConcurrency(isConstrained: boolean, isVerySlow: boolean) {
    if (isVerySlow) {
        return 1;
    }

    if (isConstrained) {
        return 2;
    }

    return 3;
}

export async function runConcurrentViewerPrefetch<T>(
    items: readonly T[],
    maxConcurrent: number,
    worker: (item: T, index: number) => Promise<void>,
) {
    if (items.length === 0) {
        return;
    }

    const normalizedConcurrency = Math.min(
        items.length,
        Math.max(1, Math.floor(maxConcurrent)),
    );
    let nextIndex = 0;

    await Promise.all(Array.from({ length: normalizedConcurrency }, async () => {
        while (true) {
            const currentIndex = nextIndex;
            nextIndex += 1;

            if (currentIndex >= items.length) {
                return;
            }

            await worker(items[currentIndex], currentIndex);
        }
    }));
}
