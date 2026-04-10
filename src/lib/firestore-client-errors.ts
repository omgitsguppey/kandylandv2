const FIRESTORE_INTERNAL_ASSERTION_PATTERN = /FIRESTORE \(([^)]+)\) INTERNAL ASSERTION FAILED: Unexpected state \(ID: ([^)]+)\)(?: CONTEXT: (.+))?/;
const FIRESTORE_ASSERTION_ID_PATTERN = /Unexpected state \(ID: ([^)]+)\)/g;

type FirestoreIssueKind = "internal_assertion" | "firestore_error";

export type FirestoreClientIssue = {
    kind: FirestoreIssueKind;
    sdkVersion?: string;
    primaryAssertionId?: string;
    assertionIds: string[];
    rawContext?: string;
    message: string;
    meaning: string;
    recovery: string;
};

function getErrorMessage(error: unknown) {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message.trim();
    }

    if (typeof error === "string" && error.trim().length > 0) {
        return error.trim();
    }

    return "";
}

export function analyzeFirestoreClientIssue(error: unknown): FirestoreClientIssue | null {
    const message = getErrorMessage(error);
    if (!message.toUpperCase().includes("FIRESTORE")) {
        return null;
    }

    const assertionIds = Array.from(message.matchAll(FIRESTORE_ASSERTION_ID_PATTERN))
        .map((match) => match[1]?.trim())
        .filter((value): value is string => Boolean(value));
    const internalMatch = FIRESTORE_INTERNAL_ASSERTION_PATTERN.exec(message);
    if (internalMatch) {
        const [, sdkVersion, primaryAssertionId, rawContext] = internalMatch;
        const normalizedAssertionIds = Array.from(new Set([
            primaryAssertionId?.trim(),
            ...assertionIds,
        ].filter((value): value is string => Boolean(value))));

        return {
            kind: "internal_assertion",
            sdkVersion: sdkVersion?.trim(),
            primaryAssertionId: primaryAssertionId?.trim(),
            assertionIds: normalizedAssertionIds,
            rawContext: rawContext?.trim(),
            message,
            meaning: "The browser Firestore SDK entered an invalid internal realtime state. This is not a normal permission or auth error.",
            recovery: "Realtime listeners should be downgraded to polling for this session. A refresh usually clears the broken client state.",
        };
    }

    return {
        kind: "firestore_error",
        assertionIds,
        message,
        meaning: "The browser Firestore SDK reported a client-side realtime error.",
        recovery: "The listener should fail closed, report the scope, and fall back to a server read path where possible.",
    };
}

export function buildFirestoreClientIssueDetail(error: unknown, detail?: Record<string, unknown>) {
    const issue = analyzeFirestoreClientIssue(error);
    if (!issue) {
        return detail ?? {};
    }

    return {
        firestoreIssueKind: issue.kind,
        firestoreSdkVersion: issue.sdkVersion ?? null,
        firestoreAssertionIds: issue.assertionIds,
        firestorePrimaryAssertionId: issue.primaryAssertionId ?? null,
        firestoreMeaning: issue.meaning,
        firestoreRecovery: issue.recovery,
        firestoreRawContext: issue.rawContext ?? null,
        ...detail,
    };
}

export function buildFirestoreClientFallbackMessage(scope: string, error: unknown) {
    const issue = analyzeFirestoreClientIssue(error);
    if (issue?.kind === "internal_assertion") {
        return `${scope} live updates hit a Firestore client state failure. Realtime is temporarily degraded and polling fallback is active.`;
    }

    if (issue) {
        return `${scope} live updates failed in the Firestore browser client. Polling fallback is active.`;
    }

    return `${scope} live updates are temporarily degraded. Polling fallback is active.`;
}
