import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/server/firebase-admin";
import { buildUsernameBaseCandidates, normalizeUsername } from "@/lib/user-utils";

const USERNAME_AVAILABILITY_BATCH_SIZE = 10;
const USERNAME_SUFFIX_MIN = 2;
const USERNAME_SUFFIX_MAX = 100;
export const USERNAME_RESERVATIONS_COLLECTION = "username_reservations";

type UsernameReservationRecord = {
    username: string;
    uid: string;
    source: string;
    legacyBackfilled: boolean;
    updatedAt: FieldValue;
    createdAt: FieldValue;
};

type ReservationDocLike = {
    exists: boolean;
    data: () => Record<string, unknown> | undefined;
};

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

function readReservationOwner(snapshot: ReservationDocLike) {
    if (!snapshot.exists) {
        return null;
    }

    const data = snapshot.data() ?? {};
    return typeof data.uid === "string" && data.uid.trim().length > 0
        ? data.uid.trim()
        : null;
}

function buildUsernameReservationRecord(input: {
    username: string;
    uid: string;
    source: string;
    legacyBackfilled?: boolean;
}): UsernameReservationRecord {
    return {
        username: input.username,
        uid: input.uid,
        source: input.source,
        legacyBackfilled: input.legacyBackfilled === true,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
    };
}

function selectLegacyOwner(input: {
    ownerIds: string[];
    excludeUid?: string;
}) {
    const conflictingOwner = input.ownerIds.find((ownerId) => ownerId !== input.excludeUid);
    if (conflictingOwner) {
        return conflictingOwner;
    }

    return input.excludeUid && input.ownerIds.includes(input.excludeUid)
        ? input.excludeUid
        : input.ownerIds[0] ?? null;
}

async function queryLegacyOwnerIds(usernames: readonly string[]) {
    const ownerMap = new Map<string, string[]>();

    if (!adminDb || usernames.length === 0) {
        return ownerMap;
    }

    for (const batch of chunkValues(usernames, USERNAME_AVAILABILITY_BATCH_SIZE)) {
        const snap = await adminDb
            .collection("users")
            .where("username", "in", batch)
            .get();

        batch.forEach((username) => {
            ownerMap.set(username, []);
        });

        snap.docs.forEach((doc) => {
            const username = normalizeUsername((doc.data() as { username?: unknown }).username);
            if (!username) {
                return;
            }

            const owners = ownerMap.get(username) ?? [];
            owners.push(doc.id);
            ownerMap.set(username, owners);
        });
    }

    return ownerMap;
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

    const reservationRefs = uniqueUsernames.map((username) =>
        adminDb.collection(USERNAME_RESERVATIONS_COLLECTION).doc(username),
    );
    const reservationSnapshots = await Promise.all(reservationRefs.map((docRef) => docRef.get()));
    const usernamesWithoutReservations: string[] = [];

    reservationSnapshots.forEach((snapshot, index) => {
        const username = uniqueUsernames[index];
        const reservationOwner = readReservationOwner(snapshot);
        if (!reservationOwner) {
            usernamesWithoutReservations.push(username);
            return;
        }

        availabilityMap.set(username, Boolean(excludeUid && reservationOwner === excludeUid));
    });

    if (usernamesWithoutReservations.length === 0) {
        return availabilityMap;
    }

    const legacyOwners = await queryLegacyOwnerIds(usernamesWithoutReservations);
    const backfillPromises: Promise<unknown>[] = [];

    usernamesWithoutReservations.forEach((username) => {
        const ownerIds = legacyOwners.get(username) ?? [];
        const selectedOwner = selectLegacyOwner({
            ownerIds,
            excludeUid,
        });

        if (!selectedOwner) {
            availabilityMap.set(username, true);
            return;
        }

        availabilityMap.set(username, selectedOwner === excludeUid);
        backfillPromises.push(
            adminDb
                .collection(USERNAME_RESERVATIONS_COLLECTION)
                .doc(username)
                .set(buildUsernameReservationRecord({
                    username,
                    uid: selectedOwner,
                    source: "legacy_backfill",
                    legacyBackfilled: true,
                }), { merge: true }),
        );
    });

    if (backfillPromises.length > 0) {
        await Promise.allSettled(backfillPromises);
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

async function findLegacyOwnerInTransaction(
    transaction: FirebaseFirestore.Transaction,
    normalizedUsername: string,
    excludeUid?: string,
) {
    if (!adminDb) {
        return null;
    }

    const query = adminDb.collection("users").where("username", "==", normalizedUsername).limit(5);
    const snap = await transaction.get(query);
    const ownerIds = snap.docs.map((doc) => doc.id);

    return selectLegacyOwner({
        ownerIds,
        excludeUid,
    });
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

export async function reserveUsernameForUser(input: {
    requestedUsername: string;
    uid: string;
    previousUsername?: string | null;
    source: string;
    applyUserMutation?: (transaction: FirebaseFirestore.Transaction, normalizedUsername: string) => void | Promise<void>;
}) {
    const normalizedUsername = normalizeUsername(input.requestedUsername);
    if (!normalizedUsername) {
        return {
            ok: false as const,
            reason: "invalid" as const,
            normalizedUsername: null,
        };
    }

    if (!adminDb) {
        throw new Error("Database not available");
    }

    return adminDb.runTransaction(async (transaction) => {
        const reservationRef = adminDb.collection(USERNAME_RESERVATIONS_COLLECTION).doc(normalizedUsername);
        const reservationSnap = await transaction.get(reservationRef);
        const reservationOwner = readReservationOwner(reservationSnap);

        if (reservationOwner && reservationOwner !== input.uid) {
            return {
                ok: false as const,
                reason: "taken" as const,
                normalizedUsername,
                ownerUid: reservationOwner,
            };
        }

        const legacyOwner = await findLegacyOwnerInTransaction(transaction, normalizedUsername, input.uid);
        if (legacyOwner && legacyOwner !== input.uid) {
            if (!reservationOwner) {
                transaction.set(reservationRef, buildUsernameReservationRecord({
                    username: normalizedUsername,
                    uid: legacyOwner,
                    source: "legacy_backfill",
                    legacyBackfilled: true,
                }), { merge: true });
            }

            return {
                ok: false as const,
                reason: "taken" as const,
                normalizedUsername,
                ownerUid: legacyOwner,
            };
        }

        transaction.set(reservationRef, buildUsernameReservationRecord({
            username: normalizedUsername,
            uid: input.uid,
            source: input.source,
            legacyBackfilled: reservationOwner === null && legacyOwner === input.uid,
        }), { merge: true });

        const previousUsername = normalizeUsername(input.previousUsername);
        if (previousUsername && previousUsername !== normalizedUsername) {
            const previousReservationRef = adminDb.collection(USERNAME_RESERVATIONS_COLLECTION).doc(previousUsername);
            const previousReservationSnap = await transaction.get(previousReservationRef);
            const previousOwner = readReservationOwner(previousReservationSnap);
            if (previousOwner === input.uid) {
                transaction.delete(previousReservationRef);
            }
        }

        if (input.applyUserMutation) {
            await input.applyUserMutation(transaction, normalizedUsername);
        }

        return {
            ok: true as const,
            normalizedUsername,
        };
    });
}

export async function releaseUsernameReservationForUser(input: {
    username?: string | null;
    uid: string;
}) {
    const normalizedUsername = normalizeUsername(input.username);
    if (!normalizedUsername || !adminDb) {
        return;
    }

    await adminDb.runTransaction(async (transaction) => {
        const reservationRef = adminDb.collection(USERNAME_RESERVATIONS_COLLECTION).doc(normalizedUsername);
        const reservationSnap = await transaction.get(reservationRef);
        const reservationOwner = readReservationOwner(reservationSnap);

        if (reservationOwner === input.uid) {
            transaction.delete(reservationRef);
        }
    });
}
