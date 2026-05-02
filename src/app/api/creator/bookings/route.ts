import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { CREATOR_BOOKING_MIN_MINUTES, CREATOR_COLLECTIONS, isCreatorRole } from "@/lib/creator-experiences";
import {
    CREATOR_EXPERIENCE_PAID_EVENTS,
    buildBookingSlotKey,
    buildCreatorAccrual,
    buildCreatorExperienceIdempotencyKey,
    buildCreatorExperienceRecordIds,
    buildCreatorExperienceTelemetryPayload,
    buildCreatorExperienceTransactionDebug,
    buildSourceAwareBalancePatch,
    calculateBookingPriceGd,
    readSourceAwareBalance,
    spendCreatorExperienceGumdrops,
} from "@/lib/server/creator-experiences";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";
import { trackServerEvent } from "@/lib/server/analytics";
import { isWithinAnyWindow } from "./booking-timezone";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { buildNotFoundResponse } from "@/lib/server/not-found";
import { assertKnownActor, buildActorMarker } from "@/lib/identity/actor-markers";

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
        const callerIsCreator = isCreatorRole(callerData?.role);
        const callerIsAdmin = callerData?.role === "admin";
        const creatorId = request.nextUrl.searchParams.get("creatorId")?.trim() || "";
        if (creatorId) {
            const bookingsQuery = (!callerIsAdmin && caller.uid !== creatorId)
                ? adminDb.collection(CREATOR_COLLECTIONS.bookings)
                    .where("creatorId", "==", creatorId)
                    .where("userId", "==", caller.uid)
                : adminDb.collection(CREATOR_COLLECTIONS.bookings)
                    .where("creatorId", "==", creatorId);

            const [creatorSnap, bookingsSnap, subscriptionSnap] = await Promise.all([
                adminDb.collection("users").doc(creatorId).get(),
                bookingsQuery.get(),
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
        const bookingsSnap = await adminDb.collection(CREATOR_COLLECTIONS.bookings).where(field, "==", caller.uid).get();

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
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { creatorId, serviceType, startAt, durationMinutes, idempotencyKey: rawIdempotencyKey } = createBookingSchema.parse(await request.json());
        if (creatorId === caller.uid) {
            return NextResponse.json({ error: "Creator bookings are for fans only." }, { status: 400 });
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
                throw new Error("Creator or user not found");
            }

            const creatorData = creatorSnap.data() as Record<string, unknown>;
            const userData = userSnap.data() as Record<string, unknown>;
            if (!isCreatorRole(creatorData.role) || creatorData.status === "suspended" || creatorData.status === "banned") {
                throw new Error("Creator unavailable");
            }

            const creatorSettings = creatorData.creatorSettings && typeof creatorData.creatorSettings === "object"
                ? creatorData.creatorSettings as Record<string, unknown>
                : {};
            const creatorRestrictions = creatorData.creatorRestrictions && typeof creatorData.creatorRestrictions === "object"
                ? creatorData.creatorRestrictions as Record<string, unknown>
                : {};
            if (creatorSettings.bookingsEnabled === false || creatorRestrictions.bookingsRestricted === true) {
                throw new Error("Bookings are unavailable for this creator.");
            }

            const windows = Array.isArray(creatorSettings.availabilityWindows)
                ? creatorSettings.availabilityWindows.filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
                : [];
            const availabilityTimezone = typeof creatorSettings.availabilityTimezone === "string" && creatorSettings.availabilityTimezone.trim().length > 0
                ? creatorSettings.availabilityTimezone.trim()
                : "UTC";
            if (!isWithinAnyWindow(startAt, durationMinutes, serviceType, windows, availabilityTimezone)) {
                throw new Error("That slot is outside the creator's availability.");
            }

            const slotKey = buildBookingSlotKey({ creatorId, serviceType, startAt, durationMinutes });
            const subscriptionActive = subscriptionSnap.exists && (subscriptionSnap.data() as Record<string, unknown>).status === "active";
            const priceGd = calculateBookingPriceGd({
                serviceType,
                durationMinutes,
                subscriptionActive,
                videoDiscountPercent: typeof creatorSettings.videoSubscriberDiscountPercent === "number"
                    ? creatorSettings.videoSubscriberDiscountPercent
                    : undefined,
            });
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
            const conflictingSnap = await transaction.get(
                adminDb.collection(CREATOR_COLLECTIONS.bookings)
                    .where("slotKey", "==", slotKey)
                    .where("status", "==", "booked")
                    .limit(1),
            );
            if (!conflictingSnap.empty) {
                throw new Error("That slot was already booked.");
            }
            const spend = spendCreatorExperienceGumdrops(
                balance,
                priceGd,
                serviceType === "video" ? "booking_video" : "booking_phone",
            );
            if (!spend.ok) {
                throw new Error(spend.error);
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
                userTransactionId: transactionRef.id,
                creatorExperienceRecordId: bookingRef.id,
                idempotencyKey,
                platformShareGd: debug.platformShareGd,
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
                    purchasedAmountSpent: spend.purchasedSpent,
                    rewardAmountSpent: spend.rewardSpent,
                    ledgerSource: spend.ledgerSource,
                    creatorRevenueShareGd: accrual.creatorShareGd,
                    creatorRevenueShareUsd: accrual.cashoutValueUsd,
                    creatorAccrualId: ledgerRef.id,
                    creatorExperienceRecordId: bookingRef.id,
                    idempotencyKey,
                    duplicatePrevented: false,
                    userTransactionId: transactionRef.id,
                    platformShareGd: debug.platformShareGd,
                    sourceAwareBalanceBefore: balance,
                    sourceAwareBalanceAfter: spend.next,
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

        const { bookingId, action } = updateBookingSchema.parse(await request.json());
        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
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
        return handleApiError(error, "Creator.Bookings.PUT");
    }
}

export let GET = withRouteRuntimeHealth("creator/bookings:GET", GET_handler);
export let POST = withRouteRuntimeHealth("creator/bookings:POST", POST_handler);
export let PUT = withRouteRuntimeHealth("creator/bookings:PUT", PUT_handler);
