import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/server/firebase-admin";
import { isCreatorRole } from "@/lib/creator-experiences";

export type AdminCreatorProjectionContext = {
    active: true;
    targetCreatorId: string;
    actorAdminUid: string;
    startedAt: number;
    projectionMode: "read_only_creator_projection";
    sourceTruth: "server_validated_projection";
};

function readString(value: string | null) {
    return typeof value === "string" ? value.trim() : "";
}

function readTimestamp(value: string | null) {
    if (!value) {
        return 0;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
}

export function readAdminCreatorProjectionContext(
    request: NextRequest,
    callerUid: string | null | undefined,
    callerRole: string | null | undefined = null,
) {
    const targetCreatorId = readString(request.headers.get("x-admin-view-as-user-id"));
    const actorAdminUid = readString(request.headers.get("x-admin-view-as-actor-uid"));
    const startedAt = readTimestamp(request.headers.get("x-admin-view-as-started-at"));
    const role = readString(request.headers.get("x-admin-view-as-role"));

    if (!targetCreatorId || !actorAdminUid || !startedAt) {
        return null;
    }

    if (callerUid && callerUid !== actorAdminUid) {
        return null;
    }

    if (callerRole !== "admin") {
        return null;
    }

    if (role && role !== "creator") {
        return null;
    }

    return {
        active: true,
        targetCreatorId,
        actorAdminUid,
        startedAt,
        projectionMode: "read_only_creator_projection",
        sourceTruth: "server_validated_projection",
    } satisfies AdminCreatorProjectionContext;
}

export function buildAdminCreatorProjectionReadOnlyResponse() {
    return NextResponse.json({
        success: false,
        error: "Creator dashboard is read-only while viewing as a creator.",
        message: "Creator dashboard is read-only while viewing as a creator.",
        code: "admin_projection_read_only",
    }, { status: 403 });
}

export async function requireProjectedCreatorRecord(targetCreatorId: string) {
    if (!adminDb) {
        return null;
    }

    const snap = await adminDb.collection("users").doc(targetCreatorId).get();
    if (!snap.exists) {
        return null;
    }

    const data = snap.data() as Record<string, unknown>;
    if (!isCreatorRole(data.role)) {
        return null;
    }

    return {
        id: snap.id,
        data,
    };
}
