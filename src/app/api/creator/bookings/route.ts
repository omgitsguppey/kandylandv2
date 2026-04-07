import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { CREATOR_BOOKING_MIN_MINUTES, CREATOR_COLLECTIONS, isCreatorRole } from "@/lib/creator-experiences";
import { buildBookingSlotKey, buildCreatorAccrual, buildSourceAwareBalancePatch, calculateBookingPriceGd, readSourceAwareBalance, spendCreatorExperienceGumdrops } from "@/lib/server/creator-experiences";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";
import { trackServerEvent } from "@/lib/server/analytics";

const createBookingSchema = z.object({
    creatorId: z.string().trim().min(1),
    serviceType: z.enum(["phone", "video"]),
    startAt: z.number().finite(),
    durationMinutes: z.number().int().min(CREATOR_BOOKING_MIN_MINUTES),
});

const updateBookingSchema = z.object({
    bookingId: z.string().trim().min(1),
    action: z.enum(["complete", "cancel"]),
});

function minutesSinceMidnight(timestamp: number) {
    const date = new Date(timestamp);
    return (date.getUTCHours() * 60) + date.getUTCMinutes();
}

function isWithinAnyWindow(startAt: number, durationMinutes: number, serviceType: "phone" | "video", windows: Array<Record<string, unknown>>) {
    const date = new Date(startAt);
    const dayOfWeek = date.getUTCDay();
    const startMinutes = minutesSinceMidnight(startAt);
    const endMinutes = startMinutes + durationMinutes;

    return windows.some((window) => {
        const services = Array.isArray(window.serviceTypes)
            ? window.serviceTypes.filter((entry): entry is "phone" | "video" => entry === "phone" || entry === "video")
            : [];
        if (!services.includes(serviceType)) {
            return false;
        }
        const windowDay = typeof window.dayOfWeek === "number" ? Math.round(window.dayOfWeek) : -1;
        const windowStart = ((typeof window.startHour === "number" ? Math.round(window.startHour) : 0) * 60)
            + (typeof window.startMinute === "number" ? Math.round(window.startMinute) : 0);
        const windowEnd = ((typeof window.endHour === "number" ? Math.round(window.endHour) : 0) * 60)
            + (typeof window.endMinute === "number" ? Math.round(window.endMinute) : 0);

        return windowDay === dayOfWeek && startMinutes >= windowStart && endMinutes <= windowEnd;
    });
}

export async function GET(request: NextRequest) {
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

export async function POST(request: NextRequest) {
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

        const { creatorId, serviceType, startAt, durationMinutes } = createBookingSchema.parse(await request.json());
        if (creatorId === caller.uid) {
            return NextResponse.json({ error: "Creator bookings are for fans only." }, { status: 400 });
        }

        const creatorRef = adminDb.collection("users").doc(creatorId);
        const userRef = adminDb.collection("users").doc(caller.uid);
        const bookingRef = adminDb.collection(CREATOR_COLLECTIONS.bookings).doc();
        const ledgerRef = adminDb.collection(CREATOR_COLLECTIONS.ledgerAccruals).doc();
        const transactionRef = adminDb.collection("transactions").doc();

        const result = await adminDb.runTransaction(async (transaction) => {
            const [creatorSnap, userSnap, subscriptionSnap] = await Promise.all([
                transaction.get(creatorRef),
                transaction.get(userRef),
                transaction.get(adminDb.collection(CREATOR_COLLECTIONS.subscriptions).doc(`${caller.uid}__${creatorId}`)),
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
            if (!isWithinAnyWindow(startAt, durationMinutes, serviceType, windows)) {
                throw new Error("That slot is outside the creator's availability.");
            }

            const slotKey = buildBookingSlotKey({ creatorId, serviceType, startAt, durationMinutes });
            const conflictingSnap = await transaction.get(
                adminDb.collection(CREATOR_COLLECTIONS.bookings)
                    .where("slotKey", "==", slotKey)
                    .where("status", "==", "booked")
                    .limit(1),
            );
            if (!conflictingSnap.empty) {
                throw new Error("That slot was already booked.");
            }

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
                createdAt: now,
            });
            transaction.set(ledgerRef, accrual);
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
                },
            }));

            return {
                priceGd,
                creatorAccrualId: ledgerRef.id,
            };
        });

        await Promise.allSettled([
            trackServerEvent("creator_call_booking_created", {
                creator_id: creatorId,
                service_type: serviceType,
                spend_gd: result.priceGd,
                transaction_id: `${caller.uid}:${creatorId}:${serviceType}:${startAt}`,
            }, caller.uid),
            trackServerEvent("creator_ledger_accrual_created", {
                creator_id: creatorId,
                source_type: serviceType === "video" ? "booking_video" : "booking_phone",
                accrual_id: result.creatorAccrualId,
                spend_gd: result.priceGd,
            }, caller.uid),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Creator.Bookings.POST");
    }
}

export async function PUT(request: NextRequest) {
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
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
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
