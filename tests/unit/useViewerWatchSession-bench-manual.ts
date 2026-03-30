const LATENCY_MS = 50;
const NUM_ENTRIES = 12;

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function mockAuthFetch(url, init) {
    await delay(LATENCY_MS);
    return {
        ok: true,
        status: 200,
        json: async () => ({})
    };
}

const mockClearPendingWatchSession = (id) => {};
const mockRecordClientDiagnostic = (type, message, context, level) => {};

const pendingEntries = Array.from({ length: NUM_ENTRIES }, (_, i) => ({
    payload: {
        watchSessionId: `session-${i}`,
        dropId: `drop-${i}`,
    },
    storedAt: Date.now() + i,
}));

async function sequentialReplay(entries) {
    for (const entry of entries) {
        try {
            const response = await mockAuthFetch("/api/viewer/watch-session", {
                method: "POST",
                body: JSON.stringify(entry.payload),
            });
            if (response.ok) {
                mockClearPendingWatchSession(entry.payload.watchSessionId);
                continue;
            }
            if (response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404) {
                mockClearPendingWatchSession(entry.payload.watchSessionId);
                continue;
            }
            const detail = await response.json().catch(() => null);
            throw new Error(detail?.error || `Replay failed (${response.status})`);
        } catch (error) {
            mockRecordClientDiagnostic("telemetry", "Viewer watch session replay failed", {
                watchSessionId: entry.payload.watchSessionId,
                dropId: entry.payload.dropId,
                message: error instanceof Error ? error.message : String(error),
            }, "warn");
        }
    }
}

async function parallelReplay(entries) {
    const results = await Promise.allSettled(entries.map(async (entry) => {
        try {
            const response = await mockAuthFetch("/api/viewer/watch-session", {
                method: "POST",
                body: JSON.stringify(entry.payload),
            });
            if (response.ok || response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404) {
                return { success: true, watchSessionId: entry.payload.watchSessionId };
            }
            const detail = await response.json().catch(() => null);
            throw new Error(detail?.error || `Replay failed (${response.status})`);
        } catch (error) {
            mockRecordClientDiagnostic("telemetry", "Viewer watch session replay failed", {
                watchSessionId: entry.payload.watchSessionId,
                dropId: entry.payload.dropId,
                message: error instanceof Error ? error.message : String(error),
            }, "warn");
            return { success: false };
        }
    }));

    const successfulIds = results
        .filter(r => r.status === 'fulfilled' && r.value.success)
        .map(r => r.value.watchSessionId);

    if (successfulIds.length > 0) {
        // Mocking the batch clear
        successfulIds.forEach(id => mockClearPendingWatchSession(id));
    }
}

async function runBenchmark() {
    console.log(`--- Running Benchmark (N=${NUM_ENTRIES}, Latency=${LATENCY_MS}ms) ---`);

    const startSeq = performance.now();
    await sequentialReplay(pendingEntries);
    const endSeq = performance.now();
    const seqTime = endSeq - startSeq;
    console.log(`Sequential Replay: ${seqTime.toFixed(2)}ms`);

    const startPar = performance.now();
    await parallelReplay(pendingEntries);
    const endPar = performance.now();
    const parTime = endPar - startPar;
    console.log(`Parallel Replay:   ${parTime.toFixed(2)}ms`);

    const speedup = (seqTime / parTime).toFixed(2);
    console.log(`Speedup:           ${speedup}x`);
}

runBenchmark();
