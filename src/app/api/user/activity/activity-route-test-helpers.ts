import { getTransactionDisplayLabel, normalizeTransactionRecord } from "@/lib/transaction-normalizers";

type TaskEventType = "assigned" | "started" | "completed" | "failed" | "reminder_sent";

export type UserActivityTaskEvent = {
    id: string;
    type: TaskEventType;
    title: string;
    reward: number;
    progress: number;
    maxProgress: number;
    timestamp: number;
};

export type UserActivityItem =
    | {
        id: string;
        timestamp: number;
        kind: "transaction";
        label: string;
        transaction: ReturnType<typeof normalizeTransactionRecord>;
    }
    | {
        id: string;
        timestamp: number;
        kind: "task";
        label: string;
        taskEvent: UserActivityTaskEvent;
    };

export type UserActivityPayload = {
    success: true;
    view: "summary" | "history";
    activities: UserActivityItem[];
    transactions: Array<ReturnType<typeof normalizeTransactionRecord>>;
    taskEvents: UserActivityTaskEvent[];
};

export function toTimestampNumber(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (
        value
        && typeof value === "object"
        && "toMillis" in value
        && typeof (value as { toMillis?: unknown }).toMillis === "function"
    ) {
        try {
            return Number((value as { toMillis: () => number }).toMillis()) || 0;
        } catch {
            return 0;
        }
    }

    return 0;
}

export function toTaskEvent(raw: Record<string, unknown>, id: string): UserActivityTaskEvent | null {
    const type = raw.type;
    if (
        typeof type !== "string"
        || !["assigned", "started", "completed", "failed", "reminder_sent"].includes(type)
        || typeof raw.title !== "string"
    ) {
        return null;
    }

    return {
        id,
        type: type as TaskEventType,
        title: raw.title,
        reward: Number(raw.reward) || 0,
        progress: Number(raw.progress) || 0,
        maxProgress: Number(raw.maxProgress) || 0,
        timestamp: toTimestampNumber(raw.timestamp),
    };
}

export function renderTransactionLabel(transaction: ReturnType<typeof normalizeTransactionRecord>) {
    return getTransactionDisplayLabel(transaction);
}

export function renderTaskEventLabel(taskEvent: NonNullable<ReturnType<typeof toTaskEvent>>) {
    if (taskEvent.type === "assigned") {
        return `Task ready: ${taskEvent.title}`;
    }

    if (taskEvent.type === "started") {
        return `Task in progress: ${taskEvent.title}`;
    }

    if (taskEvent.type === "completed") {
        return `Task complete: ${taskEvent.title}`;
    }

    if (taskEvent.type === "failed") {
        return `Task reset: ${taskEvent.title}`;
    }

    return `Task reminder: ${taskEvent.title}`;
}

export function buildActivityItems(
    transactionsSnapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> },
    taskEventsSnapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> },
): UserActivityItem[] {
    const transactionItems = transactionsSnapshot.docs.flatMap((doc) => {
        try {
            const transaction = normalizeTransactionRecord(doc.data(), doc.id);
            return [{
                id: transaction.id,
                timestamp: typeof transaction.timestamp === "number" ? transaction.timestamp : toTimestampNumber(transaction.timestamp),
                kind: "transaction" as const,
                label: renderTransactionLabel(transaction),
                transaction,
            }];
        } catch {
            return [];
        }
    });

    const taskItems = taskEventsSnapshot.docs.flatMap((doc) => {
        const normalized = toTaskEvent(doc.data() as Record<string, unknown>, doc.id);
        if (!normalized) {
            return [];
        }

        return [{
            id: normalized.id,
            timestamp: normalized.timestamp,
            kind: "task" as const,
            label: renderTaskEventLabel(normalized),
            taskEvent: normalized,
        }];
    });

    return [...transactionItems, ...taskItems].sort((left, right) => right.timestamp - left.timestamp);
}

export const activityRouteTestHelpers = {
    toTimestampNumber,
    toTaskEvent,
    buildActivityItems,
    renderTaskEventLabel,
};

export type { TaskEventType };
