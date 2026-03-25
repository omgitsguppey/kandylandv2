import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { CREATOR_COLLECTIONS, isCreatorRole } from "@/lib/creator-experiences";
import { buildCreatorAccrual, buildSourceAwareBalancePatch, readSourceAwareBalance, spendCreatorExperienceGumdrops } from "@/lib/server/creator-experiences";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";
import { trackServerEvent } from "@/lib/server/analytics";

type CreatorRequestRecord = Record<string, unknown> & {
    id: string;
    createdAt?: unknown;
};

const createRequestSchema = z.object({
    creatorId: z.string().trim().min(1),
    categoryId: z.string().trim().min(1),
    details: z.string().trim().min(8).max(1500),
});

const updateRequestSchema = z.object({
    requestId: z.string().trim().min(1),
    action: z.enum(["accept", "decline", "fulfill"]),
    responseNote: z.string().trim().max(600).optional(),
});

export async function GET(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/requests",
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
        const isCreator = isCreatorRole(callerData?.role);

        const snap = await adminDb.collection(CREATOR_COLLECTIONS.requests)
            .where(isCreator ? "creatorId" : "userId", "==", caller.uid)
            .get();

        const requests = snap.docs
            .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as CreatorRequestRecord)
            .sort((left, right) => {
                const leftAt = typeof left.createdAt === "number" ? left.createdAt : 0;
                const rightAt = typeof right.createdAt === "number" ? right.createdAt : 0;
                return rightAt - leftAt;
            });

        return NextResponse.json({ success: true, requests });
    } catch (error) {
        return handleApiError(error, "Creator.Requests.GET");
    }
}

export async function POST(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/requests",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { creatorId, categoryId, details } = createRequestSchema.parse(await request.json());
        if (creatorId === caller.uid) {
            return NextResponse.json({ error: "Custom requests are for fans only." }, { status: 400 });
        }

        const creatorRef = adminDb.collection("users").doc(creatorId);
        const userRef = adminDb.collection("users").doc(caller.uid);
        const requestRef = adminDb.collection(CREATOR_COLLECTIONS.requests).doc();
        const ledgerRef = adminDb.collection(CREATOR_COLLECTIONS.ledgerAccruals).doc();
        const transactionRef = adminDb.collection("transactions").doc();

        const result = await adminDb.runTransaction(async (transaction) => {
            const [creatorSnap, userSnap] = await Promise.all([
                transaction.get(creatorRef),
                transaction.get(userRef),
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
            if (creatorSettings.customRequestsEnabled === false || creatorRestrictions.customRequestsRestricted === true) {
                throw new Error("Custom requests are unavailable for this creator.");
            }

            const categories = Array.isArray(creatorSettings.requestCategories)
                ? creatorSettings.requestCategories.filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
                : [];
            const selectedCategory = categories.find((entry) => entry.id === categoryId && entry.enabled !== false);
            if (!selectedCategory) {
                throw new Error("This custom request category is unavailable.");
            }

            const priceGd = typeof selectedCategory.priceGd === "number" ? Math.round(selectedCategory.priceGd) : 0;
            const balance = readSourceAwareBalance(userData);
            const spend = spendCreatorExperienceGumdrops(balance, priceGd, "custom_request");
            if (!spend.ok) {
                throw new Error(spend.error);
            }

            const now = Date.now();
            const accrual = buildCreatorAccrual({
                creatorId,
                userId: caller.uid,
                sourceType: "custom_request",
                sourceId: requestRef.id,
                grossSpendGd: priceGd,
                createdAt: now,
            });

            transaction.update(userRef, buildSourceAwareBalancePatch(spend.next));
            transaction.set(requestRef, {
                creatorId,
                userId: caller.uid,
                categoryId,
                categoryLabel: typeof selectedCategory.label === "string" ? selectedCategory.label : categoryId,
                details,
                priceGd,
                status: "pending",
                creatorAccrualId: ledgerRef.id,
                createdAt: now,
            });
            transaction.set(ledgerRef, accrual);
            transaction.set(transactionRef, buildCompletedGumdropTransaction({
                userId: caller.uid,
                type: "creator_custom_request",
                amount: -priceGd,
                creatorId,
                description: `Creator custom request: ${typeof selectedCategory.label === "string" ? selectedCategory.label : categoryId}`,
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
            trackServerEvent("creator_custom_request_created", {
                creator_id: creatorId,
                spend_gd: result.priceGd,
                category_id: categoryId,
                transaction_id: `${caller.uid}:${creatorId}:${categoryId}:${Date.now()}`,
            }, caller.uid),
            trackServerEvent("creator_ledger_accrual_created", {
                creator_id: creatorId,
                source_type: "custom_request",
                accrual_id: result.creatorAccrualId,
                spend_gd: result.priceGd,
            }, caller.uid),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Creator.Requests.POST");
    }
}

export async function PUT(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/requests",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { requestId, action, responseNote } = updateRequestSchema.parse(await request.json());
        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const isAdmin = callerData?.role === "admin";

        const requestRef = adminDb.collection(CREATOR_COLLECTIONS.requests).doc(requestId);
        const requestSnap = await requestRef.get();
        if (!requestSnap.exists) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        const requestData = requestSnap.data() as Record<string, unknown>;
        const isCreatorOwner = requestData.creatorId === caller.uid;
        if (!isCreatorOwner && !isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const nextStatus = action === "accept" ? "accepted" : action === "decline" ? "declined" : "fulfilled";
        await requestRef.set({
            status: nextStatus,
            respondedAt: Date.now(),
            responseNote: responseNote?.trim() || null,
        }, { merge: true });

        const eventName = action === "accept" ? "creator_custom_request_accepted" : "creator_custom_request_declined";
        if (action !== "fulfill") {
            await trackServerEvent(eventName, {
                creator_id: String(requestData.creatorId || ""),
                request_id: requestId,
            }, String(requestData.userId || "")).catch(() => null);
        }

        return NextResponse.json({ success: true, status: nextStatus });
    } catch (error) {
        return handleApiError(error, "Creator.Requests.PUT");
    }
}
