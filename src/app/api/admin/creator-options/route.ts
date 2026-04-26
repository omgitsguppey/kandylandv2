import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { isCreatorRole } from "@/lib/creator-experiences";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

type CreatorOptionRecord = Record<string, unknown> & {
    uid: string;
    role?: unknown;
    creator?: unknown;
    status?: unknown;
    displayName?: unknown;
    username?: unknown;
    photoURL?: unknown;
};

async function GET_handler(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/creator-options",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
        });

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const snap = await adminDb.collection("users")
            .where("role", "in", ["creator", "admin"])
            .select("role", "creator", "status", "displayName", "username", "photoURL")
            .get();

        const creators = snap.docs
            .map((doc) => ({ uid: doc.id, ...(doc.data() as Record<string, unknown>) }) as CreatorOptionRecord)
            .filter((entry) => isCreatorRole(entry) && entry.status !== "banned")
            .sort((left, right) => {
                const leftName = typeof left.displayName === "string" ? left.displayName : "";
                const rightName = typeof right.displayName === "string" ? right.displayName : "";
                return leftName.localeCompare(rightName);
            })
            .map((entry) => ({
                uid: entry.uid,
                displayName: typeof entry.displayName === "string" && entry.displayName.trim().length > 0 ? entry.displayName.trim() : "Creator",
                username: typeof entry.username === "string" ? entry.username : "",
                photoURL: typeof entry.photoURL === "string" ? entry.photoURL : null,
                role: entry.role,
            }));

        return NextResponse.json({ success: true, creators });
    } catch (error) {
        return handleApiError(error, "Admin.CreatorOptions.GET");
    }
}

export let GET = withRouteRuntimeHealth("admin/creator-options:GET", GET_handler);
