import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { CREATOR_COLLECTIONS, CREATOR_SUBSCRIPTION_MIN_GD, isCreatorRole } from "@/lib/creator-experiences";
import { buildCreatorAccrual, buildSourceAwareBalancePatch, readSourceAwareBalance, spendSourceAwareGumdrops } from "@/lib/server/creator-experiences";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";
import { trackServerEvent } from "@/lib/server/analytics";

const subscriptionActionSchema = z.object({
    creatorId: z.string().trim().min(1),
    action: z.enum(["subscribe", "cancel"]),
});

function buildSubscriptionId(userId: string, creatorId: string) {
    return `${userId}__${creatorId}`;
}

export async function GET(request: NextRequest) {
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
        const inbound = isCreatorRole(callerData?.role) ? inboundSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) })) : [];

        return NextResponse.json({
            success: true,
            subscriptions: outboundSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) })),
            subscribers: inbound,
        });
    } catch (error) {
        return handleApiError(error, "Creator.Subscriptions.GET");
    }
}

export async function POST(request: NextRequest) {
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

        const { creatorId, action } = subscriptionActionSchema.parse(await request.json());
        if (creatorId === caller.uid) {
            return NextResponse.json({ error: "You cannot subscribe to yourself." }, { status: 400 });
        }

        const creatorRef = adminDb.collection("users").doc(creatorId);
        const userRef = adminDb.collection("users").doc(caller.uid);
        const subscriptionRef = adminDb.collection(CREATOR_COLLECTIONS.subscriptions).doc(buildSubscriptionId(caller.uid, creatorId));
        const ledgerRef = adminDb.collection(CREATOR_COLLECTIONS.ledgerAccruals).doc();
        const transactionRef = adminDb.collection("transactions").doc();

        const result = await adminDb.runTransaction(async (transaction) => {
            const [creatorSnap, userSnap, subscriptionSnap] = await Promise.all([
                transaction.get(creatorRef),
                transaction.get(userRef),
                transaction.get(subscriptionRef),
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
                };
            }

            const priceGd = Math.max(
                CREATOR_SUBSCRIPTION_MIN_GD,
                typeof creatorSettings.subscriptionPriceGd === "number" ? Math.round(creatorSettings.subscriptionPriceGd) : CREATOR_SUBSCRIPTION_MIN_GD,
            );
            const balance = readSourceAwareBalance(userData);
            const spend = spendSourceAwareGumdrops(balance, priceGd, { purchasedOnly: true });
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
            }, { merge: true });
            transaction.set(ledgerRef, accrual);
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
                    ledgerSource: "purchased",
                    creatorRevenueShareGd: accrual.creatorShareGd,
                    creatorRevenueShareUsd: accrual.cashoutValueUsd,
                    creatorAccrualId: ledgerRef.id,
                },
            }));

            return {
                action: "subscribe" as const,
                priceGd,
                renewAt,
                creatorAccrualId: ledgerRef.id,
            };
        });

        const eventName = result.action === "cancel" ? "creator_subscription_canceled" : "creator_subscription_started";
        await Promise.allSettled([
            trackServerEvent(eventName, {
                creator_id: creatorId,
                spend_gd: result.priceGd,
                transaction_id: `${caller.uid}:${creatorId}:${result.action}`,
            }, caller.uid),
            result.action === "subscribe" && result.creatorAccrualId
                ? trackServerEvent("creator_ledger_accrual_created", {
                    creator_id: creatorId,
                    source_type: "subscription",
                    accrual_id: result.creatorAccrualId,
                    spend_gd: result.priceGd,
                }, caller.uid)
                : Promise.resolve(null),
        ]);

        return NextResponse.json({ success: true, action: result.action });
    } catch (error) {
        return handleApiError(error, "Creator.Subscriptions.POST");
    }
}
