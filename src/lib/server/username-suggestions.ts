import { adminDb } from "@/lib/server/firebase-admin";
import { buildUsernameBaseCandidates, normalizeUsername } from "@/lib/user-utils";

const USERNAME_AVAILABILITY_BATCH_SIZE = 10;
const USERNAME_SUFFIX_MIN = 2;
const USERNAME_SUFFIX_MAX = 100;

function buildFallbackUsername(uid: string) {
    return `user-${uid.slice(0, 8).toLowerCase()}`;
}

function chunkValues<T>(values: readonly T[], chunkSize: number) {
    const chunks: T[][] = [];

    for (let index = 0; index < values.length; index += chunkSize) {
        chunks.push(values.slice(index, index + chunkSize));
    }

    return chunks;
}

async function loadUsernameAvailability(usernames: readonly string[], excludeUid?: string) {
    const availabilityMap = new Map<string, boolean>();
    const uniqueUsernames = usernames.filter((username, index, source) => source.indexOf(username) === index);

    if (uniqueUsernames.length === 0) {
        return availabilityMap;
    }

    if (!adminDb) {
        uniqueUsernames.forEach((username) => {
            availabilityMap.set(username, false);
        });
        return availabilityMap;
    }

    for (const batch of chunkValues(uniqueUsernames, USERNAME_AVAILABILITY_BATCH_SIZE)) {
        const snap = await adminDb
            .collection("users")
            .where("username", "in", batch)
            .get();

        const unavailableUsernames = new Set<string>();
        snap.docs.forEach((doc) => {
            if (excludeUid && doc.id === excludeUid) {
                return;
            }

            const username = normalizeUsername((doc.data() as { username?: unknown }).username);
            if (username) {
                unavailableUsernames.add(username);
            }
        });

        batch.forEach((username) => {
            availabilityMap.set(username, !unavailableUsernames.has(username));
        });
    }

    return availabilityMap;
}

function createUsernameAvailabilityResolver(excludeUid?: string) {
    const availabilityCache = new Map<string, boolean>();

    async function hydrateAvailability(usernames: readonly string[]) {
        const missingUsernames = usernames.filter((username) => !availabilityCache.has(username));
        if (missingUsernames.length === 0) {
            return;
        }

        const resolvedAvailability = await loadUsernameAvailability(missingUsernames, excludeUid);
        resolvedAvailability.forEach((available, username) => {
            availabilityCache.set(username, available);
        });
    }

    return {
        async findFirstAvailable(usernames: readonly string[]) {
            const orderedUsernames = usernames.filter(Boolean);
            await hydrateAvailability(orderedUsernames);

            return orderedUsernames.find((username) => availabilityCache.get(username) === true) ?? null;
        },
        async isAvailable(username: string) {
            await hydrateAvailability([username]);
            return availabilityCache.get(username) === true;
        },
    };
}

function buildUsernameSuffixBatch(candidate: string, batchStart: number, batchSize: number) {
    const batchEnd = Math.min(USERNAME_SUFFIX_MAX, batchStart + batchSize);
    const batchAlternatives: string[] = [];

    for (let suffix = batchStart; suffix < batchEnd; suffix += 1) {
        const suffixValue = `-${suffix}`;
        const truncatedBase = candidate.slice(0, Math.max(3, 20 - suffixValue.length));
        const alternative = normalizeUsername(`${truncatedBase}${suffixValue}`);

        if (!alternative || batchAlternatives.includes(alternative)) {
            continue;
        }

        batchAlternatives.push(alternative);
    }

    return batchAlternatives;
}

export async function generateUniqueUsernameSuggestion(input: {
    displayName?: string | null;
    email?: string | null;
    preferredUsername?: string | null;
    uid: string;
    excludeUid?: string;
}) {
    const candidates = [
        normalizeUsername(input.preferredUsername),
        ...buildUsernameBaseCandidates({ displayName: input.displayName, email: input.email }),
        normalizeUsername(buildFallbackUsername(input.uid)),
    ].filter((value, index, source): value is string => Boolean(value) && source.indexOf(value) === index);
    const availabilityResolver = createUsernameAvailabilityResolver(input.excludeUid);

    for (const candidate of candidates) {
        const initialAvailabilityBatch = [
            candidate,
            ...buildUsernameSuffixBatch(candidate, USERNAME_SUFFIX_MIN, USERNAME_AVAILABILITY_BATCH_SIZE - 1),
        ];
        const initialAvailableUsername = await availabilityResolver.findFirstAvailable(initialAvailabilityBatch);
        if (initialAvailableUsername) {
            return initialAvailableUsername;
        }

        for (
            let batchStart = USERNAME_SUFFIX_MIN + (USERNAME_AVAILABILITY_BATCH_SIZE - 1);
            batchStart < USERNAME_SUFFIX_MAX;
            batchStart += USERNAME_AVAILABILITY_BATCH_SIZE
        ) {
            const availableAlternative = await availabilityResolver.findFirstAvailable(
                buildUsernameSuffixBatch(candidate, batchStart, USERNAME_AVAILABILITY_BATCH_SIZE),
            );
            if (availableAlternative) {
                return availableAlternative;
            }
        }
    }

    return normalizeUsername(buildFallbackUsername(input.uid)) || buildFallbackUsername(input.uid);
}

export async function checkUsernameAvailability(username: string, excludeUid?: string) {
    const normalized = normalizeUsername(username);
    if (!normalized) {
        return { normalized: null, available: false };
    }

    const availabilityResolver = createUsernameAvailabilityResolver(excludeUid);

    return {
        normalized,
        available: await availabilityResolver.isAvailable(normalized),
    };
}
