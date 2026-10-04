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

export type FirestoreClientRetryDecision = {
    retryable: boolean;
    reason: "transient" | "cancelled" | "permanent" | "quota_recovery_required" | "client_state_recovery_required";
};

/** Read recovery only (one-shot reads and listeners). Registration or request completion alone does not verify source freshness. Never replay writes with this decision. */
export function classifyFirestoreClientRetry(error: unknown): FirestoreClientRetryDecision {
    if (analyzeFirestoreClientIssue(error)?.kind === "internal_assertion") {
        return { retryable: false, reason: "client_state_recovery_required" };
    }
    const rawCode = error && typeof error === "object" && "code" in error ? error.code : null;
    const code = typeof rawCode === "string" ? rawCode.replace(/^firestore\//, "") : null;
    if (code === "cancelled" || (error instanceof Error && error.name === "AbortError")) {
        return { retryable: false, reason: "cancelled" };
    }
    if (code === "resource-exhausted") {
        return { retryable: false, reason: "quota_recovery_required" };
    }
    if (code === null || ["unavailable", "deadline-exceeded", "aborted", "unknown"].includes(code)) {
        return { retryable: true, reason: "transient" };
    }
    return { retryable: false, reason: "permanent" };
}

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
    const recovery = classifyFirestoreClientRetry(error);
    if (recovery.reason === "client_state_recovery_required") {
        return `${scope} live updates paused after a connection state failure. Reopen this view to reconnect.`;
    }

    if (recovery.reason === "quota_recovery_required") {
        return `${scope} live updates paused due to quota limits.`;
    }

    if (!recovery.retryable) {
        return `${scope} live updates paused. Check access or the source before reopening this view.`;
    }
    return `${scope} live updates are out of sync. Reopen this view if they do not recover.`;
}
