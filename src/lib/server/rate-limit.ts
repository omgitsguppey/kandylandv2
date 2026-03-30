import "server-only";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { getTrustedClientIp } from "./request-client-ip";

export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

export const STRICT: RateLimitConfig = { maxRequests: 5, windowMs: 60_000 };
export const STANDARD: RateLimitConfig = { maxRequests: 20, windowMs: 60_000 };
export const RELAXED: RateLimitConfig = { maxRequests: 60, windowMs: 60_000 };
export const ADMIN: RateLimitConfig = { maxRequests: 30, windowMs: 60_000 };
export const ADMIN_REALTIME: RateLimitConfig = { maxRequests: 180, windowMs: 60_000 };
export const ADMIN_ANALYTICS: RateLimitConfig = { maxRequests: 90, windowMs: 60_000 };
export const SENSITIVE_WRITE: RateLimitConfig = { maxRequests: 3, windowMs: 60_000 };
export const HEAVY_READ: RateLimitConfig = { maxRequests: 10, windowMs: 60_000 };
export const ANALYTICS_WRITE: RateLimitConfig = { maxRequests: 30, windowMs: 60_000 };
export const CRON: RateLimitConfig = { maxRequests: 6, windowMs: 60_000 };
export const MEDIA_PROXY: RateLimitConfig = { maxRequests: 15, windowMs: 60_000 };

const fallbackStore = new Map<string, number[]>();
const LOCAL_CLEANUP_INTERVAL_MS = 60_000;
const LOCAL_STALE_KEY_MS = 300_000;
let lastLocalCleanup = 0;

const REMOTE_COLLECTION = "rate_limits";
const REMOTE_CLEANUP_INTERVAL_MS = 300_000;
const REMOTE_EXPIRED_GRACE_MS = 60_000;
let lastRemoteCleanup = 0;
let remoteCleanupPromise: Promise<void> | null = null;

function maybeCleanupLocal() {
    const now = Date.now();
    if (now - lastLocalCleanup < LOCAL_CLEANUP_INTERVAL_MS) return;
    lastLocalCleanup = now;

    for (const [key, timestamps] of fallbackStore) {
        if (timestamps.length === 0 || timestamps[timestamps.length - 1] < now - LOCAL_STALE_KEY_MS) {
            fallbackStore.delete(key);
        }
    }
}

async function maybeCleanupRemote() {
    const now = Date.now();
    if (!adminDb || now - lastRemoteCleanup < REMOTE_CLEANUP_INTERVAL_MS) {
        return;
    }

    if (remoteCleanupPromise) {
        return remoteCleanupPromise;
    }

    lastRemoteCleanup = now;
    remoteCleanupPromise = (async () => {
        try {
            const snapshot = await adminDb
                .collection(REMOTE_COLLECTION)
                .where("expiresAt", "<", now - REMOTE_EXPIRED_GRACE_MS)
                .limit(100)
                .get();

            if (snapshot.empty) {
                return;
            }

            const batch = adminDb.batch();
            snapshot.docs.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
        } catch (error) {
            console.warn("Remote rate-limit cleanup failed:", error);
        } finally {
            remoteCleanupPromise = null;
        }
    })();

    await remoteCleanupPromise;
}

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

interface RateLimitOptions {
    scopeId?: string | null;
}

function resolveCallerIdentifier(request: NextRequest, options?: RateLimitOptions): string {
    const ip = getTrustedClientIp(request);
    const userAgent = request.headers.get("user-agent")?.trim() || "unknown";
    const scopeId = options?.scopeId?.trim();
    return scopeId ? `${scopeId}:${ip}:${userAgent}` : `${ip}:${userAgent}`;
}

function buildDocumentId(routeName: string, identifier: string, bucketStartMs: number) {
    return createHash("sha256")
        .update(`${routeName}:${identifier}:${bucketStartMs}`)
        .digest("hex");
}

function checkRateLimitLocally(
    request: NextRequest,
    routeName: string,
    config: RateLimitConfig,
    options?: RateLimitOptions,
): void {
    maybeCleanupLocal();

    const identifier = resolveCallerIdentifier(request, options);
    const key = `${routeName}:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let timestamps = fallbackStore.get(key);
    if (!timestamps) {
        timestamps = [];
        fallbackStore.set(key, timestamps);
    }

    while (timestamps.length > 0 && timestamps[0] <= windowStart) {
        timestamps.shift();
    }

    if (timestamps.length >= config.maxRequests) {
        const retryAfterMs = timestamps[0] - windowStart;
        throw new RateLimitError(retryAfterMs, config.maxRequests);
    }

    timestamps.push(now);
}

export async function checkRateLimit(
    request: NextRequest,
    routeName: string,
    config: RateLimitConfig,
    options?: RateLimitOptions,
): Promise<void> {
    if (!adminDb) {
        checkRateLimitLocally(request, routeName, config, options);
        return;
    }

    const now = Date.now();
    const bucketStartMs = Math.floor(now / config.windowMs) * config.windowMs;
    const retryAfterMs = bucketStartMs + config.windowMs - now;
    const identifier = resolveCallerIdentifier(request, options);
    const docId = buildDocumentId(routeName, identifier, bucketStartMs);
    const docRef = adminDb.collection(REMOTE_COLLECTION).doc(docId);

    try {
        await maybeCleanupRemote();
        await adminDb.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(docRef);
            const currentCount = snapshot.exists ? Number(snapshot.data()?.count || 0) : 0;

            if (currentCount >= config.maxRequests) {
                throw new RateLimitError(retryAfterMs, config.maxRequests);
            }

            transaction.set(docRef, {
                count: currentCount + 1,
                routeName,
                bucketStartMs,
                windowMs: config.windowMs,
                expiresAt: bucketStartMs + (config.windowMs * 3),
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
        });
    } catch (error) {
        if (error instanceof RateLimitError) {
            throw error;
        }

        console.warn("Remote rate-limit check failed. Falling back to local limiter:", error);
        checkRateLimitLocally(request, routeName, config, options);
    }
}

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
