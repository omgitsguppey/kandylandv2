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

            const docPromises = snapshot.docs.map((doc) => deleteDocumentTree(doc.ref, bulkWriter));
            const counts = await Promise.all(docPromises);
            deletedInCollection += counts.reduce((acc, count) => acc + count, 0);
            lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;
            if (snapshot.size < USER_DELETE_PAGE_SIZE || !lastDoc) break;
        }

        return deletedInCollection;
    });

    const counts = await Promise.all(collectionPromises);
    const deletedCount = counts.reduce((acc, count) => acc + count, 0);

    bulkWriter.delete(docRef);
    return deletedCount + 1;
}

async function deleteQueryMatches(
    query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>,
    bulkWriter: FirebaseFirestore.BulkWriter,
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

        snapshot.docs.forEach((doc) => bulkWriter.delete(doc.ref));
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

        const userRef = adminDb.collection("users").doc(uid);
        const existingUserSnap = await userRef.get();
        const existingUsername = typeof existingUserSnap.data()?.username === "string"
            ? existingUserSnap.data()?.username
            : null;
        const bulkWriter = adminDb.bulkWriter();
        bulkWriter.onWriteError((error) => {
            recordRouteWarning("user/delete", "User delete bulk-writer error", error);
            return error.failedAttempts < 3;
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

        const creatorCleanupQueries = creatorDocumentCleanupWrites(uid);
        const deletedSummaryValues = await Promise.all([
            deleteDocumentTree(userRef, bulkWriter),
            deleteQueryMatches(adminDb.collection("transactions").where("userId", "==", uid), bulkWriter),
            deleteQueryMatches(adminDb.collection("daily_task_events").where("userId", "==", uid), bulkWriter),
            deleteQueryMatches(adminDb.collection("daily_task_event_receipts").where("uid", "==", uid), bulkWriter),
            deleteQueryMatches(adminDb.collection("security_events").where("userId", "==", uid), bulkWriter),
            deleteQueryMatches(adminDb.collection("analytics_event_facts").where("userId", "==", uid), bulkWriter),
            deleteQueryMatches(adminDb.collection("analytics_session_facts").where("userId", "==", uid), bulkWriter),
            deleteQueryMatches(adminDb.collection("analytics_watch_sessions").where("userId", "==", uid), bulkWriter),
            deleteQueryMatches(adminDb.collection("analytics_watch_assets").where("userId", "==", uid), bulkWriter),
            deleteQueryMatches(adminDb.collection("analytics_user_daily").where("uid", "==", uid), bulkWriter),
            deleteQueryMatches(adminDb.collection("paymentLocks").where("userId", "==", uid), bulkWriter),
            ...creatorCleanupQueries.map((entry) => deleteQueryMatches(
                adminDb.collection(entry.collection).where(entry.field, "==", entry.value),
                bulkWriter,
            )),
        ]);

        bulkWriter.delete(adminDb.collection("analytics_users_rollup").doc(uid));
        bulkWriter.delete(adminDb.collection("analytics_active_users").doc(uid));
        await bulkWriter.close();

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
