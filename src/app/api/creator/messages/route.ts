import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { CREATOR_COLLECTIONS, buildCreatorThreadId, isCreatorRole, normalizeMessageKind } from "@/lib/creator-experiences";
import { buildCreatorAccrual, buildSourceAwareBalancePatch, calculateMessagePriceGd, readSourceAwareBalance, spendCreatorExperienceGumdrops } from "@/lib/server/creator-experiences";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";
import { trackServerEvent } from "@/lib/server/analytics";

type CreatorMessageRecord = Record<string, unknown> & {
    id: string;
    createdAt?: unknown;
};

type CreatorThreadRecord = Record<string, unknown> & {
    id: string;
    lastMessageAt?: unknown;
};

const sendMessageSchema = z.object({
    creatorId: z.string().trim().min(1),
    threadId: z.string().trim().optional(),
    text: z.string().trim().max(1200).optional(),
    assetUrl: z.string().trim().url().optional(),
    assetName: z.string().trim().max(260).optional(),
    assetMimeType: z.string().trim().max(160).optional(),
    messageKind: z.enum(["text", "image", "video"]).default("text"),
    targetUserId: z.string().trim().optional(),
});

export async function GET(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/messages",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const creatorId = request.nextUrl.searchParams.get("creatorId")?.trim() || "";
        const threadId = request.nextUrl.searchParams.get("threadId")?.trim() || "";
        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const callerIsCreator = isCreatorRole(callerData?.role);
        const callerIsAdmin = callerData?.role === "admin";

        if (threadId) {
            const threadSnap = await adminDb.collection(CREATOR_COLLECTIONS.messageThreads).doc(threadId).get();
            if (!threadSnap.exists) {
                return NextResponse.json({ success: true, thread: null, messages: [] });
            }

            const threadData = threadSnap.data() as Record<string, unknown>;
            const creatorOwner = typeof threadData.creatorId === "string" && threadData.creatorId === caller.uid;
            const participantOwner = typeof threadData.userId === "string" && threadData.userId === caller.uid;
            if (!callerIsAdmin && !creatorOwner && !participantOwner) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }

            const messagesSnap = await adminDb.collection(CREATOR_COLLECTIONS.messages)
                .where("threadId", "==", threadId)
                .get();
            const messages = messagesSnap.docs
                .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as CreatorMessageRecord)
                .sort((left, right) => {
                    const leftAt = typeof left.createdAt === "number" ? left.createdAt : 0;
                    const rightAt = typeof right.createdAt === "number" ? right.createdAt : 0;
                    return leftAt - rightAt;
                });

            return NextResponse.json({
                success: true,
                thread: { id: threadSnap.id, ...threadData },
                messages,
            });
        }

        if (callerIsCreator && !creatorId) {
            const threadsSnap = await adminDb.collection(CREATOR_COLLECTIONS.messageThreads)
                .where("creatorId", "==", caller.uid)
                .get();

            const threads = threadsSnap.docs
                .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as CreatorThreadRecord)
                .sort((left, right) => {
                    const leftAt = typeof left.lastMessageAt === "number" ? left.lastMessageAt : 0;
                    const rightAt = typeof right.lastMessageAt === "number" ? right.lastMessageAt : 0;
                    return rightAt - leftAt;
                });

            return NextResponse.json({ success: true, threads });
        }

        if (!creatorId) {
            return NextResponse.json({ success: true, thread: null, messages: [] });
        }

        const resolvedThreadId = buildCreatorThreadId(creatorId, caller.uid);
        const [threadSnap, messagesSnap] = await Promise.all([
            adminDb.collection(CREATOR_COLLECTIONS.messageThreads).doc(resolvedThreadId).get(),
            adminDb.collection(CREATOR_COLLECTIONS.messages).where("threadId", "==", resolvedThreadId).get(),
        ]);

        const messages = messagesSnap.docs
            .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as CreatorMessageRecord)
            .sort((left, right) => {
                const leftAt = typeof left.createdAt === "number" ? left.createdAt : 0;
                const rightAt = typeof right.createdAt === "number" ? right.createdAt : 0;
                return leftAt - rightAt;
            });

        return NextResponse.json({
            success: true,
            thread: threadSnap.exists ? { id: threadSnap.id, ...(threadSnap.data() as Record<string, unknown>) } : null,
            messages,
        });
    } catch (error) {
        return handleApiError(error, "Creator.Messages.GET");
    }
}

export async function POST(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/messages",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = sendMessageSchema.parse(await request.json());
        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        if (!callerSnap.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const callerData = callerSnap.data() as Record<string, unknown>;
        const callerIsCreator = isCreatorRole(callerData.role) && payload.creatorId === caller.uid;
        const creatorId = payload.creatorId;
        const targetUserId = callerIsCreator
            ? payload.targetUserId || ""
            : caller.uid;
        if (!creatorId || (!callerIsCreator && creatorId === caller.uid)) {
            return NextResponse.json({ error: "Invalid creator thread." }, { status: 400 });
        }

        const creatorRef = adminDb.collection("users").doc(creatorId);
        const participantRef = adminDb.collection("users").doc(targetUserId);
        const threadId = callerIsCreator
            ? (payload.threadId || buildCreatorThreadId(creatorId, targetUserId))
            : buildCreatorThreadId(creatorId, caller.uid);
        const threadRef = adminDb.collection(CREATOR_COLLECTIONS.messageThreads).doc(threadId);
        const messageRef = adminDb.collection(CREATOR_COLLECTIONS.messages).doc();
        const transactionRef = adminDb.collection("transactions").doc();
        const ledgerRef = adminDb.collection(CREATOR_COLLECTIONS.ledgerAccruals).doc();

        const result = await adminDb.runTransaction(async (transaction) => {
            const [creatorSnap, participantSnap, threadSnap, subscriptionSnap] = await Promise.all([
                transaction.get(creatorRef),
                transaction.get(participantRef),
                transaction.get(threadRef),
                transaction.get(adminDb.collection(CREATOR_COLLECTIONS.subscriptions).doc(`${targetUserId}__${creatorId}`)),
            ]);

            if (!creatorSnap.exists || !participantSnap.exists) {
                throw new Error("Creator or participant not found");
            }

            const creatorData = creatorSnap.data() as Record<string, unknown>;
            const participantData = participantSnap.data() as Record<string, unknown>;
            if (!isCreatorRole(creatorData.role) || creatorData.status === "suspended" || creatorData.status === "banned") {
                throw new Error("Creator unavailable");
            }

            const creatorSettings = creatorData.creatorSettings && typeof creatorData.creatorSettings === "object"
                ? creatorData.creatorSettings as Record<string, unknown>
                : {};
            const creatorRestrictions = creatorData.creatorRestrictions && typeof creatorData.creatorRestrictions === "object"
                ? creatorData.creatorRestrictions as Record<string, unknown>
                : {};
            if (creatorSettings.messagingEnabled === false || creatorRestrictions.messagingRestricted === true) {
                throw new Error("Messaging is unavailable for this creator.");
            }

            const messageKind = normalizeMessageKind(payload.messageKind);
            const subscriptionActive = subscriptionSnap.exists && (subscriptionSnap.data() as Record<string, unknown>).status === "active";
            const costGd = calculateMessagePriceGd({
                messageKind,
                subscriptionActive,
                senderIsCreator: callerIsCreator,
            });

            let balanceBefore = 0;
            let balanceAfter = 0;
            let purchasedAmountSpent = 0;
            let rewardAmountSpent = 0;
            let creatorAccrualId: string | undefined;

            if (!callerIsCreator && costGd > 0) {
                const balance = readSourceAwareBalance(participantData);
                const spend = spendCreatorExperienceGumdrops(balance, costGd, "message");
                if (!spend.ok) {
                    throw new Error(spend.error);
                }

                balanceBefore = balance.total;
                balanceAfter = spend.next.total;
                purchasedAmountSpent = spend.purchasedSpent;
                rewardAmountSpent = spend.rewardSpent;

                transaction.update(participantRef, buildSourceAwareBalancePatch(spend.next));
                const accrual = buildCreatorAccrual({
                    creatorId,
                    userId: targetUserId,
                    sourceType: "message",
                    sourceId: messageRef.id,
                    grossSpendGd: costGd,
                });
                creatorAccrualId = ledgerRef.id;
                transaction.set(ledgerRef, accrual);
                transaction.set(transactionRef, buildCompletedGumdropTransaction({
                    userId: targetUserId,
                    type: messageKind === "video" ? "creator_message_video" : messageKind === "image" ? "creator_message_image" : "creator_message_text",
                    amount: -costGd,
                    creatorId,
                    description: `Creator ${messageKind} message`,
                    balanceBefore,
                    balanceAfter,
                    extra: {
                        purchasedAmountSpent,
                        rewardAmountSpent,
                        ledgerSource: spend.ledgerSource,
                        creatorRevenueShareGd: accrual.creatorShareGd,
                        creatorRevenueShareUsd: accrual.cashoutValueUsd,
                        creatorAccrualId,
                    },
                }));
            }

            const text = payload.text?.trim() || "";
            const lastMessagePreview = messageKind === "text"
                ? text || "New message"
                : messageKind === "image"
                    ? "Image sent"
                    : "Video sent";
            const now = Date.now();

            transaction.set(messageRef, {
                threadId,
                creatorId,
                userId: targetUserId,
                senderRole: callerIsCreator ? "creator" : "user",
                messageKind,
                text,
                assetUrl: payload.assetUrl,
                assetName: payload.assetName,
                assetMimeType: payload.assetMimeType,
                costGd,
                creatorAccrualId,
                createdAt: now,
            });
            transaction.set(threadRef, {
                creatorId,
                userId: targetUserId,
                lastMessageAt: now,
                lastMessagePreview,
                messageCount: threadSnap.exists ? (((threadSnap.data() as Record<string, unknown>).messageCount as number) || 0) + 1 : 1,
                subscriberChatFree: subscriptionActive,
                ...(callerIsCreator ? { lastReadByCreatorAt: now } : { lastReadByUserAt: now }),
            }, { merge: true });

            return {
                costGd,
                messageKind,
                creatorAccrualId,
            };
        });

        await Promise.allSettled([
            trackServerEvent(
                result.messageKind === "text" ? "creator_message_sent" : "creator_media_sent",
                {
                    creator_id: creatorId,
                    transaction_id: `${caller.uid}:${creatorId}:${result.messageKind}:${Date.now()}`,
                    spend_gd: result.costGd,
                    media_kind: result.messageKind,
                },
                caller.uid,
            ),
            result.creatorAccrualId
                ? trackServerEvent("creator_ledger_accrual_created", {
                    creator_id: creatorId,
                    source_type: "message",
                    accrual_id: result.creatorAccrualId,
                    spend_gd: result.costGd,
                }, caller.uid)
                : Promise.resolve(null),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Creator.Messages.POST");
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/messages",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const messageId = request.nextUrl.searchParams.get("messageId")?.trim() || "";
        if (!messageId) {
            return NextResponse.json({ error: "Missing messageId" }, { status: 400 });
        }

        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const messageRef = adminDb.collection(CREATOR_COLLECTIONS.messages).doc(messageId);
        const messageSnap = await messageRef.get();
        if (!messageSnap.exists) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }

        const messageData = messageSnap.data() as Record<string, unknown>;
        const creatorId = typeof messageData.creatorId === "string" ? messageData.creatorId : "";
        const userId = typeof messageData.userId === "string" ? messageData.userId : "";
        const canModerate = callerData?.role === "admin" || caller.uid === creatorId;
        if (!canModerate) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await messageRef.set({
            moderationRemovedAt: Date.now(),
            moderationRemovedBy: caller.uid,
        }, { merge: true });

        return NextResponse.json({ success: true, creatorId, userId });
    } catch (error) {
        return handleApiError(error, "Creator.Messages.DELETE");
    }
}
