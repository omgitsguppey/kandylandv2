import "server-only";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
    /** Maximum number of requests allowed inside the window. */
    maxRequests: number;
    /** Size of the sliding window in milliseconds. */
    windowMs: number;
}

// ---------------------------------------------------------------------------
// Preset tiers (convenience re-exports for route files)
// ---------------------------------------------------------------------------

/** Financial / once-per-day actions – 5 req / 60 s */
export const STRICT: RateLimitConfig = { maxRequests: 5, windowMs: 60_000 };

/** Normal user actions – 20 req / 60 s */
export const STANDARD: RateLimitConfig = { maxRequests: 20, windowMs: 60_000 };

/** Read-heavy / analytics routes – 60 req / 60 s */
export const RELAXED: RateLimitConfig = { maxRequests: 60, windowMs: 60_000 };

/** Admin panel routes – 30 req / 60 s */
export const ADMIN: RateLimitConfig = { maxRequests: 30, windowMs: 60_000 };

// ---------------------------------------------------------------------------
// In-memory store  (key → sorted array of timestamps)
// ---------------------------------------------------------------------------

const store = new Map<string, number[]>();

/**
 * Periodic cleanup: drop keys whose newest timestamp is older than 5 minutes.
 * Runs at most once per 60 seconds to keep overhead negligible.
 */
let lastCleanup = 0;
const CLEANUP_INTERVAL_MS = 60_000;
const STALE_KEY_MS = 300_000; // 5 min

function maybeCleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = now;

    for (const [key, timestamps] of store) {
        if (timestamps.length === 0 || timestamps[timestamps.length - 1] < now - STALE_KEY_MS) {
            store.delete(key);
        }
    }
}

// ---------------------------------------------------------------------------
// Core check
// ---------------------------------------------------------------------------

/**
 * Custom error thrown when a request exceeds its rate limit.
 * Caught by `handleApiError` in auth.ts to return a proper 429 response.
 */
export class RateLimitError extends Error {
    status = 429;
    retryAfterMs: number;
    limit: number;
    remaining: number;

    constructor(retryAfterMs: number, limit: number) {
        super("Too many requests");
        this.name = "RateLimitError";
        this.retryAfterMs = retryAfterMs;
        this.limit = limit;
        this.remaining = 0;
    }
}

/**
 * Resolve a stable identifier for the caller.
 *
 * - Uses `x-forwarded-for` (first entry) when behind a proxy (Vercel, etc.).
 * - Falls back to the raw request IP via Next.js headers.
 * - Appends the route name so limits are per-endpoint.
 */
function resolveKey(request: NextRequest, routeName: string): string {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
    return `${ip}:${routeName}`;
}

/**
 * Call at the **very top** of every route handler, *before* `verifyAuth`.
 *
 * ```ts
 * export async function POST(request: NextRequest) {
 *   await checkRateLimit(request, "checkin", STRICT);
 *   const caller = await verifyAuth(request);
 *   // …
 * }
 * ```
 *
 * Throws `RateLimitError` (caught by `handleApiError`) if the limit is
 * exceeded. Otherwise returns silently.
 */
export function checkRateLimit(
    request: NextRequest,
    routeName: string,
    config: RateLimitConfig,
): void {
    maybeCleanup();

    const key = resolveKey(request, routeName);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let timestamps = store.get(key);
    if (!timestamps) {
        timestamps = [];
        store.set(key, timestamps);
    }

    // Evict timestamps outside the current window
    while (timestamps.length > 0 && timestamps[0] <= windowStart) {
        timestamps.shift();
    }

    if (timestamps.length >= config.maxRequests) {
        // Oldest remaining timestamp determines when the window slides enough
        const retryAfterMs = timestamps[0] - windowStart;
        throw new RateLimitError(retryAfterMs, config.maxRequests);
    }

    timestamps.push(now);
}

// ---------------------------------------------------------------------------
// Helper: build a 429 NextResponse from a RateLimitError
// ---------------------------------------------------------------------------

export function buildRateLimitResponse(err: RateLimitError): NextResponse {
    const retryAfterSec = Math.ceil(err.retryAfterMs / 1000);
    return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
            status: 429,
            headers: {
                "Retry-After": String(retryAfterSec),
                "X-RateLimit-Limit": String(err.limit),
                "X-RateLimit-Remaining": "0",
            },
        },
    );
}
