import "server-only";

import { AI_DEBUG_ASSISTANT_MODEL, adminAiDebugSummarySchema, type AdminAiDebugSummary } from "@/lib/ai-debug-assistant";
import { normalizeAdminAiModelAliasForRole } from "@/lib/admin-ai-models";
import { ADMIN_AI_DEBUG_ASSISTANT_SETTINGS_DOC } from "@/lib/admin-ai-debug-runtime";
import { adminDb } from "@/lib/server/firebase-admin";

export type AdminAiDebugAssistantSettings = {
    enabled: boolean;
    model: string;
    updatedAtMs: number;
    updatedByUid?: string;
    updatedByEmail?: string | null;
    lastSummary?: AdminAiDebugSummary | null;
    lastLiveCallAtMs?: number;
};

export function getDefaultAdminAiDebugAssistantSettings(): AdminAiDebugAssistantSettings {
    return {
        enabled: true,
        model: AI_DEBUG_ASSISTANT_MODEL,
        updatedAtMs: 0,
        updatedByUid: "",
        updatedByEmail: null,
        lastSummary: null,
        lastLiveCallAtMs: 0,
    };
}

function normalizeAdminAiDebugAssistantSettings(value: unknown): AdminAiDebugAssistantSettings {
    const defaults = getDefaultAdminAiDebugAssistantSettings();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return defaults;
    }

    const source = value as Record<string, unknown>;
    const model = typeof source.model === "string" && source.model.trim().length > 0
        ? normalizeAdminAiModelAliasForRole(source.model.trim(), "admin_debug_assistant")
        : defaults.model;
    const parsedSummary = adminAiDebugSummarySchema.safeParse(source.lastSummary);

    return {
        enabled: source.enabled !== false,
        model,
        updatedAtMs: typeof source.updatedAtMs === "number" && Number.isFinite(source.updatedAtMs)
            ? Math.max(0, Math.trunc(source.updatedAtMs))
            : 0,
        updatedByUid: typeof source.updatedByUid === "string" ? source.updatedByUid : "",
        updatedByEmail: typeof source.updatedByEmail === "string" ? source.updatedByEmail : null,
        lastSummary: parsedSummary.success ? parsedSummary.data : null,
        lastLiveCallAtMs: typeof source.lastLiveCallAtMs === "number" && Number.isFinite(source.lastLiveCallAtMs)
            ? Math.max(0, Math.trunc(source.lastLiveCallAtMs))
            : 0,
    };
}

export async function getAdminAiDebugAssistantSettings() {
    if (!adminDb) {
        return getDefaultAdminAiDebugAssistantSettings();
    }

    const snapshot = await adminDb.collection("adminSettings").doc(ADMIN_AI_DEBUG_ASSISTANT_SETTINGS_DOC).get();
    return normalizeAdminAiDebugAssistantSettings(snapshot.exists ? snapshot.data() : null);
}

export async function saveAdminAiDebugAssistantSettings(input: {
    enabled?: boolean;
    model?: string;
    actorUid?: string;
    actorEmail?: string | null;
    lastSummary?: AdminAiDebugSummary | null;
    lastLiveCallAtMs?: number;
}) {
    const nextSettings = {
        enabled: input.enabled ?? true,
        model: normalizeAdminAiModelAliasForRole(input.model, "admin_debug_assistant") || AI_DEBUG_ASSISTANT_MODEL,
        updatedAtMs: Date.now(),
        updatedByUid: input.actorUid ?? "",
        updatedByEmail: input.actorEmail ?? null,
        lastSummary: input.lastSummary ?? undefined,
        lastLiveCallAtMs: typeof input.lastLiveCallAtMs === "number" && Number.isFinite(input.lastLiveCallAtMs)
            ? Math.max(0, Math.trunc(input.lastLiveCallAtMs))
            : undefined,
    } satisfies AdminAiDebugAssistantSettings;

    if (!adminDb) {
        return nextSettings;
    }

    await adminDb.collection("adminSettings").doc(ADMIN_AI_DEBUG_ASSISTANT_SETTINGS_DOC).set(nextSettings, { merge: true });
    return getAdminAiDebugAssistantSettings();
}
