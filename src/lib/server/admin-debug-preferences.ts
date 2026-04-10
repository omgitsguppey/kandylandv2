import "server-only";

import {
    ADMIN_DEBUG_DEFAULT_TAB,
    normalizeAdminDebugPreferences,
    type AdminDebugPreferences,
    type AdminDebugRouteRuntimeFilter,
    type AdminDebugTabOption,
} from "@/lib/admin-debug-preferences";
import { adminDb } from "@/lib/server/firebase-admin";

const DEFAULT_ADMIN_DEBUG_PREFERENCES: Required<AdminDebugPreferences> = {
    activeTab: ADMIN_DEBUG_DEFAULT_TAB,
    routeRuntimeFilter: "all",
};

function readPersistedAdminDebugPreferences(data: Record<string, unknown> | undefined) {
    return normalizeAdminDebugPreferences(
        data?.adminPreferences
            && typeof data.adminPreferences === "object"
            && !Array.isArray(data.adminPreferences)
            ? (data.adminPreferences as Record<string, unknown>).debug
            : null,
    );
}

export async function getAdminDebugPreferences(uid: string) {
    if (!adminDb || !uid.trim()) {
        return DEFAULT_ADMIN_DEBUG_PREFERENCES;
    }

    const snapshot = await adminDb.collection("users").doc(uid).get();
    const data = snapshot.data() as Record<string, unknown> | undefined;
    const preferences = readPersistedAdminDebugPreferences(data);

    return {
        activeTab: preferences.activeTab ?? DEFAULT_ADMIN_DEBUG_PREFERENCES.activeTab,
        routeRuntimeFilter: preferences.routeRuntimeFilter ?? DEFAULT_ADMIN_DEBUG_PREFERENCES.routeRuntimeFilter,
    };
}

export async function saveAdminDebugPreferences(input: {
    uid: string;
    activeTab?: AdminDebugTabOption;
    routeRuntimeFilter?: AdminDebugRouteRuntimeFilter;
}) {
    if (!adminDb) {
        return {
            activeTab: input.activeTab ?? DEFAULT_ADMIN_DEBUG_PREFERENCES.activeTab,
            routeRuntimeFilter: input.routeRuntimeFilter ?? DEFAULT_ADMIN_DEBUG_PREFERENCES.routeRuntimeFilter,
        };
    }

    const patch: Record<string, unknown> = {
        updatedAtMs: Date.now(),
    };

    if (input.activeTab) {
        patch.activeTab = input.activeTab;
    }
    if (input.routeRuntimeFilter) {
        patch.routeRuntimeFilter = input.routeRuntimeFilter;
    }

    await adminDb.collection("users").doc(input.uid).set({
        adminPreferences: {
            debug: patch,
        },
    }, { merge: true });

    return getAdminDebugPreferences(input.uid);
}
