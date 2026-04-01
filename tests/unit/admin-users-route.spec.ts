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
};

const mockState = vi.hoisted(() => {
    const documents = new Map<string, Record<string, unknown>>();

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
            getAll: (...refs: Array<MockDocRef>) => Promise<Array<{ exists: boolean; data: () => Record<string, unknown> | undefined }>>;
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

import { PUT } from "@/app/api/admin/users/route";

function seedCreatorApplicant(input: {
    userId: string;
    role?: "user" | "creator" | "admin";
    legalStatus: "legal_pending" | "legal_sent" | "legal_signed";
    idVerificationStatus: "id_not_requested" | "id_requested" | "id_submitted" | "id_verified" | "id_rejected";
    segmentationStatus: "segment_unassigned" | "segment_assigned";
    approvalStatus?: "creator_pending" | "creator_approved" | "creator_rejected" | "creator_needs_changes";
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
            legalStatus: input.legalStatus,
            idVerificationStatus: input.idVerificationStatus,
            segmentationStatus: input.segmentationStatus,
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
        });

        const existingProjection = mockState.documents.get("users/creator_ready")?.creatorApplication as Record<string, unknown>;
        const request = new NextRequest("http://localhost/api/admin/users", {
            method: "PUT",
            body: JSON.stringify({
                userId: "creator_ready",
                updates: {
                    creatorApplication: {
                        ...existingProjection,
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

    it("persists creator approval but blocks public role activation when prerequisites are incomplete", async () => {
        seedCreatorApplicant({
            userId: "creator_blocked",
            legalStatus: "legal_pending",
            idVerificationStatus: "id_requested",
            segmentationStatus: "segment_unassigned",
        });

        const existingProjection = mockState.documents.get("users/creator_blocked")?.creatorApplication as Record<string, unknown>;
        const request = new NextRequest("http://localhost/api/admin/users", {
            method: "PUT",
            body: JSON.stringify({
                userId: "creator_blocked",
                updates: {
                    role: "creator",
                    creatorApplication: {
                        ...existingProjection,
                        approvalStatus: "creator_approved",
                    },
                },
            }),
        });

        const response = await PUT(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({ success: true });
        expect(mockState.documents.get("users/creator_blocked")).toMatchObject({
            role: "user",
            creatorApplication: expect.objectContaining({
                approvalStatus: "creator_approved",
                blockingReasons: expect.arrayContaining([
                    "awaiting_legal",
                    "awaiting_id_submission",
                    "awaiting_segment_assignment",
                    "role_activation_blocked",
                ]),
            }),
        });
        expect(mockState.documents.get("creator_onboarding/creator_blocked")).toMatchObject({
            approvalStatus: "creator_approved",
            role: "user",
        });
        const historyPaths = Array.from(mockState.documents.keys()).filter((path) => path.startsWith("creator_onboarding/creator_blocked/history/"));
        expect(historyPaths.some((path) => path.includes("creator_approved_"))).toBe(true);
        expect(historyPaths.some((path) => path.includes("creator_role_activation_blocked_"))).toBe(true);
        expect(mockState.recordServerDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
            channel: "creator_onboarding",
            message: "Creator role activation blocked by onboarding prerequisites",
        }));
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
            error: "Creator role cannot be activated until legal, ID, segment, and approval requirements are complete.",
        });
        expect(mockState.documents.get("users/creator_direct_block")).toMatchObject({
            role: "user",
        });
        expect(mockState.recordServerDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
            channel: "creator_onboarding",
            message: "Creator role activation blocked by onboarding prerequisites",
        }));
    });

    it("allows direct creator role activation to sync the canonical record after approval prerequisites are complete", async () => {
        seedCreatorApplicant({
            userId: "creator_direct_ready",
            legalStatus: "legal_signed",
            idVerificationStatus: "id_verified",
            segmentationStatus: "segment_assigned",
            approvalStatus: "creator_approved",
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
});
