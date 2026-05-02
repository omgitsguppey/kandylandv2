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
        async get() {
            return {
                exists: documents.has(path),
                data: () => readDoc(path),
            };
        },
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

import {
    buildCreatorOnboardingHistoryEntry,
    ensureCreatorOnboardingSubmission,
} from "@/lib/server/creator-onboarding";

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
            creatorMonetizationGoals: ["paid_drops", "private_chat"],
            creatorPrimaryPlatform: "TikTok",
            creatorFollowerRange: "10k_50k",
            creatorPostingFrequency: "weekly",
            creatorContentFocus: "Pop culture",
            fansAlreadyAskForAccess: "yes",
            creatorRecommendedSetup: "timed_drops_private_chat",
            intakeVersion: "creator_intake_v1",
            intakeSubmittedAt: 1_710_000_000_500,
            intakeSource: "creator_site",
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
            creatorMonetizationGoals: ["paid_drops", "private_chat"],
            creatorPrimaryPlatform: "TikTok",
            creatorFollowerRange: "10k_50k",
            creatorPostingFrequency: "weekly",
            creatorContentFocus: "Pop culture",
            fansAlreadyAskForAccess: "yes",
            creatorRecommendedSetup: "timed_drops_private_chat",
            intakeVersion: "creator_intake_v1",
            creatorReviewQueueVisible: true,
            readyForApproval: false,
        });
        expect(mockState.documents.get("creator_onboarding/creator_1")).toBeTruthy();
        expect(mockState.documents.get("creator_review_queue/creator_1")).toMatchObject({
            userId: "creator_1",
            queueBucket: "newest_submissions",
            creatorReviewQueueVisible: true,
            creatorRecommendedSetup: "timed_drops_private_chat",
        });
        expect(mockState.documents.get("users/creator_1")).toMatchObject({
            creatorApplication: expect.objectContaining({
                submissionStatus: "awaiting_manual_review",
                approvalStatus: "creator_pending",
            }),
        });
        expect(mockState.documents.get("creator_onboarding/creator_1/history/onboarding_started")).toBeTruthy();
        expect(mockState.documents.get("creator_onboarding/creator_1/history/intake_started")).toBeTruthy();
        expect(mockState.documents.get("creator_onboarding/creator_1/history/intake_step_completed_monetization_goals")).toBeTruthy();
        expect(mockState.documents.get("creator_onboarding/creator_1/history/intake_submitted")).toBeTruthy();
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
            "creator_onboarding/creator_1/history/intake_started",
            "creator_onboarding/creator_1/history/intake_step_completed_audience_state",
            "creator_onboarding/creator_1/history/intake_step_completed_creator_agreement",
            "creator_onboarding/creator_1/history/intake_step_completed_monetization_goals",
            "creator_onboarding/creator_1/history/intake_step_completed_recommended_setup",
            "creator_onboarding/creator_1/history/intake_step_completed_submit_for_review",
            "creator_onboarding/creator_1/history/intake_submitted",
            "creator_onboarding/creator_1/history/onboarding_started",
            "creator_onboarding/creator_1/history/onboarding_submitted",
        ]);
    });

    it("builds deterministic history entries with actor markers and signature evidence", () => {
        const entry = buildCreatorOnboardingHistoryEntry({
            eventType: "creator_contract_signed",
            actor: {
                id: "creator_1",
                role: "creator",
                label: "Creator One",
                marker: {
                    actorType: "creator",
                    actorUid: "creator_1",
                    actorRole: "creator",
                    targetUserId: "creator_1",
                    targetCreatorId: "creator_1",
                    performedAs: "own_account",
                    surface: "creator_intake",
                    route: "/creators/waitlist",
                    actionKey: "creator_contract_signed",
                    occurredAt: "2026-05-02T00:00:00.000Z",
                    dedupeKey: "creator_contract_signed:creator_1:v2",
                    source: "creator_contract_signature_route",
                    actorClassificationReason: "Creator uid is present.",
                    unknownActorBlocked: false,
                },
            },
            timestamp: 1_710_000_000_000,
            summary: "Creator signed agreement",
            agreementVersion: "agreement_v2",
            agreementHash: "sha256:v2",
            ip: "127.0.0.1",
            userAgent: "Vitest",
        });

        expect(entry).toMatchObject({
            eventType: "creator_contract_signed",
            targetUserId: "creator_1",
            agreementVersion: "agreement_v2",
            agreementHash: "sha256:v2",
            ip: "127.0.0.1",
            userAgent: "Vitest",
            metadata: expect.objectContaining({
                actorMarkerPresent: true,
                performedAs: "own_account",
            }),
        });
    });
});
