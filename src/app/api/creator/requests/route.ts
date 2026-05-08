import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { CREATOR_COLLECTIONS, isCreatorRole } from "@/lib/creator-experiences";
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
import { buildNotFoundResponse } from "@/lib/server/not-found";
import { assertKnownActor, buildActorMarker } from "@/lib/identity/actor-markers";

const CREATOR_REQUESTS_READ_LIMIT = 200;

type CreatorRequestProblemCode =
    | "creator_or_user_not_found"
    | "creator_unavailable"
    | "requests_unavailable"
    | "insufficient_paid_gumdrops"
    | "invalid_request"
    | "unauthorized";

type CreatorRequestProblemContext = {
    creatorId?: string;
    categoryId?: string;
    priceGd?: number;
    paidBalanceGd?: number;
    shortfallGd?: number;
};

type CreatorRequestRecord = Record<string, unknown> & {
    id: string;
    createdAt?: unknown;
};

const createRequestSchema = z.object({
    creatorId: z.string().trim().min(1),
    categoryId: z.string().trim().min(1),
    details: z.string().trim().min(8).max(1500),
    idempotencyKey: z.string().trim().max(180).optional(),
});

const updateRequestSchema = z.object({
    requestId: z.string().trim().min(1),
    action: z.enum(["accept", "decline", "fulfill"]),
    responseNote: z.string().trim().max(600).optional(),
});

class CreatorRequestProblem extends Error {
    status: number;
    code: CreatorRequestProblemCode;
    context: CreatorRequestProblemContext;

    constructor(status: number, code: CreatorRequestProblemCode, message: string, context: CreatorRequestProblemContext = {}) {
        super(message);
        this.name = "CreatorRequestProblem";
        this.status = status;
        this.code = code;
        this.context = context;
    }
}

function toOptionalNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : undefined;
}

function buildRequestProblemResponse(problem: CreatorRequestProblem) {
    return NextResponse.json({
        success: false,
        code: problem.code,
        error: problem.message,
        message: problem.message,
        creatorId: problem.context.creatorId,
        categoryId: problem.context.categoryId,
        priceGd: toOptionalNumber(problem.context.priceGd),
        paidBalanceGd: toOptionalNumber(problem.context.paidBalanceGd),
        shortfallGd: toOptionalNumber(problem.context.shortfallGd),
    }, { status: problem.status });
}

async function GET_handler(request: NextRequest) {
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
            .limit(CREATOR_REQUESTS_READ_LIMIT)
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

async function POST_handler(request: NextRequest) {
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

        const { creatorId, categoryId, details, idempotencyKey: rawIdempotencyKey } = createRequestSchema.parse(await request.json());
        if (creatorId === caller.uid) {
            return buildRequestProblemResponse(new CreatorRequestProblem(
                400,
                "invalid_request",
                "Custom requests are for fans only.",
                { creatorId, categoryId },
            ));
        }

        const paidEventName = CREATOR_EXPERIENCE_PAID_EVENTS.custom_request;
        const idempotencyKey = buildCreatorExperienceIdempotencyKey({
            action: "custom_request",
            userId: caller.uid,
            creatorId,
            clientKey: rawIdempotencyKey,
            payloadParts: [categoryId, details],
        });
        const recordIds = buildCreatorExperienceRecordIds({
            action: "custom_request",
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
            route: "/api/creator/requests",
            actionKey: paidEventName,
            targetCreatorId: creatorId,
            occurredAt: Date.now(),
            dedupeKey: idempotencyKey,
            source: "creator_experience_transaction",
        }));

        const creatorRef = adminDb.collection("users").doc(creatorId);
        const userRef = adminDb.collection("users").doc(caller.uid);
        const requestRef = adminDb.collection(CREATOR_COLLECTIONS.requests).doc(recordIds.creatorExperienceRecordId);
        const ledgerRef = adminDb.collection(CREATOR_COLLECTIONS.ledgerAccruals).doc(recordIds.creatorAccrualId);
        const transactionRef = adminDb.collection("transactions").doc(recordIds.userTransactionId);

        const result = await adminDb.runTransaction(async (transaction) => {
            const [creatorSnap, userSnap, requestSnap, transactionSnap] = await Promise.all([
                transaction.get(creatorRef),
                transaction.get(userRef),
                transaction.get(requestRef),
                transaction.get(transactionRef),
            ]);

            if (!creatorSnap.exists || !userSnap.exists) {
                throw new CreatorRequestProblem(
                    404,
                    "creator_or_user_not_found",
                    "We could not find this creator.",
                    { creatorId, categoryId },
                );
            }

            const creatorData = creatorSnap.data() as Record<string, unknown>;
            const userData = userSnap.data() as Record<string, unknown>;
            if (!isCreatorRole(creatorData.role) || creatorData.status === "suspended" || creatorData.status === "banned") {
                throw new CreatorRequestProblem(
                    403,
                    "creator_unavailable",
                    "This creator is unavailable right now.",
                    { creatorId, categoryId },
                );
            }

            const creatorSettings = creatorData.creatorSettings && typeof creatorData.creatorSettings === "object"
                ? creatorData.creatorSettings as Record<string, unknown>
                : {};
            const creatorRestrictions = creatorData.creatorRestrictions && typeof creatorData.creatorRestrictions === "object"
                ? creatorData.creatorRestrictions as Record<string, unknown>
                : {};
            if (creatorSettings.customRequestsEnabled === false || creatorRestrictions.customRequestsRestricted === true) {
                throw new CreatorRequestProblem(
                    409,
                    "requests_unavailable",
                    "Custom requests are not available for this creator right now.",
                    { creatorId, categoryId },
                );
            }

            const categories = Array.isArray(creatorSettings.requestCategories)
                ? creatorSettings.requestCategories.filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
                : [];
            const selectedCategory = categories.find((entry) => entry.id === categoryId && entry.enabled !== false);
            if (!selectedCategory) {
                throw new CreatorRequestProblem(
                    400,
                    "invalid_request",
                    "Check the request details and try again.",
                    { creatorId, categoryId },
                );
            }

            const priceGd = typeof selectedCategory.priceGd === "number" ? Math.round(selectedCategory.priceGd) : 0;
            const balance = readSourceAwareBalance(userData);
            if (requestSnap.exists || transactionSnap.exists) {
                const requestData = requestSnap.data() as Record<string, unknown> | undefined;
                const existingPrice = typeof requestData?.priceGd === "number" ? requestData.priceGd : priceGd;
                const existingAccrualId = typeof requestData?.creatorAccrualId === "string" ? requestData.creatorAccrualId : ledgerRef.id;

                return {
                    priceGd: existingPrice,
                    creatorAccrualId: existingAccrualId,
                    duplicatePrevented: true,
                    debug: buildCreatorExperienceTransactionDebug({
                        userTransactionId: transactionRef.id,
                        creatorAccrualId: existingAccrualId,
                        creatorExperienceRecordId: requestRef.id,
                        priceGd: existingPrice,
                        idempotencyKey,
                        duplicatePrevented: true,
                        sourceAwareBalanceBefore: balance,
                        sourceAwareBalanceAfter: balance,
                    }),
                };
            }
            const spend = spendCreatorExperienceGumdrops(balance, priceGd, "custom_request");
            if (!spend.ok) {
                throw new CreatorRequestProblem(
                    402,
                    "insufficient_paid_gumdrops",
                    "You need more paid GumDrops to send this request.",
                    {
                        creatorId,
                        categoryId,
                        priceGd,
                        paidBalanceGd: balance.purchased,
                        shortfallGd: Math.max(0, priceGd - balance.purchased),
                    },
                );
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
            const debug = buildCreatorExperienceTransactionDebug({
                userTransactionId: transactionRef.id,
                creatorAccrualId: ledgerRef.id,
                creatorExperienceRecordId: requestRef.id,
                priceGd,
                idempotencyKey,
                duplicatePrevented: false,
                sourceAwareBalanceBefore: balance,
                sourceAwareBalanceAfter: spend.next,
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
                userTransactionId: transactionRef.id,
                idempotencyKey,
                duplicatePrevented: false,
                transactionDebug: debug,
                createdAt: now,
            });
            transaction.set(ledgerRef, {
                ...accrual,
                userTransactionId: transactionRef.id,
                creatorExperienceRecordId: requestRef.id,
                idempotencyKey,
                platformShareGd: debug.platformShareGd,
            });
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
                    creatorExperienceRecordId: requestRef.id,
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
            trackServerEvent(paidEventName, {
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
                        category_id: categoryId,
                    },
                }),
                creator_id: creatorId,
                spend_gd: result.priceGd,
                category_id: categoryId,
                transaction_id: result.debug.userTransactionId,
            }, caller.uid),
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
                source_type: "custom_request",
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
        if (error instanceof CreatorRequestProblem) {
            return buildRequestProblemResponse(error);
        }
        return handleApiError(error, "Creator.Requests.POST");
    }
}

async function PUT_handler(request: NextRequest) {
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
            return buildNotFoundResponse("request", "Request not found");
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

export let GET = withRouteRuntimeHealth("creator/requests:GET", GET_handler);
export let POST = withRouteRuntimeHealth("creator/requests:POST", POST_handler);
export let PUT = withRouteRuntimeHealth("creator/requests:PUT", PUT_handler);
