export const SUPPORT_COLLECTIONS = {
    threads: "support_threads",
    messages: "support_messages",
} as const;

export const SUPPORT_THREAD_CATEGORIES = [
    "general",
    "technical",
    "billing",
    "creator_application",
    "account",
] as const;

export type SupportThreadCategory = (typeof SUPPORT_THREAD_CATEGORIES)[number];

export type SupportThreadStatus =
    | "ready"
    | "open"
    | "pending"
    | "closed"
    | "waiting_on_support"
    | "waiting_on_user"
    | "resolved";

export type SupportThreadChannel = "in_app" | "email" | "feedback" | "system";
export type SupportMessageSenderRole = "user" | "admin" | "system";

export type SupportThreadPreview = {
    id: string;
    status: SupportThreadStatus;
    category: SupportThreadCategory;
    channel: SupportThreadChannel;
    subject: string | null;
    lastMessageAt: number;
    createdAt: number;
    updatedAt?: number;
    lastMessagePreview?: string | null;
    unreadForUser?: boolean;
    unreadForAdmin?: boolean;
};

export type SupportSignalPreview = {
    id: string;
    kind: "thread" | "feedback";
    summary: string;
    status: string;
    timestamp: number;
    path?: string | null;
};

export type SupportMessageRecord = {
    id: string;
    threadId: string;
    senderRole: SupportMessageSenderRole;
    senderId: string | null;
    senderLabel: string | null;
    body: string;
    createdAt: number;
};

export type SupportThreadRecord = SupportThreadPreview & {
    userId: string;
    threadKey: string;
    userEmail: string | null;
    userDisplayName: string | null;
    userHandle: string | null;
    sourcePath: string | null;
    messageCount: number;
};

export type SupportReadinessSummary = {
    threadKey: string;
    state: SupportThreadStatus;
    stateLabel: string;
    stateDescription: string;
    totalThreads: number;
    openThreads: number;
    bugReportCount: number;
    lastSupportAt: number;
    lastSupportSource: "support_thread" | "feedback" | "none";
    primaryHandle: string;
    channels: {
        accountEmail: boolean;
        inApp: boolean;
        browserPush: boolean;
    };
};

export type SupportReadinessSnapshot = {
    summary: SupportReadinessSummary;
    threads: SupportThreadPreview[];
    signals: SupportSignalPreview[];
};

export function buildSupportThreadKey(userId: string) {
    return `support:${userId}`;
}

export function getSupportPrimaryHandle({
    email,
    handle,
    displayName,
}: { email?: string | null; handle?: string | null; displayName?: string | null }) {
    if (handle) return `@${handle}`;
    if (email) return email;
    return displayName || "Anonymous User";
}

export function normalizeSupportThreadStatus(value: unknown): SupportThreadStatus {
    if (typeof value !== "string") return "open";
    switch (value.toLowerCase()) {
        case "open": return "open";
        case "pending": return "pending";
        case "closed": return "closed";
        case "waiting_on_support": return "waiting_on_support";
        case "waiting_on_user": return "waiting_on_user";
        case "resolved": return "resolved";
        default: return "open";
    }
}

export function normalizeSupportThreadCategory(value: unknown): SupportThreadCategory {
    if (typeof value !== "string") return "general";
    switch (value.toLowerCase()) {
        case "technical": return "technical";
        case "billing": return "billing";
        case "creator_application": return "creator_application";
        case "account": return "account";
        default: return "general";
    }
}

export function describeSupportState(state: SupportThreadStatus) {
    switch (state) {
        case "open":
        case "pending":
        case "waiting_on_support":
            return "Waiting on Support";
        case "waiting_on_user":
            return "Waiting on User";
        case "closed":
        case "resolved": return "Resolved";
        default: return "Ready";
    }
}

export function describeSupportStateDetail(state: SupportThreadStatus) {
    switch (state) {
        case "open":
        case "pending":
        case "waiting_on_support":
            return "The latest message is waiting on a support reply.";
        case "waiting_on_user":
            return "Support already replied and the next action belongs to the user.";
        case "closed":
        case "resolved":
            return "This support thread is resolved and no active follow-up is open.";
        default:
            return "No active in-site support thread is open for this account.";
    }
}

export function formatSupportCategoryLabel(category: SupportThreadCategory) {
    switch (category) {
        case "technical":
            return "Technical";
        case "billing":
            return "Billing";
        case "creator_application":
            return "Creator application";
        case "account":
            return "Account";
        default:
            return "General";
    }
}
