import { NextRequest, NextResponse } from "next/server";
import { AggregateField } from "firebase-admin/firestore";

import { AuthError, handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { adminDb } from "@/lib/server/firebase-admin";
import { guardApiRequest } from "@/lib/server/request-guard";
import { isCreatorOrAdminRole } from "@/lib/creator-experiences";
import { buildCreatorUpdateMerge, sanitizeCreatorRestrictionsUpdate, sanitizeCreatorSettingsUpdate } from "@/lib/server/creator-experiences";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { trackServerEvent } from "@/lib/server/analytics";
import {
    actorMarkerToTelemetryPayload,
    assertKnownActor,
    buildActorMarker,
} from "@/lib/identity/actor-markers";

async function requireCreator(uid: string) {
    if (!adminDb) {
        throw new AuthError("Creator settings database unavailable", 503);
    }

    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (!userSnap.exists) {
        throw new AuthError("Creator profile not found", 404, "creator");
    }

    const data = userSnap.data() as Record<string, unknown>;
    if (!isCreatorOrAdminRole(data.role)) {
        throw new AuthError("Creator access required", 403);
    }

    return { snap: userSnap, data };
}

async function GET_handler(request: NextRequest) {
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
            dropsSnap,
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
            adminDb.collection("creator_relationships_ops").doc(caller.uid).get(),
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

async function PUT_handler(request: NextRequest) {
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

        const actorMarker = assertKnownActor(buildActorMarker({
            actor: {
                uid: caller.uid,
                email: caller.email,
                role: typeof data.role === "string" ? data.role : "creator",
            },
            targetUserId: caller.uid,
            targetCreatorId: caller.uid,
            performedAs: payload.creatorRestrictions ? "admin_on_behalf" : "own_account",
            surface: "creator_experiences",
            route: "/api/creator/settings",
            actionKey: "creator_settings_updated",
            occurredAt: Date.now(),
            dedupeKey: `creator_settings_updated:${caller.uid}:${payload.creatorRestrictions ? "restrictions" : "settings"}`,
            source: "creator_settings_route",
        }));
        await adminDb.collection("users").doc(caller.uid).update(buildCreatorUpdateMerge(update));
        await trackServerEvent("creator_settings_updated", {
            page_path: "/dashboard/creator",
            creator_settings_updated: Boolean(payload.creatorSettings),
            creator_restrictions_updated: Boolean(payload.creatorRestrictions),
            ...actorMarkerToTelemetryPayload(actorMarker),
        }, caller.uid).catch(() => undefined);
        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Creator.Settings.PUT");
    }
}

export let GET = withRouteRuntimeHealth("creator/settings:GET", GET_handler);
export let PUT = withRouteRuntimeHealth("creator/settings:PUT", PUT_handler);
