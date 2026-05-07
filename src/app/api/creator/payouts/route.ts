import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { CREATOR_COLLECTIONS, isCreatorRole } from "@/lib/creator-experiences";
import { calculateCreatorCashoutUsd } from "@/lib/server/creator-experiences";
import { trackServerEvent } from "@/lib/server/analytics";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { buildNotFoundResponse } from "@/lib/server/not-found";

const CREATOR_PAYOUTS_READ_LIMIT = 500;
const CREATOR_ACCRUALS_READ_LIMIT = 2_000;

const createPayoutSchema = z.object({
    requestedGd: z.number().int().min(100),
});

const reviewPayoutSchema = z.object({
    payoutRequestId: z.string().trim().min(1),
    action: z.enum(["honor", "reject"]),
    reviewNote: z.string().trim().max(500).optional(),
});

async function GET_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/payouts",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const isAdmin = callerData?.role === "admin";
        const field = isAdmin && request.nextUrl.searchParams.get("creatorId")
            ? "creatorId"
            : "creatorId";
        const value = isAdmin && request.nextUrl.searchParams.get("creatorId")
            ? request.nextUrl.searchParams.get("creatorId")?.trim() || caller.uid
            : caller.uid;

        const [payoutSnap, accrualSnap] = await Promise.all([
            adminDb.collection(CREATOR_COLLECTIONS.payoutRequests).where(field, "==", value).limit(CREATOR_PAYOUTS_READ_LIMIT).get(),
            adminDb.collection(CREATOR_COLLECTIONS.ledgerAccruals).where("creatorId", "==", value).limit(CREATOR_ACCRUALS_READ_LIMIT).get(),
        ]);

        const availableGd = accrualSnap.docs.reduce((sum, doc) => {
            const data = doc.data() as Record<string, unknown>;
            const status = typeof data.status === "string" ? data.status : "accrued";
            if (status === "honored") {
                return sum;
            }
            return sum + (typeof data.creatorShareGd === "number" ? data.creatorShareGd : 0);
        }, 0);

        return NextResponse.json({
            success: true,
            availableGd,
            availableUsd: calculateCreatorCashoutUsd(availableGd),
            payoutRequests: payoutSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) })),
        });
    } catch (error) {
        return handleApiError(error, "Creator.Payouts.GET");
    }
}

async function POST_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/payouts",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        if (!isCreatorRole(callerData?.role)) {
            return NextResponse.json({ error: "Creator access required" }, { status: 403 });
        }

        const creatorRestrictions = callerData?.creatorRestrictions && typeof callerData.creatorRestrictions === "object"
            ? callerData.creatorRestrictions as Record<string, unknown>
            : {};
        if (creatorRestrictions.payoutsRestricted === true) {
            return NextResponse.json({ error: "Payouts are restricted for this creator." }, { status: 403 });
        }

        const { requestedGd } = createPayoutSchema.parse(await request.json());
        const accrualSnap = await adminDb.collection(CREATOR_COLLECTIONS.ledgerAccruals)
            .where("creatorId", "==", caller.uid)
            .limit(CREATOR_ACCRUALS_READ_LIMIT)
            .get();
        const availableGd = accrualSnap.docs.reduce((sum, doc) => {
            const data = doc.data() as Record<string, unknown>;
            if (data.status === "honored") {
                return sum;
            }
            return sum + (typeof data.creatorShareGd === "number" ? data.creatorShareGd : 0);
        }, 0);

        if (requestedGd > availableGd) {
            return NextResponse.json({ error: "Requested payout exceeds available creator earnings." }, { status: 400 });
        }

        const payoutRef = adminDb.collection(CREATOR_COLLECTIONS.payoutRequests).doc();
        await payoutRef.set({
            creatorId: caller.uid,
            requestedGd,
            requestedUsd: calculateCreatorCashoutUsd(requestedGd),
            status: "pending",
            createdAt: Date.now(),
        });

        await trackServerEvent("creator_cashout_requested", {
            creator_id: caller.uid,
            requested_gd: requestedGd,
            requested_usd: calculateCreatorCashoutUsd(requestedGd),
        }, caller.uid).catch(() => null);

        return NextResponse.json({ success: true, id: payoutRef.id });
    } catch (error) {
        return handleApiError(error, "Creator.Payouts.POST");
    }
}

async function PUT_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/payouts",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        if (callerData?.role !== "admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const { payoutRequestId, action, reviewNote } = reviewPayoutSchema.parse(await request.json());
        const payoutRef = adminDb.collection(CREATOR_COLLECTIONS.payoutRequests).doc(payoutRequestId);
        const payoutSnap = await payoutRef.get();
        if (!payoutSnap.exists) {
            return buildNotFoundResponse("request", "Payout request not found");
        }

        const payoutData = payoutSnap.data() as Record<string, unknown>;
        const nextStatus = action === "honor" ? "honored" : "rejected";
        await payoutRef.set({
            status: nextStatus,
            reviewedAt: Date.now(),
            reviewNote: reviewNote?.trim() || null,
        }, { merge: true });

        if (action === "honor") {
            await trackServerEvent("creator_cashout_honored", {
                creator_id: String(payoutData.creatorId || ""),
                requested_gd: typeof payoutData.requestedGd === "number" ? payoutData.requestedGd : 0,
            }, String(payoutData.creatorId || "")).catch(() => null);
        }

        return NextResponse.json({ success: true, status: nextStatus });
    } catch (error) {
        return handleApiError(error, "Creator.Payouts.PUT");
    }
}

export let GET = withRouteRuntimeHealth("creator/payouts:GET", GET_handler);
export let POST = withRouteRuntimeHealth("creator/payouts:POST", POST_handler);
export let PUT = withRouteRuntimeHealth("creator/payouts:PUT", PUT_handler);
