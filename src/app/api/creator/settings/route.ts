import { NextRequest, NextResponse } from "next/server";
import { AggregateField } from "firebase-admin/firestore";

import { AuthError, handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { adminDb } from "@/lib/server/firebase-admin";
import { guardApiRequest } from "@/lib/server/request-guard";
import { isCreatorOrAdminRole } from "@/lib/creator-experiences";
import { buildAdminCreatorProjectionReadOnlyResponse, readAdminCreatorProjectionContext } from "@/lib/server/admin-creator-projection";
import { buildCreatorUpdateMerge, sanitizeCreatorRestrictionsUpdate, sanitizeCreatorSettingsUpdate } from "@/lib/server/creator-experiences";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { trackServerEvent } from "@/lib/server/analytics";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import {
    actorMarkerToTelemetryPayload,
    assertKnownActor,
    buildActorMarker,
} from "@/lib/identity/actor-markers";

const CREATOR_SETTINGS_BODY_LIMIT_BYTES = 32_768;

type CreatorStatsEvidenceState =
    | "verified_sample"
    | "queried_zero"
    | "partial"
    | "missing_source"
    | "needs_review"
    | "unavailable";

type CreatorStatsEvidenceSource = {
    state: CreatorStatsEvidenceState;
    value: number;
    sampleKnown: boolean;
    collection: string;
};

type CreatorStatsEvidence = {
    generatedAtUtc: string;
    sourceTruth: "canonical" | "partial" | "needs_review" | "unavailable";
    sourceFreshness: "fresh" | "stale" | "unknown" | "unavailable";
    sampleCount: number;
    zeroValuesAreProven: boolean;
    readOnlyProjection: boolean;
    sources: {
        ledgerAccruals: CreatorStatsEvidenceSource;
        pendingPayouts: CreatorStatsEvidenceSource;
        subscriptions: CreatorStatsEvidenceSource;
        customRequests: CreatorStatsEvidenceSource;
        callBookings: CreatorStatsEvidenceSource;
        relationshipsOps: CreatorStatsEvidenceSource;
        drops: CreatorStatsEvidenceSource;
        userProfile: CreatorStatsEvidenceSource;
    };
    issues: string[];
};

function toFiniteNumber(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function evidenceStateForCount(value: number, queried: boolean): CreatorStatsEvidenceState {
    if (!queried) return "missing_source";
    return value > 0 ? "verified_sample" : "queried_zero";
}

function evidenceSource(collection: string, value: number, state: CreatorStatsEvidenceState, sampleKnown: boolean): CreatorStatsEvidenceSource {
    return {
        collection,
        value,
        state,
        sampleKnown,
    };
}

function evidenceStateForSum(value: number): CreatorStatsEvidenceState {
    return value > 0 ? "verified_sample" : "partial";
}

function buildCreatorStatsEvidence(input: {
    generatedAtUtc: string;
    earningsGd: number;
    pendingCashoutGd: number;
    activeSubscribers: number;
    openRequests: number;
    bookedCalls: number;
    followerCount: number;
    liveDropsCount: number;
    profileViewsCount: number;
    relationshipsOpsKnown: boolean;
    userProfileKnown: boolean;
    readOnlyProjection: boolean;
}): CreatorStatsEvidence {
    const sources: CreatorStatsEvidence["sources"] = {
        ledgerAccruals: evidenceSource("creator_ledger_accruals", input.earningsGd, evidenceStateForSum(input.earningsGd), input.earningsGd > 0),
        pendingPayouts: evidenceSource("creator_payout_requests", input.pendingCashoutGd, evidenceStateForSum(input.pendingCashoutGd), input.pendingCashoutGd > 0),
        subscriptions: evidenceSource("creator_subscriptions", input.activeSubscribers, evidenceStateForCount(input.activeSubscribers, true), true),
        customRequests: evidenceSource("creator_custom_requests", input.openRequests, evidenceStateForCount(input.openRequests, true), true),
        callBookings: evidenceSource("creator_call_bookings", input.bookedCalls, evidenceStateForCount(input.bookedCalls, true), true),
        relationshipsOps: evidenceSource("creator_relationships_ops", input.followerCount, evidenceStateForCount(input.followerCount, input.relationshipsOpsKnown), input.relationshipsOpsKnown),
        drops: evidenceSource("drops", input.liveDropsCount, evidenceStateForCount(input.liveDropsCount, true), true),
        userProfile: evidenceSource("users", input.profileViewsCount, evidenceStateForCount(input.profileViewsCount, input.userProfileKnown), input.userProfileKnown),
    };
    const sourceList = Object.entries(sources);
    const sampleCount = sourceList.filter(([, source]) => source.sampleKnown).length;
    const partialSources = sourceList.filter(([, source]) => source.state === "partial");
    const needsReviewSources = sourceList.filter(([, source]) => source.state === "needs_review");
    const missingSources = sourceList.filter(([, source]) => source.state === "missing_source" || source.state === "unavailable");
    const zeroValuesAreProven = sourceList.every(([, source]) => source.value !== 0 || source.sampleKnown);
    const issues = [
        ...partialSources.map(([key]) => `${key}_sample_count_unknown`),
        ...needsReviewSources.map(([key]) => `${key}_needs_review`),
        ...missingSources.map(([key]) => `${key}_missing_source`),
        ...(zeroValuesAreProven ? [] : ["zero_values_not_fully_proven"]),
    ];
    const sourceTruth: CreatorStatsEvidence["sourceTruth"] = sampleCount === 0
        ? "unavailable"
        : needsReviewSources.length > 0
            ? "needs_review"
            : partialSources.length > 0 || missingSources.length > 0
                ? "partial"
                : "canonical";

    return {
        generatedAtUtc: input.generatedAtUtc,
        sourceTruth,
        sourceFreshness: sampleCount > 0 ? "fresh" : "unavailable",
        sampleCount,
        zeroValuesAreProven,
        readOnlyProjection: input.readOnlyProjection,
        sources,
        issues,
    };
}

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

        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const projection = readAdminCreatorProjectionContext(request, caller.uid, typeof callerData?.role === "string" ? callerData.role : null);
        const creatorId = projection?.targetCreatorId || caller.uid;
        const { data } = await requireCreator(creatorId);
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
                .where("creatorId", "==", creatorId)
                .aggregate({ totalEarnings: AggregateField.sum("creatorShareGd") })
                .get(),
            adminDb.collection("creator_payout_requests")
                .where("creatorId", "==", creatorId)
                .where("status", "==", "pending")
                .aggregate({ totalPending: AggregateField.sum("requestedGd") })
                .get(),
            adminDb.collection("creator_subscriptions")
                .where("creatorId", "==", creatorId)
                .where("status", "==", "active")
                .count()
                .get(),
            adminDb.collection("creator_custom_requests")
                .where("creatorId", "==", creatorId)
                .where("status", "==", "pending")
                .count()
                .get(),
            adminDb.collection("creator_call_bookings")
                .where("creatorId", "==", creatorId)
                .where("status", "==", "booked")
                .count()
                .get(),
            adminDb.collection("creator_relationships_ops").doc(creatorId).get(),
            adminDb.collection("drops")
                .where("creatorId", "==", creatorId)
                .where("status", "==", "active")
                .count()
                .get(),
        ]);

        const earningsGd = toFiniteNumber(ledgerSnap.data().totalEarnings);
        const pendingCashoutGd = toFiniteNumber(payoutSnap.data().totalPending);

        const followerCount = relationshipsOpsSnap.exists 
            ? toFiniteNumber((relationshipsOpsSnap.data() as { followerCount?: number }).followerCount)
            : 0;
            
        const profileViewsCount = toFiniteNumber(data.profileViewsCount);
        const liveDropsCount = toFiniteNumber(dropsSnap.data().count);
        const activeSubscribers = toFiniteNumber(subscriptionSnap.data().count);
        const openRequests = toFiniteNumber(requestSnap.data().count);
        const bookedCalls = toFiniteNumber(bookingSnap.data().count);
        const generatedAtUtc = new Date().toISOString();
        const statsEvidence = buildCreatorStatsEvidence({
            generatedAtUtc,
            earningsGd,
            pendingCashoutGd,
            activeSubscribers,
            openRequests,
            bookedCalls,
            followerCount,
            liveDropsCount,
            profileViewsCount,
            relationshipsOpsKnown: relationshipsOpsSnap.exists,
            userProfileKnown: true,
            readOnlyProjection: Boolean(projection),
        });

        return NextResponse.json({
            success: true,
            projection: projection ? {
                active: true,
                targetCreatorId: projection.targetCreatorId,
                actorAdminUid: projection.actorAdminUid,
                startedAt: projection.startedAt,
                projectionMode: projection.projectionMode,
                sourceTruth: projection.sourceTruth,
                readOnly: true,
            } : null,
            creatorSettings: data.creatorSettings ?? null,
            creatorRestrictions: data.creatorRestrictions ?? null,
            stats: {
                earningsGd,
                pendingCashoutGd,
                followerCount,
                profileViewsCount,
                liveDropsCount,
                activeSubscribers,
                openRequests,
                bookedCalls,
            },
            statsEvidence,
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

        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const projection = readAdminCreatorProjectionContext(request, caller.uid, typeof callerData?.role === "string" ? callerData.role : null);
        if (projection) {
            return buildAdminCreatorProjectionReadOnlyResponse();
        }

        const { data } = await requireCreator(caller.uid);
        const payload = await readBoundedJsonBody<{
            creatorSettings?: Record<string, unknown>;
            creatorRestrictions?: Record<string, unknown>;
        }>(request, {
            maxBytes: CREATOR_SETTINGS_BODY_LIMIT_BYTES,
            routeName: "creator/settings",
            allowEmpty: false,
        });

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
        if (isBoundedJsonBodyError(error)) {
            return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.status });
        }
        return handleApiError(error, "Creator.Settings.PUT");
    }
}

export let GET = withRouteRuntimeHealth("creator/settings:GET", GET_handler);
export let PUT = withRouteRuntimeHealth("creator/settings:PUT", PUT_handler);
