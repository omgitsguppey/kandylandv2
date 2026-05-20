import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { CREATOR_BOOKING_MIN_MINUTES, CREATOR_COLLECTIONS, isCreatorRole } from "@/lib/creator-experiences";
import { resolveCreatorBookingPricing } from "@/lib/creator-settings/creator-pricing-resolver";
import { buildCreatorBookingSlots } from "@/lib/creator-booking-slots";
import { buildAdminCreatorProjectionReadOnlyResponse, readAdminCreatorProjectionContext } from "@/lib/server/admin-creator-projection";
import {
    CREATOR_EXPERIENCE_PAID_EVENTS,
    buildBookingSlotKey,
    buildCreatorAccrual,
    buildCreatorExperienceAttribution,
    buildCreatorExperienceIdempotencyKey,
    buildCreatorExperienceRecordIds,
    buildCreatorExperienceTelemetryPayload,
    buildCreatorExperienceTransactionAttributionExtra,
    buildCreatorExperienceTransactionDebug,
    buildSourceAwareBalancePatch,
    readSourceAwareBalance,
    spendCreatorExperienceGumdrops,
} from "@/lib/server/creator-experiences";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";
import { trackServerEvent } from "@/lib/server/analytics";
import { isWithinAnyWindow } from "./booking-timezone";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { buildNotFoundResponse } from "@/lib/server/not-found";
import { assertKnownActor, buildActorMarker } from "@/lib/identity/actor-markers";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";

const CREATOR_BOOKINGS_READ_LIMIT = 200;
const CREATOR_BOOKING_BODY_LIMIT_BYTES = 32_768;

type CreatorBookingProblemCode =
    | "creator_or_user_not_found"
    | "creator_unavailable"
    | "bookings_unavailable"
    | "creator_availability_not_configured"
    | "slot_outside_availability"
    | "slot_unavailable"
    | "slot_already_booked"
    | "insufficient_paid_gumdrops"
    | "invalid_booking_request"
    | "unauthorized";

type CreatorBookingProblemContext = {
    creatorId?: string;
    serviceType?: "phone" | "video";
    durationMinutes?: number;
    startAt?: number;
    requiredPaidGd?: number;
    priceGd?: number;
    paidBalanceGd?: number;
    shortfallGd?: number;
};

const createBookingSchema = z.object({
    creatorId: z.string().trim().min(1),
    serviceType: z.enum(["phone", "video"]),
    startAt: z.number().finite(),
    durationMinutes: z.number().int().min(CREATOR_BOOKING_MIN_MINUTES),
    idempotencyKey: z.string().trim().max(180).optional(),
});

const updateBookingSchema = z.object({
    bookingId: z.string().trim().min(1),
    action: z.enum(["complete", "cancel"]),
});

class CreatorBookingProblem extends Error {
    status: number;
    code: CreatorBookingProblemCode;
    context: CreatorBookingProblemContext;

    constructor(status: number, code: CreatorBookingProblemCode, message: string, context: CreatorBookingProblemContext = {}) {
        super(message);
        this.name = "CreatorBookingProblem";
        this.status = status;
        this.code = code;
        this.context = context;
    }
}

function toOptionalNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : undefined;
}

function buildBookingProblemResponse(problem: CreatorBookingProblem) {
    return NextResponse.json({
        success: false,
        code: problem.code,
        error: problem.message,
        message: problem.message,
        creatorId: problem.context.creatorId,
        serviceType: problem.context.serviceType,
        durationMinutes: toOptionalNumber(problem.context.durationMinutes),
        startAt: toOptionalNumber(problem.context.startAt),
        requiredPaidGd: toOptionalNumber(problem.context.requiredPaidGd),
        priceGd: toOptionalNumber(problem.context.priceGd),
        paidBalanceGd: toOptionalNumber(problem.context.paidBalanceGd),
        shortfallGd: toOptionalNumber(problem.context.shortfallGd),
    }, { status: problem.status });
}

function buildBoundedBookingBodyResponse(error: { status: 400 | 413; code: string; message: string }) {
    return NextResponse.json({
        success: false,
        code: error.code,
        error: error.message,
        message: error.message,
    }, { status: error.status });
}

function isAuthUnauthorized(error: unknown) {
    if (!(error instanceof Error)) {
        return false;
    }

    const status = (error as { status?: unknown }).status;
    return error.name === "AuthError" && status === 401;
}

async function GET_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/bookings",
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
        const projectionCreatorId = projection?.targetCreatorId || "";
        const callerIsCreator = isCreatorRole(callerData?.role);
        const callerIsAdmin = callerData?.role === "admin";
        const creatorId = projectionCreatorId || request.nextUrl.searchParams.get("creatorId")?.trim() || "";
        if (creatorId) {
            const bookingsQuery = (!callerIsAdmin && caller.uid !== creatorId)
                ? adminDb.collection(CREATOR_COLLECTIONS.bookings)
                    .where("creatorId", "==", creatorId)
                    .where("userId", "==", caller.uid)
                : adminDb.collection(CREATOR_COLLECTIONS.bookings)
                    .where("creatorId", "==", creatorId);

            const [creatorSnap, bookingsSnap, subscriptionSnap] = await Promise.all([
                adminDb.collection("users").doc(creatorId).get(),
                bookingsQuery.limit(CREATOR_BOOKINGS_READ_LIMIT).get(),
                adminDb.collection(CREATOR_COLLECTIONS.subscriptions).doc(`${caller.uid}__${creatorId}`).get(),
            ]);
            const creatorData = creatorSnap.data() as Record<string, unknown> | undefined;

            return NextResponse.json({
                success: true,
                creatorSettings: creatorData?.creatorSettings ?? null,
                bookings: bookingsSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) })),
                subscriptionActive: subscriptionSnap.exists && (subscriptionSnap.data() as Record<string, unknown>).status === "active",
            });
        }

        const field = callerIsCreator ? "creatorId" : "userId";
        const bookingsSnap = await adminDb.collection(CREATOR_COLLECTIONS.bookings)
            .where(field, "==", caller.uid)
            .limit(CREATOR_BOOKINGS_READ_LIMIT)
            .get();

        return NextResponse.json({
            success: true,
            bookings: bookingsSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) })),
        });
    } catch (error) {
        return handleApiError(error, "Creator.Bookings.GET");
    }
}

async function POST_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/bookings",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller) {
            return buildBookingProblemResponse(new CreatorBookingProblem(
                401,
                "unauthorized",
                "Sign in to book creator live time.",
            ));
        }
        if (!adminDb) {
            throw new Error("Database not available");
        }

        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const projection = readAdminCreatorProjectionContext(request, caller.uid, typeof callerData?.role === "string" ? callerData.role : null);
        if (projection) {
            return buildAdminCreatorProjectionReadOnlyResponse();
        }

        let bookingRequest: z.infer<typeof createBookingSchema>;
        try {
            const body = await readBoundedJsonBody<z.infer<typeof createBookingSchema>>(request, {
                maxBytes: CREATOR_BOOKING_BODY_LIMIT_BYTES,
                routeName: "creator/bookings:POST",
                allowEmpty: false,
            });
            bookingRequest = createBookingSchema.parse(body);
        } catch (error) {
            if (isBoundedJsonBodyError(error)) {
                return buildBoundedBookingBodyResponse(error);
            }
            return buildBookingProblemResponse(new CreatorBookingProblem(
                400,
                "invalid_booking_request",
                "Check the booking details and try again.",
            ));
        }

        const { creatorId, serviceType, startAt, durationMinutes, idempotencyKey: rawIdempotencyKey } = bookingRequest;
        const bookingContext: CreatorBookingProblemContext = {
            creatorId,
            serviceType,
            durationMinutes,
            startAt,
        };
        if (creatorId === caller.uid) {
            return buildBookingProblemResponse(new CreatorBookingProblem(
                400,
                "invalid_booking_request",
                "Creator bookings are for fans only.",
                bookingContext,
            ));
        }

        const paidEventName = CREATOR_EXPERIENCE_PAID_EVENTS.live_time;
        const idempotencyKey = buildCreatorExperienceIdempotencyKey({
            action: "live_time",
            userId: caller.uid,
            creatorId,
            clientKey: rawIdempotencyKey,
            payloadParts: [serviceType, startAt, durationMinutes],
        });
        const recordIds = buildCreatorExperienceRecordIds({
            action: "live_time",
            idempotencyKey,
        });
        const actorMarker = assertKnownActor(buildActorMarker({
            actor: {
                uid: caller.uid,
                email: caller.email,
                role: "user",
            },
            performedAs: "own_account",
            surface: "creator_experiences",
            route: "/api/creator/bookings",
            actionKey: paidEventName,
            targetCreatorId: creatorId,
            occurredAt: Date.now(),
            dedupeKey: idempotencyKey,
            source: "creator_experience_transaction",
        }));

        const creatorRef = adminDb.collection("users").doc(creatorId);
        const userRef = adminDb.collection("users").doc(caller.uid);
        const bookingRef = adminDb.collection(CREATOR_COLLECTIONS.bookings).doc(recordIds.creatorExperienceRecordId);
        const ledgerRef = adminDb.collection(CREATOR_COLLECTIONS.ledgerAccruals).doc(recordIds.creatorAccrualId);
        const transactionRef = adminDb.collection("transactions").doc(recordIds.userTransactionId);

        const result = await adminDb.runTransaction(async (transaction) => {
            const [creatorSnap, userSnap, subscriptionSnap, bookingSnap, transactionSnap] = await Promise.all([
                transaction.get(creatorRef),
                transaction.get(userRef),
                transaction.get(adminDb.collection(CREATOR_COLLECTIONS.subscriptions).doc(`${caller.uid}__${creatorId}`)),
                transaction.get(bookingRef),
                transaction.get(transactionRef),
            ]);

            if (!creatorSnap.exists || !userSnap.exists) {
                throw new CreatorBookingProblem(
                    404,
                    "creator_or_user_not_found",
                    "Creator or user was not found.",
                    bookingContext,
                );
            }

            const creatorData = creatorSnap.data() as Record<string, unknown>;
            const userData = userSnap.data() as Record<string, unknown>;
            if (!isCreatorRole(creatorData.role) || creatorData.status === "suspended" || creatorData.status === "banned") {
                throw new CreatorBookingProblem(
                    403,
                    "creator_unavailable",
                    "This creator is unavailable right now.",
                    bookingContext,
                );
            }

            const creatorSettings = creatorData.creatorSettings && typeof creatorData.creatorSettings === "object"
                ? creatorData.creatorSettings as Record<string, unknown>
                : {};
            const subscriptionActive = subscriptionSnap.exists && (subscriptionSnap.data() as Record<string, unknown>).status === "active";
            const bookingPricing = resolveCreatorBookingPricing(creatorSettings, {
                serviceType,
                durationMinutes,
                subscriptionActive,
            });
            const creatorRestrictions = creatorData.creatorRestrictions && typeof creatorData.creatorRestrictions === "object"
                ? creatorData.creatorRestrictions as Record<string, unknown>
                : {};
            if (bookingPricing.enabled === false || creatorRestrictions.bookingsRestricted === true) {
                throw new CreatorBookingProblem(
                    409,
                    "bookings_unavailable",
                    "Bookings are not available for this creator right now.",
                    bookingContext,
                );
            }

            const windows = Array.isArray(creatorSettings.availabilityWindows)
                ? creatorSettings.availabilityWindows.filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
                : [];
            const availabilityTimezone = typeof creatorSettings.availabilityTimezone === "string" && creatorSettings.availabilityTimezone.trim().length > 0
                ? creatorSettings.availabilityTimezone.trim()
                : "UTC";
            if (windows.length === 0) {
                throw new CreatorBookingProblem(
                    409,
                    "creator_availability_not_configured",
                    "This creator has not set booking hours yet.",
                    bookingContext,
                );
            }
            if (!isWithinAnyWindow(startAt, durationMinutes, serviceType, windows, availabilityTimezone)) {
                throw new CreatorBookingProblem(
                    400,
                    "slot_outside_availability",
                    "Pick a time inside the creator's booking hours.",
                    bookingContext,
                );
            }

            const slotKey = buildBookingSlotKey({ creatorId, serviceType, startAt, durationMinutes });
            const priceGd = bookingPricing.priceGd;
            const balance = readSourceAwareBalance(userData);
            if (bookingSnap.exists || transactionSnap.exists) {
                const bookingData = bookingSnap.data() as Record<string, unknown> | undefined;
                const existingPrice = typeof bookingData?.priceGd === "number" ? bookingData.priceGd : priceGd;
                const existingAccrualId = typeof bookingData?.creatorAccrualId === "string" ? bookingData.creatorAccrualId : ledgerRef.id;

                return {
                    priceGd: existingPrice,
                    creatorAccrualId: existingAccrualId,
                    duplicatePrevented: true,
                    debug: buildCreatorExperienceTransactionDebug({
                        userTransactionId: transactionRef.id,
                        creatorAccrualId: existingAccrualId,
                        creatorExperienceRecordId: bookingRef.id,
                        priceGd: existingPrice,
                        idempotencyKey,
                        duplicatePrevented: true,
                        sourceAwareBalanceBefore: balance,
                        sourceAwareBalanceAfter: balance,
                    }),
                };
            }

            const existingBookingsSnap = await transaction.get(
                adminDb.collection(CREATOR_COLLECTIONS.bookings)
                    .where("creatorId", "==", creatorId)
                    .limit(CREATOR_BOOKINGS_READ_LIMIT),
            );
            const existingBookings = existingBookingsSnap.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as Record<string, unknown>),
            }));
            const generatedSlots = buildCreatorBookingSlots({
                availabilityWindows: windows,
                availabilityTimezone,
                serviceType,
                durationMinutes,
                bookingMinimumMinutes: typeof creatorSettings.bookingMinimumMinutes === "number"
                    ? creatorSettings.bookingMinimumMinutes
                    : CREATOR_BOOKING_MIN_MINUTES,
                existingBookings,
                nowMs: Date.now(),
            });
            const selectedGeneratedSlot = generatedSlots.slots.find((slot) => (
                slot.startAt === startAt
                && slot.durationMinutes === durationMinutes
                && slot.serviceType === serviceType
            ));
            if (!selectedGeneratedSlot) {
                throw new CreatorBookingProblem(
                    409,
                    "slot_unavailable",
                    "Pick one of the available creator time slots.",
                    bookingContext,
                );
            }

            const conflictingSnap = await transaction.get(
                adminDb.collection(CREATOR_COLLECTIONS.bookings)
                    .where("slotKey", "==", slotKey)
                    .where("status", "==", "booked")
                    .limit(1),
            );
            if (!conflictingSnap.empty) {
                throw new CreatorBookingProblem(
                    409,
                    "slot_already_booked",
                    "That time was just booked. Pick another slot.",
                    bookingContext,
                );
            }
            const spend = spendCreatorExperienceGumdrops(
                balance,
                priceGd,
                serviceType === "video" ? "booking_video" : "booking_phone",
            );
            if (!spend.ok) {
                const shortfallGd = Math.max(0, priceGd - balance.purchased);
                throw new CreatorBookingProblem(
                    402,
                    "insufficient_paid_gumdrops",
                    "You need more paid GumDrops to book this.",
                    {
                        ...bookingContext,
                        requiredPaidGd: priceGd,
                        priceGd,
                        paidBalanceGd: balance.purchased,
                        shortfallGd,
                    },
                );
            }

            const now = Date.now();
            const accrual = buildCreatorAccrual({
                creatorId,
                userId: caller.uid,
                sourceType: serviceType === "video" ? "booking_video" : "booking_phone",
                sourceId: bookingRef.id,
                grossSpendGd: priceGd,
                createdAt: now,
            });
            const debug = buildCreatorExperienceTransactionDebug({
                userTransactionId: transactionRef.id,
                creatorAccrualId: ledgerRef.id,
                creatorExperienceRecordId: bookingRef.id,
                priceGd,
                idempotencyKey,
                duplicatePrevented: false,
                sourceAwareBalanceBefore: balance,
                sourceAwareBalanceAfter: spend.next,
            });
            const attribution = buildCreatorExperienceAttribution({
                creatorId,
                userId: caller.uid,
                sourceType: serviceType === "video" ? "booking_video" : "booking_phone",
                sourceId: bookingRef.id,
                grossSpendGd: priceGd,
                purchasedAmountSpent: spend.purchasedSpent,
                rewardAmountSpent: spend.rewardSpent,
                userTransactionId: transactionRef.id,
                creatorAccrualId: ledgerRef.id,
                creatorExperienceRecordId: bookingRef.id,
                idempotencyKey,
                sourceAwareBalanceBefore: balance,
                sourceAwareBalanceAfter: spend.next,
            });
            const attributionExtra = buildCreatorExperienceTransactionAttributionExtra(attribution);

            transaction.update(userRef, buildSourceAwareBalancePatch(spend.next));
            transaction.set(bookingRef, {
                creatorId,
                userId: caller.uid,
                serviceType,
                status: "booked",
                startAt,
                endAt: startAt + (durationMinutes * 60 * 1000),
                durationMinutes,
                slotKey,
                priceGd,
                priceSource: bookingPricing.source,
                paidOnlyPolicy: bookingPricing.paidOnly,
                ratePerMinuteGd: bookingPricing.ratePerMinuteGd,
                subscriberDiscountApplied: subscriptionActive && serviceType === "video",
                creatorAccrualId: ledgerRef.id,
                userTransactionId: transactionRef.id,
                idempotencyKey,
                duplicatePrevented: false,
                transactionDebug: debug,
                createdAt: now,
            });
            transaction.set(ledgerRef, {
                ...accrual,
                ...attributionExtra,
                userTransactionId: transactionRef.id,
                creatorExperienceRecordId: bookingRef.id,
                idempotencyKey,
                platformShareGd: attribution.platformShareGd,
            });
            transaction.set(transactionRef, buildCompletedGumdropTransaction({
                userId: caller.uid,
                type: serviceType === "video" ? "creator_booking_video" : "creator_booking_phone",
                amount: -priceGd,
                creatorId,
                description: `Creator ${serviceType} booking`,
                balanceBefore: balance.total,
                balanceAfter: spend.next.total,
                timestampMs: now,
                extra: {
                    ...attributionExtra,
                    creatorRevenueShareGd: accrual.creatorShareGd,
                    creatorRevenueShareUsd: accrual.cashoutValueUsd,
                    idempotencyKey,
                    duplicatePrevented: false,
                },
            }));

            return {
                priceGd,
                creatorAccrualId: ledgerRef.id,
                duplicatePrevented: false,
                debug,
            };
        });

        await Promise.allSettled([
            trackServerEvent("creator_call_booking_created", {
                ...buildCreatorExperienceTelemetryPayload({
                    marker: actorMarker,
                    creatorId,
                    priceGd: result.priceGd,
                    idempotencyKey,
                    duplicatePrevented: result.duplicatePrevented,
                    userTransactionId: result.debug.userTransactionId,
                    creatorAccrualId: result.creatorAccrualId,
                    creatorExperienceRecordId: result.debug.creatorExperienceRecordId,
                    extra: {
                        service_type: serviceType,
                    },
                }),
                creator_id: creatorId,
                service_type: serviceType,
                spend_gd: result.priceGd,
                transaction_id: result.debug.userTransactionId,
            }, caller.uid),
            trackServerEvent(paidEventName, buildCreatorExperienceTelemetryPayload({
                marker: actorMarker,
                creatorId,
                priceGd: result.priceGd,
                idempotencyKey,
                duplicatePrevented: result.duplicatePrevented,
                userTransactionId: result.debug.userTransactionId,
                creatorAccrualId: result.creatorAccrualId,
                creatorExperienceRecordId: result.debug.creatorExperienceRecordId,
                extra: {
                    service_type: serviceType,
                },
            }), caller.uid),
            trackServerEvent("creator_ledger_accrual_created", {
                ...buildCreatorExperienceTelemetryPayload({
                    marker: actorMarker,
                    creatorId,
                    priceGd: result.priceGd,
                    idempotencyKey,
                    duplicatePrevented: result.duplicatePrevented,
                    userTransactionId: result.debug.userTransactionId,
                    creatorAccrualId: result.creatorAccrualId,
                    creatorExperienceRecordId: result.debug.creatorExperienceRecordId,
                }),
                creator_id: creatorId,
                source_type: serviceType === "video" ? "booking_video" : "booking_phone",
                accrual_id: result.creatorAccrualId,
                spend_gd: result.priceGd,
            }, caller.uid),
        ]);

        return NextResponse.json({
            success: true,
            duplicatePrevented: result.duplicatePrevented,
            debug: result.debug,
        });
    } catch (error) {
        if (error instanceof CreatorBookingProblem) {
            return buildBookingProblemResponse(error);
        }
        if (isAuthUnauthorized(error)) {
            return buildBookingProblemResponse(new CreatorBookingProblem(
                401,
                "unauthorized",
                "Sign in to book creator live time.",
            ));
        }
        return handleApiError(error, "Creator.Bookings.POST");
    }
}

async function PUT_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/bookings",
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

        const body = await readBoundedJsonBody<z.infer<typeof updateBookingSchema>>(request, {
            maxBytes: CREATOR_BOOKING_BODY_LIMIT_BYTES,
            routeName: "creator/bookings:PUT",
            allowEmpty: false,
        });
        const { bookingId, action } = updateBookingSchema.parse(body);
        const isAdmin = callerData?.role === "admin";

        const bookingRef = adminDb.collection(CREATOR_COLLECTIONS.bookings).doc(bookingId);
        const bookingSnap = await bookingRef.get();
        if (!bookingSnap.exists) {
            return buildNotFoundResponse("booking", "Booking not found");
        }

        const bookingData = bookingSnap.data() as Record<string, unknown>;
        const isCreatorOwner = bookingData.creatorId === caller.uid;
        const isUserOwner = bookingData.userId === caller.uid;
        if (!isCreatorOwner && !isUserOwner && !isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const nextStatus = action === "complete" ? "completed" : "canceled";
        await bookingRef.set({
            status: nextStatus,
            updatedAt: Date.now(),
        }, { merge: true });

        if (action === "complete") {
            await trackServerEvent("creator_call_booking_completed", {
                creator_id: String(bookingData.creatorId || ""),
                booking_id: bookingId,
            }, String(bookingData.userId || "")).catch(() => null);
        }

        return NextResponse.json({ success: true, status: nextStatus });
    } catch (error) {
        if (isBoundedJsonBodyError(error)) {
            return buildBoundedBookingBodyResponse(error);
        }
        return handleApiError(error, "Creator.Bookings.PUT");
    }
}

export let GET = withRouteRuntimeHealth("creator/bookings:GET", GET_handler);
export let POST = withRouteRuntimeHealth("creator/bookings:POST", POST_handler);
export let PUT = withRouteRuntimeHealth("creator/bookings:PUT", PUT_handler);
