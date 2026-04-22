import "server-only";

type CacheEntry<T> = {
  expiresAtMs: number;
  value: T;
};

const routeCache = new Map<string, CacheEntry<unknown>>();
const inflightLoads = new Map<string, Promise<unknown>>();

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
