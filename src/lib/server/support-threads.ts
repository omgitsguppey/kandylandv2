import "server-only";

import { AuthError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import {
    SUPPORT_COLLECTIONS,
    type SupportMessageRecord,
    type SupportMessageSenderRole,
    type SupportThreadCategory,
    type SupportThreadRecord,
    type SupportThreadStatus,
    buildSupportThreadKey,
    normalizeSupportThreadCategory,
    normalizeSupportThreadStatus,
} from "@/lib/support-readiness";
import { sanitizeFirestorePayload } from "@/lib/server/firestore-sanitize";

type ThreadMutableFields = {
    status?: SupportThreadStatus;
    updatedAt?: number;
    lastMessageAt?: number;
    lastMessagePreview?: string | null;
    unreadForUser?: boolean;
    unreadForAdmin?: boolean;
    messageCount?: number;
};

const SUPPORT_THREADS_USER_DEFAULT_LIMIT = 50;
const SUPPORT_THREADS_ADMIN_DEFAULT_LIMIT = 100;
const SUPPORT_THREAD_MESSAGES_DEFAULT_LIMIT = 100;

export const SUPPORT_THREADS_INDEX_REQUIREMENTS = {
    userInbox: {
        collectionGroup: SUPPORT_COLLECTIONS.threads,
        fields: [
            { fieldPath: "userId", order: "ASCENDING" },
            { fieldPath: "lastMessageAt", order: "DESCENDING" },
        ],
        query: "where(userId == caller.uid).orderBy(lastMessageAt desc)",
    },
    adminStatusInbox: {
        collectionGroup: SUPPORT_COLLECTIONS.threads,
        fields: [
            { fieldPath: "status", order: "ASCENDING" },
            { fieldPath: "lastMessageAt", order: "DESCENDING" },
        ],
        query: "where(status == requestedStatus).orderBy(lastMessageAt desc)",
    },
} as const;

export const SUPPORT_THREADS_SAFE_FALLBACK_POLICY = {
    broadReadFallbackAllowed: false,
    missingIndexResponseCode: "missing_firestore_index",
    nextAction: "Create the composite index instead of broad-reading support inbox threads.",
} as const;

export function isSupportThreadsMissingIndexError(error: unknown) {
    const source = error as { code?: unknown; message?: unknown; details?: unknown };
    const code = typeof source?.code === "number" ? source.code : typeof source?.code === "string" ? source.code : "";
    const message = `${typeof source?.message === "string" ? source.message : ""} ${typeof source?.details === "string" ? source.details : ""}`.toLowerCase();
    return code === 9
        || code === "failed-precondition"
        || (message.includes("failed_precondition") && message.includes("index"))
        || message.includes("query requires an index");
}

function requireAdminDb() {
    if (!adminDb) {
        throw new AuthError("Database unavailable", 500);
    }

    return adminDb;
}

function readString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function toTimestampNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (value instanceof Date) {
        return value.getTime();
    }

    if (value && typeof value === "object") {
        const raw = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number; _seconds?: number; _nanoseconds?: number };
        if (typeof raw.toMillis === "function") {
            return raw.toMillis();
        }
        const seconds = typeof raw.seconds === "number" ? raw.seconds : typeof raw._seconds === "number" ? raw._seconds : null;
        const nanoseconds = typeof raw.nanoseconds === "number" ? raw.nanoseconds : typeof raw._nanoseconds === "number" ? raw._nanoseconds : 0;
        if (seconds !== null) {
            return Math.round((seconds * 1000) + (nanoseconds / 1_000_000));
        }
    }

    return 0;
}

function summarizeMessagePreview(body: string) {
    const trimmed = body.trim();
    if (!trimmed) {
        return "New support message";
    }

    return trimmed.length > 120
        ? `${trimmed.slice(0, 117).trimEnd()}...`
        : trimmed;
}

function mapSupportThread(id: string, raw: Record<string, unknown>): SupportThreadRecord {
    const createdAt = toTimestampNumber(raw.createdAt);
    const updatedAt = Math.max(toTimestampNumber(raw.updatedAt), createdAt);
    const lastMessageAt = Math.max(toTimestampNumber(raw.lastMessageAt), updatedAt, createdAt);

    return {
        id,
        userId: readString(raw.userId),
        threadKey: readString(raw.threadKey) || buildSupportThreadKey(readString(raw.userId)),
        userEmail: readString(raw.userEmail) || null,
        userDisplayName: readString(raw.userDisplayName) || null,
        userHandle: readString(raw.userHandle) || null,
        subject: readString(raw.subject) || null,
        category: normalizeSupportThreadCategory(raw.category),
        status: normalizeSupportThreadStatus(raw.status),
        channel: (() => {
            const channel = readString(raw.channel);
            if (channel === "email" || channel === "feedback" || channel === "system") {
                return channel;
            }
            return "in_app";
        })(),
        createdAt,
        updatedAt,
        lastMessageAt,
        lastMessagePreview: readString(raw.lastMessagePreview) || null,
        unreadForUser: raw.unreadForUser === true,
        unreadForAdmin: raw.unreadForAdmin === true,
        sourcePath: readString(raw.sourcePath) || null,
        messageCount: typeof raw.messageCount === "number" && Number.isFinite(raw.messageCount)
            ? Math.max(0, Math.floor(raw.messageCount))
            : 0,
    };
}

function mapSupportMessage(threadId: string, id: string, raw: Record<string, unknown>): SupportMessageRecord {
    return {
        id,
        threadId,
        senderRole: raw.senderRole === "admin" || raw.senderRole === "system" ? raw.senderRole : "user",
        senderId: readString(raw.senderId) || null,
        senderLabel: readString(raw.senderLabel) || null,
        body: readString(raw.body),
        createdAt: toTimestampNumber(raw.createdAt),
    };
}

async function listThreadMessages(threadId: string) {
    const db = requireAdminDb();
    const snapshot = await db
        .collection(SUPPORT_COLLECTIONS.threads)
        .doc(threadId)
        .collection(SUPPORT_COLLECTIONS.messages)
        .orderBy("createdAt", "asc")
        .limit(SUPPORT_THREAD_MESSAGES_DEFAULT_LIMIT)
        .get();

    return snapshot.docs
        .map((doc) => mapSupportMessage(threadId, doc.id, doc.data() as Record<string, unknown>))
        .sort((left, right) => left.createdAt - right.createdAt);
}

async function readThread(threadId: string) {
    const db = requireAdminDb();
    const snapshot = await db.collection(SUPPORT_COLLECTIONS.threads).doc(threadId).get();
    if (!snapshot.exists) {
        return null;
    }

    return mapSupportThread(snapshot.id, snapshot.data() as Record<string, unknown>);
}

export async function listSupportThreadsForUser(userId: string, options?: { limit?: number }) {
    const db = requireAdminDb();
    const limitCount = Math.max(1, Math.min(options?.limit ?? SUPPORT_THREADS_USER_DEFAULT_LIMIT, 200));
    const snapshot = await db.collection(SUPPORT_COLLECTIONS.threads)
        .where("userId", "==", userId)
        .orderBy("lastMessageAt", "desc")
        .limit(limitCount)
        .get();

    return snapshot.docs
        .map((doc) => mapSupportThread(doc.id, doc.data() as Record<string, unknown>));
}

export async function listSupportThreadsForAdmin(options?: {
    status?: SupportThreadStatus | "all";
    userId?: string | null;
    limit?: number;
}) {
    const db = requireAdminDb();
    const limitCount = Math.max(1, Math.min(options?.limit ?? SUPPORT_THREADS_ADMIN_DEFAULT_LIMIT, 250));
    let query: FirebaseFirestore.Query = db.collection(SUPPORT_COLLECTIONS.threads);
    if (options?.userId) {
        query = query.where("userId", "==", options.userId);
    }
    if (options?.status && options.status !== "all" && options.status !== "waiting_on_support" && options.status !== "resolved") {
        query = query.where("status", "==", options.status);
    }
    const snapshot = await query
        .orderBy("lastMessageAt", "desc")
        .limit(limitCount)
        .get();

    const filtered = snapshot.docs
        .map((doc) => mapSupportThread(doc.id, doc.data() as Record<string, unknown>))
        .filter((thread) => {
            if (options?.userId && thread.userId !== options.userId) {
                return false;
            }

            if (options?.status && options.status !== "all" && thread.status !== options.status) {
                if (
                    options.status === "waiting_on_support"
                    && (thread.status === "open" || thread.status === "pending")
                ) {
                    return true;
                }
                if (
                    options.status === "resolved"
                    && thread.status === "closed"
                ) {
                    return true;
                }
                return false;
            }

            return true;
        })
        .sort((left, right) => right.lastMessageAt - left.lastMessageAt);

    return filtered.slice(0, limitCount);
}

async function markThreadRead(threadId: string, viewer: "user" | "admin") {
    const db = requireAdminDb();
    const ref = db.collection(SUPPORT_COLLECTIONS.threads).doc(threadId);
    const patch: Partial<ThreadMutableFields> = viewer === "admin"
        ? { unreadForAdmin: false }
        : { unreadForUser: false };
    await ref.update(patch);
}

export async function getSupportThreadForUser(userId: string, threadId: string, options?: { markRead?: boolean }) {
    const thread = await readThread(threadId);
    if (!thread) {
        return null;
    }

    if (thread.userId !== userId) {
        throw new AuthError("Forbidden", 403);
    }

    if (options?.markRead !== false && thread.unreadForUser) {
        await markThreadRead(threadId, "user");
        thread.unreadForUser = false;
    }

    return {
        thread,
        messages: await listThreadMessages(threadId),
    };
}

export async function getSupportThreadForAdmin(threadId: string, options?: { markRead?: boolean }) {
    const thread = await readThread(threadId);
    if (!thread) {
        return null;
    }

    if (options?.markRead !== false && thread.unreadForAdmin) {
        await markThreadRead(threadId, "admin");
        thread.unreadForAdmin = false;
    }

    return {
        thread,
        messages: await listThreadMessages(threadId),
    };
}

export async function createSupportThread(input: {
    userId: string;
    userEmail?: string | null;
    userDisplayName?: string | null;
    userHandle?: string | null;
    subject: string;
    category: SupportThreadCategory;
    body: string;
    sourcePath?: string | null;
}) {
    const db = requireAdminDb();
    const threadRef = db.collection(SUPPORT_COLLECTIONS.threads).doc();
    const messageRef = threadRef.collection(SUPPORT_COLLECTIONS.messages).doc();
    const now = Date.now();
    const preview = summarizeMessagePreview(input.body);

    await db.runTransaction(async (transaction) => {
        transaction.set(threadRef, sanitizeFirestorePayload({
            userId: input.userId,
            threadKey: buildSupportThreadKey(input.userId),
            userEmail: input.userEmail || null,
            userDisplayName: input.userDisplayName || null,
            userHandle: input.userHandle || null,
            subject: input.subject.trim(),
            category: input.category,
            status: "waiting_on_support",
            channel: "in_app",
            sourcePath: input.sourcePath || null,
            createdAt: now,
            updatedAt: now,
            lastMessageAt: now,
            lastMessagePreview: preview,
            unreadForUser: false,
            unreadForAdmin: true,
            messageCount: 1,
        }));
        transaction.set(messageRef, sanitizeFirestorePayload({
            threadId: threadRef.id,
            senderRole: "user",
            senderId: input.userId,
            senderLabel: input.userDisplayName || input.userHandle || input.userEmail || "User",
            body: input.body.trim(),
            createdAt: now,
        }));
    });

    return getSupportThreadForUser(input.userId, threadRef.id, { markRead: false });
}

function getReplyStatus(senderRole: SupportMessageSenderRole): SupportThreadStatus {
    if (senderRole === "admin") {
        return "waiting_on_user";
    }

    if (senderRole === "system") {
        return "open";
    }

    return "waiting_on_support";
}

export async function addSupportMessage(input: {
    threadId: string;
    senderRole: SupportMessageSenderRole;
    senderId?: string | null;
    senderLabel?: string | null;
    body: string;
}) {
    const db = requireAdminDb();
    const threadRef = db.collection(SUPPORT_COLLECTIONS.threads).doc(input.threadId);
    const messageRef = threadRef.collection(SUPPORT_COLLECTIONS.messages).doc();
    const now = Date.now();
    const preview = summarizeMessagePreview(input.body);

    await db.runTransaction(async (transaction) => {
        const threadSnap = await transaction.get(threadRef);
        if (!threadSnap.exists) {
            throw new AuthError("Support thread not found", 404);
        }

        const threadData = threadSnap.data() as Record<string, unknown>;
        const nextMessageCount = typeof threadData.messageCount === "number" && Number.isFinite(threadData.messageCount)
            ? Math.max(0, Math.floor(threadData.messageCount)) + 1
            : 1;

        transaction.set(messageRef, sanitizeFirestorePayload({
            threadId: input.threadId,
            senderRole: input.senderRole,
            senderId: input.senderId || null,
            senderLabel: input.senderLabel || null,
            body: input.body.trim(),
            createdAt: now,
        }));
        transaction.update(threadRef, sanitizeFirestorePayload({
            status: getReplyStatus(input.senderRole),
            updatedAt: now,
            lastMessageAt: now,
            lastMessagePreview: preview,
            unreadForUser: input.senderRole === "admin",
            unreadForAdmin: input.senderRole !== "admin",
            messageCount: nextMessageCount,
        }));
    });

    return readThread(input.threadId);
}

export async function updateSupportThreadStatus(threadId: string, status: SupportThreadStatus) {
    const db = requireAdminDb();
    const ref = db.collection(SUPPORT_COLLECTIONS.threads).doc(threadId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
        throw new AuthError("Support thread not found", 404);
    }

    await ref.update(sanitizeFirestorePayload({
        status,
        updatedAt: Date.now(),
    }));

    return readThread(threadId);
}
