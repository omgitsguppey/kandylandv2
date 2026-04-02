import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

import { resolveDropStatusFromTiming } from "@/lib/drop-status";
import { touchDropsRuntime } from "@/lib/server/drop-runtime";
import type { Drop } from "@/types/db";

type DropMutationFields = readonly string[];

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
