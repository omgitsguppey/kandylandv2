export function generateSecureClientId(): string {
    if (typeof crypto !== "undefined") {
        if (typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }

        if (typeof crypto.getRandomValues === "function") {
            const buffer = new Uint8Array(16);
            crypto.getRandomValues(buffer);
            return Array.from(buffer)
                .map((byte) => byte.toString(16).padStart(2, "0"))
                .join("");
        }
    }

    throw new Error("Cryptographically secure random number generation is not available in this environment.");
}

export function generateSecureClientToken(length = 8): string {
    if (!Number.isInteger(length) || length <= 0) {
        throw new Error("Secure client token length must be a positive integer.");
    }

    return generateSecureClientId().replace(/-/g, "").slice(0, length);
}

export type PendingClientIdempotencyKey = {
    fingerprint: string;
    key: string;
};

export type DurableClientIdempotencyScope = {
    userId: string;
    targetId: string;
    action: string;
};

export type DurablePendingClientIdempotencyKey = PendingClientIdempotencyKey & {
    storageKey: string | null;
};

const DURABLE_IDEMPOTENCY_STORAGE_PREFIX = "kandydrops.pending-idempotency.v1";
const MAX_IDEMPOTENCY_SCOPE_PART_LENGTH = 256;
const MAX_IDEMPOTENCY_FINGERPRINT_LENGTH = 32_768;
const MAX_IDEMPOTENCY_KEY_LENGTH = 180;
const MAX_STORED_IDEMPOTENCY_RECORD_LENGTH = 768;
const SHA_256_HEX_PATTERN = /^[a-f0-9]{64}$/u;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9:._-]+$/u;

type StoredDurableClientIdempotencyKey = {
    v: 1;
    h: string;
    k: string;
};

type DurableClientIdempotencyResolution = {
    pending: DurablePendingClientIdempotencyKey;
    key: string;
    reused: boolean;
    persistence: "session" | "memory";
};

const durableClientIdempotencyResolutionsInFlight = new Map<
    string,
    Promise<DurableClientIdempotencyResolution>
>();

function buildTransientClientIdempotencyResolutionKey(value: string) {
    let left = 2_166_136_261;
    let right = 3_339_675_911;
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        left = Math.imul(left ^ code, 16_777_619);
        right = Math.imul(right ^ code, 2_246_822_519);
    }
    return `${value.length}:${(left >>> 0).toString(16)}:${(right >>> 0).toString(16)}`;
}

function readBoundedScopePart(value: string, label: string) {
    const normalized = value.trim();
    if (!normalized || normalized.length > MAX_IDEMPOTENCY_SCOPE_PART_LENGTH) {
        throw new Error(`Client idempotency ${label} must be between 1 and ${MAX_IDEMPOTENCY_SCOPE_PART_LENGTH} characters.`);
    }
    return normalized;
}

function readSessionStorage(): Storage | null {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        return window.sessionStorage;
    } catch {
        return null;
    }
}

async function hashClientIdempotencyValue(value: string) {
    if (typeof crypto === "undefined" || typeof crypto.subtle?.digest !== "function") {
        throw new Error("Cryptographic hashing is not available in this environment.");
    }

    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

function isStoredDurableClientIdempotencyKey(value: unknown): value is StoredDurableClientIdempotencyKey {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }

    const record = value as Record<string, unknown>;
    return record.v === 1
        && typeof record.h === "string"
        && SHA_256_HEX_PATTERN.test(record.h)
        && typeof record.k === "string"
        && record.k.length > 0
        && record.k.length <= MAX_IDEMPOTENCY_KEY_LENGTH
        && IDEMPOTENCY_KEY_PATTERN.test(record.k);
}

function readStoredDurableClientIdempotencyKey(storage: Storage, storageKey: string) {
    try {
        const serialized = storage.getItem(storageKey);
        if (!serialized) {
            return null;
        }
        if (serialized.length > MAX_STORED_IDEMPOTENCY_RECORD_LENGTH) {
            storage.removeItem(storageKey);
            return null;
        }

        const parsed: unknown = JSON.parse(serialized);
        if (!isStoredDurableClientIdempotencyKey(parsed)) {
            storage.removeItem(storageKey);
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

function writeStoredDurableClientIdempotencyKey(
    storage: Storage,
    storageKey: string,
    pending: PendingClientIdempotencyKey,
) {
    try {
        storage.setItem(storageKey, JSON.stringify({
            v: 1,
            h: pending.fingerprint,
            k: pending.key,
        } satisfies StoredDurableClientIdempotencyKey));
        return true;
    } catch {
        return false;
    }
}

type ClientRejectionDetail = {
    errorCode?: unknown;
    code?: unknown;
    preserveIdempotencyKey?: unknown;
    retryable?: unknown;
};

const TRANSIENT_CLIENT_REJECTION_STATUSES = new Set([408, 425, 429, 499]);
const TRANSIENT_CLIENT_REJECTION_CODES = new Set([
    "duplicate_processing",
    "attachment_complete_conflict",
    "attachment_complete_in_progress",
    "attachment_cancel_requested",
    "attachment_cancel_in_progress",
    "attachment_operation_in_progress",
]);
const DEFINITIVE_CONFLICT_CODES = new Set([
    "attachment_canceled",
    "idempotency_conflict",
]);

export function isDefinitiveClientRejectionStatus(
    status: number | null | undefined,
    detail?: ClientRejectionDetail | null,
) {
    if (
        typeof status !== "number"
        || !Number.isInteger(status)
        || status < 400
        || status >= 500
        || TRANSIENT_CLIENT_REJECTION_STATUSES.has(status)
        || detail?.preserveIdempotencyKey === true
        || detail?.retryable === true
    ) {
        return false;
    }

    const problemCode = typeof detail?.errorCode === "string"
        ? detail.errorCode
        : typeof detail?.code === "string"
            ? detail.code
            : "";
    if (TRANSIENT_CLIENT_REJECTION_CODES.has(problemCode)) {
        return false;
    }

    if (status === 409) {
        return detail?.retryable === false || DEFINITIVE_CONFLICT_CODES.has(problemCode);
    }

    return true;
}

export function resolvePendingClientIdempotencyKey(input: {
    pending: PendingClientIdempotencyKey | null | undefined;
    fingerprint: string;
    createKey: () => string;
}) {
    if (!input.fingerprint) {
        throw new Error("Client idempotency fingerprints must not be empty.");
    }

    if (input.pending?.fingerprint === input.fingerprint) {
        return {
            pending: input.pending,
            key: input.pending.key,
            reused: true,
        } as const;
    }

    const key = input.createKey().trim();
    if (!key) {
        throw new Error("Client idempotency keys must not be empty.");
    }

    const pending: PendingClientIdempotencyKey = {
        fingerprint: input.fingerprint,
        key,
    };
    return {
        pending,
        key,
        reused: false,
    } as const;
}

export async function resolveDurableClientIdempotencyKey(input: {
    pending: DurablePendingClientIdempotencyKey | null | undefined;
    scope: DurableClientIdempotencyScope;
    payloadFingerprint: string;
    createKey: () => string;
}) {
    if (!input.payloadFingerprint || input.payloadFingerprint.length > MAX_IDEMPOTENCY_FINGERPRINT_LENGTH) {
        throw new Error(`Client idempotency payload fingerprints must be between 1 and ${MAX_IDEMPOTENCY_FINGERPRINT_LENGTH} characters.`);
    }

    const scope = {
        userId: readBoundedScopePart(input.scope.userId, "user id"),
        targetId: readBoundedScopePart(input.scope.targetId, "target id"),
        action: readBoundedScopePart(input.scope.action, "action"),
    };
    const resolutionKey = buildTransientClientIdempotencyResolutionKey(JSON.stringify([
        scope.userId,
        scope.targetId,
        scope.action,
        input.payloadFingerprint,
    ]));
    const existingResolution = durableClientIdempotencyResolutionsInFlight.get(resolutionKey);
    if (existingResolution) {
        return existingResolution;
    }

    const resolution = (async (): Promise<DurableClientIdempotencyResolution> => {
        const [scopeHash, fingerprintHash] = await Promise.all([
            hashClientIdempotencyValue(JSON.stringify([scope.userId, scope.targetId, scope.action])),
            hashClientIdempotencyValue(input.payloadFingerprint),
        ]);
        const storageKey = `${DURABLE_IDEMPOTENCY_STORAGE_PREFIX}.${scopeHash}`;
        const storage = readSessionStorage();
        const stored = storage ? readStoredDurableClientIdempotencyKey(storage, storageKey) : null;
        const storedPending = stored?.h === fingerprintHash
            ? { fingerprint: stored.h, key: stored.k }
            : null;
        const memoryPending = input.pending?.fingerprint === fingerprintHash
            ? input.pending
            : null;
        const resolved = resolvePendingClientIdempotencyKey({
            pending: storedPending ?? memoryPending,
            fingerprint: fingerprintHash,
            createKey: input.createKey,
        });
        if (resolved.key.length > MAX_IDEMPOTENCY_KEY_LENGTH || !IDEMPOTENCY_KEY_PATTERN.test(resolved.key)) {
            throw new Error("Client idempotency keys must use only letters, numbers, colon, period, underscore, or hyphen and stay within 180 characters.");
        }
        const persisted = storage
            ? writeStoredDurableClientIdempotencyKey(storage, storageKey, resolved.pending)
            : false;
        const pending: DurablePendingClientIdempotencyKey = {
            ...resolved.pending,
            storageKey: persisted || storedPending ? storageKey : null,
        };

        return {
            pending,
            key: pending.key,
            reused: resolved.reused,
            persistence: pending.storageKey ? "session" : "memory",
        };
    })();
    durableClientIdempotencyResolutionsInFlight.set(resolutionKey, resolution);

    try {
        return await resolution;
    } finally {
        if (durableClientIdempotencyResolutionsInFlight.get(resolutionKey) === resolution) {
            durableClientIdempotencyResolutionsInFlight.delete(resolutionKey);
        }
    }
}

export function clearDurableClientIdempotencyKey(
    pending: DurablePendingClientIdempotencyKey | null | undefined,
) {
    if (!pending?.storageKey) {
        return;
    }

    const storage = readSessionStorage();
    if (!storage) {
        return;
    }

    const stored = readStoredDurableClientIdempotencyKey(storage, pending.storageKey);
    if (stored?.h !== pending.fingerprint || stored.k !== pending.key) {
        return;
    }

    try {
        storage.removeItem(pending.storageKey);
    } catch {
        // The in-memory owner still clears its handle when storage becomes unavailable.
    }
}
