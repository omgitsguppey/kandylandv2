import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { CRON } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { CREATOR_COLLECTIONS, CREATOR_SUBSCRIPTION_MIN_GD, isCreatorRole } from "@/lib/creator-experiences";
import { buildCreatorPublicHref } from "@/lib/creator-profile-routing";
import { buildCreatorAccrual, buildSourceAwareBalancePatch, readSourceAwareBalance, spendCreatorExperienceGumdrops } from "@/lib/server/creator-experiences";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";
import { trackServerEvent } from "@/lib/server/analytics";
import { markNotificationsRuntimeChanged } from "@/lib/server/notification-runtime";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

const SUBSCRIPTION_TERM_MS = 30 * 24 * 60 * 60 * 1000;
const WARNING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const USER_PREFETCH_CHUNK_SIZE = 100;
const USER_PREFETCH_CONCURRENCY = 3;

type RenewalOutcome =
    | { status: "warned"; creatorId: string; userId: string }
    | { status: "renewed"; creatorId: string; userId: string; amount: number; creatorAccrualId: string }
    | { status: "failed"; creatorId: string; userId: string; amount: number };

async function GET_handler(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "cron/process-creator-subscriptions",
            rateLimit: CRON,
        });

        const cronSecret = process.env.CRON_SECRET?.trim();
        const authHeader = request.headers.get("authorization");

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            if (!cronSecret) {
                recordRouteWarning("cron/process-creator-subscriptions", "CRON_SECRET missing", {
                    routeName: "cron/process-creator-subscriptions",
                });
            }
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const now = Date.now();
        const subscriptionsSnap = await adminDb.collection(CREATOR_COLLECTIONS.subscriptions)
            .where("status", "==", "active")
            .get();

        const outcomes: RenewalOutcome[] = [];

        // Pre-fetch users for warnings to avoid N+1 queries
        const userIdsToFetch = new Set<string>();
        for (const subscriptionDoc of subscriptionsSnap.docs) {
            const subscriptionData = subscriptionDoc.data() as Record<string, unknown>;
            const creatorId = typeof subscriptionData.creatorId === "string" ? subscriptionData.creatorId : "";
            const userId = typeof subscriptionData.userId === "string" ? subscriptionData.userId : "";
            const autoRenew = subscriptionData.autoRenew !== false;
            const renewAt = typeof subscriptionData.renewAt === "number" ? subscriptionData.renewAt : 0;

            if (!creatorId || !userId || !autoRenew || renewAt <= 0) {
                continue;
            }

            const cycleKey = String(renewAt);
            const lastWarningCycleKey = typeof subscriptionData.warningCycleKey === "string" ? subscriptionData.warningCycleKey : "";

            if (renewAt > now && renewAt - now <= WARNING_WINDOW_MS && lastWarningCycleKey !== cycleKey) {
                userIdsToFetch.add(creatorId);
                userIdsToFetch.add(userId);
            }
        }

        const userSnapshots = new Map<string, FirebaseFirestore.DocumentSnapshot>();
        const userIdsArray = Array.from(userIdsToFetch);

        // Fetch in bounded concurrent waves to reduce wall-clock time without issuing every chunk at once.
        for (let waveStart = 0; waveStart < userIdsArray.length; waveStart += USER_PREFETCH_CHUNK_SIZE * USER_PREFETCH_CONCURRENCY) {
            const chunkReads: Array<Promise<FirebaseFirestore.DocumentSnapshot[]>> = [];

            for (let chunkStart = waveStart; chunkStart < Math.min(userIdsArray.length, waveStart + (USER_PREFETCH_CHUNK_SIZE * USER_PREFETCH_CONCURRENCY)); chunkStart += USER_PREFETCH_CHUNK_SIZE) {
                const chunk = userIdsArray.slice(chunkStart, chunkStart + USER_PREFETCH_CHUNK_SIZE);
                const refs = chunk.map((id) => adminDb.collection("users").doc(id));
                chunkReads.push(adminDb.getAll(...refs));
            }

            const chunkSnapshots = await Promise.all(chunkReads);
            for (const snaps of chunkSnapshots) {
                for (const snap of snaps) {
                    userSnapshots.set(snap.id, snap);
                }
            }
        }

        const docsArray = subscriptionsSnap.docs;
        const chunkSize = 20;

        for (let i = 0; i < docsArray.length; i += chunkSize) {
            const chunk = docsArray.slice(i, i + chunkSize);

            await Promise.all(chunk.map(async (subscriptionDoc) => {
                const subscriptionData = subscriptionDoc.data() as Record<string, unknown>;
                const creatorId = typeof subscriptionData.creatorId === "string" ? subscriptionData.creatorId : "";
                const userId = typeof subscriptionData.userId === "string" ? subscriptionData.userId : "";
                const autoRenew = subscriptionData.autoRenew !== false;
                const renewAt = typeof subscriptionData.renewAt === "number" ? subscriptionData.renewAt : 0;
                const priceGd = Math.max(
                    CREATOR_SUBSCRIPTION_MIN_GD,
                    typeof subscriptionData.priceGd === "number" ? Math.round(subscriptionData.priceGd) : CREATOR_SUBSCRIPTION_MIN_GD,
                );

                if (!creatorId || !userId || !autoRenew || renewAt <= 0) {
                    return;
                }

                const cycleKey = String(renewAt);
                const lastWarningCycleKey = typeof subscriptionData.warningCycleKey === "string" ? subscriptionData.warningCycleKey : "";

                if (renewAt > now && renewAt - now <= WARNING_WINDOW_MS && lastWarningCycleKey !== cycleKey) {
                    const creatorSnap = userSnapshots.get(creatorId);
                    const userSnap = userSnapshots.get(userId);

                    if (!creatorSnap || !userSnap) {
                        return;
                    }
                    const creatorData = creatorSnap.data() as Record<string, unknown> | undefined;
                    const creatorDisplayName = typeof creatorData?.displayName === "string" && creatorData.displayName.trim().length > 0
                        ? creatorData.displayName.trim()
                        : "your creator";
                    const creatorUsername = typeof creatorData?.username === "string" ? creatorData.username : "";

                    await adminDb.runTransaction(async (transaction) => {
                        const freshSubscriptionSnap = await transaction.get(subscriptionDoc.ref);
                        const freshData = freshSubscriptionSnap.data() as Record<string, unknown> | undefined;
                        if (!freshData || freshData.status !== "active") {
                            return;
                        }
                        if (typeof freshData.warningCycleKey === "string" && freshData.warningCycleKey === cycleKey) {
                            return;
                        }

                        const notificationRef = adminDb.collection("notifications").doc();
                        transaction.set(notificationRef, {
                            title: `${creatorDisplayName} renews in 7 days`,
                            message: "Your creator subscription will auto-renew soon using purchased Gum Drops only. Continue holding enough Gum Drops or cancel before renewal day.",
                            type: "warning",
                            target: {
                                global: false,
                                userIds: [userId],
                            },
                            link: buildCreatorPublicHref({
                                uid: creatorId,
                                creatorId,
                                username: creatorUsername,
                                creatorUsername,
                            }) ?? "/dashboard/profile",
                            createdAt: FieldValue.serverTimestamp(),
                            createdAtMs: now,
                            readBy: [],
                        });
                        transaction.set(subscriptionDoc.ref, {
                            lastRenewalWarningAt: now,
                            warningCycleKey: cycleKey,
                        }, { merge: true });
                        markNotificationsRuntimeChanged(transaction, now);
                    });

                    outcomes.push({ status: "warned", creatorId, userId });
                }

                if (renewAt > now) {
                    return;
                }

                const result = await adminDb.runTransaction(async (transaction) => {
                    const [freshSubscriptionSnap, creatorSnap, userSnap] = await transaction.getAll(
                        subscriptionDoc.ref,
                        adminDb.collection("users").doc(creatorId),
                        adminDb.collection("users").doc(userId),
                    );

                    if (!freshSubscriptionSnap.exists || !creatorSnap.exists || !userSnap.exists) {
                        return null;
                    }

                    const freshSubscription = freshSubscriptionSnap.data() as Record<string, unknown>;
                    const creatorData = creatorSnap.data() as Record<string, unknown>;
                    const userData = userSnap.data() as Record<string, unknown>;
                    if (freshSubscription.status !== "active" || freshSubscription.autoRenew === false) {
                        return null;
                    }
                    if (!isCreatorRole(creatorData.role) || creatorData.status === "suspended" || creatorData.status === "banned") {
                        transaction.set(subscriptionDoc.ref, {
                            status: "lapsed",
                            lapsedAt: now,
                            autoRenew: false,
                            renewalFailureReason: "creator_unavailable",
                        }, { merge: true });
                        return { status: "failed" as const, amount: priceGd };
                    }

                    const balance = readSourceAwareBalance(userData);
                    const spend = spendCreatorExperienceGumdrops(balance, priceGd, "subscription");
                    const creatorDisplayName = typeof creatorData.displayName === "string" && creatorData.displayName.trim().length > 0
                        ? creatorData.displayName.trim()
                        : "Creator";
                    const creatorUsername = typeof creatorData.username === "string" ? creatorData.username : "";

                    if (!spend.ok) {
                        const failedNotificationRef = adminDb.collection("notifications").doc();
                        transaction.set(subscriptionDoc.ref, {
                            status: "lapsed",
                            lapsedAt: now,
                            autoRenew: false,
                            renewalFailureReason: "insufficient_purchased_balance",
                        }, { merge: true });
                        transaction.set(failedNotificationRef, {
                            title: `${creatorDisplayName} subscription lapsed`,
                            message: "Renewal failed because your purchased Gum Drops balance was too low. Top up and resubscribe anytime.",
                            type: "error",
                            target: {
                                global: false,
                                userIds: [userId],
                            },
                            link: buildCreatorPublicHref({
                                uid: creatorId,
                                creatorId,
                                username: creatorUsername,
                                creatorUsername,
                            }) ?? "/dashboard/profile",
                            createdAt: FieldValue.serverTimestamp(),
                            createdAtMs: now,
                            readBy: [],
                        });
                        markNotificationsRuntimeChanged(transaction, now);
                        return { status: "failed" as const, amount: priceGd };
                    }

                    const accrualRef = adminDb.collection(CREATOR_COLLECTIONS.ledgerAccruals).doc();
                    const transactionRef = adminDb.collection("transactions").doc();
                    const accrual = buildCreatorAccrual({
                        creatorId,
                        userId,
                        sourceType: "subscription",
                        sourceId: subscriptionDoc.id,
                        grossSpendGd: priceGd,
                        createdAt: now,
                    });

                    transaction.update(userSnap.ref, buildSourceAwareBalancePatch(spend.next));
                    transaction.set(subscriptionDoc.ref, {
                        status: "active",
                        renewedAt: now,
                        renewAt: now + SUBSCRIPTION_TERM_MS,
                        lastRenewalWarningAt: FieldValue.delete(),
                        warningCycleKey: FieldValue.delete(),
                        renewalFailureReason: FieldValue.delete(),
                    }, { merge: true });
                    transaction.set(accrualRef, accrual);
                    transaction.set(transactionRef, buildCompletedGumdropTransaction({
                        userId,
                        type: "creator_subscription_renewal",
                        amount: -priceGd,
                        creatorId,
                        description: `Creator subscription renewal: ${creatorDisplayName}`,
                        balanceBefore: balance.total,
                        balanceAfter: spend.next.total,
                        timestampMs: now,
                        extra: {
                            purchasedAmountSpent: spend.purchasedSpent,
                            rewardAmountSpent: spend.rewardSpent,
                            ledgerSource: spend.ledgerSource,
                            creatorRevenueShareGd: accrual.creatorShareGd,
                            creatorRevenueShareUsd: accrual.cashoutValueUsd,
                            creatorAccrualId: accrualRef.id,
                        },
                    }));
                    return { status: "renewed" as const, amount: priceGd, creatorAccrualId: accrualRef.id };
                });

                if (result) {
                    if (result.status === "renewed") {
                        outcomes.push({
                            status: "renewed",
                            creatorId,
                            userId,
                            amount: result.amount,
                            creatorAccrualId: result.creatorAccrualId,
                        });
                    } else {
                        outcomes.push({ status: "failed", creatorId, userId, amount: result.amount });
                    }
                }
            }));
        }

        await Promise.allSettled(outcomes.map((outcome) => {
            if (outcome.status === "renewed") {
                return Promise.allSettled([
                    trackServerEvent("creator_subscription_renewed", {
                        creator_id: outcome.creatorId,
                        spend_gd: outcome.amount,
                        transaction_id: `${outcome.userId}:${outcome.creatorId}:renewal:${now}`,
                    }, outcome.userId),
                    trackServerEvent("creator_ledger_accrual_created", {
                        creator_id: outcome.creatorId,
                        source_type: "subscription",
                        accrual_id: outcome.creatorAccrualId,
                        spend_gd: outcome.amount,
                    }, outcome.userId),
                ]);
            }

            if (outcome.status === "failed") {
                return trackServerEvent("creator_subscription_failed", {
                    creator_id: outcome.creatorId,
                    spend_gd: outcome.amount,
                    transaction_id: `${outcome.userId}:${outcome.creatorId}:failed:${now}`,
                }, outcome.userId);
            }

            return Promise.resolve(null);
        }));

        return NextResponse.json({
            success: true,
            warned: outcomes.filter((entry) => entry.status === "warned").length,
            renewed: outcomes.filter((entry) => entry.status === "renewed").length,
            failed: outcomes.filter((entry) => entry.status === "failed").length,
        });
    } catch (error) {
        return handleApiError(error, "Cron.ProcessCreatorSubscriptions.GET");
    }
}

export let GET = withRouteRuntimeHealth("cron/process-creator-subscriptions:GET", GET_handler);
