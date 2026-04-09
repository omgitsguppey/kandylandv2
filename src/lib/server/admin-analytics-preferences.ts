import "server-only";

import {
    ADMIN_ANALYTICS_DEFAULT_RANGE,
    normalizeAdminAnalyticsModuleRangeMap,
    type AdminAnalyticsModuleRangeMap,
    type AdminAnalyticsRangeOption,
} from "@/lib/admin-analytics-preferences";
import { adminDb } from "@/lib/server/firebase-admin";

export type AdminAnalyticsPreferences = {
    moduleRanges: AdminAnalyticsModuleRangeMap;
};

const DEFAULT_ADMIN_ANALYTICS_PREFERENCES: AdminAnalyticsPreferences = {
    moduleRanges: {},
};

function normalizeAdminAnalyticsPreferences(value: unknown): AdminAnalyticsPreferences {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return DEFAULT_ADMIN_ANALYTICS_PREFERENCES;
    }

    const source = value as {
        moduleRanges?: unknown;
    };

    return {
        moduleRanges: normalizeAdminAnalyticsModuleRangeMap(source.moduleRanges),
    };
}

export async function getAdminAnalyticsPreferences(uid: string): Promise<AdminAnalyticsPreferences> {
    if (!adminDb || !uid.trim()) {
        return DEFAULT_ADMIN_ANALYTICS_PREFERENCES;
    }

    const snapshot = await adminDb.collection("users").doc(uid).get();
    const data = snapshot.data() as Record<string, unknown> | undefined;
    return normalizeAdminAnalyticsPreferences(
        data?.adminPreferences
            && typeof data.adminPreferences === "object"
            && !Array.isArray(data.adminPreferences)
            ? (data.adminPreferences as Record<string, unknown>).analytics
            : null,
    );
}

export async function saveAdminAnalyticsModuleRange(input: {
    uid: string;
    section: string;
    range: AdminAnalyticsRangeOption;
}) {
    if (!adminDb) {
        return {
            ...DEFAULT_ADMIN_ANALYTICS_PREFERENCES,
            moduleRanges: {
                [input.section]: input.range,
            },
        };
    }

    const normalizedSection = input.section.trim();
    if (!normalizedSection) {
        return getAdminAnalyticsPreferences(input.uid);
    }

    const userRef = adminDb.collection("users").doc(input.uid);
    await userRef.set({
        adminPreferences: {
            analytics: {
                moduleRanges: {
                    [normalizedSection]: input.range,
                },
                updatedAtMs: Date.now(),
            },
        },
    }, { merge: true });

    return getAdminAnalyticsPreferences(input.uid);
}

export function resolveAdminAnalyticsModuleRange(
    preferences: AdminAnalyticsPreferences | null | undefined,
    section: string,
) {
    return preferences?.moduleRanges?.[section] ?? ADMIN_ANALYTICS_DEFAULT_RANGE;
}
