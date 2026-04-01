import { beforeEach, describe, expect, it, vi } from "vitest";

type MockStoredDoc = Record<string, unknown>;

const mockState = vi.hoisted(() => {
    const documents = new Map<string, MockStoredDoc>();

    const readDoc = (path: string) => documents.get(path);

    const mergeDoc = (path: string, data: unknown) => {
        const current = documents.get(path) ?? {};
        const next = {
            ...current,
            ...(data as Record<string, unknown>),
        };
        documents.set(path, next);
    };

    const buildDocRef = (path: string) => ({
        path,
        collection(name: string) {
            return buildCollectionRef(`${path}/${name}`);
        },
    });

    const buildCollectionRef = (path: string) => ({
        path,
        doc(id?: string) {
            return buildDocRef(id ? `${path}/${id}` : `${path}/auto`);
        },
    });

    const adminDb = {
        collection(name: string) {
            return buildCollectionRef(name);
        },
        runTransaction: vi.fn(async (callback: (transaction: {
            getAll: (...refs: Array<{ path: string }>) => Promise<Array<{ exists: boolean; data: () => MockStoredDoc | undefined }>>;
            set: (ref: { path: string }, data: unknown, options?: { merge?: boolean }) => void;
        }) => Promise<unknown>) => {
            const transaction = {
                async getAll(...refs: Array<{ path: string }>) {
                    return refs.map((ref) => ({
                        exists: documents.has(ref.path),
                        data: () => readDoc(ref.path),
                    }));
                },
                set(ref: { path: string }, data: unknown, options?: { merge?: boolean }) {
                    if (options?.merge) {
                        mergeDoc(ref.path, data);
                        return;
                    }

                    documents.set(ref.path, { ...(data as Record<string, unknown>) });
                },
            };

            return callback(transaction);
        }),
    };

    return {
        adminDb,
        documents,
        reset() {
            documents.clear();
            adminDb.runTransaction.mockClear();
        },
    };
});

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

import { ensureCreatorOnboardingSubmission } from "@/lib/server/creator-onboarding";

describe("ensureCreatorOnboardingSubmission", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.documents.set("users/creator_1", {
            uid: "creator_1",
            email: "creator@example.com",
            displayName: "Creator Example",
            username: "creator-example",
            role: "user",
            createdAt: 1_710_000_000_000,
        });
    });

    it("creates the canonical onboarding record, queue record, and user projection together", async () => {
        const result = await ensureCreatorOnboardingSubmission({
            userId: "creator_1",
            email: "creator@example.com",
            displayName: "Creator Example",
            username: "creator-example",
            role: "user",
            creatorDisplayName: "Creator Example",
            creatorPrimaryPlatform: "TikTok",
            creatorContentFocus: "Pop culture",
            nowMs: 1_710_000_000_500,
        });

        expect(result.created).toBe(true);
        expect(result.creatorApplication).toMatchObject({
            submissionStatus: "awaiting_manual_review",
            approvalStatus: "creator_pending",
            legalStatus: "legal_pending",
            idVerificationStatus: "id_not_requested",
            segmentationStatus: "segment_unassigned",
            creatorDisplayName: "Creator Example",
            creatorPrimaryPlatform: "TikTok",
            creatorContentFocus: "Pop culture",
            creatorReviewQueueVisible: true,
            readyForApproval: false,
        });
        expect(mockState.documents.get("creator_onboarding/creator_1")).toBeTruthy();
        expect(mockState.documents.get("creator_review_queue/creator_1")).toMatchObject({
            userId: "creator_1",
            queueBucket: "waiting_on_id",
            creatorReviewQueueVisible: true,
        });
        expect(mockState.documents.get("users/creator_1")).toMatchObject({
            creatorApplication: expect.objectContaining({
                submissionStatus: "awaiting_manual_review",
                approvalStatus: "creator_pending",
            }),
        });
        expect(mockState.documents.get("creator_onboarding/creator_1/history/onboarding_started")).toBeTruthy();
        expect(mockState.documents.get("creator_onboarding/creator_1/history/onboarding_submitted")).toBeTruthy();
        expect(mockState.documents.get("creator_onboarding/creator_1/history/awaiting_manual_review")).toBeTruthy();
        expect(mockState.documents.get("creator_onboarding/creator_1/history/admin_queue_materialized")).toBeTruthy();
    });

    it("is idempotent for repeat submissions and keeps a stable queue record", async () => {
        const first = await ensureCreatorOnboardingSubmission({
            userId: "creator_1",
            email: "creator@example.com",
            displayName: "Creator Example",
            username: "creator-example",
            role: "user",
            creatorDisplayName: "Creator Example",
            nowMs: 1_710_000_000_500,
        });

        const second = await ensureCreatorOnboardingSubmission({
            userId: "creator_1",
            email: "creator@example.com",
            displayName: "Creator Example",
            username: "creator-example",
            role: "user",
            creatorDisplayName: "Creator Example",
            creatorPrimaryPlatform: "Instagram",
            nowMs: 1_710_000_001_000,
        });

        expect(first.creatorApplication.queuePosition).toBe(second.creatorApplication.queuePosition);
        expect(second.created).toBe(false);
        expect(mockState.documents.get("creator_review_queue/creator_1")).toMatchObject({
            userId: "creator_1",
            creatorDisplayName: "Creator Example",
        });
        const historyPaths = Array.from(mockState.documents.keys()).filter((path) => path.startsWith("creator_onboarding/creator_1/history/"));
        expect(historyPaths.sort()).toEqual([
            "creator_onboarding/creator_1/history/admin_queue_materialized",
            "creator_onboarding/creator_1/history/awaiting_manual_review",
            "creator_onboarding/creator_1/history/onboarding_started",
            "creator_onboarding/creator_1/history/onboarding_submitted",
        ]);
    });
});
