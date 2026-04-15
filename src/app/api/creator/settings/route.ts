import { NextRequest, NextResponse } from "next/server";
import { AggregateField } from "firebase-admin/firestore";

import { handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { adminDb } from "@/lib/server/firebase-admin";
import { guardApiRequest } from "@/lib/server/request-guard";
import { isCreatorRole } from "@/lib/creator-experiences";
import { buildCreatorUpdateMerge, sanitizeCreatorRestrictionsUpdate, sanitizeCreatorSettingsUpdate } from "@/lib/server/creator-experiences";

async function requireCreator(uid: string) {
    if (!adminDb) {
        throw new Error("Database not available");
    }

    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (!userSnap.exists) {
        throw new Error("Creator not found");
    }

    const data = userSnap.data() as Record<string, unknown>;
    if (!isCreatorRole(data.role)) {
        throw new Error("Creator access required");
    }

    return { snap: userSnap, data };
}

export async function GET(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/settings",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data } = await requireCreator(caller.uid);
        const [
            ledgerSnap,
            payoutSnap,
            subscriptionSnap,
            requestSnap,
            bookingSnap,
            relationshipsOpsSnap,
            dropsSnap
        ] = await Promise.all([
            adminDb.collection("creator_ledger_accruals")
                .where("creatorId", "==", caller.uid)
                .aggregate({ totalEarnings: AggregateField.sum("creatorShareGd") })
                .get(),
            adminDb.collection("creator_payout_requests")
                .where("creatorId", "==", caller.uid)
                .where("status", "==", "pending")
                .aggregate({ totalPending: AggregateField.sum("requestedGd") })
                .get(),
            adminDb.collection("creator_subscriptions")
                .where("creatorId", "==", caller.uid)
                .where("status", "==", "active")
                .count()
                .get(),
            adminDb.collection("creator_custom_requests")
                .where("creatorId", "==", caller.uid)
                .where("status", "==", "pending")
                .count()
                .get(),
            adminDb.collection("creator_call_bookings")
                .where("creatorId", "==", caller.uid)
                .where("status", "==", "booked")
                .count()
                .get(),
            adminDb.collection("creator_relationships_ops")
                .doc(caller.uid)
                .get(),
            adminDb.collection("drops")
                .where("creatorId", "==", caller.uid)
                .where("status", "==", "active")
                .count()
                .get(),
        ]);

        const earningsGd = ledgerSnap.data().totalEarnings || 0;
        const pendingCashoutGd = payoutSnap.data().totalPending || 0;

        const followerCount = relationshipsOpsSnap.exists 
            ? (relationshipsOpsSnap.data() as { followerCount?: number }).followerCount || 0
            : 0;
            
        const profileViewsCount = typeof data.profileViewsCount === "number" ? data.profileViewsCount : 0;
        const liveDropsCount = dropsSnap.data().count;

        return NextResponse.json({
            success: true,
            creatorSettings: data.creatorSettings ?? null,
            creatorRestrictions: data.creatorRestrictions ?? null,
            stats: {
                earningsGd,
                pendingCashoutGd,
                followerCount,
                profileViewsCount,
                liveDropsCount,
                activeSubscribers: subscriptionSnap.data().count,
                openRequests: requestSnap.data().count,
                bookedCalls: bookingSnap.data().count,
            },
        });
    } catch (error) {
        return handleApiError(error, "Creator.Settings.GET");
    }
}

export async function PUT(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/settings",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data } = await requireCreator(caller.uid);
        const payload = await request.json() as {
            creatorSettings?: Record<string, unknown>;
            creatorRestrictions?: Record<string, unknown>;
        };

        const update: Record<string, unknown> = {};
        if (payload.creatorSettings) {
            update.creatorSettings = sanitizeCreatorSettingsUpdate(payload.creatorSettings);
        }

        if (payload.creatorRestrictions) {
            const isAdmin = data.role === "admin";
            if (!isAdmin) {
                return NextResponse.json({ error: "Only admins can update creator restrictions from this route." }, { status: 403 });
            }
            update.creatorRestrictions = sanitizeCreatorRestrictionsUpdate(payload.creatorRestrictions);
        }

        if (Object.keys(update).length === 0) {
            return NextResponse.json({ error: "No valid creator settings provided." }, { status: 400 });
        }

        await adminDb.collection("users").doc(caller.uid).update(buildCreatorUpdateMerge(update));
        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Creator.Settings.PUT");
    }
}
