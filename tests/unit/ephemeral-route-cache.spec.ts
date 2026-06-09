import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearEphemeralRouteCachesForTests,
  readThroughStaleWhileRevalidateEphemeralRouteCache,
} from "@/lib/server/ephemeral-route-cache";

type CachePayload = {
  success: true;
  generatedAtMs: number;
  data: unknown[];
};

describe("readThroughStaleWhileRevalidateEphemeralRouteCache", () => {
  beforeEach(() => {
    clearEphemeralRouteCachesForTests();
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
  });

  afterEach(() => {
    clearEphemeralRouteCachesForTests();
    vi.useRealTimers();
  });

  it("serves validated fresh backend cache without rerunning the loader", async () => {
    const loader = vi.fn<() => Promise<CachePayload>>()
      .mockResolvedValue({ success: true, generatedAtMs: 1_000, data: [] });

    const first = await readThroughStaleWhileRevalidateEphemeralRouteCache({
      key: "admin:test:fresh",
      ttlMs: 1_000,
      staleTtlMs: 10_000,
      loader,
      validate: () => [],
    });
    const second = await readThroughStaleWhileRevalidateEphemeralRouteCache({
      key: "admin:test:fresh",
      ttlMs: 1_000,
      staleTtlMs: 10_000,
      loader,
      validate: () => [],
    });

    expect(first.cacheStatus).toBe("miss");
    expect(first.cacheFreshnessState).toBe("fresh_cache");
    expect(first.truthHealthState).toBe("verified_cache");
    expect(second.cacheStatus).toBe("fresh");
    expect(second.cacheFreshnessState).toBe("fresh_cache");
    expect(second.truthHealthState).toBe("verified_cache");
    expect(second.value.generatedAtMs).toBe(1_000);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("serves stale validated cache immediately while starting an async refresh", async () => {
    const loader = vi.fn<() => Promise<CachePayload>>()
      .mockResolvedValueOnce({ success: true, generatedAtMs: 1_000, data: [] })
      .mockResolvedValueOnce({ success: true, generatedAtMs: 2_500, data: [] });

    await readThroughStaleWhileRevalidateEphemeralRouteCache({
      key: "admin:test:stale",
      ttlMs: 100,
      staleTtlMs: 10_000,
      loader,
      validate: () => [],
    });

    vi.setSystemTime(1_250);
    const stale = await readThroughStaleWhileRevalidateEphemeralRouteCache({
      key: "admin:test:stale",
      ttlMs: 100,
      staleTtlMs: 10_000,
      loader,
      validate: () => [],
    });

    expect(stale.cacheStatus).toBe("stale");
    expect(stale.cacheFreshnessState).toBe("refresh_due_cache");
    expect(stale.truthHealthState).toBe("verified_cache");
    expect(stale.value.generatedAtMs).toBe(1_000);
    expect(stale.revalidating).toBe(true);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid cached payloads and reloads synchronously", async () => {
    const loader = vi.fn<() => Promise<CachePayload>>()
      .mockResolvedValueOnce({ success: true, generatedAtMs: 1_000, data: [] })
      .mockResolvedValueOnce({ success: true, generatedAtMs: 2_000, data: [] });

    await readThroughStaleWhileRevalidateEphemeralRouteCache({
      key: "admin:test:invalid",
      ttlMs: 1_000,
      staleTtlMs: 10_000,
      loader,
      validate: () => [],
    });

    let validationCalls = 0;
    const reloaded = await readThroughStaleWhileRevalidateEphemeralRouteCache({
      key: "admin:test:invalid",
      ttlMs: 1_000,
      staleTtlMs: 10_000,
      loader,
      validate: () => validationCalls++ === 0 ? ["missing generatedAtMs"] : [],
    });

    expect(reloaded.cacheStatus).toBe("miss");
    expect(reloaded.cacheFreshnessState).toBe("fresh_cache");
    expect(reloaded.truthHealthState).toBe("verified_cache");
    expect(reloaded.validationIssues).toEqual(["missing generatedAtMs"]);
    expect(reloaded.value.generatedAtMs).toBe(2_000);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("keeps stale verified route payload displayable beyond stale ttl while refreshing", async () => {
    const loader = vi.fn<() => Promise<CachePayload>>()
      .mockResolvedValueOnce({ success: true, generatedAtMs: 1_000, data: [] })
      .mockResolvedValueOnce({ success: true, generatedAtMs: 20_000, data: [] });

    await readThroughStaleWhileRevalidateEphemeralRouteCache({
      key: "admin:test:expired-but-verified",
      ttlMs: 100,
      staleTtlMs: 200,
      loader,
      validate: () => [],
    });

    vi.setSystemTime(10_000);
    const retained = await readThroughStaleWhileRevalidateEphemeralRouteCache({
      key: "admin:test:expired-but-verified",
      ttlMs: 100,
      staleTtlMs: 200,
      loader,
      validate: () => [],
    });

    expect(retained.cacheStatus).toBe("stale");
    expect(retained.cacheFreshnessState).toBe("expired_cache");
    expect(retained.truthHealthState).toBe("runtime_unverified");
    expect(retained.value.generatedAtMs).toBe(1_000);
    expect(retained.staleButVerified).toBe(true);
    expect(retained.retainedBeyondStaleTtl).toBe(true);
    expect(retained.revalidating).toBe(true);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("keeps stale verified route payload visible when background refresh fails", async () => {
    const loader = vi.fn<() => Promise<CachePayload>>()
      .mockResolvedValueOnce({ success: true, generatedAtMs: 1_000, data: ["verified"] })
      .mockRejectedValueOnce(new Error("backend unavailable"));

    await readThroughStaleWhileRevalidateEphemeralRouteCache({
      key: "admin:test:refresh-failed",
      ttlMs: 100,
      staleTtlMs: 200,
      loader,
      validate: () => [],
    });

    vi.setSystemTime(10_000);
    const retained = await readThroughStaleWhileRevalidateEphemeralRouteCache({
      key: "admin:test:refresh-failed",
      ttlMs: 100,
      staleTtlMs: 200,
      loader,
      validate: () => [],
    });
    await Promise.resolve();

    expect(retained.cacheStatus).toBe("stale");
    expect(retained.cacheFreshnessState).toBe("expired_cache");
    expect(retained.truthHealthState).toBe("runtime_unverified");
    expect(retained.value.data).toEqual(["verified"]);
    expect(retained.revalidating).toBe(true);
    expect(retained.staleButVerified).toBe(true);
    expect(retained.retainedBeyondStaleTtl).toBe(true);
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
