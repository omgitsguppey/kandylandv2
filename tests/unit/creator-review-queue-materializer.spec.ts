import { beforeEach, describe, expect, it, vi } from "vitest";

type MockStoredDoc = Record<string, unknown>;

const mockState = vi.hoisted(() => {
  const documents = new Map<string, MockStoredDoc>();

  const readDoc = (path: string) => documents.get(path);

  const mergeDoc = (path: string, data: unknown) => {
    const current = documents.get(path) ?? {};
    documents.set(path, {
      ...current,
      ...(data as Record<string, unknown>),
    });
  };

  const buildDocRef = (path: string) => ({
    path,
    async get() {
      return {
        exists: documents.has(path),
        data: () => readDoc(path),
      };
    },
    async set(data: unknown, options?: { merge?: boolean }) {
      if (options?.merge) {
        mergeDoc(path, data);
        return;
      }
      documents.set(path, { ...(data as Record<string, unknown>) });
    },
    async delete() {
      documents.delete(path);
    },
  });

  const buildCollectionRef = (path: string) => ({
    path,
    doc(id: string) {
      return buildDocRef(`${path}/${id}`);
    },
  });

  return {
    documents,
    adminDb: {
      collection(name: string) {
        return buildCollectionRef(name);
      },
    },
    reset() {
      documents.clear();
    },
  };
});

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: mockState.adminDb,
}));

import { buildCreatorOnboardingCanonicalRecord } from "@/lib/creator-onboarding";
import {
  compareOnboardingToQueue,
  materializeCreatorReviewQueueEntry,
} from "@/lib/server/creator-review-queue";

function buildCanonical(source: Record<string, unknown> = {}) {
  return buildCreatorOnboardingCanonicalRecord({
    userId: "creator_1",
    email: "creator@example.com",
    username: "creator-one",
    displayName: "Creator One",
    photoURL: null,
    role: typeof source.role === "string" ? source.role : "user",
    createdAt: 1_710_000_000_000,
    queuePosition: 7,
    creatorDisplayName: "Creator One",
    creatorPrimaryPlatform: "TikTok",
    creatorContentFocus: "Pop culture",
    nowMs: 1_710_000_000_500,
    source: {
      submissionStatus: "awaiting_manual_review",
      approvalStatus: "creator_pending",
      legalStatus: "legal_pending",
      idVerificationStatus: "id_not_requested",
      segmentationStatus: "segment_unassigned",
      contractDocumentStatus: "contract_not_sent",
      creatorSignatureStatus: "signature_pending",
      adminSignatureStatus: "signature_pending",
      updatedAt: 1_710_000_000_500,
      submittedAt: 1_710_000_000_000,
      onboardingSubmittedAt: 1_710_000_000_000,
      awaitingManualReviewAt: 1_710_000_000_000,
      ...source,
    },
  });
}

async function setCanonical(source: Record<string, unknown>) {
  const canonical = buildCanonical(source);
  mockState.documents.set("creator_onboarding/creator_1", canonical);
  mockState.documents.set("users/creator_1", {
    uid: "creator_1",
    displayName: "Creator One",
    email: "creator@example.com",
    username: "creator-one",
    role: canonical.role,
  });
  return canonical;
}

describe("creator review queue materializer", () => {
  beforeEach(() => {
    mockState.reset();
  });

  it("creates a queue entry for a creator applicant while role remains user", async () => {
    await setCanonical({
      role: "user",
    });

    const entry = await materializeCreatorReviewQueueEntry("creator_1");

    expect(entry).toMatchObject({
      userId: "creator_1",
      role: "user",
      onboardingRefPath: "creator_onboarding/creator_1",
      creatorDisplayName: "Creator One",
      creatorPrimaryPlatform: "TikTok",
      creatorContentFocus: "Pop culture",
      queueBucket: "newest_submissions",
      queueMaterializedAt: expect.any(Number),
      sourceOnboardingUpdatedAt: 1_710_000_000_500,
      queueParityOk: true,
      queueParityDelta: [],
    });
    expect(mockState.documents.get("creator_review_queue/creator_1")).toMatchObject({
      userId: "creator_1",
      role: "user",
      queueBucket: "newest_submissions",
    });
  });

  it("updates the queue bucket when agreement is waiting on signatures", async () => {
    await setCanonical({
      introAcknowledgedAt: 1_710_000_000_100,
      idVerificationStatus: "id_verified",
      idVerificationReviewedAt: 1_710_000_000_200,
      segmentationStatus: "segment_assigned",
      segmentAssignedAt: 1_710_000_000_300,
      contractDocumentStatus: "contract_sent",
      legalStatus: "legal_sent",
    });

    await materializeCreatorReviewQueueEntry("creator_1");

    expect(mockState.documents.get("creator_review_queue/creator_1")).toMatchObject({
      queueBucket: "waiting_on_legal",
    });
  });

  it("updates the queue bucket when ID is submitted for review", async () => {
    await setCanonical({
      introAcknowledgedAt: 1_710_000_000_100,
      idVerificationStatus: "id_submitted",
      idVerificationSubmittedAt: 1_710_000_000_200,
    });

    await materializeCreatorReviewQueueEntry("creator_1");

    expect(mockState.documents.get("creator_review_queue/creator_1")).toMatchObject({
      queueBucket: "waiting_on_id",
      idVerificationStatus: "id_submitted",
    });
  });

  it("updates the queue bucket when a creator is ready for approval", async () => {
    await setCanonical({
      introAcknowledgedAt: 1_710_000_000_100,
      idVerificationStatus: "id_verified",
      idVerificationReviewedAt: 1_710_000_000_200,
      segmentationStatus: "segment_assigned",
      segmentAssignedAt: 1_710_000_000_300,
      contractDocumentStatus: "contract_sent",
      creatorSignatureStatus: "signature_signed",
      adminSignatureStatus: "signature_signed",
      legalStatus: "legal_signed",
      legallyClearedAt: 1_710_000_000_400,
    });

    await materializeCreatorReviewQueueEntry("creator_1");

    expect(mockState.documents.get("creator_review_queue/creator_1")).toMatchObject({
      queueBucket: "ready_for_approval",
      readyForApproval: true,
    });
  });

  it("moves approved creators to the approved bucket", async () => {
    await setCanonical({
      role: "creator",
      approvalStatus: "creator_approved",
      introAcknowledgedAt: 1_710_000_000_100,
      idVerificationStatus: "id_verified",
      segmentationStatus: "segment_assigned",
      contractDocumentStatus: "contract_sent",
      creatorSignatureStatus: "signature_signed",
      adminSignatureStatus: "signature_signed",
      legalStatus: "legal_signed",
    });

    await materializeCreatorReviewQueueEntry("creator_1");

    expect(mockState.documents.get("creator_review_queue/creator_1")).toMatchObject({
      role: "creator",
      approvalStatus: "creator_approved",
      queueBucket: "approved",
    });
  });

  it("detects stale queue projection parity deltas", async () => {
    await setCanonical({
      introAcknowledgedAt: 1_710_000_000_100,
      idVerificationStatus: "id_submitted",
    });
    await materializeCreatorReviewQueueEntry("creator_1");
    mockState.documents.set("creator_review_queue/creator_1", {
      ...mockState.documents.get("creator_review_queue/creator_1"),
      queueBucket: "approved",
    });

    const parity = await compareOnboardingToQueue("creator_1");

    expect(parity).toMatchObject({
      userId: "creator_1",
      onboardingExists: true,
      queueExists: true,
      queueParityOk: false,
    });
    expect(parity.queueParityDelta).toEqual(expect.arrayContaining([
      expect.objectContaining({
        field: "queueBucket",
        expected: "waiting_on_id",
        actual: "approved",
      }),
    ]));
  });
});
