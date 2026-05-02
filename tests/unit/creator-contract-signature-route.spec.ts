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

import { POST } from "@/app/api/creator/onboarding/contract-signature/route";

const AGREEMENT_ACKNOWLEDGEMENTS = {
    tools_activate_after_approval: true,
    access_may_pause_for_review: true,
    signature_record_stored: true,
    full_agreement_reviewed: true,
};

describe("POST /api/creator/onboarding/contract-signature", () => {
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
            introAcknowledgedAt: 1_710_000_000_050,
            legalStatus: "legal_sent",
            contractDocumentStatus: "contract_sent",
            contractVersion: "agreement_v2",
            agreementTemplateId: "creator_agreement_v2",
            agreementTitle: "Creator Agreement v2",
            agreementHash: "sha256:v2",
            agreementSource: "uploaded_pdf_snapshot",
            agreementDispatchId: "dispatch_v2",
            agreementDispatchStatus: "sent",
            creatorSignatureStatus: "signature_pending",
            adminSignatureStatus: "signature_pending",
            idVerificationStatus: "id_verified",
            idVerificationRequestedAt: 1_710_000_000_100,
            idVerificationSubmittedAt: 1_710_000_000_200,
            idVerificationReviewedAt: 1_710_000_000_300,
            segmentationStatus: "segment_unassigned",
            blockingReasons: ["awaiting_creator_contract_signature"],
            readyForApproval: false,
            creatorReviewQueueVisible: true,
        });
        mockState.documents.set("creator_agreement_templates/creator_agreement_v2", {
            templateId: "creator_agreement_v2",
            agreementVersion: "agreement_v2",
            agreementTitle: "Creator Agreement v2",
            agreementSource: "uploaded_pdf_snapshot",
            activeForNewCreators: true,
            pdfStoragePath: "creator-agreements/agreement_v2/source.pdf",
            agreementHash: "sha256:v2",
            summaryBullets: ["Version two summary"],
            createdAt: 1_710_000_000_000,
            createdByUid: "owner_1",
            activatedAt: 1_710_000_000_050,
            activatedByUid: "owner_1",
        });
    });

    it("records the creator signature and preserves the native contract audit trail", async () => {
        const request = new NextRequest("http://localhost/api/creator/onboarding/contract-signature", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "user-agent": "Vitest/creator-contract",
                "x-forwarded-for": "127.0.0.1",
            },
            body: JSON.stringify({
                signatureName: "Creator One",
                acknowledgementValues: AGREEMENT_ACKNOWLEDGEMENTS,
            }),
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            creatorApplication: expect.objectContaining({
                creatorSignatureStatus: "signature_signed",
                creatorContractSignedByName: "Creator One",
            }),
        });
        expect(mockState.documents.get("creator_onboarding/creator_1")).toMatchObject({
            creatorSignatureStatus: "signature_signed",
            creatorContractSignedByName: "Creator One",
            creatorContractSignedIp: "127.0.0.1",
            agreementHash: "sha256:v2",
            agreementDispatchId: "dispatch_v2",
        });
        expect(mockState.documents.get("creator_onboarding/creator_1/agreement_dispatches/dispatch_v2")).toMatchObject({
            status: "signed",
            agreementVersion: "agreement_v2",
            templateId: "creator_agreement_v2",
            agreementHash: "sha256:v2",
        });
        expect(mockState.documents.get("creator_onboarding/creator_1/agreement_signatures/creator_dispatch_v2")).toMatchObject({
            dispatchId: "dispatch_v2",
            userId: "creator_1",
            agreementVersion: "agreement_v2",
            templateId: "creator_agreement_v2",
            agreementHash: "sha256:v2",
            agreementSource: "uploaded_pdf_snapshot",
            pdfStoragePath: "creator-agreements/agreement_v2/source.pdf",
            signerUid: "creator_1",
            signerEmail: "creator@example.com",
            signerIp: "127.0.0.1",
            signerUserAgent: "Vitest/creator-contract",
            acknowledgementValues: expect.objectContaining(AGREEMENT_ACKNOWLEDGEMENTS),
        });
        const historyPath = Array.from(mockState.documents.keys()).find((path) => path.startsWith("creator_onboarding/creator_1/history/creator_contract_signed_"));
        expect(historyPath).toBeTruthy();
        expect(mockState.documents.get(historyPath!)).toMatchObject({
            metadata: expect.objectContaining({
                agreementVersion: "agreement_v2",
                agreementHash: "sha256:v2",
                templateId: "creator_agreement_v2",
                dispatchId: "dispatch_v2",
            }),
        });
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("creator_agreement_signed", expect.objectContaining({
            agreement_hash: "sha256:v2",
            dispatch_id: "dispatch_v2",
        }), "creator_1");
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("creator_contract_signed", expect.any(Object), "creator_1");
    });

    it("blocks signing when acknowledgements are incomplete", async () => {
        const request = new NextRequest("http://localhost/api/creator/onboarding/contract-signature", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                signatureName: "Creator One",
                acknowledgementValues: {
                    ...AGREEMENT_ACKNOWLEDGEMENTS,
                    full_agreement_reviewed: false,
                },
            }),
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload).toMatchObject({
            error: "Review and accept every agreement acknowledgement before signing.",
        });
    });

    it("blocks signing without an agreement hash", async () => {
        mockState.documents.set("creator_onboarding/creator_1", {
            ...(mockState.documents.get("creator_onboarding/creator_1") ?? {}),
            agreementHash: "",
        });

        const request = new NextRequest("http://localhost/api/creator/onboarding/contract-signature", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                signatureName: "Creator One",
                acknowledgementValues: AGREEMENT_ACKNOWLEDGEMENTS,
            }),
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(409);
        expect(payload).toMatchObject({
            error: "Agreement hash is missing.",
        });
    });

    it("blocks signing without an active dispatch", async () => {
        mockState.documents.set("creator_onboarding/creator_1", {
            ...(mockState.documents.get("creator_onboarding/creator_1") ?? {}),
            agreementDispatchId: "",
        });

        const request = new NextRequest("http://localhost/api/creator/onboarding/contract-signature", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                signatureName: "Creator One",
                acknowledgementValues: AGREEMENT_ACKNOWLEDGEMENTS,
            }),
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(409);
        expect(payload).toMatchObject({
            error: "No active agreement dispatch exists for this account.",
        });
    });

    it("blocks signing until identity verification is accepted", async () => {
        mockState.documents.set("creator_onboarding/creator_1", {
            ...(mockState.documents.get("creator_onboarding/creator_1") ?? {}),
            idVerificationStatus: "id_requested",
        });

        const request = new NextRequest("http://localhost/api/creator/onboarding/contract-signature", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                signatureName: "Creator One",
                acknowledgementValues: AGREEMENT_ACKNOWLEDGEMENTS,
            }),
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(409);
        expect(payload).toMatchObject({
            error: "Identity verification must be accepted before contract signing can continue.",
        });
    });
});
