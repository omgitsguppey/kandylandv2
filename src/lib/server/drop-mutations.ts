import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

import { resolveDropStatusFromTiming } from "@/lib/drop-status";
import { touchDropsRuntime } from "@/lib/server/drop-runtime";
import type { Drop } from "@/types/db";

type DropMutationFields = readonly string[];

type DropPublishValidationOptions = {
    existingDrop?: Drop | null;
    requireCreator?: boolean;
    creatorIdOverride?: string | null;
};

type DropPublishValidationResult = {
    ok: boolean;
    errors: string[];
};

const DROP_ACTION_URL_BASE = "https://kandydrops.invalid";
const DROP_PUBLISH_FIELDS = [
    "title",
    "description",
    "imageUrl",
    "contentUrl",
    "contentUrls",
    "unlockCost",
    "validFrom",
    "validUntil",
    "type",
    "actionUrl",
    "creatorId",
    "requiresActiveSubscription",
] as const;

export const ADMIN_DROP_REVALIDATION_PATHS = ["/drops", "/", "/dashboard"] as const;
export const CREATOR_DROP_REVALIDATION_PATHS = ["/drops", "/dashboard", "/creators"] as const;

export function sanitizeDropData(raw: Record<string, unknown>, allowedFields: DropMutationFields) {
    const sanitized: Record<string, unknown> = {};
    for (const key of allowedFields) {
        if (raw[key] !== undefined) {
            sanitized[key] = raw[key] === null ? FieldValue.delete() : raw[key];
        }
    }

    return sanitized;
}

function hasOwn(source: Record<string, unknown>, key: string) {
    return Object.prototype.hasOwnProperty.call(source, key);
}

function getMergedString(source: Record<string, unknown>, existingDrop: Drop | null | undefined, key: keyof Drop) {
    if (hasOwn(source, key)) {
        const value = source[key];
        return typeof value === "string" ? value.trim() : "";
    }

    const existing = existingDrop?.[key];
    return typeof existing === "string" ? existing.trim() : "";
}

function getMergedNumber(source: Record<string, unknown>, existingDrop: Drop | null | undefined, key: keyof Drop) {
    if (hasOwn(source, key)) {
        const value = source[key];
        return typeof value === "number" && Number.isFinite(value) ? value : null;
    }

    const existing = existingDrop?.[key];
    return typeof existing === "number" && Number.isFinite(existing) ? existing : null;
}

function getMergedBoolean(source: Record<string, unknown>, existingDrop: Drop | null | undefined, key: keyof Drop) {
    if (hasOwn(source, key)) {
        return source[key] === true;
    }

    return existingDrop?.[key] === true;
}

function getMergedStringArray(source: Record<string, unknown>, existingDrop: Drop | null | undefined, key: keyof Drop) {
    if (hasOwn(source, key)) {
        const value = source[key];
        return Array.isArray(value)
            ? Array.from(new Set(value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)))
            : [];
    }

    const existing = existingDrop?.[key];
    return Array.isArray(existing)
        ? Array.from(new Set(existing.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)))
        : [];
}

function isHttpUrl(value: string) {
    try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

function isSafeDropActionUrl(value: string) {
    const trimmedUrl = value?.trim();
    if (!trimmedUrl) {
        return false;
    }

    if (trimmedUrl.startsWith("\\") || trimmedUrl.startsWith("//") || trimmedUrl.startsWith("/\\")) {
        return false;
    }

    try {
        const parsed = new URL(trimmedUrl, DROP_ACTION_URL_BASE);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return false;
        }

        if (parsed.origin === DROP_ACTION_URL_BASE) {
            if (
                parsed.pathname.startsWith("//")
                || parsed.pathname.startsWith("/\\")
                || parsed.pathname.startsWith("\\")
                || trimmedUrl.startsWith("\\")
                || trimmedUrl.startsWith("//")
                || trimmedUrl.startsWith("/\\")
            ) {
                return false;
            }
        }

        return true;
    } catch {
        return false;
    }
}

export function shouldValidateDropPublishPayload(dropData: Record<string, unknown>) {
    if (dropData.approvalStatus === "approved") {
        return true;
    }

    return DROP_PUBLISH_FIELDS.some((field) => hasOwn(dropData, field));
}

export function validateDropPublishState(
    dropData: Record<string, unknown>,
    options: DropPublishValidationOptions = {},
): DropPublishValidationResult {
    const existingDrop = options.existingDrop ?? null;
    const errors: string[] = [];
    const title = getMergedString(dropData, existingDrop, "title");
    const description = getMergedString(dropData, existingDrop, "description");
    const imageUrl = getMergedString(dropData, existingDrop, "imageUrl");
    const type = getMergedString(dropData, existingDrop, "type") || "content";
    const unlockCost = getMergedNumber(dropData, existingDrop, "unlockCost");
    const validFrom = getMergedNumber(dropData, existingDrop, "validFrom");
    const validUntil = getMergedNumber(dropData, existingDrop, "validUntil");
    const creatorId = options.creatorIdOverride ?? getMergedString(dropData, existingDrop, "creatorId");
    const requiresActiveSubscription = getMergedBoolean(dropData, existingDrop, "requiresActiveSubscription");
    const contentUrls = getMergedStringArray(dropData, existingDrop, "contentUrls");
    const contentUrl = getMergedString(dropData, existingDrop, "contentUrl");
    const actionUrl = getMergedString(dropData, existingDrop, "actionUrl");
    const contentAssetCount = new Set([...contentUrls, contentUrl].filter(Boolean)).size;

    if (title.length < 3) {
        errors.push("Title is required before publishing.");
    }

    if (description.length < 10) {
        errors.push("Description is required before publishing.");
    }

    if (!imageUrl || !isHttpUrl(imageUrl)) {
        errors.push("Cover or public preview media is required before publishing.");
    }

    if (type !== "content" && type !== "promo" && type !== "external") {
        errors.push("Drop type must be content, promo, or external.");
    }

    if (unlockCost === null || unlockCost < 0) {
        errors.push("Gum Drop price must be zero or greater.");
    }

    if (validFrom === null) {
        errors.push("A live or scheduled start time is required before publishing.");
    }

    if (validFrom !== null && validUntil !== null && validUntil <= validFrom) {
        errors.push("Expiration time must be after the start time.");
    }

    if (type === "content" && contentAssetCount === 0) {
        errors.push("At least one locked content asset is required for content drops.");
    }

    if ((type === "promo" || type === "external") && !isSafeDropActionUrl(actionUrl)) {
        errors.push("Promo and external drops require a safe destination URL.");
    }

    if (options.requireCreator && !creatorId) {
        errors.push("Creator assignment is required for creator-submitted drops.");
    }

    if (requiresActiveSubscription && !creatorId) {
        errors.push("Subscriber-only drops require a creator assignment.");
    }

    return {
        ok: errors.length === 0,
        errors,
    };
}

export function resolveCreatedDropTiming(dropData: Record<string, unknown>, now: number) {
    const validFrom = typeof dropData.validFrom === "number" ? dropData.validFrom : now;
    const validUntil = typeof dropData.validUntil === "number" ? dropData.validUntil : undefined;

    return {
        validFrom,
        validUntil,
        status: resolveDropStatusFromTiming({ validFrom, validUntil }, now),
    } satisfies { validFrom: number; validUntil: number | undefined; status: Drop["status"] };
}

export function resolveUpdatedDropTiming(dropData: Record<string, unknown>, existingDrop: Drop, now: number) {
    const validFrom = typeof dropData.validFrom === "number" ? dropData.validFrom : existingDrop.validFrom;
    const validUntil = dropData.validUntil === null
        ? undefined
        : typeof dropData.validUntil === "number"
            ? dropData.validUntil
            : existingDrop.validUntil;

    return {
        validFrom,
        validUntil,
        status: resolveDropStatusFromTiming({ validFrom, validUntil }, now),
    } satisfies { validFrom: number; validUntil: number | undefined; status: Drop["status"] };
}

export async function invalidateDropSurfaces(paths: readonly string[], now?: number) {
    if (typeof now === "number") {
        await touchDropsRuntime(now);
    } else {
        await touchDropsRuntime();
    }

    for (const path of paths) {
        revalidatePath(path);
    }
}
