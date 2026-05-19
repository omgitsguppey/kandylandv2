import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MockDoc = {
    id: string;
    data: () => Record<string, unknown>;
};

const mockState = vi.hoisted(() => {
    const usersDocs: MockDoc[] = [];
    const queueDocs: MockDoc[] = [];
    const emptyDocs: MockDoc[] = [];

    const makeDoc = (id: string, data: Record<string, unknown>): MockDoc => ({
        id,
        data: () => data,
    });

    const makeSnapshot = (docs: MockDoc[]) => ({
        docs,
        empty: docs.length === 0,
    });

    const makeCollection = (name: string) => {
        const query = {
            orderBy: () => query,
            where: () => query,
            limit: () => query,
            get: async () => {
                if (name === "users") {
                    return makeSnapshot(usersDocs);
                }
                if (name === "creator_review_queue") {
                    return makeSnapshot(queueDocs);
                }
                return makeSnapshot(emptyDocs);
            },
        };
        return query;
    };

    return {
        usersDocs,
        queueDocs,
        adminDb: {
            collection(name: string) {
                return makeCollection(name);
            },
        },
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        trackServerEvent: vi.fn(async () => undefined),
        recordServerDiagnostic: vi.fn(async () => undefined),
        ensureCreatorOnboardingSubmission: vi.fn(async (input: {
            userId: string;
            creatorDisplayName: string;
            email: string | null;
        }) => {
            queueDocs.push(makeDoc(input.userId, {
                userId: input.userId,
                creatorDisplayName: input.creatorDisplayName,
                displayName: "Legacy Creator",
                email: input.email || "",
                username: "legacy-creator",
                role: "user",
                queueBucket: "waiting_on_id",
                submissionStatus: "awaiting_manual_review",
                approvalStatus: "creator_pending",
                legalStatus: "legal_pending",
                idVerificationStatus: "id_not_requested",
                segmentationStatus: "segment_unassigned",
                blockingReasons: ["awaiting_legal", "awaiting_id_request", "awaiting_segment_assignment"],
                readyForApproval: false,
                creatorReviewQueueVisible: true,
                submittedAt: 1_710_000_000_000,
                updatedAt: 1_710_000_000_000,
            }));

            return {
                created: true,
            };
        }),
        makeDoc,
        reset() {
            usersDocs.length = 0;
            queueDocs.length = 0;
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.trackServerEvent.mockReset();
            this.recordServerDiagnostic.mockReset();
            this.ensureCreatorOnboardingSubmission.mockClear();
        },
    };
});

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/analytics", () => ({
    trackServerEvent: mockState.trackServerEvent,
}));

vi.mock("@/lib/server/server-diagnostics", () => ({
    recordServerDiagnostic: mockState.recordServerDiagnostic,
}));

vi.mock("@/lib/server/rate-limit", () => ({
    ADMIN: {},
}));

vi.mock("@/lib/creator-experiences", () => ({
    CREATOR_COLLECTIONS: {
        relationships: "creator_relationships",
        subscriptions: "creator_subscriptions",
        requests: "creator_custom_requests",
        bookings: "creator_call_bookings",
        payoutRequests: "creator_payout_requests",
        messageThreads: "creator_message_threads",
        ledgerAccruals: "creator_ledger_accruals",
    },
    isCreatorRole: (role: string) => role === "creator" || role === "admin",
}));

vi.mock("@/lib/server/creator-onboarding", () => ({
    CREATOR_REVIEW_QUEUE_COLLECTION: "creator_review_queue",
    ensureCreatorOnboardingSubmission: mockState.ensureCreatorOnboardingSubmission,
    isCreatorOwnerEmail: () => false,
}));

import { GET } from "@/app/api/admin/roster/route";

describe("GET /api/admin/roster", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "admin_1",
            role: "admin",
        });
        mockState.handleApiError.mockImplementation((error: unknown) => {
            throw error;
        });
        mockState.usersDocs.push(
            mockState.makeDoc("legacy_creator", {
                uid: "legacy_creator",
                displayName: "Legacy Creator",
                email: "legacy@example.com",
                username: "legacy-creator",
                role: "user",
                status: "active",
                createdAt: 1_710_000_000_000,
                creatorApplication: {
                    creatorDisplayName: "Legacy Creator",
                    submissionStatus: "awaiting_manual_review",
                    approvalStatus: "creator_pending",
                    legalStatus: "legal_pending",
                    idVerificationStatus: "id_not_requested",
                    segmentationStatus: "segment_unassigned",
                    queuePosition: 1234,
                    submittedAt: 1_710_000_000_000,
                    onboardingSubmittedAt: 1_710_000_000_000,
                    awaitingManualReviewAt: 1_710_000_000_000,
                    updatedAt: 1_710_000_000_000,
                    bypassFanOnboarding: true,
                    idDocuments: {
                        front: {
                            fileName: "front.png",
                            storagePath: "creator-onboarding/legacy_creator/id/front/front.png",
                            contentType: "image/png",
                            sizeBytes: 1234,
                            uploadedAt: 1_710_000_000_200,
                            uploadedByUid: "legacy_creator",
                        },
                        back: {
                            fileName: "back.png",
                            storagePath: "creator-onboarding/legacy_creator/id/back/back.png",
                            contentType: "image/png",
                            sizeBytes: 1234,
                            uploadedAt: 1_710_000_000_300,
                            uploadedByUid: "legacy_creator",
                        },
                    },
                },
            }),
            mockState.makeDoc("creator_live", {
                uid: "creator_live",
                displayName: "Live Creator",
                email: "creator@example.com",
                username: "live-creator",
                role: "creator",
                status: "active",
                createdAt: 1_709_000_000_000,
            }),
            mockState.makeDoc("search_candidate", {
                uid: "search_candidate",
                displayName: "Search Candidate",
                email: "candidate@example.com",
                username: "candidate",
                role: "user",
                status: "active",
                createdAt: 1_708_000_000_000,
            }),
        );
    });

    it("backfills missing creator review queue entries from persisted creator applications", async () => {
        const request = new NextRequest("http://localhost/api/admin/roster?q=legacy", {
            method: "GET",
        });

        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(mockState.ensureCreatorOnboardingSubmission).toHaveBeenCalledWith(expect.objectContaining({
            userId: "legacy_creator",
            creatorDisplayName: "Legacy Creator",
        }));
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("creator_admin_queue_materialized", expect.any(Object), "legacy_creator");
        expect(mockState.recordServerDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
            channel: "creator_onboarding",
            message: "Creator review queue was backfilled from a legacy creator projection",
        }));
        expect(payload.creatorReviewQueue).toHaveLength(1);
        expect(payload.creatorReviewQueue[0]).toMatchObject({
            uid: "legacy_creator",
            creatorDisplayName: "Legacy Creator",
            queueBucket: "waiting_on_id",
            idDocumentFrontFileName: "front.png",
            idDocumentBackFileName: "back.png",
            idDocumentCount: 2,
            primaryAction: "Waiting for intro",
            rosterBucket: "waiting",
            visibleStatusLabels: {
                idVerificationStatus: "ID not requested",
                legalStatus: "Legal not started",
            },
            normalizedProjectionDebug: {
                normalizedFromLegacy: true,
            },
        });
        expect(payload.summary).toMatchObject({
            reviewQueueCount: 1,
            waitingOnIdCount: 1,
        });
        expect(payload.searchResults).toHaveLength(0);
    });
});
