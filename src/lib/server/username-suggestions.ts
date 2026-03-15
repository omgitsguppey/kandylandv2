import { adminDb } from "@/lib/server/firebase-admin";
import { buildUsernameBaseCandidates, normalizeUsername } from "@/lib/user-utils";

function buildFallbackUsername(uid: string) {
    return `user-${uid.slice(0, 8).toLowerCase()}`;
}

async function isUsernameAvailable(username: string, excludeUid?: string) {
    if (!adminDb) {
        return false;
    }

    const snap = await adminDb
        .collection("users")
        .where("username", "==", username)
        .limit(1)
        .get();

    if (snap.empty) {
        return true;
    }

    if (excludeUid && snap.docs[0]?.id === excludeUid) {
        return true;
    }

    return false;
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

    for (const candidate of candidates) {
        if (await isUsernameAvailable(candidate, input.excludeUid)) {
            return candidate;
        }

        for (let suffix = 2; suffix < 100; suffix += 1) {
            const suffixValue = `-${suffix}`;
            const truncatedBase = candidate.slice(0, Math.max(3, 20 - suffixValue.length));
            const alternative = normalizeUsername(`${truncatedBase}${suffixValue}`);
            if (!alternative) {
                continue;
            }

            if (await isUsernameAvailable(alternative, input.excludeUid)) {
                return alternative;
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

    return {
        normalized,
        available: await isUsernameAvailable(normalized, excludeUid),
    };
}
