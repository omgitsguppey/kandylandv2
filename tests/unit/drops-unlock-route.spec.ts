import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type StoredDoc = Record<string, unknown>;
type MockRef = { path: string };

const mockState = vi.hoisted(() => {
  const documents = new Map<string, StoredDoc>();
  const transactionUpdate = vi.fn((ref: MockRef, patch: StoredDoc) => {
    documents.set(ref.path, {
      ...(documents.get(ref.path) ?? {}),
      ...patch,
    });
  });
  const transactionSet = vi.fn((ref: MockRef, data: StoredDoc) => {
    documents.set(ref.path, data);
  });

  const buildDocSnapshot = (path: string) => ({
    exists: documents.has(path),
    data: () => documents.get(path),
  });

  const buildDocRef = (path: string) => ({ path });

  const adminDb = {
    collection(name: string) {
      return {
        doc(id?: string) {
          return buildDocRef(`${name}/${id ?? "generated_tx"}`);
        },
      };
    },
    async runTransaction<T>(callback: (transaction: {
      get: (ref: MockRef) => Promise<{ exists: boolean; data: () => StoredDoc | undefined }>;
      update: (ref: MockRef, patch: StoredDoc) => void;
      set: (ref: MockRef, data: StoredDoc) => void;
    }) => Promise<T>) {
      return callback({
        async get(ref) {
          return buildDocSnapshot(ref.path);
        },
        update: transactionUpdate,
        set: transactionSet,
      });
    },
  };

  return {
    documents,
    transactionUpdate,
    transactionSet,
    adminDb,
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    recordCanonicalTaskEvent: vi.fn(async () => undefined),
    trackServerEvent: vi.fn(async () => undefined),
    touchUserRuntime: vi.fn(async () => undefined),
    revalidatePath: vi.fn(),
    reset() {
      documents.clear();
      transactionUpdate.mockClear();
      transactionSet.mockClear();
      this.guardApiRequest.mockReset();
      this.handleApiError.mockReset();
      this.recordCanonicalTaskEvent.mockClear();
      this.trackServerEvent.mockClear();
      this.touchUserRuntime.mockClear();
      this.revalidatePath.mockClear();
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
  SENSITIVE_WRITE: {},
}));

vi.mock("@/lib/server/daily-tasks", () => ({
  recordCanonicalTaskEvent: mockState.recordCanonicalTaskEvent,
}));

vi.mock("@/lib/server/analytics", () => ({
  trackServerEvent: mockState.trackServerEvent,
}));

vi.mock("@/lib/server/user-runtime", () => ({
  touchUserRuntime: mockState.touchUserRuntime,
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockState.revalidatePath,
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    arrayUnion: (value: unknown) => ({ op: "arrayUnion", value }),
    increment: (value: unknown) => ({ op: "increment", value }),
    serverTimestamp: () => "__server_timestamp__",
  },
}));

import { POST } from "@/app/api/drops/unlock/route";

function unlockRequest(dropId = "drop_1") {
  return new NextRequest("http://localhost/api/drops/unlock", {
    method: "POST",
    body: JSON.stringify({ dropId }),
  });
}

describe("POST /api/drops/unlock", () => {
  beforeEach(() => {
    mockState.reset();
    mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1", email: "fan@example.com" });
    mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 }));
    mockState.documents.set("drops/drop_1", {
      creatorId: "creator_1",
      title: "Paid Drop",
      unlockCost: 7,
      tags: ["Sweet"],
    });
    mockState.documents.set("users/fan_1", {
      username: "fan",
      gumDropsBalance: 10,
      gumDropsPurchasedBalance: 4,
      gumDropsRewardBalance: 6,
      unlockedContent: [],
      unlockedContentTimestamps: {},
    });
  });

  it("atomically unlocks with source-aware spend metadata for parity checks", async () => {
    const response = await POST(unlockRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      cost: 7,
      newBalance: 3,
      alreadyUnlocked: false,
    });
    expect(mockState.guardApiRequest).toHaveBeenCalledWith(expect.any(NextRequest), expect.objectContaining({
      routeName: "drops/unlock",
      requireTrustedOrigin: true,
      auth: "user",
      scopeToCaller: true,
    }));
    expect(mockState.transactionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: "users/fan_1" }),
      expect.objectContaining({
        gumDropsBalance: 3,
        gumDropsPurchasedBalance: 3,
        gumDropsRewardBalance: 0,
        unlockedContent: { op: "arrayUnion", value: "drop_1" },
      }),
    );
    expect(mockState.transactionSet).toHaveBeenCalledWith(
      expect.objectContaining({ path: "transactions/generated_tx" }),
      expect.objectContaining({
        userId: "fan_1",
        type: "unlock_content",
        amount: -7,
        relatedDropId: "drop_1",
        balanceBefore: 10,
        balanceAfter: 3,
        unlockSource: "gumdrops",
        purchasedAmountSpent: 1,
        rewardAmountSpent: 6,
        verifiedServerSide: true,
      }),
    );
  });

  it("returns already unlocked without writing another deduction or transaction", async () => {
    mockState.documents.set("users/fan_1", {
      username: "fan",
      gumDropsBalance: 10,
      gumDropsPurchasedBalance: 4,
      gumDropsRewardBalance: 6,
      unlockedContent: ["drop_1"],
      unlockedContentTimestamps: { drop_1: 1770000000000 },
    });

    const response = await POST(unlockRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      newBalance: 10,
      alreadyUnlocked: true,
      unwrappedAt: 1770000000000,
    });
    expect(mockState.transactionUpdate).not.toHaveBeenCalled();
    expect(mockState.transactionSet).not.toHaveBeenCalled();
    expect(mockState.recordCanonicalTaskEvent).not.toHaveBeenCalled();
    expect(mockState.trackServerEvent).not.toHaveBeenCalled();
  });
});
