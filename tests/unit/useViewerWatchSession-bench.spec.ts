import { describe, it, expect, vi } from "vitest";

const LATENCY_MS = 50;
const NUM_ENTRIES = 10;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const mockAuthFetch = vi.fn(async (url: string, init?: RequestInit) => {
    await delay(LATENCY_MS);
    return {
        ok: true,
        status: 200,
        json: async () => ({})
    } as Response;
});

const mockClearPendingWatchSession = vi.fn();
const mockRecordClientDiagnostic = vi.fn();

interface PendingEntry {
    payload: {
        watchSessionId: string;
        dropId: string;
    };
    storedAt: number;
}

const pendingEntries: PendingEntry[] = Array.from({ length: NUM_ENTRIES }, (_, i) => ({
    payload: {
        watchSessionId: `session-${i}`,
        dropId: `drop-${i}`,
    },
    storedAt: Date.now() + i,
}));

async function sequentialReplay(entries: PendingEntry[]) {
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
            const detail = await response.json().catch(() => null) as { error?: string } | null;
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

async function parallelReplay(entries: PendingEntry[]) {
    await Promise.allSettled(entries.map(async (entry) => {
        try {
            const response = await mockAuthFetch("/api/viewer/watch-session", {
                method: "POST",
                body: JSON.stringify(entry.payload),
            });
            if (response.ok) {
                mockClearPendingWatchSession(entry.payload.watchSessionId);
                return;
            }
            if (response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404) {
                mockClearPendingWatchSession(entry.payload.watchSessionId);
                return;
            }
            const detail = await response.json().catch(() => null) as { error?: string } | null;
            throw new Error(detail?.error || `Replay failed (${response.status})`);
        } catch (error) {
            mockRecordClientDiagnostic("telemetry", "Viewer watch session replay failed", {
                watchSessionId: entry.payload.watchSessionId,
                dropId: entry.payload.dropId,
                message: error instanceof Error ? error.message : String(error),
            }, "warn");
        }
    }));
}

describe("Replay Optimization Benchmark", () => {
    it("measures sequential replay performance", async () => {
        const start = performance.now();
        await sequentialReplay(pendingEntries);
        const end = performance.now();
        console.log(`Sequential Replay: ${(end - start).toFixed(2)}ms`);
        expect(mockAuthFetch).toHaveBeenCalledTimes(NUM_ENTRIES);
    });

    it("measures parallel replay performance", async () => {
        mockAuthFetch.mockClear();
        const start = performance.now();
        await parallelReplay(pendingEntries);
        const end = performance.now();
        console.log(`Parallel Replay: ${(end - start).toFixed(2)}ms`);
        expect(mockAuthFetch).toHaveBeenCalledTimes(NUM_ENTRIES);
    });
});
