import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type StoredDoc = Record<string, unknown>;

const mockState = vi.hoisted(() => {
  const docs = new Map<string, StoredDoc>();
  const queryDocs = new Map<string, StoredDoc[]>();
  let generatedId = 0;

  const setDoc = vi.fn(async (path: string, data: StoredDoc, options?: { merge?: boolean }) => {
    docs.set(path, options?.merge ? { ...(docs.get(path) ?? {}), ...data } : data);
  });
  const updateDoc = vi.fn(async (path: string, data: StoredDoc) => {
    docs.set(path, { ...(docs.get(path) ?? {}), ...data });
  });
  const transactionSet = vi.fn((ref: { path: string }, data: StoredDoc, options?: { merge?: boolean }) => {
    docs.set(ref.path, options?.merge ? { ...(docs.get(ref.path) ?? {}), ...data } : data);
  });

  const buildDocRef = (path: string) => ({
    id: path.split("/").pop() ?? "unknown",
    path,
    async get() {
      return {
        exists: docs.has(path),
        data: () => docs.get(path),
      };
    },
    set(data: StoredDoc, options?: { merge?: boolean }) {
      return setDoc(path, data, options);
    },
    update(data: StoredDoc) {
      return updateDoc(path, data);
    },
  });

  const adminDb = {
    collection: vi.fn((name: string) => ({
      doc(id?: string) {
        return buildDocRef(`${name}/${id ?? `generated_${++generatedId}`}`);
      },
      where() {
        const query = {
          limit() {
            return query;
          },
          async get() {
            return {
              docs: (queryDocs.get(name) ?? []).map((data, index) => ({
                id: `${name}_${index}`,
                data: () => data,
              })),
            };
          },
        };
        return query;
      },
    })),
    runTransaction: vi.fn(async (callback: (transaction: {
      get: (ref: { path: string }) => Promise<{ exists: boolean; data: () => StoredDoc | undefined }>;
      set: typeof transactionSet;
    }) => Promise<unknown>) => callback({
      async get(ref) {
        return {
          exists: docs.has(ref.path),
          data: () => docs.get(ref.path),
        };
      },
      set: transactionSet,
    })),
  };

  return {
    docs,
    queryDocs,
    adminDb,
    setDoc,
    updateDoc,
    transactionSet,
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    trackServerEvent: vi.fn(async () => undefined),
    recordDebugEvidence: vi.fn(async () => "fingerprint_1"),
    recordRouteWarning: vi.fn(),
    reset() {
      docs.clear();
      queryDocs.clear();
      generatedId = 0;
      adminDb.collection.mockClear();
      adminDb.runTransaction.mockClear();
      setDoc.mockClear();
      updateDoc.mockClear();
      transactionSet.mockClear();
      this.guardApiRequest.mockReset();
      this.handleApiError.mockReset();
      this.trackServerEvent.mockReset();
      this.recordDebugEvidence.mockReset();
      this.recordRouteWarning.mockReset();
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
  ANALYTICS_WRITE: {},
  RELAXED: {},
  STANDARD: {},
}));

vi.mock("@/lib/creator-experiences", () => ({
  CREATOR_COLLECTIONS: {
    ledgerAccruals: "creator_ledger_accruals",
    payoutRequests: "creator_payout_requests",
  },
  isCreatorRole: (role: unknown) => role === "creator",
}));

vi.mock("@/lib/server/creator-experiences", () => ({
  calculateCreatorCashoutUsd: (value: number) => value / 100,
}));

vi.mock("@/lib/server/analytics", () => ({
  trackServerEvent: mockState.trackServerEvent,
}));

vi.mock("@/lib/server/debug-evidence-store", () => ({
  recordDebugEvidence: mockState.recordDebugEvidence,
}));

vi.mock("@/lib/server/route-diagnostics", () => ({
  recordRouteWarning: mockState.recordRouteWarning,
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: (value: number) => ({ increment: value }),
    serverTimestamp: () => ({ serverTimestamp: true }),
  },
}));

import { POST as payoutPost, PUT as payoutPut } from "@/app/api/creator/payouts/route";
import { POST as debugEvidencePost } from "@/app/api/debug/evidence/route";
import { POST as impressionPost } from "@/app/api/drops/impression/route";
import { POST as trackPost } from "@/app/api/drops/track/route";

function jsonRequest(path: string, body: unknown, contentLength?: number) {
  const serialized = typeof body === "string" ? body : JSON.stringify(body);
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: contentLength ? { "content-length": String(contentLength) } : undefined,
    body: serialized,
  });
}

describe("remaining creator, debug, and Drop body caps", () => {
  beforeEach(() => {
    mockState.reset();
    mockState.guardApiRequest.mockResolvedValue({
      uid: "caller_1",
      email: "caller@example.com",
    });
    mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 }));
    mockState.recordDebugEvidence.mockResolvedValue("fingerprint_1");
    mockState.docs.set("users/caller_1", { role: "creator" });
  });

  it("preserves a valid creator payout request", async () => {
    mockState.queryDocs.set("creator_ledger_accruals", [{
      creatorId: "caller_1",
      creatorShareGd: 200,
      status: "accrued",
    }]);

    const response = await payoutPost(jsonRequest("/api/creator/payouts", { requestedGd: 100 }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ success: true, id: "generated_1" });
    expect(mockState.setDoc).toHaveBeenCalledWith(
      "creator_payout_requests/generated_1",
      expect.objectContaining({ creatorId: "caller_1", requestedGd: 100, status: "pending" }),
      undefined,
    );
  });

  it("rejects oversized creator payout POST and PUT bodies before payout mutation", async () => {
    const postResponse = await payoutPost(jsonRequest("/api/creator/payouts", {}, 16_385));
    expect(postResponse.status).toBe(413);

    mockState.docs.set("users/caller_1", { role: "admin" });
    const putRequest = jsonRequest("/api/creator/payouts", {}, 16_385);
    const putResponse = await payoutPut(new NextRequest(putRequest.url, {
      method: "PUT",
      headers: putRequest.headers,
      body: "{}",
    }));
    const payload = await putResponse.json();

    expect(putResponse.status).toBe(413);
    expect(payload).toMatchObject({ errorCode: "payload_too_large", retryable: false });
    expect(mockState.setDoc).not.toHaveBeenCalled();
    expect(mockState.trackServerEvent).not.toHaveBeenCalled();
  });

  it("accepts valid debug evidence and rejects malformed or oversized input before recording", async () => {
    const validResponse = await debugEvidencePost(jsonRequest("/api/debug/evidence", {
      source: "client",
      severity: "warn",
      category: "runtime",
      message: "A bounded test issue",
      humanMessage: "A bounded test issue occurred.",
    }));
    expect(validResponse.status).toBe(200);
    expect(mockState.recordDebugEvidence).toHaveBeenCalledTimes(1);

    mockState.recordDebugEvidence.mockClear();
    const malformedResponse = await debugEvidencePost(jsonRequest("/api/debug/evidence", "{not-json"));
    const malformedPayload = await malformedResponse.json();
    expect(malformedResponse.status).toBe(400);
    expect(malformedPayload).toMatchObject({ errorCode: "invalid_json", retryable: false });

    const oversizedResponse = await debugEvidencePost(jsonRequest("/api/debug/evidence", {}, 32_769));
    expect(oversizedResponse.status).toBe(413);
    expect(mockState.recordDebugEvidence).not.toHaveBeenCalled();
  });

  it("preserves valid Drop impression and click tracking", async () => {
    mockState.docs.set("drops/drop_1", { title: "Drop One" });

    const impressionResponse = await impressionPost(jsonRequest("/api/drops/impression", {
      dropId: "drop_1",
      pagePath: "/drops",
      surface: "drops_grid",
      sessionId: "session_1",
    }));
    expect(impressionResponse.status).toBe(200);
    expect(mockState.adminDb.runTransaction).toHaveBeenCalledTimes(1);

    const trackResponse = await trackPost(jsonRequest("/api/drops/track", { dropId: "drop_1" }));
    expect(trackResponse.status).toBe(200);
    expect(mockState.trackServerEvent).toHaveBeenCalledWith("drop_clicked", expect.any(Object), "caller_1");
    expect(mockState.updateDoc).toHaveBeenCalledWith("drops/drop_1", expect.any(Object));
  });

  it("rejects oversized Drop impression and click bodies before telemetry or Firestore mutation", async () => {
    const impressionResponse = await impressionPost(jsonRequest("/api/drops/impression", {}, 16_385));
    const trackResponse = await trackPost(jsonRequest("/api/drops/track", {}, 16_385));
    const trackPayload = await trackResponse.json();

    expect(impressionResponse.status).toBe(413);
    expect(trackResponse.status).toBe(413);
    expect(trackPayload).toMatchObject({ errorCode: "payload_too_large", retryable: false });
    expect(mockState.adminDb.runTransaction).not.toHaveBeenCalled();
    expect(mockState.updateDoc).not.toHaveBeenCalled();
    expect(mockState.trackServerEvent).not.toHaveBeenCalled();
    expect(mockState.recordRouteWarning).not.toHaveBeenCalled();
  });
});
