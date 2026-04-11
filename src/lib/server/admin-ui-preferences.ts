import "server-only";

import { adminDb } from "@/lib/server/firebase-admin";

export type AdminUiPreferences = {
    collapsedModules: Record<string, boolean>;
};

const DEFAULT_ADMIN_UI_PREFERENCES: AdminUiPreferences = {
    collapsedModules: {},
};

function readAdminUiPreferences(data: Record<string, unknown> | undefined): AdminUiPreferences {
    const root = data?.adminPreferences;
    if (!root || typeof root !== "object" || Array.isArray(root)) {
        return DEFAULT_ADMIN_UI_PREFERENCES;
    }

    const ui = (root as Record<string, unknown>).ui;
    if (!ui || typeof ui !== "object" || Array.isArray(ui)) {
        return DEFAULT_ADMIN_UI_PREFERENCES;
    }

    const collapsedModulesRaw = (ui as Record<string, unknown>).collapsedModules;
    const collapsedModules = collapsedModulesRaw && typeof collapsedModulesRaw === "object" && !Array.isArray(collapsedModulesRaw)
        ? Object.fromEntries(
            Object.entries(collapsedModulesRaw as Record<string, unknown>)
                .filter(([key, value]) => key.trim().length > 0 && typeof value === "boolean"),
        ) as Record<string, boolean>
        : {};

    return {
        collapsedModules,
    };
}

export async function getAdminUiPreferences(uid: string) {
    if (!adminDb || !uid.trim()) {
        return DEFAULT_ADMIN_UI_PREFERENCES;
    }

    const snapshot = await adminDb.collection("users").doc(uid).get();
    return readAdminUiPreferences(snapshot.data() as Record<string, unknown> | undefined);
}

export async function saveAdminUiCollapsedModulePreference(input: {
    uid: string;
    key: string;
    collapsed: boolean;
}) {
    const key = input.key.trim();
    if (!adminDb || !input.uid.trim() || !key) {
        return DEFAULT_ADMIN_UI_PREFERENCES;
    }

    await adminDb.collection("users").doc(input.uid).set({
        adminPreferences: {
            ui: {
                collapsedModules: {
                    [key]: input.collapsed,
                },
                updatedAtMs: Date.now(),
            },
        },
    }, { merge: true });

    return getAdminUiPreferences(input.uid);
}
