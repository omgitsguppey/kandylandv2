import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  requestedLimit: 0,
  factLimit: 0,
  requestIds: Array.from({ length: 80 }, (_, index) => `request_${index}`),
  timelineFacts: [] as Array<Record<string, unknown>>,
  claimUserIndexMaterializerRequest: vi.fn(async (): Promise<unknown> => null),
  publishUserIndexMaterializerBundle: vi.fn(async () => true),
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: {
    collection(collectionName: string) {
      const query = {
        where: vi.fn(() => query),
        orderBy: vi.fn(() => query),
        limit: vi.fn((limit: number) => {
          if (collectionName === "behavioral_timeline_facts") {
            mockState.factLimit = limit;
          } else if (collectionName === "user_index_materializer_requests") {
            mockState.requestedLimit = limit;
          }
          return query;
        }),
        get: vi.fn(async () => ({
          docs: collectionName === "behavioral_timeline_facts"
            ? mockState.timelineFacts.slice(0, mockState.factLimit).map((data) => ({ data: () => data }))
            : collectionName === "identity_lineage_indexes"
              ? []
              : mockState.requestIds.slice(0, mockState.requestedLimit).map((id) => ({ id })),
        })),
      };
      return query;
    },
  },
}));

vi.mock("@/lib/server/user-index-writer", () => ({
  claimUserIndexMaterializerRequest: mockState.claimUserIndexMaterializerRequest,
  deriveUserIndexMaterializerWindowReceipt: vi.fn((receipt: unknown) => receipt),
  enqueueUserIndexMaterializerRequests: vi.fn(async () => ({ created: 0, requeued: 0, coalesced: 0 })),
  failUserIndexMaterializerRequest: vi.fn(async () => true),
  publishUserIndexMaterializerBundle: mockState.publishUserIndexMaterializerBundle,
  writeUserIndexMaterializerWindowReceipt: vi.fn(async () => undefined),
}));

import {
  buildUserIndexMaterializerRequests,
  consumeUserIndexMaterializerOutbox,
} from "@/lib/server/user-index-materializer";
import { USER_INDEX_MATERIALIZER_SUBJECT_TRUNCATED_ISSUE_CODE } from "@/lib/user-indexes/user-tracking-index-contract";

describe("user index materializer consumer bounds", () => {
  beforeEach(() => {
    mockState.requestedLimit = 0;
    mockState.factLimit = 0;
    mockState.requestIds = Array.from({ length: 80 }, (_, index) => `request_${index}`);
    mockState.timelineFacts = [];
    mockState.claimUserIndexMaterializerRequest.mockReset().mockResolvedValue(null);
    mockState.publishUserIndexMaterializerBundle.mockReset().mockResolvedValue(true);
  });

  it("examines at most 5 requests including stale or non-claimable candidates", async () => {
    const result = await consumeUserIndexMaterializerOutbox({
      mode: "shadow",
      sourceFingerprint: "source_a",
      maxRequests: 5_000,
      runtimeCapMs: 30_000,
      workerId: "worker_a",
    });

    expect(result.status).toBe("no_work");
    expect(mockState.requestedLimit).toBe(5);
    expect(mockState.claimUserIndexMaterializerRequest).toHaveBeenCalledTimes(5);
  });

  it("publishes a capped shadow subject as explicit partial evidence", async () => {
    const request = buildUserIndexMaterializerRequests({
      userIds: ["user_1"],
      sourceFingerprint: "source_a",
      sourceWindowStartMs: 0,
      sourceWindowEndMs: 10,
      requestedAtMs: 1_000,
      maxFacts: 2,
    })[0];
    mockState.requestIds = [request.requestId];
    mockState.claimUserIndexMaterializerRequest.mockResolvedValue({
      ...request,
      state: "leased",
      leaseOwner: "worker_a",
      leaseExpiresAtMs: Date.now() + 30_000,
    });
    mockState.timelineFacts = [1, 2].map((timestampMs) => ({
      factId: `fact_${timestampMs}`,
      actorType: "user",
      actorUserId: "user_1",
      sessionId: "session_1",
      normalizedAction: "drop_viewed",
      eventName: "drop_viewed",
      timestampMs,
      route: "/drops/drop_1",
      sourceComponent: "test",
      surface: "user",
      target: { dropId: "drop_1" },
      sourceTruth: "client",
      sourceReliability: 0.8,
      consentState: "granted",
      metricEligible: true,
      confidenceInputs: {
        schemaComplete: true,
        hasActor: true,
        hasTargetWhenRequired: true,
        hasSession: true,
        hasServerTruth: false,
      },
    }));

    const result = await consumeUserIndexMaterializerOutbox({
      mode: "shadow",
      sourceFingerprint: "source_a",
      maxRequests: 1,
      maxFactsPerSubject: 2,
      runtimeCapMs: 30_000,
      workerId: "worker_a",
    });

    expect(mockState.publishUserIndexMaterializerBundle).toHaveBeenCalledWith(expect.objectContaining({
      mode: "shadow",
      factsRead: 2,
      isPotentiallyTruncated: true,
    }));
    expect(result.receipt?.truncatedSubjectCount).toBe(1);
    expect(result.issueCodes).toContain(USER_INDEX_MATERIALIZER_SUBJECT_TRUNCATED_ISSUE_CODE);
  });
});
