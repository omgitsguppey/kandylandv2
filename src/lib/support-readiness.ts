export const SUPPORT_COLLECTIONS = {
    threads: "support_threads",
    messages: "support_messages",
} as const;

export type SupportThreadStatus =
    | "ready"
    | "open"
    | "pending"
    | "closed"
    | "waiting_on_support"
    | "waiting_on_user"
    | "resolved";

export type SupportThreadPreview = {
    id: string;
    status: SupportThreadStatus;
    channel: "in_app" | "email" | "feedback" | "system";
    subject: string | null;
    lastMessageAt: number;
    createdAt: number;
};

export type SupportSignalPreview = {
    id: string;
    kind: "thread" | "feedback";
    summary: string;
    status: string;
    timestamp: number;
    path?: string | null;
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
        email: boolean;
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
        default: return "open";
    }
}

export function describeSupportState(state: SupportThreadStatus) {
    switch (state) {
        case "open": return "Needs Attention";
        case "waiting_on_user":
        case "waiting_on_support": return "Waiting on User";
        case "resolved": return "Resolved";
        default: return "Ready";
    }
}
