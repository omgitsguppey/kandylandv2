import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { CREATOR_COLLECTIONS, isCreatorOrAdminRole, isCreatorRole } from "@/lib/creator-experiences";
import { resolveCreatorFanPassPricing } from "@/lib/creator-settings/creator-pricing-resolver";
import { resolveCreatorMonetizationSettings } from "@/lib/creator-monetization/creator-monetization-resolver";
import { buildAdminCreatorProjectionReadOnlyResponse, readAdminCreatorProjectionContext } from "@/lib/server/admin-creator-projection";
import {
    CREATOR_EXPERIENCE_PAID_EVENTS,
    buildCreatorAccrual,
    buildCreatorExperienceAttribution,
    buildCreatorExperienceIdempotencyKey,
    buildCreatorExperienceRecordIds,
    buildCreatorExperienceTelemetryPayload,
    buildCreatorExperienceTransactionAttributionExtra,
    buildCreatorExperienceTransactionDebug,
    buildSourceAwareBalancePatch,
    readPaidSourceBalanceForRestrictedSpend,
    spendCreatorExperienceGumdrops,
} from "@/lib/server/creator-experiences";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";
import { trackServerEvent } from "@/lib/server/analytics";
import { buildFanPassTelemetry } from "@/lib/fan-pass/fan-pass-access-resolver";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { assertKnownActor, buildActorMarker } from "@/lib/identity/actor-markers";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";

const CREATOR_SUBSCRIPTIONS_READ_LIMIT = 500;
const CREATOR_SUBSCRIPTION_BODY_LIMIT_BYTES = 32_768;
const SUBSCRIBER_IDENTITY_HYDRATION_CHUNK_SIZE = 100;

const subscriptionActionSchema = z.object({
    creatorId: z.string().trim().min(1),
    action: z.enum(["subscribe", "cancel"]),
    idempotencyKey: z.string().trim().max(180).optional(),
});

type CreatorSubscriptionProblemCode =
    | "creator_or_user_not_found"
    | "creator_unavailable"
    | "subscriptions_unavailable"
    | "insufficient_paid_gumdrops"
    | "invalid_subscription_request"
    | "unauthorized";

type CreatorSubscriptionAction = z.infer<typeof subscriptionActionSchema>["action"];

type CreatorSubscriptionProblemContext = {
    creatorId?: string;
    action?: CreatorSubscriptionAction;
    priceGd?: number;
    paidBalanceGd?: number;
    shortfallGd?: number;
};

function buildSubscriptionId(userId: string, creatorId: string) {
    return `${userId}__${creatorId}`;
}

class CreatorSubscriptionProblem extends Error {
    status: number;
    code: CreatorSubscriptionProblemCode;
    context: CreatorSubscriptionProblemContext;

    constructor(status: number, code: CreatorSubscriptionProblemCode, message: string, context: CreatorSubscriptionProblemContext = {}) {
        super(message);
        this.name = "CreatorSubscriptionProblem";
        this.status = status;
        this.code = code;
        this.context = context;
    }
}

function toOptionalNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : undefined;
}

function buildSubscriptionProblemResponse(problem: CreatorSubscriptionProblem) {
    return NextResponse.json({
        success: false,
        code: problem.code,
        error: problem.message,
        message: problem.message,
        creatorId: problem.context.creatorId,
        action: problem.context.action,
        priceGd: toOptionalNumber(problem.context.priceGd),
        paidBalanceGd: toOptionalNumber(problem.context.paidBalanceGd),
        shortfallGd: toOptionalNumber(problem.context.shortfallGd),
    }, { status: problem.status });
}

function buildBoundedSubscriptionBodyResponse(error: { status: 400 | 413; code: string; message: string }) {
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

function readDebugNumber(debug: unknown, key: string) {
    if (!debug || typeof debug !== "object" || Array.isArray(debug)) {
        return 0;
    }

    const value = (debug as Record<string, unknown>)[key];
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function buildSubscriptionSourceTelemetry(debug: unknown) {
    return {
        paidBalanceBefore: readDebugNumber(debug, "paidBalanceBefore"),
        paidBalanceAfter: readDebugNumber(debug, "paidBalanceAfter"),
        rewardBalanceBefore: readDebugNumber(debug, "rewardBalanceBefore"),
        rewardBalanceAfter: readDebugNumber(debug, "rewardBalanceAfter"),
        purchasedOnly: true,
        source_policy: "creator_experience_paid_only",
        subscription_source_policy: "creator_subscription_paid_only",
    };
}

function readTrimmedString(value: unknown) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function normalizeUsername(value: unknown) {
    return readTrimmedString(value).replace(/^@+/u, "");
}

function maskFanId(userId: string) {
    if (!userId) {
        return undefined;
    }
    return `Fan • ending ${userId.slice(-3)}`;
}

type FanIdentitySource = "user_profile" | "public_profile" | "subscription_snapshot" | "unavailable";

type FanIdentity = {
    fanUsername?: string;
    fanDisplayName?: string;
    fanPhotoURL?: string | null;
    fanHandle?: string;
    fanLabel: string;
    maskedFanId?: string;
    fanIdentitySource: FanIdentitySource;
};

function buildFanIdentityFromSource(source: Record<string, unknown>, identitySource: Exclude<FanIdentitySource, "unavailable">): FanIdentity | null {
    const fanUsername = normalizeUsername(source.fanUsername) || normalizeUsername(source.username);
    const fanDisplayName = readTrimmedString(source.fanDisplayName) || readTrimmedString(source.displayName);
    const fanPhotoURL = readTrimmedString(source.fanPhotoURL) || readTrimmedString(source.photoURL);

    if (!fanUsername && !fanDisplayName && !fanPhotoURL) {
        return null;
    }

    const fanHandle = fanUsername ? `@${fanUsername}` : undefined;
    return {
        fanUsername: fanUsername || undefined,
        fanDisplayName: fanDisplayName || undefined,
        fanPhotoURL: fanPhotoURL || null,
        fanHandle,
        fanLabel: fanHandle || fanDisplayName || "Fan",
        fanIdentitySource: identitySource,
    };
}

function buildUnavailableFanIdentity(userId: string): FanIdentity {
    return {
        fanLabel: "Fan",
        maskedFanId: maskFanId(userId),
        fanIdentitySource: "unavailable",
    };
}

function buildSubscriberCrmRow(
    row: Record<string, unknown> & { id: string },
    identity: FanIdentity,
    includeDebugUserId: boolean,
) {
    const userId = readTrimmedString(row.userId);
    return {
        id: row.id,
        subscriberId: row.id,
        creatorId: readTrimmedString(row.creatorId) || undefined,
        status: readTrimmedString(row.status) || undefined,
        priceGd: toOptionalNumber(row.priceGd),
        startedAt: toOptionalNumber(row.startedAt),
        renewAt: toOptionalNumber(row.renewAt),
        renewedAt: toOptionalNumber(row.renewedAt),
        gracePeriodEndsAt: typeof row.gracePeriodEndsAt === "number" ? row.gracePeriodEndsAt : null,
        renewalState: readTrimmedString(row.renewalState) || undefined,
        autoRenew: typeof row.autoRenew === "boolean" ? row.autoRenew : undefined,
        userIdDebug: includeDebugUserId ? userId || undefined : undefined,
        ...identity,
    };
}

async function hydrateCreatorSubscriberRows(
    rows: Array<Record<string, unknown> & { id: string }>,
    includeDebugUserId: boolean,
) {
    const identities = new Map<string, FanIdentity>();
    const rowsNeedingUserProfile: Array<{ userId: string; row: Record<string, unknown> & { id: string } }> = [];

    for (const row of rows) {
        const userId = readTrimmedString(row.userId);
        const snapshotIdentity = buildFanIdentityFromSource(row, "subscription_snapshot");
        if (snapshotIdentity) {
            identities.set(row.id, snapshotIdentity);
            continue;
        }
        if (userId) {
            rowsNeedingUserProfile.push({ userId, row });
        } else {
            identities.set(row.id, buildUnavailableFanIdentity(""));
        }
    }

    // cost-bound: subscriber CRM hydration is chunked and capped by CREATOR_SUBSCRIPTIONS_READ_LIMIT.
    for (let index = 0; index < rowsNeedingUserProfile.length; index += SUBSCRIBER_IDENTITY_HYDRATION_CHUNK_SIZE) {
        const chunk = rowsNeedingUserProfile.slice(index, index + SUBSCRIBER_IDENTITY_HYDRATION_CHUNK_SIZE);
        const refs = chunk.map((entry) => adminDb!.collection("users").doc(entry.userId));
        const snaps = refs.length > 0 ? await adminDb!.getAll(...refs) : [];
        snaps.forEach((snap, snapIndex) => {
            const row = chunk[snapIndex]?.row;
            const userId = chunk[snapIndex]?.userId ?? "";
            if (!row) {
                return;
            }
            const data = snap.exists ? snap.data() as Record<string, unknown> : {};
            identities.set(row.id, buildFanIdentityFromSource(data, "user_profile") ?? buildUnavailableFanIdentity(userId));
        });
    }

    const subscribers = rows.map((row) => buildSubscriberCrmRow(
        row,
        identities.get(row.id) ?? buildUnavailableFanIdentity(readTrimmedString(row.userId)),
        includeDebugUserId,
    ));
    const crmHydrationMissingCount = subscribers.filter((subscriber) => subscriber.fanIdentitySource === "unavailable").length;
    const crmHydration = crmHydrationMissingCount === 0 ? "hydrated" : crmHydrationMissingCount === subscribers.length ? "unavailable" : "partial";
    return {
        subscribers,
        crmHydration,
        crmHydrationMissingCount,
        identityFieldsRedacted: true,
        identityHydrationCostBound: {
            maxSubscribers: CREATOR_SUBSCRIPTIONS_READ_LIMIT,
            chunkSize: SUBSCRIBER_IDENTITY_HYDRATION_CHUNK_SIZE,
            strategy: "snapshot_first_chunked_getAll",
        },
    };
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

        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const projection = readAdminCreatorProjectionContext(request, caller.uid, typeof callerData?.role === "string" ? callerData.role : null);
        const creatorId = projection?.targetCreatorId || request.nextUrl.searchParams.get("creatorId")?.trim() || "";
        if (creatorId) {
            const canReadCreatorSubscribers = Boolean(projection)
                || callerData?.role === "admin"
                || (isCreatorRole(callerData?.role) && caller.uid === creatorId);
            if (canReadCreatorSubscribers) {
                // cost-bound: creator subscriber visibility is limited by CREATOR_SUBSCRIPTIONS_READ_LIMIT.
                const subscribersSnap = await adminDb.collection(CREATOR_COLLECTIONS.subscriptions)
                    .where("creatorId", "==", creatorId)
                    .limit(CREATOR_SUBSCRIPTIONS_READ_LIMIT)
                    .get();
                const subscriberRows = subscribersSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
                const hydrated = await hydrateCreatorSubscriberRows(subscriberRows, Boolean(projection));

                return NextResponse.json({
                    success: true,
                    viewMode: projection ? "subscriber_visibility_projection" : "creator_subscriber_visibility",
                    ...hydrated,
                });
            }

            // bounded document read: one caller/creator subscription pair.
            const snap = await adminDb.collection(CREATOR_COLLECTIONS.subscriptions).doc(buildSubscriptionId(caller.uid, creatorId)).get();
            return NextResponse.json({
                success: true,
                viewMode: "fan_subscription_status",
                subscription: snap.exists ? { id: snap.id, ...(snap.data() as Record<string, unknown>) } : null,
            });
        }

        const [outboundSnap, inboundSnap] = await Promise.all([
            adminDb.collection(CREATOR_COLLECTIONS.subscriptions).where("userId", "==", caller.uid).limit(CREATOR_SUBSCRIPTIONS_READ_LIMIT).get(),
            adminDb.collection(CREATOR_COLLECTIONS.subscriptions).where("creatorId", "==", caller.uid).limit(CREATOR_SUBSCRIPTIONS_READ_LIMIT).get(),
        ]);
        const inboundRows = inboundSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
        const inbound = isCreatorOrAdminRole(callerData?.role)
            ? await hydrateCreatorSubscriberRows(inboundRows, callerData?.role === "admin")
            : { subscribers: [], crmHydration: "hydrated", crmHydrationMissingCount: 0, identityFieldsRedacted: true };

        return NextResponse.json({
            success: true,
            subscriptions: outboundSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) })),
            subscribers: inbound.subscribers,
            crmHydration: inbound.crmHydration,
            crmHydrationMissingCount: inbound.crmHydrationMissingCount,
            identityFieldsRedacted: inbound.identityFieldsRedacted,
        });
    } catch (error) {
        return handleApiError(error, "Creator.Subscriptions.GET");
    }
}

async function POST_handler(request: NextRequest) {
    let lifecycleTelemetryContext: {
        callerUid: string;
        creatorId: string;
        action: CreatorSubscriptionAction;
        fanPassId: string;
        priceGd?: number;
    } | null = null;
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/subscriptions",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller) {
            return buildSubscriptionProblemResponse(new CreatorSubscriptionProblem(
                401,
                "unauthorized",
                "Sign in to start this Fan Pass.",
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

        let subscriptionRequest: z.infer<typeof subscriptionActionSchema>;
        try {
            const body = await readBoundedJsonBody<z.infer<typeof subscriptionActionSchema>>(request, {
                maxBytes: CREATOR_SUBSCRIPTION_BODY_LIMIT_BYTES,
                routeName: "creator/subscriptions",
                allowEmpty: false,
            });
            subscriptionRequest = subscriptionActionSchema.parse(body);
        } catch (error) {
            if (isBoundedJsonBodyError(error)) {
                return buildBoundedSubscriptionBodyResponse(error);
            }
            return buildSubscriptionProblemResponse(new CreatorSubscriptionProblem(
                400,
                "invalid_subscription_request",
                "Check the Fan Pass details and try again.",
            ));
        }

        const { creatorId, action, idempotencyKey: rawIdempotencyKey } = subscriptionRequest;
        const subscriptionContext: CreatorSubscriptionProblemContext = {
            creatorId,
            action,
        };
        lifecycleTelemetryContext = {
            callerUid: caller.uid,
            creatorId,
            action,
            fanPassId: buildSubscriptionId(caller.uid, creatorId),
        };
        if (creatorId === caller.uid) {
            return buildSubscriptionProblemResponse(new CreatorSubscriptionProblem(
                400,
                "invalid_subscription_request",
                "You cannot subscribe to yourself.",
                subscriptionContext,
            ));
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
        if (action === "subscribe") {
            void trackServerEvent("fan_pass_purchase_attempted", buildFanPassTelemetry({
                eventName: "fan_pass_purchase_attempted",
                creatorId,
                fanUserId: caller.uid,
                fanPassId: buildSubscriptionId(caller.uid, creatorId),
                state: "purchase_attempted",
                sourceTruth: "creator_settings",
                price: 0,
                surface: "creator_profile",
                route: "/api/creator/subscriptions",
            }), caller.uid).catch(() => undefined);
        }

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
                throw new CreatorSubscriptionProblem(
                    404,
                    "creator_or_user_not_found",
                    "Creator or user was not found.",
                    subscriptionContext,
                );
            }

            const creatorData = creatorSnap.data() as Record<string, unknown>;
            const userData = userSnap.data() as Record<string, unknown>;
            if (!isCreatorRole(creatorData.role) || creatorData.status === "suspended" || creatorData.status === "banned") {
                throw new CreatorSubscriptionProblem(
                    403,
                    "creator_unavailable",
                    "This creator is unavailable right now.",
                    subscriptionContext,
                );
            }

            const creatorSettings = creatorData.creatorSettings && typeof creatorData.creatorSettings === "object"
                ? creatorData.creatorSettings as Record<string, unknown>
                : {};
            const monetizationSettings = resolveCreatorMonetizationSettings({
                creatorId,
                rawSettings: creatorSettings,
                rawRestrictions: creatorData.creatorRestrictions,
                settingsConfigured: Boolean(creatorData.creatorSettings && typeof creatorData.creatorSettings === "object"),
            });
            const fanPassPricing = resolveCreatorFanPassPricing(creatorSettings);
            const subscriptionsEnabled = monetizationSettings.fanPassEnabled && fanPassPricing.enabled;
            const subscriptionsRestricted = creatorData.creatorRestrictions && typeof creatorData.creatorRestrictions === "object"
                ? (creatorData.creatorRestrictions as Record<string, unknown>).subscriptionsRestricted === true
                : false;
            if (!subscriptionsEnabled || subscriptionsRestricted) {
                throw new CreatorSubscriptionProblem(
                    409,
                    "subscriptions_unavailable",
                    "Fan Pass is not available for this creator right now.",
                    subscriptionContext,
                );
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

            const priceGd = fanPassPricing.priceGd;
            const balance = readPaidSourceBalanceForRestrictedSpend(userData).balance;
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
                    debug: {
                        ...buildCreatorExperienceTransactionDebug({
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
                        paidBalanceBefore: balance.purchased,
                        paidBalanceAfter: balance.purchased,
                        rewardBalanceBefore: balance.reward,
                        rewardBalanceAfter: balance.reward,
                        purchasedOnly: true,
                        source_policy: "creator_experience_paid_only",
                        subscription_source_policy: "creator_subscription_paid_only",
                    },
                };
            }
            const spend = spendCreatorExperienceGumdrops(balance, priceGd, "subscription");
            if (!spend.ok) {
                const shortfallGd = Math.max(0, priceGd - balance.purchased);
                throw new CreatorSubscriptionProblem(
                    402,
                    "insufficient_paid_gumdrops",
                    "You need more paid GumDrops to start this Fan Pass.",
                    {
                        ...subscriptionContext,
                        priceGd,
                        paidBalanceGd: balance.purchased,
                        shortfallGd,
                    },
                );
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
            const attribution = buildCreatorExperienceAttribution({
                creatorId,
                userId: caller.uid,
                sourceType: "subscription",
                sourceId: subscriptionRef.id,
                grossSpendGd: priceGd,
                purchasedAmountSpent: spend.purchasedSpent,
                rewardAmountSpent: spend.rewardSpent,
                userTransactionId: transactionRef.id,
                creatorAccrualId: ledgerRef.id,
                creatorExperienceRecordId: subscriptionRef.id,
                idempotencyKey,
                sourceAwareBalanceBefore: balance,
                sourceAwareBalanceAfter: spend.next,
            });
            const attributionExtra = buildCreatorExperienceTransactionAttributionExtra(attribution);
            const sourcePolicyDebug = {
                paidBalanceBefore: balance.purchased,
                paidBalanceAfter: spend.next.purchased,
                rewardBalanceBefore: balance.reward,
                rewardBalanceAfter: spend.next.reward,
                purchasedOnly: true,
                source_policy: "creator_experience_paid_only",
                subscription_source_policy: "creator_subscription_paid_only",
            };
            const transactionDebug = {
                ...debug,
                ...sourcePolicyDebug,
            };

            transaction.update(userRef, buildSourceAwareBalancePatch(spend.next));
            transaction.set(subscriptionRef, {
                creatorId,
                userId: caller.uid,
                status: "active",
                priceGd,
                priceSource: fanPassPricing.source,
                paidOnlyPolicy: fanPassPricing.paidOnly,
                startedAt: now,
                renewAt,
                renewedAt: now,
                autoRenew: true,
                gracePeriodEndsAt: null,
                renewalFailureCount: 0,
                lastRenewalAttemptAt: null,
                renewalState: "active",
                purchasedOnly: true,
                userTransactionId: transactionRef.id,
                creatorAccrualId: ledgerRef.id,
                idempotencyKey,
                duplicatePrevented: false,
                transactionDebug,
            }, { merge: true });
            transaction.set(ledgerRef, {
                ...accrual,
                ...attributionExtra,
                userTransactionId: transactionRef.id,
                creatorExperienceRecordId: subscriptionRef.id,
                idempotencyKey,
                platformShareGd: attribution.platformShareGd,
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
                    ...attributionExtra,
                    creatorRevenueShareGd: accrual.creatorShareGd,
                    creatorRevenueShareUsd: accrual.cashoutValueUsd,
                    idempotencyKey,
                    duplicatePrevented: false,
                    ...sourcePolicyDebug,
                },
            }));

            return {
                action: "subscribe" as const,
                priceGd,
                renewAt,
                creatorAccrualId: ledgerRef.id,
                duplicatePrevented: false,
                debug: transactionDebug,
            };
        });

        const eventName = result.action === "cancel" ? "creator_subscription_canceled" : "creator_subscription_started";
        await Promise.allSettled([
            trackServerEvent(result.action === "cancel" ? "fan_pass_cancelled" : "fan_pass_purchase_succeeded", buildFanPassTelemetry({
                eventName: result.action === "cancel" ? "fan_pass_cancelled" : "fan_pass_purchase_succeeded",
                creatorId,
                fanUserId: caller.uid,
                fanPassId: buildSubscriptionId(caller.uid, creatorId),
                state: result.action === "cancel" ? "cancelled" : "purchase_succeeded",
                sourceTruth: "creator_subscription",
                price: result.priceGd,
                surface: "creator_profile",
                route: "/api/creator/subscriptions",
            }), caller.uid),
            result.action === "subscribe"
                ? trackServerEvent("fan_pass_access_granted", buildFanPassTelemetry({
                    eventName: "fan_pass_access_granted",
                    creatorId,
                    fanUserId: caller.uid,
                    fanPassId: buildSubscriptionId(caller.uid, creatorId),
                    state: "access_granted",
                    sourceTruth: "creator_subscription",
                    price: result.priceGd,
                    surface: "creator_profile",
                    route: "/api/creator/subscriptions",
                }), caller.uid)
                : Promise.resolve(null),
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
                    extra: result.action === "subscribe"
                        ? buildSubscriptionSourceTelemetry(result.debug)
                        : undefined,
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
                    extra: buildSubscriptionSourceTelemetry(result.debug),
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
                        extra: buildSubscriptionSourceTelemetry(result.debug),
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
            code: result.action === "subscribe" && result.duplicatePrevented ? "already_active" : undefined,
            duplicatePrevented: result.duplicatePrevented,
            debug: result.debug,
        });
    } catch (error) {
        if (error instanceof CreatorSubscriptionProblem) {
            if (lifecycleTelemetryContext?.action === "subscribe") {
                await Promise.allSettled([
                    trackServerEvent("fan_pass_purchase_failed", buildFanPassTelemetry({
                        eventName: "fan_pass_purchase_failed",
                        creatorId: lifecycleTelemetryContext.creatorId,
                        fanUserId: lifecycleTelemetryContext.callerUid,
                        fanPassId: lifecycleTelemetryContext.fanPassId,
                        state: "purchase_failed",
                        sourceTruth: "creator_subscription",
                        price: error.context.priceGd ?? lifecycleTelemetryContext.priceGd ?? 0,
                        surface: "creator_profile",
                        route: "/api/creator/subscriptions",
                        failureReason: error.code === "subscriptions_unavailable"
                            ? "creator_disabled"
                            : error.code === "unauthorized"
                                ? "auth_required"
                                : "subscription_missing",
                    }), lifecycleTelemetryContext.callerUid),
                ]);
            }
            return buildSubscriptionProblemResponse(error);
        }
        if (isAuthUnauthorized(error)) {
            return buildSubscriptionProblemResponse(new CreatorSubscriptionProblem(
                401,
                "unauthorized",
                "Sign in to start this Fan Pass.",
            ));
        }
        return handleApiError(error, "Creator.Subscriptions.POST");
    }
}

export let GET = withRouteRuntimeHealth("creator/subscriptions:GET", GET_handler);
export let POST = withRouteRuntimeHealth("creator/subscriptions:POST", POST_handler);
