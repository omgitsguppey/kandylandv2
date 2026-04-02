import { NextRequest, NextResponse } from "next/server";

import { normalizeCreatorApplication } from "@/lib/creator-application";
import { CREATOR_COLLECTIONS, isCreatorRole } from "@/lib/creator-experiences";
import {
    type CreatorOnboardingBlockingReason,
    type CreatorOnboardingApprovalStatus,
    type CreatorOnboardingIdStatus,
    type CreatorOnboardingLegalStatus,
    type CreatorOnboardingSegmentStatus,
    type CreatorOnboardingSubmissionStatus,
    type CreatorReviewQueueBucket,
} from "@/lib/creator-onboarding";
import { handleApiError } from "@/lib/server/auth";
import { ensureCreatorOnboardingSubmission, CREATOR_REVIEW_QUEUE_COLLECTION } from "@/lib/server/creator-onboarding";
import { adminDb } from "@/lib/server/firebase-admin";
import { trackServerEvent } from "@/lib/server/analytics";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";

type RosterRole = "user" | "creator" | "admin";
type RosterStatus = "active" | "suspended" | "banned";

type RosterEntry = {
    uid: string;
    displayName: string;
    email: string;
    username: string;
    photoURL: string | null;
    role: RosterRole;
    status: RosterStatus;
    isVerified: boolean;
    createdAt: number;
};

type CreatorReviewQueueRosterEntry = RosterEntry & {
    creatorDisplayName: string;
    queueBucket: CreatorReviewQueueBucket;
    queuePosition: number;
    submissionStatus: CreatorOnboardingSubmissionStatus;
    approvalStatus: CreatorOnboardingApprovalStatus;
    legalStatus: CreatorOnboardingLegalStatus;
    idVerificationStatus: CreatorOnboardingIdStatus;
    segmentationStatus: CreatorOnboardingSegmentStatus;
    creatorPrimaryPlatform?: string;
    creatorContentFocus?: string;
    blockingReasons: CreatorOnboardingBlockingReason[];
    readyForApproval: boolean;
    creatorReviewQueueVisible: boolean;
    submittedAt: number;
    updatedAt: number;
    legalDocumentUrl?: string;
    segmentLabel?: string;
    idDocumentFileName?: string;
    idDocumentFrontFileName?: string;
    idDocumentBackFileName?: string;
    idDocumentFrontContentType?: string;
    idDocumentBackContentType?: string;
    idDocumentCount: number;
    adminNotes?: string;
    reviewedBy?: string;
};

type CreatorOpsAggregate = {
    followerCount: number;
    favoriteCount: number;
    notificationsEnabledCount: number;
    activeSubscribers: number;
    openRequests: number;
    bookedCalls: number;
    pendingPayouts: number;
    openThreads: number;
    pendingDropSubmissions: number;
    totalAccruedGd: number;
    pendingCashoutGd: number;
};

const PRIMARY_ROSTER_ADMIN_EMAIL = "uylusjohnson@gmail.com";

function toTimestampNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (
        value
        && typeof value === "object"
        && "toMillis" in value
        && typeof (value as { toMillis: () => number }).toMillis === "function"
    ) {
        return (value as { toMillis: () => number }).toMillis();
    }

    return 0;
}

function readString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function readBoolean(value: unknown) {
    return value === true;
}

function readStringArray(value: unknown) {
    return Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
        : [];
}

function buildEmptyCreatorOpsAggregate(): CreatorOpsAggregate {
    return {
        followerCount: 0,
        favoriteCount: 0,
        notificationsEnabledCount: 0,
        activeSubscribers: 0,
        openRequests: 0,
        bookedCalls: 0,
        pendingPayouts: 0,
        openThreads: 0,
        pendingDropSubmissions: 0,
        totalAccruedGd: 0,
        pendingCashoutGd: 0,
    };
}

function serializeRosterEntry(id: string, raw: Record<string, unknown>): RosterEntry {
    return {
        uid: id,
        displayName: readString(raw.displayName) || "Unknown user",
        email: readString(raw.email),
        username: readString(raw.username),
        photoURL: typeof raw.photoURL === "string" ? raw.photoURL : null,
        role: raw.role === "creator" || raw.role === "admin" || raw.role === "user" ? raw.role : "user",
        status: raw.status === "suspended" || raw.status === "banned" || raw.status === "active" ? raw.status : "active",
        isVerified: raw.isVerified === true,
        createdAt: toTimestampNumber(raw.createdAt),
    };
}

function serializeQueueEntry(
    raw: Record<string, unknown>,
    user: RosterEntry | undefined,
    creatorApplication: ReturnType<typeof normalizeCreatorApplication> | undefined,
): CreatorReviewQueueRosterEntry | null {
    const uid = readString(raw.userId) || user?.uid || "";
    const creatorDisplayName = readString(raw.creatorDisplayName);
    if (!uid || !creatorDisplayName) {
        return null;
    }

    return {
        uid,
        displayName: user?.displayName || readString(raw.displayName) || creatorDisplayName,
        email: readString(raw.email) || user?.email || "",
        username: readString(raw.username) || user?.username || "",
        photoURL: typeof raw.photoURL === "string" ? raw.photoURL : user?.photoURL ?? null,
        role: user?.role ?? (raw.role === "creator" || raw.role === "admin" || raw.role === "user" ? raw.role : "user"),
        status: user?.status ?? "active",
        isVerified: user?.isVerified ?? false,
        createdAt: user?.createdAt ?? 0,
        creatorDisplayName,
        queueBucket: raw.queueBucket === "waiting_on_legal"
            || raw.queueBucket === "waiting_on_id"
            || raw.queueBucket === "ready_for_approval"
            || raw.queueBucket === "needs_changes"
            || raw.queueBucket === "rejected"
            || raw.queueBucket === "approved"
            ? raw.queueBucket
            : "newest_submissions",
        queuePosition: typeof raw.queuePosition === "number" && Number.isFinite(raw.queuePosition)
            ? Math.trunc(raw.queuePosition)
            : 0,
        submissionStatus: raw.submissionStatus === "onboarding_started"
            || raw.submissionStatus === "onboarding_submitted"
            || raw.submissionStatus === "awaiting_manual_review"
            ? raw.submissionStatus
            : "awaiting_manual_review",
        approvalStatus: raw.approvalStatus === "creator_approved"
            || raw.approvalStatus === "creator_rejected"
            || raw.approvalStatus === "creator_needs_changes"
            ? raw.approvalStatus
            : "creator_pending",
        legalStatus: raw.legalStatus === "legal_sent" || raw.legalStatus === "legal_signed"
            ? raw.legalStatus
            : "legal_pending",
        idVerificationStatus: raw.idVerificationStatus === "id_requested"
            || raw.idVerificationStatus === "id_submitted"
            || raw.idVerificationStatus === "id_verified"
            || raw.idVerificationStatus === "id_rejected"
            ? raw.idVerificationStatus
            : "id_not_requested",
        segmentationStatus: raw.segmentationStatus === "segment_assigned"
            ? "segment_assigned"
            : "segment_unassigned",
        creatorPrimaryPlatform: readString(raw.creatorPrimaryPlatform) || undefined,
        creatorContentFocus: readString(raw.creatorContentFocus) || undefined,
        blockingReasons: readStringArray(raw.blockingReasons) as CreatorOnboardingBlockingReason[],
        readyForApproval: readBoolean(raw.readyForApproval),
        creatorReviewQueueVisible: raw.creatorReviewQueueVisible !== false,
        submittedAt: toTimestampNumber(raw.submittedAt),
        updatedAt: toTimestampNumber(raw.updatedAt),
        legalDocumentUrl: readString(raw.legalDocumentUrl) || undefined,
        segmentLabel: readString(raw.segmentLabel) || undefined,
        idDocumentFileName: readString(raw.idDocumentFileName)
            || creatorApplication?.idDocument?.fileName
            || undefined,
        idDocumentFrontFileName: readString(raw.idDocumentFrontFileName)
            || creatorApplication?.idDocuments?.front?.fileName
            || ((!creatorApplication?.idDocuments || Object.keys(creatorApplication.idDocuments).length === 0)
                ? creatorApplication?.idDocument?.fileName
                : undefined)
            || undefined,
        idDocumentBackFileName: readString(raw.idDocumentBackFileName)
            || creatorApplication?.idDocuments?.back?.fileName
            || undefined,
        idDocumentFrontContentType: readString(raw.idDocumentFrontContentType)
            || creatorApplication?.idDocuments?.front?.contentType
            || ((!creatorApplication?.idDocuments || Object.keys(creatorApplication.idDocuments).length === 0)
                ? creatorApplication?.idDocument?.contentType
                : undefined)
            || undefined,
        idDocumentBackContentType: readString(raw.idDocumentBackContentType)
            || creatorApplication?.idDocuments?.back?.contentType
            || undefined,
        idDocumentCount: typeof raw.idDocumentCount === "number" && Number.isFinite(raw.idDocumentCount)
            ? Math.max(0, Math.trunc(raw.idDocumentCount))
            : [creatorApplication?.idDocuments?.front ?? ((!creatorApplication?.idDocuments || Object.keys(creatorApplication.idDocuments).length === 0) ? creatorApplication?.idDocument : undefined), creatorApplication?.idDocuments?.back]
                .filter(Boolean)
                .length,
        adminNotes: readString(raw.adminNotes) || undefined,
        reviewedBy: readString(raw.reviewedBy) || undefined,
    };
}

function matchesQuery(entry: RosterEntry, query: string) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
        return true;
    }

    return entry.displayName.toLowerCase().includes(normalizedQuery)
        || entry.email.toLowerCase().includes(normalizedQuery)
        || entry.username.toLowerCase().includes(normalizedQuery)
        || entry.uid.toLowerCase().includes(normalizedQuery);
}

export async function GET(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/roster",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
        });

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const query = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
        const [
            usersSnapshot,
            creatorRelationshipsSnap,
            creatorSubscriptionsSnap,
            creatorRequestsSnap,
            creatorBookingsSnap,
            creatorPayoutsSnap,
            creatorThreadsSnap,
            creatorAccrualsSnap,
            pendingCreatorDropsSnap,
            initialQueueSnapshot,
        ] = await Promise.all([
            adminDb.collection("users").orderBy("createdAt", "desc").get(),
            adminDb.collection(CREATOR_COLLECTIONS.relationships).get(),
            adminDb.collection(CREATOR_COLLECTIONS.subscriptions).get(),
            adminDb.collection(CREATOR_COLLECTIONS.requests).get(),
            adminDb.collection(CREATOR_COLLECTIONS.bookings).get(),
            adminDb.collection(CREATOR_COLLECTIONS.payoutRequests).get(),
            adminDb.collection(CREATOR_COLLECTIONS.messageThreads).get(),
            adminDb.collection(CREATOR_COLLECTIONS.ledgerAccruals).get(),
            adminDb.collection("drops").where("approvalStatus", "==", "pending_review").get(),
            adminDb.collection(CREATOR_REVIEW_QUEUE_COLLECTION).orderBy("submittedAt", "desc").get(),
        ]);

        const userDocs = usersSnapshot.docs.map((doc) => ({
            id: doc.id,
            raw: doc.data() as Record<string, unknown>,
        }));
        const allUsers = userDocs.map((doc) => serializeRosterEntry(doc.id, doc.raw));
        const userMap = new Map(allUsers.map((entry) => [entry.uid, entry]));
        const creatorApplicationMap = new Map(
            userDocs.map((doc) => [doc.id, normalizeCreatorApplication(doc.raw.creatorApplication)] as const),
        );
        const queueIds = new Set(initialQueueSnapshot.docs.map((doc) => doc.id));
        const repairCandidates = userDocs
            .map((doc) => ({
                id: doc.id,
                raw: doc.raw,
                creatorApplication: normalizeCreatorApplication(doc.raw.creatorApplication),
            }))
            .filter((entry) => entry.creatorApplication)
            .filter((entry) => !queueIds.has(entry.id));

        if (repairCandidates.length > 0) {
            const repairResults = await Promise.allSettled(repairCandidates.map((entry) => ensureCreatorOnboardingSubmission({
                userId: entry.id,
                email: typeof entry.raw.email === "string" ? entry.raw.email : null,
                displayName: typeof entry.raw.displayName === "string" ? entry.raw.displayName : entry.creatorApplication?.creatorDisplayName,
                username: typeof entry.raw.username === "string" ? entry.raw.username : null,
                photoURL: typeof entry.raw.photoURL === "string" ? entry.raw.photoURL : null,
                role: entry.raw.role === "creator" || entry.raw.role === "admin" || entry.raw.role === "user" ? entry.raw.role : "user",
                createdAt: toTimestampNumber(entry.raw.createdAt),
                creatorDisplayName: entry.creatorApplication?.creatorDisplayName || readString(entry.raw.displayName) || "Creator",
                creatorPrimaryPlatform: entry.creatorApplication?.creatorPrimaryPlatform,
                creatorContentFocus: entry.creatorApplication?.creatorContentFocus,
            })));

            await Promise.allSettled(repairResults.map((result, index) => {
                const entry = repairCandidates[index];
                if (!entry) {
                    return Promise.resolve();
                }

                if (result.status === "rejected") {
                    return recordServerDiagnostic({
                        channel: "creator_onboarding",
                        severity: "error",
                        message: "Creator review queue backfill failed",
                        detail: {
                            userId: entry.id,
                            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
                        },
                    });
                }

                if (!result.value.created) {
                    return Promise.resolve();
                }

                return Promise.allSettled([
                    trackServerEvent("creator_admin_queue_materialized", {
                        page_path: "/admin/roster",
                        repair_source: "legacy_creator_application_projection",
                    }, entry.id),
                    recordServerDiagnostic({
                        channel: "creator_onboarding",
                        severity: "warn",
                        message: "Creator review queue was backfilled from a legacy creator projection",
                        detail: {
                            userId: entry.id,
                            creatorDisplayName: entry.creatorApplication?.creatorDisplayName || "Creator",
                        },
                    }),
                ]);
            }));
        }

        const queueSnapshot = repairCandidates.length > 0
            ? await adminDb.collection(CREATOR_REVIEW_QUEUE_COLLECTION).orderBy("submittedAt", "desc").get()
            : initialQueueSnapshot;

        const creatorOpsByUser = new Map<string, CreatorOpsAggregate>();
        const readCreatorOps = (creatorId: string) => {
            const current = creatorOpsByUser.get(creatorId) ?? buildEmptyCreatorOpsAggregate();
            creatorOpsByUser.set(creatorId, current);
            return current;
        };

        creatorRelationshipsSnap.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const creatorId = readString(raw.creatorId);
            if (!creatorId) {
                return;
            }

            const current = readCreatorOps(creatorId);
            if (raw.following === true) {
                current.followerCount += 1;
            }
            if (raw.favorited === true) {
                current.favoriteCount += 1;
            }
            if (raw.notificationsEnabled === true) {
                current.notificationsEnabledCount += 1;
            }
        });

        creatorSubscriptionsSnap.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const creatorId = readString(raw.creatorId);
            if (!creatorId) {
                return;
            }
            if (raw.status === "active") {
                readCreatorOps(creatorId).activeSubscribers += 1;
            }
        });

        creatorRequestsSnap.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const creatorId = readString(raw.creatorId);
            if (!creatorId) {
                return;
            }
            if (raw.status === "pending") {
                readCreatorOps(creatorId).openRequests += 1;
            }
        });

        creatorBookingsSnap.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const creatorId = readString(raw.creatorId);
            if (!creatorId) {
                return;
            }
            if (raw.status === "booked") {
                readCreatorOps(creatorId).bookedCalls += 1;
            }
        });

        creatorPayoutsSnap.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const creatorId = readString(raw.creatorId);
            if (!creatorId) {
                return;
            }
            if (raw.status === "pending") {
                const current = readCreatorOps(creatorId);
                current.pendingPayouts += 1;
                current.pendingCashoutGd += typeof raw.requestedGd === "number" ? Math.round(raw.requestedGd) : 0;
            }
        });

        creatorThreadsSnap.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const creatorId = readString(raw.creatorId);
            if (!creatorId) {
                return;
            }
            readCreatorOps(creatorId).openThreads += 1;
        });

        creatorAccrualsSnap.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const creatorId = readString(raw.creatorId);
            if (!creatorId) {
                return;
            }
            readCreatorOps(creatorId).totalAccruedGd += typeof raw.creatorShareGd === "number" ? Math.round(raw.creatorShareGd) : 0;
        });

        pendingCreatorDropsSnap.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const creatorId = readString(raw.submittedByCreatorId) || readString(raw.creatorId);
            if (!creatorId) {
                return;
            }
            readCreatorOps(creatorId).pendingDropSubmissions += 1;
        });

        const rosterUsers = allUsers
            .filter((entry) => isCreatorRole(entry.role) || (entry.role === "admin" && entry.email.toLowerCase() === PRIMARY_ROSTER_ADMIN_EMAIL))
            .sort((left, right) => {
                if (left.role !== right.role) {
                    return left.role === "admin" ? -1 : 1;
                }
                return left.displayName.localeCompare(right.displayName);
            });

        const creatorReviewQueue = queueSnapshot.docs
            .map((doc) => serializeQueueEntry(
                doc.data() as Record<string, unknown>,
                userMap.get(doc.id),
                creatorApplicationMap.get(doc.id),
            ))
            .filter((entry): entry is CreatorReviewQueueRosterEntry => Boolean(entry))
            .filter((entry) => entry.creatorReviewQueueVisible)
            .sort((left, right) => right.submittedAt - left.submittedAt || right.updatedAt - left.updatedAt);

        const hiddenQueueUserIds = new Set(creatorReviewQueue.map((entry) => entry.uid));
        const rosterUserIds = new Set(rosterUsers.map((entry) => entry.uid));
        const creatorUsers = rosterUsers.filter((entry) => entry.role === "creator");
        const searchResults = query.length >= 2
            ? allUsers
                .filter((entry) => entry.role === "user")
                .filter((entry) => !rosterUserIds.has(entry.uid))
                .filter((entry) => !hiddenQueueUserIds.has(entry.uid))
                .filter((entry) => entry.status !== "banned")
                .filter((entry) => matchesQuery(entry, query))
                .slice(0, 8)
            : [];

        const creatorOpsValues = creatorUsers.map((entry) => creatorOpsByUser.get(entry.uid) ?? buildEmptyCreatorOpsAggregate());
        const summary = {
            creatorCount: creatorUsers.length,
            verifiedCreatorCount: creatorUsers.filter((entry) => entry.isVerified).length,
            activeCreatorCount: creatorUsers.filter((entry) => entry.status === "active").length,
            totalFollowers: creatorOpsValues.reduce((sum, entry) => sum + entry.followerCount, 0),
            totalFavorites: creatorOpsValues.reduce((sum, entry) => sum + entry.favoriteCount, 0),
            totalAlertOptIns: creatorOpsValues.reduce((sum, entry) => sum + entry.notificationsEnabledCount, 0),
            activeSubscriptions: creatorOpsValues.reduce((sum, entry) => sum + entry.activeSubscribers, 0),
            openRequests: creatorOpsValues.reduce((sum, entry) => sum + entry.openRequests, 0),
            bookedCalls: creatorOpsValues.reduce((sum, entry) => sum + entry.bookedCalls, 0),
            pendingPayouts: creatorOpsValues.reduce((sum, entry) => sum + entry.pendingPayouts, 0),
            openThreads: creatorOpsValues.reduce((sum, entry) => sum + entry.openThreads, 0),
            pendingDropSubmissions: creatorOpsValues.reduce((sum, entry) => sum + entry.pendingDropSubmissions, 0),
            totalAccruedGd: creatorOpsValues.reduce((sum, entry) => sum + entry.totalAccruedGd, 0),
            pendingCashoutGd: creatorOpsValues.reduce((sum, entry) => sum + entry.pendingCashoutGd, 0),
            reviewQueueCount: creatorReviewQueue.length,
            readyForApprovalCount: creatorReviewQueue.filter((entry) => entry.queueBucket === "ready_for_approval").length,
            waitingOnIdCount: creatorReviewQueue.filter((entry) => entry.queueBucket === "waiting_on_id").length,
            waitingOnLegalCount: creatorReviewQueue.filter((entry) => entry.queueBucket === "waiting_on_legal").length,
            needsChangesCount: creatorReviewQueue.filter((entry) => entry.queueBucket === "needs_changes").length,
            rejectedCount: creatorReviewQueue.filter((entry) => entry.queueBucket === "rejected").length,
        };

        return NextResponse.json({
            success: true,
            rosterUsers,
            creatorReviewQueue,
            searchResults,
            creatorOpsByUser: Object.fromEntries(creatorOpsByUser),
            summary,
        });
    } catch (error) {
        return handleApiError(error, "Admin.Roster.GET");
    }
}
