import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildCreatorOnboardingCanonicalRecord } from "@/lib/creator-onboarding";

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

function assertNoUndefinedDeep(value: unknown, path = "root") {
  if (value === undefined) {
    throw new Error(`Firestore write contains undefined at ${path}`);
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoUndefinedDeep(entry, `${path}[${index}]`));
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
  const documents = new Map<string, MockStoredDoc>();
  const activeTemplate = {
    templateId: "template_v1",
    agreementVersion: "v1",
    agreementTitle: "Creator Agreement v1",
    agreementSource: "native_full_text" as const,
    activeForNewCreators: true,
    agreementHash: "sha256:v1",
    summaryBullets: ["Summary"],
    createdAt: 1_710_000_000_000,
    createdByUid: "owner_1",
    activatedAt: 1_710_000_000_000,
    activatedByUid: "owner_1",
  };

  class MockAuthError extends Error {
    status: number;
    resource?: string;

    constructor(message: string, status: number, resource?: string) {
      super(message);
      this.name = "AuthError";
      this.status = status;
      this.resource = resource;
    }
  }

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
          assertNoUndefinedDeep(data, ref.path);
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
    documents,
    activeTemplate,
    adminDb,
    AuthError: MockAuthError,
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn((error: Error & { status?: number }) => NextResponse.json({
      error: error.message,
    }, { status: error.status ?? 500 })),
    trackServerEvent: vi.fn(async () => undefined),
    sendCreatorAgreementDispatch: vi.fn(async () => ({
      template: activeTemplate,
      dispatch: {
        dispatchId: "dispatch_1",
        userId: "creator_1",
        agreementVersion: "v1",
        templateId: "template_v1",
        agreementHash: "sha256:v1",
        sentAt: 1_710_000_010_000,
        sentByUid: "admin_1",
        deliveryMethod: "in_app",
        status: "sent",
      },
      before: {
        userId: "creator_1",
        sourceVersion: 1,
      },
      after: {
        userId: "creator_1",
        sourceVersion: 2,
        signupType: "creator",
        submissionStatus: "awaiting_manual_review",
        approvalStatus: "creator_pending",
        queuePosition: 1,
        onboardingStartedAt: 1_710_000_000_000,
        submittedAt: 1_710_000_000_000,
        onboardingSubmittedAt: 1_710_000_000_000,
        awaitingManualReviewAt: 1_710_000_000_000,
        updatedAt: 1_710_000_010_000,
        creatorDisplayName: "Creator One",
        bypassFanOnboarding: true,
        introAcknowledgedAt: 1_710_000_000_100,
        legalStatus: "legal_sent",
        contractDocumentStatus: "contract_sent",
        creatorSignatureStatus: "signature_pending",
        adminSignatureStatus: "signature_pending",
        idVerificationStatus: "id_not_requested",
        segmentationStatus: "segment_unassigned",
        blockingReasons: [],
        readyForApproval: false,
        creatorReviewQueueVisible: true,
        email: "creator@example.com",
        role: "user",
        createdAt: 1_710_000_000_000,
        photoURL: null,
      },
    })),
    countersignCreatorAgreementDispatch: vi.fn(async () => ({
      template: activeTemplate,
      dispatch: {
        dispatchId: "dispatch_1",
        userId: "creator_1",
        agreementVersion: "v1",
        templateId: "template_v1",
        agreementHash: "sha256:v1",
        sentAt: 1_710_000_010_000,
        sentByUid: "admin_1",
        deliveryMethod: "in_app",
        status: "signed",
      },
      signature: null,
      before: {
        userId: "creator_1",
        sourceVersion: 1,
      },
      after: {
        userId: "creator_1",
        sourceVersion: 2,
        signupType: "creator",
        submissionStatus: "awaiting_manual_review",
        approvalStatus: "creator_pending",
        queuePosition: 1,
        onboardingStartedAt: 1_710_000_000_000,
        submittedAt: 1_710_000_000_000,
        onboardingSubmittedAt: 1_710_000_000_000,
        awaitingManualReviewAt: 1_710_000_000_000,
        updatedAt: 1_710_000_010_000,
        creatorDisplayName: "Creator One",
        bypassFanOnboarding: true,
        introAcknowledgedAt: 1_710_000_000_100,
        legalStatus: "legal_signed",
        contractDocumentStatus: "contract_sent",
        creatorSignatureStatus: "signature_signed",
        adminSignatureStatus: "signature_signed",
        idVerificationStatus: "id_verified",
        segmentationStatus: "segment_unassigned",
        blockingReasons: [],
        readyForApproval: true,
        creatorReviewQueueVisible: true,
        email: "creator@example.com",
        role: "user",
        createdAt: 1_710_000_000_000,
        photoURL: null,
      },
    })),
    isOwner: true,
    reset() {
      documents.clear();
      adminDb.runTransaction.mockClear();
      this.guardApiRequest.mockReset();
      this.handleApiError.mockClear();
      this.trackServerEvent.mockClear();
      this.sendCreatorAgreementDispatch.mockClear();
      this.countersignCreatorAgreementDispatch.mockClear();
      this.isOwner = true;
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
  AuthError: mockState.AuthError,
  handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  ADMIN: {},
}));

vi.mock("@/lib/server/analytics", () => ({
  trackServerEvent: mockState.trackServerEvent,
}));

vi.mock("@/lib/creator-admin", () => ({
  PRIMARY_CREATOR_OWNER_EMAIL: "owner@example.com",
  isCreatorOwnerEmail: () => mockState.isOwner,
}));

vi.mock("@/lib/server/creator-agreement-documents", () => ({
  sendCreatorAgreementDispatch: mockState.sendCreatorAgreementDispatch,
  countersignCreatorAgreementDispatch: mockState.countersignCreatorAgreementDispatch,
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

import { POST } from "@/app/api/admin/creators/[userId]/action/route";

const NOW_MS = 1_710_000_000_000;

function seedCreatorApplicant(input: {
  userId?: string;
  ready?: boolean;
  idStatus?: "id_not_requested" | "id_requested" | "id_submitted" | "id_verified" | "id_rejected";
  approvalStatus?: "creator_pending" | "creator_approved" | "creator_rejected" | "creator_needs_changes";
  role?: "user" | "creator" | "admin";
  ownerOverrideActive?: boolean;
}) {
  const userId = input.userId ?? "creator_1";
  const ready = input.ready === true;
  const canonical = buildCreatorOnboardingCanonicalRecord({
    userId,
    email: `${userId}@example.com`,
    username: userId,
    displayName: "Creator One",
    photoURL: null,
    role: input.role ?? "user",
    createdAt: NOW_MS,
    sourceVersion: 1,
    queuePosition: 1,
    creatorDisplayName: "Creator One",
    creatorPrimaryPlatform: "TikTok",
    creatorContentFocus: "Style",
    nowMs: NOW_MS,
    source: {
      userId,
      email: `${userId}@example.com`,
      role: input.role ?? "user",
      updatedAt: NOW_MS,
      introAcknowledgedAt: ready ? NOW_MS + 10 : undefined,
      legalStatus: ready ? "legal_signed" : "legal_pending",
      contractDocumentStatus: ready ? "contract_sent" : "contract_not_sent",
      creatorSignatureStatus: ready ? "signature_signed" : "signature_pending",
      adminSignatureStatus: ready ? "signature_signed" : "signature_pending",
      idVerificationStatus: input.idStatus ?? (ready ? "id_verified" : "id_not_requested"),
      segmentationStatus: "segment_unassigned",
      approvalStatus: input.approvalStatus ?? "creator_pending",
      ownerOverrideActive: input.ownerOverrideActive,
      ownerOverrideReason: input.ownerOverrideActive ? "Launch review override" : undefined,
    },
  });

  mockState.documents.set(`users/${userId}`, {
    uid: userId,
    email: `${userId}@example.com`,
    displayName: "Creator One",
    username: userId,
    role: input.role ?? "user",
    createdAt: NOW_MS,
  });
  mockState.documents.set(`creator_onboarding/${userId}`, canonical);
}

function postAction(action: string, body: Record<string, unknown> = {}, userId = "creator_1") {
  return POST(new NextRequest(`http://localhost/api/admin/creators/${userId}/action`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "127.0.0.1",
      "user-agent": "Vitest/admin-creator-action",
    },
    body: JSON.stringify({
      action,
      ...body,
    }),
  }), {
    params: Promise.resolve({ userId }),
  });
}

describe("/api/admin/creators/[userId]/action", () => {
  beforeEach(() => {
    mockState.reset();
    mockState.guardApiRequest.mockResolvedValue({
      uid: "admin_1",
      email: "owner@example.com",
    });
  });

  it("requires non-admin callers to be rejected", async () => {
    mockState.guardApiRequest.mockResolvedValue(null);

    const response = await postAction("request_id");
    const payload = await response.json();

    expect(response.status, JSON.stringify(payload)).toBe(401);
    expect(payload.error).toContain("Unauthorized");
  });

  it("can send agreement through the typed action route", async () => {
    const response = await postAction("send_agreement");

    expect(response.status).toBe(200);
    expect(mockState.sendCreatorAgreementDispatch).toHaveBeenCalledWith(expect.objectContaining({
      targetUserId: "creator_1",
      sentByUid: "admin_1",
      sendUpdatedAgreement: false,
    }));
    expect(mockState.trackServerEvent).toHaveBeenCalledWith("admin_creator_agreement_sent", expect.objectContaining({
      actorType: "owner_admin",
      targetUserId: "creator_1",
      actionKey: "send_agreement",
      agreement_hash: "sha256:v1",
    }), "creator_1");
  });

  it("can countersign through the typed action route", async () => {
    const response = await postAction("countersign_agreement");

    expect(response.status).toBe(200);
    expect(mockState.countersignCreatorAgreementDispatch).toHaveBeenCalledWith(expect.objectContaining({
      targetUserId: "creator_1",
      signerUid: "admin_1",
      signerIp: "127.0.0.1",
      signerUserAgent: "Vitest/admin-creator-action",
    }));
    expect(mockState.trackServerEvent).toHaveBeenCalledWith("admin_creator_agreement_countersigned", expect.objectContaining({
      actionKey: "countersign_agreement",
    }), "creator_1");
  });

  it("can request ID and writes history plus queue materialization", async () => {
    seedCreatorApplicant({
      ready: true,
      idStatus: "id_not_requested",
    });

    const response = await postAction("request_id", {
      payload: {
        kycDueAt: NOW_MS + 86_400_000,
      },
      expectedVersion: "1",
    });
    const payload = await response.json();

    expect(response.status, JSON.stringify(payload)).toBe(200);
    expect(mockState.documents.get("creator_onboarding/creator_1")).toMatchObject({
      idVerificationStatus: "id_requested",
      idVerificationRequestedAt: expect.any(Number),
      sourceVersion: 2,
    });
    expect(mockState.documents.get("users/creator_1")).toMatchObject({
      creatorApplication: expect.objectContaining({
        idVerificationStatus: "id_requested",
      }),
    });
    expect(mockState.documents.get("creator_review_queue/creator_1")).toMatchObject({
      userId: "creator_1",
      queueBucket: "waiting_on_id",
    });
    const historyPath = Array.from(mockState.documents.keys()).find((path) => path.startsWith("creator_onboarding/creator_1/history/id_requested_"));
    expect(historyPath).toBeTruthy();
    expect(mockState.documents.get(historyPath!)).toMatchObject({
      eventType: "id_requested",
      actorMarker: expect.objectContaining({
        actorType: "owner_admin",
        targetUserId: "creator_1",
      }),
    });
    expect(mockState.trackServerEvent).toHaveBeenCalledWith("creator_id_requested", expect.objectContaining({
      actorType: "owner_admin",
    }), "creator_1");
  });

  it("can approve a ready creator and materializes creator role", async () => {
    seedCreatorApplicant({
      ready: true,
    });

    const response = await postAction("approve_creator", {
      expectedVersion: "1",
    });
    const payload = await response.json();

    expect(response.status, JSON.stringify(payload)).toBe(200);
    expect(mockState.documents.get("creator_onboarding/creator_1")).toMatchObject({
      approvalStatus: "creator_approved",
      role: "creator",
      sourceVersion: 2,
    });
    expect(mockState.documents.get("users/creator_1")).toMatchObject({
      role: "creator",
      creatorApplication: expect.objectContaining({
        approvalStatus: "creator_approved",
      }),
    });
    expect(mockState.documents.get("creator_review_queue/creator_1")).toMatchObject({
      queueBucket: "approved",
    });
    expect(mockState.trackServerEvent).toHaveBeenCalledWith("creator_approved", expect.objectContaining({
      actionKey: "approve_creator",
    }), "creator_1");
  });

  it("can reject a creator and records the lifecycle action", async () => {
    seedCreatorApplicant({
      idStatus: "id_requested",
    });

    const response = await postAction("reject_creator", {
      expectedVersion: "1",
    });
    const payload = await response.json();

    expect(response.status, JSON.stringify(payload)).toBe(200);
    expect(mockState.documents.get("creator_onboarding/creator_1")).toMatchObject({
      approvalStatus: "creator_rejected",
      rejectedAt: expect.any(Number),
    });
    const historyPath = Array.from(mockState.documents.keys()).find((path) => path.startsWith("creator_onboarding/creator_1/history/creator_rejected_"));
    expect(historyPath).toBeTruthy();
    expect(mockState.trackServerEvent).toHaveBeenCalledWith("creator_rejected", expect.any(Object), "creator_1");
  });

  it("protects owner override as owner-only", async () => {
    mockState.isOwner = false;
    seedCreatorApplicant({
      idStatus: "id_requested",
    });

    const response = await postAction("apply_owner_override", {
      payload: {
        reason: "Launch approval override",
      },
    });
    const payload = await response.json();

    expect(response.status, JSON.stringify(payload)).toBe(403);
    expect(payload.error).toContain("Only the owner admin");
  });

  it("rejects invalid transition when approve is requested before prerequisites", async () => {
    seedCreatorApplicant({
      idStatus: "id_not_requested",
    });

    const response = await postAction("approve_creator", {
      expectedVersion: "1",
    });
    const payload = await response.json();

    expect(response.status, JSON.stringify(payload)).toBe(400);
    expect(payload.error).toContain("cannot be approved");
    expect(mockState.documents.get("creator_onboarding/creator_1")).toMatchObject({
      approvalStatus: "creator_pending",
    });
  });

  it("rejects an oversized action before any creator workflow mutation", async () => {
    const response = await POST(new NextRequest("http://localhost/api/admin/creators/creator_1/action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "request_id", padding: "x".repeat(64_000) }),
    }), {
      params: Promise.resolve({ userId: "creator_1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(413);
    expect(payload).toMatchObject({
      success: false,
      code: "payload_too_large",
      retryable: false,
    });
    expect(mockState.documents.size).toBe(0);
    expect(mockState.sendCreatorAgreementDispatch).not.toHaveBeenCalled();
    expect(mockState.trackServerEvent).not.toHaveBeenCalled();
  });

  it("classifies malformed action JSON without starting the creator workflow", async () => {
    const response = await POST(new NextRequest("http://localhost/api/admin/creators/creator_1/action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    }), {
      params: Promise.resolve({ userId: "creator_1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      success: false,
      code: "invalid_json",
      retryable: false,
    });
    expect(mockState.documents.size).toBe(0);
    expect(mockState.trackServerEvent).not.toHaveBeenCalled();
  });
});
