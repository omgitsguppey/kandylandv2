import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildCreatorOnboardingCanonicalRecord } from "@/lib/creator-onboarding";

type MockDocRef = {
  path: string;
  get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
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
      getAll: (...refs: MockDocRef[]) => Promise<Array<{ exists: boolean; data: () => Record<string, unknown> | undefined }>>;
      set: (ref: MockDocRef, data: unknown, options?: { merge?: boolean }) => void;
    }) => Promise<unknown>) => {
      const transaction = {
        async get(ref: MockDocRef) {
          return {
            exists: documents.has(ref.path),
            data: () => documents.get(ref.path),
          };
        },
        async getAll(...refs: MockDocRef[]) {
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

  const adminAuth = {
    updateUser: vi.fn(async () => undefined),
    getUser: vi.fn(async (uid: string) => ({
      uid,
      email: `${uid}@example.com`,
    })),
    generatePasswordResetLink: vi.fn(async (email: string) => `https://reset.example.test/?email=${encodeURIComponent(email)}`),
  };

  return {
    documents,
    adminDb,
    adminAuth,
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    trackServerEvent: vi.fn(async () => undefined),
    recordServerDiagnostic: vi.fn(async () => undefined),
    reserveUsernameForUser: vi.fn(),
    reset() {
      documents.clear();
      adminDb.runTransaction.mockClear();
      adminAuth.updateUser.mockClear();
      adminAuth.getUser.mockClear();
      adminAuth.generatePasswordResetLink.mockClear();
      this.guardApiRequest.mockReset();
      this.handleApiError.mockReset();
      this.trackServerEvent.mockReset();
      this.recordServerDiagnostic.mockReset();
      this.reserveUsernameForUser.mockReset();
    },
  };
});

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: mockState.adminDb,
  adminAuth: mockState.adminAuth,
}));

vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
  handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  ADMIN: {},
}));

vi.mock("@/lib/server/analytics", () => ({
  trackServerEvent: mockState.trackServerEvent,
}));

vi.mock("@/lib/server/server-diagnostics", () => ({
  recordServerDiagnostic: mockState.recordServerDiagnostic,
}));

vi.mock("@/lib/server/username-suggestions", () => ({
  reserveUsernameForUser: mockState.reserveUsernameForUser,
}));

vi.mock("@/lib/creator-admin", () => ({
  isCreatorOwnerEmail: (email?: string | null) => email === "owner@example.com",
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

import { POST } from "@/app/api/admin/creator-account-controls/route";

function seedUser(userId: string, overrides: Record<string, unknown> = {}) {
  mockState.documents.set(`users/${userId}`, {
    uid: userId,
    email: `${userId}@example.com`,
    displayName: "Original Creator",
    username: userId,
    role: "user",
    status: "active",
    ...overrides,
  });
}

function seedReadyCreatorOnboarding(userId: string) {
  const nowMs = 1_710_000_000_000;
  const canonical = buildCreatorOnboardingCanonicalRecord({
    userId,
    email: `${userId}@example.com`,
    username: userId,
    displayName: "Original Creator",
    photoURL: null,
    role: "user",
    createdAt: nowMs - 10_000,
    queuePosition: 4,
    creatorDisplayName: "Original Creator",
    creatorPrimaryPlatform: "TikTok",
    creatorContentFocus: "Drops",
    nowMs,
    source: {
      signupType: "creator",
      submissionStatus: "awaiting_manual_review",
      approvalStatus: "creator_approved",
      legalStatus: "legal_signed",
      contractDocumentStatus: "contract_sent",
      creatorSignatureStatus: "signature_signed",
      adminSignatureStatus: "signature_signed",
      idVerificationStatus: "id_verified",
      segmentationStatus: "segment_assigned",
      queuePosition: 4,
      introAcknowledgedAt: nowMs - 8_000,
      submittedAt: nowMs - 7_000,
      onboardingSubmittedAt: nowMs - 7_000,
      awaitingManualReviewAt: nowMs - 6_000,
      updatedAt: nowMs - 5_000,
      creatorDisplayName: "Original Creator",
      creatorPrimaryPlatform: "TikTok",
      creatorContentFocus: "Drops",
    },
  });

  mockState.documents.set(`creator_onboarding/${userId}`, canonical);
  mockState.documents.set(`creator_review_queue/${userId}`, {
    userId,
    role: "user",
    approvalStatus: "creator_approved",
  });
}

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/creator-account-controls", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function rawRequest(body: string, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/creator-account-controls", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body,
  });
}

describe("POST /api/admin/creator-account-controls", () => {
  beforeEach(() => {
    mockState.reset();
    mockState.guardApiRequest.mockResolvedValue({
      uid: "admin_1",
      email: "admin@example.com",
      role: "admin",
    });
    mockState.handleApiError.mockImplementation((error: Error) => NextResponse.json({
      error: error.message,
    }, { status: error.message.includes("Forbidden") ? 403 : 500 }));
  });

  it("admin can update creator display name with audit and identity-marked telemetry", async () => {
    seedUser("creator_profile");

    const response = await POST(request({
      action: "update_profile",
      targetUserId: "creator_profile",
      displayName: "Updated Creator",
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mockState.guardApiRequest).toHaveBeenCalledWith(expect.any(NextRequest), expect.objectContaining({
      auth: "admin",
      requireTrustedOrigin: true,
    }));
    expect(mockState.adminAuth.updateUser).toHaveBeenCalledWith("creator_profile", { displayName: "Updated Creator" });
    expect(mockState.documents.get("users/creator_profile")).toMatchObject({
      displayName: "Updated Creator",
      adminAccountControlDebug: expect.objectContaining({
        lastAdminAccountActionBy: "admin_1",
      }),
    });
    expect(Array.from(mockState.documents.keys()).some((path) => path.includes("admin_account_updated_displayName"))).toBe(true);
    expect(mockState.trackServerEvent).toHaveBeenCalledWith("admin_creator_account_updated", expect.objectContaining({
      actorType: "admin",
      targetUserId: "creator_profile",
      performedAs: "admin_on_behalf",
      fieldChanged: "displayName",
    }), "creator_profile");
  });

  it("rejects non-admin callers through the admin guard", async () => {
    mockState.guardApiRequest.mockRejectedValueOnce(new Error("Forbidden"));

    const response = await POST(request({
      action: "update_profile",
      targetUserId: "creator_profile",
      displayName: "Blocked",
    }));
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe("Forbidden");
  });

  it("returns invalid_admin_request for malformed JSON instead of generic 500", async () => {
    const response = await POST(rawRequest("{"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      success: false,
      code: "invalid_admin_request",
    });
    expect(mockState.handleApiError).not.toHaveBeenCalled();
  });

  it("rejects oversized account-control bodies before command parsing", async () => {
    const body = JSON.stringify({
      action: "update_profile",
      targetUserId: "creator_profile",
      displayName: "Updated Creator",
    });

    const response = await POST(rawRequest(body, { "content-length": "20000" }));
    const payload = await response.json();

    expect(response.status).toBe(413);
    expect(payload).toMatchObject({
      success: false,
      code: "payload_too_large",
    });
    expect(mockState.handleApiError).not.toHaveBeenCalled();
  });

  it("updates email only through the guarded server route", async () => {
    seedUser("creator_email");

    const response = await POST(request({
      action: "update_email",
      targetUserId: "creator_email",
      email: "new.creator@example.com",
      confirmed: true,
    }));

    expect(response.status).toBe(200);
    expect(mockState.guardApiRequest).toHaveBeenCalledWith(expect.any(NextRequest), expect.objectContaining({
      auth: "admin",
      requireTrustedOrigin: true,
    }));
    expect(mockState.adminAuth.updateUser).toHaveBeenCalledWith("creator_email", { email: "new.creator@example.com" });
    expect(mockState.documents.get("users/creator_email")).toMatchObject({
      email: "new.creator@example.com",
    });
    expect(mockState.trackServerEvent).toHaveBeenCalledWith("admin_creator_email_updated", expect.objectContaining({
      emailUpdateServerConfirmed: true,
      oldValueRedacted: "c***@example.com",
      newValueRedacted: "n***@example.com",
    }), "creator_email");
  });

  it("does not expose or store plaintext temporary passwords", async () => {
    seedUser("creator_password");

    const response = await POST(request({
      action: "set_temporary_password",
      targetUserId: "creator_password",
      temporaryPassword: "TempSecret123!",
      confirmed: true,
    }));
    const payload = await response.json();
    const persisted = JSON.stringify(Array.from(mockState.documents.entries()));

    expect(response.status).toBe(200);
    expect(JSON.stringify(payload)).not.toContain("TempSecret123!");
    expect(persisted).not.toContain("TempSecret123!");
    expect(mockState.adminAuth.updateUser).toHaveBeenCalledWith("creator_password", { password: "TempSecret123!" });
    expect(mockState.trackServerEvent).toHaveBeenCalledWith("admin_creator_temporary_password_set", expect.objectContaining({
      oldValueRedacted: "[password hidden]",
      newValueRedacted: "[password hidden]",
      passwordActionMode: "temporary_password_set",
    }), "creator_password");
  });

  it("audits role updates and blocks non-owner admin promotion", async () => {
    seedUser("creator_role");
    seedReadyCreatorOnboarding("creator_role");

    const roleResponse = await POST(request({
      action: "update_role",
      targetUserId: "creator_role",
      role: "creator",
      confirmed: true,
    }));

    expect(roleResponse.status).toBe(200);
    expect(mockState.documents.get("users/creator_role")).toMatchObject({
      role: "creator",
    });
    expect(Array.from(mockState.documents.keys()).some((path) => path.includes("admin_account_updated_role"))).toBe(true);
    expect(mockState.trackServerEvent).toHaveBeenCalledWith("admin_creator_role_updated", expect.objectContaining({
      actorType: "admin",
      targetUserId: "creator_role",
      performedAs: "admin_on_behalf",
      roleUpdateServerConfirmed: true,
    }), "creator_role");

    seedUser("creator_admin_block");
    const blockedResponse = await POST(request({
      action: "update_role",
      targetUserId: "creator_admin_block",
      role: "admin",
      confirmed: true,
    }));
    const blockedPayload = await blockedResponse.json();

    expect(blockedResponse.status).toBe(403);
    expect(blockedPayload).toMatchObject({
      code: "forbidden",
      error: "Only the owner admin can grant admin access.",
    });
  });

  it("audits account status changes", async () => {
    seedUser("creator_status");

    const response = await POST(request({
      action: "update_status",
      targetUserId: "creator_status",
      status: "suspended",
      statusReason: "Support review",
      confirmed: true,
    }));

    expect(response.status).toBe(200);
    expect(mockState.adminAuth.updateUser).toHaveBeenCalledWith("creator_status", { disabled: true });
    expect(mockState.documents.get("users/creator_status")).toMatchObject({
      status: "suspended",
      statusReason: "Support review",
    });
    expect(mockState.trackServerEvent).toHaveBeenCalledWith("admin_creator_status_updated", expect.objectContaining({
      actorType: "admin",
      targetUserId: "creator_status",
      performedAs: "admin_on_behalf",
      fieldChanged: "status",
    }), "creator_status");
  });
});
