import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";
import { trackServerEvent } from "@/lib/server/analytics";
import { STANDARD } from "@/lib/server/rate-limit";
import { z } from "zod";
import { guardApiRequest } from "@/lib/server/request-guard";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

const bodySchema = z.object({
    dropId: z.string().trim().min(1).max(128),
});

async function POST_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "drops/track",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { dropId } = bodySchema.parse(await request.json());

        if (!dropId || !adminDb) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const dropRef = adminDb.collection("drops").doc(dropId);

        // Send Exact Timestamped View Event to GA4
        await trackServerEvent("drop_clicked", {
            dropId: dropId,
            action: "track",
            source: "backend_api_authenticated"
        }, caller.uid);

        await dropRef.update({ totalClicks: FieldValue.increment(1) });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Drops.Track");
    }
}

export let POST = withRouteRuntimeHealth("drops/track:POST", POST_handler);
