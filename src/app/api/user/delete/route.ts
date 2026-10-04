import { NextRequest, NextResponse } from "next/server";
import { FieldPath } from "firebase-admin/firestore";

import { handleApiError } from "@/lib/server/auth";
import { adminDb, adminAuth } from "@/lib/server/firebase-admin";
import { STRICT } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { creatorDocumentCleanupWrites } from "@/lib/server/creator-experiences";
import { releaseUsernameReservationForUser } from "@/lib/server/username-suggestions";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { DELETE_ACCOUNT_RETENTION_REVIEW_QUERIES, requiresAccountDeletionRetentionReview } from "@/lib/privacy-data/delete-account-retention-policy";

const USER_DELETE_PAGE_SIZE = 250;

type DeletedDataSummary = {
    userDocumentTree: number;
    transactions: number;
    dailyTaskEvents: number;
    dailyTaskEventReceipts: number;
    securityEvents: number;
    analyticsEventFacts: number;
    analyticsSessionFacts: number;
    analyticsWatchSessions: number;
    analyticsWatchAssets: number;
    analyticsUserDaily: number;
    analyticsUsersRollup: number;
    analyticsActiveUser: number;
    paymentLocks: number;
    creatorDocuments: number;
};

function getFirebaseErrorCode(error: unknown) {
    if (error && typeof error === "object" && "code" in error) {
        const code = (error as { code?: unknown }).code;
        return typeof code === "string" ? code : "";
    }

    return "";
}

async function deleteDocumentTree(
    docRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>,
    bulkWriter: FirebaseFirestore.BulkWriter,
    onFailure: (error: unknown) => void,
): Promise<number> {
    const collections = await docRef.listCollections();

    const collectionPromises = collections.map(async (collection) => {
        let deletedInCollection = 0;
        let lastDoc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData> | null = null;

        while (true) {
            // cost-bound: Firestore query is limited to 250 records per page for account deletion.
            let pageQuery = collection.orderBy(FieldPath.documentId()).limit(USER_DELETE_PAGE_SIZE);
            if (lastDoc) {
                pageQuery = pageQuery.startAfter(lastDoc);
            }
            const snapshot = await pageQuery.get();
            if (snapshot.empty) break;

            const docPromises = snapshot.docs.map((doc) => deleteDocumentTree(doc.ref, bulkWriter, onFailure));
            const counts = await Promise.all(docPromises);
            deletedInCollection += counts.reduce((acc, count) => acc + count, 0);
            lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;
            if (snapshot.size < USER_DELETE_PAGE_SIZE || !lastDoc) break;
        }

        return deletedInCollection;
    });

    const counts = await Promise.all(collectionPromises);
    const deletedCount = counts.reduce((acc, count) => acc + count, 0);

    void bulkWriter.delete(docRef).catch(onFailure);
    return deletedCount + 1;
}

async function deleteQueryMatches(
    query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>,
    bulkWriter: FirebaseFirestore.BulkWriter,
    onFailure: (error: unknown) => void,
) {
    let deletedCount = 0;
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData> | null = null;

    while (true) {
        // cost-bound: Firestore query is limited to 250 records per page for account deletion.
        let pageQuery = query.orderBy(FieldPath.documentId()).limit(USER_DELETE_PAGE_SIZE);
        if (lastDoc) {
            pageQuery = pageQuery.startAfter(lastDoc);
        }
        const snapshot = await pageQuery.get();
        if (snapshot.empty) break;

        snapshot.docs.forEach((doc) => { void bulkWriter.delete(doc.ref).catch(onFailure); });
        deletedCount += snapshot.size;
        lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;
        if (snapshot.size < USER_DELETE_PAGE_SIZE || !lastDoc) break;
    }

    return deletedCount;
}

async function DELETE_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "user/delete",
            rateLimit: STRICT,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { uid } = caller;

        if (!adminDb || !adminAuth) {
            return NextResponse.json({ error: "Database or Auth not available" }, { status: 500 });
        }

        // cost-bound: six caller-scoped limit(1) presence reads, only on explicit account deletion.
        // Do not erase ledger/security records or mutate Auth before required retention review.
        const retainedTargets = await Promise.all(DELETE_ACCOUNT_RETENTION_REVIEW_QUERIES.map(async (target) => {
            const snapshot = await adminDb.collection(target.collection).where(target.field, "==", uid).limit(1).get();
            return snapshot.empty ? null : target.targetKey;
        }));
        if (retainedTargets.some(Boolean)) {
            return NextResponse.json({
                success: false,
                code: "account_deletion_retention_review_required",
                retryable: false,
                accountActive: true,
                error: "Account retention review required",
            }, { status: 409 });
        }

        const userRef = adminDb.collection("users").doc(uid);
        const existingUserSnap = await userRef.get();
        const existingUsername = typeof existingUserSnap.data()?.username === "string"
            ? existingUserSnap.data()?.username
            : null;
        const bulkWriter = adminDb.bulkWriter();
        let terminalWriteFailed = false;
        const recordCleanupFailure = (error: unknown) => {
            if (!terminalWriteFailed) recordRouteWarning("user/delete", "Account cleanup requires review", error);
            terminalWriteFailed = true;
        };
        bulkWriter.onWriteError((error) => {
            recordRouteWarning("user/delete", "User delete bulk-writer error", error);
            const retry = error.failedAttempts < 3;
            if (!retry) terminalWriteFailed = true;
            return retry;
        });

        let authUserExists = true;
        try {
            await adminAuth.updateUser(uid, { disabled: true });
            await adminAuth.revokeRefreshTokens(uid);
        } catch (error) {
            if (getFirebaseErrorCode(error) === "auth/user-not-found") {
                authUserExists = false;
            } else {
                throw error;
            }
        }

        // Exclude retained targets even if an in-flight financial/security write
        // arrives after the preflight. Presence review never authorizes erasure.
        const creatorCleanupQueries = creatorDocumentCleanupWrites(uid)
            .filter((entry) => !requiresAccountDeletionRetentionReview(entry.collection, entry.field));
        const cleanupResults = await Promise.allSettled([
            deleteDocumentTree(userRef, bulkWriter, recordCleanupFailure),
            Promise.resolve(0), // No transaction deletion is authorized by this route.
            deleteQueryMatches(adminDb.collection("daily_task_events").where("userId", "==", uid), bulkWriter, recordCleanupFailure),
            deleteQueryMatches(adminDb.collection("daily_task_event_receipts").where("uid", "==", uid), bulkWriter, recordCleanupFailure),
            Promise.resolve(0), // Required security evidence is retained.
            deleteQueryMatches(adminDb.collection("analytics_event_facts").where("userId", "==", uid), bulkWriter, recordCleanupFailure),
            deleteQueryMatches(adminDb.collection("analytics_session_facts").where("userId", "==", uid), bulkWriter, recordCleanupFailure),
            deleteQueryMatches(adminDb.collection("analytics_watch_sessions").where("userId", "==", uid), bulkWriter, recordCleanupFailure),
            deleteQueryMatches(adminDb.collection("analytics_watch_assets").where("userId", "==", uid), bulkWriter, recordCleanupFailure),
            deleteQueryMatches(adminDb.collection("analytics_user_daily").where("uid", "==", uid), bulkWriter, recordCleanupFailure),
            Promise.resolve(0), // Preserve payment lifecycle/idempotency records.
            ...creatorCleanupQueries.map((entry) => deleteQueryMatches(
                adminDb.collection(entry.collection).where(entry.field, "==", entry.value),
                bulkWriter,
                recordCleanupFailure,
            )),
        ]);
        for (const result of cleanupResults) {
            if (result.status === "rejected") recordCleanupFailure(result.reason);
        }
        const deletedSummaryValues = cleanupResults.map((result) => result.status === "fulfilled" ? result.value : 0);

        void bulkWriter.delete(adminDb.collection("analytics_users_rollup").doc(uid)).catch(recordCleanupFailure);
        void bulkWriter.delete(adminDb.collection("analytics_active_users").doc(uid)).catch(recordCleanupFailure);
        await bulkWriter.close();
        // BulkWriter.close never rejects. Final operation failures must prevent
        // username release, final Auth deletion and a fabricated success result.
        if (terminalWriteFailed) {
            return NextResponse.json({
                success: false,
                code: "account_deletion_cleanup_pending",
                retryable: false,
                accountActive: false,
                error: "Account cleanup pending",
                deleted: { authUserDeleted: false },
            }, { status: 503 });
        }

        // A request already in flight can settle after the first presence scan.
        // Required records are never queued for deletion; recheck before final
        // Auth/username settlement and report review instead of full completion.
        const retainedAfterCleanup = await Promise.allSettled(DELETE_ACCOUNT_RETENTION_REVIEW_QUERIES.map(async (target) => {
            return adminDb.collection(target.collection).where(target.field, "==", uid).limit(1).get();
        }));
        if (retainedAfterCleanup.some((result) => result.status === "rejected" || !result.value.empty)) {
            recordRouteWarning("user/delete", "Account retention reconciliation is pending");
            return NextResponse.json({
                success: false,
                code: "account_deletion_retention_reconciliation_pending",
                retryable: false,
                accountActive: false,
                error: "Account retention reconciliation pending",
                deleted: { authUserDeleted: false },
            }, { status: 503 });
        }

        try {
            await releaseUsernameReservationForUser({
                uid,
                username: existingUsername,
            });
        } catch (error) {
            recordRouteWarning("user/delete", "Account cleanup completed but username reservation release is pending", error);
            return NextResponse.json({
                success: false,
                message: "Account data was removed, but username release is still pending.",
                deleted: {
                    authUserDeleted: false,
                },
            }, { status: 503 });
        }

        const deletedSummary: DeletedDataSummary = {
            userDocumentTree: deletedSummaryValues[0],
            transactions: deletedSummaryValues[1],
            dailyTaskEvents: deletedSummaryValues[2],
            dailyTaskEventReceipts: deletedSummaryValues[3],
            securityEvents: deletedSummaryValues[4],
            analyticsEventFacts: deletedSummaryValues[5],
            analyticsSessionFacts: deletedSummaryValues[6],
            analyticsWatchSessions: deletedSummaryValues[7],
            analyticsWatchAssets: deletedSummaryValues[8],
            analyticsUserDaily: deletedSummaryValues[9],
            paymentLocks: deletedSummaryValues[10],
            creatorDocuments: deletedSummaryValues.slice(11).reduce((sum, value) => sum + value, 0),
            analyticsUsersRollup: 1,
            analyticsActiveUser: 1,
        };

        if (authUserExists) {
            try {
                await adminAuth.deleteUser(uid);
            } catch (error) {
                recordRouteWarning("user/delete", "Account cleanup completed but auth deletion is pending", error);
                return NextResponse.json({
                    success: false,
                    message: "Account data was removed and login was disabled, but final auth deletion is still pending.",
                    deleted: {
                        ...deletedSummary,
                        authUserDeleted: false,
                    },
                }, { status: 503 });
            }
        }

        return NextResponse.json({
            success: true,
            message: "Account and associated data deleted permanently.",
            deleted: {
                ...deletedSummary,
                authUserDeleted: true,
            },
        });
    } catch (error) {
        return handleApiError(error, "User.Delete.DELETE");
    }
}

export let DELETE = withRouteRuntimeHealth("user/delete:DELETE", DELETE_handler);
