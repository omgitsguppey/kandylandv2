import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    buildCreatorOnboardingCanonicalRecord,
    buildCreatorOnboardingUserProjection,
} from "@/lib/creator-onboarding";

type MockDocRef = {
    path: string;
    get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
    update: (data: Record<string, unknown>) => Promise<void>;
    collection: (name: string) => MockCollectionRef;
};

type MockCollectionRef = {
    path: string;
    doc: (id: string) => MockDocRef;
    add: (data: Record<string, unknown>) => Promise<MockDocRef>;
};

function assertNoUndefinedDeep(value: unknown, path = "root") {
    if (value === undefined) {
        throw new Error(`Firestore write contains undefined at ${path}`);
    }

    if (Array.isArray(value)) {
        value.forEach((entry, index) => {
            assertNoUndefinedDeep(entry, `${path}[${index}]`);
        });
        return;
    }

    if (!value || typeof value !== "object") {
        return;
    }

    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
        assertNoUndefinedDeep(entry, `${path}.${key}`);
    });
}

const mockState = vi.hoisted(() => {
    const documents = new Map<string, Record<string, unknown>>();

    const buildCollectionRef = (path: string): MockCollectionRef => ({
        path,
        doc(id: string) {
            return buildDocRef(`${path}/${id}`);
        },
        async add(data: Record<string, unknown>) {
            const id = Math.random().toString(36).substring(2);
            const docRef = buildDocRef(`${path}/${id}`);
            await docRef.update(data);
            return docRef;
        }
    });

    const buildDocRef = (path: string): MockDocRef => ({
        path,
        async get() {
            return {
                exists: documents.has(path),
                data: () => documents.get(path),
            };
        },
        async update(data: Record<string, unknown>) {
            documents.set(path, {
                ...(documents.get(path) ?? {}),
                ...data,
            });
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
            get: (ref: MockDocRef) => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
            getAll: (...refs: Array<MockDocRef>) => Promise<Array<{ exists: boolean; data: () => Record<string, unknown> | undefined }>>;
            set: (ref: MockDocRef, data: unknown, options?: { merge?: boolean }) => void;
        }) => Promise<unknown>) => {
            const transaction = {
                async get(ref: MockDocRef) {
                    return {
                        exists: documents.has(ref.path),
                        data: () => documents.get(ref.path),
                    };
                },
                async getAll(...refs: Array<MockDocRef>) {
                    return refs.map((ref) => ({
                        exists: documents.has(ref.path),
                        data: () => documents.get(ref.path),
                    }));
                },
                set(ref: MockDocRef, data: unknown, options?: { merge?: boolean }) {
                    assertNoUndefinedDeep(data, ref.path);
                    const current = options?.merge ? (documents.get(ref.path) ?? {}) : {};
                    documents.set(ref.path, {
                        ...current,
                        ...(data as Record<string, unknown>),
                    });
                },
            };

            return callback(transaction);
        }),
    };

    return {
        documents,
        adminDb,
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        trackServerEvent: vi.fn(async () => undefined),
        recordServerDiagnostic: vi.fn(async () => undefined),
        recordRouteRuntimeSample: vi.fn(async () => undefined),
        reset() {
            documents.clear();
            adminDb.runTransaction.mockClear();
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.trackServerEvent.mockReset();
            this.recordServerDiagnostic.mockReset();
            this.recordRouteRuntimeSample.mockReset();
        },
    };
});

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/rate-limit", () => ({
    ADMIN: {},
}));

vi.mock("@/lib/tasks/task-catalog", () => ({
    BUILT_IN_DAILY_TASK_MAP: {},
}));

vi.mock("@/lib/server/drop-references", () => ({
    getDropReferenceMap: vi.fn(async () => ({})),
}));

vi.mock("@/lib/server/analytics", () => ({
    trackServerEvent: mockState.trackServerEvent,
}));

vi.mock("@/lib/gumdrop-ledger", () => ({
    normalizeGumdropBalance: vi.fn((value: unknown) => value),
}));

vi.mock("@/lib/server/gumdrop-ledger", () => ({
    buildCompletedGumdropTransaction: vi.fn(() => ({})),
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
}));

vi.mock("@/lib/server/creator-experiences", () => ({
    sanitizeCreatorRestrictionsUpdate: vi.fn((value: Record<string, unknown>) => value),
    sanitizeCreatorSettingsUpdate: vi.fn((value: Record<string, unknown>) => value),
}));

vi.mock("@/lib/server/server-diagnostics", () => ({
    recordServerDiagnostic: mockState.recordServerDiagnostic,
}));

vi.mock("@/lib/server/route-runtime-health", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/server/route-runtime-health")>();
    return {
        ...actual,
        recordRouteRuntimeSample: mockState.recordRouteRuntimeSample,
    };
});

import { POST, PUT } from "@/app/api/admin/users/route";

function seedCreatorApplicant(input: {
    userId: string;
    role?: "user" | "creator" | "admin";
    legalStatus: "legal_pending" | "legal_sent" | "legal_signed";
    idVerificationStatus: "id_not_requested" | "id_requested" | "id_submitted" | "id_verified" | "id_rejected";
    segmentationStatus: "segment_unassigned" | "segment_assigned";
    approvalStatus?: "creator_pending" | "creator_approved" | "creator_rejected" | "creator_needs_changes";
    introAcknowledgedAt?: number;
    contractDocumentStatus?: "contract_not_sent" | "contract_sent";
    creatorSignatureStatus?: "signature_pending" | "signature_signed";
    adminSignatureStatus?: "signature_pending" | "signature_signed";
    ownerOverrideActive?: boolean;
}) {
    const nowMs = 1_710_000_000_000;
    const canonical = buildCreatorOnboardingCanonicalRecord({
        userId: input.userId,
        email: `${input.userId}@example.com`,
        username: input.userId,
        displayName: "Creator Applicant",
        photoURL: null,
        role: input.role ?? "user",
        createdAt: nowMs - 10_000,
        queuePosition: 42,
        creatorDisplayName: "Creator Applicant",
        creatorPrimaryPlatform: "TikTok",
        creatorContentFocus: "Launch drops",
        nowMs,
        source: {
            signupType: "creator",
            submissionStatus: "awaiting_manual_review",
            approvalStatus: input.approvalStatus ?? "creator_pending",
            queuePosition: 42,
            onboardingStartedAt: nowMs - 8_000,
            submittedAt: nowMs - 7_000,
            onboardingSubmittedAt: nowMs - 7_000,
            awaitingManualReviewAt: nowMs - 6_000,
            updatedAt: nowMs - 5_000,
            creatorDisplayName: "Creator Applicant",
            creatorPrimaryPlatform: "TikTok",
            creatorContentFocus: "Launch drops",
            bypassFanOnboarding: true,
            introAcknowledgedAt: input.introAcknowledgedAt,
            legalStatus: input.legalStatus,
            contractDocumentStatus: input.contractDocumentStatus,
            creatorSignatureStatus: input.creatorSignatureStatus,
            adminSignatureStatus: input.adminSignatureStatus,
            idVerificationStatus: input.idVerificationStatus,
            segmentationStatus: input.segmentationStatus,
            ownerOverrideActive: input.ownerOverrideActive,
        },
    });

    mockState.documents.set(`users/${input.userId}`, {
        uid: input.userId,
        email: `${input.userId}@example.com`,
        displayName: "Creator Applicant",
        username: input.userId,
        role: input.role ?? "user",
        createdAt: nowMs - 10_000,
        creatorApplication: buildCreatorOnboardingUserProjection(canonical),
    });
    mockState.documents.set(`creator_onboarding/${input.userId}`, canonical);
    mockState.documents.set(`creator_review_queue/${input.userId}`, {
        userId: input.userId,
        approvalStatus: canonical.approvalStatus,
        role: canonical.role,
    });
}

describe("PUT /api/admin/users", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "admin_1",
            email: "admin@example.com",
            role: "admin",
        });
        mockState.handleApiError.mockImplementation((error: Error) => NextResponse.json({
            error: error.message,
        }, { status: 500 }));
    });

    it("approves a creator canonically and activates the creator role only when prerequisites are satisfied", async () => {
        seedCreatorApplicant({
            userId: "creator_ready",
            legalStatus: "legal_signed",
            idVerificationStatus: "id_verified",
            segmentationStatus: "segment_assigned",
            introAcknowledgedAt: 1_710_000_000_100,
        });

        const request = new NextRequest("http://localhost/api/admin/users", {
            method: "PUT",
            body: JSON.stringify({
                userId: "creator_ready",
                updates: {
                    creatorApplication: {
                        approvalStatus: "creator_approved",
                    },
                },
            }),
        });

        const response = await PUT(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({ success: true });
        expect(mockState.documents.get("users/creator_ready")).toMatchObject({
            role: "creator",
            creatorApplication: expect.objectContaining({
                approvalStatus: "creator_approved",
            }),
        });
        expect(mockState.documents.get("creator_onboarding/creator_ready")).toMatchObject({
            approvalStatus: "creator_approved",
            role: "creator",
            creatorReviewQueueVisible: false,
        });
        const historyPaths = Array.from(mockState.documents.keys()).filter((path) => path.startsWith("creator_onboarding/creator_ready/history/"));
        expect(historyPaths.some((path) => path.includes("creator_approved_"))).toBe(true);
        expect(historyPaths.some((path) => path.includes("creator_role_activated_"))).toBe(true);
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("creator_approved", expect.any(Object), "creator_ready");
        expect(mockState.recordServerDiagnostic).not.toHaveBeenCalled();
    });

    it("blocks creator approval when prerequisites are incomplete", async () => {
        seedCreatorApplicant({
            userId: "creator_blocked",
            legalStatus: "legal_pending",
            idVerificationStatus: "id_requested",
            segmentationStatus: "segment_unassigned",
        });

        const request = new NextRequest("http://localhost/api/admin/users", {
            method: "PUT",
            body: JSON.stringify({
                userId: "creator_blocked",
                updates: {
                    role: "creator",
                    creatorApplication: {
                        approvalStatus: "creator_approved",
                    },
                },
            }),
        });

        const response = await PUT(request);
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(mockState.documents.get("users/creator_blocked")).toMatchObject({
            role: "user",
            creatorApplication: expect.objectContaining({
                approvalStatus: "creator_pending",
            }),
        });
        expect(mockState.documents.get("creator_onboarding/creator_blocked")).toMatchObject({
            approvalStatus: "creator_pending",
            role: "user",
        });
        expect(payload).toMatchObject({
            error: "Creator approval requires intro acknowledgment, accepted identity verification, and both agreement signatures unless owner override is active.",
        });
    });

    it("rejects direct creator role activation when canonical onboarding prerequisites are incomplete", async () => {
        seedCreatorApplicant({
            userId: "creator_direct_block",
            legalStatus: "legal_pending",
            idVerificationStatus: "id_requested",
            segmentationStatus: "segment_unassigned",
        });

        const request = new NextRequest("http://localhost/api/admin/users", {
            method: "PUT",
            body: JSON.stringify({
                userId: "creator_direct_block",
                updates: {
                    role: "creator",
                },
            }),
        });

        const response = await PUT(request);
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload).toMatchObject({
            code: "invalid_admin_request",
            error: "Creator role cannot be activated until intro acknowledgment, ID verification, and agreement signatures are complete.",
        });
        expect(mockState.documents.get("users/creator_direct_block")).toMatchObject({
            role: "user",
        });
        expect(mockState.recordServerDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
            channel: "creator_onboarding",
            message: "Creator role activation blocked by onboarding prerequisites",
        }));
    });

    it.each([
        ["PUT", PUT],
        ["POST", POST],
    ])("returns a typed 400 when %s receives JSON null", async (method, handler) => {
        const response = await handler(new NextRequest("http://localhost/api/admin/users", {
            method,
            body: "null",
        }));
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload).toMatchObject({
            code: "invalid_admin_request",
            error: "Request body must be a JSON object",
        });
        expect(mockState.handleApiError).not.toHaveBeenCalled();
    });

    it("blocks non-owner admins from granting admin access", async () => {
        seedCreatorApplicant({
            userId: "creator_admin_blocked",
            legalStatus: "legal_signed",
            idVerificationStatus: "id_verified",
            segmentationStatus: "segment_assigned",
            approvalStatus: "creator_approved",
            introAcknowledgedAt: 1_710_000_000_100,
        });

        const request = new NextRequest("http://localhost/api/admin/users", {
            method: "PUT",
            body: JSON.stringify({
                userId: "creator_admin_blocked",
                updates: {
                    role: "admin",
                },
            }),
        });

        const response = await PUT(request);
        const payload = await response.json();

        expect(response.status).toBe(403);
        expect(payload).toMatchObject({
            error: "Only the owner admin can grant admin access.",
        });
        expect(mockState.documents.get("users/creator_admin_blocked")).toMatchObject({
            role: "user",
        });
    });

    it("allows direct creator role activation to sync the canonical record after approval prerequisites are complete", async () => {
        seedCreatorApplicant({
            userId: "creator_direct_ready",
            legalStatus: "legal_signed",
            idVerificationStatus: "id_verified",
            segmentationStatus: "segment_assigned",
            approvalStatus: "creator_approved",
            introAcknowledgedAt: 1_710_000_000_100,
        });

        const request = new NextRequest("http://localhost/api/admin/users", {
            method: "PUT",
            body: JSON.stringify({
                userId: "creator_direct_ready",
                updates: {
                    role: "creator",
                },
            }),
        });

        const response = await PUT(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({ success: true });
        expect(mockState.documents.get("users/creator_direct_ready")).toMatchObject({
            role: "creator",
        });
        expect(mockState.documents.get("creator_onboarding/creator_direct_ready")).toMatchObject({
            role: "creator",
            creatorReviewQueueVisible: false,
        });
        const historyPaths = Array.from(mockState.documents.keys()).filter((path) => path.startsWith("creator_onboarding/creator_direct_ready/history/"));
        expect(historyPaths.some((path) => path.includes("creator_role_activated_"))).toBe(true);
    });

    it("tracks legal, id, and needs-changes transitions canonically for admin review actions", async () => {
        seedCreatorApplicant({
            userId: "creator_review_updates",
            legalStatus: "legal_pending",
            idVerificationStatus: "id_not_requested",
            segmentationStatus: "segment_unassigned",
        });

        const request = new NextRequest("http://localhost/api/admin/users", {
            method: "PUT",
            body: JSON.stringify({
                userId: "creator_review_updates",
                updates: {
                    creatorApplication: {
                        legalStatus: "legal_sent",
                        idVerificationStatus: "id_requested",
                        approvalStatus: "creator_needs_changes",
                    },
                },
            }),
        });

        const response = await PUT(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({ success: true });
        expect(mockState.documents.get("users/creator_review_updates")).toMatchObject({
            creatorApplication: expect.objectContaining({
                legalStatus: "legal_sent",
                idVerificationStatus: "id_requested",
                approvalStatus: "creator_needs_changes",
                legalDocumentSentAt: expect.any(Number),
                idVerificationRequestedAt: expect.any(Number),
            }),
        });
        const historyPaths = Array.from(mockState.documents.keys()).filter((path) => path.startsWith("creator_onboarding/creator_review_updates/history/"));
        expect(historyPaths.some((path) => path.includes("legal_sent_"))).toBe(true);
        expect(historyPaths.some((path) => path.includes("id_requested_"))).toBe(true);
        expect(historyPaths.some((path) => path.includes("creator_needs_changes_"))).toBe(true);
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("creator_legal_sent", expect.any(Object), "creator_review_updates");
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("creator_id_requested", expect.any(Object), "creator_review_updates");
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("creator_needs_changes", expect.any(Object), "creator_review_updates");
    });

    it("records segment assignment and owner override lifecycle signals when those states change", async () => {
        seedCreatorApplicant({
            userId: "creator_override_case",
            legalStatus: "legal_sent",
            idVerificationStatus: "id_submitted",
            segmentationStatus: "segment_unassigned",
        });
        mockState.guardApiRequest.mockResolvedValue({
            uid: "owner_1",
            email: "uylusjohnson@gmail.com",
            role: "admin",
        });

        const existingProjection = mockState.documents.get("users/creator_override_case")?.creatorApplication as Record<string, unknown>;
        const request = new NextRequest("http://localhost/api/admin/users", {
            method: "PUT",
            body: JSON.stringify({
                userId: "creator_override_case",
                updates: {
                    creatorApplication: {
                        ...existingProjection,
                        segmentationStatus: "segment_assigned",
                        segmentLabel: "Priority",
                        ownerOverrideActive: true,
                        ownerOverrideReason: "Manual legal clearance",
                    },
                },
            }),
        });

        const response = await PUT(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({ success: true });
        const historyPaths = Array.from(mockState.documents.keys()).filter((path) => path.startsWith("creator_onboarding/creator_override_case/history/"));
        expect(historyPaths.some((path) => path.includes("creator_segment_assigned_"))).toBe(true);
        expect(historyPaths.some((path) => path.includes("owner_override_applied_"))).toBe(true);
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("creator_segment_assigned", expect.any(Object), "creator_override_case");
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("owner_override_applied", expect.any(Object), "creator_override_case");
    });

    it("tracks creator rejection canonically without activating creator tools", async () => {
        seedCreatorApplicant({
            userId: "creator_rejected_case",
            legalStatus: "legal_signed",
            idVerificationStatus: "id_verified",
            segmentationStatus: "segment_assigned",
        });

        const existingProjection = mockState.documents.get("users/creator_rejected_case")?.creatorApplication as Record<string, unknown>;
        const request = new NextRequest("http://localhost/api/admin/users", {
            method: "PUT",
            body: JSON.stringify({
                userId: "creator_rejected_case",
                updates: {
                    creatorApplication: {
                        ...existingProjection,
                        approvalStatus: "creator_rejected",
                    },
                },
            }),
        });

        const response = await PUT(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({ success: true });
        expect(mockState.documents.get("users/creator_rejected_case")).toMatchObject({
            role: "user",
            creatorApplication: expect.objectContaining({
                approvalStatus: "creator_rejected",
                blockingReasons: expect.arrayContaining(["approval_rejected"]),
            }),
        });
        const historyPaths = Array.from(mockState.documents.keys()).filter((path) => path.startsWith("creator_onboarding/creator_rejected_case/history/"));
        expect(historyPaths.some((path) => path.includes("creator_rejected_"))).toBe(true);
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("creator_rejected", expect.any(Object), "creator_rejected_case");
    });

    it("saves the full creator intake payload without leaking undefined fields into Firestore writes", async () => {
        seedCreatorApplicant({
            userId: "creator_full_save",
            legalStatus: "legal_sent",
            idVerificationStatus: "id_submitted",
            segmentationStatus: "segment_unassigned",
        });

        const existingProjection = mockState.documents.get("users/creator_full_save")?.creatorApplication as Record<string, unknown>;
        const request = new NextRequest("http://localhost/api/admin/users", {
            method: "PUT",
            body: JSON.stringify({
                userId: "creator_full_save",
                updates: {
                    creatorApplication: {
                        ...existingProjection,
                        approvalStatus: "creator_needs_changes",
                        adminNotes: "Need a clearer legal packet acknowledgment before approval.",
                    },
                },
            }),
        });

        const response = await PUT(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({ success: true });
        expect(mockState.documents.get("users/creator_full_save")).toMatchObject({
            creatorApplication: expect.objectContaining({
                approvalStatus: "creator_needs_changes",
                adminNotes: "Need a clearer legal packet acknowledgment before approval.",
            }),
        });
        expect(mockState.documents.get("creator_onboarding/creator_full_save")).toMatchObject({
            approvalStatus: "creator_needs_changes",
            adminNotes: "Need a clearer legal packet acknowledgment before approval.",
        });
    });

    it("rejects oversized updates before any user or onboarding mutation", async () => {
        const request = new NextRequest("http://localhost/api/admin/users", {
            method: "PUT",
            body: JSON.stringify({
                userId: "oversized_target",
                updates: {
                    status: "active",
                    padding: "x".repeat(64_000),
                },
            }),
        });

        const response = await PUT(request);
        const payload = await response.json();

        expect(response.status).toBe(413);
        expect(payload).toMatchObject({
            success: false,
            code: "payload_too_large",
            retryable: false,
        });
        expect(mockState.documents.has("users/oversized_target")).toBe(false);
        expect(mockState.documents.has("creator_onboarding/oversized_target")).toBe(false);
    });
});
