type OverviewUserDocSnapshot = {
    id: string;
    data: () => Record<string, unknown>;
};

type OverviewUsersCollection = {
    where: (fieldPath: string, opStr: string, value: string[]) => {
        get: () => Promise<{ docs: OverviewUserDocSnapshot[] }>;
    };
};

export const ADMIN_OVERVIEW_USER_FETCH_CHUNK_SIZE = 30;

export type AdminOverviewUserIdentity = {
    userId: string;
    userDisplayName: string;
    username?: string;
    shortUserId: string;
    userIdentityState: "resolved" | "fallback_uid" | "missing";
};

function chunkUserIds(userIds: string[], chunkSize: number) {
    const chunks: string[][] = [];

    for (let index = 0; index < userIds.length; index += chunkSize) {
        chunks.push(userIds.slice(index, index + chunkSize));
    }

    return chunks;
}

export function shortenAdminOverviewUserId(userId: string) {
    const trimmed = userId.trim();
    if (trimmed.length <= 12) {
        return trimmed || "unknown";
    }

    return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function normalizeEmailPrefix(raw: Record<string, unknown>) {
    if (typeof raw.email !== "string") {
        return "";
    }

    const [prefix] = raw.email.trim().split("@");
    return prefix || "";
}

function normalizeOverviewUserIdentity(userId: string, raw: Record<string, unknown>): AdminOverviewUserIdentity {
    const username = typeof raw.username === "string" && raw.username.trim().length > 0
        ? raw.username.trim()
        : undefined;
    const displayName = typeof raw.displayName === "string" && raw.displayName.trim().length > 0
        ? raw.displayName.trim()
        : "";
    const emailPrefix = normalizeEmailPrefix(raw);
    const userDisplayName = username ?? (displayName || emailPrefix || shortenAdminOverviewUserId(userId));

    return {
        userId,
        userDisplayName,
        username,
        shortUserId: shortenAdminOverviewUserId(userId),
        userIdentityState: username || displayName || emailPrefix ? "resolved" : "fallback_uid",
    };
}

function normalizeOverviewUserName(userId: string, raw: Record<string, unknown>) {
    const identity = normalizeOverviewUserIdentity(userId, raw);
    return identity.userIdentityState === "resolved" ? identity.userDisplayName : "Unknown";
}

export function buildAdminOverviewFallbackIdentity(userId: string): AdminOverviewUserIdentity {
    return {
        userId,
        userDisplayName: shortenAdminOverviewUserId(userId),
        shortUserId: shortenAdminOverviewUserId(userId),
        userIdentityState: userId.trim().length > 0 ? "fallback_uid" : "missing",
    };
}

export async function buildAdminOverviewUserNameMap(input: {
    usersCollection: OverviewUsersCollection;
    userIds: Iterable<string>;
    chunkSize?: number;
}) {
    const chunkSize = input.chunkSize ?? ADMIN_OVERVIEW_USER_FETCH_CHUNK_SIZE;
    const userIds = Array.from(new Set(Array.from(input.userIds, (userId) => userId.trim()).filter(Boolean)));
    const userNameMap = new Map<string, string>();

    if (userIds.length === 0) {
        return userNameMap;
    }

    // Fetch only the users referenced by visible overview activity instead of scanning
    // the entire users collection just to build the recent activity display names.
    const userSnapshots = await Promise.all(
        chunkUserIds(userIds, chunkSize).map((chunk) =>
            input.usersCollection.where("__name__", "in", chunk).get(),
        ),
    );

    for (const snapshot of userSnapshots) {
        for (const doc of snapshot.docs) {
            userNameMap.set(doc.id, normalizeOverviewUserName(doc.id, doc.data()));
        }
    }

    return userNameMap;
}

export async function buildAdminOverviewUserIdentityMap(input: {
    usersCollection: OverviewUsersCollection;
    userIds: Iterable<string>;
    chunkSize?: number;
}) {
    const chunkSize = input.chunkSize ?? ADMIN_OVERVIEW_USER_FETCH_CHUNK_SIZE;
    const userIds = Array.from(new Set(Array.from(input.userIds, (userId) => userId.trim()).filter(Boolean)));
    const userIdentityMap = new Map<string, AdminOverviewUserIdentity>();

    if (userIds.length === 0) {
        return userIdentityMap;
    }

    const userSnapshots = await Promise.all(
        chunkUserIds(userIds, chunkSize).map((chunk) =>
            input.usersCollection.where("__name__", "in", chunk).get(),
        ),
    );

    for (const snapshot of userSnapshots) {
        for (const doc of snapshot.docs) {
            userIdentityMap.set(doc.id, normalizeOverviewUserIdentity(doc.id, doc.data()));
        }
    }

    for (const userId of userIds) {
        if (!userIdentityMap.has(userId)) {
            userIdentityMap.set(userId, buildAdminOverviewFallbackIdentity(userId));
        }
    }

    return userIdentityMap;
}
