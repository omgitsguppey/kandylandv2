import { NextRequest, NextResponse } from "next/server";

import { verifyAuth, handleApiError } from "@/lib/server/auth";
import { adminDb, adminAuth } from "@/lib/server/firebase-admin";
import { checkRateLimit, STRICT } from "@/lib/server/rate-limit";

type DeletedDataSummary = {
    userDocumentTree: number;
    transactions: number;
    dailyTaskEvents: number;
    dailyTaskEventReceipts: number;
    securityEvents: number;
    analyticsEventFacts: number;
    analyticsSessionFacts: number;
    analyticsUserDaily: number;
    analyticsUsersRollup: number;
    analyticsActiveUser: number;
    paymentLocks: number;
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
) {
    const collections = await docRef.listCollections();
    let deletedCount = 0;

    for (const collection of collections) {
        const snapshot = await collection.get();
        for (const doc of snapshot.docs) {
            deletedCount += await deleteDocumentTree(doc.ref, bulkWriter);
        }
    }

    bulkWriter.delete(docRef);
    return deletedCount + 1;
}

async function deleteQueryMatches(
    query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>,
    bulkWriter: FirebaseFirestore.BulkWriter,
) {
    const snapshot = await query.get();
    snapshot.docs.forEach((doc) => bulkWriter.delete(doc.ref));
    return snapshot.size;
}

export async function DELETE(request: NextRequest) {
    try {
        await checkRateLimit(request, "user/delete", STRICT);
        const authResult = await verifyAuth(request);
        const { uid } = authResult;

        if (!adminDb || !adminAuth) {
            return NextResponse.json({ error: "Database or Auth not available" }, { status: 500 });
        }

        const userRef = adminDb.collection("users").doc(uid);
        const bulkWriter = adminDb.bulkWriter();
        bulkWriter.onWriteError((error) => {
            console.error("User delete bulk-writer error", error);
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

        const deletedSummaryValues = await Promise.all([
            deleteDocumentTree(userRef, bulkWriter),
            deleteQueryMatches(adminDb.collection("transactions").where("userId", "==", uid), bulkWriter),
            deleteQueryMatches(adminDb.collection("daily_task_events").where("userId", "==", uid), bulkWriter),
            deleteQueryMatches(adminDb.collection("daily_task_event_receipts").where("uid", "==", uid), bulkWriter),
            deleteQueryMatches(adminDb.collection("security_events").where("userId", "==", uid), bulkWriter),
            deleteQueryMatches(adminDb.collection("analytics_event_facts").where("userId", "==", uid), bulkWriter),
            deleteQueryMatches(adminDb.collection("analytics_session_facts").where("userId", "==", uid), bulkWriter),
            deleteQueryMatches(adminDb.collection("analytics_user_daily").where("uid", "==", uid), bulkWriter),
            deleteQueryMatches(adminDb.collection("paymentLocks").where("userId", "==", uid), bulkWriter),
        ]);

        bulkWriter.delete(adminDb.collection("analytics_users_rollup").doc(uid));
        bulkWriter.delete(adminDb.collection("analytics_active_users").doc(uid));
        await bulkWriter.close();

        const deletedSummary: DeletedDataSummary = {
            userDocumentTree: deletedSummaryValues[0],
            transactions: deletedSummaryValues[1],
            dailyTaskEvents: deletedSummaryValues[2],
            dailyTaskEventReceipts: deletedSummaryValues[3],
            securityEvents: deletedSummaryValues[4],
            analyticsEventFacts: deletedSummaryValues[5],
            analyticsSessionFacts: deletedSummaryValues[6],
            analyticsUserDaily: deletedSummaryValues[7],
            paymentLocks: deletedSummaryValues[8],
            analyticsUsersRollup: 1,
            analyticsActiveUser: 1,
        };

        if (authUserExists) {
            try {
                await adminAuth.deleteUser(uid);
            } catch (error) {
                console.error("Account cleanup completed but auth deletion is pending", error);
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
