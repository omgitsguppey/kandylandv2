import "server-only";

type CacheEntry<T> = {
  expiresAtMs: number;
  value: T;
};

type StaleCacheEntry<T> = {
  freshUntilMs: number;
  staleUntilMs: number;
  storedAtMs: number;
  value: T;
};

export type StaleWhileRevalidateCacheStatus = "miss" | "fresh" | "stale";

export type StaleWhileRevalidateCacheResult<T> = {
  value: T;
  cacheStatus: StaleWhileRevalidateCacheStatus;
  cachedAtMs: number;
  cacheAgeMs: number;
  revalidating: boolean;
  validationIssues: string[];
  staleButVerified: boolean;
  retainedBeyondStaleTtl: boolean;
};

const routeCache = new Map<string, CacheEntry<unknown>>();
const inflightLoads = new Map<string, Promise<unknown>>();
const staleRouteCache = new Map<string, StaleCacheEntry<unknown>>();
const staleInflightLoads = new Map<string, Promise<unknown>>();

function readEntry<T>(key: string, nowMs: number) {
  const entry = routeCache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAtMs <= nowMs) {
    routeCache.delete(key);
    return null;
  }

  return entry as CacheEntry<T>;
}

export async function readThroughEphemeralRouteCache<T>(input: {
  key: string;
  ttlMs: number;
  loader: () => Promise<T>;
}) {
  if (
    process.env.VITEST
    || process.env.NODE_ENV === "test"
    || process.argv.some((value) => value.toLowerCase().includes("vitest"))
  ) {
    return input.loader();
  }

  const nowMs = Date.now();
  const cachedEntry = readEntry<T>(input.key, nowMs);
  if (cachedEntry) {
    return cachedEntry.value;
  }

  const inflight = inflightLoads.get(input.key) as Promise<T> | undefined;
  if (inflight) {
    return inflight;
  }

  const loadPromise = input.loader()
    .then((value) => {
      routeCache.set(input.key, {
        expiresAtMs: Date.now() + input.ttlMs,
        value,
      });
      inflightLoads.delete(input.key);
      return value;
    })
    .catch((error) => {
      inflightLoads.delete(input.key);
      throw error;
    });

  inflightLoads.set(input.key, loadPromise);
  return loadPromise;
}

function startStaleCacheRefresh<T>(
  input: {
    key: string;
    ttlMs: number;
    staleTtlMs: number;
    loader: () => Promise<T>;
    validate?: (value: T) => string[];
  },
) {
  const existingInflight = staleInflightLoads.get(input.key) as Promise<T> | undefined;
  if (existingInflight) {
    return existingInflight;
  }

  const loadPromise = input.loader()
    .then((value) => {
      const validationIssues = input.validate?.(value) ?? [];
      if (validationIssues.length > 0) {
        throw new Error(`Route cache loader returned invalid payload: ${validationIssues.join("; ")}`);
      }

      const storedAtMs = Date.now();
      staleRouteCache.set(input.key, {
        freshUntilMs: storedAtMs + input.ttlMs,
        staleUntilMs: storedAtMs + input.staleTtlMs,
        storedAtMs,
        value,
      });
      staleInflightLoads.delete(input.key);
      return value;
    })
    .catch((error) => {
      staleInflightLoads.delete(input.key);
      throw error;
    });

  staleInflightLoads.set(input.key, loadPromise);
  return loadPromise;
}

export async function readThroughStaleWhileRevalidateEphemeralRouteCache<T>(input: {
  key: string;
  ttlMs: number;
  staleTtlMs: number;
  loader: () => Promise<T>;
  validate?: (value: T) => string[];
}): Promise<StaleWhileRevalidateCacheResult<T>> {
  const nowMs = Date.now();
  const existing = staleRouteCache.get(input.key) as StaleCacheEntry<T> | undefined;
  const validationIssues = existing ? input.validate?.(existing.value) ?? [] : [];

  if (existing && validationIssues.length > 0) {
    staleRouteCache.delete(input.key);
  } else if (existing && existing.freshUntilMs > nowMs) {
    return {
      value: existing.value,
      cacheStatus: "fresh",
      cachedAtMs: existing.storedAtMs,
      cacheAgeMs: Math.max(0, nowMs - existing.storedAtMs),
      revalidating: false,
      validationIssues: [],
      staleButVerified: false,
      retainedBeyondStaleTtl: false,
    };
  } else if (existing) {
    const refreshPromise = startStaleCacheRefresh(input);
    refreshPromise.catch(() => undefined);
    return {
      value: existing.value,
      cacheStatus: "stale",
      cachedAtMs: existing.storedAtMs,
      cacheAgeMs: Math.max(0, nowMs - existing.storedAtMs),
      revalidating: true,
      validationIssues: [],
      staleButVerified: true,
      retainedBeyondStaleTtl: existing.staleUntilMs <= nowMs,
    };
  }

  const loaded = await startStaleCacheRefresh(input);
  const cachedEntry = staleRouteCache.get(input.key) as StaleCacheEntry<T> | undefined;
  return {
    value: loaded,
    cacheStatus: "miss",
    cachedAtMs: cachedEntry?.storedAtMs ?? Date.now(),
    cacheAgeMs: 0,
    revalidating: false,
    validationIssues,
    staleButVerified: false,
    retainedBeyondStaleTtl: false,
  };
}

export function clearEphemeralRouteCachesForTests() {
  routeCache.clear();
  inflightLoads.clear();
  staleRouteCache.clear();
  staleInflightLoads.clear();
}
