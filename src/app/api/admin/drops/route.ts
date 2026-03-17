import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";
import { sendGlobalDropNotification } from "@/lib/server/push-notifications";
import { ADMIN } from "@/lib/server/rate-limit";
import { normalizeDropRecord } from "@/lib/drop-normalizers";
import { resolveDropStatusFromTiming } from "@/lib/drop-status";
import { touchDropsRuntime } from "@/lib/server/drop-runtime";
import { guardApiRequest } from "@/lib/server/request-guard";

// Whitelist of allowed drop fields to prevent arbitrary writes
const ALLOWED_DROP_FIELDS = [
    "title", "description", "imageUrl", "contentUrl", "contentUrls", "unlockCost",
    "validFrom", "validUntil", "status", "type", "tags",
    "ctaText", "actionUrl", "accentColor", "fileMetadata", "mediaCounts",
    "creatorId",
];

import { revalidatePath } from "next/cache";

function sanitizeDropData(raw: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const key of ALLOWED_DROP_FIELDS) {
        if (raw[key] !== undefined) {
            sanitized[key] = raw[key] === null ? FieldValue.delete() : raw[key];
        }
    }
    return sanitized;
}

// POST — Create a new drop (admin-only)
export async function POST(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/drops",
            rateLimit: ADMIN,
            auth: "admin",
        });

        const body = await request.json();
        const { dropData } = body;

        if (!dropData) {
            return NextResponse.json({ error: "Missing drop data" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const sanitized = sanitizeDropData(dropData);
        const now = Date.now();
        const resolvedInitialValidFrom = typeof dropData.validFrom === "number" ? dropData.validFrom : now;
        const resolvedInitialStatus = resolveDropStatusFromTiming({
            validFrom: resolvedInitialValidFrom,
            validUntil: typeof dropData.validUntil === "number" ? dropData.validUntil : undefined,
        }, now);
        sanitized.status = resolvedInitialStatus;
        const docRef = await adminDb.collection("drops").add({
            ...sanitized,
            totalUnlocks: 0,
            totalViews: 0,
            totalClicks: 0,
            createdAt: FieldValue.serverTimestamp(),
        });
        await touchDropsRuntime(now);

        // Automatically issue a global notification and Web Push ONLY if immediately active
        if (resolvedInitialStatus === "active") {
            try {
                await sendGlobalDropNotification(
                    sanitized.title as string,
                    docRef.id,
                    sanitized.imageUrl as string,
                    `drop-activation:${docRef.id}:${resolvedInitialValidFrom}`,
                );
            } catch (notifError) {
                console.error("Non-fatal: Failed to generate global notification for new drop", notifError);
            }
        }

        revalidatePath("/drops");
        revalidatePath("/");
        revalidatePath("/dashboard");

        return NextResponse.json({ success: true, id: docRef.id });
    } catch (error) {
        return handleApiError(error, "Admin.Drops.POST");
    }
}

// PUT — Update an existing drop (admin-only)
export async function PUT(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/drops",
            rateLimit: ADMIN,
            auth: "admin",
        });

        const { dropId, dropData } = await request.json();

        if (!dropId || !dropData) {
            return NextResponse.json({ error: "Missing dropId or data" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const sanitized = sanitizeDropData(dropData);
        if (Object.keys(sanitized).length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        const dropRef = adminDb.collection("drops").doc(dropId);
        const existingDropSnap = await dropRef.get();
        if (!existingDropSnap.exists) {
            return NextResponse.json({ error: "Drop not found" }, { status: 404 });
        }

        const existingDrop = normalizeDropRecord(existingDropSnap.data(), dropId);
        const now = Date.now();
        const nextValidFrom = typeof dropData.validFrom === "number" ? dropData.validFrom : existingDrop.validFrom;
        const nextValidUntil = dropData.validUntil === null
            ? undefined
            : typeof dropData.validUntil === "number"
                ? dropData.validUntil
                : existingDrop.validUntil;
        const currentLiveStatus = resolveDropStatusFromTiming(existingDrop, now);
        const nextLiveStatus = resolveDropStatusFromTiming({
            validFrom: nextValidFrom,
            validUntil: nextValidUntil,
        }, now);
        const shouldNotifyActivation = currentLiveStatus !== "active" && nextLiveStatus === "active";
        sanitized.status = nextLiveStatus;

        await dropRef.update(sanitized);
        await touchDropsRuntime(now);

        if (shouldNotifyActivation) {
            try {
                await sendGlobalDropNotification(
                    typeof sanitized.title === "string" ? sanitized.title : existingDrop.title,
                    dropId,
                    typeof sanitized.imageUrl === "string" ? sanitized.imageUrl : existingDrop.imageUrl,
                    `drop-activation:${dropId}:${nextValidFrom}`,
                );
            } catch (notifError) {
                console.error("Non-fatal: Failed to generate activation notification for updated drop", notifError);
            }
        }

        revalidatePath("/drops");
        revalidatePath("/");
        revalidatePath("/dashboard");

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Admin.Drops.PUT");
    }
}

// DELETE — Delete a drop (admin-only)
export async function DELETE(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/drops",
            rateLimit: ADMIN,
            auth: "admin",
        });

        const { dropId } = await request.json();

        if (!dropId) {
            return NextResponse.json({ error: "Missing dropId" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const dropRef = adminDb.collection("drops").doc(dropId);
        const dropSnap = await dropRef.get();
        if (!dropSnap.exists) {
            return NextResponse.json({ error: "Drop not found" }, { status: 404 });
        }

        await dropRef.delete();
        await touchDropsRuntime();

        revalidatePath("/drops");
        revalidatePath("/");
        revalidatePath("/dashboard");

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Admin.Drops.DELETE");
    }
}
