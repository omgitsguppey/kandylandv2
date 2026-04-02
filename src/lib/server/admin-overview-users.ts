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

function chunkUserIds(userIds: string[], chunkSize: number) {
    const chunks: string[][] = [];

    for (let index = 0; index < userIds.length; index += chunkSize) {
        chunks.push(userIds.slice(index, index + chunkSize));
    }

    return chunks;
}

function normalizeOverviewUserName(raw: Record<string, unknown>) {
    return typeof raw.username === "string" && raw.username.trim().length > 0
        ? raw.username
        : typeof raw.displayName === "string" && raw.displayName.trim().length > 0
            ? raw.displayName
            : "Unknown";
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
            userNameMap.set(doc.id, normalizeOverviewUserName(doc.data()));
        }
    }

    return userNameMap;
}
