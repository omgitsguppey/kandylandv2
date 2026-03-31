export const SUPPORT_COLLECTIONS = {
    threads: "support_threads",
    messages: "support_messages",
} as const;

export type SupportThreadStatus =
    | "ready"
    | "open"
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
    username,
    displayName,
    email,
    uid,
}: {
    username?: string | null;
    displayName?: string | null;
    email?: string | null;
    uid: string;
}) {
    const normalizedUsername = typeof username === "string" ? username.trim() : "";
    if (normalizedUsername) {
        return `@${normalizedUsername}`;
    }

    const normalizedDisplayName = typeof displayName === "string" ? displayName.trim() : "";
    if (normalizedDisplayName) {
        return normalizedDisplayName;
    }

    const normalizedEmail = typeof email === "string" ? email.trim() : "";
    if (normalizedEmail) {
        return normalizedEmail;
    }

    return uid;
}

export function normalizeSupportThreadStatus(value: unknown): SupportThreadStatus {
    switch (value) {
        case "open":
        case "waiting_on_support":
        case "waiting_on_user":
        case "resolved":
            return value;
        default:
            return "ready";
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
