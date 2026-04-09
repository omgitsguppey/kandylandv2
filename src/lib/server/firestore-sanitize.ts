import "server-only";

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeValue(value: unknown): unknown {
    if (typeof value === "undefined") {
        return undefined;
    }

    if (Array.isArray(value)) {
        return value
            .map((entry) => sanitizeValue(entry))
            .filter((entry) => typeof entry !== "undefined");
    }

    if (isPlainObject(value)) {
        return sanitizeFirestorePayload(value);
    }

    return value;
}

export function sanitizeFirestorePayload<T extends Record<string, unknown>>(value: T): T {
    return Object.entries(value).reduce<Record<string, unknown>>((accumulator, [key, entryValue]) => {
        const sanitizedValue = sanitizeValue(entryValue);
        if (typeof sanitizedValue !== "undefined") {
            accumulator[key] = sanitizedValue;
        }
        return accumulator;
    }, {}) as T;
}
