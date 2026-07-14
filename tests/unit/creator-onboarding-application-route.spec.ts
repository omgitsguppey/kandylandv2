import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MockStoredDoc = Record<string, unknown>;
type MockDocRef = {
    path: string;
    get: () => Promise<{ exists: boolean; data: () => MockStoredDoc | undefined }>;
    collection: (name: string) => MockCollectionRef;
};
type MockCollectionRef = {
    path: string;
    doc: (id: string) => MockDocRef;
};

const mockState = vi.hoisted(() => {
    const documents = new Map<string, MockStoredDoc>();

    const buildCollectionRef = (path: string): MockCollectionRef => ({
        path,
        doc(id: string) {
            return buildDocRef(`${path}/${id}`);
        },
    });

    const buildDocRef = (path: string): MockDocRef => ({
        path,
        async get() {
            return {
                exists: documents.has(path),
                data: () => documents.get(path),
            };
        },
        collection(name: string) {
            return buildCollectionRef(`${path}/${name}`);
        },
    });

    const adminDb = {
        collection(name: string) {
            return buildCollectionRef(name);
        },
        runTransaction: vi.fn(async (callback: (transaction: {
            getAll: (...refs: MockDocRef[]) => Promise<Array<{ exists: boolean; data: () => MockStoredDoc | undefined }>>;
            set: (ref: MockDocRef, data: unknown, options?: { merge?: boolean }) => void;
        }) => Promise<unknown>) => {
            const transaction = {
                async getAll(...refs: MockDocRef[]) {
                    return refs.map((ref) => ({
                        exists: documents.has(ref.path),
                        data: () => documents.get(ref.path),
                    }));
                },
                set(ref: MockDocRef, data: unknown, options?: { merge?: boolean }) {
                    const current = options?.merge ? (documents.get(ref.path) ?? {}) : {};
                    documents.set(ref.path, {
                        ...current,
                        ...(data as MockStoredDoc),
                    });
                },
            };

            return callback(transaction);
        }),
    };

    return {
        adminDb,
        documents,
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        recordServerDiagnostic: vi.fn(async () => undefined),
        reset() {
            documents.clear();
            adminDb.runTransaction.mockClear();
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.recordServerDiagnostic.mockReset();
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

vi.mock("@/lib/server/server-diagnostics", () => ({
    recordServerDiagnostic: mockState.recordServerDiagnostic,
}));

vi.mock("@/lib/server/rate-limit", () => ({
    STRICT: {},
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
    withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

import { PUT } from "@/app/api/creator/onboarding/application/route";

describe("PUT /api/creator/onboarding/application", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "creator_1",
            email: "creator@example.com",
        });
        mockState.handleApiError.mockImplementation((error: Error) => NextResponse.json({
            error: error.message,
        }, { status: 500 }));

        mockState.documents.set("users/creator_1", {
            uid: "creator_1",
            email: "creator@example.com",
            displayName: "Creator One",
            username: "creator-one",
            role: "user",
            createdAt: 1_710_000_000_000,
            creatorApplication: {
                signupType: "creator",
                submissionStatus: "awaiting_manual_review",
                approvalStatus: "creator_pending",
                queuePosition: 1,
                onboardingStartedAt: 1_710_000_000_000,
                submittedAt: 1_710_000_000_000,
                onboardingSubmittedAt: 1_710_000_000_000,
                awaitingManualReviewAt: 1_710_000_000_000,
                updatedAt: 1_710_000_000_000,
                creatorDisplayName: "Creator One",
                creatorPrimaryPlatform: "TikTok",
                creatorContentFocus: "Original creator summary",
                bypassFanOnboarding: true,
                legalStatus: "legal_pending",
                idVerificationStatus: "id_requested",
                idVerificationRequestedAt: 1_710_000_000_100,
                segmentationStatus: "segment_unassigned",
                blockingReasons: ["awaiting_legal", "awaiting_id_submission", "awaiting_segment_assignment"],
                readyForApproval: false,
                creatorReviewQueueVisible: true,
            },
        });
        mockState.documents.set("creator_onboarding/creator_1", {
            userId: "creator_1",
            email: "creator@example.com",
            username: "creator-one",
            role: "user",
            sourceVersion: 1,
            signupType: "creator",
            submissionStatus: "awaiting_manual_review",
            approvalStatus: "creator_pending",
            queuePosition: 1,
            onboardingStartedAt: 1_710_000_000_000,
            submittedAt: 1_710_000_000_000,
            onboardingSubmittedAt: 1_710_000_000_000,
            awaitingManualReviewAt: 1_710_000_000_000,
            updatedAt: 1_710_000_000_000,
            creatorDisplayName: "Creator One",
            creatorPrimaryPlatform: "TikTok",
            creatorContentFocus: "Original creator summary",
            bypassFanOnboarding: true,
            legalStatus: "legal_pending",
            idVerificationStatus: "id_requested",
            idVerificationRequestedAt: 1_710_000_000_100,
            segmentationStatus: "segment_unassigned",
            blockingReasons: ["awaiting_legal", "awaiting_id_submission", "awaiting_segment_assignment"],
            readyForApproval: false,
            creatorReviewQueueVisible: true,
        });
    });

    it("updates the canonical onboarding record and mirrored creator projection", async () => {
        const request = new NextRequest("http://localhost/api/creator/onboarding/application", {
            method: "PUT",
            body: JSON.stringify({
                creatorDisplayName: "Creator Deluxe",
                creatorPrimaryPlatform: "YouTube",
                creatorContentFocus: "Updated creator summary for admin review",
            }),
        });

        const response = await PUT(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            creatorApplication: expect.objectContaining({
                creatorDisplayName: "Creator Deluxe",
                creatorPrimaryPlatform: "YouTube",
                creatorContentFocus: "Updated creator summary for admin review",
            }),
        });
        expect(mockState.documents.get("creator_onboarding/creator_1")).toMatchObject({
            creatorDisplayName: "Creator Deluxe",
            creatorPrimaryPlatform: "YouTube",
            creatorContentFocus: "Updated creator summary for admin review",
        });
        expect(mockState.documents.get("users/creator_1")).toMatchObject({
            creatorApplication: expect.objectContaining({
                creatorDisplayName: "Creator Deluxe",
                creatorPrimaryPlatform: "YouTube",
                creatorContentFocus: "Updated creator summary for admin review",
            }),
        });
        expect(mockState.documents.get("creator_review_queue/creator_1")).toMatchObject({
            creatorDisplayName: "Creator Deluxe",
            creatorPrimaryPlatform: "YouTube",
        });
    });

    it("blocks edits after approval", async () => {
        mockState.documents.set("creator_onboarding/creator_1", {
            ...(mockState.documents.get("creator_onboarding/creator_1") ?? {}),
            approvalStatus: "creator_approved",
        });

        const request = new NextRequest("http://localhost/api/creator/onboarding/application", {
            method: "PUT",
            body: JSON.stringify({
                creatorDisplayName: "Creator Deluxe",
                creatorPrimaryPlatform: "YouTube",
                creatorContentFocus: "Updated creator summary for admin review",
            }),
        });

        const response = await PUT(request);
        const payload = await response.json();

        expect(response.status).toBe(409);
        expect(payload).toMatchObject({
            code: "invalid_creator_request",
            retryable: false,
            error: "Approved creator applications must be managed through the standard creator profile tools.",
        });
        expect(mockState.recordServerDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
            message: "Creator application edit blocked after approval",
        }));
    });

    it("materializes a canonical onboarding record from a legacy projection before updating", async () => {
        mockState.documents.delete("creator_onboarding/creator_1");

        const request = new NextRequest("http://localhost/api/creator/onboarding/application", {
            method: "PUT",
            body: JSON.stringify({
                creatorDisplayName: "Legacy Creator",
                creatorPrimaryPlatform: "Instagram",
                creatorContentFocus: "Legacy creator application updated before approval",
            }),
        });

        const response = await PUT(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            creatorApplication: expect.objectContaining({
                creatorDisplayName: "Legacy Creator",
                creatorPrimaryPlatform: "Instagram",
            }),
        });
        expect(mockState.documents.get("creator_onboarding/creator_1")).toMatchObject({
            creatorDisplayName: "Legacy Creator",
            creatorPrimaryPlatform: "Instagram",
            creatorContentFocus: "Legacy creator application updated before approval",
        });
        expect(mockState.recordServerDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
            message: "Creator application edit materialized canonical onboarding from legacy projection",
        }));
    });

    it("rejects oversized JSON before onboarding mutation", async () => {
        const request = new NextRequest("http://localhost/api/creator/onboarding/application", {
            method: "PUT",
            headers: { "content-length": "64001" },
            body: "{}",
        });

        const response = await PUT(request);
        const payload = await response.json();

        expect(response.status).toBe(413);
        expect(payload).toMatchObject({
            success: false,
            errorCode: "payload_too_large",
            retryable: false,
        });
        expect(mockState.adminDb.runTransaction).not.toHaveBeenCalled();
        expect(mockState.recordServerDiagnostic).not.toHaveBeenCalled();
    });

    it("classifies malformed JSON without onboarding mutation", async () => {
        const request = new NextRequest("http://localhost/api/creator/onboarding/application", {
            method: "PUT",
            body: "{not-json",
        });

        const response = await PUT(request);
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload).toMatchObject({
            success: false,
            errorCode: "invalid_json",
            retryable: false,
        });
        expect(mockState.adminDb.runTransaction).not.toHaveBeenCalled();
    });
});
