import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BehavioralTimelineFact } from "@/lib/behavioral/behavioral-timeline-contract";
import type { UserIndexMaterializerOutboxRequest } from "@/lib/user-indexes/user-tracking-index-contract";

const mocks = vi.hoisted(() => {
  const committed = new Map<string, unknown>();
  const transactionWrites: Array<{ operation: "set" | "create"; path: string; value: unknown }> = [];
  const request: UserIndexMaterializerOutboxRequest = {
    requestId: "user_index_atomic_guest",
    subjectKind: "guest",
    subjectId: "guest_atomic",
    sourceFingerprint: "source_atomic",
    materializerVersion: "2026.07.user-index-materializer.v3",
    sourceWindowStartMs: 1,
    sourceWindowEndMs: 2,
    maxFacts: 200,
    state: "queued",
    attemptCount: 0,
    nextAttemptAtMs: 2,
    leaseOwner: null,
    leaseExpiresAtMs: null,
    pendingSourceWindowStartMs: null,
    pendingSourceWindowEndMs: null,
    processedThroughMs: null,
    lastSafeErrorCode: null,
    createdAtMs: 2,
    updatedAtMs: 2,
    completedAtMs: null,
    expiresAtMs: 30 * 24 * 60 * 60 * 1000 + 2,
  };
  const adminDb = {
    collection: vi.fn((collection: string) => ({
      doc: vi.fn((id: string) => ({ path: `${collection}/${id}` })),
    })),
    runTransaction: vi.fn(async (callback: (transaction: {
      get: (ref: { path: string }) => Promise<{ exists: boolean; data: () => unknown }>;
      set: (ref: { path: string }, value: unknown) => void;
      create: (ref: { path: string }, value: unknown) => void;
    }) => Promise<unknown>) => {
      const staged: typeof transactionWrites = [];
      const result = await callback({
        get: async (ref) => ({
          exists: committed.has(ref.path),
          data: () => committed.get(ref.path),
        }),
        set: (ref, value) => staged.push({ operation: "set", path: ref.path, value }),
        create: (ref, value) => staged.push({ operation: "create", path: ref.path, value }),
      });
      for (const write of staged) committed.set(write.path, write.value);
      transactionWrites.push(...staged);
      return result;
    }),
  };
  return { adminDb, committed, transactionWrites, request };
});

vi.mock("@/lib/server/firebase-admin", () => ({ adminDb: mocks.adminDb }));
vi.mock("@/lib/server/user-index-materializer", () => ({
  buildUserIndexMaterializerRequests: vi.fn(() => [mocks.request]),
  resolveUserIndexMaterializerMode: vi.fn(() => "shadow"),
  resolveUserIndexMaterializerSourceFingerprint: vi.fn(() => "source_atomic"),
  UserIndexMaterializerConfigurationError: class extends Error {},
}));

import { writeBehavioralTimelineProjection } from "@/lib/server/behavioral-timeline-writer";

const fact: BehavioralTimelineFact = {
  factId: "fact_atomic",
  idempotencyKey: "event_atomic",
  actorType: "guest",
  anonymousVisitorId: "guest_atomic",
  sessionId: "session_atomic",
  normalizedAction: "page_viewed",
  eventName: "semantic_page_viewed",
  timestampMs: 2,
  route: "/",
  sourceComponent: "guest_runtime_ingest",
  surface: "user",
  target: {},
  sourceTruth: "client",
  sourceReliability: 0.7,
  consentState: "granted",
  includeInGlobalEvents: true,
  includeInPersonMetrics: false,
  metricEligible: true,
  confidenceInputs: {
    schemaComplete: true,
    hasActor: true,
    hasTargetWhenRequired: true,
    hasSession: true,
    hasServerTruth: false,
  },
};

describe("behavioral timeline projection owner", () => {
  beforeEach(() => {
    mocks.committed.clear();
    mocks.transactionWrites.length = 0;
    mocks.adminDb.runTransaction.mockClear();
  });

  it("commits the canonical fact and deterministic outbox request in one transaction", async () => {
    const result = await writeBehavioralTimelineProjection({
      facts: [fact],
      anonymousVisitorIds: ["guest_atomic"],
      requestedAtMs: 2,
      sourceWindowStartMs: 1,
      sourceWindowEndMs: 2,
    });

    expect(mocks.adminDb.runTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.transactionWrites).toEqual(expect.arrayContaining([
      expect.objectContaining({ operation: "set", path: "behavioral_timeline_facts/fact_atomic" }),
      expect.objectContaining({
        operation: "create",
        path: "user_index_materializer_requests/user_index_atomic_guest",
      }),
    ]));
    const requestWrite = mocks.transactionWrites.find((write) =>
      write.path === "user_index_materializer_requests/user_index_atomic_guest");
    expect((requestWrite?.value as { expiresAt?: { toMillis(): number } }).expiresAt?.toMillis())
      .toBe(mocks.request.expiresAtMs);
    expect(result).toMatchObject({
      written: 1,
      materializer: { status: "queued", requestsBuilt: 1, requestsEnqueued: 1 },
    });
  });

  it("leaves neither side committed when the transaction fails", async () => {
    mocks.adminDb.runTransaction.mockRejectedValueOnce(new Error("transaction_aborted"));

    await expect(writeBehavioralTimelineProjection({
      facts: [fact],
      anonymousVisitorIds: ["guest_atomic"],
      requestedAtMs: 2,
    })).rejects.toThrow("transaction_aborted");

    expect(mocks.committed.size).toBe(0);
    expect(mocks.transactionWrites).toHaveLength(0);
  });

  it("reports every fact omitted by the bounded transaction cap", async () => {
    const facts = Array.from({ length: 121 }, (_, index) => ({
      ...fact,
      factId: `fact_atomic_${index}`,
      idempotencyKey: `event_atomic_${index}`,
    }));

    const result = await writeBehavioralTimelineProjection({
      facts,
      anonymousVisitorIds: ["guest_atomic"],
      requestedAtMs: 2,
    });

    expect(result).toMatchObject({
      written: 120,
      skipped: 1,
      reason: "batch_capped",
    });
    expect(mocks.transactionWrites.filter((write) =>
      write.path.startsWith("behavioral_timeline_facts/"))).toHaveLength(120);
  });
});
