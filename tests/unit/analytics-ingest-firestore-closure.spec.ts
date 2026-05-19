import { describe, expect, it } from "vitest";

import {
  ANALYTICS_INGEST_CONTRACT,
  ANALYTICS_INGEST_FIRESTORE_COLLECTIONS,
  buildAnalyticsIngestDedupeKey,
  classifyAnalyticsIngestFailure,
  getAnalyticsIngestContract,
  validateAnalyticsIngestContractClosure,
} from "@/lib/analytics/ingest-contract";

const ACCEPTED_EVENT_TYPES = ["click", "hover", "scroll", "visibility", "page_view", "page_leave"] as const;

describe("analytics ingest firestore closure contract", () => {
  it("maps every accepted anonymous event type to identity, destination, and downstream lanes", () => {
    expect(Object.keys(ANALYTICS_INGEST_CONTRACT).sort()).toEqual([...ACCEPTED_EVENT_TYPES].sort());

    for (const eventType of ACCEPTED_EVENT_TYPES) {
      const contract = getAnalyticsIngestContract(eventType);

      expect(contract.eventType).toBe(eventType);
      expect(contract.identityRequirements).toContain("sessionKey");
      expect(contract.identityRequirements).toContain("anonymousVisitorId");
      expect(contract.destinationLanes).toEqual(expect.arrayContaining([
        "guest_batch",
        "guest_session",
      ]));
      expect(contract.firestoreCollections.guestBatches).toBe(ANALYTICS_INGEST_FIRESTORE_COLLECTIONS.guestBatches);
      expect(contract.firestoreCollections.guestSessions).toBe(ANALYTICS_INGEST_FIRESTORE_COLLECTIONS.guestSessions);
      expect(contract.downstreamProcessing).toContain("guest_batch_page_rollup");
      expect(contract.costPolicy.maxEventsPerPayload).toBe(200);
    }
  });

  it("keeps priority product events persisted with dedupe keys", () => {
    const priorityTypes = ["page_view", "page_leave", "click"] as const;

    for (const eventType of priorityTypes) {
      const contract = getAnalyticsIngestContract(eventType);

      expect(contract.priority).toBe("priority");
      expect(contract.persistenceStatus).toBe("persisted");
      expect(contract.dedupeRule).toBe("session_batch");
      expect(contract.destinationLanes).toContain("behavioral_timeline");
    }
  });

  it("classifies bad payload and consent outcomes as permanent non-retryable results", () => {
    expect(classifyAnalyticsIngestFailure("payload_too_large")).toMatchObject({
      status: "rejected",
      httpStatus: 413,
      retryable: false,
      permanent: true,
    });
    expect(classifyAnalyticsIngestFailure("invalid_json")).toMatchObject({
      status: "rejected",
      httpStatus: 400,
      retryable: false,
      permanent: true,
    });
    expect(classifyAnalyticsIngestFailure("invalid_analytics_payload")).toMatchObject({
      status: "rejected",
      httpStatus: 422,
      retryable: false,
      permanent: true,
    });
    expect(classifyAnalyticsIngestFailure("empty_analytics_payload")).toMatchObject({
      status: "rejected",
      httpStatus: 422,
      retryable: false,
      permanent: true,
    });
    expect(classifyAnalyticsIngestFailure("analytics_consent_denied")).toMatchObject({
      status: "dropped",
      httpStatus: 200,
      retryable: false,
      permanent: true,
      diagnosticsAllowed: false,
    });
  });

  it("allows retryable status only for temporary ingest infrastructure failures", () => {
    expect(classifyAnalyticsIngestFailure("temporary_firestore_failure")).toMatchObject({
      status: "temporary_failure",
      httpStatus: 503,
      retryable: true,
      permanent: false,
    });
    expect(classifyAnalyticsIngestFailure("temporary_server_failure")).toMatchObject({
      status: "temporary_failure",
      httpStatus: 503,
      retryable: true,
      permanent: false,
    });
  });

  it("builds a deterministic dedupe key for the persisted guest batch", () => {
    expect(buildAnalyticsIngestDedupeKey({
      sessionKey: "anon_server-cookie-id",
      batchId: "batch_existing-session_123456",
    })).toBe("guest_batch_anon_server-cookie-id_batch_existing-session_123456");
  });

  it("validates the closure invariants used by the route and validator", () => {
    const result = validateAnalyticsIngestContractClosure();

    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
    expect(result.collections).toEqual({
      guestBatches: "analytics_guest_batches",
      guestSessions: "analytics_sessions",
      behavioralTimelineFacts: "behavioral_timeline_facts",
      diagnostics: "server_diagnostics",
    });
  });
});
