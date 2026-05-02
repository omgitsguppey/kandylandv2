import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { CREATOR_COLLECTIONS, CREATOR_SUBSCRIPTION_MIN_GD, isCreatorOrAdminRole, isCreatorRole } from "@/lib/creator-experiences";
import {
    CREATOR_EXPERIENCE_PAID_EVENTS,
    buildCreatorAccrual,
    buildCreatorExperienceIdempotencyKey,
    buildCreatorExperienceRecordIds,
    buildCreatorExperienceTelemetryPayload,
    buildCreatorExperienceTransactionDebug,
    buildSourceAwareBalancePatch,
    readSourceAwareBalance,
    spendCreatorExperienceGumdrops,
} from "@/lib/server/creator-experiences";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";
import { trackServerEvent } from "@/lib/server/analytics";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { assertKnownActor, buildActorMarker } from "@/lib/identity/actor-markers";

const subscriptionActionSchema = z.object({
    creatorId: z.string().trim().min(1),
    action: z.enum(["subscribe", "cancel"]),
    idempotencyKey: z.string().trim().max(180).optional(),
});

function buildSubscriptionId(userId: string, creatorId: string) {
    return `${userId}__${creatorId}`;
}

async function GET_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/subscriptions",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const creatorId = request.nextUrl.searchParams.get("creatorId")?.trim() || "";
        if (creatorId) {
            const snap = await adminDb.collection(CREATOR_COLLECTIONS.subscriptions).doc(buildSubscriptionId(caller.uid, creatorId)).get();
            return NextResponse.json({
                success: true,
                subscription: snap.exists ? { id: snap.id, ...(snap.data() as Record<string, unknown>) } : null,
            });
        }

        const [outboundSnap, inboundSnap, callerSnap] = await Promise.all([
            adminDb.collection(CREATOR_COLLECTIONS.subscriptions).where("userId", "==", caller.uid).get(),
            adminDb.collection(CREATOR_COLLECTIONS.subscriptions).where("creatorId", "==", caller.uid).get(),
            adminDb.collection("users").doc(caller.uid).get(),
        ]);
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const inbound = isCreatorOrAdminRole(callerData?.role) ? inboundSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) })) : [];

        return NextResponse.json({
            success: true,
            subscriptions: outboundSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) })),
            subscribers: inbound,
        });
    } catch (error) {
        return handleApiError(error, "Creator.Subscriptions.GET");
    }
}

async function POST_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/subscriptions",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { creatorId, action, idempotencyKey: rawIdempotencyKey } = subscriptionActionSchema.parse(await request.json());
        if (creatorId === caller.uid) {
            return NextResponse.json({ error: "You cannot subscribe to yourself." }, { status: 400 });
        }

        const paidEventName = CREATOR_EXPERIENCE_PAID_EVENTS.fan_pass;
        const idempotencyKey = buildCreatorExperienceIdempotencyKey({
            action: "fan_pass",
            userId: caller.uid,
            creatorId,
            clientKey: rawIdempotencyKey,
            payloadParts: [action],
        });
        const recordIds = buildCreatorExperienceRecordIds({
            action: "fan_pass",
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
            route: "/api/creator/subscriptions",
            actionKey: action === "cancel" ? "creator_fan_pass_canceled" : paidEventName,
            targetCreatorId: creatorId,
            occurredAt: Date.now(),
            dedupeKey: idempotencyKey,
            source: "creator_experience_transaction",
        }));

        const creatorRef = adminDb.collection("users").doc(creatorId);
        const userRef = adminDb.collection("users").doc(caller.uid);
        const subscriptionRef = adminDb.collection(CREATOR_COLLECTIONS.subscriptions).doc(buildSubscriptionId(caller.uid, creatorId));
        const ledgerRef = adminDb.collection(CREATOR_COLLECTIONS.ledgerAccruals).doc(recordIds.creatorAccrualId);
        const transactionRef = adminDb.collection("transactions").doc(recordIds.userTransactionId);

        const result = await adminDb.runTransaction(async (transaction) => {
            const [creatorSnap, userSnap, subscriptionSnap, transactionSnap] = await Promise.all([
                transaction.get(creatorRef),
                transaction.get(userRef),
                transaction.get(subscriptionRef),
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
            const subscriptionsEnabled = creatorSettings.subscriptionsEnabled !== false;
            const subscriptionsRestricted = creatorData.creatorRestrictions && typeof creatorData.creatorRestrictions === "object"
                ? (creatorData.creatorRestrictions as Record<string, unknown>).subscriptionsRestricted === true
                : false;
            if (!subscriptionsEnabled || subscriptionsRestricted) {
                throw new Error("Subscriptions are unavailable for this creator");
            }

            if (action === "cancel") {
                if (subscriptionSnap.exists) {
                    transaction.set(subscriptionRef, {
                        status: "canceled",
                        canceledAt: Date.now(),
                        autoRenew: false,
                    }, { merge: true });
                }
                return {
                    action: "cancel" as const,
                    priceGd: 0,
                    duplicatePrevented: false,
                    debug: buildCreatorExperienceTransactionDebug({
                        ...recordIds,
                        priceGd: 0,
                        idempotencyKey,
                        duplicatePrevented: false,
                    }),
                };
            }

            const priceGd = Math.max(
                CREATOR_SUBSCRIPTION_MIN_GD,
                typeof creatorSettings.subscriptionPriceGd === "number" ? Math.round(creatorSettings.subscriptionPriceGd) : CREATOR_SUBSCRIPTION_MIN_GD,
            );
            const balance = readSourceAwareBalance(userData);
            if (transactionSnap.exists || (subscriptionSnap.exists && (subscriptionSnap.data() as Record<string, unknown>).status === "active")) {
                return {
                    action: "subscribe" as const,
                    priceGd,
                    renewAt: typeof (subscriptionSnap.data() as Record<string, unknown> | undefined)?.renewAt === "number"
                        ? (subscriptionSnap.data() as Record<string, unknown>).renewAt as number
                        : null,
                    creatorAccrualId: typeof (subscriptionSnap.data() as Record<string, unknown> | undefined)?.creatorAccrualId === "string"
                        ? (subscriptionSnap.data() as Record<string, unknown>).creatorAccrualId as string
                        : recordIds.creatorAccrualId,
                    duplicatePrevented: true,
                    debug: buildCreatorExperienceTransactionDebug({
                        ...recordIds,
                        creatorAccrualId: typeof (subscriptionSnap.data() as Record<string, unknown> | undefined)?.creatorAccrualId === "string"
                            ? (subscriptionSnap.data() as Record<string, unknown>).creatorAccrualId as string
                            : recordIds.creatorAccrualId,
                        priceGd,
                        idempotencyKey,
                        duplicatePrevented: true,
                        sourceAwareBalanceBefore: balance,
                        sourceAwareBalanceAfter: balance,
                    }),
                };
            }
            const spend = spendCreatorExperienceGumdrops(balance, priceGd, "subscription");
            if (!spend.ok) {
                throw new Error(spend.error);
            }

            const now = Date.now();
            const renewAt = now + (30 * 24 * 60 * 60 * 1000);
            const accrual = buildCreatorAccrual({
                creatorId,
                userId: caller.uid,
                sourceType: "subscription",
                sourceId: subscriptionRef.id,
                grossSpendGd: priceGd,
                createdAt: now,
            });
            const debug = buildCreatorExperienceTransactionDebug({
                userTransactionId: transactionRef.id,
                creatorAccrualId: ledgerRef.id,
                creatorExperienceRecordId: subscriptionRef.id,
                priceGd,
                idempotencyKey,
                duplicatePrevented: false,
                sourceAwareBalanceBefore: balance,
                sourceAwareBalanceAfter: spend.next,
            });

            transaction.update(userRef, buildSourceAwareBalancePatch(spend.next));
            transaction.set(subscriptionRef, {
                creatorId,
                userId: caller.uid,
                status: "active",
                priceGd,
                startedAt: now,
                renewAt,
                renewedAt: now,
                autoRenew: true,
                purchasedOnly: true,
                userTransactionId: transactionRef.id,
                creatorAccrualId: ledgerRef.id,
                idempotencyKey,
                duplicatePrevented: false,
                transactionDebug: debug,
            }, { merge: true });
            transaction.set(ledgerRef, {
                ...accrual,
                userTransactionId: transactionRef.id,
                creatorExperienceRecordId: subscriptionRef.id,
                idempotencyKey,
                platformShareGd: debug.platformShareGd,
            });
            transaction.set(transactionRef, buildCompletedGumdropTransaction({
                userId: caller.uid,
                type: "creator_subscription",
                amount: -priceGd,
                creatorId,
                description: `Creator subscription: ${typeof creatorData.displayName === "string" ? creatorData.displayName : "Creator"}`,
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
                    creatorExperienceRecordId: subscriptionRef.id,
                    idempotencyKey,
                    duplicatePrevented: false,
                    userTransactionId: transactionRef.id,
                    platformShareGd: debug.platformShareGd,
                    sourceAwareBalanceBefore: balance,
                    sourceAwareBalanceAfter: spend.next,
                },
            }));

            return {
                action: "subscribe" as const,
                priceGd,
                renewAt,
                creatorAccrualId: ledgerRef.id,
                duplicatePrevented: false,
                debug,
            };
        });

        const eventName = result.action === "cancel" ? "creator_subscription_canceled" : "creator_subscription_started";
        await Promise.allSettled([
            trackServerEvent(eventName, {
                ...buildCreatorExperienceTelemetryPayload({
                    marker: actorMarker,
                    creatorId,
                    priceGd: result.priceGd,
                    idempotencyKey,
                    duplicatePrevented: result.duplicatePrevented,
                    userTransactionId: result.debug.userTransactionId,
                    creatorAccrualId: result.debug.creatorAccrualId,
                    creatorExperienceRecordId: result.debug.creatorExperienceRecordId,
                }),
                creator_id: creatorId,
                spend_gd: result.priceGd,
                transaction_id: result.debug.userTransactionId,
            }, caller.uid),
            result.action === "subscribe"
                ? trackServerEvent(paidEventName, buildCreatorExperienceTelemetryPayload({
                    marker: actorMarker,
                    creatorId,
                    priceGd: result.priceGd,
                    idempotencyKey,
                    duplicatePrevented: result.duplicatePrevented,
                    userTransactionId: result.debug.userTransactionId,
                    creatorAccrualId: result.debug.creatorAccrualId,
                    creatorExperienceRecordId: result.debug.creatorExperienceRecordId,
                }), caller.uid)
                : Promise.resolve(null),
            result.action === "subscribe" && result.creatorAccrualId
                ? trackServerEvent("creator_ledger_accrual_created", {
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
                    source_type: "subscription",
                    accrual_id: result.creatorAccrualId,
                    spend_gd: result.priceGd,
                }, caller.uid)
                : Promise.resolve(null),
        ]);

        return NextResponse.json({
            success: true,
            action: result.action,
            duplicatePrevented: result.duplicatePrevented,
            debug: result.debug,
        });
    } catch (error) {
        return handleApiError(error, "Creator.Subscriptions.POST");
    }
}

export let GET = withRouteRuntimeHealth("creator/subscriptions:GET", GET_handler);
export let POST = withRouteRuntimeHealth("creator/subscriptions:POST", POST_handler);
