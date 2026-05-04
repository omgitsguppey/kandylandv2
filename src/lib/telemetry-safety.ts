export type TelemetryScalar = string | number | boolean;
export type SanitizedTelemetryParams = Record<string, TelemetryScalar>;

type TelemetrySanitizerTarget = "backend" | "ga4";

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_PATTERN = /(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)(?!\w)/;
const GA_RESERVED_PREFIXES = ["firebase_", "google_", "ga_"] as const;
const PRIORITY_KEYS = [
    "page_path",
    "session_id",
    "event_timestamp_ms",
    "auth_state",
    "event_category",
    "event_modules",
    "tracking_origin",
    "tracking_sources",
    "event_schema_version",
    "task_discriminator",
    "event_index_version",
    "analytics_surface",
    "analytics_scope",
    "analytics_scope_label",
    "analytics_context",
    "analytics_page_group",
    "analytics_kind",
    "drop_id",
    "drop_title",
    "drop_category",
    "file_id",
    "watch_session_id",
    "viewer_session_id",
    "media_index",
    "media_type",
    "valid_watch_ms",
    "visible_ms",
    "active_ms",
    "playing_ms",
    "hidden_ms",
    "idle_ms",
    "score",
    "tier",
    "reason_codes",
    "visibility_state",
    "document_visibility_state",
    "idle_state",
    "actor_user_id",
    "actor_creator_id",
    "actor_admin_id",
    "target_user_id",
    "target_creator_id",
    "creator_id",
    "creator_username",
    "destination",
    "source",
    "component_name",
    "signup_intent",
    "duration_ms",
] as const;

function clampString(value: string, maxLength: number) {
    if (value.length <= maxLength) {
        return value;
    }

    return value.slice(0, maxLength);
}

function stripQueryAndHash(value: string) {
    const queryIndex = value.indexOf("?");
    const hashIndex = value.indexOf("#");
    const sliceIndex = [queryIndex, hashIndex]
        .filter((index) => index >= 0)
        .sort((left, right) => left - right)[0];

    return typeof sliceIndex === "number" ? value.slice(0, sliceIndex) : value;
}

function sanitizePossibleUrl(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
        return trimmed;
    }

    if (/^mailto:/i.test(trimmed)) {
        return "mailto";
    }

    if (/^tel:/i.test(trimmed)) {
        return "tel";
    }

    if (trimmed.startsWith("/")) {
        return stripQueryAndHash(trimmed);
    }

    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const url = new URL(trimmed);
            return `${url.origin}${url.pathname}`;
        } catch {
            return stripQueryAndHash(trimmed);
        }
    }

    return trimmed;
}

function sanitizeTelemetryKey(rawKey: string, target: TelemetrySanitizerTarget) {
    const trimmed = rawKey.trim();
    if (!trimmed) {
        return null;
    }

    if (target === "backend") {
        return clampString(trimmed.replace(/\s+/g, "_"), 60);
    }

    let sanitized = trimmed.replace(/[^A-Za-z0-9_]+/g, "_");
    sanitized = sanitized.replace(/_+/g, "_");

    if (!sanitized) {
        return null;
    }

    if (!/^[A-Za-z]/.test(sanitized)) {
        sanitized = `k_${sanitized}`;
    }

    if (GA_RESERVED_PREFIXES.some((prefix) => sanitized.startsWith(prefix))) {
        sanitized = `app_${sanitized}`;
    }

    return clampString(sanitized, 40);
}

function sanitizeStringValue(
    rawValue: string,
    key: string,
    target: TelemetrySanitizerTarget,
) {
    const normalizedValue = sanitizePossibleUrl(rawValue);
    const lowerKey = key.toLowerCase();

    if (
        lowerKey.includes("content_url")
        || lowerKey.includes("contenturl")
        || lowerKey.includes("asset_url")
        || lowerKey.includes("asseturl")
        || lowerKey.includes("media_url")
        || lowerKey.includes("mediaurl")
    ) {
        return "[redacted_sensitive_url]";
    }

    if (
        lowerKey.includes("raw_prompt")
        || lowerKey.includes("prompt_body")
        || lowerKey.includes("prompt_text")
        || lowerKey.includes("message_body")
        || lowerKey.includes("message_text")
    ) {
        return "[redacted_sensitive_text]";
    }

    if (lowerKey.includes("email") || EMAIL_PATTERN.test(normalizedValue)) {
        return "[redacted_email]";
    }

    if (lowerKey.includes("phone") || lowerKey.includes("tel") || PHONE_PATTERN.test(normalizedValue)) {
        return "[redacted_phone]";
    }

    return clampString(normalizedValue, target === "ga4" ? 100 : 250);
}

function sanitizeTelemetryValue(
    value: unknown,
    key: string,
    target: TelemetrySanitizerTarget,
): TelemetryScalar | undefined {
    if (typeof value === "string") {
        return sanitizeStringValue(value, key, target);
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : undefined;
    }

    if (typeof value === "boolean") {
        return value;
    }

    if (value === null || typeof value === "undefined") {
        return undefined;
    }

    if (target === "ga4") {
        return undefined;
    }

    try {
        return sanitizeStringValue(JSON.stringify(value), key, target);
    } catch {
        return undefined;
    }
}

function prioritizeTelemetryEntries(entries: Array<[string, unknown]>) {
    return entries
        .map(([key, value], index) => ({
            key,
            value,
            index,
            priority: PRIORITY_KEYS.indexOf(key as typeof PRIORITY_KEYS[number]),
        }))
        .sort((left, right) => {
            const leftPriority = left.priority === -1 ? Number.MAX_SAFE_INTEGER : left.priority;
            const rightPriority = right.priority === -1 ? Number.MAX_SAFE_INTEGER : right.priority;

            if (leftPriority !== rightPriority) {
                return leftPriority - rightPriority;
            }

            return left.index - right.index;
        });
}

function sanitizeTelemetryParams(
    eventParams: Record<string, unknown> | undefined,
    target: TelemetrySanitizerTarget,
    maxEntries: number,
) {
    if (!eventParams) {
        return undefined;
    }

    const prioritizedEntries = prioritizeTelemetryEntries(Object.entries(eventParams));
    const sanitized: SanitizedTelemetryParams = {};

    for (const entry of prioritizedEntries) {
        if (Object.keys(sanitized).length >= maxEntries) {
            break;
        }

        const sanitizedKey = sanitizeTelemetryKey(entry.key, target);
        if (!sanitizedKey || sanitizedKey in sanitized) {
            continue;
        }

        const sanitizedValue = sanitizeTelemetryValue(entry.value, sanitizedKey, target);
        if (typeof sanitizedValue === "undefined") {
            continue;
        }

        sanitized[sanitizedKey] = sanitizedValue;
    }

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export function sanitizeTelemetryParamsForBackend(eventParams?: Record<string, unknown>): SanitizedTelemetryParams {
    const rawSanitized = sanitizeTelemetryParams(eventParams, "backend", 20);
    
    // Explicitly enforce schema versioning per observability hardening directives
    if (!rawSanitized) {
        return { event_schema_version: "v2" };
    }
    
    return {
        ...rawSanitized,
        event_schema_version: rawSanitized.event_schema_version ?? "v2",
    };
}

export function sanitizeTelemetryParamsForGa4(eventParams?: Record<string, unknown>) {
    return sanitizeTelemetryParams(eventParams, "ga4", 25);
}
