import "server-only";

import type { CreatorMessage, CreatorMessageThread } from "@/types/db";
import {
    CHAT_COLLECTIONS,
    buildChatThreadId,
    buildChatPaidGdGateState,
    buildChatPaidGdLowBalanceReminderAfterPaidRefill,
    buildChatPaidGdLowBalanceReminderAfterSend,
    normalizeChatPaidGdLowBalanceReminderState,
    isChatThreadVisibleToViewer,
    normalizeChatMessageKind,
    parseCreatorThreadId,
    resolveChatThreadReadAt,
    resolveChatThreadUnreadCount,
    type ChatInsufficientFundsPayload,
    type ChatMessageKind,
    type ChatThreadDetail,
    type ChatThreadPricing,
    type ChatThreadRecord,
    type ChatViewerRole,
} from "@/lib/chat";
import { buildChatGatingTelemetryPayload } from "@/lib/chat/chat-gating-contract";
import { resolveFanPassAccess } from "@/lib/fan-pass/fan-pass-access-resolver";
import { resolveCreatorMonetizationSettings } from "@/lib/creator-monetization/creator-monetization-resolver";
import { buildNotificationRecord } from "@/lib/notification-contracts";
import { buildNotificationDocumentId, buildNotificationIdempotencyKey } from "@/lib/notification-identity";
import { buildChatSoftSealScope, softOpenChatValue, softSealChatValue } from "@/lib/chat-soft-seal";
import {
    CREATOR_COLLECTIONS,
    isCreatorMessagingAvailable,
    normalizeCreatorRestrictions,
    normalizeCreatorSettings,
    type CreatorRestrictions,
    type CreatorSettings,
} from "@/lib/creator-experiences";
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
    readSourceAwareBalance,
    spendCreatorExperienceGumdrops,
} from "@/lib/server/creator-experiences";
import { assertKnownActor, buildActorMarker } from "@/lib/identity/actor-markers";
import { trackServerEvent } from "@/lib/server/analytics";
import { AuthError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";
import { sanitizeFirestorePayload } from "@/lib/server/firestore-sanitize";
import { getErrorMessage, recordRouteWarning } from "@/lib/server/route-diagnostics";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import { touchNotificationsRuntime } from "@/lib/server/notification-runtime";

type UserSummary = {
    uid: string;
    displayName: string;
    username?: string;
    photoURL?: string | null;
    email?: string | null;
    role?: string;
    status?: string;
    creatorSettings: CreatorSettings;
    creatorRestrictions: CreatorRestrictions;
    raw: Record<string, unknown>;
};

type SendChatMessageInput = {
    callerUid: string;
    callerEmail?: string | null;
    callerRole: string;
    threadId: string;
    text?: string;
    assetUrl?: string;
    assetName?: string;
    assetMimeType?: string;
    messageKind?: unknown;
    idempotencyKey?: string;
};

function requireAdminDb() {
    if (!adminDb) {
        throw new AuthError("Database unavailable", 500);
    }

    return adminDb;
}

function toTimestampNumber(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return Math.trunc(value);
    }

    if (value instanceof Date) {
        return value.getTime();
    }

    if (value && typeof value === "object") {
        const raw = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number; _seconds?: number; _nanoseconds?: number };
        if (typeof raw.toMillis === "function") {
            return raw.toMillis();
        }

        const seconds = typeof raw.seconds === "number"
            ? raw.seconds
            : typeof raw._seconds === "number"
                ? raw._seconds
                : null;
        const nanoseconds = typeof raw.nanoseconds === "number"
            ? raw.nanoseconds
            : typeof raw._nanoseconds === "number"
                ? raw._nanoseconds
                : 0;

        if (seconds !== null) {
            return Math.round((seconds * 1000) + (nanoseconds / 1_000_000));
        }
    }

    return 0;
}

function readString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown) {
    const normalized = readString(value);
    return normalized.length > 0 ? normalized : undefined;
}

function readNullableString(value: unknown) {
    const normalized = readString(value);
    return normalized.length > 0 ? normalized : null;
}

function describeMessagePreview(input: {
    text?: string;
    messageKind: ChatMessageKind;
}) {
    const trimmed = typeof input.text === "string" ? input.text.trim() : "";
    if (trimmed.length > 0) {
        return trimmed.length > 140
            ? `${trimmed.slice(0, 137).trimEnd()}...`
            : trimmed;
    }

    if (input.messageKind === "image") {
        return "Image sent";
    }

    if (input.messageKind === "video") {
        return "Video sent";
    }

    return "New message";
}

function mapCreatorMessage(id: string, raw: Record<string, unknown>): CreatorMessage {
    const threadId = readString(raw.threadId);
    return {
        id,
        threadId,
        creatorId: readString(raw.creatorId),
        userId: readString(raw.userId),
        senderRole: raw.senderRole === "creator" || raw.senderRole === "admin" ? raw.senderRole : "user",
        messageKind: raw.messageKind === "image" || raw.messageKind === "video" || raw.messageKind === "broadcast"
            ? raw.messageKind
            : "text",
        text: readOptionalString(softOpenChatValue(buildChatSoftSealScope(threadId, "text"), readOptionalString(raw.text))),
        assetUrl: readOptionalString(softOpenChatValue(buildChatSoftSealScope(threadId, "assetUrl"), readOptionalString(raw.assetUrl))),
        assetName: readOptionalString(softOpenChatValue(buildChatSoftSealScope(threadId, "assetName"), readOptionalString(raw.assetName))),
        assetMimeType: readOptionalString(raw.assetMimeType),
        costGd: typeof raw.costGd === "number" && Number.isFinite(raw.costGd) ? Math.max(0, Math.trunc(raw.costGd)) : 0,
        creatorAccrualId: readOptionalString(raw.creatorAccrualId),
        createdAt: toTimestampNumber(raw.createdAt),
        unsentAt: toTimestampNumber(raw.unsentAt) || undefined,
        unsentBy: readOptionalString(raw.unsentBy),
        moderationRemovedAt: toTimestampNumber(raw.moderationRemovedAt) || undefined,
        moderationRemovedBy: readOptionalString(raw.moderationRemovedBy),
    };
}

function mapCreatorMessageThread(id: string, raw: Record<string, unknown>): CreatorMessageThread {
    return {
        id,
        creatorId: readString(raw.creatorId),
        userId: readString(raw.userId),
        creatorDisplayName: readOptionalString(raw.creatorDisplayName),
        creatorUsername: readOptionalString(raw.creatorUsername),
        creatorPhotoURL: readNullableString(raw.creatorPhotoURL),
        userDisplayName: readOptionalString(raw.userDisplayName),
        userUsername: readOptionalString(raw.userUsername),
        userPhotoURL: readNullableString(raw.userPhotoURL),
        lastMessageAt: toTimestampNumber(raw.lastMessageAt),
        lastMessagePreview: readString(softOpenChatValue(buildChatSoftSealScope(id, "preview"), readString(raw.lastMessagePreview))) || "New message",
        messageCount: typeof raw.messageCount === "number" && Number.isFinite(raw.messageCount)
            ? Math.max(0, Math.trunc(raw.messageCount))
            : 0,
        lastMessageSenderRole: raw.lastMessageSenderRole === "creator" || raw.lastMessageSenderRole === "admin"
            ? raw.lastMessageSenderRole
            : raw.lastMessageSenderRole === "user"
                ? "user"
                : undefined,
        lastReadByUserAt: toTimestampNumber(raw.lastReadByUserAt) || undefined,
        lastReadByCreatorAt: toTimestampNumber(raw.lastReadByCreatorAt) || undefined,
        unreadCountForUser: typeof raw.unreadCountForUser === "number" && Number.isFinite(raw.unreadCountForUser)
            ? Math.max(0, Math.trunc(raw.unreadCountForUser))
            : 0,
        unreadCountForCreator: typeof raw.unreadCountForCreator === "number" && Number.isFinite(raw.unreadCountForCreator)
            ? Math.max(0, Math.trunc(raw.unreadCountForCreator))
            : 0,
        hiddenByUserAt: toTimestampNumber(raw.hiddenByUserAt) || undefined,
        hiddenByCreatorAt: toTimestampNumber(raw.hiddenByCreatorAt) || undefined,
        subscriberChatFree: raw.subscriberChatFree === true,
    };
}

function createUserSummary(uid: string, raw: Record<string, unknown>): UserSummary {
    return {
        uid,
        displayName: readString(raw.displayName) || readString(raw.username) || uid,
        username: readOptionalString(raw.username),
        photoURL: readNullableString(raw.photoURL),
        email: readNullableString(raw.email),
        role: readOptionalString(raw.role),
        status: readOptionalString(raw.status),
        creatorSettings: normalizeCreatorSettings(raw.creatorSettings),
        creatorRestrictions: normalizeCreatorRestrictions(raw.creatorRestrictions),
        raw,
    };
}

async function readUserSummary(uid: string) {
    const db = requireAdminDb();
    const snapshot = await db.collection("users").doc(uid).get();
    if (!snapshot.exists) {
        return null;
    }

    return createUserSummary(uid, snapshot.data() as Record<string, unknown>);
}

async function readUserSummaries(uids: string[]) {
    const db = requireAdminDb();
    const uniqueUids = Array.from(new Set(uids.filter((uid) => uid.trim().length > 0)));
    if (uniqueUids.length === 0) {
        return new Map<string, UserSummary>();
    }

    const refs = uniqueUids.map((uid) => db.collection("users").doc(uid));
    const snapshots = await db.getAll(...refs);
    const results = new Map<string, UserSummary>();

    snapshots.forEach((snapshot) => {
        if (!snapshot.exists) {
            return;
        }

        results.set(snapshot.id, createUserSummary(snapshot.id, snapshot.data() as Record<string, unknown>));
    });

    return results;
}

function resolveViewerRoleForThread(thread: Pick<CreatorMessageThread, "creatorId" | "userId">, viewerUid: string): ChatViewerRole {
    if (thread.creatorId === viewerUid) {
        return "creator";
    }

    if (thread.userId === viewerUid) {
        return "user";
    }

    throw new AuthError("Forbidden", 403);
}

function toChatThreadRecord(thread: CreatorMessageThread, viewerUid: string): ChatThreadRecord {
    const viewerRole = resolveViewerRoleForThread(thread, viewerUid);
    const isCreatorViewer = viewerRole === "creator";
    const counterpartId = isCreatorViewer ? thread.userId : thread.creatorId;
    const counterpartDisplayName = isCreatorViewer
        ? (thread.userDisplayName || thread.userUsername || thread.userId)
        : (thread.creatorDisplayName || thread.creatorUsername || thread.creatorId);
    const counterpartUsername = isCreatorViewer ? thread.userUsername : thread.creatorUsername;
    const counterpartPhotoURL = isCreatorViewer ? (thread.userPhotoURL ?? null) : (thread.creatorPhotoURL ?? null);

    return {
        ...thread,
        counterpartId,
        counterpartDisplayName,
        counterpartUsername,
        counterpartPhotoURL,
        viewerRole,
        unreadCount: resolveChatThreadUnreadCount(thread, viewerRole),
        readAt: resolveChatThreadReadAt(thread, viewerRole),
        counterpartReadAt: resolveChatThreadReadAt(thread, viewerRole === "creator" ? "user" : "creator"),
    };
}

function buildThreadBackfillPatch(thread: CreatorMessageThread, creator: UserSummary | undefined, participant: UserSummary | undefined) {
    const patch: Record<string, unknown> = {};

    if (!thread.creatorDisplayName && creator?.displayName) {
        patch.creatorDisplayName = creator.displayName;
    }
    if (!thread.creatorUsername && creator?.username) {
        patch.creatorUsername = creator.username;
    }
    if (thread.creatorPhotoURL == null && creator?.photoURL) {
        patch.creatorPhotoURL = creator.photoURL;
    }
    if (!thread.userDisplayName && participant?.displayName) {
        patch.userDisplayName = participant.displayName;
    }
    if (!thread.userUsername && participant?.username) {
        patch.userUsername = participant.username;
    }
    if (thread.userPhotoURL == null && participant?.photoURL) {
        patch.userPhotoURL = participant.photoURL;
    }
    if (thread.unreadCountForCreator == null) {
        patch.unreadCountForCreator = 0;
    }
    if (thread.unreadCountForUser == null) {
        patch.unreadCountForUser = 0;
    }
    if (thread.hiddenByCreatorAt == null) {
        patch.hiddenByCreatorAt = 0;
    }
    if (thread.hiddenByUserAt == null) {
        patch.hiddenByUserAt = 0;
    }

    return patch;
}

function shouldGrantSubscriberFreeChat(subscriptionActive: boolean, creatorSettings: CreatorSettings) {
    const monetization = resolveCreatorMonetizationSettings({
        creatorId: "chat_pricing_contract",
        rawSettings: creatorSettings,
        settingsConfigured: true,
    });
    const fanPassAccess = resolveFanPassAccess({
        creatorId: "chat_pricing_contract",
        fanUserId: "chat_pricing_contract",
        enabledByCreator: monetization.subscriberFreeChatEnabled,
        activeForUser: subscriptionActive,
        subscriptionStatus: subscriptionActive ? "active" : "missing",
        sourceTruth: "chat_pricing",
        price: 0,
        chatFreeForSubscribers: monetization.subscriberFreeChatEnabled,
    });
    return fanPassAccess.chatBypassStatus === "granted";
}

function buildChatPricingSummary(input: {
    purchasedBalanceGd: number;
    fanPassActive: boolean;
    subscriberFreeChatApplies: boolean;
    subscriberFreeChatEnabled: boolean;
    creatorSettings?: CreatorSettings;
}): ChatThreadPricing {
    const free = input.subscriberFreeChatApplies;
    const monetization = input.creatorSettings
        ? resolveCreatorMonetizationSettings({
            creatorId: "chat_pricing_contract",
            rawSettings: input.creatorSettings,
            settingsConfigured: true,
        })
        : null;

    return {
        textPriceGd: free ? 0 : monetization?.chatTextPriceGd ?? 1,
        imagePriceGd: free ? 0 : monetization?.chatImagePriceGd ?? 5,
        videoPriceGd: free ? 0 : monetization?.chatVideoPriceGd ?? 10,
        purchasedOnly: true,
        purchasedBalanceGd: Math.max(0, Math.trunc(input.purchasedBalanceGd)),
        fanPassActive: input.fanPassActive,
        subscriberFreeChatApplies: free,
        subscriberFreeChatEnabled: monetization?.subscriberFreeChatEnabled ?? input.subscriberFreeChatEnabled,
    };
}

function buildInsufficientFundsPayload(input: {
    requiredPriceGd: number;
    purchasedBalanceGd: number;
    subscriberFreeChatApplies: boolean;
    messageKind: ChatMessageKind;
}): ChatInsufficientFundsPayload {
    return {
        error: "You need more paid Gum Drops before you can send this creator message.",
        errorCode: "insufficient_paid_gumdrops",
        requiredPriceGd: input.requiredPriceGd,
        purchasedBalanceGd: input.purchasedBalanceGd,
        paidGdShortfall: Math.max(0, input.requiredPriceGd - input.purchasedBalanceGd),
        subscriberFreeChatApplies: input.subscriberFreeChatApplies,
        messageKind: input.messageKind,
    };
}

function readCreatorFirstName(creator: Pick<UserSummary, "displayName" | "username" | "uid">) {
    const source = creator.displayName || creator.username || creator.uid;
    const [firstName] = source.trim().split(/\s+/).filter(Boolean);
    return firstName || "this creator";
}

async function maybeSendChatPaidGdLowBalanceReminder(input: {
    userId: string;
    creator: UserSummary;
    purchasedBalanceGd: number;
}) {
    const purchasedBalanceGd = Math.max(0, Math.trunc(input.purchasedBalanceGd));
    if (purchasedBalanceGd >= 100 || !adminDb) {
        return false;
    }

    const userRef = adminDb.collection("users").doc(input.userId);
    const now = Date.now();
    const creatorFirstName = readCreatorFirstName(input.creator);
    let reminderSent = false;

    await adminDb.runTransaction(async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) {
            return;
        }

        const userData = userSnap.data() as Record<string, unknown>;
        const reminderState = normalizeChatPaidGdLowBalanceReminderState(userData.chatPaidGdLowBalanceReminder);
        if (!reminderState.eligibleAgain) {
            return;
        }
        const notificationIdentity = buildNotificationIdempotencyKey({
            type: "chat_paid_gd_low_balance",
            recipientId: input.userId,
            lifecycleEvent: "chat_paid_gd_low_balance",
            audience: `user:${reminderState.reminderCycleId}`,
        });
        const notificationRef = adminDb.collection("notifications").doc(buildNotificationDocumentId(notificationIdentity));
        const notificationSnap = await transaction.get(notificationRef);

        const nextReminderState = buildChatPaidGdLowBalanceReminderAfterSend({
            current: reminderState,
            paidBalanceGd: purchasedBalanceGd,
            remindedAt: now,
        });

        transaction.set(userRef, {
            chatPaidGdLowBalanceReminder: nextReminderState,
        }, { merge: true });

        if (!notificationSnap.exists) {
            transaction.set(notificationRef, {
                ...buildNotificationRecord({
                    title: "Running low on paid GumDrops",
                    message: "Paid GumDrops let you message creators directly. Refill before your next chat.",
                    type: "info",
                    target: { global: false, userIds: [input.userId] },
                    link: "/dashboard/chat",
                    createdAtMs: now,
                    readBy: [],
                    targetUserId: input.userId,
                    recipientUserId: input.userId,
                    actorCreatorId: input.creator.uid,
                    actorType: "creator",
                    sourceComponent: "chat_paid_gd_low_balance_reminder",
                    sourceEntityType: "chat_thread",
                    sourceEntityId: buildChatThreadId(input.creator.uid, input.userId),
                    route: "/dashboard/chat",
                    surface: "foreground",
                    metadata: {
                        idempotencyKey: notificationIdentity,
                        dedupeKey: notificationIdentity,
                        lifecycleEvent: "chat_paid_gd_low_balance",
                        creatorId: input.creator.uid,
                        creatorFirstName,
                        purchasedBalanceGd,
                        requiredMinPaidGd: 1,
                        ctaLabel: "Get More GumDrops",
                    },
                }),
                createdAt: now,
            });
        }

        reminderSent = true;
    });

    if (!reminderSent) {
        return false;
    }

    await touchNotificationsRuntime(now);
    await trackServerEvent("chat_low_paid_gd_reminder_sent", {
        source_component: "chat_paid_gd_low_balance_reminder",
        route: "/dashboard/chat",
        creator_id: input.creator.uid,
        creator_first_name: creatorFirstName,
        paid_balance_gd: purchasedBalanceGd,
        required_min_paid_gd: 1,
        subscriber_free_chat_applies: false,
    }, input.userId).catch(() => null);

    return true;
}

export class ChatClientError extends Error {
    status: number;
    body: Record<string, unknown>;

    constructor(message: string, status: number, body: Record<string, unknown>) {
        super(message);
        this.name = "ChatClientError";
        this.status = status;
        this.body = body;
    }
}

export function toChatClientError(error: unknown) {
    if (!(error instanceof ChatClientError)) {
        return null;
    }

    return {
        status: error.status,
        body: error.body,
    };
}

function buildChatErrorBody(input: {
    error: string;
    errorCode: string;
    detail?: Record<string, unknown>;
}) {
    return {
        error: input.error,
        errorCode: input.errorCode,
        ...input.detail,
    };
}

async function listMessagesForThread(threadId: string) {
    const db = requireAdminDb();
    const snapshot = await db.collection(CHAT_COLLECTIONS.messages)
        .where("threadId", "==", threadId)
        .get();

    return snapshot.docs
        .map((doc) => mapCreatorMessage(doc.id, doc.data() as Record<string, unknown>))
        .sort((left, right) => left.createdAt - right.createdAt);
}

async function readSubscriptionActive(userId: string, creatorId: string) {
    const db = requireAdminDb();
    const snapshot = await db.collection("creator_subscriptions").doc(`${userId}__${creatorId}`).get();
    return snapshot.exists && readString((snapshot.data() as Record<string, unknown>).status) === "active";
}

function buildSeedThread(input: {
    creator: UserSummary;
    participant: UserSummary;
    viewerUid: string;
    subscriberChatFree: boolean;
}): ChatThreadRecord {
    const baseThread: CreatorMessageThread = {
        id: buildChatThreadId(input.creator.uid, input.participant.uid),
        creatorId: input.creator.uid,
        userId: input.participant.uid,
        creatorDisplayName: input.creator.displayName,
        creatorUsername: input.creator.username,
        creatorPhotoURL: input.creator.photoURL ?? null,
        userDisplayName: input.participant.displayName,
        userUsername: input.participant.username,
        userPhotoURL: input.participant.photoURL ?? null,
        lastMessageAt: 0,
        lastMessagePreview: "No messages yet",
        messageCount: 0,
        lastReadByCreatorAt: 0,
        lastReadByUserAt: 0,
        unreadCountForCreator: 0,
        unreadCountForUser: 0,
        subscriberChatFree: input.subscriberChatFree,
    };

    return toChatThreadRecord(baseThread, input.viewerUid);
}

function canSeedChatThreadForCreator(creator: UserSummary | null | undefined): creator is UserSummary {
    if (!creator) {
        return false;
    }

    return isCreatorMessagingAvailable({
        role: creator.role,
        status: creator.status,
        creatorApplication: creator.raw.creatorApplication,
        creatorSettings: creator.creatorSettings,
        creatorRestrictions: creator.creatorRestrictions,
    });
}

async function resolveLegacyOrExistingThread(input: {
    threadId: string;
    viewerUid: string;
}): Promise<CreatorMessageThread | ChatThreadRecord | null> {
    const db = requireAdminDb();
    const threadSnapshot = await db.collection(CHAT_COLLECTIONS.threads).doc(input.threadId).get();
    if (threadSnapshot.exists) {
        return mapCreatorMessageThread(threadSnapshot.id, threadSnapshot.data() as Record<string, unknown>);
    }

    const parsed = parseCreatorThreadId(input.threadId);
    if (!parsed || (parsed.creatorId !== input.viewerUid && parsed.userId !== input.viewerUid)) {
        return null;
    }

    const [creator, participant] = await Promise.all([
        readUserSummary(parsed.creatorId),
        readUserSummary(parsed.userId),
    ]);
    if (!canSeedChatThreadForCreator(creator) || !participant) {
        return null;
    }

    const seededCreator = creator;
    const subscriptionActive = await readSubscriptionActive(parsed.userId, parsed.creatorId);
    return buildSeedThread({
        creator: seededCreator,
        participant,
        viewerUid: input.viewerUid,
        subscriberChatFree: shouldGrantSubscriberFreeChat(subscriptionActive, seededCreator.creatorSettings),
    });
}

export async function listChatThreadsForViewer(input: {
    viewerUid: string;
    viewerRole: ChatViewerRole;
    creatorId?: string | null;
}) {
    const db = requireAdminDb();
    const field = input.viewerRole === "creator" ? "creatorId" : "userId";
    const snapshot = await db.collection(CHAT_COLLECTIONS.threads).where(field, "==", input.viewerUid).get();
    const threads = snapshot.docs.map((doc) => mapCreatorMessageThread(doc.id, doc.data() as Record<string, unknown>));
    const profileMap = await readUserSummaries(threads.flatMap((thread) => [thread.creatorId, thread.userId]));

    await Promise.allSettled(threads.map(async (thread) => {
        const patch = buildThreadBackfillPatch(thread, profileMap.get(thread.creatorId), profileMap.get(thread.userId));
        if (Object.keys(patch).length === 0) {
            return;
        }

        await db.collection(CHAT_COLLECTIONS.threads).doc(thread.id).set(patch, { merge: true });
    }));

    const records = threads
        .map((thread) => {
            const creator = profileMap.get(thread.creatorId);
            const participant = profileMap.get(thread.userId);
            return toChatThreadRecord({
                ...thread,
                creatorDisplayName: thread.creatorDisplayName || creator?.displayName,
                creatorUsername: thread.creatorUsername || creator?.username,
                creatorPhotoURL: thread.creatorPhotoURL ?? creator?.photoURL ?? null,
                userDisplayName: thread.userDisplayName || participant?.displayName,
                userUsername: thread.userUsername || participant?.username,
                userPhotoURL: thread.userPhotoURL ?? participant?.photoURL ?? null,
            }, input.viewerUid);
        })
        .filter((thread) => isChatThreadVisibleToViewer(thread, thread.viewerRole))
        .sort((left, right) => right.lastMessageAt - left.lastMessageAt);

    const selectedCreatorId = input.viewerRole === "user" ? input.creatorId ?? null : null;
    let selectedThreadId = selectedCreatorId
        ? buildChatThreadId(selectedCreatorId, input.viewerUid)
        : null;

    if (selectedThreadId && selectedCreatorId && !records.some((entry) => entry.id === selectedThreadId)) {
        const [creator, participant] = await Promise.all([
            readUserSummary(selectedCreatorId),
            readUserSummary(input.viewerUid),
        ]);

        if (canSeedChatThreadForCreator(creator) && participant) {
            const seededCreator = creator;
            const subscriptionActive = await readSubscriptionActive(input.viewerUid, selectedCreatorId);
            records.unshift(buildSeedThread({
                creator: seededCreator,
                participant,
                viewerUid: input.viewerUid,
                subscriberChatFree: shouldGrantSubscriberFreeChat(subscriptionActive, seededCreator.creatorSettings),
            }));
        } else {
            selectedThreadId = null;
        }
    }

    return {
        threads: records,
        selectedThreadId,
    };
}

export async function getChatThreadDetailForViewer(input: {
    viewerUid: string;
    callerRole: string;
    threadId: string;
}) {
    const threadOrSeed = await resolveLegacyOrExistingThread({
        threadId: input.threadId,
        viewerUid: input.viewerUid,
    });

    if (!threadOrSeed) {
        return null;
    }

    const threadExists = !("counterpartId" in threadOrSeed);
    const normalizedThreadRecord: ChatThreadRecord = "counterpartId" in threadOrSeed
        ? threadOrSeed as ChatThreadRecord
        : toChatThreadRecord(threadOrSeed, input.viewerUid);
    const viewerRole = normalizedThreadRecord.viewerRole;
    const [creator, participant, messages] = await Promise.all([
        readUserSummary(normalizedThreadRecord.creatorId),
        readUserSummary(normalizedThreadRecord.userId),
        listMessagesForThread(normalizedThreadRecord.id),
    ]);

    if (!creator || !participant) {
        throw new AuthError("Chat participants not found", 404);
    }

    const threadRecord = toChatThreadRecord({
        ...normalizedThreadRecord,
        creatorDisplayName: normalizedThreadRecord.creatorDisplayName || creator.displayName,
        creatorUsername: normalizedThreadRecord.creatorUsername || creator.username,
        creatorPhotoURL: normalizedThreadRecord.creatorPhotoURL ?? creator.photoURL ?? null,
        userDisplayName: normalizedThreadRecord.userDisplayName || participant.displayName,
        userUsername: normalizedThreadRecord.userUsername || participant.username,
        userPhotoURL: normalizedThreadRecord.userPhotoURL ?? participant.photoURL ?? null,
    }, input.viewerUid);
    if (!isChatThreadVisibleToViewer(threadRecord, viewerRole)) {
        return null;
    }
    const subscriptionActive = await readSubscriptionActive(threadRecord.userId, threadRecord.creatorId);
    const subscriberFreeChatApplies = shouldGrantSubscriberFreeChat(subscriptionActive, creator.creatorSettings);
    const participantBalance = viewerRole === "user"
        ? readSourceAwareBalance(participant.raw)
        : { total: 0, purchased: 0, reward: 0 };
    const pricing = buildChatPricingSummary({
        purchasedBalanceGd: participantBalance.purchased,
        fanPassActive: subscriptionActive,
        subscriberFreeChatApplies,
        subscriberFreeChatEnabled: creator.creatorSettings.chatFreeForSubscribers !== false,
        creatorSettings: creator.creatorSettings,
    });
    const paidGdGate = buildChatPaidGdGateState({
        viewerRole,
        pricing,
    });

    if (viewerRole === "user" && paidGdGate && !paidGdGate.creatorViewerBypass) {
        await maybeSendChatPaidGdLowBalanceReminder({
            userId: threadRecord.userId,
            creator,
            purchasedBalanceGd: paidGdGate.purchasedBalanceGd,
        }).catch((error) => {
            recordRouteWarning("chat/thread", "Chat paid GumDrops reminder degraded", error, {
                channel: "runtime",
                detail: {
                    threadId: threadRecord.id,
                    creatorId: creator.uid,
                    userId: threadRecord.userId,
                    purchasedBalanceGd: paidGdGate.purchasedBalanceGd,
                },
            });
        });
    }

    return {
        thread: threadRecord,
        messages,
        pricing,
        threadExists,
    } satisfies ChatThreadDetail;
}

export async function markChatThreadReadForViewer(input: {
    viewerUid: string;
    threadId: string;
}) {
    const db = requireAdminDb();
    const threadSnapshot = await db.collection(CHAT_COLLECTIONS.threads).doc(input.threadId).get();
    if (!threadSnapshot.exists) {
        return {
            success: true,
            threadId: input.threadId,
            readAt: Date.now(),
        };
    }

    const thread = mapCreatorMessageThread(threadSnapshot.id, threadSnapshot.data() as Record<string, unknown>);
    const viewerRole = resolveViewerRoleForThread(thread, input.viewerUid);
    const now = Math.max(Date.now(), thread.lastMessageAt || 0);
    const patch = viewerRole === "creator"
        ? {
            lastReadByCreatorAt: now,
            unreadCountForCreator: 0,
        }
        : {
            lastReadByUserAt: now,
            unreadCountForUser: 0,
        };

    await db.collection(CHAT_COLLECTIONS.threads).doc(input.threadId).set(patch, { merge: true });

    return {
        success: true,
        threadId: input.threadId,
        readAt: now,
    };
}

export async function hideChatThreadForViewer(input: {
    viewerUid: string;
    threadId: string;
}) {
    const db = requireAdminDb();
    const threadSnapshot = await db.collection(CHAT_COLLECTIONS.threads).doc(input.threadId).get();
    if (!threadSnapshot.exists) {
        return {
            success: true,
            threadId: input.threadId,
            hiddenAt: Date.now(),
        };
    }

    const thread = mapCreatorMessageThread(threadSnapshot.id, threadSnapshot.data() as Record<string, unknown>);
    const viewerRole = resolveViewerRoleForThread(thread, input.viewerUid);
    const now = Date.now();
    const patch = viewerRole === "creator"
        ? {
            hiddenByCreatorAt: now,
            unreadCountForCreator: 0,
        }
        : {
            hiddenByUserAt: now,
            unreadCountForUser: 0,
        };

    await db.collection(CHAT_COLLECTIONS.threads).doc(input.threadId).set(patch, { merge: true });

    return {
        success: true,
        threadId: input.threadId,
        hiddenAt: now,
    };
}

export async function sendChatMessageForViewer(input: SendChatMessageInput) {
    const db = requireAdminDb();
    const parsedThread = parseCreatorThreadId(input.threadId);
    if (!parsedThread) {
        throw new ChatClientError("Invalid chat thread.", 400, {
            error: "Invalid chat thread.",
            errorCode: "invalid_thread",
        });
    }

    const viewerRole: ChatViewerRole = parsedThread.creatorId === input.callerUid
        ? "creator"
        : parsedThread.userId === input.callerUid
            ? "user"
            : (() => {
                throw new ChatClientError("You are not allowed to send messages in this thread.", 403, buildChatErrorBody({
                    error: "You are not allowed to send messages in this thread.",
                    errorCode: "forbidden",
                }));
            })();

    const messageKind = normalizeChatMessageKind(input.messageKind);
    const text = readOptionalString(input.text);
    const assetUrl = readOptionalString(input.assetUrl);
    const assetName = readOptionalString(input.assetName);
    const assetMimeType = readOptionalString(input.assetMimeType);
    if (!text && !assetUrl) {
        throw new ChatClientError("Add a message or attachment before sending.", 400, buildChatErrorBody({
            error: "Add a message or attachment before sending.",
            errorCode: "empty_message",
        }));
    }
    if ((messageKind === "image" || messageKind === "video") && !assetUrl) {
        throw new ChatClientError("This message type requires an attachment.", 400, buildChatErrorBody({
            error: "This message type requires an attachment.",
            errorCode: "invalid_attachment",
            detail: {
                messageKind,
            },
        }));
    }

    const idempotencyKey = buildCreatorExperienceIdempotencyKey({
        action: "private_chat",
        userId: parsedThread.userId,
        creatorId: parsedThread.creatorId,
        clientKey: input.idempotencyKey,
        payloadParts: [
            input.threadId,
            input.callerUid,
            messageKind,
            text,
            assetUrl,
            assetName,
            assetMimeType,
        ],
    });
    const recordIds = buildCreatorExperienceRecordIds({
        action: "private_chat",
        idempotencyKey,
    });
    const actorMarker = assertKnownActor(buildActorMarker({
        actor: {
            uid: input.callerUid,
            email: input.callerEmail,
            role: input.callerRole,
        },
        performedAs: "own_account",
        surface: "creator_experiences",
        route: "/api/chat/threads/[threadId]/messages",
        actionKey: CREATOR_EXPERIENCE_PAID_EVENTS.private_chat,
        targetCreatorId: parsedThread.creatorId,
        occurredAt: Date.now(),
        dedupeKey: idempotencyKey,
        source: "creator_experience_transaction",
    }));

    const creatorRef = db.collection("users").doc(parsedThread.creatorId);
    const participantRef = db.collection("users").doc(parsedThread.userId);
    const threadRef = db.collection(CHAT_COLLECTIONS.threads).doc(input.threadId);
    const messageRef = db.collection(CHAT_COLLECTIONS.messages).doc(recordIds.creatorExperienceRecordId);
    const transactionRef = db.collection("transactions").doc(recordIds.userTransactionId);
    const ledgerRef = db.collection(CREATOR_COLLECTIONS.ledgerAccruals).doc(recordIds.creatorAccrualId);

    const sendResult = await db.runTransaction(async (transaction) => {
        const [creatorSnap, participantSnap, threadSnap, subscriptionSnap, messageSnap, transactionSnap] = await Promise.all([
            transaction.get(creatorRef),
            transaction.get(participantRef),
            transaction.get(threadRef),
            transaction.get(db.collection("creator_subscriptions").doc(`${parsedThread.userId}__${parsedThread.creatorId}`)),
            transaction.get(messageRef),
            transaction.get(transactionRef),
        ]);

        if (!creatorSnap.exists || !participantSnap.exists) {
            throw new ChatClientError("Creator or participant not found.", 404, buildChatErrorBody({
                error: "Creator or participant not found.",
                errorCode: "participants_not_found",
            }));
        }

        const creator = createUserSummary(parsedThread.creatorId, creatorSnap.data() as Record<string, unknown>);
        const participant = createUserSummary(parsedThread.userId, participantSnap.data() as Record<string, unknown>);
        if (!canSeedChatThreadForCreator(creator)) {
            throw new ChatClientError("Messaging is unavailable for this creator.", 409, buildChatErrorBody({
                error: "Messaging is unavailable for this creator.",
                errorCode: "creator_unavailable",
            }));
        }

        const subscriptionActive = subscriptionSnap.exists && readString((subscriptionSnap.data() as Record<string, unknown>).status) === "active";
        const subscriberFreeChatApplies = shouldGrantSubscriberFreeChat(subscriptionActive, creator.creatorSettings);
        const chatMonetization = resolveCreatorMonetizationSettings({
            creatorId: creator.uid,
            rawSettings: creator.creatorSettings,
            settingsConfigured: true,
        });
        const participantBalance = viewerRole === "user"
            ? readSourceAwareBalance(participant.raw)
            : { total: 0, purchased: 0, reward: 0 };
        let nextParticipantBalance = participantBalance;
        const costGd = viewerRole === "creator"
            ? 0
            : subscriberFreeChatApplies
                ? 0
                : messageKind === "image"
                    ? chatMonetization.chatImagePriceGd
                    : messageKind === "video"
                        ? chatMonetization.chatVideoPriceGd
                        : chatMonetization.chatTextPriceGd;
        if (messageSnap.exists || transactionSnap.exists) {
            if (!messageSnap.exists || !threadSnap.exists) {
                throw new ChatClientError("This creator message is already being processed.", 409, buildChatErrorBody({
                    error: "This creator message is already being processed.",
                    errorCode: "duplicate_processing",
                    detail: {
                        idempotencyKey,
                    },
                }));
            }

            const existingMessage = mapCreatorMessage(messageRef.id, messageSnap.data() as Record<string, unknown>);
            const existingThread = mapCreatorMessageThread(threadSnap.id, threadSnap.data() as Record<string, unknown>);
            const existingAccrualId = existingMessage.creatorAccrualId;

            return {
                thread: toChatThreadRecord(existingThread, input.callerUid),
                message: existingMessage,
                pricing: buildChatPricingSummary({
                    purchasedBalanceGd: viewerRole === "user" ? participantBalance.purchased : 0,
                    fanPassActive: subscriptionActive,
                    subscriberFreeChatApplies,
                    subscriberFreeChatEnabled: creator.creatorSettings.chatFreeForSubscribers !== false,
                    creatorSettings: creator.creatorSettings,
                }),
                costGd: existingMessage.costGd,
                creatorAccrualId: existingAccrualId,
                duplicatePrevented: true,
                debug: buildCreatorExperienceTransactionDebug({
                    userTransactionId: transactionRef.id,
                    creatorAccrualId: existingAccrualId ?? ledgerRef.id,
                    creatorExperienceRecordId: messageRef.id,
                    priceGd: existingMessage.costGd,
                    idempotencyKey,
                    duplicatePrevented: true,
                    sourceAwareBalanceBefore: participantBalance,
                    sourceAwareBalanceAfter: participantBalance,
                }),
            };
        }
        const preview = describeMessagePreview({
            text,
            messageKind,
        });
        const now = Date.now();
        let creatorAccrualId: string | undefined;
        let transactionDebug = buildCreatorExperienceTransactionDebug({
            userTransactionId: transactionRef.id,
            creatorAccrualId: ledgerRef.id,
            creatorExperienceRecordId: messageRef.id,
            priceGd: costGd,
            idempotencyKey,
            duplicatePrevented: false,
            sourceAwareBalanceBefore: participantBalance,
            sourceAwareBalanceAfter: participantBalance,
        });

        if (viewerRole === "user" && costGd > 0) {
            const spend = spendCreatorExperienceGumdrops(participantBalance, costGd, "message");
            if (!spend.ok) {
                throw new ChatClientError("Insufficient paid Gum Drops.", 409, buildInsufficientFundsPayload({
                    requiredPriceGd: costGd,
                    purchasedBalanceGd: participantBalance.purchased,
                    subscriberFreeChatApplies,
                    messageKind,
                }));
            }

            nextParticipantBalance = spend.next;
            transactionDebug = buildCreatorExperienceTransactionDebug({
                userTransactionId: transactionRef.id,
                creatorAccrualId: ledgerRef.id,
                creatorExperienceRecordId: messageRef.id,
                priceGd: costGd,
                idempotencyKey,
                duplicatePrevented: false,
                sourceAwareBalanceBefore: participantBalance,
                sourceAwareBalanceAfter: spend.next,
            });
            transaction.update(participantRef, buildSourceAwareBalancePatch(spend.next));
            const accrual = buildCreatorAccrual({
                creatorId: parsedThread.creatorId,
                userId: parsedThread.userId,
                sourceType: "message",
                sourceId: messageRef.id,
                grossSpendGd: costGd,
                createdAt: now,
            });
            creatorAccrualId = ledgerRef.id;
            const attribution = buildCreatorExperienceAttribution({
                creatorId: parsedThread.creatorId,
                userId: parsedThread.userId,
                sourceType: "message",
                sourceId: messageRef.id,
                grossSpendGd: costGd,
                purchasedAmountSpent: spend.purchasedSpent,
                rewardAmountSpent: spend.rewardSpent,
                userTransactionId: transactionRef.id,
                creatorAccrualId: ledgerRef.id,
                creatorExperienceRecordId: messageRef.id,
                idempotencyKey,
                sourceAwareBalanceBefore: participantBalance,
                sourceAwareBalanceAfter: spend.next,
            });
            const attributionExtra = buildCreatorExperienceTransactionAttributionExtra(attribution);
            transaction.set(ledgerRef, {
                ...accrual,
                ...attributionExtra,
                userTransactionId: transactionRef.id,
                creatorExperienceRecordId: messageRef.id,
                idempotencyKey,
                platformShareGd: attribution.platformShareGd,
            });
            transaction.set(transactionRef, buildCompletedGumdropTransaction({
                userId: parsedThread.userId,
                type: messageKind === "video" ? "creator_message_video" : messageKind === "image" ? "creator_message_image" : "creator_message_text",
                amount: -costGd,
                creatorId: parsedThread.creatorId,
                description: `Creator ${messageKind} message`,
                balanceBefore: participantBalance.total,
                balanceAfter: spend.next.total,
                extra: {
                    ...attributionExtra,
                    creatorRevenueShareGd: accrual.creatorShareGd,
                    creatorRevenueShareUsd: accrual.cashoutValueUsd,
                    idempotencyKey,
                    duplicatePrevented: false,
                },
            }));
        }

        const existingThread = threadSnap.exists
            ? mapCreatorMessageThread(threadSnap.id, threadSnap.data() as Record<string, unknown>)
            : null;
        const nextMessageCount = existingThread ? existingThread.messageCount + 1 : 1;
        const threadPatch = {
            creatorId: parsedThread.creatorId,
            userId: parsedThread.userId,
            creatorDisplayName: creator.displayName,
            creatorUsername: creator.username ?? null,
            creatorPhotoURL: creator.photoURL ?? null,
            userDisplayName: participant.displayName,
            userUsername: participant.username ?? null,
            userPhotoURL: participant.photoURL ?? null,
            lastMessageAt: now,
            lastMessagePreview: preview,
            lastMessageSenderRole: viewerRole,
            messageCount: nextMessageCount,
            subscriberChatFree: subscriberFreeChatApplies,
            hiddenByCreatorAt: 0,
            hiddenByUserAt: 0,
            ...(viewerRole === "creator"
                ? {
                    lastReadByCreatorAt: now,
                    unreadCountForCreator: 0,
                    unreadCountForUser: Math.max(0, existingThread?.unreadCountForUser ?? 0) + 1,
                }
                : {
                    lastReadByUserAt: now,
                    unreadCountForUser: 0,
                    unreadCountForCreator: Math.max(0, existingThread?.unreadCountForCreator ?? 0) + 1,
                }),
        };

        const messageRecord = sanitizeFirestorePayload({
            threadId: input.threadId,
            creatorId: parsedThread.creatorId,
            userId: parsedThread.userId,
            senderRole: viewerRole,
            messageKind,
            text: softSealChatValue(buildChatSoftSealScope(input.threadId, "text"), text),
            assetUrl: softSealChatValue(buildChatSoftSealScope(input.threadId, "assetUrl"), assetUrl),
            assetName: softSealChatValue(buildChatSoftSealScope(input.threadId, "assetName"), assetName),
            assetMimeType,
            costGd,
            creatorAccrualId,
            userTransactionId: costGd > 0 ? transactionRef.id : null,
            idempotencyKey,
            duplicatePrevented: false,
            transactionDebug,
            createdAt: now,
        });
        const sealedThreadPatch = {
            ...threadPatch,
            lastMessagePreview: softSealChatValue(buildChatSoftSealScope(input.threadId, "preview"), preview) || "New message",
        };
        transaction.set(messageRef, messageRecord);
        transaction.set(threadRef, sealedThreadPatch, { merge: true });
        const nextThreadState = existingThread
            ? {
                ...existingThread,
                ...sealedThreadPatch,
            }
            : sealedThreadPatch;

        return {
            thread: toChatThreadRecord(mapCreatorMessageThread(input.threadId, nextThreadState), input.callerUid),
            message: mapCreatorMessage(messageRef.id, messageRecord),
            pricing: buildChatPricingSummary({
                purchasedBalanceGd: viewerRole === "user" ? nextParticipantBalance.purchased : 0,
                fanPassActive: subscriptionActive,
                subscriberFreeChatApplies,
                subscriberFreeChatEnabled: creator.creatorSettings.chatFreeForSubscribers !== false,
                creatorSettings: creator.creatorSettings,
            }),
            costGd,
            creatorAccrualId,
            duplicatePrevented: false,
            debug: transactionDebug,
        };
    });

    const trackingResults = await Promise.allSettled([
        Promise.resolve().then(() => trackServerEvent("chat_gating_checked", buildChatGatingTelemetryPayload({
            eventName: "chat_gating_checked",
            userId: input.callerUid,
            threadId: sendResult.thread.id,
            creatorId: sendResult.thread.creatorId,
            messageKind: normalizeChatMessageKind(sendResult.message.messageKind),
            status: "allowed",
            bypass: sendResult.thread.viewerRole === "creator"
                ? "creator_reply"
                : sendResult.pricing.subscriberFreeChatApplies
                    ? "fan_pass_subscriber"
                    : null,
            requiredPriceGd: sendResult.costGd,
            purchasedBalanceGd: sendResult.pricing.purchasedBalanceGd,
            paidGdShortfall: 0,
            sourceComponent: "chat_server_send",
        }), input.callerUid)),
        sendResult.thread.viewerRole === "user" && sendResult.pricing.subscriberFreeChatApplies
            ? Promise.resolve().then(() => trackServerEvent("chat_fan_pass_bypass_applied", buildChatGatingTelemetryPayload({
                eventName: "chat_fan_pass_bypass_applied",
                userId: input.callerUid,
                threadId: sendResult.thread.id,
                creatorId: sendResult.thread.creatorId,
                messageKind: normalizeChatMessageKind(sendResult.message.messageKind),
                status: "allowed",
                bypass: "fan_pass_subscriber",
                requiredPriceGd: 0,
                purchasedBalanceGd: sendResult.pricing.purchasedBalanceGd,
                paidGdShortfall: 0,
                sourceComponent: "chat_server_send",
            }), input.callerUid))
            : Promise.resolve(null),
        sendResult.thread.viewerRole === "creator"
            ? Promise.resolve().then(() => trackServerEvent("chat_creator_reply_bypass_applied", buildChatGatingTelemetryPayload({
                eventName: "chat_creator_reply_bypass_applied",
                userId: input.callerUid,
                threadId: sendResult.thread.id,
                creatorId: sendResult.thread.creatorId,
                messageKind: normalizeChatMessageKind(sendResult.message.messageKind),
                status: "allowed",
                bypass: "creator_reply",
                requiredPriceGd: 0,
                purchasedBalanceGd: 0,
                paidGdShortfall: 0,
                sourceComponent: "chat_server_send",
            }), input.callerUid))
            : Promise.resolve(null),
        Promise.resolve().then(() => trackServerEvent(
            sendResult.message.messageKind === "text" ? "creator_message_sent" : "creator_media_sent",
            {
                ...buildCreatorExperienceTelemetryPayload({
                    marker: actorMarker,
                    creatorId: sendResult.thread.creatorId,
                    priceGd: sendResult.costGd,
                    idempotencyKey,
                    duplicatePrevented: sendResult.duplicatePrevented,
                    userTransactionId: sendResult.debug.userTransactionId,
                    creatorAccrualId: sendResult.creatorAccrualId,
                    creatorExperienceRecordId: sendResult.message.id,
                    extra: {
                        thread_id: sendResult.thread.id,
                        message_id: sendResult.message.id,
                        media_kind: sendResult.message.messageKind,
                    },
                }),
                idempotency_key: idempotencyKey,
                spend_gd: sendResult.costGd,
                media_kind: sendResult.message.messageKind,
            },
            input.callerUid,
        )),
        sendResult.thread.viewerRole === "user"
            ? Promise.resolve().then(() => trackServerEvent(CREATOR_EXPERIENCE_PAID_EVENTS.private_chat, buildCreatorExperienceTelemetryPayload({
                marker: actorMarker,
                creatorId: sendResult.thread.creatorId,
                priceGd: sendResult.costGd,
                idempotencyKey,
                duplicatePrevented: sendResult.duplicatePrevented,
                userTransactionId: sendResult.debug.userTransactionId,
                creatorAccrualId: sendResult.creatorAccrualId,
                creatorExperienceRecordId: sendResult.message.id,
                extra: {
                    thread_id: sendResult.thread.id,
                    message_id: sendResult.message.id,
                    media_kind: sendResult.message.messageKind,
                },
            }), input.callerUid))
            : Promise.resolve(null),
        sendResult.creatorAccrualId
            ? Promise.resolve().then(() => trackServerEvent("creator_ledger_accrual_created", {
                ...buildCreatorExperienceTelemetryPayload({
                    marker: actorMarker,
                    creatorId: sendResult.thread.creatorId,
                    priceGd: sendResult.costGd,
                    idempotencyKey,
                    duplicatePrevented: sendResult.duplicatePrevented,
                    userTransactionId: sendResult.debug.userTransactionId,
                    creatorAccrualId: sendResult.creatorAccrualId,
                    creatorExperienceRecordId: sendResult.message.id,
                }),
                creator_id: sendResult.thread.creatorId,
                source_type: "message",
                accrual_id: sendResult.creatorAccrualId,
                spend_gd: sendResult.costGd,
            }, input.callerUid))
            : Promise.resolve(null),
    ]);

    const trackingFailures = trackingResults
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) => getErrorMessage(result.reason))
        .filter((message, index, list) => message && list.indexOf(message) === index);

    if (trackingFailures.length > 0) {
        recordRouteWarning("chat/messages", "Chat send post-write tracking degraded", new Error(trackingFailures.join(" | ")), {
            channel: "runtime",
            detail: {
                threadId: input.threadId,
                callerRole: input.callerRole,
                trackingFailures,
            },
        });
        await recordServerDiagnostic({
            channel: "runtime",
            severity: "warn",
            message: "Chat send completed with post-write tracking failures",
            detail: {
                threadId: input.threadId,
                callerUid: input.callerUid,
                trackingFailures,
            },
        });
    }

    return {
        ...sendResult,
        warnings: trackingFailures.length > 0
            ? [{
                code: "post_send_tracking_failure",
                detail: trackingFailures.join(" | "),
            }]
            : [],
    };
}

export async function listChatMessagesForViewer(input: {
    viewerUid: string;
    threadId: string;
}) {
    const detail = await getChatThreadDetailForViewer({
        viewerUid: input.viewerUid,
        callerRole: "",
        threadId: input.threadId,
    });
    if (!detail) {
        return [];
    }

    return detail.messages;
}

export async function safeListChatThreadsForViewer(input: {
    viewerUid: string;
    viewerRole: ChatViewerRole;
    creatorId?: string | null;
}) {
    try {
        return await listChatThreadsForViewer(input);
    } catch (error) {
        recordRouteWarning("chat/threads", "Chat thread list failed", error, {
            channel: "runtime",
            detail: {
                viewerRole: input.viewerRole,
                creatorId: input.creatorId ?? null,
            },
        });
        throw error;
    }
}

export async function safeGetChatThreadDetailForViewer(input: {
    viewerUid: string;
    callerRole: string;
    threadId: string;
}) {
    try {
        return await getChatThreadDetailForViewer(input);
    } catch (error) {
        recordRouteWarning("chat/thread", "Chat thread detail failed", error, {
            channel: "runtime",
            detail: {
                threadId: input.threadId,
                callerRole: input.callerRole,
            },
        });
        throw error;
    }
}

export async function safeSendChatMessageForViewer(input: SendChatMessageInput) {
    try {
        return await sendChatMessageForViewer(input);
    } catch (error) {
        if (error instanceof ChatClientError) {
            const errorCode = typeof error.body.errorCode === "string" ? error.body.errorCode : "blocked_unknown";
            const messageKind = normalizeChatMessageKind(input.messageKind);
            await trackServerEvent("chat_send_blocked", buildChatGatingTelemetryPayload({
                eventName: "chat_send_blocked",
                userId: input.callerUid,
                threadId: input.threadId,
                creatorId: parseCreatorThreadId(input.threadId)?.creatorId ?? null,
                messageKind,
                status: errorCode === "insufficient_paid_gumdrops"
                    ? "blocked_insufficient_paid_gd"
                    : errorCode === "forbidden"
                        ? "blocked_thread_visibility"
                        : errorCode === "unauthorized"
                            ? "blocked_auth"
                            : "blocked_unknown",
                errorCode,
                requiredPriceGd: typeof error.body.requiredPriceGd === "number" ? error.body.requiredPriceGd : null,
                purchasedBalanceGd: typeof error.body.purchasedBalanceGd === "number" ? error.body.purchasedBalanceGd : null,
                paidGdShortfall: typeof error.body.paidGdShortfall === "number" ? error.body.paidGdShortfall : null,
                sourceComponent: "chat_server_send",
            }), input.callerUid).catch(() => null);
            await trackServerEvent("chat_message_blocked", {
                source_component: "chat_server_send",
                route: "/dashboard/chat",
                user_id: input.callerUid,
                thread_id: input.threadId,
                creator_id: parseCreatorThreadId(input.threadId)?.creatorId ?? null,
                target_creator_id: parseCreatorThreadId(input.threadId)?.creatorId ?? null,
                message_kind: messageKind,
                error_code: errorCode,
                required_price_gd: typeof error.body.requiredPriceGd === "number" ? error.body.requiredPriceGd : null,
                purchased_balance_gd: typeof error.body.purchasedBalanceGd === "number" ? error.body.purchasedBalanceGd : null,
                paid_gd_shortfall: typeof error.body.paidGdShortfall === "number" ? error.body.paidGdShortfall : null,
                debug_lane: "Chat telemetry/admin truth",
            }, input.callerUid).catch(() => null);
            if (errorCode === "moderation_blocked") {
                await trackServerEvent("chat_moderation_blocked", buildChatGatingTelemetryPayload({
                    eventName: "chat_moderation_blocked",
                    userId: input.callerUid,
                    threadId: input.threadId,
                    creatorId: parseCreatorThreadId(input.threadId)?.creatorId ?? null,
                    messageKind,
                    status: "blocked_moderation",
                    errorCode,
                    sourceComponent: "chat_server_send",
                }), input.callerUid).catch(() => null);
            }
        }
        recordRouteWarning("chat/messages", "Chat message send failed", error, {
            channel: "runtime",
            detail: {
                threadId: input.threadId,
                callerRole: input.callerRole,
                messageKind: normalizeChatMessageKind(input.messageKind),
                errorMessage: getErrorMessage(error),
            },
        });
        throw error;
    }
}

export async function safeMarkChatThreadReadForViewer(input: {
    viewerUid: string;
    threadId: string;
}) {
    try {
        return await markChatThreadReadForViewer(input);
    } catch (error) {
        recordRouteWarning("chat/read", "Chat read update failed", error, {
            channel: "runtime",
            detail: {
                threadId: input.threadId,
            },
        });
        throw error;
    }
}

export async function safeHideChatThreadForViewer(input: {
    viewerUid: string;
    threadId: string;
}) {
    try {
        return await hideChatThreadForViewer(input);
    } catch (error) {
        recordRouteWarning("chat/thread", "Chat thread hide failed", error, {
            channel: "runtime",
            detail: {
                threadId: input.threadId,
            },
        });
        throw error;
    }
}
