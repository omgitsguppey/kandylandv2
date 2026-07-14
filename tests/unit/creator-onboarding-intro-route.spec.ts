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
            getAll: (...refs: Array<MockDocRef>) => Promise<Array<{ exists: boolean; data: () => MockStoredDoc | undefined }>>;
            set: (ref: MockDocRef, data: unknown, options?: { merge?: boolean }) => void;
        }) => Promise<unknown>) => {
            const transaction = {
                async getAll(...refs: Array<MockDocRef>) {
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
        trackServerEvent: vi.fn(async () => undefined),
        recordServerDiagnostic: vi.fn(async () => undefined),
        reset() {
            documents.clear();
            adminDb.runTransaction.mockClear();
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.trackServerEvent.mockReset();
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

vi.mock("@/lib/server/rate-limit", () => ({
    STRICT: {},
}));

vi.mock("@/lib/server/analytics", () => ({
    trackServerEvent: mockState.trackServerEvent,
}));

vi.mock("@/lib/server/server-diagnostics", () => ({
    recordServerDiagnostic: mockState.recordServerDiagnostic,
}));

import { POST } from "@/app/api/creator/onboarding/intro/route";

describe("POST /api/creator/onboarding/intro", () => {
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
            creatorContentFocus: "Pop culture",
            bypassFanOnboarding: true,
            legalStatus: "legal_pending",
            contractDocumentStatus: "contract_not_sent",
            creatorSignatureStatus: "signature_pending",
            adminSignatureStatus: "signature_pending",
            idVerificationStatus: "id_not_requested",
            segmentationStatus: "segment_unassigned",
            blockingReasons: ["awaiting_intro_acknowledgement", "awaiting_id_request", "awaiting_legal"],
            readyForApproval: false,
            creatorReviewQueueVisible: true,
        });
    });

    it("records intro acknowledgment and opens the ID request step", async () => {
        const request = new NextRequest("http://localhost/api/creator/onboarding/intro", {
            method: "POST",
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            creatorApplication: expect.objectContaining({
                introAcknowledgedByUid: "creator_1",
                idVerificationStatus: "id_requested",
            }),
        });
        expect(mockState.documents.get("creator_onboarding/creator_1")).toMatchObject({
            introAcknowledgedByUid: "creator_1",
            introAcknowledgedByName: "Creator One",
            idVerificationStatus: "id_requested",
        });
        expect(mockState.documents.get("users/creator_1")).toMatchObject({
            creatorApplication: expect.objectContaining({
                introAcknowledgedByUid: "creator_1",
                idVerificationStatus: "id_requested",
            }),
        });
        const introHistoryPath = Array.from(mockState.documents.keys()).find((path) => path.startsWith("creator_onboarding/creator_1/history/intro_acknowledged_"));
        const requestHistoryPath = Array.from(mockState.documents.keys()).find((path) => path.startsWith("creator_onboarding/creator_1/history/id_requested_"));
        expect(introHistoryPath).toBeTruthy();
        expect(requestHistoryPath).toBeTruthy();
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("creator_intro_acknowledged", expect.any(Object), "creator_1");
    });

    it("returns a deterministic error when the canonical onboarding record is missing", async () => {
        mockState.documents.delete("creator_onboarding/creator_1");

        const request = new NextRequest("http://localhost/api/creator/onboarding/intro", {
            method: "POST",
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(409);
        expect(payload).toMatchObject({
            code: "invalid_creator_request",
            retryable: false,
            error: "Creator onboarding was not found for this account.",
        });
        expect(mockState.recordServerDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
            message: "Creator intro acknowledgment attempted without canonical onboarding record",
        }));
    });
});
