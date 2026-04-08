import {
    buildFirebaseLikeAuthError,
    looksLikeEmailAddress,
    normalizeEmailAddress,
} from "@/lib/auth-errors";

type FetchLike = typeof fetch;

type ManualLookupPayload = {
    error?: string;
    resolvedEmail?: string | null;
    identifierType?: "email" | "username" | "unknown";
    authErrorCode?: string;
};

type UsernameAvailabilityPayload = {
    error?: string;
    normalized?: string | null;
    available?: boolean;
};

type RegistrationPayload = {
    error?: string;
    welcomeBonus?: number;
};

export type ManualSignInIdentity = {
    resolvedEmail: string;
    identifierType: "email" | "username";
};

export async function resolveManualSignInIdentity(identifier: string, fetchImpl: FetchLike = fetch): Promise<ManualSignInIdentity> {
    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier) {
        throw buildFirebaseLikeAuthError("auth/invalid-credential");
    }

    const response = await fetchImpl("/api/auth/manual-sign-in-lookup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            identifier: normalizedIdentifier,
        }),
    });

    let payload: ManualLookupPayload = {};
    try {
        payload = await response.json() as ManualLookupPayload;
    } catch {
        payload = {};
    }

    if (!response.ok) {
        if (response.status === 429) {
            throw buildFirebaseLikeAuthError("auth/too-many-requests");
        }

        throw new Error(payload.error || "Username sign-in is temporarily unavailable. Use your account email or try again shortly.");
    }

    if (typeof payload.authErrorCode === "string" && payload.authErrorCode.length > 0) {
        throw buildFirebaseLikeAuthError(payload.authErrorCode);
    }

    if (typeof payload.resolvedEmail !== "string" || !looksLikeEmailAddress(payload.resolvedEmail)) {
        throw buildFirebaseLikeAuthError(payload.authErrorCode || "auth/invalid-credential");
    }

    return {
        resolvedEmail: normalizeEmailAddress(payload.resolvedEmail),
        identifierType: payload.identifierType === "username" ? "username" : "email",
    };
}

export async function ensureManualSignupUsername(username: string, fetchImpl: FetchLike = fetch) {
    const normalizedCandidate = username.trim();
    if (!normalizedCandidate) {
        throw buildFirebaseLikeAuthError("auth/invalid-username", "Username is required.");
    }

    const response = await fetchImpl(`/api/user/check-username?username=${encodeURIComponent(normalizedCandidate)}`, {
        cache: "no-store",
    });

    let payload: UsernameAvailabilityPayload = {};
    try {
        payload = await response.json() as UsernameAvailabilityPayload;
    } catch {
        payload = {};
    }

    if (!response.ok) {
        throw new Error(payload.error || "Username availability is temporarily unavailable. Try again shortly.");
    }

    if (typeof payload.normalized !== "string" || payload.normalized.trim().length === 0) {
        throw buildFirebaseLikeAuthError(
            "auth/invalid-username",
            "Use 3-20 lowercase letters, numbers, dashes, or underscores.",
        );
    }

    if (payload.available !== true) {
        throw buildFirebaseLikeAuthError("auth/username-already-in-use", "Username is already taken.");
    }

    return payload.normalized;
}

export async function readManualRegistrationResult(response: Response) {
    let payload: RegistrationPayload = {};
    try {
        payload = await response.json() as RegistrationPayload;
    } catch {
        payload = {};
    }

    if (!response.ok) {
        if (response.status === 409) {
            throw buildFirebaseLikeAuthError("auth/username-already-in-use", payload.error || "Username is already taken.");
        }

        if (response.status === 429) {
            throw buildFirebaseLikeAuthError("auth/too-many-requests");
        }

        throw new Error(payload.error || "Registration failed");
    }

    return {
        welcomeBonus: typeof payload.welcomeBonus === "number" ? Math.max(0, payload.welcomeBonus) : 0,
    };
}
