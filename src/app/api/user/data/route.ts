import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { CREATOR_COLLECTIONS } from "@/lib/creator-experiences";
import { adminDb } from "@/lib/server/firebase-admin";
import { RELAXED } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

function serializeForExport(value: unknown): unknown {
    if (value === null || value === undefined) {
        return value ?? null;
    }

    if (Array.isArray(value)) {
        return value.map((entry) => serializeForExport(entry));
    }

    if (typeof value === "object") {
        if ("toMillis" in value && typeof (value as { toMillis?: () => number }).toMillis === "function") {
            return (value as { toMillis: () => number }).toMillis();
        }

        if ("seconds" in value && typeof (value as { seconds?: unknown }).seconds === "number") {
            return Number((value as { seconds: number }).seconds) * 1000;
        }

        if ("_seconds" in value && typeof (value as { _seconds?: unknown })._seconds === "number") {
            return Number((value as { _seconds: number })._seconds) * 1000;
        }

        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, serializeForExport(entry)]),
        );
    }

    return value;
}

async function exportQueryDocs(query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>) {
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(serializeForExport(doc.data()) as Record<string, unknown>),
    }));
}

async function GET_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "user/data",
            rateLimit: RELAXED,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { uid, email } = caller;

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const userRef = adminDb.collection("users").doc(uid);
        const [
            userDoc,
            legacyProfileDoc,
            legacyEconomyDoc,
            legacyUnlockedDrops,
            transactions,
            dailyTaskEvents,
            dailyTaskEventReceipts,
            securityEvents,
            analyticsEventFacts,
            analyticsSessionFacts,
            analyticsWatchSessions,
            analyticsWatchAssets,
            analyticsUserDaily,
            analyticsUsersRollupDoc,
            analyticsActiveUserDoc,
            paymentLocks,
            creatorRelationshipsAsUser,
            creatorRelationshipsAsCreator,
            creatorSubscriptionsAsUser,
            creatorSubscriptionsAsCreator,
            creatorMessageThreadsAsUser,
            creatorMessageThreadsAsCreator,
            creatorMessagesAsUser,
            creatorMessagesAsCreator,
            creatorBroadcasts,
            creatorCustomRequestsAsUser,
            creatorCustomRequestsAsCreator,
            creatorCallBookingsAsUser,
            creatorCallBookingsAsCreator,
            creatorLedgerAccrualsAsUser,
            creatorLedgerAccrualsAsCreator,
            creatorPayoutRequests,
        ] = await Promise.all([
            userRef.get(),
            userRef.collection("profile").doc("default").get(),
            userRef.collection("economy").doc("balance").get(),
            exportQueryDocs(userRef.collection("unlocked_drops")),
            exportQueryDocs(adminDb.collection("transactions").where("userId", "==", uid)),
            exportQueryDocs(adminDb.collection("daily_task_events").where("userId", "==", uid)),
            exportQueryDocs(adminDb.collection("daily_task_event_receipts").where("uid", "==", uid)),
            exportQueryDocs(adminDb.collection("security_events").where("userId", "==", uid)),
            exportQueryDocs(adminDb.collection("analytics_event_facts").where("userId", "==", uid)),
            exportQueryDocs(adminDb.collection("analytics_session_facts").where("userId", "==", uid)),
            exportQueryDocs(adminDb.collection("analytics_watch_sessions").where("userId", "==", uid)),
            exportQueryDocs(adminDb.collection("analytics_watch_assets").where("userId", "==", uid)),
            exportQueryDocs(adminDb.collection("analytics_user_daily").where("uid", "==", uid)),
            adminDb.collection("analytics_users_rollup").doc(uid).get(),
            adminDb.collection("analytics_active_users").doc(uid).get(),
            exportQueryDocs(adminDb.collection("paymentLocks").where("userId", "==", uid)),
            exportQueryDocs(adminDb.collection(CREATOR_COLLECTIONS.relationships).where("userId", "==", uid)),
            exportQueryDocs(adminDb.collection(CREATOR_COLLECTIONS.relationships).where("creatorId", "==", uid)),
            exportQueryDocs(adminDb.collection(CREATOR_COLLECTIONS.subscriptions).where("userId", "==", uid)),
            exportQueryDocs(adminDb.collection(CREATOR_COLLECTIONS.subscriptions).where("creatorId", "==", uid)),
            exportQueryDocs(adminDb.collection(CREATOR_COLLECTIONS.messageThreads).where("userId", "==", uid)),
            exportQueryDocs(adminDb.collection(CREATOR_COLLECTIONS.messageThreads).where("creatorId", "==", uid)),
            exportQueryDocs(adminDb.collection(CREATOR_COLLECTIONS.messages).where("userId", "==", uid)),
            exportQueryDocs(adminDb.collection(CREATOR_COLLECTIONS.messages).where("creatorId", "==", uid)),
            exportQueryDocs(adminDb.collection(CREATOR_COLLECTIONS.broadcasts).where("creatorId", "==", uid)),
            exportQueryDocs(adminDb.collection(CREATOR_COLLECTIONS.requests).where("userId", "==", uid)),
            exportQueryDocs(adminDb.collection(CREATOR_COLLECTIONS.requests).where("creatorId", "==", uid)),
            exportQueryDocs(adminDb.collection(CREATOR_COLLECTIONS.bookings).where("userId", "==", uid)),
            exportQueryDocs(adminDb.collection(CREATOR_COLLECTIONS.bookings).where("creatorId", "==", uid)),
            exportQueryDocs(adminDb.collection(CREATOR_COLLECTIONS.ledgerAccruals).where("userId", "==", uid)),
            exportQueryDocs(adminDb.collection(CREATOR_COLLECTIONS.ledgerAccruals).where("creatorId", "==", uid)),
            exportQueryDocs(adminDb.collection(CREATOR_COLLECTIONS.payoutRequests).where("creatorId", "==", uid)),
        ]);
        const userData = userDoc.exists ? userDoc.data() : null;

        const exportData = {
            exportDate: new Date().toISOString(),
            identity: {
                uid,
                email,
            },
            profile: serializeForExport(userData || {}),
            legacy: {
                profile: legacyProfileDoc.exists ? serializeForExport(legacyProfileDoc.data()) : null,
                economy: legacyEconomyDoc.exists ? serializeForExport(legacyEconomyDoc.data()) : null,
                unlockedDrops: legacyUnlockedDrops,
            },
            unlockedContent: {
                canonical: serializeForExport(userData?.unlockedContent || []),
                timestamps: serializeForExport(userData?.unlockedContentTimestamps || {}),
            },
            activity: {
                transactions,
                dailyTaskEvents,
                dailyTaskEventReceipts,
                paymentLocks,
            },
            creatorExperiences: {
                relationships: {
                    asUser: creatorRelationshipsAsUser,
                    asCreator: creatorRelationshipsAsCreator,
                },
                subscriptions: {
                    asUser: creatorSubscriptionsAsUser,
                    asCreator: creatorSubscriptionsAsCreator,
                },
                messageThreads: {
                    asUser: creatorMessageThreadsAsUser,
                    asCreator: creatorMessageThreadsAsCreator,
                },
                messages: {
                    asUser: creatorMessagesAsUser,
                    asCreator: creatorMessagesAsCreator,
                },
                broadcasts: creatorBroadcasts,
                customRequests: {
                    asUser: creatorCustomRequestsAsUser,
                    asCreator: creatorCustomRequestsAsCreator,
                },
                callBookings: {
                    asUser: creatorCallBookingsAsUser,
                    asCreator: creatorCallBookingsAsCreator,
                },
                ledgerAccruals: {
                    asUser: creatorLedgerAccrualsAsUser,
                    asCreator: creatorLedgerAccrualsAsCreator,
                },
                payoutRequests: creatorPayoutRequests,
            },
            securityEvents,
            analytics: {
                eventFacts: analyticsEventFacts,
                sessionFacts: analyticsSessionFacts,
                watchSessions: analyticsWatchSessions,
                watchAssets: analyticsWatchAssets,
                userDaily: analyticsUserDaily,
                userRollup: analyticsUsersRollupDoc.exists ? serializeForExport(analyticsUsersRollupDoc.data()) : null,
                activeUser: analyticsActiveUserDoc.exists ? serializeForExport(analyticsActiveUserDoc.data()) : null,
            },
            privacy: {
                analyticsExclusion: userData?.analyticsExclusion || false,
                privacySettings: serializeForExport(userData?.privacySettings || null),
            },
        };

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="kandydrops_data_${uid}.json"`,
            },
        });
    } catch (error) {
        return handleApiError(error, "User.Data.GET");
    }
}

export let GET = withRouteRuntimeHealth("user/data:GET", GET_handler);
